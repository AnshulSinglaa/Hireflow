import json
from sqlalchemy.orm import Session
from app import models


def run_hard_knockout(application_id: int, job_id: int, db: Session) -> dict:
    """
    Rule-based instant check — no LLM, runs in under 100ms.
    Returns: {passed: bool, reason: str}
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job or not job.ats_criteria:
        # no criteria set — pass everyone through
        return {"passed": True, "reason": "No ATS criteria set"}

    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if not application or not application.parsed_resume:
        return {"passed": False, "reason": "Resume not parsed"}

    try:
        parsed = json.loads(application.parsed_resume)
    except Exception:
        return {"passed": False, "reason": "Resume parse error"}

    if "error" in parsed:
        return {"passed": False, "reason": "Resume could not be parsed"}

    criteria = job.ats_criteria
    candidate_skills = [s.lower() for s in parsed.get("skills", [])]
    candidate_text = " ".join(candidate_skills) + " " + parsed.get("summary", "").lower()

    # CHECK 1 — minimum experience years
    min_exp = criteria.get("min_experience_years", 0)
    if min_exp > 0:
        candidate_exp = parsed.get("experience_years", 0) or 0
        try:
            candidate_exp = float(candidate_exp)
        except (ValueError, TypeError):
            candidate_exp = 0
        if candidate_exp < min_exp:
            return {
                "passed": False,
                "reason": f"Requires {min_exp} years experience. Candidate has {candidate_exp} years."
            }

    # CHECK 2 — required keywords (ALL must be present)
    required_keywords = criteria.get("required_keywords", [])
    missing = []
    for keyword in required_keywords:
        if keyword.lower() not in candidate_text:
            missing.append(keyword)
    if missing:
        return {
            "passed": False,
            "reason": f"Missing required skills: {', '.join(missing)}"
        }

    # CHECK 3 — education requirement
    edu_requirement = criteria.get("education_requirement")
    if edu_requirement and edu_requirement.lower() not in ["any", "none", "null", ""]:
        edu_text = " ".join([
            str(e) for e in parsed.get("education", [])
        ]).lower()
        edu_keywords = {
            "bachelor's": ["bachelor", "b.tech", "b.e", "be", "bsc", "undergraduate"],
            "master's": ["master", "m.tech", "msc", "mba", "postgraduate"],
            "phd": ["phd", "doctorate", "doctoral"]
        }
        required_edu = edu_requirement.lower()
        keywords_to_check = edu_keywords.get(required_edu, [required_edu])
        if not any(kw in edu_text for kw in keywords_to_check):
            return {
                "passed": False,
                "reason": f"Education requirement not met: {edu_requirement} required"
            }

    return {"passed": True, "reason": "Passed all knockout criteria"}


def run_ats_gate(application_id: int, job_id: int, db: Session) -> dict:
    """
    Full ATS gate — hard knockout only for now.
    Updates application status in DB.
    Returns result dict.
    """
    result = run_hard_knockout(application_id, job_id, db)

    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()

    if application:
        if result["passed"]:
            application.status = "ats_passed"
        else:
            application.status = "ats_failed"
        db.commit()

    return result
