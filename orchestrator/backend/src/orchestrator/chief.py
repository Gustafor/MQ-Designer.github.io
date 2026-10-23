"""Chief Architect Agent - plans, decomposes, and orchestrates complex tasks."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

import structlog

from .models import (
    Task, TaskType, TaskStatus, TaskInput, ChiefPlan,
    WorkerConfig, WorkerType, ModelConfig
)
from .task_queue import TaskQueue
from .model_registry import ModelRegistry
from .opencode_wrapper import OpencodeWrapper, ModelConfig as WrapperModelConfig
from .config_loader import OrchestratorConfig, get_model_for_task

logger = structlog.get_logger(__name__)


class ChiefArchitect:
    """Chief Architect - the orchestrator's brain."""
    
    def __init__(
        self,
        queue: TaskQueue,
        registry: ModelRegistry,
        opencode: OpencodeWrapper,
        config: OrchestratorConfig,
    ):
        self.queue = queue
        self.registry = registry
        self.opencode = opencode
        self.config = config
        
        self.current_plan: Optional[ChiefPlan] = None
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None
        
        # Callbacks
        self.on_plan_created: Optional[callable] = None
        self.on_task_created: Optional[callable] = None
        self.on_log: Optional[callable] = None
    
    async def create_plan(
        self,
        goal: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> ChiefPlan:
        """Create an execution plan for a high-level goal."""
        logger.info("chief_creating_plan", goal=goal[:100])
        
        if self.on_log:
            await self.on_log("info", f"Chief Architect analyzing goal: {goal[:100]}")
        
        # Build planning prompt
        prompt = self._build_planning_prompt(goal, context)
        
        # Use Chief's model for planning
        model = get_model_for_task(
            TaskType.ARCHITECTURE,
            self.registry.matrix,
            privacy_required=True,
        )
        
        # Execute planning
        result = await self.opencode.execute(
            prompt=prompt,
            model=model,
            system_prompt=self.config.chief_system_prompt,
        )
        
        if not result.success:
            raise RuntimeError(f"Planning failed: {result.stderr}")
        
        # Parse plan from result
        plan = self._parse_plan(result.stdout, goal)
        
        self.current_plan = plan
        
        # Add tasks to queue
        self.queue.add_batch(plan.tasks)
        
        for task in plan.tasks:
            if self.on_task_created:
                await self.on_task_created(task)
        
        if self.on_plan_created:
            await self.on_plan_created(plan)
        
        if self.on_log:
            await self.on_log("info", f"Plan created with {len(plan.tasks)} tasks")
        
        return plan
    
    def _build_planning_prompt(
        self,
        goal: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Build prompt for Chief to create a task plan."""
        
        # Available worker types and their capabilities
        worker_caps = {
            "researcher": "API research, documentation analysis, best practices, technical reports",
            "coder": "Production code implementation, refactoring, debugging, core modules",
            "reviewer": "Code review, security audit, performance analysis, architecture compliance",
            "tester": "Unit/integration tests, mock creation, coverage analysis, test execution",
            "documenter": "README, architecture docs, API documentation, usage examples",
        }
        
        worker_list = "\n".join(
            f"- {wt}: {caps}" for wt, caps in worker_caps.items()
        )
        
        context_str = ""
        if context:
            context_str = f"\n\nCONTEXT:\n{json.dumps(context, indent=2)}"
        
        return f"""You are the Chief Architect of a crypto trading bot project.
Create a detailed execution plan (DAG of tasks) to achieve the following goal:

GOAL: {goal}{context_str}

AVAILABLE WORKERS:
{worker_list}

TASK TYPES (match to workers):
- research → researcher
- architecture → chief (you)
- coding → coder
- review → reviewer
- testing → tester
- documentation → documenter
- quick_fix → coder (with variant=low)
- vision → reviewer (Kimi K2.7 has vision)
- refactoring → coder
- strategy → coder (with DeepSeek for math)
- data_pipeline → coder
- core_implementation → coder

OUTPUT FORMAT (JSON):
{{
  "tasks": [
    {{
      "id": "task-001",
      "title": "Descriptive task title",
      "type": "research|coding|review|testing|documentation|quick_fix|vision|refactoring|strategy|data_pipeline|core_implementation",
      "priority": 1-10 (1=highest),
      "dependencies": ["task-001", "task-002"],  // task IDs that must complete first
      "prompt": "Detailed prompt for the assigned worker",
      "context_files": ["path/to/relevant/file.py"]  // optional
    }}
  ]
}}

REQUIREMENTS:
1. Break down into atomic, independently executable tasks
2. Each task must have clear input/output contract
3. Specify dependencies explicitly (DAG)
4. Prioritize: architecture → core → strategies → tests → docs
5. Use appropriate worker for each task type
6. Include context_files when task needs existing codebase knowledge
7. Max 15 tasks per plan (avoid over-planning)

EXAMPLE TASK:
{{
  "id": "task-001",
  "title": "Research Binance WebSocket API for orderbook streams",
  "type": "research",
  "priority": 1,
  "dependencies": [],
  "prompt": "Research Binance WebSocket API for real-time orderbook data. Document: connection endpoints, subscription format, message structure, rate limits, reconnection best practices. Output: markdown report in docs/research/binance_ws.md",
  "context_files": []
}}

Return ONLY the JSON object, no extra text.
"""
    
    def _parse_plan(self, output: str, goal: str) -> ChiefPlan:
        """Parse Chief's output into a ChiefPlan."""
        import re
        
        # Extract JSON from output
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON plan found in Chief's output")
        
        plan_data = json.loads(json_match.group())
        
        tasks = []
        for t in plan_data.get("tasks", []):
            task = Task(
                id=t.get("id", str(uuid.uuid4())[:8]),
                title=t["title"],
                type=TaskType(t["type"]),
                priority=t.get("priority", 5),
                input=TaskInput(
                    prompt=t["prompt"],
                    context_files=t.get("context_files", []),
                    dependencies=t.get("dependencies", []),
                ),
                max_retries=2,
            )
            tasks.append(task)
        
        return ChiefPlan(
            goal=goal,
            tasks=tasks,
            status="active",
        )
    
    async def review_task(self, task: Task) -> Dict[str, Any]:
        """Review a completed task."""
        logger.info("chief_reviewing_task", task_id=task.id)
        
        if self.on_log:
            await self.on_log("info", f"Chief reviewing task: {task.title}")
        
        if not task.output:
            return {"decision": "REJECT", "reason": "No output to review"}
        
        # Build review prompt
        prompt = f"""Review the following completed task:

TASK: {task.title} (type: {task.type.value})
PROMPT: {task.input.prompt}

OUTPUT SUMMARY: {task.output.summary}
FILES CREATED: {task.output.files_created}
FILES MODIFIED: {task.output.files_modified}
ARTIFACTS: {json.dumps(task.output.artifacts, indent=2)[:2000]}

EVALUATION CRITERIA:
1. Completeness: Does output address the prompt fully?
2. Quality: Production-ready code? Proper error handling? Type hints?
3. Architecture: Follows project patterns? No circular deps?
4. Security: No hardcoded secrets? Safe API usage?
5. Testing: Are tests needed? Coverage adequate?

DECISION: PASS | CHANGES_REQUESTED | REJECT

If CHANGES_REQUESTED, specify exact changes needed.
If REJECT, explain why.

Return JSON:
{{
  "decision": "PASS|CHANGES_REQUESTED|REJECT",
  "reason": "explanation",
  "changes": ["specific change 1", "specific change 2"],
  "score": 1-10
}}
"""
        
        model = get_model_for_task(
            TaskType.ARCHITECTURE,
            self.registry.matrix,
            privacy_required=True,
        )
        
        result = await self.opencode.execute(
            prompt=prompt,
            model=model,
            system_prompt="You are a strict Chief Architect reviewing subordinate work. Be thorough.",
        )
        
        if not result.success:
            return {"decision": "ERROR", "reason": f"Review failed: {result.stderr}"}
        
        # Parse review
        import re
        json_match = re.search(r'\{.*\}', result.stdout, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        
        return {"decision": "ERROR", "reason": "Failed to parse review"}
    
    async def monitor_and_replan(self) -> None:
        """Monitor task progress and replan if needed."""
        if not self.current_plan:
            return
        
        # Check for stuck tasks, failed tasks needing replan, etc.
        tasks = self.queue.list_tasks(limit=50)
        
        failed_tasks = [t for t in tasks if t.status == TaskStatus.FAILED and t.retry_count >= t.max_retries]
        stuck_tasks = [t for t in tasks if t.status == TaskStatus.RUNNING and 
                      t.started_at and (datetime.utcnow() - t.started_at).total_seconds() > 600]
        
        if failed_tasks or stuck_tasks:
            if self.on_log:
                await self.on_log("warning", f"Chief detected {len(failed_tasks)} failed, {len(stuck_tasks)} stuck tasks - replanning")
            
            # Create recovery tasks
            recovery_tasks = []
            for ft in failed_tasks:
                recovery_tasks.append(Task(
                    id=str(uuid.uuid4())[:8],
                    title=f"Recovery: {ft.title}",
                    type=ft.type,
                    priority=1,
                    input=TaskInput(
                        prompt=f"Previous task failed: {ft.error}. Fix the issue and complete: {ft.input.prompt}",
                        context_files=ft.input.context_files,
                    ),
                    max_retries=1,
                ))
            
            self.queue.add_batch(recovery_tasks)
            self.current_plan.tasks.extend(recovery_tasks)
            
            if self.on_plan_created:
                await self.on_plan_created(self.current_plan)


async def create_chief_architect(
    queue: TaskQueue,
    registry: ModelRegistry,
    opencode: OpencodeWrapper,
    config_loader,
) -> ChiefArchitect:
    """Factory to create Chief Architect with loaded config."""
    config = config_loader.load_orchestrator_config()
    return ChiefArchitect(queue, registry, opencode, config)