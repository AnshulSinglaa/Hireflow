import json
import os
from groq import Groq
from sqlalchemy.orm import Session
from app import models

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def ask_about_candidates(job_id: int, question: str, db: Session) -> str:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return "Job not found."

    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.parsed_resume != None
    ).all()

    if not applications:
        return "No candidates have applied to this job yet."

    candidates_context = ""
    for i, app in enumerate(applications):
        parsed = json.loads(app.parsed_resume)
        if "error" in parsed:
            continue
        candidates_context += f"""
Candidate {i+1}:
- Name: {parsed.get('name')}
- Skills: {', '.join(parsed.get('skills', []))}
- Experience: {parsed.get('experience_years')} years
- Education: {parsed.get('education')}
- Summary: {parsed.get('summary')}
---"""

    prompt = f"""You are an expert technical recruiter and hiring assistant with 10+ years of experience evaluating candidates.

Your job is to help recruiters make smart, unbiased hiring decisions based purely on candidate data.

## Job Details
Title: {job.title}
Company: {job.company}
Description: {job.description}

## Candidates Who Applied
{candidates_context}

## Recruiter's Question
{question}

## Instructions
- Answer based ONLY on the candidate data provided above
- Always mention candidate names when referring to them
- Give clear, specific reasoning for your conclusions
- If comparing candidates, highlight key differences
- If a candidate is missing information, mention it
- Be concise but thorough
- Never make up information not present in the candidate profiles
- If you cannot answer from the data provided, say so clearly

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=1000
    )

    return response.choices[0].message.content.strip()
