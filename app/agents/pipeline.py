import json
import os
from groq import Groq
from sqlalchemy.orm import Session
from app import models
from app.ai.scorer import score_candidate
from app.agents.guardrails import AgentGuardrails

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ─────────────────────────────────────────
# AGENT 1 — SCREENER
# ─────────────────────────────────────────
def run_screener_agent(job_id: int, db: Session) -> dict:
    print("\n[SCREENER] Starting...")
    
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return {"error": "Job not found", "candidates": []}

    applications = db.query(models.Application).filter(
        models.Application.job_id == job_id
    ).all()

    valid = []
    skipped = []

    for app in applications:
        if app.parsed_resume:
            valid.append({
                "application_id": app.id,
                "candidate_id": app.candidate_id
            })
            print(f"   [SCREENER] ✅ Application {app.id} — has resume")
        else:
            skipped.append(app.id)
            print(f"   [SCREENER] ⚠️ Application {app.id} — no resume, skipping")

    print(f"   [SCREENER] Done. {len(valid)} valid, {len(skipped)} skipped")
    return {
        "job": {"id": job.id, "title": job.title, "description": job.description},
        "valid_candidates": valid,
        "skipped": skipped
    }

# ─────────────────────────────────────────
# AGENT 2 — SCORER
# ─────────────────────────────────────────
def run_scorer_agent(screener_output: dict, db: Session) -> dict:
    print("\n[SCORER] Starting...")
    
    scores = []
    for candidate in screener_output["valid_candidates"]:
        app_id = candidate["application_id"]
        print(f"   [SCORER] Scoring application {app_id}...")
        result = score_candidate(app_id, db)
        result["application_id"] = app_id
        scores.append(result)
        print(f"   [SCORER] ✅ {result.get('candidate_name')} — {result.get('total_score')}/100")

    scores.sort(key=lambda x: x.get("total_score", 0), reverse=True)
    
    shortlisted = [s for s in scores if s.get("total_score", 0) >= 70]
    maybe = [s for s in scores if 50 <= s.get("total_score", 0) < 70]
    rejected = [s for s in scores if s.get("total_score", 0) < 50]

    print(f"   [SCORER] Done. {len(shortlisted)} shortlisted, {len(maybe)} maybe, {len(rejected)} rejected")
    return {
        "job": screener_output["job"],
        "all_scores": scores,
        "shortlisted": shortlisted,
        "maybe": maybe,
        "rejected": rejected
    }

# ─────────────────────────────────────────
# AGENT 3 — INTERVIEW QUESTION GENERATOR
# ─────────────────────────────────────────
def run_interview_agent(scorer_output: dict, db: Session) -> dict:
    print("\n[INTERVIEW AGENT] Starting...")
    
    job = scorer_output["job"]
    interview_kits = []

    for candidate in scorer_output["shortlisted"]:
        print(f"   [INTERVIEW] Generating questions for {candidate.get('candidate_name')}...")
        
        prompt = f"""You are a senior technical interviewer preparing for a candidate interview.

Job: {job['title']}
Description: {job['description']}

Candidate: {candidate.get('candidate_name')}
Score Breakdown:
- Skills Match: {candidate.get('breakdown', {}).get('skills_match')}/100
- Experience Match: {candidate.get('breakdown', {}).get('experience_match')}/100
- Education Match: {candidate.get('breakdown', {}).get('education_match')}/100
Weaknesses: {candidate.get('weaknesses')}
Strengths: {candidate.get('strengths')}

Generate exactly 5 targeted interview questions that:
1. Probe the candidate's WEAK areas specifically
2. Verify the claimed STRONG areas are genuine
3. Are specific to this job, not generic

Return ONLY a JSON object, no markdown, no backticks:
{{
  "candidate_name": "name",
  "questions": [
    {{"question": "...", "probes": "skills/experience/education", "why": "one line reason"}},
    {{"question": "...", "probes": "skills/experience/education", "why": "one line reason"}},
    {{"question": "...", "probes": "skills/experience/education", "why": "one line reason"}},
    {{"question": "...", "probes": "skills/experience/education", "why": "one line reason"}},
    {{"question": "...", "probes": "skills/experience/education", "why": "one line reason"}}
  ]
}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000
        )

        raw = response.choices[0].message.content.strip()
        try:
            kit = json.loads(raw)
            kit["application_id"] = candidate["application_id"]
            kit["score"] = candidate.get("total_score")
            interview_kits.append(kit)
            print(f"   [INTERVIEW] ✅ Kit ready for {candidate.get('candidate_name')}")
        except json.JSONDecodeError:
            print(f"   [INTERVIEW] ⚠️ Could not parse questions for {candidate.get('candidate_name')}")

    print(f"   [INTERVIEW] Done. {len(interview_kits)} interview kits generated")
    return {
        "job": job,
        "scorer_output": scorer_output,
        "interview_kits": interview_kits
    }

# ─────────────────────────────────────────
# AGENT 4 — EMAIL AGENT
# ─────────────────────────────────────────
def run_email_agent(pipeline_output: dict, db: Session, guardrails: AgentGuardrails) -> dict:
    print("\n[EMAIL AGENT] Starting...")
    
    job = pipeline_output["job"]
    scorer_output = pipeline_output["scorer_output"]
    interview_kits = {kit["application_id"]: kit for kit in pipeline_output["interview_kits"]}
    emails_sent = []

    # Shortlisted emails
    for candidate in scorer_output["shortlisted"]:
        app_id = candidate["application_id"]
        kit = interview_kits.get(app_id, {})
        
        questions_text = ""
        for i, q in enumerate(kit.get("questions", []), 1):
            questions_text += f"\n{i}. {q['question']}"

        prompt = f"""Write a warm, professional shortlist email from HireFlow hiring team.

