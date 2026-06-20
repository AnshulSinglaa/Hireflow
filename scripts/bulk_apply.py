import sys
import os
import time
from pathlib import Path

# Add project root to path
PROJECT_ROOT = r"c:\Users\singl\Downloads\projects\Hireflow"
sys.path.append(PROJECT_ROOT)

# Disable slowapi rate limit in environment
os.environ["DISABLE_RATE_LIMIT"] = "1"

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models
from app.auth import hash_password

def main():
    client = TestClient(app)
    db = SessionLocal()
    
    # Target Job ID
    job_id = 6
    
    # Check if job exists
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        print(f"Error: Job with ID {job_id} not found!")
        return
    print(f"Applying candidates to Job ID: {job_id} ({job.title} at {job.company})")
    
    # Get all PDF resumes
    resume_dir = Path(PROJECT_ROOT) / "data science resumes"
    pdf_files = sorted(list(resume_dir.glob("*.pdf")))
    
    print(f"Found {len(pdf_files)} PDF resumes in {resume_dir}")
    
    success_count = 0
    fail_count = 0
    already_applied_count = 0
    
    for idx, pdf_path in enumerate(pdf_files, 1):
        filename = pdf_path.stem  # e.g., 'Image_1'
        email = f"candidate_{filename.lower()}@insightai.com"
        password = "Password@123"
        
        print(f"\n[{idx}/{len(pdf_files)}] Processing: {filename} ({email})")
        
        try:
            # 1. Register candidate if not exists
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                print(f"  Registering candidate user...")
                user = models.User(
                    email=email,
                    hashed_password=hash_password(password),
                    role="candidate"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                print(f"  Candidate user already exists.")
            
            # 2. Check if candidate profile exists, if not create one
            profile = db.query(models.CandidateProfile).filter(models.CandidateProfile.user_id == user.id).first()
            if not profile:
                print(f"  Creating candidate profile...")
                profile = models.CandidateProfile(
                    user_id=user.id,
                    full_name=filename.replace("_", " "),
                    bio="Data Science candidate looking for recommendations and machine learning roles.",
                    skills=["Python", "SQL", "Pandas", "Scikit-Learn", "Machine Learning"],
                    experience=[],
                    education=[]
                )
                db.add(profile)
                db.commit()
            
            # 3. Log in to get token
            login_res = client.post("/auth/login", json={"email": email, "password": password})
            if login_res.status_code != 200:
                print(f"  ❌ Login failed: {login_res.text}")
                fail_count += 1
                continue
            token = login_res.json()["access_token"]
            
            # 4. Check if already applied
            existing_app = db.query(models.Application).filter(
                models.Application.job_id == job_id,
                models.Application.candidate_id == user.id
            ).first()
            if existing_app:
                print(f"  ⚠ Already applied. Skipping.")
                already_applied_count += 1
                continue
            
            # 5. Apply with PDF resume
            print(f"  Applying to job with {pdf_path.name}...")
            with open(pdf_path, "rb") as f:
                apply_res = client.post(
                    f"/jobs/{job_id}/apply",
                    headers={"Authorization": f"Bearer {token}"},
                    files={"file": (pdf_path.name, f, "application/pdf")}
                )
            
            if apply_res.status_code == 201:
                print(f"  ✅ Applied successfully! Application ID: {apply_res.json().get('id')}")
                success_count += 1
            else:
                print(f"  ❌ Apply failed with status {apply_res.status_code}: {apply_res.text}")
                fail_count += 1
            
            # Sleep a bit to avoid hitting rate limits on LLM API (Groq)
            time.sleep(1.0)
            
        except Exception as e:
            print(f"  ❌ Error processing {filename}: {e}")
            fail_count += 1
            time.sleep(2.0)
            
    print("\n" + "="*50)
    print("BULK APPLY SUMMARY")
    print("="*50)
    print(f"Total Resumes Processed: {len(pdf_files)}")
    print(f"Successful Applications: {success_count}")
    print(f"Already Applied:         {already_applied_count}")
    print(f"Failed Applications:     {fail_count}")
    print("="*50)
    
    db.close()

if __name__ == "__main__":
    main()
