import asyncio
import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
from app.database import SessionLocal
from app import models
from app.ai.scorer import score_candidate
from app.agents.pipeline import run_full_pipeline

server = Server("hireflow")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="get_jobs",
            description="Get all job postings in HireFlow",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        types.Tool(
            name="get_job_candidates",
            description="Get all candidates who applied to a specific job",
            inputSchema={
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "The job ID"
                    }
                },
                "required": ["job_id"]
            }
        ),
        types.Tool(
            name="score_candidate",
            description="Score a candidate's application using AI. Returns score out of 100",
            inputSchema={
                "type": "object",
                "properties": {
                    "application_id": {
                        "type": "integer",
                        "description": "The application ID to score"
                    }
                },
                "required": ["application_id"]
            }
        ),
        types.Tool(
            name="run_pipeline",
            description="Run the full HireFlow AI pipeline for a job — screens, scores, generates interview questions and emails",
            inputSchema={
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "The job ID to run pipeline for"
                    }
                },
                "required": ["job_id"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    db = SessionLocal()
    try:
        if name == "get_jobs":
            jobs = db.query(models.Job).all()
            result = [{"id": j.id, "title": j.title, "company": j.company} for j in jobs]
            return [types.TextContent(type="text", text=json.dumps(result))]

        elif name == "get_job_candidates":
            job_id = arguments["job_id"]
            applications = db.query(models.Application).filter(
                models.Application.job_id == job_id
            ).all()
            result = [{"application_id": a.id, "candidate_id": a.candidate_id, "status": a.status} for a in applications]
            return [types.TextContent(type="text", text=json.dumps(result))]

        elif name == "score_candidate":
            application_id = arguments["application_id"]
            result = score_candidate(application_id, db)
            return [types.TextContent(type="text", text=json.dumps(result))]

        elif name == "run_pipeline":
            job_id = arguments["job_id"]
            result = run_full_pipeline(job_id, db)
            return [types.TextContent(type="text", text=json.dumps(result))]

        else:
            return [types.TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    finally:
        db.close()

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    print("HireFlow MCP Server starting...", file=sys.stderr)
    asyncio.run(main())
