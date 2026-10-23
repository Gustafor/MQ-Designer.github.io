"""Model Registry - tracks model metadata, pricing, limits, and selection logic."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import structlog

from .models import ModelConfig, TaskType, LimitsState
from .config_loader import ModelMatrix, get_model_for_task

logger = structlog.get_logger(__name__)


@dataclass
class ModelUsage:
    """Runtime usage statistics for a model."""
    model_id: str
    total_requests: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cached_tokens: int = 0
    total_cost_usd: float = 0.0
    last_used: Optional[datetime] = None
    errors: int = 0
    avg_latency_ms: float = 0.0


class ModelRegistry:
    """Registry of available models with usage tracking and limit enforcement."""
    
    # Pricing per 1M tokens (input, output, cached_read, cached_write)
    PRICING: Dict[str, Tuple[float, float, float, float]] = {
        # Go models
        "opencode-go/glm-5.3-flash": (0.15, 0.50, 0.03, 0.0),
        "opencode-go/glm-5.3": (1.40, 4.40, 0.26, 0.0),
        "opencode-go/glm-5.2": (1.40, 4.40, 0.26, 0.0),
        "opencode-go/kimi-k3": (3.00, 15.00, 0.30, 0.0),
        "opencode-go/kimi-k2.7-code": (0.95, 4.00, 0.19, 0.0),
        "opencode-go/deepseek-v4.1-flash": (0.30, 1.20, 0.006, 0.0),
        "opencode-go/deepseek-v4-pro": (1.32, 3.96, 0.044, 0.0),
        "opencode-go/minimax-m3": (0.30, 1.20, 0.06, 0.0),
        "opencode-go/minimax-m3.1-flash": (0.15, 0.60, 0.015, 0.0),
        "opencode-go/longcat-2.0": (0.30, 1.20, 0.006, 0.0),
        "opencode-go/grok-4.7": (2.00, 6.00, 0.50, 0.0),
        "opencode-go/gpt-6-luna": (0.10, 0.50, 0.01, 0.125),
        "opencode-go/gpt-5.6-luna": (0.20, 1.20, 0.02, 0.25),
        "opencode-go/claude-haiku-5-5": (0.10, 0.50, 0.01, 0.125),
        "opencode-go/gemini-4-argon-contributor": (4.00, 20.00, 0.20, 0.0),
        "opencode-go/muse-spark-1.3-contributor": (0.10, 0.20, 0.002, 0.0),
        "opencode-go/muse-spark-1.2-contributor": (0.10, 0.20, 0.002, 0.0),
        # Free models (cost = 0)
        "opencode/beam-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/nemotron-3-ultra-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/nemotron-3.5-super-vl-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/nemotron-3.5-lightning-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/flint-40b-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/deepseek-v4.1-flash-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/glm-5.3-flash-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/mimo-v2.6-flash-free": (0.0, 0.0, 0.0, 0.0),
        "opencode/big-pickle": (0.0, 0.0, 0.0, 0.0),
    }
    
    # Context windows
    CONTEXT_WINDOWS: Dict[str, int] = {
        "opencode-go/kimi-k3": 1000000,
        "opencode-go/glm-5.3": 1000000,
        "opencode-go/glm-5.2": 1000000,
        "opencode-go/glm-5.3-flash": 1000000,
        "opencode-go/deepseek-v4.1-flash": 1000000,
        "opencode-go/deepseek-v4-pro": 1000000,
        "opencode-go/minimax-m3": 512000,
        "opencode-go/minimax-m3.1-flash": 512000,
        "opencode-go/kimi-k2.7-code": 262144,
        "opencode-go/grok-4.7": 500000,
        "opencode-go/gpt-6-luna": 1100000,
        "opencode-go/gpt-5.6-luna": 1100000,
        "opencode-go/claude-haiku-5-5": 1000000,
        "opencode-go/gemini-4-argon-contributor": 1000000,
        "opencode-go/muse-spark-1.3-contributor": 1000000,
        "opencode-go/muse-spark-1.2-contributor": 1000000,
        "opencode-go/longcat-2.0": 200000,
        "opencode/beam-free": 1000000,
        "opencode/nemotron-3-ultra-free": 1000000,
        "opencode/nemotron-3.5-super-vl-free": 1000000,
        "opencode/nemotron-3.5-lightning-free": 262144,
        "opencode/flint-40b-free": 262144,
        "opencode/deepseek-v4.1-flash-free": 200000,
        "opencode/glm-5.3-flash-free": 200000,
        "opencode/mimo-v2.6-flash-free": 200000,
        "opencode/big-pickle": 200000,
    }

    def __init__(self, matrix: ModelMatrix, limits: LimitsState):
        self.matrix = matrix
        self.limits = limits
        self.usage: Dict[str, ModelUsage] = {}
        self._lock = asyncio.Lock()
        
        # Initialize usage tracking for known models
        for model_id in self.PRICING:
            self.usage[model_id] = ModelUsage(model_id=model_id)

    def get_pricing(self, model_id: str) -> Tuple[float, float, float, float]:
        """Get pricing for model (input, output, cached_read, cached_write per 1M)."""
        return self.PRICING.get(model_id, (0.0, 0.0, 0.0, 0.0))

    def get_context_window(self, model_id: str) -> int:
        """Get context window for model."""
        return self.CONTEXT_WINDOWS.get(model_id, 1000000)

    def calculate_cost(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
    ) -> float:
        """Calculate cost in USD for token usage."""
        input_price, output_price, cached_price, _ = self.get_pricing(model_id)
        cost = (
            (input_tokens / 1_000_000) * input_price +
            (output_tokens / 1_000_000) * output_price +
            (cached_tokens / 1_000_000) * cached_price
        )
        return round(cost, 6)

    def can_afford(
        self,
        model_id: str,
        estimated_input: int = 1000,
        estimated_output: int = 2000,
    ) -> Tuple[bool, str]:
        """Check if we can afford a request within limits."""
        estimated_cost = self.calculate_cost(model_id, estimated_input, estimated_output)
        
        # Free models always allowed
        if estimated_cost == 0:
            return True, "free_model"
        
        # Check monthly limit
        projected_spend = self.limits.go_spent_usd + estimated_cost
        if projected_spend > self.limits.go_monthly_limit_usd:
            return False, f"monthly_limit_exceeded: ${projected_spend:.2f} > ${self.limits.go_monthly_limit_usd:.2f}"
        
        # Check alert threshold
        if self.limits.is_alert:
            return False, f"alert_threshold_reached: {self.limits.usage_pct:.1f}%"
        
        return True, "ok"

    def select_model(
        self,
        task_type: TaskType,
        prefer_free: bool = False,
        privacy_required: bool = True,
        estimated_input: int = 2000,
        estimated_output: int = 4000,
    ) -> ModelConfig:
        """Select best model for task considering limits."""
        # First try matrix recommendation
        model_config = get_model_for_task(
            task_type, self.matrix, prefer_free, privacy_required
        )
        
        # Check if we can afford it
        can_afford, reason = self.can_afford(
            model_config.model_id, estimated_input, estimated_output
        )
        
        if can_afford:
            return model_config
        
        # Try fallback chain
        logger.warning(
            "model_unaffordable_fallback",
            model=model_config.model_id,
            reason=reason,
            task_type=task_type.value,
        )
        
        for fallback_model in self.matrix.fallback_chain:
            can_afford, reason = self.can_afford(fallback_model, estimated_input, estimated_output)
            if can_afford:
                logger.info("fallback_model_selected", model=fallback_model)
                return ModelConfig(
                    model_id=fallback_model,
                    variant="medium",
                    context_window=self.get_context_window(fallback_model),
                    privacy_required=privacy_required,
                )
        
        # Last resort: cheapest free model
        for free_model in ["opencode/beam-free", "opencode/nemotron-3-ultra-free"]:
            return ModelConfig(
                model_id=free_model,
                variant="low",
                context_window=self.get_context_window(free_model),
                privacy_required=False,
            )
        
        # Should never reach here
        return model_config

    async def record_usage(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
        cost_usd: float = 0.0,
        latency_ms: int = 0,
        error: bool = False,
    ) -> None:
        """Record usage statistics."""
        async with self._lock:
            usage = self.usage.get(model_id)
            if not usage:
                usage = ModelUsage(model_id=model_id)
                self.usage[model_id] = usage
            
            usage.total_requests += 1
            usage.total_input_tokens += input_tokens
            usage.total_output_tokens += output_tokens
            usage.total_cached_tokens += cached_tokens
            usage.total_cost_usd += cost_usd
            usage.last_used = datetime.utcnow()
            
            if error:
                usage.errors += 1
            
            # Update rolling average latency
            if usage.total_requests == 1:
                usage.avg_latency_ms = latency_ms
            else:
                usage.avg_latency_ms = (
                    usage.avg_latency_ms * (usage.total_requests - 1) + latency_ms
                ) / usage.total_requests
            
            # Update global limits
            self.limits.go_spent_usd += cost_usd
            self.limits.by_model[model_id] = {
                "tokens": usage.total_input_tokens + usage.total_output_tokens,
                "cost": usage.total_cost_usd,
                "requests": usage.total_requests,
            }

    def get_usage_report(self) -> Dict[str, Any]:
        """Get usage report for all models."""
        return {
            "limits": {
                "monthly_limit_usd": self.limits.go_monthly_limit_usd,
                "spent_usd": self.limits.go_spent_usd,
                "remaining_usd": self.limits.remaining_usd,
                "usage_pct": self.limits.usage_pct,
                "is_alert": self.limits.is_alert,
            },
            "by_model": {
                model_id: {
                    "requests": u.total_requests,
                    "input_tokens": u.total_input_tokens,
                    "output_tokens": u.total_output_tokens,
                    "cached_tokens": u.total_cached_tokens,
                    "cost_usd": u.total_cost_usd,
                    "errors": u.errors,
                    "avg_latency_ms": round(u.avg_latency_ms, 1),
                    "last_used": u.last_used.isoformat() if u.last_used else None,
                }
                for model_id, u in self.usage.items()
                if u.total_requests > 0
            },
        }

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of all available models with metadata."""
        models = []
        for model_id in self.PRICING:
            input_p, output_p, cached_p, _ = self.get_pricing(model_id)
            models.append({
                "model_id": model_id,
                "context_window": self.get_context_window(model_id),
                "pricing_per_1m": {
                    "input": input_p,
                    "output": output_p,
                    "cached_read": cached_p,
                },
                "is_free": input_p == 0 and output_p == 0,
                "usage": self.usage.get(model_id, ModelUsage(model_id=model_id)).total_requests,
            })
        return sorted(models, key=lambda m: (not m["is_free"], m["pricing_per_1m"]["input"]))