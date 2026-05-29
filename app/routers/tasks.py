from fastapi import APIRouter, Depends, BackgroundTasks, Request
from app.limiter import rate_limit
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.agents.pipeline import run_full_pipeline
import uuid
import json
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def run_pipeline_task(task_id: str, job_id: int, db: Session):
    try:
        db.query(models.TaskStatus).filter(
            models.TaskStatus.id == task_id
        ).update({"status": "running"})
        db.commit()

        result = run_full_pipeline(job_id, db)

        db.query(models.TaskStatus).filter(
            models.TaskStatus.id == task_id
        ).update({
            "status": "complete",
            "result": json.dumps(result),
            "completed_at": datetime.utcnow()
        })
        db.commit()
        print(f"✅ Task {task_id} completed")

    except Exception as e:
        db.query(models.TaskStatus).filter(
            models.TaskStatus.id == task_id
        ).update({
            "status": "failed",
            "error": str(e),
            "completed_at": datetime.utcnow()
        })
        db.commit()
        print(f"❌ Task {task_id} failed: {e}")

@router.get("/{task_id}")
@rate_limit("30/minute")
def get_task(request: Request, task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.TaskStatus).filter(
        models.TaskStatus.id == task_id
    ).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = json.loads(task.result) if task.result else None
    return {
        "task_id": task.id,
        "status": task.status,
        "result": result,
        "error": task.error,
        "created_at": task.created_at,
        "completed_at": task.completed_at
    }
