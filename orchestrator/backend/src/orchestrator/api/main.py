"""FastAPI application and API routes."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from ..models import Task, TaskType, TaskStatus, ChiefPlan, GraphSnapshot, WebSocketMessage, LimitsState
from ..state import OrchestratorState
from ..task_queue import TaskQueue
from ..worker_pool import WorkerPool, create_worker_pool
from ..chief import ChiefArchitect, create_chief_architect
from ..model_registry import ModelRegistry, LimitsState as RegistryLimitsState
from ..config_loader import load_orchestrator_config, load_model_matrix
from ..opencode_wrapper import OpencodeWrapper, OpencodeConfig, MockOpencodeWrapper

import structlog

logger = structlog.get_logger(__name__)

# Global state
orchestrator_state: Optional[OrchestratorState] = None


class GoalRequest(BaseModel):
    goal: str
    context: Optional[Dict[str, Any]] = None


class TaskRequest(BaseModel):
    title: str
    type: TaskType
    priority: int = 5
    prompt: str
    context_files: List[str] = []
    dependencies: List[str] = []
    max_retries: int = 2


class ModelSelectRequest(BaseModel):
    task_type: TaskType
    prefer_free: bool = False
    privacy_required: bool = True
    estimated_input: int = 2000
    estimated_output: int = 4000


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global orchestrator_state
    
    # Initialize components
    config_loader = type('ConfigLoader', (), {
        'load_orchestrator_config': load_orchestrator_config,
        'load_model_matrix': load_model_matrix,
    })()
    
    config = load_orchestrator_config()
    matrix = load_model_matrix()
    
    # Limits
    limits = LimitsState(
        go_monthly_limit_usd=config.limits.get("go_monthly_usd", 60.0),
        alert_threshold_pct=config.limits.get("alert_threshold_pct", 80),
        auto_fallback=config.limits.get("auto_fallback_to_free", True),
    )
    
    # Queue
    queue = TaskQueue(Path("data/orchestrator.db"))
    
    # Registry
    registry = ModelRegistry(matrix, limits)
    
    # OpenCode wrapper (use mock for testing)
    import os
    use_mock = os.getenv("MOCK_OPENCODE", "false").lower() == "true"
    if use_mock:
        opencode = MockOpencodeWrapper()
    else:
        opencode = OpencodeWrapper(OpencodeConfig())
    
    # Worker pool
    worker_pool = create_worker_pool(queue, registry, config_loader, use_mock=use_mock)
    worker_pool.initialize_workers(config.workers)
    
    # Chief
    chief = create_chief_architect(queue, registry, opencode, config_loader)
    
    # State manager
    orchestrator_state = OrchestratorState(queue, worker_pool, chief, registry, limits)
    await orchestrator_state.start()
    
    logger.info("orchestrator_started")
    
    yield
    
    # Shutdown
    if orchestrator_state:
        await orchestrator_state.stop()
    logger.info("orchestrator_stopped")


app = FastAPI(
    title="Crypto Trading Bot Orchestrator",
    description="Chief Architect + Worker Pool for AI-driven development",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === WebSocket ===
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for live updates."""
    await websocket.accept()
    
    async def sender(message: WebSocketMessage):
        await websocket.send_text(message.model_dump_json())
    
    if orchestrator_state:
        orchestrator_state.register_ws_client(sender)
    
    try:
        while True:
            # Keep connection alive, handle incoming messages if needed
            data = await websocket.receive_text()
            # Could handle client commands here
    except WebSocketDisconnect:
        pass
    finally:
        if orchestrator_state:
            orchestrator_state.unregister_ws_client(sender)


# === REST API ===
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "orchestrator"}


@app.get("/api/status")
async def get_status():
    """Get overall orchestrator status."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    return orchestrator_state.get_status_summary()


@app.get("/api/graph", response_model=GraphSnapshot)
async def get_graph():
    """Get current task graph for visualization."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    return orchestrator_state.get_snapshot()


