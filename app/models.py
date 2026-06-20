from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, JSON, Boolean, Float
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), unique=True)
    name = Column(String, nullable=False)
    about = Column(Text, nullable=True)
    website = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    logo_path = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    size = Column(String, nullable=True)        # e.g. "1-10", "11-50", "51-200"
    location = Column(String, nullable=True)
    # verification
    trust_score = Column(Integer, default=0)    # 0-100
    verification_status = Column(String, default="pending")  # pending/verified/rejected
    domain_verified = Column(Boolean, default=False)
    website_verified = Column(Boolean, default=False)
    linkedin_verified = Column(Boolean, default=False)
    # fraud
    report_count = Column(Integer, default=0)
    is_suspended = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    full_name = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)            # list of strings
    experience = Column(JSON, nullable=True)        # list of {company, role, years}
    education = Column(JSON, nullable=True)         # list of {degree, institution, year}
    github_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    salary_expectation = Column(String, nullable=True)  # e.g. "8-12 LPA"
    resume_path = Column(String, nullable=True)     # default resume
    profile_complete = Column(Integer, default=0)   # 0-100 completeness score
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    company = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    # job details
    required_skills = Column(JSON, nullable=True)
    experience_min = Column(Integer, nullable=True)
    experience_max = Column(Integer, nullable=True)
    education_requirement = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    job_type = Column(String, nullable=True)        # full_time/internship/contract
    work_mode = Column(String, nullable=True)       # remote/hybrid/onsite
    location = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    # ATS settings
    ats_criteria = Column(JSON, nullable=True)
    ats_threshold = Column(Integer, default=65)
    ats_mode = Column(String, default="threshold")  # threshold or top_n
    ats_top_n = Column(Integer, default=20)
    blind_hiring = Column(Boolean, default=False)
    # fraud
    fraud_scan_result = Column(JSON, nullable=True)
    is_flagged = Column(Boolean, default=False)


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_job_candidate"),
    )

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")
    # status flow:
    # pending → ats_passed/ats_failed/duplicate
    # ats_passed → shortlisted/maybe/rejected
    # shortlisted → interview_scheduled
    resume_path = Column(String, nullable=True)
    parsed_resume = Column(Text, nullable=True)
    embedding = Column(JSON, nullable=True)      # 384-dim float list (JSONB in DB)
    ats_score = Column(Integer, nullable=True)
    ats_result = Column(Text, nullable=True)
    pipeline_score = Column(Integer, nullable=True)
    pipeline_result = Column(Text, nullable=True)
    improvement_tips = Column(Text, nullable=True)  # JSON — resume tips
    created_at = Column(DateTime, default=datetime.utcnow)


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("users.id"))
    recruiter_id = Column(Integer, ForeignKey("users.id"))
    scheduled_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=45)
    format = Column(String, default="google_meet")  # google_meet/zoom/in_person
    meet_link = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="scheduled")    # scheduled/rescheduled/completed/cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, nullable=False)
    # types: shortlisted, rejected, interview_scheduled,
    #        interview_rescheduled, application_received
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    related_job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    related_application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FraudReport(Base):
    __tablename__ = "fraud_reports"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    reported_by = Column(Integer, ForeignKey("users.id"))
    category = Column(String, nullable=False)
    # categories: fees/fake/misleading/inappropriate/other
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")      # pending/reviewed/dismissed
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentMemory(Base):
    __tablename__ = "agent_memory"

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    memory_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TaskStatus(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    status = Column(String, default="pending")
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
