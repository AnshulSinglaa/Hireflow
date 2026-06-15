from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.limiter import rate_limit
from pydantic import BaseModel
from typing import Optional
import json
import os
import uuid

router = APIRouter(prefix="/candidates", tags=["Candidates"])

UPLOAD_DIR = "uploads/photos"


class ProfileCreate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list] = []
    experience: Optional[list] = []
    education: Optional[list] = []
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    salary_expectation: Optional[str] = None


def calculate_completeness(profile: models.CandidateProfile) -> int:
    """
    Calculate profile completeness 0-100.
    Each field contributes points.
    """
    score = 0
    if profile.full_name:           score += 15
    if profile.bio:                 score += 10
    if profile.skills:              score += 20
    if profile.experience:          score += 20
    if profile.education:           score += 15
    if profile.photo_path:          score += 10
    if profile.github_url or \
       profile.linkedin_url or \
       profile.portfolio_url:       score += 10
    return min(score, 100)


@router.post("/profile", status_code=201)
@rate_limit("10/minute")
def create_profile(
    request: Request,
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can create profiles")

    existing = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Profile already exists. Use PUT to update.")

    profile = models.CandidateProfile(
        user_id=current_user.id,
        full_name=data.full_name,
        bio=data.bio,
        skills=data.skills,
        experience=data.experience,
        education=data.education,
        github_url=data.github_url,
        linkedin_url=data.linkedin_url,
        portfolio_url=data.portfolio_url,
        salary_expectation=data.salary_expectation,
    )
    db.add(profile)
    db.flush()
    profile.profile_complete = calculate_completeness(profile)
    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile created",
        "profile_complete": profile.profile_complete,
        "profile": profile
    }


@router.get("/profile/me")
@rate_limit("30/minute")
def get_my_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates have profiles")

    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()

    if not profile:
        # return empty profile structure so frontend
        # knows to show the setup form
        return {
            "exists": False,
            "profile_complete": 0,
            "user_email": current_user.email
        }

    return {
        "exists": True,
        "profile_complete": profile.profile_complete,
        "user_email": current_user.email,
        "profile": {
            "id": profile.id,
            "full_name": profile.full_name,
            "bio": profile.bio,
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "education": profile.education or [],
            "photo_path": profile.photo_path,
            "github_url": profile.github_url,
            "linkedin_url": profile.linkedin_url,
            "portfolio_url": profile.portfolio_url,
            "salary_expectation": profile.salary_expectation,
            "created_at": str(profile.created_at)
        }
    }


@router.put("/profile")
@rate_limit("20/minute")
def update_profile(
    request: Request,
    data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates have profiles")

    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Use POST to create first."
        )

    # update only provided fields
    if data.full_name is not None:
        profile.full_name = data.full_name
    if data.bio is not None:
        profile.bio = data.bio
    if data.skills is not None:
        profile.skills = data.skills
    if data.experience is not None:
        profile.experience = data.experience
    if data.education is not None:
        profile.education = data.education
    if data.github_url is not None:
        profile.github_url = data.github_url
    if data.linkedin_url is not None:
        profile.linkedin_url = data.linkedin_url
    if data.portfolio_url is not None:
        profile.portfolio_url = data.portfolio_url
    if data.salary_expectation is not None:
        profile.salary_expectation = data.salary_expectation

    # recalculate completeness
    profile.profile_complete = calculate_completeness(profile)

    from datetime import datetime
    profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile updated",
        "profile_complete": profile.profile_complete,
        "profile": {
            "id": profile.id,
            "full_name": profile.full_name,
            "bio": profile.bio,
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "education": profile.education or [],
            "photo_path": profile.photo_path,
            "github_url": profile.github_url,
            "linkedin_url": profile.linkedin_url,
            "portfolio_url": profile.portfolio_url,
            "salary_expectation": profile.salary_expectation,
        }
    }


@router.post("/profile/photo")
@rate_limit("5/minute")
async def upload_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates")

    # validate image type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, or WebP images allowed"
        )

    contents = await file.read()

    # validate size — max 2MB
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 2MB")

    # save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = f"{UPLOAD_DIR}/{filename}"

    with open(file_path, "wb") as f:
        f.write(contents)

    # update profile
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Create your profile first before uploading photo"
        )

    # delete old photo if exists
    if profile.photo_path and os.path.exists(profile.photo_path):
        try:
            os.remove(profile.photo_path)
        except Exception:
            pass

    profile.photo_path = file_path
    profile.profile_complete = calculate_completeness(profile)
    db.commit()

    return {
        "message": "Photo uploaded",
        "photo_path": file_path,
        "profile_complete": profile.profile_complete
    }


@router.get("/{user_id}/profile")
@rate_limit("30/minute")
def get_public_profile(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Public profile view — recruiters can see
    candidate profiles of applicants they own.
    """
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can view candidate profiles")

    # verify recruiter has a job this candidate applied to
    application = db.query(models.Application).join(
        models.Job,
        models.Application.job_id == models.Job.id
    ).filter(
        models.Application.candidate_id == user_id,
        models.Job.owner_id == current_user.id
    ).first()

    if not application:
        raise HTTPException(
            status_code=403,
            detail="You can only view profiles of candidates who applied to your jobs"
        )

    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == user_id
    ).first()

    if not profile:
        return {"exists": False, "message": "Candidate has not set up their profile"}

    return {
        "exists": True,
        "profile": {
            "full_name": profile.full_name,
            "bio": profile.bio,
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "education": profile.education or [],
            "photo_path": profile.photo_path,
            "github_url": profile.github_url,
            "linkedin_url": profile.linkedin_url,
            "portfolio_url": profile.portfolio_url,
        }
    }


@router.get("/applications/my")
@rate_limit("30/minute")
def get_my_applications(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Candidate dashboard — all their applications
    with status timeline and interview details.
    """
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates")

    applications = db.query(models.Application).filter(
        models.Application.candidate_id == current_user.id
    ).order_by(models.Application.created_at.desc()).all()

    result = []
    for app in applications:
        job = db.query(models.Job).filter(
            models.Job.id == app.job_id
        ).first()

        # get interview if exists
        interview = db.query(models.Interview).filter(
            models.Interview.application_id == app.id
        ).order_by(models.Interview.created_at.desc()).first()

        result.append({
            "application_id": app.id,
            "job_id": app.job_id,
            "job_title": job.title if job else "Unknown",
            "company": job.company if job else "Unknown",
            "status": app.status,
            "ats_score": app.ats_score,
            "pipeline_score": app.pipeline_score,
            "applied_at": str(app.created_at),
            "interview": {
                "scheduled_date": str(interview.scheduled_date) if interview else None,
                "format": interview.format if interview else None,
                "meet_link": interview.meet_link if interview else None,
                "duration_minutes": interview.duration_minutes if interview else None,
                "status": interview.status if interview else None,
                "notes": interview.notes if interview else None,
            } if interview else None
        })

    # summary counts for dashboard cards
    summary = {
        "total_applied": len(applications),
        "shortlisted": sum(1 for a in applications if a.status == "shortlisted"),
        "interview_scheduled": sum(1 for a in applications if a.status == "interview_scheduled"),
        "rejected": sum(1 for a in applications if a.status == "rejected"),
    }

    return {
        "summary": summary,
        "applications": result
    }
