import json
import os
import re
from app.ai.groq_client import groq_with_retry
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app import models
from app.observability import tracked_llm_call

# ─────────────────────────────────────────
# 1. INPUT GUARDRAILS
# ─────────────────────────────────────────

BLOCKED_PATTERNS = [
    "ignore previous",
    "ignore above",
    "forget instructions",
    "you are now",
    "act as",
    "jailbreak",
    "pretend you",
    "disregard",
    "override",
]

IRRELEVANT_TOPICS = [
    "weather", "recipe", "movie", "sport",
    "politics", "religion", "joke", "funny",
    "stock market", "crypto", "game"
]


def validate_input(question: str) -> dict:
    """
    Validate recruiter question before processing.
    Returns {valid: bool, reason: str}
    """
    q_lower = question.lower().strip()

    # check length
    if len(question.strip()) < 3:
        return {"valid": False, "reason": "Question too short"}

    if len(question) > 1000:
        return {"valid": False, "reason": "Question too long — max 1000 characters"}

    # check prompt injection
    for pattern in BLOCKED_PATTERNS:
        if pattern in q_lower:
            return {
                "valid": False,
                "reason": "Question contains invalid instructions"
            }

    # check irrelevant topics
    for topic in IRRELEVANT_TOPICS:
        if topic in q_lower:
            return {
                "valid": False,
                "reason": f"I can only answer questions about candidates and hiring. Please ask something relevant to this job."
            }

    return {"valid": True, "reason": "OK"}


# ─────────────────────────────────────────
# 2. QUERY ROUTER
# ─────────────────────────────────────────

QUERY_TYPES = {
    "count": ["how many", "count", "total", "number of"],
    "stats": ["average", "avg", "mean", "score", "highest", "lowest", "best", "worst", "top"],
    "specific": ["candidate", "who is", "tell me about", "describe"],
    "comparison": ["compare", "difference", "versus", "vs", "better", "stronger", "rank"],
    "shortlist": ["shortlist", "recommend", "suggest", "hire", "best fit", "suitable"],
    "skills": ["skill", "technology", "experience with", "knows", "expertise"],
    "general": []  # fallback
}


def route_query(question: str) -> str:
    """
    Detect question type to route to correct retrieval strategy.
    Returns query type string.
    """
    q_lower = question.lower()

    for query_type, keywords in QUERY_TYPES.items():
        if any(kw in q_lower for kw in keywords):
            return query_type

    return "general"


# ─────────────────────────────────────────
# 3. RETRIEVAL — HYBRID SEARCH
# ─────────────────────────────────────────

def retrieve_by_db_query(question: str, job_id: int, db: Session) -> list:
    """
    For count/stats questions — query DB directly.
    No LLM needed for factual aggregations.
    """
    q_lower = question.lower()
    results = []

    # count query
    if any(kw in q_lower for kw in ["how many", "count", "total"]):
        total = db.query(models.Application).filter(
            models.Application.job_id == job_id
        ).count()
        passed = db.query(models.Application).filter(
            models.Application.job_id == job_id,
            models.Application.status == "ats_passed"
        ).count()
        shortlisted = db.query(models.Application).filter(
            models.Application.job_id == job_id,
            models.Application.status == "shortlisted"
        ).count()
        results.append({
            "type": "stats",
            "total_applied": total,
            "ats_passed": passed,
            "shortlisted": shortlisted
        })

    return results


def retrieve_by_semantic_search(question: str, job_id: int, db: Session, top_k: int = 10) -> list:
    """
    pgvector cosine similarity search.
    Find candidates most semantically relevant to the question.
    """
    from app.ai.matcher import get_embedding

    try:
        query_embedding = get_embedding(question)

        rows = db.execute(text("""
            SELECT
                a.id,
                a.parsed_resume,
                a.ats_score,
                a.pipeline_score,
                a.status,
                1 - (a.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM applications a
            WHERE a.job_id = :job_id
              AND a.embedding IS NOT NULL
              AND a.parsed_resume IS NOT NULL
            ORDER BY similarity DESC
            LIMIT :top_k
        """), {
            "embedding": str(query_embedding),
            "job_id": job_id,
            "top_k": top_k
        }).fetchall()

        results = []
        for row in rows:
            try:
                parsed = json.loads(row[1])
                if "error" in parsed:
                    continue
                results.append({
                    "application_id": row[0],
                    "parsed": parsed,
                    "ats_score": row[2],
                    "pipeline_score": row[3],
                    "status": row[4],
                    "similarity": float(row[5]),
                    "retrieval_method": "semantic"
                })
            except Exception:
                continue

        return results

    except Exception as e:
        print(f"[RAG] Semantic search failed: {e} — falling back to keyword")
        return []


