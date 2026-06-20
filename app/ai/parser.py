import os
import json
import re
import base64
from groq import Groq
import PyPDF2

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# JSON schema string used in prompts for both text and vision paths
_RESUME_JSON_SCHEMA = (
    '{\n'
    '  "name": "candidate full name",\n'
    '  "email": "email address or null",\n'
    '  "phone": "phone number or null",\n'
    '  "skills": ["skill1", "skill2"],\n'
    '  "experience_years": 0,\n'
    '  "education": "highest degree and field",\n'
    '  "summary": "2 sentence professional summary"\n'
    '}'
)


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() or ""
    return text.strip()


def get_image_from_pdf(file_path: str) -> str:
    """Render the first page of a PDF to a base64-encoded PNG (1.5x scale)."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF not installed. Run: pip install pymupdf")
    doc = fitz.open(file_path)
    page = doc.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
    img_data = pix.tobytes("png")
    doc.close()
    return base64.b64encode(img_data).decode("utf-8")


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

    from app.observability import tracked_llm_call

    if len(resume_text) >= 50:
        # ── Text-based PDF path ────────────────────────────────────────────
        prompt = (
            "You are a resume parser. Extract information from this resume and "
            "return ONLY a JSON object with no extra text, no markdown, no backticks.\n\n"
            "The JSON must have exactly these fields:\n"
            + _RESUME_JSON_SCHEMA
            + "\n\nResume text:\n"
            + resume_text[:3000]
        )
        response = tracked_llm_call(
            client,
            endpoint="parser",
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=1000,
        )
    else:
        # ── Image-based (scanned) PDF fallback ────────────────────────────
        b64_image = get_image_from_pdf(file_path)
        vision_prompt = (
            "You are a resume parser. Extract information from this resume image "
            "and return ONLY a JSON object with no extra text, no markdown, no backticks.\n\n"
            "The JSON must have exactly these fields:\n"
            + _RESUME_JSON_SCHEMA
        )
        response = tracked_llm_call(
            client,
            endpoint="parser",
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_image}"},
                    },
                    {"type": "text", "text": vision_prompt},
                ],
            }],
            temperature=0,
            max_tokens=1000,
        )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if the model adds them
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw).strip()

    from app.schemas_ai import ParsedResume

    try:
        data = json.loads(raw)
        validated = ParsedResume(**data)
        return validated.model_dump()
    except Exception as e:
        return {"error": f"Validation failed: {str(e)}"}
