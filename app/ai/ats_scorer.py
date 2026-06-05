import os
import json
from groq import Groq
from sqlalchemy.orm import Session
from app import models

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def run_ats_soft_score(application_id: int, job_id: int, db: Session) -> dict:
    """
    Lightweight LLM call — runs after hard knockout passes.
    Returns ATS score 0-100 with breakdown.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()

    if not job or not application or not application.parsed_resume:
        return {"ats_score": 0, "breakdown": {}, "verdict": "error"}

    try:
        parsed = json.loads(application.parsed_resume)
    except Exception:
        return {"ats_score": 0, "breakdown": {}, "verdict": "error"}

    prompt = f"""
    You are an ATS (Applicant Tracking System) scoring engine.
    Score this candidate against the job description.

    Job Title: {job.title}
    Job Description: {job.description}

    Candidate Skills: {', '.join(parsed.get('skills', []))}
    Candidate Experience: {parsed.get('experience_years', 0)} years
    Candidate Summary: {parsed.get('summary', '')}
    Candidate Education: {parsed.get('education', '')}

    Return ONLY this JSON, nothing else:
    {{
        "ats_score": <0-100 overall score>,
        "breakdown": {{
            "keyword_match": <0-100>,
            "experience_relevance": <0-100>,
            "skills_overlap": <0-100>,
            "formatting_quality": <0-100>,
            "completeness": <0-100>
        }},
        "matched_keywords": [<keywords found in both JD and resume>],
        "missing_keywords": [<important JD keywords missing from resume>],
        "verdict": "<Strong|Good|Needs Work|Poor>"
    }}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        # save ats score to application
        application = db.query(models.Application).filter(
            models.Application.id == application_id
        ).first()
        if application:
            application.ats_score = result.get("ats_score", 0)
            application.ats_result = json.dumps(result)
            db.commit()

        return result

    except Exception as e:
        return {
            "ats_score": 0,
            "breakdown": {},
            "matched_keywords": [],
            "missing_keywords": [],
            "verdict": "error",
            "error": str(e)
        }
