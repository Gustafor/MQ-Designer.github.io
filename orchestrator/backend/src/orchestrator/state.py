"""State Management - orchestrator runtime state and graph snapshot generation."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable, Awaitable

import structlog

from .models import (
    Task, TaskStatus, TaskType, WorkerState, WorkerStatus,
    GraphSnapshot, GraphNode, GraphEdge, QueueStats, LimitsState,
    ChiefPlan, WebSocketMessage
)
from .task_queue import TaskQueue
from .worker_pool import WorkerPool
from .chief import ChiefArchitect
from .model_registry import ModelRegistry, LimitsState as RegistryLimitsState

logger = structlog.get_logger(__name__)


class OrchestratorState:
    """Central state manager for the orchestrator."""
    
    def __init__(
        self,
        queue: TaskQueue,
        worker_pool: WorkerPool,
        chief: ChiefArchitect,
        registry: ModelRegistry,
        limits: LimitsState,
    ):
        self.queue = queue
        self.worker_pool = worker_pool
        self.chief = chief
        self.registry = registry
        self.limits = limits
        
        self._ws_clients: List[Callable[[WebSocketMessage], Awaitable[None]]] = []
        self._running = False
        self._snapshot_task: Optional[asyncio.Task] = None
        
        # Register callbacks
        self.worker_pool.on_task_update = self._on_task_update
        self.worker_pool.on_worker_status = self._on_worker_status
        self.worker_pool.on_log = self._on_log
        
        self.chief.on_task_created = self._on_task_created
        self.chief.on_plan_created = self._on_plan_created
        self.chief.on_log = self._on_log
    
    async def start(self) -> None:
        """Start state monitoring."""
        self._running = True
        await self.worker_pool.start()
        self._snapshot_task = asyncio.create_task(self._snapshot_loop())
        logger.info("orchestrator_state_started")
    
    async def stop(self) -> None:
        """Stop state monitoring."""
        self._running = False
        await self.worker_pool.stop()
        if self._snapshot_task:
            self._snapshot_task.cancel()
            try:
                await self._snapshot_task
            except asyncio.CancelledError:
                pass
        logger.info("orchestrator_state_stopped")
    
    async def submit_goal(self, goal: str, context: Optional[Dict[str, Any]] = None) -> ChiefPlan:
        """Submit a high-level goal to the Chief Architect."""
        plan = await self.chief.create_plan(goal, context)
        await self.broadcast(WebSocketMessage(
            type="plan_created",
            payload={"plan": plan.model_dump()},
        ))
        return plan
    
    async def submit_task(self, task: Task) -> Task:
        """Submit a single task directly to queue."""
        self.queue.add(task)
        await self.broadcast(WebSocketMessage(
            type="task_created",
            payload={"task": task.model_dump()},
        ))
        return task
    
    def get_snapshot(self) -> GraphSnapshot:
        """Generate current graph snapshot for frontend."""
        nodes = []
        edges = []
        
        # Chief node
        nodes.append(GraphNode(
            id="chief",
            type="chief",
            position={"x": 400, "y": 50},
            data={
                "label": "Chief Architect",
                "model": self.chief.config.chief_model,
                "variant": self.chief.config.chief_variant,
                "status": "active" if self.chief.current_plan else "idle",
            },
            style={"background": "#8b5cf6", "color": "white", "width": 180},
        ))
        
        # Worker nodes
        workers = self.worker_pool.get_all_workers()
        for i, worker in enumerate(workers):
            x = 100 + (i % 3) * 250
            y = 200 + (i // 3) * 180
            
            status_color = {
                WorkerStatus.IDLE: "#22c55e",
                WorkerStatus.BUSY: "#f59e0b",
                WorkerStatus.OFFLINE: "#6b7280",
                WorkerStatus.ERROR: "#ef4444",
            }.get(worker.status, "#6b7280")
            
            nodes.append(GraphNode(
                id=f"worker-{worker.id}",
                type="worker",
                position={"x": x, "y": y},
                data={
                    "label": worker.config.name,
                    "type": worker.config.type.value,
                    "model": worker.config.model,
                    "variant": worker.config.variant,
                    "status": worker.status.value,
                    "current_task": worker.current_task_id,
                    "completed": self.worker_pool.metrics.get(worker.id, {}).tasks_completed if hasattr(self.worker_pool.metrics.get(worker.id, {}), 'tasks_completed') else 0,
                },
                style={"background": status_color, "color": "white", "width": 160},
            ))
            
            # Edge from chief to worker
            edges.append(GraphEdge(
                id=f"chief-to-{worker.id}",
                source="chief",
                target=f"worker-{worker.id}",
                type="delegation",
                animated=worker.status == WorkerStatus.BUSY,
                label="delegates",
            ))
        
        # Task nodes
        tasks = self.queue.list_tasks(limit=50)
        for i, task in enumerate(tasks):
            x = 50 + (i % 5) * 200
            y = 500 + (i // 5) * 120
            
            status_color = {
                TaskStatus.PENDING: "#94a3b8",
                TaskStatus.ASSIGNED: "#3b82f6",
                TaskStatus.RUNNING: "#f59e0b",
                TaskStatus.COMPLETED: "#22c55e",
                TaskStatus.FAILED: "#ef4444",
                TaskStatus.NEEDS_REVIEW: "#8b5cf6",
                TaskStatus.REVISION_REQUESTED: "#f97316",
            }.get(task.status, "#94a3b8")
            
            assigned_worker = task.assigned_worker
            nodes.append(GraphNode(
                id=f"task-{task.id}",
                type="task",
                position={"x": x, "y": y},
                data={
                    "label": task.title[:30] + ("..." if len(task.title) > 30 else ""),
                    "full_title": task.title,
                    "type": task.type.value,
                    "status": task.status.value,
                    "priority": task.priority,
                    "tokens": task.output.tokens_used if task.output else 0,
                    "cost": task.output.cost_usd if task.output else 0,
                },
                style={"background": status_color, "color": "white", "width": 180},
            ))
            
            # Dependency edges
            for dep_id in task.input.dependencies:
                edges.append(GraphEdge(
                    id=f"dep-{dep_id}-to-{task.id}",
                    source=f"task-{dep_id}",
                    target=f"task-{task.id}",
                    type="dependency",
                    animated=False,
                    label="depends on",
                ))
            
            # Assignment edge
            if assigned_worker:
                edges.append(GraphEdge(
                    id=f"assign-{assigned_worker}-to-{task.id}",
                    source=f"worker-{assigned_worker}",
                    target=f"task-{task.id}",
                    type="delegation",
                    animated=task.status == TaskStatus.RUNNING,
                    label="executing",
                ))
        
        # Artifact nodes (completed task outputs)
        for task in tasks:
            if task.output and task.output.files_created:
                for file_path in task.output.files_created:
                    artifact_id = f"artifact-{task.id}-{file_path.replace('/', '-')}"
                    nodes.append(GraphNode(
                        id=artifact_id,
                        type="artifact",
                        position={"x": 0, "y": 0},  # Will be auto-laid out
                        data={
                            "label": file_path.split("/")[-1],
                            "path": file_path,
                            "task_id": task.id,
                        },
                        style={"background": "#06b6d4", "color": "white", "width": 140, "shape": "diamond"},
                    ))
                    edges.append(GraphEdge(
                        id=f"artifact-{task.id}-to-{artifact_id}",
                        source=f"task-{task.id}",
                        target=artifact_id,
                        type="artifact",
                        animated=False,
                        label="produces",
                    ))
        
        # Queue stats
        queue_stats = self.queue.get_stats()
        stats = QueueStats(
            pending=queue_stats.get("pending", 0),
            assigned=queue_stats.get("assigned", 0),
            running=queue_stats.get("running", 0),
            completed=queue_stats.get("completed", 0),
            failed=queue_stats.get("failed", 0),
            needs_review=queue_stats.get("needs_review", 0),
            total=queue_stats.get("total", 0),
        )
        
        return GraphSnapshot(
            nodes=nodes,
            edges=edges,
            limits=self.limits,
            queue_stats=stats,
        )
    
    async def broadcast(self, message: WebSocketMessage) -> None:
        """Broadcast message to all WebSocket clients."""
        dead_clients = []
        for client in self._ws_clients:
            try:
                await client(message)
            except Exception:
                dead_clients.append(client)
        
        for client in dead_clients:
            self._ws_clients.remove(client)
    
    def register_ws_client(self, sender: Callable[[WebSocketMessage], Awaitable[None]]) -> None:
        """Register WebSocket client for live updates."""
        self._ws_clients.append(sender)
    
    def unregister_ws_client(self, sender: Callable[[WebSocketMessage], Awaitable[None]]) -> None:
        """Unregister WebSocket client."""
        if sender in self._ws_clients:
            self._ws_clients.remove(sender)
    
    async def _snapshot_loop(self) -> None:
        """Periodically broadcast graph snapshots."""
        while self._running:
            try:
                snapshot = self.get_snapshot()
                await self.broadcast(WebSocketMessage(
                    type="graph_update",
                    payload=snapshot.model_dump(),
                ))
            except Exception as e:
                logger.error("snapshot_error", error=str(e))
            await asyncio.sleep(2)  # Update every 2 seconds
    
    async def _on_task_update(self, task: Task) -> None:
        await self.broadcast(WebSocketMessage(
            type="task_update",
            payload={"task": task.model_dump()},
        ))
    
    async def _on_worker_status(self, worker: WorkerState) -> None:
        await self.broadcast(WebSocketMessage(
            type="worker_status",
            payload={"worker": worker.model_dump()},
        ))
    
    async def _on_log(self, level: str, message: str) -> None:
        await self.broadcast(WebSocketMessage(
            type="log",
            payload={"level": level, "message": message},
        ))
    
    async def _on_task_created(self, task: Task) -> None:
        await self.broadcast(WebSocketMessage(
            type="task_created",
            payload={"task": task.model_dump()},
        ))
    
    async def _on_plan_created(self, plan: ChiefPlan) -> None:
        await self.broadcast(WebSocketMessage(
            type="plan_created",
            payload={"plan": plan.model_dump()},
        ))
    
    def get_status_summary(self) -> Dict[str, Any]:
        """Get overall status summary."""
        pool_stats = self.worker_pool.get_pool_stats()
        queue_stats = self.queue.get_stats()
        usage_report = self.registry.get_usage_report()
        
        return {
            "chief": {
                "has_plan": self.chief.current_plan is not None,
                "plan_tasks": len(self.chief.current_plan.tasks) if self.chief.current_plan else 0,
            },
            "workers": pool_stats,
            "queue": queue_stats,
            "limits": usage_report["limits"],
            "timestamp": datetime.utcnow().isoformat(),
        }