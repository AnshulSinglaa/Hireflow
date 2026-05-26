import sys
import os
import json

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app import models
from app.ai.parser import clean_placeholder_name

def migrate():
    db = SessionLocal()
    try:
        applications = db.query(models.Application).all()
        print(f"Loaded {len(applications)} applications from the database.")
        
        updated_count = 0
        for app in applications:
            if not app.parsed_resume:
                continue
                
            try:
                parsed = json.loads(app.parsed_resume)
            except Exception as e:
                print(f"Failed to parse JSON for application {app.id}: {e}")
                continue
                
            if "error" in parsed:
                continue
                
            candidate_user = db.query(models.User).filter(
                models.User.id == app.candidate_id
            ).first()
            candidate_email = candidate_user.email if candidate_user else None
            
            original_name = parsed.get("name", "")
            cleaned_name = clean_placeholder_name(original_name, candidate_email)
            
            if original_name != cleaned_name:
                parsed["name"] = cleaned_name
                app.parsed_resume = json.dumps(parsed)
                updated_count += 1
                print(f"Application {app.id} (email: {candidate_email}): '{original_name}' -> '{cleaned_name}'")
                
        if updated_count > 0:
            db.commit()
            print(f"Successfully committed {updated_count} application updates to the database.")
        else:
            print("No updates needed.")
            
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting candidate name database migration...")
    migrate()
    print("Migration complete!")
