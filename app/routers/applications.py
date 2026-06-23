from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from app.limiter import rate_limit
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
import uuid, os
from app.ai.parser import parse_resume, clean_placeholder_name
from app.ai.scorer import score_candidate
import json

router = APIRouter(tags=["Applications"])

UPLOAD_DIR = "uploads/resumes"

@router.post("/jobs/{job_id}/apply", response_model=schemas.ApplicationResponse, status_code=201)
@rate_limit("5/minute")
async def apply_to_job(
    request: Request,
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.candidate_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already applied")

    # Validate file
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    contents = await file.read()
    
    # validate PDF magic bytes — first 4 bytes must be %PDF
    if not contents.startswith(b'%PDF'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file — not a valid PDF"
        )

    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB")

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = f"{UPLOAD_DIR}/{unique_filename}"
    with open(file_path, "wb") as f:
        f.write(contents)

    # wrap all DB writes in one transaction
    try:
        # Save application
        application = models.Application(
            job_id=job_id,
            candidate_id=current_user.id,
            resume_path=file_path
        )
        db.add(application)
        db.flush()  # get ID without committing

        # Parse resume
        try:
            parsed = parse_resume(file_path)
            if parsed and "error" not in parsed:
                parsed["name"] = clean_placeholder_name(
                    parsed.get("name"), current_user.email
                )
        except Exception as e:
            print(f"PARSER ERROR: {e}")
            parsed = {"error": str(e)}

        application.parsed_resume = json.dumps(parsed)

        # Save embedding — use a savepoint so failure doesn't corrupt the session
        if parsed and "error" not in parsed:
            try:
                from app.ai.matcher import save_embedding
                skills = " ".join(parsed.get("skills", []))
                summary = parsed.get("summary", "")
                savepoint = db.begin_nested()
                save_embedding(application.id, f"{skills} {summary}", db)
                savepoint.commit()
            except Exception as e:
                print(f"EMBEDDING ERROR: {e}")
                try:
                    savepoint.rollback()
                except Exception:
                    pass
                # non-fatal — application still gets saved

        db.commit()  # single commit for everything
        db.refresh(application)

    except Exception as e:
        db.rollback()  # rollback everything if any step fails
        raise HTTPException(status_code=500, detail=f"Application failed: {str(e)}")

    # ATS gate runs after commit — separate operation.
    # CRITICAL: never leave an application stuck on "pending" forever.
    # If parsing failed earlier, or the gate itself throws (e.g. Groq
    # timeout, malformed LLM response), explicitly mark it ats_failed
    # so it's visible on the dashboard instead of silently vanishing.
    try:
        from app.ai.ats_gate import run_ats_gate
        from app.ai.ats_scorer import run_ats_soft_score

        if parsed and "error" in parsed:
            # resume never parsed successfully — can't run real ATS logic
            application.status = "ats_failed"
            application.ats_result = json.dumps({
                "passed": False,
                "reason": "Resume could not be parsed (scanned/image PDF or extraction error)"
            })
            db.commit()
        else:
            ats_result = run_ats_gate(application.id, job_id, db)
            if ats_result["passed"]:
                run_ats_soft_score(application.id, job_id, db)
    except Exception as e:
        print(f"ATS ERROR: {e}")
        # gate itself failed — still mark explicitly instead of leaving "pending"
        application.status = "ats_failed"
        application.ats_result = json.dumps({
            "passed": False,
            "reason": f"ATS processing error: {str(e)}"
        })
        db.commit()

    return application

@router.get("/applications/{application_id}/parsed")
@rate_limit("20/minute")
def get_parsed_resume(
    request: Request,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Authorization: must be the candidate who applied, or the recruiter who owns the job
    job = db.query(models.Job).filter(models.Job.id == application.job_id).first()
    is_own_application = current_user.id == application.candidate_id
    is_job_owner = job and current_user.id == job.owner_id
    if not (is_own_application or is_job_owner):
        raise HTTPException(status_code=403, detail="Not authorized to view this resume")

    if not application.parsed_resume:
        raise HTTPException(status_code=404, detail="Resume not parsed yet")
    return json.loads(application.parsed_resume)

@router.get("/applications/{application_id}/score")
@rate_limit("10/minute")
def get_candidate_score(
    request: Request,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Authorization: must be the candidate who applied, or the recruiter who owns the job
    job = db.query(models.Job).filter(models.Job.id == application.job_id).first()
    is_own_application = current_user.id == application.candidate_id
    is_job_owner = job and current_user.id == job.owner_id
    if not (is_own_application or is_job_owner):
        raise HTTPException(status_code=403, detail="Not authorized to view this score")

    return score_candidate(application_id, db)
