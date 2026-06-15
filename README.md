# HireFlow

An autonomous hiring platform powered by a multi-agent AI pipeline. HireFlow reimagines the hiring funnel as an automated pipeline rather than a stack of manual review steps. A recruiter posts a job; from the moment a candidate applies, a chain of specialized AI agents takes over — screening, scoring, generating interview questions, drafting candidate communication, and even critiquing the job description itself.

This project was built to go deep on three things that are easy to fake and hard to actually do well:

- **Agentic AI orchestration** — a real multi-agent pipeline with sequential data dependencies, not a single prompt wearing different hats
- **Hybrid retrieval-augmented generation** — semantic + keyword search, fusion ranking, re-ranking, and guardrails, not "stuff everything into the context window"
- **Production-grade backend engineering** — connection pooling, transactions, rate limiting, retries, observability, and a security audit, not just a working demo

---

## Core Features

| Feature | Description |
|---|---|
| **ATS Gate** | Auto-extracted screening criteria + rule-based knockout + LLM soft scoring |
| **5-Agent Pipeline** | Screener → Scorer → Interview Generator → Email Agent → JD Optimizer |
| **Hybrid RAG Assistant** | Semantic + keyword search with fusion ranking and re-ranking |
| **Duplicate Detection** | Embedding similarity check to catch resubmitted/duplicate applications |
| **Company Trust Score** | Domain, website, LinkedIn, and GST verification |
| **Fraud & Bias Detection** | LLM scan of job postings for scam patterns and biased language |
| **Candidate Portal** | Profile, application tracker, interview details, notifications |
| **Recruiter Dashboard** | ATS funnel stats, pipeline results, interview scheduling, ZIP export |
| **Async Pipeline** | Background task queue with polling for long-running pipeline runs |
| **LLM Observability** | Per-call latency, token usage, and cost logging |

---

## How It Works — End to End

```
1. Recruiter posts a job
       │
       ▼
2. LLM extracts ATS criteria from the JD
   (min experience, required skills, education)
   + JD is scanned for fraud/bias indicators
       │
       ▼
3. Candidate applies with resume (PDF)
       │
       ▼
4. ATS Gate runs automatically:
     a. Hard knockout (rule-based, instant, free)
     b. Duplicate check (embedding similarity)
     c. Soft score (lightweight LLM, 0-100)
       │
       ▼
5. Recruiter triggers the 5-Agent Pipeline
   on candidates that passed the gate
       │
       ▼
6. Pipeline runs sequentially:
     Screener → Scorer → Interview Generator
     → Email Agent → JD Optimizer
       │
       ▼
7. Recruiter reviews results:
     - Ranked candidates with score breakdowns
     - Generated interview questions
     - Drafted emails (sent via SMTP)
     - JD health score + improvement suggestions
       │
       ▼
8. Recruiter approves/rejects/schedules interviews
   → Candidate gets in-app + email notifications
```

---

## The 5-Agent Pipeline

A sequential orchestration where each agent's output becomes the next agent's input. There is no supervisor agent and no agent framework — the orchestrator is a plain Python function that calls each agent in order, with try/except isolation so one agent's failure doesn't take down the whole run.

| # | Agent | Input | Output |
|---|---|---|---|
| 1 | **Screener** | Raw applications for the job | Valid candidates (filters out unparseable/incomplete resumes) |
| 2 | **Scorer** | Valid candidates + JD | Score 0–100 per candidate across skills, experience, education, fit |
| 3 | **Interview Generator** | Scored candidates | 5 tailored interview questions per shortlisted candidate |
| 4 | **Email Agent** | Scores + interview questions | Personalized shortlist/rejection emails, sent via SMTP |
| 5 | **JD Optimizer** | Full candidate pool scores | JD health score + specific rewrite suggestions with projected impact |

