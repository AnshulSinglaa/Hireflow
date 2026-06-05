import json
from sqlalchemy.orm import Session
from app import models


def get_pipeline_candidates(job_id: int, db: Session) -> list:
    """
    Apply dynamic threshold to get candidates for pipeline.
    Uses job's ats_mode, ats_threshold, ats_top_n settings.
    Returns list of application IDs to process.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return []

    # get all ATS passed candidates with scores
    passed = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.status == "ats_passed",
        models.Application.ats_score != None
    ).all()

    if not passed:
        # fallback — if ATS never ran, get all applications
        passed = db.query(models.Application).filter(
            models.Application.job_id == job_id,
            models.Application.parsed_resume != None
        ).all()

    # sort by ATS score descending
    passed.sort(key=lambda x: x.ats_score or 0, reverse=True)

    mode = job.ats_mode or "threshold"

    if mode == "top_n":
        top_n = job.ats_top_n or 20
        selected = passed[:top_n]
    else:
        # threshold mode — default
        threshold = job.ats_threshold or 65
        selected = [a for a in passed if (a.ats_score or 0) >= threshold]

        # safety net — if threshold too strict and nobody passes
        # take top 5 anyway so pipeline always has something
        if not selected and passed:
            selected = passed[:5]

    return [app.id for app in selected]


def get_ats_summary(job_id: int, db: Session) -> dict:
    """
    Returns application counts per status for recruiter dashboard.
    """
    all_apps = db.query(models.Application).filter(
        models.Application.job_id == job_id
    ).all()

    summary = {
        "total": len(all_apps),
        "ats_passed": 0,
        "ats_failed": 0,
        "duplicate": 0,
        "pending": 0,
        "pipeline_ready": 0
    }

    for app in all_apps:
        status = app.status or "pending"
        if status in summary:
            summary[status] += 1

    # pipeline ready = passed ATS + meets threshold
    pipeline_ids = get_pipeline_candidates(job_id, db)
    summary["pipeline_ready"] = len(pipeline_ids)

    return summary
