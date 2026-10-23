"""Main entry point for orchestrator backend."""

import asyncio
import structlog
from pathlib import Path

from .api.main import app
from .config_loader import load_orchestrator_config, load_model_matrix
from .task_queue import TaskQueue
from .model_registry import ModelRegistry, LimitsState
from .worker_pool import create_worker_pool
from .chief import create_chief_architect
from .state import OrchestratorState
from .opencode_wrapper import OpencodeWrapper, OpencodeConfig, MockOpencodeWrapper

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)

logger = structlog.get_logger(__name__)


async def run_orchestrator(
    host: str = "0.0.0.0",
    port: int = 8000,
    use_mock: bool = False,
    db_path: str = "data/orchestrator.db",
):
    """Run the orchestrator backend server."""
    import uvicorn
    
    # Load configs
    config = load_orchestrator_config()
    matrix = load_model_matrix()
    
    # Limits
    limits = LimitsState(
        go_monthly_limit_usd=config.limits.get("go_monthly_usd", 60.0),
        alert_threshold_pct=config.limits.get("alert_threshold_pct", 80),
        auto_fallback=config.limits.get("auto_fallback_to_free", True),
    )
    
    # Queue
    queue = TaskQueue(Path(db_path))
    
    # Registry
    registry = ModelRegistry(matrix, limits)
    
    # OpenCode
    if use_mock:
        opencode = MockOpencodeWrapper()
    else:
        opencode = OpencodeWrapper(OpencodeConfig())
        # Check availability
        available = await opencode.check_available()
        if not available:
            logger.warning("opencode_cli_not_available_falling_back_to_mock")
            opencode = MockOpencodeWrapper()
    
    # Worker pool
    worker_pool = create_worker_pool(queue, registry, None, use_mock=use_mock)
    worker_pool.initialize_workers(config.workers)
    
    # Chief
    chief = create_chief_architect(queue, registry, opencode, None)
    
    # State
    state = OrchestratorState(queue, worker_pool, chief, registry, limits)
    await state.start()
    
    logger.info("orchestrator_started", host=host, port=port)
    
    # Run server
    config = uvicorn.Config(app, host=host, port=port, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()
    
    await state.stop()


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Orchestrator Backend")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--mock", action="store_true", help="Use mock OpenCode wrapper")
    parser.add_argument("--db", default="data/orchestrator.db", help="SQLite database path")
    
    args = parser.parse_args()
    
    asyncio.run(run_orchestrator(
        host=args.host,
        port=args.port,
        use_mock=args.mock,
        db_path=args.db,
    ))


if __name__ == "__main__":
    main()