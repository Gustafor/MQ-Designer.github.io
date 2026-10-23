"""Configuration loading for orchestrator."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel

from .models import WorkerConfig, WorkerType, ModelConfig, TaskType


class OrchestratorConfig(BaseModel):
    """Full orchestrator configuration."""
    chief_model: str = "opencode-go/kimi-k3"
    chief_variant: str = "high"
    chief_system_prompt: str = ""
    max_concurrent_tasks: int = 3
    review_threshold: str = "strict"
    workers: List[WorkerConfig] = []
    task_routing: Dict[str, str] = {}
    limits: Dict[str, Any] = {}
    fallback_chain: List[str] = []


class ModelMatrix(BaseModel):
    """Model matrix configuration."""
    task_types: Dict[str, Dict[str, Any]] = {}
    fallback_chain: List[str] = []
    privacy_tier: Dict[str, List[str]] = {}


def load_yaml(path: Path) -> Dict[str, Any]:
    """Load YAML file safely."""
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_orchestrator_config(config_dir: Optional[Path] = None) -> OrchestratorConfig:
    """Load orchestrator.yaml."""
    if config_dir is None:
        config_dir = Path(__file__).parent.parent.parent.parent / "config"
    
    data = load_yaml(config_dir / "orchestrator.yaml")
    
    # Convert worker dicts to WorkerConfig objects
    workers = []
    for w in data.get("workers", []):
        workers.append(WorkerConfig(**w))
    
    return OrchestratorConfig(
        chief_model=data.get("chief", {}).get("model", "opencode-go/kimi-k3"),
        chief_variant=data.get("chief", {}).get("variant", "high"),
        chief_system_prompt=data.get("chief", {}).get("system_prompt", ""),
        max_concurrent_tasks=data.get("chief", {}).get("max_concurrent_tasks", 3),
        review_threshold=data.get("chief", {}).get("review_threshold", "strict"),
        workers=workers,
        task_routing=data.get("task_routing", {}),
        limits=data.get("limits", {}),
        fallback_chain=data.get("limits", {}).get("fallback_chain", []),
    )


def load_model_matrix(config_dir: Optional[Path] = None) -> ModelMatrix:
    """Load model_matrix.yaml."""
    if config_dir is None:
        config_dir = Path(__file__).parent.parent.parent.parent / "config"
    
    data = load_yaml(config_dir / "model_matrix.yaml")
    return ModelMatrix(
        task_types=data.get("task_types", {}),
        fallback_chain=data.get("fallback_chain", []),
        privacy_tier=data.get("privacy_tier", {}),
    )


def get_model_for_task(
    task_type: TaskType,
    matrix: ModelMatrix,
    prefer_free: bool = False,
    privacy_required: bool = True,
) -> ModelConfig:
    """Select best model for a task type based on matrix."""
    task_key = task_type.value
    task_config = matrix.task_types.get(task_key, {})
    
    if not task_config:
        # Fallback to first available
        fallback = matrix.fallback_chain[0] if matrix.fallback_chain else "opencode-go/glm-5.3-flash"
        return ModelConfig(
            model_id=fallback,
            variant="medium",
            context_window=1000000,
            privacy_required=privacy_required,
        )
    
    model_id = task_config.get("model", "opencode-go/glm-5.3-flash")
    variant = task_config.get("variant", "medium")
    context_window = task_config.get("context_window", 1000000)
    privacy = task_config.get("privacy", "required") == "required"
    cost = task_config.get("estimated_cost_usd", 0.0)
    max_tokens = task_config.get("max_tokens_per_request", 4000)
    
    # Check privacy requirement
    if privacy_required and not privacy:
        # Find alternative with zero retention
        for tier_name, models in matrix.privacy_tier.items():
            if tier_name == "zero_retention":
                for m in models:
                    # Check if model supports this task type (simplified)
                    return ModelConfig(
                        model_id=m,
                        variant="medium",
                        context_window=1000000,
                        privacy_required=True,
                    )
    
    # Prefer free models if requested
    if prefer_free and cost > 0:
        for free_model in ["opencode/beam-free", "opencode/nemotron-3-ultra-free", "opencode/nemotron-3.5-super-vl-free"]:
            return ModelConfig(
                model_id=free_model,
                variant="medium",
                context_window=1000000,
                privacy_required=False,
            )
    
    return ModelConfig(
        model_id=model_id,
        variant=variant,
        context_window=context_window,
        privacy_required=privacy,
        estimated_cost_usd=cost,
        max_tokens_per_request=max_tokens,
    )


def get_worker_for_task(task_type: TaskType, config: OrchestratorConfig) -> Optional[WorkerConfig]:
    """Get worker config for task type."""
    worker_id = config.task_routing.get(task_type.value)
    if not worker_id:
        return None
    for w in config.workers:
        if w.id == worker_id:
            return w
    return None