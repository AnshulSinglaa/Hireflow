from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.ai.trust_scorer import calculate_trust_score
from app.limiter import rate_limit
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/companies", tags=["Companies"])


class CompanyCreate(BaseModel):
    name: str
    about: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    gst_number: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None


@router.post("/", status_code=201)
@rate_limit("5/minute")
def create_company(
    request: Request,
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can create company profiles")

    # check if already exists
    existing = db.query(models.Company).filter(
        models.Company.owner_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Company profile already exists")

    # run trust score calculation
    trust_result = calculate_trust_score(
        email=current_user.email,
        website=data.website,
        linkedin_url=data.linkedin_url,
        gst_number=data.gst_number
    )

    company = models.Company(
        owner_id=current_user.id,
        name=data.name,
        about=data.about,
        website=data.website,
        linkedin_url=data.linkedin_url,
        gst_number=data.gst_number,
        industry=data.industry,
        size=data.size,
        location=data.location,
        trust_score=trust_result["trust_score"],
        verification_status=trust_result["verification_status"],
        domain_verified=trust_result["domain_verified"],
        website_verified=trust_result["website_verified"],
        linkedin_verified=trust_result["linkedin_verified"],
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "trust_score": company.trust_score,
            "verification_status": company.verification_status,
            "badge": trust_result["badge"]
        },
        "checks": trust_result["checks"]
    }


@router.get("/me")
@rate_limit("30/minute")
def get_my_company(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    company = db.query(models.Company).filter(
        models.Company.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return company


@router.get("/{company_id}/trust")
@rate_limit("30/minute")
def get_trust_score(
    request: Request,
    company_id: int,
    db: Session = Depends(get_db)
):
    """Public endpoint — candidate sees trust badge on job listing"""
    company = db.query(models.Company).filter(
        models.Company.id == company_id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        "trust_score": company.trust_score,
        "verification_status": company.verification_status,
        "domain_verified": company.domain_verified,
        "website_verified": company.website_verified,
        "linkedin_verified": company.linkedin_verified,
    }
