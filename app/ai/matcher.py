import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from sqlalchemy import text
from app import models
from app.ai.parser import clean_placeholder_name

model = SentenceTransformer("all-MiniLM-L6-v2")


import asyncio
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=2)

def get_embedding(text_input: str) -> list:
    """Synchronous version — use in non-async contexts"""
    return model.encode(text_input).tolist()

async def get_embedding_async(text_input: str) -> list:
    """
    Async version — runs sentence-transformers in thread pool
    so it doesn't block FastAPI event loop
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        lambda: model.encode(text_input).tolist()
    )

def save_embedding(application_id: int, resume_text: str, db: Session):
    """Call this once when resume is parsed — saves embedding to DB"""
    embedding = get_embedding(resume_text)
    app = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()
    if app:
        app.embedding = embedding
        db.commit()


import os
DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.92"))

def is_duplicate_resume(
    application_id: int,
    job_id: int,
    db: Session,
    threshold: float = None
) -> bool:
    if threshold is None:
        threshold = DUPLICATE_THRESHOLD
    """
    Check if this resume is too similar to an existing
    application for the same job — different account, same resume.
    Returns True if duplicate found.
    """
    # get this application's embedding
    current_app = db.query(models.Application).filter(
        models.Application.id == application_id
    ).first()

    if not current_app or current_app.embedding is None:
        return False

    # find any other application for same job with
    # cosine similarity above threshold
    result = db.execute(text("""
        SELECT id
        FROM applications
        WHERE job_id = :job_id
          AND id != :app_id
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
        LIMIT 1
    """), {
        "job_id": job_id,
        "app_id": application_id,
        "embedding": str(current_app.embedding),
        "threshold": threshold
    }).fetchone()

    return result is not None


def semantic_search(job_embedding: list, job_id: int, db: Session) -> dict:
    """pgvector cosine similarity search — returns {app_id: rank}"""
    results = db.execute(text("""
        SELECT id,
               embedding <=> CAST(:embedding AS vector) AS distance
        FROM applications
        WHERE job_id = :job_id
          AND embedding IS NOT NULL
        ORDER BY distance ASC
        LIMIT 50
    """), {
        "embedding": str(job_embedding),
        "job_id": job_id
    }).fetchall()

    # RRF scoring — rank 1 is best
    return {row[0]: idx + 1 for idx, row in enumerate(results)}


def bm25_search(job_keywords: list, job_id: int, db: Session) -> dict:
    """Keyword frequency scoring — returns {app_id: rank}"""
    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.parsed_resume != None
    ).all()

    scores = []
    for app in applications:
        try:
            parsed = json.loads(app.parsed_resume)
        except Exception:
            continue

        skills = [s.lower() for s in parsed.get("skills", [])]
        summary = parsed.get("summary", "").lower()
        candidate_text = " ".join(skills) + " " + summary

        # count how many job keywords appear in candidate text
        matches = sum(
            1 for kw in job_keywords
            if kw.lower() in candidate_text
        )
        scores.append((app.id, matches))

    scores.sort(key=lambda x: x[1], reverse=True)
    return {app_id: idx + 1 for idx, (app_id, _) in enumerate(scores)}


def reciprocal_rank_fusion(
    semantic_ranks: dict,
    keyword_ranks: dict,
    semantic_weight: float = 0.6,
    keyword_weight: float = 0.4,
    k: int = 60
) -> dict:
    """
    RRF formula: score = w1/(k + rank1) + w2/(k + rank2)
    Higher score = better candidate
    """
    all_ids = set(semantic_ranks.keys()) | set(keyword_ranks.keys())
    fused = {}
    for app_id in all_ids:
        sem_rank = semantic_ranks.get(app_id, 100)  # default rank if missing
        kw_rank = keyword_ranks.get(app_id, 100)
        fused[app_id] = (
            semantic_weight / (k + sem_rank) +
            keyword_weight / (k + kw_rank)
        )
    return fused


def match_candidates(job_id: int, db: Session) -> list:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return []

    # job embedding + keywords
    job_text = f"{job.title} {job.description}"
    job_embedding = get_embedding(job_text)
    job_keywords = list(set(job_text.lower().split()))

    # fetch all applications with parsed resumes
    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.parsed_resume != None,
    ).all()

    if not applications:
        return []

    # hybrid search
    semantic_ranks = semantic_search(job_embedding, job_id, db)
    keyword_ranks = bm25_search(job_keywords, job_id, db)
    fused_scores = reciprocal_rank_fusion(semantic_ranks, keyword_ranks)

    # build results
    results = []
    for app in applications:
        try:
            parsed = json.loads(app.parsed_resume)
        except Exception:
            continue

        if "error" in parsed:
            continue

        candidate_user = db.query(models.User).filter(
            models.User.id == app.candidate_id
        ).first()
        candidate_email = candidate_user.email if candidate_user else None
        name = clean_placeholder_name(parsed.get("name"), candidate_email)

        hybrid_score = fused_scores.get(app.id, 0)

        results.append({
            "application_id": app.id,
            "candidate_id": app.candidate_id,
            "name": name,
            "email": parsed.get("email") or candidate_email,
            "skills": parsed.get("skills", []),
            "experience_years": parsed.get("experience_years"),
            "similarity_score": round(hybrid_score * 1000, 2),  # scale for readability
            "search_type": "hybrid"
        })

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results
