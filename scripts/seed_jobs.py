import requests
import random
import string

API = "https://hireflow-uyfq.onrender.com"

def rand_suffix():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

# 1. Register a recruiter account
suffix = rand_suffix()
email = f"recruiter_{suffix}@hireflow-demo.com"
password = "DemoPass123!"

print("Registering recruiter...")
r = requests.post(f"{API}/auth/register", json={
    "email": email,
    "password": password,
    "role": "recruiter"
})
print(r.status_code, r.text[:300])

# 2. Login
print("Logging in...")
r = requests.post(f"{API}/auth/login", json={
    "email": email,
    "password": password
})
print(r.status_code, r.text[:300])
token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

# 3. Post jobs
jobs = [
    {
        "title": "AI Engineer — LLM Applications",
        "company": "Nimbus Cloud Systems",
        "description": "We're looking for an AI Engineer to build production RAG pipelines, agentic workflows, and LLM-powered features. You'll work with vector databases, embedding models, and orchestration frameworks to ship features that real users rely on daily. Experience with FastAPI, PostgreSQL, and prompt engineering strongly preferred."
    },
    {
        "title": "Backend Engineer — Python/FastAPI",
        "company": "Fernbridge Labs",
        "description": "Join our backend team building high-throughput APIs serving millions of requests daily. You'll design database schemas, optimize query performance, and build resilient background job systems. Strong Python fundamentals and experience with PostgreSQL required."
    },
    {
        "title": "Machine Learning Engineer",
        "company": "Solstice Analytics",
        "description": "Build and deploy ML models for recommendation systems and predictive analytics. You'll own the full lifecycle from data pipeline to production monitoring. Experience with embeddings, similarity search, and MLOps practices is a plus."
    },
    {
        "title": "Full Stack Developer — React/Python",
        "company": "Northgate Ventures",
        "description": "We need a full stack developer comfortable across React frontends and Python backends. You'll build features end-to-end, from database design to polished UI. Experience with modern deployment pipelines (Vercel, Render, or similar) preferred."
    },
    {
        "title": "AI/ML Intern",
        "company": "Copperline Technologies",
        "description": "Internship opportunity for students passionate about applied AI. You'll work alongside senior engineers on real production features involving LLMs, embeddings, and agentic pipelines. Great opportunity to learn production ML engineering practices."
    }
]

for j in jobs:
    print(f"Creating job: {j['title']}...")
    r = requests.post(f"{API}/jobs/", json=j, headers=headers)
    print(r.status_code, r.text[:200])

print("\nDone. Recruiter login for future use:")
print(f"  email: {email}")
print(f"  password: {password}")