Candidate name: {candidate.get('candidate_name')}
Job: {job['title']}
Their score: {candidate.get('total_score')}/100
Their strengths: {candidate.get('strengths')}
Interview prep questions to include:{questions_text}

Rules:
- Warm and human — not corporate template
- Mention 1-2 specific strengths by name
- Include the prep questions as "areas to think about"
- End with excitement about meeting them
- Max 150 words

Return ONLY the email body, no subject line."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400
        )

        email_body = response.choices[0].message.content.strip()
        
        # Save to DB as mock email
        application = db.query(models.Application).filter(
            models.Application.id == app_id
        ).first()
        if application:
            # Before updating status
            if guardrails.before_action("update_status", {
                "application_id": app_id,
                "new_status": "shortlisted"
            }):
                application.status = "shortlisted"
                db.commit()
            guardrails.after_action("update_status")

        emails_sent.append({
            "type": "shortlist",
            "application_id": app_id,
            "candidate_name": candidate.get("candidate_name"),
            "email_body": email_body,
            "status": "sent"
        })
        print(f"   [EMAIL] ✅ Shortlist email ready for {candidate.get('candidate_name')}")

    # Rejection emails
    for candidate in scorer_output["rejected"]:
        prompt = f"""Write a warm, honest rejection email from HireFlow hiring team.

Candidate name: {candidate.get('candidate_name')}
Job: {job['title']}
Their score: {candidate.get('total_score')}/100
Their strengths: {candidate.get('strengths')}
Why rejected: {candidate.get('weaknesses')}
Recommendation: {candidate.get('recommendation')}

Rules:
- Warm and human — not a template
- Acknowledge something specific they did well
- Be honest about the gap (without being harsh)
- Give 1-2 concrete improvement suggestions
- Leave door open for future applications
- Max 150 words

Return ONLY the email body, no subject line."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400
        )

        email_body = response.choices[0].message.content.strip()

        application = db.query(models.Application).filter(
            models.Application.id == candidate["application_id"]
        ).first()
        if application:
            # Before updating status
            if guardrails.before_action("update_status", {
                "application_id": candidate["application_id"],
                "new_status": "rejected"
            }):
                application.status = "rejected"
                db.commit()
            guardrails.after_action("update_status")

        emails_sent.append({
            "type": "rejection",
            "application_id": candidate["application_id"],
            "candidate_name": candidate.get("candidate_name"),
            "email_body": email_body,
            "status": "sent"
        })
        print(f"   [EMAIL] ✅ Rejection email ready for {candidate.get('candidate_name')}")

    print(f"   [EMAIL] Done. {len(emails_sent)} emails prepared")
    return emails_sent

# ─────────────────────────────────────────
# AGENT 5 — JD OPTIMIZER
# ─────────────────────────────────────────
def run_jd_optimizer(scorer_output: dict, db: Session) -> dict:
    print("\n[JD OPTIMIZER] Starting...")
    
    job = scorer_output["job"]
    all_scores = scorer_output["all_scores"]
    
    if not all_scores:
        return {"suggestion": "No candidates to analyze yet"}

    avg_score = sum(s.get("total_score", 0) for s in all_scores) / len(all_scores)
    avg_skills = sum(s.get("breakdown", {}).get("skills_match", 0) for s in all_scores) / len(all_scores)
    avg_exp = sum(s.get("breakdown", {}).get("experience_match", 0) for s in all_scores) / len(all_scores)
    avg_edu = sum(s.get("breakdown", {}).get("education_match", 0) for s in all_scores) / len(all_scores)

    prompt = f"""You are a data-driven recruiting consultant analyzing hiring pipeline health.

