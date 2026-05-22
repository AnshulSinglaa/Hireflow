"""Seed job applications from resume CSV (load / rate-limit testing).

Run with rate limits ENABLED on the API (default) to stress-test throttling:
  Terminal 1: uvicorn app.main:app --reload
  Terminal 2: py scripts/bulk_test.py
"""

import time
import unicodedata
from pathlib import Path

import pandas as pd
import requests
from fpdf import FPDF


def pdf_safe_text(text: str) -> str:
    """Normalize resume text for Helvetica (latin-1) PDF output."""
    text = unicodedata.normalize("NFKC", text)
    return text.encode("latin-1", errors="replace").decode("latin-1")


def make_resume_pdf(text: str, path: Path) -> None:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)
    pdf.multi_cell(0, 10, pdf_safe_text(text))
    pdf.output(str(path))

BASE_URL = "http://127.0.0.1:8000"
JOB_ID = 3  # JP Morgan HR — test candidates only
SCRIPT_DIR = Path(__file__).resolve().parent
# /auth/register is 3/min, /auth/login is 5/min (ignored when DISABLE_RATE_LIMIT=true)
REGISTER_INTERVAL_SEC = 21
LOGIN_INTERVAL_SEC = 12


def _throttle(last_at: float, interval: float) -> float:
    elapsed = time.time() - last_at
    if elapsed < interval:
        time.sleep(interval - elapsed)
    return time.time()


def get_candidate_token(
    email: str,
    password: str,
    index: int,
    last_register_at: float,
    last_auth_at: float,
) -> tuple[str | None, float, float]:
    """Login if the user exists; otherwise register (rate-limited)."""
    last_auth_at = _throttle(last_auth_at, LOGIN_INTERVAL_SEC)
    login = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password, "role": "candidate"},
    )
    if login.status_code == 200:
        print(f"[{index}] Logged in: {email}")
        return login.json()["access_token"], last_register_at, last_auth_at

    if login.status_code == 429:
        print(f"[{index}] Login rate limited. Waiting 60s...")
        time.sleep(60)
        last_auth_at = _throttle(0, LOGIN_INTERVAL_SEC)
        login = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password, "role": "candidate"},
        )
        if login.status_code == 200:
            print(f"[{index}] Logged in: {email}")
            return login.json()["access_token"], last_register_at, last_auth_at

    if login.status_code != 401:
        print(f"[{index}] Login failed ({login.status_code}): {login.text}")
        return None, last_register_at, last_auth_at

    last_register_at = _throttle(last_register_at, REGISTER_INTERVAL_SEC)
    last_auth_at = _throttle(last_auth_at, LOGIN_INTERVAL_SEC)
    reg = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": email, "password": password, "role": "candidate"},
    )
    last_register_at = time.time()

    if reg.status_code == 429:
        print(f"[{index}] Rate limited on register. Waiting 60s...")
        time.sleep(60)
        last_auth_at = _throttle(0, REGISTER_INTERVAL_SEC)
        reg = requests.post(
            f"{BASE_URL}/auth/register",
            json={"email": email, "password": password, "role": "candidate"},
        )
        last_register_at = time.time()

    if reg.status_code not in (200, 201):
        if reg.status_code == 400 and "already registered" in reg.text.lower():
            print(f"[{index}] Already registered: {email}")
        else:
            print(f"[{index}] Register failed ({reg.status_code}): {reg.text}")
            return None, last_register_at, last_auth_at

    last_auth_at = _throttle(last_auth_at, LOGIN_INTERVAL_SEC)
    login = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password, "role": "candidate"},
    )
    if login.status_code != 200:
        print(f"[{index}] Login after register failed: {login.text}")
        return None, last_register_at, last_auth_at

    print(f"[{index}] Registered and logged in: {email}")
    return login.json()["access_token"], last_register_at, last_auth_at


def main() -> None:
    dataset_path = SCRIPT_DIR / "resume_dataset.csv"
    if not dataset_path.exists():
        dataset_path = SCRIPT_DIR.parent / "Resume" / "Resume.csv"

    df = pd.read_csv(dataset_path).head(10)
    print(f"Testing with {len(df)} resumes from {dataset_path}")

    print("Rate limits active: register 3/min, login 5/min (script throttles auth calls).")

    results = []
    last_register_at = 0.0
    last_auth_at = 0.0

    for i, row in df.iterrows():
        email = f"testcandidate{i}@test.com"
        password = "test123"

        token, last_register_at, last_auth_at = get_candidate_token(
            email, password, i, last_register_at, last_auth_at
        )
        if not token:
            continue

        text = str(
            row.get("Resume_str", row.get("Resume", row.get("resume_str", "")))
        )[:2000]
        pdf_path = SCRIPT_DIR / f"temp_resume_{i}.pdf"
        make_resume_pdf(text, pdf_path)

        with open(pdf_path, "rb") as f:
            res = requests.post(
                f"{BASE_URL}/jobs/{JOB_ID}/apply",
                headers={"Authorization": f"Bearer {token}"},
                files={"file": ("resume.pdf", f, "application/pdf")},
            )

        if res.status_code == 201:
            print(f"[{i}] OK {email} applied successfully")
            results.append({"email": email, "application_id": res.json()["id"]})
        elif res.status_code == 409:
            print(f"[{i}] Already applied: {email}")
            results.append({"email": email, "application_id": None})
        else:
            print(f"[{i}] Apply failed ({res.status_code}): {res.text}")

    print(f"\nDone. {len(results)} candidates applied.")
    print(
        "Now run: curl -X POST http://127.0.0.1:8000/jobs/2/pipeline/async "
        '-H "Authorization: Bearer YOUR_TOKEN"'
    )


if __name__ == "__main__":
    main()
