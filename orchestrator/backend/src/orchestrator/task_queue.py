"""Task Queue - SQLite-backed persistent task queue with DAG support."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

import structlog

from .models import Task, TaskStatus, TaskType

logger = structlog.get_logger(__name__)


SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5,
    input_json TEXT NOT NULL,
    output_json TEXT,
    assigned_worker TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    error TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 2
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_worker ON tasks(assigned_worker);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
"""


class TaskQueue:
    """Persistent task queue with SQLite backend."""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize database schema."""
        with self._conn() as conn:
            conn.executescript(SCHEMA)
            conn.commit()
    
    @contextmanager
    def _conn(self):
        """Context manager for database connection."""
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _row_to_task(self, row: sqlite3.Row) -> Task:
        """Convert database row to Task object."""
        return Task(
            id=row["id"],
            title=row["title"],
            type=TaskType(row["type"]),
            status=TaskStatus(row["status"]),
            priority=row["priority"],
            input=Task.model_fields["input"].type_.model_validate_json(row["input_json"]),
            output=Task.model_fields["output"].type_.model_validate_json(row["output_json"]) if row["output_json"] else None,
            assigned_worker=row["assigned_worker"],
            created_at=datetime.fromisoformat(row["created_at"]),
            started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else None,
            completed_at=datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None,
            error=row["error"],
            retry_count=row["retry_count"],
            max_retries=row["max_retries"],
        )
    
    def add(self, task: Task) -> None:
        """Add task to queue."""
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO tasks (id, title, type, status, priority, input_json, created_at, max_retries)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.id,
                    task.title,
                    task.type.value,
                    task.status.value,
                    task.priority,
                    task.input.model_dump_json(),
                    task.created_at.isoformat(),
                    task.max_retries,
                ),
            )
            conn.commit()
        logger.info("task_added", task_id=task.id, title=task.title, type=task.type.value)
    
    def add_batch(self, tasks: List[Task]) -> None:
        """Add multiple tasks atomically."""
        with self._conn() as conn:
            for task in tasks:
                conn.execute(
                    """
                    INSERT INTO tasks (id, title, type, status, priority, input_json, created_at, max_retries)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        task.id,
                        task.title,
                        task.type.value,
                        task.status.value,
                        task.priority,
                        task.input.model_dump_json(),
                        task.created_at.isoformat(),
                        task.max_retries,
                    ),
                )
            conn.commit()
        logger.info("tasks_batch_added", count=len(tasks))
    
    def get(self, task_id: str) -> Optional[Task]:
        """Get task by ID."""
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            return self._row_to_task(row) if row else None
    
    def get_next_pending(self, worker_id: str, max_tasks: int = 1) -> List[Task]:
        """Get next pending tasks for a worker (respecting dependencies)."""
        with self._conn() as conn:
            # Get tasks that are pending and have all dependencies completed
            rows = conn.execute(
                """
                SELECT t.* FROM tasks t
                WHERE t.status = ?
                AND t.assigned_worker IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM tasks dep
                    WHERE dep.id IN (SELECT value FROM json_each(t.input_json, '$.dependencies'))
                    AND dep.status != ?
                )
                ORDER BY t.priority ASC, t.created_at ASC
                LIMIT ?
                """,
                (TaskStatus.PENDING.value, TaskStatus.COMPLETED.value, max_tasks),
            ).fetchall()
            
            tasks = [self._row_to_task(r) for r in rows]
            
            # Assign to worker
            for task in tasks:
                conn.execute(
                    "UPDATE tasks SET status = ?, assigned_worker = ?, started_at = ? WHERE id = ?",
                    (TaskStatus.ASSIGNED.value, worker_id, datetime.utcnow().isoformat(), task.id),
                )
                task.status = TaskStatus.ASSIGNED
                task.assigned_worker = worker_id
                task.started_at = datetime.utcnow()
            
            conn.commit()
            
            for task in tasks:
                logger.info("task_assigned", task_id=task.id, worker_id=worker_id)
            
            return tasks
    
    def update_status(self, task_id: str, status: TaskStatus, error: Optional[str] = None) -> None:
        """Update task status."""
        with self._conn() as conn:
            updates = ["status = ?"]
            params = [status.value]
            
            if status == TaskStatus.RUNNING:
                updates.append("started_at = ?")
                params.append(datetime.utcnow().isoformat())
            elif status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                updates.append("completed_at = ?")
                params.append(datetime.utcnow().isoformat())
            
            if error is not None:
                updates.append("error = ?")
                params.append(error)
            
            params.append(task_id)
            conn.execute(f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()
        
        logger.info("task_status_updated", task_id=task_id, status=status.value)
    
    def set_output(self, task_id: str, output: Any) -> None:
        """Set task output."""
        with self._conn() as conn:
            conn.execute(
                "UPDATE tasks SET output_json = ?, status = ? WHERE id = ?",
                (output.model_dump_json() if hasattr(output, 'model_dump_json') else json.dumps(output), TaskStatus.COMPLETED.value, task_id),
            )
            conn.commit()
        logger.info("task_output_set", task_id=task_id)
    
    def increment_retry(self, task_id: str) -> int:
        """Increment retry count and reset to pending."""
        with self._conn() as conn:
            conn.execute(
                "UPDATE tasks SET retry_count = retry_count + 1, status = ?, assigned_worker = NULL WHERE id = ?",
                (TaskStatus.PENDING.value, task_id),
            )
            conn.commit()
            row = conn.execute("SELECT retry_count FROM tasks WHERE id = ?", (task_id,)).fetchone()
            return row["retry_count"] if row else 0
    
    def list_tasks(
        self,
        status: Optional[TaskStatus] = None,
        worker_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Task]:
        """List tasks with optional filters."""
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status.value)
        if worker_id:
            query += " AND assigned_worker = ?"
            params.append(worker_id)
        
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        with self._conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_task(r) for r in rows]
    
    def get_stats(self) -> Dict[str, int]:
        """Get queue statistics."""
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) as count FROM tasks GROUP BY status"
            ).fetchall()
            stats = {row["status"]: row["count"] for row in rows}
        
        return {
            "pending": stats.get(TaskStatus.PENDING.value, 0),
            "assigned": stats.get(TaskStatus.ASSIGNED.value, 0),
            "running": stats.get(TaskStatus.RUNNING.value, 0),
            "completed": stats.get(TaskStatus.COMPLETED.value, 0),
            "failed": stats.get(TaskStatus.FAILED.value, 0),
            "cancelled": stats.get(TaskStatus.CANCELLED.value, 0),
            "needs_review": stats.get(TaskStatus.NEEDS_REVIEW.value, 0),
            "revision_requested": stats.get(TaskStatus.REVISION_REQUESTED.value, 0),
            "total": sum(stats.values()),
        }
    
    def clear_completed(self, older_than_days: int = 7) -> int:
        """Archive old completed tasks."""
        cutoff = datetime.utcnow() - timedelta(days=older_than_days)
        with self._conn() as conn:
            cursor = conn.execute(
                "DELETE FROM tasks WHERE status IN (?, ?) AND completed_at < ?",
                (TaskStatus.COMPLETED.value, TaskStatus.FAILED.value, cutoff.isoformat()),
            )
            conn.commit()
            return cursor.rowcount