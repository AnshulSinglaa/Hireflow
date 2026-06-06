import os
import json
from app.ai.groq_client import groq_with_retry

def scan_job_for_fraud(title: str, description: str) -> dict:
    prompt = f"""
    You are an AI Trust & Safety agent. Analyze this job posting for potential fraud, scams, or malicious intent.
    
    Job Title: {title}
    Job Description: {description}
    
    Look for:
    - Requests for payment, crypto, or personal bank details
    - Unrealistic salary promises with low effort
    - Multi-level marketing (MLM) or pyramid schemes
    - Suspiciously vague descriptions
    
    Output ONLY valid JSON with no markdown formatting:
    {{
        "fraud_score": (int, 0 to 100, where 100 is highly likely fraud),
        "verdict": (string, short summary of findings),
        "flags": (list of strings, specific concerns found)
    }}
    """
    
    try:
        response = groq_with_retry(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Fraud detection failed: {e}")
        return {
            "fraud_score": 0,
            "verdict": "Scan failed",
            "flags": []
        }
