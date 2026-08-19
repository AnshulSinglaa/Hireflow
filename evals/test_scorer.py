import sys
import os
import json
import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.ai.scorer import score_candidate
from app.database import SessionLocal
from app import models

# Fix 3: Gemini as judge — not Llama grading its own output
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini = genai.GenerativeModel("gemini-1.5-flash")

db = SessionLocal()


def get_test_application_id() -> int:
    """Fix 4: dynamically find a real application instead of hardcoding ID 4"""
    app = db.query(models.Application).filter(
        models.Application.parsed_resume != None
    ).first()
    if not app:
        raise RuntimeError(
            "No applications with parsed resumes found in DB. "
            "Seed test data first: insert a job, candidate, and application with a parsed resume."
        )
    return app.id


def llm_as_judge(score_result: dict, job_title: str, job_description: str) -> dict:
    """Fix 3: Gemini judges Llama's output — not circular"""
    prompt = f"""You are an expert hiring consultant evaluating an AI scoring system's output.

Job Title: {job_title}
Job Description: {job_description}

AI Scoring System Output:
- Candidate: {score_result.get('candidate_name')}
- Total Score: {score_result.get('total_score')}/100
- Skills Match: {score_result.get('breakdown', {}).get('skills_match')}
- Experience Match: {score_result.get('breakdown', {}).get('experience_match')}
- Education Match: {score_result.get('breakdown', {}).get('education_match')}
- Strengths: {score_result.get('strengths')}
- Weaknesses: {score_result.get('weaknesses')}
- Recommendation: {score_result.get('recommendation')}

Evaluate if this scoring is fair, logical and well-reasoned.
Reply with ONLY this JSON, no extra text, no markdown, no backticks:
{{
  "verdict": "GOOD or NEEDS_IMPROVEMENT or POOR",
  "reasoning": "one sentence explanation",
  "confidence": 0
}}"""

    response = gemini.generate_content(prompt)
    raw = response.text.strip()
    return json.loads(raw)


APP_ID = None  # resolved once at test run start

def get_app_id():
    global APP_ID
    if APP_ID is None:
        APP_ID = get_test_application_id()
    return APP_ID


def test_output_format():
    print("Test 1 — Output format check...")
    result = score_candidate(get_app_id(), db)
    assert "candidate_name" in result
    assert "total_score" in result
    assert "breakdown" in result
    assert "strengths" in result
    assert "weaknesses" in result
    assert "recommendation" in result
    print("✅ PASSED — All required fields present")
    return result

def test_score_ranges():
    print("Test 2 — Score range check...")
    result = score_candidate(get_app_id(), db)
    assert 0 <= result["total_score"] <= 100
    assert 0 <= result["breakdown"]["skills_match"] <= 100
    assert 0 <= result["breakdown"]["experience_match"] <= 100
    assert 0 <= result["breakdown"]["education_match"] <= 100
    assert 0 <= result["breakdown"]["overall_fit"] <= 100
    print(f"✅ PASSED — All scores in range. Total: {result['total_score']}")
    return result

def test_recommendation_consistency():
    print("Test 3 — Recommendation consistency check...")
    result = score_candidate(get_app_id(), db)
    valid = ["Strong hire", "Good hire", "Maybe", "Reject"]
    assert result["recommendation"] in valid
    if result["total_score"] >= 80:
        assert result["recommendation"] != "Reject"
    if result["total_score"] < 40:
        assert result["recommendation"] != "Strong hire"
    print(f"✅ PASSED — '{result['recommendation']}' consistent with score {result['total_score']}")
    return result

def test_strengths_and_weaknesses():
    print("Test 4 — Strengths and weaknesses check...")
    result = score_candidate(get_app_id(), db)
    assert isinstance(result["strengths"], list)
    assert isinstance(result["weaknesses"], list)
    assert len(result["strengths"]) > 0
    print(f"✅ PASSED — {len(result['strengths'])} strengths, {len(result['weaknesses'])} weaknesses")
    return result

def test_llm_as_judge():
    print("Test 5 — LLM as Judge (Gemini evaluating Llama's output)...")
    result = score_candidate(get_app_id(), db)

    verdict = llm_as_judge(
        result,
        job_title="AI Engineer",
        job_description="We need a Python developer with ML and FastAPI experience"
    )

    assert verdict["verdict"] in ["GOOD", "NEEDS_IMPROVEMENT", "POOR"]
    assert "reasoning" in verdict
    assert 0 <= verdict["confidence"] <= 100

    print(f"✅ PASSED — Gemini verdict: {verdict['verdict']}")
    print(f"   Reasoning: {verdict['reasoning']}")
    print(f"   Confidence: {verdict['confidence']}%")

    if verdict["verdict"] == "POOR":
        print("⚠️  WARNING — Gemini thinks our scoring needs improvement!")

    return verdict


if __name__ == "__main__":
    print("🧪 Running HireFlow AI Eval Suite")
    print(f"   Scorer: Llama-3.3-70b (Groq)")
    print(f"   Judge:  Gemini-1.5-flash (Fix 3: not circular)")
    print(f"   App ID: dynamic (Fix 4: no hardcoded ID)\n")

    tests = [
        test_output_format,
        test_score_ranges,
        test_recommendation_consistency,
        test_strengths_and_weaknesses,
        test_llm_as_judge,
    ]

    passed = 0
    failed = 0
    results_log = []
    judge_verdict = None

    for test in tests:
        try:
            result = test()
            passed += 1
            results_log.append({"test": test.__name__, "status": "PASSED"})
            if test.__name__ == "test_llm_as_judge" and result:
                judge_verdict = result
        except AssertionError as e:
            print(f"❌ FAILED — {e}")
            failed += 1
            results_log.append({"test": test.__name__, "status": "FAILED", "error": str(e)})
        except Exception as e:
            print(f"💥 ERROR — {e}")
            failed += 1
            results_log.append({"test": test.__name__, "status": "ERROR", "error": str(e)})
        print()

    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Fix 8: store benchmark results
    benchmark = {
        "run_at": datetime.datetime.utcnow().isoformat(),
        "scorer_model": "llama-3.3-70b-versatile",
        "judge_model": "gemini-1.5-flash",
        "application_id_used": get_app_id(),
        "tests_passed": passed,
        "tests_failed": failed,
        "pass_rate": f"{passed}/{len(tests)}",
        "judge_verdict": judge_verdict,
        "test_results": results_log
    }

    benchmark_path = os.path.join(os.path.dirname(__file__), "benchmark_results.json")
    with open(benchmark_path, "w") as f:
        json.dump(benchmark, f, indent=2)
    print(f"\n📊 Benchmark saved to evals/benchmark_results.json")

    db.close()
