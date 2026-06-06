from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.limiter import rate_limit
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/reports", tags=["Reports"])

REPORT_CATEGORIES = ["fees", "fake", "misleading", "inappropriate", "other"]

# thresholds
WARN_THRESHOLD = 1      # flag internally
BADGE_THRESHOLD = 5     # show warning badge on listing
HIDE_THRESHOLD = 10     # auto-hide job


class FraudReportCreate(BaseModel):
    category: str
    description: Optional[str] = None


@router.post("/jobs/{job_id}")
@rate_limit("3/minute")
def report_job(
    request: Request,
    job_id: int,
    data: FraudReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can report jobs")

    if data.category not in REPORT_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(REPORT_CATEGORIES)}"
        )

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # prevent duplicate reports from same candidate
    existing = db.query(models.FraudReport).filter(
        models.FraudReport.job_id == job_id,
        models.FraudReport.reported_by == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already reported this job")

    # create report
    report = models.FraudReport(
        job_id=job_id,
        reported_by=current_user.id,
        category=data.category,
        description=data.description
    )
    db.add(report)

    # update company report count
    company = db.query(models.Company).filter(
        models.Company.owner_id == job.owner_id
    ).first()
    if company:
        company.report_count = (company.report_count or 0) + 1

    # update job report count + apply thresholds
    job_reports = db.query(models.FraudReport).filter(
        models.FraudReport.job_id == job_id
    ).count() + 1  # +1 for current report

    message = "Report submitted successfully"

    if job_reports >= HIDE_THRESHOLD:
        job.is_active = False
        job.is_flagged = True
        message = "Report submitted. Job has been hidden pending review."
        # notify admin — just flag for now, admin panel is future phase
        print(f"🚨 JOB {job_id} AUTO-HIDDEN — {job_reports} reports")

    elif job_reports >= BADGE_THRESHOLD:
        job.is_flagged = True
        message = "Report submitted. Warning badge added to this listing."
        print(f"⚠️ JOB {job_id} FLAGGED — {job_reports} reports")

    elif job_reports >= WARN_THRESHOLD:
        print(f"📋 JOB {job_id} REPORTED — {job_reports} total reports (internal only)")

    db.commit()

    return {
        "message": message,
        "report_count": job_reports,
        "job_flagged": job.is_flagged,
        "job_hidden": not job.is_active
    }


@router.get("/jobs/{job_id}/status")
@rate_limit("30/minute")
def get_report_status(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db)
):
    """Public — shows report count and flag status for job listing"""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    report_count = db.query(models.FraudReport).filter(
        models.FraudReport.job_id == job_id
    ).count()

    return {
        "job_id": job_id,
        "is_flagged": job.is_flagged,
        "is_active": job.is_active,
        "report_count": report_count if report_count >= BADGE_THRESHOLD else 0,
        # hide exact count below badge threshold — prevents gaming
    }