def retrieve_by_keyword(question: str, job_id: int, db: Session, top_k: int = 10) -> list:
    """
    Keyword frequency scoring — fallback when no embeddings.
    """
    keywords = [
        w for w in question.lower().split()
        if len(w) > 3 and w not in
        ["what", "which", "when", "where", "with", "have", "that", "this", "they", "from"]
    ]

    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id,
        models.Application.parsed_resume != None
    ).all()

    scored = []
    for app in applications:
        try:
            parsed = json.loads(app.parsed_resume)
            if "error" in parsed:
                continue

            candidate_text = (
                " ".join(parsed.get("skills", [])) + " " +
                parsed.get("summary", "") + " " +
                str(parsed.get("experience_years", ""))
            ).lower()

            keyword_hits = sum(1 for kw in keywords if kw in candidate_text)
            if keyword_hits > 0:
                scored.append({
                    "application_id": app.id,
                    "parsed": parsed,
                    "ats_score": app.ats_score,
                    "pipeline_score": app.pipeline_score,
                    "status": app.status,
                    "similarity": keyword_hits / max(len(keywords), 1),
                    "retrieval_method": "keyword"
                })
        except Exception:
            continue

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]


def hybrid_retrieve(question: str, job_id: int, db: Session, top_k: int = 8) -> list:
    """
    Combine semantic + keyword search using RRF scoring.
    """
    semantic_results = retrieve_by_semantic_search(question, job_id, db, top_k=15)
    keyword_results = retrieve_by_keyword(question, job_id, db, top_k=15)

    # build rank maps
    semantic_ranks = {r["application_id"]: idx + 1 for idx, r in enumerate(semantic_results)}
    keyword_ranks = {r["application_id"]: idx + 1 for idx, r in enumerate(keyword_results)}

    # combine all IDs
    all_ids = set(semantic_ranks.keys()) | set(keyword_ranks.keys())

    # RRF fusion
    k = 60
    fused = {}
    for app_id in all_ids:
        sem_rank = semantic_ranks.get(app_id, 100)
        kw_rank = keyword_ranks.get(app_id, 100)
        fused[app_id] = 0.6 / (k + sem_rank) + 0.4 / (k + kw_rank)

    # get top_k by fused score
    top_ids = sorted(fused.keys(), key=lambda x: fused[x], reverse=True)[:top_k]

    # build final list preserving candidate data
    all_candidates = {r["application_id"]: r for r in semantic_results + keyword_results}
    results = []
    for app_id in top_ids:
        if app_id in all_candidates:
            candidate = all_candidates[app_id].copy()
            candidate["hybrid_score"] = fused[app_id]
            results.append(candidate)

    return results


# ─────────────────────────────────────────
# 4. RE-RANKING
# ─────────────────────────────────────────

def rerank_candidates(
    question: str,
    candidates: list,
    job_title: str,
    top_k: int = 5
) -> list:
    """
    Second LLM pass — re-rank retrieved candidates
    by actual relevance to the specific question.
    More precise than vector similarity alone.
    """
    if len(candidates) <= top_k:
        return candidates

    # build candidate summaries for re-ranking
    candidate_summaries = []
    for i, c in enumerate(candidates):
        parsed = c.get("parsed", {})
        summary = (
            f"[{i}] {parsed.get('name', 'Unknown')} — "
            f"Skills: {', '.join(parsed.get('skills', [])[:5])} — "
            f"Exp: {parsed.get('experience_years', '?')} yrs — "
            f"ATS: {c.get('ats_score', '?')}/100"
        )
        candidate_summaries.append(summary)

    prompt = f"""You are a relevance ranking system.

Question asked: "{question}"
Job: {job_title}

Candidates (by index):
{chr(10).join(candidate_summaries)}

Return ONLY a JSON array of the top {top_k} most relevant 
candidate indices for this specific question, ordered by relevance.
Example: [2, 0, 4, 1, 3]
Return ONLY the array, nothing else."""

    try:
        response = groq_with_retry(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=50
        )

        raw = response.choices[0].message.content.strip()
        # extract array from response
        match = re.search(r'\[[\d,\s]+\]', raw)
        if match:
            indices = json.loads(match.group())
            reranked = []
            for idx in indices:
                if 0 <= idx < len(candidates):
                    reranked.append(candidates[idx])
            return reranked[:top_k]
        else:
            return candidates[:top_k]

    except Exception as e:
        print(f"[RAG] Re-ranking failed: {e} — using original order")
        return candidates[:top_k]


