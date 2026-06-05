import os
import json
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_ats_criteria(job_title: str, job_description: str) -> dict:
    """
    Parse JD and extract hard knockout criteria for ATS gate.
    Called once when recruiter posts a job.
    """
    prompt = f"""
    Analyse this job posting and extract ATS screening criteria.
    
    Job Title: {job_title}
    Job Description: {job_description}
    
    Return ONLY this JSON, nothing else:
    {{
        "min_experience_years": <integer or 0 if not specified>,
        "required_keywords": [<list of must-have skills/technologies>],
        "preferred_keywords": [<list of nice-to-have skills>],
        "education_requirement": "<Bachelor's/Master's/PhD/Any or null>",
        "job_keywords": [<all important keywords from JD for BM25 search>]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        # non-fatal fallback — empty criteria means no hard filtering
        return {
            "min_experience_years": 0,
            "required_keywords": [],
            "preferred_keywords": [],
            "education_requirement": None,
            "job_keywords": job_description.lower().split()
        }
