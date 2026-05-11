import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import json
from groq import Groq
from app.ai.scorer import score_candidate
from app.database import SessionLocal

# NOTE: Using same model as judge for now
# TODO: Switch to Gemini/Claude as judge in production for unbiased evaluation
judge_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

db = SessionLocal()

def llm_as_judge(score_result: dict, job_title: str, job_description: str) -> dict:
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

    response = judge_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=300
    )

    raw = response.choices[0].message.content.strip()
    return json.loads(raw)

def test_output_format():
    print("Test 1 — Output format check...")
    result = score_candidate(4, db)
    assert "candidate_name" in result
    assert "total_score" in result
    assert "breakdown" in result
    assert "strengths" in result
    assert "weaknesses" in result
    assert "recommendation" in result
    print("✅ PASSED — All required fields present")

def test_score_ranges():
    print("Test 2 — Score range check...")
    result = score_candidate(4, db)
    assert 0 <= result["total_score"] <= 100
    assert 0 <= result["breakdown"]["skills_match"] <= 100
    assert 0 <= result["breakdown"]["experience_match"] <= 100
    assert 0 <= result["breakdown"]["education_match"] <= 100
    assert 0 <= result["breakdown"]["overall_fit"] <= 100
    print(f"✅ PASSED — All scores in range. Total: {result['total_score']}")

def test_recommendation_consistency():
    print("Test 3 — Recommendation consistency check...")
    result = score_candidate(4, db)
    valid = ["Strong hire", "Good hire", "Maybe", "Reject"]
    assert result["recommendation"] in valid
    if result["total_score"] >= 80:
        assert result["recommendation"] != "Reject"
    if result["total_score"] < 40:
        assert result["recommendation"] != "Strong hire"
    print(f"✅ PASSED — '{result['recommendation']}' consistent with score {result['total_score']}")

def test_strengths_and_weaknesses():
    print("Test 4 — Strengths and weaknesses check...")
    result = score_candidate(4, db)
    assert isinstance(result["strengths"], list)
    assert isinstance(result["weaknesses"], list)
    assert len(result["strengths"]) > 0
    print(f"✅ PASSED — {len(result['strengths'])} strengths, {len(result['weaknesses'])} weaknesses")

def test_llm_as_judge():
    print("Test 5 — LLM as Judge (Llama evaluating Llama's output)...")
    result = score_candidate(4, db)
    
    verdict = llm_as_judge(
        result,
        job_title="AI Engineer",
        job_description="We need a Python developer with ML and FastAPI experience"
    )
    
    assert verdict["verdict"] in ["GOOD", "NEEDS_IMPROVEMENT", "POOR"]
    assert "reasoning" in verdict
    assert 0 <= verdict["confidence"] <= 100
    
    print(f"✅ PASSED — Llama verdict: {verdict['verdict']}")
    print(f"   Reasoning: {verdict['reasoning']}")
    print(f"   Confidence: {verdict['confidence']}%")
    
    if verdict["verdict"] == "POOR":
        print("⚠️  WARNING — Llama thinks our scoring needs improvement!")

if __name__ == "__main__":
    print("🧪 Running HireFlow AI Eval Suite")
    print("   Scorer: Llama-3.3-70b (Groq)")
    print("   Judge:  Llama-3.3-70b (Groq)\n")
    
    tests = [
        test_output_format,
        test_score_ranges,
        test_recommendation_consistency,
        test_strengths_and_weaknesses,
        test_llm_as_judge,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"❌ FAILED — {e}")
            failed += 1
        except Exception as e:
            print(f"💥 ERROR — {e}")
            failed += 1
        print()
    
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    db.close()
