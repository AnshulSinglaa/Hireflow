from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.ai.matcher import match_candidates
from app.ai.rag import ask_about_candidates
from app.agents.screening_agent import run_screening_agent
from app.agents.pipeline import run_full_pipeline
from app.routers.tasks import run_pipeline_task
from app.limiter import rate_limit
import uuid

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/", response_model=schemas.JobResponse, status_code=201)
@rate_limit("20/minute")
def create_job(request: Request,
    job: schemas.JobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can post jobs")
    
    new_job = models.Job(
        title=job.title,
        description=job.description,
        company=job.company,
        owner_id=current_user.id,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # extract ATS criteria from JD automatically
    try:
        from app.ai.ats_parser import extract_ats_criteria
        criteria = extract_ats_criteria(job.title, job.description)
        new_job.ats_criteria = criteria
        db.commit()
    except Exception as e:
        print(f"ATS PARSER ERROR: {e}")
        # non-fatal — job still created without criteria

    return new_job



@router.get("/", response_model=list[schemas.JobResponse])
@rate_limit("60/minute")
def get_jobs(request: Request, db: Session = Depends(get_db)):
    return db.query(models.Job).all()


@router.get("/{job_id}", response_model=schemas.JobResponse)
@rate_limit("60/minute")
def get_job(request: Request, job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
@rate_limit("20/minute")
def delete_job(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
    db.delete(job)
    db.commit()
    return None


@router.get("/{job_id}/applications", response_model=list[schemas.ApplicationResponse])
@rate_limit("30/minute")
def get_job_applications(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can view applications")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to see applications for this job")

    applications = db.query(models.Application).filter(models.Application.job_id == job_id).all()
    return applications


@router.get("/{job_id}/match")
@rate_limit("10/minute")
def match_job_candidates(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can access matches")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to see matches for this job")

    results = match_candidates(job_id, db)
    return results

@router.post("/{job_id}/ask")
@rate_limit("10/minute")
def ask_job_candidates(
    request: Request,
    job_id: int,
    question: schemas.RecruiterQuestion,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can ask questions")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to ask about candidates for this job")

    result = ask_about_candidates(job_id, question.question, db)
    return {"answer": result}


@router.post("/{job_id}/ask/stream")
@rate_limit("10/minute")
async def ask_stream(
    request: Request,
    job_id: int,
    question: schemas.RecruiterQuestion,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can ask questions")
    
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    def generate():
        result = ask_about_candidates(job_id, question.question, db)
        words = result.split(' ')
        for word in words:
            yield word + ' '
            import time
            time.sleep(0.05)

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/{job_id}/screen")
@rate_limit("5/minute")
def screen_job_candidates(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can run screening")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to screen candidates for this job")

    result = run_screening_agent(job_id, db)
    return result

@router.post("/{job_id}/pipeline")
@rate_limit("5/minute")
def run_job_pipeline(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can run the pipeline")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # get only ATS-qualified candidates
    from app.ai.ats_threshold import get_pipeline_candidates
    candidate_ids = get_pipeline_candidates(job_id, db)

    if not candidate_ids:
        return {
            "message": "No candidates passed ATS gate",
            "pipeline_ran": False,
            "suggestion": "Lower ATS threshold or check job criteria"
        }

    result = run_full_pipeline(job_id, db, candidate_ids=candidate_ids)
    return result

@router.get("/{job_id}/ats-summary")
@rate_limit("30/minute")
def get_job_ats_summary(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.ai.ats_threshold import get_ats_summary
    return get_ats_summary(job_id, db)


@router.post("/{job_id}/pipeline/dry-run")
@rate_limit("5/minute")
def run_job_pipeline_dry_run(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can run the pipeline")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to run pipeline for this job")

    result = run_full_pipeline(job_id, db, dry_run=True)
    return result

@router.post("/{job_id}/pipeline/async")
@rate_limit("5/minute")
def run_pipeline_async(
    request: Request,
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")
    
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    task_id = str(uuid.uuid4())
    task = models.TaskStatus(id=task_id, status="pending")
    db.add(task)
    db.commit()

    background_tasks.add_task(run_pipeline_task, task_id, job_id, db)

    return {
        "task_id": task_id,
        "status": "pending",
        "message": f"Pipeline started. Poll GET /tasks/{task_id} for results"
    }
