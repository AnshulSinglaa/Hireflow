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
import json
import os
from datetime import datetime

def sanitize_text(text: str) -> str:
    """Remove potential prompt injection from user text"""
    injection_patterns = [
        "ignore previous instructions",
        "ignore above",
        "you are now",
        "forget everything",
        "new instructions:",
        "system prompt:",
    ]
    text_lower = text.lower()
    for pattern in injection_patterns:
        if pattern in text_lower:
            raise HTTPException(
                status_code=400,
                detail="Invalid content in job description"
            )
    return text.strip()

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/", response_model=schemas.JobResponse, status_code=201)
@rate_limit("20/minute")
def create_job(
    request: Request,
    job: schemas.JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can post jobs")
    
    new_job = models.Job(
        title=sanitize_text(job.title),
        description=sanitize_text(job.description),
        company=sanitize_text(job.company),
        owner_id=current_user.id,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # run ATS parsing + fraud scan in background
    # recruiter gets instant response
    job_id = new_job.id

    def run_job_analysis(job_id: int):
        from app.database import SessionLocal
        bg_db = SessionLocal()
        try:
            job_record = bg_db.query(models.Job).filter(
                models.Job.id == job_id
            ).first()
            if not job_record:
                return

            from app.ai.ats_parser import extract_ats_criteria
            from app.ai.fraud_detector import scan_job_for_fraud

            criteria = extract_ats_criteria(job_record.title, job_record.description)
            job_record.ats_criteria = criteria

            fraud_result = scan_job_for_fraud(job_record.title, job_record.description)
            job_record.fraud_scan_result = fraud_result
            if fraud_result.get("fraud_score", 0) >= 70:
                job_record.is_flagged = True

            bg_db.commit()
            print(f"[JOB ANALYSIS] Job {job_id} analysed ✅")
        except Exception as e:
            print(f"[JOB ANALYSIS] Failed for job {job_id}: {e}")
            bg_db.rollback()
        finally:
            bg_db.close()  # Fix 6 — new session per background task

    background_tasks.add_task(run_job_analysis, job_id)
    return new_job



@router.get("/", response_model=schemas.PaginatedJobsResponse)
@rate_limit("60/minute")
def get_jobs(
    request: Request,
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 20,
    search: str = None,
    company: str = None,
    job_type: str = None,
    work_mode: str = None,
    active_only: bool = True,
    recruiter_only: bool = False,
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Job)

    # filter by recruiter's own jobs
    if recruiter_only and current_user:
        query = query.filter(models.Job.owner_id == current_user.id)

    # filter inactive/flagged jobs
    if active_only and not recruiter_only:
        query = query.filter(models.Job.is_active == True)

    # search by title or description
    if search:
        query = query.filter(
            models.Job.title.ilike(f"%{search}%") |
            models.Job.description.ilike(f"%{search}%")
        )

    # filter by company
    if company:
        query = query.filter(
            models.Job.company.ilike(f"%{company}%")
        )

    # filter by job type
    if job_type:
        query = query.filter(models.Job.job_type == job_type)

    # filter by work mode
    if work_mode:
        query = query.filter(models.Job.work_mode == work_mode)

    # pagination
    offset = (page - 1) * limit
    jobs = query.order_by(
        models.Job.created_at.desc()
    ).offset(offset).limit(limit).all()

    # annotate jobs with application stats
    for j in jobs:
        j.total_applications = db.query(models.Application).filter(models.Application.job_id == j.id).count()
        j.ats_passed = db.query(models.Application).filter(models.Application.job_id == j.id, models.Application.status == 'ats_passed').count()
        j.ats_failed = db.query(models.Application).filter(models.Application.job_id == j.id, models.Application.status == 'ats_failed').count()
        j.duplicates = db.query(models.Application).filter(models.Application.job_id == j.id, models.Application.status == 'duplicate').count()

    # total count for frontend pagination
    total = query.count()

    return {
        "jobs": jobs,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


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


@router.get("/{job_id}/applications", response_model=list)
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
        raise HTTPException(status_code=403, detail="Not authorized")

    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id
    ).all()

    from app.ai.blind_hiring import filter_candidate_response

    results = []
    for app in applications:
        parsed = {}
        if app.parsed_resume:
            try:
                parsed = json.loads(app.parsed_resume)
            except Exception:
                pass

        candidate_data = {
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "name": parsed.get("name", "Unknown"),
            "email": parsed.get("email", ""),
            "skills": parsed.get("skills", []),
            "experience_years": parsed.get("experience_years"),
            "status": app.status,
            "ats_score": app.ats_score,
            "ats_result": json.loads(app.ats_result) if app.ats_result else None,
            "pipeline_score": app.pipeline_score,
            "created_at": str(app.created_at)
        }

        results.append(
            filter_candidate_response(candidate_data, app.id, job.blind_hiring)
        )

    return results


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

    background_tasks.add_task(run_pipeline_task, task_id, job_id)

    return {
        "task_id": task_id,
        "status": "pending",
        "message": f"Pipeline started. Poll GET /tasks/{task_id} for results"
    }


@router.get("/{job_id}/candidates/{application_id}/explain")
@rate_limit("10/minute")
def explain_ranking(
    request: Request,
    job_id: int,
    application_id: int,
    rank: int = 1,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.ai.explainer import explain_candidate_ranking
    return explain_candidate_ranking(application_id, job_id, rank, db)


@router.get("/{job_id}/candidates/compare")
@rate_limit("10/minute")
def compare_two_candidates(
    request: Request,
    job_id: int,
    candidate_a: int,
    candidate_b: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.ai.explainer import compare_candidates
    return compare_candidates(candidate_a, candidate_b, job_id, db)


@router.post("/{job_id}/candidates/{application_id}/decision")
@rate_limit("20/minute")
def make_candidate_decision(
    request: Request,
    job_id: int,
    application_id: int,
    decision: str,  # shortlisted / rejected / maybe
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    if decision not in ["shortlisted", "rejected", "maybe"]:
        raise HTTPException(
            status_code=400,
            detail="Decision must be: shortlisted, rejected, or maybe"
        )

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.job_id == job_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # get candidate info for email
    candidate = db.query(models.User).filter(
        models.User.id == application.candidate_id
    ).first()

    parsed = {}
    if application.parsed_resume:
        try:
            parsed = json.loads(application.parsed_resume)
        except Exception:
            pass

    candidate_name = parsed.get("name") or (
        candidate.email.split("@")[0] if candidate else "Candidate"
    )
    candidate_email = candidate.email if candidate else None

    # update status
    application.status = decision
    db.commit()

    # create in-app notification
    from app.email_service import (
        send_shortlisted_email,
        send_rejected_email,
        create_notification
    )

    if decision == "shortlisted":
        # notification
        create_notification(
            user_id=application.candidate_id,
            type="shortlisted",
            title=f"Shortlisted — {job.title}",
            message=f"Congratulations! You've been shortlisted for {job.title} at {job.company}.",
            db=db,
            related_job_id=job_id,
            related_application_id=application_id
        )
        # email
        if candidate_email:
            send_shortlisted_email(
                candidate_email=candidate_email,
                candidate_name=candidate_name,
                job_title=job.title,
                company=job.company
            )

    elif decision == "rejected":
        # get rejection reason from pipeline result
        reason = None
        tips = []
        if application.pipeline_result:
            try:
                pipeline = json.loads(application.pipeline_result)
                reason = pipeline.get("rejection_reason")
                tips = pipeline.get("improvement_tips", [])
            except Exception:
                pass

        # notification
        create_notification(
            user_id=application.candidate_id,
            type="rejected",
            title=f"Application Update — {job.title}",
            message=f"Thank you for applying to {job.title} at {job.company}. Unfortunately we won't be moving forward.",
            db=db,
            related_job_id=job_id,
            related_application_id=application_id
        )
        # email
        if candidate_email:
            send_rejected_email(
                candidate_email=candidate_email,
                candidate_name=candidate_name,
                job_title=job.title,
                company=job.company,
                reason=reason,
                tips=tips
            )

    elif decision == "maybe":
        # notification only — no email for maybe
        create_notification(
            user_id=application.candidate_id,
            type="under_review",
            title=f"Application Under Review — {job.title}",
            message=f"Your application for {job.title} at {job.company} is under review.",
            db=db,
            related_job_id=job_id,
            related_application_id=application_id
        )

    return {
        "message": f"Candidate {decision} successfully",
        "application_id": application_id,
        "status": decision,
        "email_sent": candidate_email is not None and decision != "maybe"
    }


@router.post("/{job_id}/bulk-decision")
@rate_limit("5/minute")
def bulk_decision(
    request: Request,
    job_id: int,
    min_score: int = 75,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Approve all candidates above min_score threshold.
    Recruiter sets score cutoff — bulk action.
    """
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # get all pipeline-processed applications
    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.pipeline_score != None
    ).all()

    shortlisted = []
    rejected = []

    for app in applications:
        if (app.pipeline_score or 0) >= min_score:
            app.status = "shortlisted"
            shortlisted.append(app.id)
        else:
            app.status = "rejected"
            rejected.append(app.id)

    db.commit()

    return {
        "message": f"Bulk decision complete",
        "shortlisted": len(shortlisted),
        "rejected": len(rejected),
        "threshold_used": min_score,
        "note": "Emails not sent — use individual decision endpoint to trigger emails"
    }


@router.get("/{job_id}/download")
@rate_limit("5/minute")
def download_pipeline_results(
    request: Request,
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generates zip file:
    ├── shortlisted/ (score-ordered PDFs)
    ├── maybe/       (score-ordered PDFs)
    └── pipeline_report.pdf
    Only shortlisted + maybe resumes stored.
    Rejected resumes not included.
    """
    import zipfile
    import io
    from fastapi.responses import StreamingResponse

    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # get shortlisted candidates — score ordered
    shortlisted = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.status == "shortlisted"
    ).order_by(models.Application.pipeline_score.desc().nullslast()).all()

    # get maybe candidates — score ordered
    maybe = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.status == "maybe"
    ).order_by(models.Application.pipeline_score.desc().nullslast()).all()

    if not shortlisted and not maybe:
        raise HTTPException(
            status_code=404,
            detail="No shortlisted or maybe candidates found. Run pipeline and make decisions first."
        )

    # build report content before streaming
    report_lines = [
        "HIREFLOW PIPELINE REPORT",
        "========================",
        f"Job: {job.title}",
        f"Company: {job.company}",
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "SUMMARY",
        "-------",
        f"Shortlisted: {len(shortlisted)}",
        f"Maybe: {len(maybe)}",
        "",
        "SHORTLISTED CANDIDATES",
        "----------------------",
    ]
    for idx, app in enumerate(shortlisted, 1):
        p = {}
        if app.parsed_resume:
            try:
                p = json.loads(app.parsed_resume)
            except Exception:
                pass
        name = p.get("name", f"Candidate {app.id}")
        score = app.pipeline_score or app.ats_score or 0
        skills = ", ".join(p.get("skills", [])[:5])
        report_lines.append(f"{idx}. {name} — Score: {score}/100")
        report_lines.append(f"   Skills: {skills}")
        if app.pipeline_result:
            try:
                pr = json.loads(app.pipeline_result)
                qs = pr.get("interview_questions", [])
                if qs:
                    report_lines.append("   Interview Questions:")
                    for q in qs[:5]:
                        report_lines.append(f"   • {q}")
            except Exception:
                pass
        report_lines.append("")
    report_lines += ["MAYBE CANDIDATES", "----------------"]
    for idx, app in enumerate(maybe, 1):
        p = {}
        if app.parsed_resume:
            try:
                p = json.loads(app.parsed_resume)
            except Exception:
                pass
        name = p.get("name", f"Candidate {app.id}")
        score = app.pipeline_score or app.ats_score or 0
        report_lines.append(f"{idx}. {name} — Score: {score}/100")
    report_content = "\n".join(report_lines)

    # stream zip directly instead of building in memory
    def generate_zip():
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:

            for idx, app in enumerate(shortlisted, 1):
                if not app.resume_path or not os.path.exists(app.resume_path):
                    continue
                parsed = {}
                if app.parsed_resume:
                    try:
                        parsed = json.loads(app.parsed_resume)
                    except Exception:
                        pass
                name = parsed.get("name", f"candidate_{app.id}").replace(" ", "_").lower()
                score = app.pipeline_score or app.ats_score or 0
                zf.write(app.resume_path, f"shortlisted/{idx:02d}_{name}_{score}.pdf")

            for idx, app in enumerate(maybe, 1):
                if not app.resume_path or not os.path.exists(app.resume_path):
                    continue
                parsed = {}
                if app.parsed_resume:
                    try:
                        parsed = json.loads(app.parsed_resume)
                    except Exception:
                        pass
                name = parsed.get("name", f"candidate_{app.id}").replace(" ", "_").lower()
                score = app.pipeline_score or app.ats_score or 0
                zf.write(app.resume_path, f"maybe/{idx:02d}_{name}_{score}.pdf")

            zf.writestr("pipeline_report.txt", report_content)

        buffer.seek(0)
        yield buffer.read()

    fname = f"hireflow_{job.company}_{job.title}_{job_id}.zip".replace(" ", "_").lower()
    return StreamingResponse(
        generate_zip(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )


@router.post("/{job_id}/candidates/{application_id}/interview")
@rate_limit("10/minute")
def schedule_interview(
    request: Request,
    job_id: int,
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.job_id == job_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status != "shortlisted":
        raise HTTPException(
            status_code=400,
            detail="Can only schedule interviews for shortlisted candidates"
        )

    # parse request body
    from pydantic import BaseModel
    from typing import Optional
    from datetime import datetime as dt

    # Stub endpoint — request body parsing and confirmation only
    # Actual scheduling is handled by the /schedule action endpoint below
    return {
        "message": "To schedule interview, POST to /{job_id}/candidates/{application_id}/schedule",
        "required_fields": ["scheduled_date", "scheduled_time", "duration_minutes", "format", "meet_link"]
    }


@router.post("/{job_id}/candidates/{application_id}/schedule")
@rate_limit("10/minute")
async def schedule_interview_action(
    request: Request,
    job_id: int,
    application_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    application = db.query(models.Application).filter(
        models.Application.id == application_id,
        models.Application.job_id == job_id
    ).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status != "shortlisted":
        raise HTTPException(
            status_code=400,
            detail="Can only schedule interviews for shortlisted candidates"
        )

    # parse date + time
    try:
        scheduled_datetime = datetime.strptime(
            f"{data['scheduled_date']} {data['scheduled_time']}",
            "%Y-%m-%d %H:%M"
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date/time format. Use YYYY-MM-DD and HH:MM")

    # create interview record
    interview = models.Interview(
        application_id=application_id,
        job_id=job_id,
        candidate_id=application.candidate_id,
        recruiter_id=current_user.id,
        scheduled_date=scheduled_datetime,
        duration_minutes=data.get("duration_minutes", 45),
        format=data.get("format", "google_meet"),
        meet_link=data.get("meet_link"),
        notes=data.get("notes"),
        status="scheduled"
    )
    db.add(interview)

    # update application status
    application.status = "interview_scheduled"
    db.commit()
    db.refresh(interview)

    # get candidate info
    candidate = db.query(models.User).filter(
        models.User.id == application.candidate_id
    ).first()

    parsed = {}
    if application.parsed_resume:
        try:
            parsed = json.loads(application.parsed_resume)
        except Exception:
            pass

    candidate_name = parsed.get("name") or (
        candidate.email.split("@")[0] if candidate else "Candidate"
    )

    from app.email_service import send_interview_email, create_notification

    # in-app notification
    create_notification(
        user_id=application.candidate_id,
        type="interview_scheduled",
        title=f"Interview Scheduled — {job.title}",
        message=f"Your interview for {job.title} at {job.company} is scheduled for {data['scheduled_date']} at {data['scheduled_time']} IST.",
        db=db,
        related_job_id=job_id,
        related_application_id=application_id
    )

    # send email
    if candidate and candidate.email:
        send_interview_email(
            candidate_email=candidate.email,
            candidate_name=candidate_name,
            job_title=job.title,
            company=job.company,
            date=data["scheduled_date"],
            time=data["scheduled_time"],
            duration=data.get("duration_minutes", 45),
            format=data.get("format", "google_meet"),
            meet_link=data.get("meet_link"),
            notes=data.get("notes")
        )

    return {
        "message": "Interview scheduled successfully",
        "interview_id": interview.id,
        "scheduled_date": data["scheduled_date"],
        "scheduled_time": data["scheduled_time"],
        "format": interview.format,
        "meet_link": interview.meet_link,
        "email_sent": candidate is not None
    }


@router.patch("/{job_id}/candidates/{application_id}/interview/reschedule")
@rate_limit("10/minute")
async def reschedule_interview(
    request: Request,
    job_id: int,
    application_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters")

    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or job.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # find existing interview
    interview = db.query(models.Interview).filter(
        models.Interview.application_id == application_id,
        models.Interview.job_id == job_id
    ).order_by(models.Interview.created_at.desc()).first()

    if not interview:
        raise HTTPException(status_code=404, detail="No interview found to reschedule")

    # update interview
    try:
        new_datetime = datetime.strptime(
            f"{data['scheduled_date']} {data['scheduled_time']}",
            "%Y-%m-%d %H:%M"
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date/time format")

    interview.scheduled_date = new_datetime
    interview.status = "rescheduled"
    if data.get("meet_link"):
        interview.meet_link = data["meet_link"]
    interview.updated_at = datetime.utcnow()
    db.commit()

    # get candidate
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    candidate = db.query(models.User).filter(
        models.User.id == interview.candidate_id
    ).first()

    from app.email_service import send_interview_rescheduled_email, create_notification

    # notification
    create_notification(
        user_id=interview.candidate_id,
        type="interview_rescheduled",
        title=f"Interview Rescheduled — {job.title}",
        message=f"Your interview for {job.title} has been rescheduled to {data['scheduled_date']} at {data['scheduled_time']} IST.",
        db=db,
        related_job_id=job_id,
        related_application_id=application_id
    )

    # email
    if candidate:
        send_interview_rescheduled_email(
            candidate_email=candidate.email,
            candidate_name=candidate.email.split("@")[0],
            job_title=job.title,
            company=job.company,
            new_date=data["scheduled_date"],
            new_time=data["scheduled_time"],
            meet_link=data.get("meet_link")
        )

    return {
        "message": "Interview rescheduled successfully",
        "interview_id": interview.id,
        "new_date": data["scheduled_date"],
        "new_time": data["scheduled_time"],
        "email_sent": candidate is not None
    }