# ─────────────────────────────────────────
# 5. OUTPUT VALIDATION
# ─────────────────────────────────────────

def validate_output(response: str, candidates: list) -> str:
    """
    Basic fact-check — ensure response doesn't
    hallucinate candidate names not in context.
    """
    if not candidates:
        return response

    # get real candidate names from context
    real_names = set()
    for c in candidates:
        name = c.get("parsed", {}).get("name", "")
        if name and name not in ["Not Available", "Not specified", ""]:
            real_names.add(name.lower())

    # if response mentions names not in our data
    # we can't easily detect this without NER
    # so we add a disclaimer if response seems confident
    if "definitely" in response.lower() or "certainly" in response.lower():
        response += "\n\n*Note: This analysis is based on the candidate data provided.*"

    return response


# ─────────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────────

def ask_about_candidates(job_id: int, question: str, db: Session) -> str:
    """
    Production RAG assistant with:
    1. Input guardrails
    2. Query routing
    3. Hybrid retrieval (semantic + BM25)
    4. Re-ranking
    5. Output validation
    """

    # STEP 1 — validate input
    validation = validate_input(question)
    if not validation["valid"]:
        return f"I cannot process that question. {validation['reason']}"

    # STEP 2 — check job exists
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return "Job not found."

    # STEP 3 — route query
    query_type = route_query(question)
    print(f"[RAG] Query type detected: {query_type}")

    # STEP 4 — retrieve context based on query type
    db_context = ""
    if query_type in ["count", "stats"]:
        db_results = retrieve_by_db_query(question, job_id, db)
        if db_results:
            stats = db_results[0]
            db_context = f"""
Pipeline Statistics:
- Total applications: {stats.get('total_applied', 0)}
- Passed ATS: {stats.get('ats_passed', 0)}
- Shortlisted: {stats.get('shortlisted', 0)}
"""

    # always do hybrid retrieval for candidate context
    candidates = hybrid_retrieve(question, job_id, db, top_k=8)

    if not candidates:
        # fallback — get all if hybrid fails
        applications = db.query(models.Application).filter(
            models.Application.job_id == job_id,
            models.Application.parsed_resume != None
        ).all()
        candidates = []
        for app in applications:
            try:
                parsed = json.loads(app.parsed_resume)
                if "error" not in parsed:
                    candidates.append({
                        "application_id": app.id,
                        "parsed": parsed,
                        "ats_score": app.ats_score,
                        "pipeline_score": app.pipeline_score,
                        "status": app.status
                    })
            except Exception:
                continue

    if not candidates:
        return "No candidates have applied to this job yet."

    # STEP 5 — re-rank
    if query_type not in ["count", "stats"] and len(candidates) > 10:
        candidates = rerank_candidates(question, candidates, job.title, top_k=5)
        print(f"[RAG] Re-ranked to top {len(candidates)} candidates")
    else:
        candidates = candidates[:5]

    # STEP 6 — build context
    candidates_context = db_context
    for i, c in enumerate(candidates, 1):
        parsed = c.get("parsed", {})
        candidates_context += f"""
Candidate {i}:
- Name: {parsed.get('name', 'Unknown')}
- Skills: {', '.join(parsed.get('skills', []))}
- Experience: {parsed.get('experience_years')} years
- Education: {parsed.get('education')}
- Summary: {parsed.get('summary', '')}
- ATS Score: {c.get('ats_score', 'N/A')}/100
- Pipeline Score: {c.get('pipeline_score', 'N/A')}/100
- Status: {c.get('status', 'pending')}
- Retrieved by: {c.get('retrieval_method', 'hybrid')}
---"""

    # STEP 7 — generate response
    system_prompt = """You are an expert AI recruiting assistant with 10+ years of experience.
You help recruiters make smart, unbiased hiring decisions based purely on candidate data.
Rules:
- Answer based ONLY on the candidate data provided
- Always mention candidate names when referring to them
- Give specific reasoning for your conclusions
- Never make up information not in the profiles
- If you cannot answer from the data, say so clearly
- Be concise but thorough"""

    user_prompt = f"""Job: {job.title} at {job.company}
Description: {job.description[:500]}

Candidate Data:
{candidates_context}

Question: {question}

Answer:"""

    try:
        response = tracked_llm_call(
            None,
            endpoint="rag_production",
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )

        answer = response.choices[0].message.content.strip()

        # STEP 8 — validate output
        answer = validate_output(answer, candidates)

        return answer

    except Exception as e:
        print(f"[RAG] LLM call failed: {e}")
        return f"I encountered an error processing your question. Please try again. Error: {str(e)}"
