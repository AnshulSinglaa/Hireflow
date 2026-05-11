import json
import os
from groq import Groq
from sqlalchemy.orm import Session
from app import models

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def score_candidate(application_id: int, db: Session) -> dict:
    application = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()

    if not application:
        return {"error": "Application not found"}

    if not application.parsed_resume:
        return {"error": "Resume not parsed yet"}

    parsed = json.loads(application.parsed_resume)
    if "error" in parsed:
        return {"error": "Resume parsing failed"}

    job = db.query(models.Job).filter(
        models.Job.id == application.job_id
    ).first()

    prompt = f"""You are a senior technical recruiter at a top tech company with 15+ years of experience hiring engineers. You are known for being thorough, fair, and data-driven in your evaluations.

Your task is to objectively score a candidate for a specific job opening.

## Job Requirements
Title: {job.title}
Company: {job.company}
Description: {job.description}

## Candidate Profile
Name: {parsed.get('name')}
Skills: {', '.join(parsed.get('skills', []))}
Years of Experience: {parsed.get('experience_years')}
Education: {parsed.get('education')}
Professional Summary: {parsed.get('summary')}

## Scoring Criteria
Score each dimension from 0-100:
- skills_match: How well do their skills match the job requirements?
- experience_match: Is their experience level appropriate for this role?
- education_match: Does their educational background fit the role?
- overall_fit: Holistic assessment of candidate-job fit

## Important Rules
- Be honest and critical — do not inflate scores
- Base scores ONLY on the provided candidate data
- A score of 70+ means genuinely qualified
- A score of 50-69 means potential but gaps exist
- A score below 50 means significant mismatch

Return ONLY a JSON object with NO extra text, no markdown, no backticks:
{{
  "candidate_name": "name here",
  "total_score": 0,
  "breakdown": {{
    "skills_match": 0,
    "experience_match": 0,
    "education_match": 0,
    "overall_fit": 0
  }},
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1"],
  "recommendation": "one of: Strong hire / Good hire / Maybe / Reject"
}}

Calculate total_score as weighted average: skills_match(40%) + experience_match(30%) + education_match(15%) + overall_fit(15%)"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=1000
    )

    raw = response.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw_response": raw, "error": "Could not parse JSON"}
