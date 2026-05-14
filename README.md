# HireFlow — AI-Powered Autonomous Hiring Platform

## What is HireFlow?

HireFlow is a full-stack AI hiring platform that automates the entire candidate screening pipeline. Recruiters post jobs, candidates apply with resumes, and HireFlow's multi-agent system autonomously screens, scores, generates interview questions, writes personalized emails, and optimizes job descriptions — all without human involvement.

**HireFlow vs LinkedIn/Internshala:**
- LinkedIn = job board (connects people)
- HireFlow = AI intelligence layer (makes hiring decisions)

HireFlow doesn't compete with job boards — it plugs on top of them.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python) |
| Database | PostgreSQL 18 |
| ORM | SQLAlchemy |
| Auth | JWT + bcrypt |
| AI/LLM | Groq (Llama-3.3-70b) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Evals | LLM-as-judge (Llama evaluated by Llama) |
| Agent Protocol | MCP (Model Context Protocol) |
| File Storage | Local disk (S3-ready) |
| Containerization | Docker + docker-compose |

---

## Project Structure

```
Hireflow/
├── app/
│   ├── main.py              # Entry point, exception handling, logging
│   ├── database.py          # DB connection, session management
│   ├── models.py            # SQLAlchemy models (DB tables)
│   ├── schemas.py           # Pydantic schemas (API contracts)
│   ├── auth.py              # JWT, bcrypt, get_current_user
│   ├── routers/
│   │   ├── auth.py          # /auth/register, /auth/login
│   │   ├── jobs.py          # CRUD + AI endpoints for jobs
│   │   └── applications.py  # Apply, file uploads, AI parsing
│   ├── ai/
│   │   ├── parser.py        # LLM resume parser (PDF → structured JSON)
│   │   ├── matcher.py       # Embeddings + cosine similarity matching
│   │   ├── rag.py           # RAG recruiter Q&A assistant
│   │   └── scorer.py        # Multi-criteria candidate scorer
│   ├── agents/
│   │   ├── screening_agent.py  # Tool-use agent with memory
│   │   ├── pipeline.py         # 5-agent autonomous pipeline
│   │   └── guardrails.py       # Safety rules + dry run mode
│   └── mcp_server.py        # HireFlow MCP Server
├── evals/
│   └── test_scorer.py       # Eval suite with LLM-as-judge
├── uploads/
│   └── resumes/             # Uploaded resume PDFs
├── mcp_config.example.json  # MCP config template
├── .env                     # Environment variables (never commit)
├── requirements.txt         # Python dependencies
├── Dockerfile               # Container recipe
├── docker-compose.yml       # App + DB orchestration
└── .dockerignore
```

---

## Database Schema

```
users
─────────────────────────────────────────────
id              | PRIMARY KEY
email           | UNIQUE, NOT NULL
hashed_password | NOT NULL
role            | "recruiter" or "candidate"
created_at      | TIMESTAMP

jobs
─────────────────────────────────────────────
id          | PRIMARY KEY
title       | NOT NULL
description | TEXT, NOT NULL
company     | NOT NULL
owner_id    | FOREIGN KEY → users.id
created_at  | TIMESTAMP

applications
─────────────────────────────────────────────
id             | PRIMARY KEY
job_id         | FOREIGN KEY → jobs.id
candidate_id   | FOREIGN KEY → users.id
status         | DEFAULT "pending"
resume_path    | NULLABLE (file path)
parsed_resume  | TEXT (AI-extracted JSON)
created_at     | TIMESTAMP

agent_memory
─────────────────────────────────────────────
id           | PRIMARY KEY
job_id       | FOREIGN KEY → jobs.id
memory_type  | VARCHAR
content      | TEXT
created_at   | TIMESTAMP
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register user | No |
| POST | `/auth/login` | Login, get JWT | No |

### Jobs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/jobs/` | Create job posting | Recruiter |
| GET | `/jobs/` | List all jobs | No |
| GET | `/jobs/{id}` | Get single job | No |
| DELETE | `/jobs/{id}` | Delete job | Owner only |
| GET | `/jobs/{id}/applications` | See applicants | Owner only |
| GET | `/jobs/{id}/match` | AI semantic matching | Owner only |
| POST | `/jobs/{id}/ask` | RAG Q&A assistant | Owner only |
| POST | `/jobs/{id}/screen` | Run screening agent | Owner only |
| POST | `/jobs/{id}/pipeline` | Full AI pipeline | Owner only |
| POST | `/jobs/{id}/pipeline/dry-run` | Simulate pipeline | Owner only |

