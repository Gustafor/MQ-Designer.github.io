"""Worker Pool Manager - manages worker lifecycle, task assignment, and execution."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Callable, Awaitable

import structlog

from .models import WorkerConfig, WorkerState, WorkerStatus, WorkerType, Task, TaskStatus, ModelConfig
from .task_queue import TaskQueue
from .model_registry import ModelRegistry
from .opencode_wrapper import OpencodeWrapper, OpencodeConfig, MockOpencodeWrapper

logger = structlog.get_logger(__name__)


@dataclass
class WorkerMetrics:
    """Runtime metrics for a worker."""
    tasks_completed: int = 0
    tasks_failed: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    total_latency_ms: int = 0
    last_task_at: Optional[datetime] = None


class WorkerPool:
    """Manages worker pool and task execution."""
    
    def __init__(
        self,
        queue: TaskQueue,
        registry: ModelRegistry,
        opencode: OpencodeWrapper,
        config_loader,
    ):
        self.queue = queue
        self.registry = registry
        self.opencode = opencode
        self.config_loader = config_loader
        
        self.workers: Dict[str, WorkerState] = {}
        self.metrics: Dict[str, WorkerMetrics] = {}
        self._running = False
        self._dispatch_task: Optional[asyncio.Task] = None
        self._max_concurrent_per_worker: Dict[str, int] = {}
        self._active_tasks: Dict[str, int] = {}  # worker_id -> count
        
        # Callbacks for live updates
        self.on_task_update: Optional[Callable[[Task], Awaitable[None]]] = None
        self.on_worker_status: Optional[Callable[[WorkerState], Awaitable[None]]] = None
        self.on_log: Optional[Callable[[str, str], Awaitable[None]]] = None  # level, message
    
    def initialize_workers(self, worker_configs: List[WorkerConfig]) -> None:
        """Initialize worker states from configs."""
        for wc in worker_configs:
            self.workers[wc.id] = WorkerState(
                id=wc.id,
                config=wc,
                status=WorkerStatus.IDLE,
            )
            self.metrics[wc.id] = WorkerMetrics()
            self._active_tasks[wc.id] = 0
            self._max_concurrent_per_worker[wc.id] = wc.max_concurrent
            logger.info("worker_initialized", worker_id=wc.id, type=wc.type.value, model=wc.model)
    
    async def start(self) -> None:
        """Start the worker pool dispatcher."""
        self._running = True
        self._dispatch_task = asyncio.create_task(self._dispatch_loop())
        logger.info("worker_pool_started", workers=len(self.workers))
    
    async def stop(self) -> None:
        """Stop the worker pool."""
        self._running = False
        if self._dispatch_task:
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass
        logger.info("worker_pool_stopped")
    
    async def _dispatch_loop(self) -> None:
        """Main dispatch loop - assigns tasks to available workers."""
        while self._running:
            try:
                await self._dispatch_pending_tasks()
            except Exception as e:
                logger.error("dispatch_loop_error", error=str(e))
            await asyncio.sleep(1)  # Check every second
    
    async def _dispatch_pending_tasks(self) -> None:
        """Find pending tasks and assign to available workers."""
        for worker_id, worker_state in self.workers.items():
            if worker_state.status == WorkerStatus.OFFLINE:
                continue
            
            active = self._active_tasks.get(worker_id, 0)
            max_concurrent = self._max_concurrent_per_worker.get(worker_id, 1)
            
            if active >= max_concurrent:
                continue
            
            # Get next task for this worker
            tasks = self.queue.get_next_pending(worker_id, max_concurrent - active)
            
            for task in tasks:
                self._active_tasks[worker_id] = self._active_tasks.get(worker_id, 0) + 1
                worker_state.status = WorkerStatus.BUSY
                worker_state.current_task_id = task.id
                worker_state.last_heartbeat = datetime.utcnow()
                
                # Update queue status
                self.queue.update_status(task.id, TaskStatus.RUNNING)
                
                # Notify
                if self.on_task_update:
                    await self.on_task_update(task)
                if self.on_worker_status:
                    await self.on_worker_status(worker_state)
                
                # Execute task asynchronously
                asyncio.create_task(self._execute_task(worker_id, task))
    
    async def _execute_task(self, worker_id: str, task: Task) -> None:
        """Execute a single task with the assigned worker."""
        worker_state = self.workers[worker_id]
        worker_config = worker_state.config
        
        logger.info("task_execution_started", task_id=task.id, worker_id=worker_id)
        
        if self.on_log:
            await self.on_log("info", f"Worker {worker_config.name} started task: {task.title}")
        
        try:
            # Select model (worker's configured model with variant)
            model = ModelConfig(
                model_id=worker_config.model,
                variant=worker_config.variant,
                context_window=self.registry.get_context_window(worker_config.model),
                privacy_required=True,
            )
            
            # Prepare context files
            context_files = task.input.context_files
            
            # Execute with OpenCode
            result = await self.opencode.execute(
                prompt=task.input.prompt,
                model=model,
                context_files=context_files,
                system_prompt=worker_config.system_prompt,
            )
            
            # Record usage
            await self.registry.record_usage(
                model_id=model.model_id,
                input_tokens=result.tokens_input,
                output_tokens=result.tokens_output,
                cached_tokens=result.tokens_cached,
                cost_usd=result.cost_usd,
                latency_ms=result.execution_time_ms,
                error=not result.success,
            )
            
            if result.success:
                # Create task output
                from .models import TaskOutput
                output = TaskOutput(
                    files_created=[],  # Would parse from result.stdout
                    files_modified=[],
                    summary=result.stdout[:500] if result.stdout else "Task completed",
                    artifacts={"raw_output": result.stdout},
                    tokens_used=result.tokens_input + result.tokens_output,
                    cost_usd=result.cost_usd,
                    model_used=result.model_used,
                    variant_used=result.variant_used,
                )
                
                self.queue.set_output(task.id, output)
                self.queue.update_status(task.id, TaskStatus.NEEDS_REVIEW)
                
                # Update metrics
                metrics = self.metrics[worker_id]
                metrics.tasks_completed += 1
                metrics.total_tokens += result.tokens_input + result.tokens_output
                metrics.total_cost_usd += result.cost_usd
                metrics.total_latency_ms += result.execution_time_ms
                metrics.last_task_at = datetime.utcnow()
                
                logger.info("task_completed", task_id=task.id, worker_id=worker_id, cost=result.cost_usd)
                
                if self.on_log:
                    await self.on_log("info", f"Task {task.id} completed by {worker_config.name}")
            else:
                # Task failed
                error_msg = result.stderr or f"OpenCode returned code {result.returncode}"
                self.queue.update_status(task.id, TaskStatus.FAILED, error=error_msg)
                
                metrics = self.metrics[worker_id]
                metrics.tasks_failed += 1
                
                logger.error("task_failed", task_id=task.id, worker_id=worker_id, error=error_msg)
                
                if self.on_log:
                    await self.on_log("error", f"Task {task.id} failed: {error_msg}")
                
                # Retry logic
                if task.retry_count < task.max_retries:
                    new_count = self.queue.increment_retry(task.id)
                    logger.info("task_retry_scheduled", task_id=task.id, retry_count=new_count)
                    if self.on_log:
                        await self.on_log("warning", f"Task {task.id} retry {new_count}/{task.max_retries}")
        
        except Exception as e:
            logger.exception("task_execution_error", task_id=task.id, worker_id=worker_id)
            self.queue.update_status(task.id, TaskStatus.FAILED, error=str(e))
            self.metrics[worker_id].tasks_failed += 1
            
            if self.on_log:
                await self.on_log("error", f"Task {task.id} error: {str(e)}")
        
        finally:
            # Cleanup
            self._active_tasks[worker_id] = max(0, self._active_tasks.get(worker_id, 1) - 1)
            worker_state.status = WorkerStatus.IDLE
            worker_state.current_task_id = None
            worker_state.last_heartbeat = datetime.utcnow()
            
            if self.on_worker_status:
                await self.on_worker_status(worker_state)
            if self.on_task_update:
                updated_task = self.queue.get(task.id)
                if updated_task:
                    await self.on_task_update(updated_task)
    
    def get_worker_status(self, worker_id: str) -> Optional[WorkerState]:
        """Get current worker status."""
        return self.workers.get(worker_id)
    
    def get_all_workers(self) -> List[WorkerState]:
        """Get all worker states."""
        return list(self.workers.values())
    
    def get_metrics(self, worker_id: str) -> Optional[WorkerMetrics]:
        """Get worker metrics."""
        return self.metrics.get(worker_id)
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get overall pool statistics."""
        total_completed = sum(m.tasks_completed for m in self.metrics.values())
        total_failed = sum(m.tasks_failed for m in self.metrics.values())
        total_cost = sum(m.total_cost_usd for m in self.metrics.values())
        total_tokens = sum(m.total_tokens for m in self.metrics.values())
        
        return {
            "workers_total": len(self.workers),
            "workers_idle": sum(1 for w in self.workers.values() if w.status == WorkerStatus.IDLE),
            "workers_busy": sum(1 for w in self.workers.values() if w.status == WorkerStatus.BUSY),
            "workers_offline": sum(1 for w in self.workers.values() if w.status == WorkerStatus.OFFLINE),
            "active_tasks": sum(self._active_tasks.values()),
            "total_completed": total_completed,
            "total_failed": total_failed,
            "total_cost_usd": round(total_cost, 4),
            "total_tokens": total_tokens,
            "by_worker": {
                wid: {
                    "status": ws.status.value,
                    "current_task": ws.current_task_id,
                    "completed": wm.tasks_completed,
                    "failed": wm.tasks_failed,
                    "cost_usd": round(wm.total_cost_usd, 4),
                    "tokens": wm.total_tokens,
                }
                for wid, (ws, wm) in zip(self.workers.keys(), zip(self.workers.values(), self.metrics.values()))
            },
        }


def create_worker_pool(
    queue: TaskQueue,
    registry: ModelRegistry,
    config_loader,
    use_mock: bool = False,
) -> WorkerPool:
    """Factory function to create worker pool."""
    if use_mock:
        opencode = MockOpencodeWrapper()
    else:
        opencode = OpencodeWrapper(OpencodeConfig())
    
    return WorkerPool(queue, registry, opencode, config_loader)