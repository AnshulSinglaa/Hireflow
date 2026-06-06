import os
import json
from app.ai.groq_client import groq_with_retry
from sqlalchemy.orm import Session
from app import models

def explain_candidate_ranking(application_id: int, job_id: int, rank: int, db: Session) -> dict:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    application = db.query(models.Application).filter(models.Application.id == application_id).first()

    if not job or not application or not application.parsed_resume:
        return {"explanation": "No data available for explanation"}

    try:
        parsed = json.loads(application.parsed_resume)
    except Exception:
        return {"explanation": "Could not parse resume data"}

    pipeline_result = None
    if application.pipeline_result:
        try:
            pipeline_result = json.loads(application.pipeline_result)
        except Exception:
            pass

    prompt = f"""
    You are an AI hiring assistant explaining a candidate ranking decision.

    Job Title: {job.title}
    Job Description: {job.description[:500]}

    Candidate Profile:
    - Skills: {', '.join(parsed.get('skills', []))}
    - Experience: {parsed.get('experience_years', 'unknown')} years
    - Summary: {parsed.get('summary', '')[:300]}

    ATS Score: {application.ats_score}/100
    Pipeline Score: {application.pipeline_score}/100
    Rank: #{rank}

    {f"Score Breakdown: {json.dumps(pipeline_result)}" if pipeline_result else ""}

    Write a 2-3 sentence explanation of why this candidate 
    ranked #{rank}. Be specific — mention actual skills,
    experience numbers, and how they match the JD.
    Be honest about strengths AND gaps.
    Output ONLY the text of the explanation.
    """

    try:
        response = groq_with_retry(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200
        )
        return {"explanation": response.choices[0].message.content.strip()}
    except Exception as e:
        return {"explanation": f"Failed to generate explanation: {str(e)}"}

def compare_candidates(candidate_a: int, candidate_b: int, job_id: int, db: Session) -> dict:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return {"error": "Job not found"}
        
    app_a = db.query(models.Application).filter(models.Application.id == candidate_a).first()
    app_b = db.query(models.Application).filter(models.Application.id == candidate_b).first()
    
    if not app_a or not app_b:
        return {"error": "One or both candidates not found"}
        
    try:
        parsed_a = json.loads(app_a.parsed_resume) if app_a.parsed_resume else {}
        parsed_b = json.loads(app_b.parsed_resume) if app_b.parsed_resume else {}
    except Exception:
        return {"error": "Failed to parse candidate data"}
        
    prompt = f"""
    Compare these two candidates for the role of {job.title}.
    
    Job Description: {job.description[:500]}
    
    Candidate A ({parsed_a.get('name', 'Unknown')}):
    - Skills: {', '.join(parsed_a.get('skills', []))}
    - Experience: {parsed_a.get('experience_years')} years
    - ATS Score: {app_a.ats_score}
    
    Candidate B ({parsed_b.get('name', 'Unknown')}):
    - Skills: {', '.join(parsed_b.get('skills', []))}
    - Experience: {parsed_b.get('experience_years')} years
    - ATS Score: {app_b.ats_score}
    
    Write a brief 3-sentence comparison highlighting their relative strengths.
    Output ONLY the comparison text.
    """
    
    try:
        response = groq_with_retry(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300
        )
        return {"comparison": response.choices[0].message.content.strip()}
    except Exception as e:
        return {"error": f"Failed to compare candidates: {str(e)}"}