Job Title: {job['title']}
Job Description: {job['description']}

Candidate Pool Analytics:
- Total candidates: {len(all_scores)}
- Average total score: {avg_score:.1f}/100
- Average skills match: {avg_skills:.1f}/100
- Average experience match: {avg_exp:.1f}/100
- Average education match: {avg_edu:.1f}/100
- Shortlisted: {len(scorer_output['shortlisted'])}
- Rejected: {len(scorer_output['rejected'])}

Analyze the job description quality and candidate fit.
Return ONLY a JSON object, no markdown, no backticks:
{{
  "health_score": 0,
  "biggest_bottleneck": "skills/experience/education",
  "analysis": "2 sentence analysis of why candidates are scoring low/high",
  "jd_issues": ["issue1", "issue2"],
  "suggested_jd_changes": ["change1", "change2"],
  "expected_improvement": "if changes made, avg score would go from X to Y"
}}

health_score is 0-100: how healthy is this hiring pipeline?"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=600
    )

    raw = response.choices[0].message.content.strip()
    try:
        result = json.loads(raw)
        print(f"   [JD OPTIMIZER] ✅ Pipeline health: {result.get('health_score')}/100")
        return result
    except json.JSONDecodeError:
        return {"raw": raw, "error": "Could not parse"}

# ─────────────────────────────────────────
# COORDINATOR — runs the full pipeline
# ─────────────────────────────────────────
def run_full_pipeline(job_id: int, db: Session, dry_run: bool = False) -> dict:
    print(f"\n{'='*50}")
    print(f"🚀 HIREFLOW PIPELINE STARTING — Job {job_id}")
    if dry_run:
        print(f"⚠️  DRY RUN MODE — no real actions will be taken")
    print(f"{'='*50}")

    guardrails = AgentGuardrails(dry_run=dry_run, require_approval=False)

    # Step 1 — Screen
    screener_output = run_screener_agent(job_id, db)
    if screener_output.get("error"):
        return {"error": screener_output["error"]}
    if not screener_output["valid_candidates"]:
        return {"message": "No valid candidates found", "skipped": screener_output["skipped"]}

    # Step 2 — Score
    scorer_output = run_scorer_agent(screener_output, db)

    # Step 3 — Generate interview questions
    pipeline_output = run_interview_agent(scorer_output, db)

    # Step 4 — Prepare emails
    emails = run_email_agent(pipeline_output, db, guardrails)

    # Step 5 — Optimize JD
    jd_analysis = run_jd_optimizer(scorer_output, db)

    print(f"\n{'='*50}")
    print(f"✅ HIREFLOW PIPELINE COMPLETE")
    print(f"{'='*50}\n")

    return {
        "job_id": job_id,
        "summary": {
            "total_processed": len(screener_output["valid_candidates"]),
            "shortlisted": len(scorer_output["shortlisted"]),
            "maybe": len(scorer_output["maybe"]),
            "rejected": len(scorer_output["rejected"]),
            "emails_prepared": len(emails),
            "interview_kits": len(pipeline_output["interview_kits"])
        },
        "shortlisted_candidates": scorer_output["shortlisted"],
        "interview_kits": pipeline_output["interview_kits"],
        "emails": emails,
        "jd_analysis": jd_analysis,
        "scores": scorer_output["all_scores"],
        "guardrail_report": guardrails.get_report()
    }
