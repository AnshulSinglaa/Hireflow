from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/", response_model=schemas.JobResponse, status_code=201)
def create_job(
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
    return new_job


@router.get("/", response_model=list[schemas.JobResponse])
def get_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).all()


@router.get("/{job_id}", response_model=schemas.JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(
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
def get_job_applications(
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
