"""Pydantic models for orchestrator state, tasks, workers, and API."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field, ConfigDict


class TaskStatus(str, enum.Enum):
    """Task lifecycle states."""
    PENDING = "pending"
    ASSIGNED = "assigned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    NEEDS_REVIEW = "needs_review"
    REVISION_REQUESTED = "revision_requested"


class TaskType(str, enum.Enum):
    """Types of tasks for routing."""
    RESEARCH = "research"
    ARCHITECTURE = "architecture"
    CODING = "coding"
    REVIEW = "review"
    TESTING = "testing"
    DOCUMENTATION = "documentation"
    QUICK_FIX = "quick_fix"
    VISION = "vision"
    REFACTORING = "refactoring"
    STRATEGY = "strategy"
    DATA_PIPELINE = "data_pipeline"
    CORE_IMPL = "core_implementation"


class WorkerType(str, enum.Enum):
    """Worker specializations."""
    CHIEF = "chief"
    RESEARCHER = "researcher"
    CODER = "coder"
    REVIEWER = "reviewer"
    TESTER = "tester"
    DOCUMENTER = "documenter"


class WorkerStatus(str, enum.Enum):
    """Worker availability."""
    IDLE = "idle"
    BUSY = "busy"
    OFFLINE = "offline"
    ERROR = "error"


class ModelConfig(BaseModel):
    """Model configuration from matrix."""
    model_id: str
    variant: str = "medium"
    context_window: int
    privacy_required: bool = False
    estimated_cost_usd: float = 0.0
    max_tokens_per_request: int = 4000


class TaskInput(BaseModel):
    """Input data for a task."""
    prompt: str
    context_files: List[str] = Field(default_factory=list)  # paths to relevant files
    dependencies: List[str] = Field(default_factory=list)  # task_ids that must complete first
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TaskOutput(BaseModel):
    """Output/result of a completed task."""
    files_created: List[str] = Field(default_factory=list)
    files_modified: List[str] = Field(default_factory=list)
    summary: str
    artifacts: Dict[str, Any] = Field(default_factory=dict)
    tokens_used: int = 0
    cost_usd: float = 0.0
    model_used: str = ""
    variant_used: str = ""


class Task(BaseModel):
    """Task in the orchestration graph."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str
    type: TaskType
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 5  # 1=highest, 10=lowest
    input: TaskInput
    output: Optional[TaskOutput] = None
    assigned_worker: Optional[str] = None  # worker_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 2

    model_config = ConfigDict(use_enum_values=True)


class WorkerConfig(BaseModel):
    """Static worker configuration from YAML."""
    id: str
    name: str
    type: WorkerType
    model: str
    variant: str
    system_prompt: str
    capabilities: List[str] = Field(default_factory=list)
    max_concurrent: int = 1


class WorkerState(BaseModel):
    """Runtime worker state."""
    id: str
    config: WorkerConfig
    status: WorkerStatus = WorkerStatus.IDLE
    current_task_id: Optional[str] = None
    tasks_completed: int = 0
    tasks_failed: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(use_enum_values=True)


class ChiefPlan(BaseModel):
    """Chief Architect's execution plan."""
    goal: str
    tasks: List[Task] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "draft"  # draft | active | completed | failed


class LimitsState(BaseModel):
    """Current usage vs limits."""
    go_monthly_limit_usd: float = 60.0
    go_spent_usd: float = 0.0
    free_models_unlimited: bool = True
    alert_threshold_pct: int = 80
    auto_fallback: bool = True
    by_model: Dict[str, Dict[str, float]] = Field(default_factory=dict)  # model -> {tokens, cost}

    @property
    def remaining_usd(self) -> float:
        return max(0, self.go_monthly_limit_usd - self.go_spent_usd)

    @property
    def usage_pct(self) -> float:
        if self.go_monthly_limit_usd == 0:
            return 0.0
        return (self.go_spent_usd / self.go_monthly_limit_usd) * 100

    @property
    def is_alert(self) -> bool:
        return self.usage_pct >= self.alert_threshold_pct


class GraphSnapshot(BaseModel):
    """Full graph state for frontend visualization."""
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    limits: LimitsState
    queue_stats: QueueStats
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class GraphNode(BaseModel):
    """Node in the task graph (React Flow compatible)."""
    id: str
    type: str  # "chief" | "worker" | "task" | "artifact"
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    data: Dict[str, Any] = Field(default_factory=dict)
    style: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    """Edge in the task graph."""
    id: str
    source: str
    target: str
    type: str = "default"  # default | delegation | dependency | artifact
    animated: bool = False
    label: Optional[str] = None
    style: Optional[Dict[str, Any]] = None


class QueueStats(BaseModel):
    """Task queue statistics."""
    pending: int = 0
    assigned: int = 0
    running: int = 0
    completed: int = 0
    failed: int = 0
    needs_review: int = 0
    total: int = 0


class WebSocketMessage(BaseModel):
    """WebSocket message for live updates."""
    type: str  # "graph_update" | "task_update" | "limits_update" | "log" | "worker_status"
    payload: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class OpencodeResult(BaseModel):
    """Result from OpenCode CLI execution."""
    success: bool
    stdout: str
    stderr: str
    returncode: int
    tokens_input: int = 0
    tokens_output: int = 0
    tokens_cached: int = 0
    cost_usd: float = 0.0
    model_used: str = ""
    variant_used: str = ""
    execution_time_ms: int = 0