**Execution model:** strictly sequential between agents (hard data dependencies), with candidates currently processed one at a time within each agent — see [Roadmap](#roadmap--known-limitations) for the parallelization plan.

---

## Hybrid RAG Recruiter Assistant

A chat interface lets recruiters ask natural-language questions about their candidate pool ("Who has the strongest backend experience?", "How many candidates have 5+ years?"). The retrieval pipeline:

```
Question
   │
   ├──► Semantic search (pgvector cosine similarity on resume embeddings)
   │
   ├──► Keyword search (term-frequency match on resume text)
   │
   ▼
Reciprocal Rank Fusion (merge both result sets)
   │
   ▼
LLM Re-ranking (top-N candidates re-ordered for this specific question)
   │
   ▼
Guardrailed response
   - input checked for prompt injection
   - output checked against retrieved facts
```

---

## Trust & Safety Layer

- **Company Trust Score** — computed from email domain verification, website liveness check, LinkedIn company page detection, and GST number validation
- **Job Fraud Detection** — every posted JD is scanned by an LLM for scam patterns (fee requests, unrealistic salary promises, vague descriptions)
- **Bias Detection** — JDs are scanned for biased or exclusionary language
- **Candidate Reporting** — candidates can flag suspicious postings, which is logged against the company's trust profile

---

## Architecture

```
┌────────────────────────────────────────────────┐
│             React (Vite + Tailwind)             │
│   Candidate Portal  │  Recruiter Dashboard      │
└────────────────────────┬─────────────────────────┘
                         │ JWT-authenticated REST (Axios)
                         ▼
┌────────────────────────────────────────────────┐
│                  FastAPI Backend                │
│                                                  │
│  Routers:                                       │
│  auth · jobs · applications · candidates        │
│  companies · reports · notifications · tasks    │
│                                                  │
│  ┌────────────────┐   ┌───────────────────────┐ │
│  │   ATS Gate      │   │   5-Agent Pipeline    │ │
│  │ rules + LLM     │   │   sequential agents   │ │
│  └────────────────┘   └───────────────────────┘ │
│                                                  │
│  ┌────────────────┐   ┌───────────────────────┐ │
│  │  Hybrid RAG     │   │  Trust & Fraud        │ │
│  │  Assistant      │   │  Detection            │ │
│  └────────────────┘   └───────────────────────┘ │
│                                                  │
│  Cross-cutting: Observability · Rate Limiting   │
│  Async Task Queue · Notifications · SMTP        │
│  MCP Server                                     │
└────────────────────────┬─────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
   ┌─────────────────────┐  ┌─────────────────┐
   │   PostgreSQL 18      │  │    Groq API     │
   │   + pgvector         │  │  (LLaMA-3.3-70b)│
   └─────────────────────┘  └─────────────────┘
```

No agent framework (LangChain, LangGraph, AutoGen, CrewAI) is used anywhere in this system. Orchestration, retrieval, ranking, and tool-calling are implemented directly in Python — every prompt, decision, and data flow is traceable end to end without going through an abstraction layer.

---

## Database Schema

PostgreSQL 18 with the `pgvector` extension for embedding storage. All foreign keys reference `users.id` or `jobs.id` as appropriate.

```
users
├── id, email, hashed_password, role (candidate/recruiter), is_admin
└── created_at

candidate_profiles
├── user_id (FK → users)
├── full_name, photo_path, bio
├── skills (JSON), experience (JSON), education (JSON)
├── github_url, linkedin_url, portfolio_url
├── salary_expectation, resume_path
└── profile_complete (0-100)

companies
├── owner_id (FK → users)
├── name, about, website, linkedin_url, gst_number, logo_path
├── industry, size, location
├── trust_score, verification_status
├── domain_verified, website_verified, linkedin_verified
└── report_count, is_suspended

jobs
├── id, title, description, company, owner_id (FK → users)
├── required_skills (JSON), experience_min/max
├── education_requirement, salary_range, job_type, work_mode
├── location, deadline, is_active
├── ats_criteria (JSON), ats_threshold, ats_mode, ats_top_n
├── blind_hiring (bool)
└── fraud_scan_result (JSON), is_flagged

applications
├── id, job_id (FK → jobs), candidate_id (FK → users)
├── status  (pending → ats_passed/failed/duplicate
│            → shortlisted/maybe/rejected
│            → interview_scheduled)
├── resume_path, parsed_resume (JSON)
├── embedding  (vector(384), pgvector)
├── ats_score, ats_result (JSON)
├── pipeline_score, pipeline_result (JSON)
└── UNIQUE(job_id, candidate_id)

interviews
├── id, application_id (FK), job_id (FK)
├── candidate_id (FK), recruiter_id (FK)
├── scheduled_date, duration_minutes, format, meet_link
├── notes, status (scheduled/rescheduled/completed/cancelled)

notifications
├── id, user_id (FK → users)
├── type (shortlisted/rejected/interview_scheduled/...)
├── title, message, is_read
└── related_job_id, related_application_id

fraud_reports
├── id, job_id (FK → jobs), reported_by (FK → users)
├── category (fees/fake/misleading/inappropriate/other)
├── description, status

agent_memory
├── id, job_id (FK → jobs), memory_type, content
└── created_at

tasks
├── id (uuid), status, result (JSON), error
└── created_at, completed_at
```

**Key design choices:**
- `applications.embedding` is a `vector(384)` column (Sentence-Transformers `all-MiniLM-L6-v2`), enabling `<=>` cosine distance queries directly in SQL alongside relational filters
- `UNIQUE(job_id, candidate_id)` enforces one application per candidate per job at the database level
- JSON columns (`parsed_resume`, `ats_result`, `pipeline_result`, `ats_criteria`, `fraud_scan_result`) store structured LLM outputs validated by Pydantic before persistence

---

## Project Structure

```
Hireflow/
├── app/
│   ├── main.py                  # FastAPI entry, middleware, CORS, health check
│   ├── models.py                # SQLAlchemy models (see DB Schema)
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── schemas_ai.py             # Pydantic schemas for LLM outputs
│   ├── auth.py                   # JWT issuing/validation, bcrypt hashing
│   ├── database.py               # Engine, QueuePool, session, health check
│   ├── limiter.py                 # slowapi rate limiter config
│   ├── email_service.py           # SMTP sending + notification creation
│   ├── observability.py           # Per-call LLM logging (latency/cost/tokens)
│   ├── mcp_server.py              # MCP server exposing HireFlow tools
│   │
│   ├── routers/
│   │   ├── auth.py                # /auth/register, /auth/login
│   │   ├── jobs.py                # Jobs CRUD, pipeline, ATS, decisions, RAG
│   │   ├── applications.py        # Apply, parsed resume, score
│   │   ├── candidates.py          # Candidate profile + dashboard
│   │   ├── companies.py           # Company profile + trust score
│   │   ├── reports.py             # Fraud reporting
│   │   ├── notifications.py       # In-app notifications
│   │   └── tasks.py                # Async task polling
│   │
│   ├── ai/
│   │   ├── parser.py               # Resume PDF → structured JSON
│   │   ├── matcher.py              # Hybrid search (pgvector + keyword + RRF)
│   │   ├── scorer.py                # Candidate scoring (Pydantic-validated)
│   │   ├── rag.py                   # RAG: routing, retrieval, re-ranking, guardrails
│   │   ├── ats_parser.py            # JD → ATS criteria extraction
│   │   ├── ats_gate.py              # Hard knockout engine
│   │   ├── ats_scorer.py            # ATS soft scorer
│   │   ├── trust_scorer.py          # Company verification checks
│   │   ├── fraud_detector.py        # JD fraud + bias scanning
│   │   ├── explainer.py             # "Why this candidate ranked here"
│   │   └── groq_client.py           # Retry + timeout wrapper for Groq calls
│   │
│   └── agents/
│       ├── pipeline.py              # 5-agent orchestrator
│       ├── screening_agent.py       # Tool-use agent with memory
│       └── guardrails.py            # Dry-run mode, action approval
│
├── evals/
│   └── test_scorer.py               # LLM-as-judge eval suite
│
├── alembic/                          # Database migrations
├── hireflow-frontend/                 # React + Vite + Tailwind app
├── docker-compose.yml                 # PostgreSQL (pgvector) + API
├── Dockerfile
├── requirements.txt
└── .env
```

---

## Tech Stack

**Backend** — Python, FastAPI, SQLAlchemy, Pydantic, Alembic
**Database** — PostgreSQL 18, pgvector
**AI / LLM** — Groq (LLaMA-3.3-70b), Sentence-Transformers (`all-MiniLM-L6-v2`)
**Auth & Security** — JWT, bcrypt, OAuth2PasswordBearer, slowapi rate limiting
**Frontend** — React, Vite, Tailwind CSS, Axios, React Router
**Infra & Tooling** — Docker, MCP server, async task queue, custom LLM observability

---

## API Reference

| Endpoint | Description |
|---|---|
| `POST /auth/register`, `/auth/login` | Auth with role selection (candidate/recruiter) |
| `GET / POST /jobs/` | List jobs / post a job (auto ATS criteria + fraud scan) |
| `POST /jobs/{id}/apply` | Apply with resume — ATS-gated, deduplicated |
| `POST /jobs/{id}/pipeline` `/async` `/dry-run` | Run the 5-agent pipeline |
| `GET /jobs/{id}/ats-summary` | Live application funnel counts |
| `POST /jobs/{id}/candidates/{id}/decision` | Approve / reject / maybe |
| `POST /jobs/{id}/candidates/{id}/schedule` | Schedule interview + notify candidate |
| `GET /jobs/{id}/download` | ZIP of shortlisted/maybe resumes + pipeline report |
| `POST /jobs/{id}/ask` `/stream` | Hybrid RAG recruiter assistant |
| `GET / PUT /candidates/profile` | Candidate profile management |
| `GET /candidates/applications/my` | Candidate application tracker |
| `POST /companies/` | Company profile + automated trust scoring |
| `POST /reports/jobs/{id}` | Candidate fraud reporting |
| `GET /notifications/` | In-app notifications |
| `GET /health` | Database + Groq dependency health check |

---

## Running Locally

**Backend**
```bash
docker compose up -d        # PostgreSQL + pgvector on :5433
alembic upgrade head         # apply migrations
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd hireflow-frontend
npm install
npm run dev
```

**Environment variables** (`.env`)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hireflow
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GROQ_API_KEY=your_groq_key
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASSWORD=your_app_password
DUPLICATE_THRESHOLD=0.92
```

---

## Project Status

| Area | Status |
|---|---|
| Backend | ✅ Complete — security audited, connection pooling, async-safe background tasks, retry/timeout on all LLM calls, Alembic migrations |
| Frontend | 🔨 In progress — wireframes complete for all candidate and recruiter screens |
| Deployment | ⏳ Planned — Railway (backend) + Vercel (frontend) |

---

## Roadmap / Known Limitations

- **Parallelize candidate processing** — within each pipeline agent, candidates are currently scored sequentially; `asyncio.gather` would cut runtime significantly at scale
- **True BM25** — current keyword retrieval is a term-frequency score, not a full TF-IDF + document-length normalized BM25 implementation
- **Persistent agent memory** — the `agent_memory` table is currently write-only; agents don't yet recall past pipeline runs for the same job
- **Confidence scores** — agent outputs (especially the scorer) don't currently carry a confidence/uncertainty signal alongside the score
