# ─────────────────────────────────────────────────────────────────────────────
# app/ai — AI & ML Module
# ─────────────────────────────────────────────────────────────────────────────
#
# Module layout (grouped by responsibility):
#
# SHARED INFRASTRUCTURE
#   groq_client.py      — Groq API client with retry logic
#
# ATS (Applicant Tracking System)
#   ats_gate.py         — Hard-rule ATS pass/fail gate
#   ats_parser.py       — Extract ATS criteria from job descriptions
#   ats_scorer.py       — LLM-based soft ATS scoring
#   ats_threshold.py    — Threshold & top-N candidate selection
#
# RESUME PROCESSING
#   parser.py           — Resume PDF → structured JSON
#   explainer.py        — Human-readable candidate ranking explanation
#
# MATCHING & SCORING
#   matcher.py          — Hybrid semantic + keyword candidate matching
#   scorer.py           — Multi-dimensional candidate scoring (pipeline)
#   blind_hiring.py     — Strip PII for bias-free screening
#
# TRUST & FRAUD
#   trust_scorer.py     — Company trust score calculation
#   fraud_detector.py   — Job posting fraud detection
#
# RAG CHATBOT
#   rag.py              — Recruiter Q&A chatbot (hybrid retrieval + LLM)
#
# ─────────────────────────────────────────────────────────────────────────────
