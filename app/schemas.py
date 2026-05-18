from pydantic import BaseModel
from datetime import datetime

class UserLogin(BaseModel):
    email: str
    password: str
    role: str | None = None  # not needed for auth, kept for compat

class UserCreate(BaseModel):
    email: str
    password: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# ── Jobs ──────────────────────────────────────────────────────────────────────

class RecruiterQuestion(BaseModel):
    question: str

class JobCreate(BaseModel):
    title: str
    description: str
    company: str

class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    company: str
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ── Applications ──────────────────────────────────────────────────────────────

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
