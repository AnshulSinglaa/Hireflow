from pydantic import BaseModel, field_validator
from typing import Optional

class ScoreBreakdown(BaseModel):
    skills_match: int
    experience_match: int
    education_match: int
    overall_fit: int

    @field_validator('*')
    @classmethod
    def clamp_score(cls, v):
        return max(0, min(100, v))

class CandidateScore(BaseModel):
    candidate_name: str
    total_score: int
    breakdown: ScoreBreakdown
    strengths: list[str]
    weaknesses: list[str]
    recommendation: str

    @field_validator('total_score')
    @classmethod
    def clamp_total(cls, v):
        return max(0, min(100, v))

    @field_validator('recommendation')
    @classmethod
    def valid_recommendation(cls, v):
        valid = ["Strong hire", "Good hire", "Maybe", "Reject"]
        if v not in valid:
            return "Maybe"
        return v

class ParsedResume(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: list[str] = []
    experience_years: int = 0
    education: Optional[str] = None
    summary: Optional[str] = None
