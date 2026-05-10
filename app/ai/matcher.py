import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app import models

model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> list:
    return model.encode(text).tolist()

def cosine_similarity(vec1: list, vec2: list) -> float:
    a = np.array(vec1)
    b = np.array(vec2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def match_candidates(job_id: int, db: Session) -> list:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return []

    job_text = f"{job.title} {job.description}"
    job_embedding = get_embedding(job_text)

    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.parsed_resume != None
    ).all()

    results = []
    for app in applications:
        parsed = json.loads(app.parsed_resume)
        if "error" in parsed:
            continue

        candidate_text = f"{' '.join(parsed.get('skills', []))} {parsed.get('summary', '')}"
        candidate_embedding = get_embedding(candidate_text)

        score = cosine_similarity(job_embedding, candidate_embedding)

        results.append({
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "name": parsed.get("name"),
            "email": parsed.get("email"),
            "skills": parsed.get("skills", []),
            "experience_years": parsed.get("experience_years"),
            "similarity_score": round(score * 100, 2),
        })

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results
