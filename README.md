# HireFlow — AI-Powered Hiring Platform

> Built during a 3-Day Backend + AI Engineering Bootcamp

---

## What is HireFlow?

HireFlow is a hiring platform where recruiters post jobs and candidates apply with their resumes. The backend is production-grade — built with FastAPI, PostgreSQL, JWT auth, and file uploads. Days 2 and 3 will add AI resume screening and autonomous agents.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python) |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Auth | JWT + bcrypt |
| File Storage | Local disk (S3-ready) |
| Containerization | Docker + docker-compose |

---

## Project Structure

```
Hireflow/
├── app/
│   ├── __init__.py
│   ├── main.py          # App entry point, exception handling
│   ├── database.py      # DB connection, session management
│   ├── models.py        # SQLAlchemy models (DB tables)
│   ├── schemas.py       # Pydantic schemas (API contracts)
│   ├── auth.py          # JWT, bcrypt, get_current_user
│   └── routers/
│       ├── __init__.py
│       ├── auth.py      # /auth/register, /auth/login
│       ├── jobs.py      # CRUD for job postings
│       └── applications.py  # Apply to jobs, file uploads
├── uploads/
│   └── resumes/         # Uploaded resume PDFs
├── .env                 # Environment variables (never commit)
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container recipe
├── docker-compose.yml   # App + DB orchestration
└── .dockerignore
```

---

## Database Schema

```
users
─────────────────────────────────────────────
id          | PRIMARY KEY
email       | UNIQUE, NOT NULL
hashed_password | NOT NULL
role        | "recruiter" or "candidate"
created_at  | TIMESTAMP

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
id           | PRIMARY KEY
job_id       | FOREIGN KEY → jobs.id
candidate_id | FOREIGN KEY → users.id
status       | DEFAULT "pending"
resume_path  | NULLABLE (file path string)
created_at   | TIMESTAMP
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login, get JWT token | No |

### Jobs
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/jobs/` | Create job posting | Yes (recruiter) |
| GET | `/jobs/` | List all jobs | No |
| GET | `/jobs/{id}` | Get single job | No |
| DELETE | `/jobs/{id}` | Delete job | Yes (owner only) |
| GET | `/jobs/{id}/applications` | See applicants | Yes (owner only) |

### Applications
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/jobs/{id}/apply` | Apply with resume PDF | Yes (candidate) |

---

## Setup & Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 18
- pip

### Steps

**1. Clone and install dependencies**
```bash
git clone <repo>
cd Hireflow
pip install -r requirements.txt
```

**2. Set up environment variables**
```bash
# Create .env file
APP_NAME=HireFlow
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hireflow
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**3. Create the database**
```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE hireflow;"
```

**4. Run the server**
```bash
uvicorn app.main:app --reload
```

**5. Open API docs**
```
http://localhost:8000/docs
```

---

## Docker Setup

Run everything with one command:
```bash
docker-compose up
```

This starts both PostgreSQL and the FastAPI server automatically.

---

## Authentication Flow

```
Register → POST /auth/register
  Body: { email, password, role }
  Returns: { id, email, role }

Login → POST /auth/login
  Body: { email, password }
  Returns: { access_token, token_type }

Protected Request:
  Header: Authorization: Bearer <token>
```

---

## Security

- Passwords hashed with **bcrypt** — never stored in plain text
- JWT tokens expire after **30 minutes**
- Role-based access — recruiters and candidates have different permissions
- File uploads validated — PDF only, max 5MB
- Resume files named with **UUID** to prevent collisions and path traversal

---

## Bootcamp Progress

| Day | Topic | Status |
|-----|-------|--------|
| Day 1 | Backend Engineering | ✅ Complete |
| Day 2 | AI Engineering | 🔄 Coming up |
| Day 3 | AI Agents | ⏳ Pending |

---

## What's Coming (Day 2 & 3)

**Day 2 — AI Engineering**
- LLM integration for resume analysis
- Embeddings for candidate-job matching
- RAG over job descriptions
- Smart candidate scoring

**Day 3 — AI Agents**
- Autonomous screening agent
- Multi-agent pipeline
- Auto-follow up with candidates
- Anomaly detection on applications

---

*Built with 🔥 during the HireFlow Bootcamp*