### Applications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/jobs/{id}/apply` | Apply with PDF resume | Candidate |
| GET | `/applications/{id}/parsed` | AI-parsed resume data | Yes |
| GET | `/applications/{id}/score` | AI candidate score | Yes |

---

## AI Features

### 1. Resume Parser
Automatically extracts structured data from PDF resumes using LLM.
```json
{
  "name": "ABC",
  "skills": ["Python", "FastAPI", "PyTorch"],
  "experience_years": 1,
  "education": "B.Tech CSE (AI & ML)",
  "summary": "..."
}
```

### 2. Semantic Candidate Matching
Sentence-transformer embeddings + cosine similarity. No keyword matching.
```
similarity("AI Engineer job", "ML researcher with PyTorch") = 60.18%
```

### 3. RAG Recruiter Assistant
Retrieves all candidate data from DB, injects into LLM context, answers natural language questions.
```
Recruiter: "Who is the best candidate for this role?"
HireFlow:  "ABC is the strongest because his Python,
            FastAPI, and ML skills directly match your requirements..."
```

### 4. Candidate Scorer
Multi-criteria AI scoring with weighted average and honest reasoning.
```json
{
  "total_score": 74,
  "breakdown": {
    "skills_match": 90,
    "experience_match": 40,
    "education_match": 80,
    "overall_fit": 70
  },
  "strengths": ["Strong AI/ML skills"],
  "weaknesses": ["Limited work experience"],
  "recommendation": "Good hire"
}
```

### 5. Eval Suite (LLM-as-Judge)
5 automated tests — format, ranges, consistency, completeness, and LLM judging LLM output.
```
✅ Output format check
✅ Score range validation  
✅ Recommendation consistency
✅ Strengths/weaknesses check
✅ LLM-as-judge verdict
```

---

## Multi-Agent Pipeline

5 specialized agents running autonomously in sequence:

```
POST /jobs/{id}/pipeline
          ↓
┌─────────────────────┐
│   SCREENER AGENT    │ → validates resumes, filters incomplete apps
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    SCORER AGENT     │ → scores every candidate (0-100)
└──────────┬──────────┘
           ↓
┌──────────────────────────┐
│ INTERVIEW QUESTION GEN   │ → 5 targeted questions probing weak spots
└──────────┬───────────────┘
           ↓
┌─────────────────────┐
│    EMAIL AGENT      │ → personalized shortlist + rejection emails
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   JD OPTIMIZER      │ → analyzes pipeline health, suggests JD fixes
└─────────────────────┘
```

**What makes this unique:**
- Rejection emails explain WHY with improvement suggestions (not templates)
- Interview questions target each candidate's specific weak spots
- JD Optimizer tells recruiters if THEIR job description is the problem
- Dry run mode simulates everything before committing

---

## Agent Memory

Long-term memory backed by PostgreSQL. Agents remember previous runs.
```
Run 1: [MEMORY] Loaded 0 previous memories
Run 2: [MEMORY] Loaded 1 previous memories → builds on previous work
```

---

## MCP Server

HireFlow exposes AI capabilities via MCP (Model Context Protocol). Any MCP-compatible agent (Claude Desktop, VS Code Copilot) can plug in and use HireFlow's tools.

```bash
python app/mcp_server.py
```

Exposed tools: `get_jobs`, `get_job_candidates`, `score_candidate`, `run_pipeline`

---

## Production Guardrails

```
Irreversible actions require approval:
  - send_email
  - reject_candidate  
  - update_status

Rate limits:
  - Max 50 emails per run
  - Max 100 API calls per run

Dry run mode:
  - Simulates entire pipeline
  - Zero DB changes
  - Zero emails sent
  - Returns full guardrail report
```

---

## Setup & Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 18
- pip

### Steps

**1. Clone and install**
```bash
git clone https://github.com/AnshulSinglaa/Hireflow.git
cd Hireflow
pip install -r requirements.txt
```

**2. Environment variables — create `.env`**
```
APP_NAME=HireFlow
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hireflow
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GROQ_API_KEY=your_groq_key
```

**3. Create database**
```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE hireflow;"
```

**4. Run server**
```bash
uvicorn app.main:app --reload
```

**5. API docs**
```
http://localhost:8000/docs
```

**6. Run eval suite**
```bash
py evals/test_scorer.py
```

**7. Run MCP server**
```bash
python app/mcp_server.py
```

---

## Docker Setup

```bash
docker-compose up
```

---

## Security

- Passwords hashed with **bcrypt** — never stored plain text
- JWT tokens expire after **30 minutes**
- Role-based access control (recruiter vs candidate)
- File uploads: PDF only, max 5MB, UUID naming prevents collisions
- Agent guardrails prevent irreversible actions without approval
- `.env` and `mcp_config.json` gitignored

---