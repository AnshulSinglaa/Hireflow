import sys
import os
import time
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.auth import create_access_token

# 1. Generate token for User ID 2 (recruiter)
token = create_access_token(data={"sub": "2", "role": "recruiter"})
headers = {"Authorization": f"Bearer {token}"}

print(f"Generated Token: {token}\n")

# 2. Trigger Async Pipeline
job_id = 2
url = f"http://127.0.0.1:8000/jobs/{job_id}/pipeline/async"
print(f"POSTing to {url}...")
response = requests.post(url, headers=headers)
print(f"Response Status Code: {response.status_code}")
res_json = response.json()
print("Response JSON:")
print(res_json)

if response.status_code != 200:
    print("Failed to trigger pipeline!")
    sys.exit(1)

task_id = res_json["task_id"]
print(f"\nTask ID received: {task_id}")
print("Starting polling on task status...")

# 3. Poll Task Status
poll_url = f"http://127.0.0.1:8000/tasks/{task_id}"
while True:
    poll_response = requests.get(poll_url)
    poll_json = poll_response.json()
    status = poll_json["status"]
    print(f"[{time.strftime('%H:%M:%S')}] Status: {status}")
    
    if status in ["complete", "failed"]:
        print("\nTask ended!")
        print("Final Task State:")
        import json
        print(json.dumps(poll_json, indent=2))
        break
        
    time.sleep(2)