@app.post("/api/goal", response_model=ChiefPlan)
async def submit_goal(request: GoalRequest):
    """Submit a high-level goal to Chief Architect."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    plan = await orchestrator_state.submit_goal(request.goal, request.context)
    return plan


@app.post("/api/tasks", response_model=Task)
async def create_task(request: TaskRequest):
    """Create a single task directly."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    task = Task(
        title=request.title,
        type=request.type,
        priority=request.priority,
        input={
            "prompt": request.prompt,
            "context_files": request.context_files,
            "dependencies": request.dependencies,
        },
        max_retries=request.max_retries,
    )
    return await orchestrator_state.submit_task(task)


@app.get("/api/tasks")
async def list_tasks(
    status: Optional[TaskStatus] = None,
    worker_id: Optional[str] = None,
    limit: int = 100,
):
    """List tasks with optional filters."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    tasks = orchestrator_state.queue.list_tasks(status, worker_id, limit)
    return {"tasks": [t.model_dump() for t in tasks]}


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task by ID."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    task = orchestrator_state.queue.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    return task.model_dump()


@app.post("/api/tasks/{task_id}/retry")
async def retry_task(task_id: str):
    """Retry a failed task."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    task = orchestrator_state.queue.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    
    if task.status not in (TaskStatus.FAILED, TaskStatus.CANCELLED):
        raise HTTPException(400, "Task cannot be retried")
    
    new_count = orchestrator_state.queue.increment_retry(task_id)
    return {"task_id": task_id, "retry_count": new_count, "status": "pending"}


@app.delete("/api/tasks/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a pending/assigned task."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    task = orchestrator_state.queue.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    
    if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
        raise HTTPException(400, "Cannot cancel completed task")
    
    orchestrator_state.queue.update_status(task_id, TaskStatus.CANCELLED)
    return {"task_id": task_id, "status": "cancelled"}


@app.get("/api/workers")
async def list_workers():
    """List all workers with status."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    workers = orchestrator_state.worker_pool.get_all_workers()
    return {"workers": [w.model_dump() for w in workers]}


@app.get("/api/workers/{worker_id}")
async def get_worker(worker_id: str):
    """Get worker details."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    worker = orchestrator_state.worker_pool.get_worker_status(worker_id)
    if not worker:
        raise HTTPException(404, "Worker not found")
    
    metrics = orchestrator_state.worker_pool.get_metrics(worker_id)
    return {
        "worker": worker.model_dump(),
        "metrics": metrics.__dict__ if metrics else None,
    }


@app.post("/api/models/select")
async def select_model(request: ModelSelectRequest):
    """Get recommended model for a task type."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    model = orchestrator_state.registry.select_model(
        request.task_type,
        request.prefer_free,
        request.privacy_required,
        request.estimated_input,
        request.estimated_output,
    )
    return model.model_dump()


@app.get("/api/models")
async def list_models():
    """List all available models with metadata."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    return {"models": orchestrator_state.registry.get_available_models()}


@app.get("/api/limits")
async def get_limits():
    """Get current usage vs limits."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    return orchestrator_state.registry.get_usage_report()


@app.get("/api/plan")
async def get_current_plan():
    """Get Chief's current plan."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    if not orchestrator_state.chief.current_plan:
        return {"plan": None}
    
    return {"plan": orchestrator_state.chief.current_plan.model_dump()}


@app.post("/api/plan/review/{task_id}")
async def review_task(task_id: str):
    """Trigger Chief review of a completed task."""
    if not orchestrator_state:
        raise HTTPException(503, "Orchestrator not initialized")
    
    task = orchestrator_state.queue.get(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    
    if task.status != TaskStatus.NEEDS_REVIEW:
        raise HTTPException(400, "Task not ready for review")
    
    review = await orchestrator_state.chief.review_task(task)
    
    if review.get("decision") == "PASS":
        orchestrator_state.queue.update_status(task_id, TaskStatus.COMPLETED)
    elif review.get("decision") == "CHANGES_REQUESTED":
        orchestrator_state.queue.update_status(task_id, TaskStatus.REVISION_REQUESTED)
    elif review.get("decision") == "REJECT":
        orchestrator_state.queue.update_status(task_id, TaskStatus.FAILED, error=review.get("reason"))
    
    return {"review": review, "task_status": task.status.value}


# === Frontend serving ===
@app.get("/")
async def root():
    """Serve frontend or API info."""
    return {
        "service": "Crypto Trading Bot Orchestrator",
        "version": "0.1.0",
        "docs": "/docs",
        "websocket": "/ws",
        "graph": "/api/graph",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)