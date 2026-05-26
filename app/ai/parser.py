import os
import json
import re
from groq import Groq
import PyPDF2

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() or ""
    return text.strip()

def clean_placeholder_name(name: str, email: str | None = None) -> str:
    parsed_name = (name or "").strip()
    is_placeholder = not parsed_name or parsed_name.lower() in [
        "not available", "not specified", "unknown", "candidate", "n/a", "none"
    ]
    if is_placeholder and email:
        prefix = email.split("@")[0]
        cleaned = re.sub(r"[._\-0-9]+", " ", prefix).strip()
        if not cleaned:
            cleaned = prefix
        return cleaned.title()
    return parsed_name or "Unknown Candidate"

def parse_resume(file_path: str) -> dict:
    resume_text = extract_text_from_pdf(file_path)

    if not resume_text:
        return {"error": "Could not extract text from PDF"}

    prompt = f"""You are a resume parser. Extract information from this resume and return ONLY a JSON object with no extra text, no markdown, no backticks.

The JSON must have exactly these fields:
{{
  "name": "candidate full name",
  "email": "email address or null",
  "phone": "phone number or null",
  "skills": ["skill1", "skill2"],
  "experience_years": 0,
  "education": "highest degree and field",
  "summary": "2 sentence professional summary"
}}

Resume text:
{resume_text[:3000]}"""

    from app.observability import tracked_llm_call

    response = tracked_llm_call(
        client,
        endpoint="parser",
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0,
        max_tokens=1000
    )

    raw = response.choices[0].message.content.strip()

    from app.schemas_ai import ParsedResume

    try:
        data = json.loads(raw)
        validated = ParsedResume(**data)
        return validated.model_dump()
    except Exception as e:
        return {"error": f"Validation failed: {str(e)}"}
