import json
import os
from groq import Groq
from sqlalchemy.orm import Session
from app import models
from app.ai.scorer import score_candidate

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_job_candidates",
            "description": "Get all candidates who applied to a specific job with their application IDs",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "The job ID to get candidates for"
                    }
                },
                "required": ["job_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "score_application",
            "description": "Score a candidate's application using AI. Returns score out of 100 with breakdown and recommendation",
            "parameters": {
                "type": "object",
                "properties": {
                    "application_id": {
                        "type": "integer",
                        "description": "The application ID to score"
                    }
                },
                "required": ["application_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_job_details",
            "description": "Get details about a specific job posting",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "integer",
                        "description": "The job ID"
                    }
                },
                "required": ["job_id"]
            }
        }
    }
]


def execute_tool(tool_name: str, tool_args: dict, db: Session) -> str:
    if tool_name == "get_job_candidates":
        job_id = tool_args["job_id"]
        applications = db.query(models.Application).filter(
            models.Application.job_id == job_id
        ).all()
        if not applications:
            return json.dumps({"candidates": [], "message": "No candidates found"})
        candidates = []
        for app in applications:
            candidates.append({
                "application_id": app.id,
                "candidate_id": app.candidate_id,
                "status": app.status,
                "has_resume": app.parsed_resume is not None
            })
        return json.dumps({"candidates": candidates, "total": len(candidates)})

    elif tool_name == "score_application":
        application_id = tool_args["application_id"]
        result = score_candidate(application_id, db)
        return json.dumps(result)

    elif tool_name == "get_job_details":
        job_id = tool_args["job_id"]
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            return json.dumps({"error": "Job not found"})
        return json.dumps({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "company": job.company
        })

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


def save_memory(job_id: int, memory_type: str, content: str, db: Session):
    memory = models.AgentMemory(
        job_id=job_id,
        memory_type=memory_type,
        content=content
    )
    db.add(memory)
    db.commit()
    print(f"   [MEMORY] Saved: [{memory_type}] {content[:50]}...")


def load_memory(job_id: int, db: Session) -> list:
    memories = db.query(models.AgentMemory).filter(
        models.AgentMemory.job_id == job_id
    ).order_by(models.AgentMemory.created_at.desc()).limit(10).all()
    return [{"type": m.memory_type, "content": m.content} for m in memories]


def run_screening_agent(job_id: int, db: Session) -> dict:
    print(f"\n[AGENT] Screening agent starting for job {job_id}...")

    # Load previous memories
    previous_memories = load_memory(job_id, db)
    print(f"   [MEMORY] Loaded {len(previous_memories)} previous memories")  # ADD THIS
    memory_context = ""
    if previous_memories:
        memory_context = "\n\n## Your Previous Actions on This Job\n"
        for mem in previous_memories:
            memory_context += f"- [{mem['type']}] {mem['content']}\n"
        memory_context += "\nUse this context to avoid repeating work."

    messages = [
        {
            "role": "user",
            "content": f"""You are HireFlow's autonomous senior recruiting agent with expertise in technical hiring.{memory_context}

## Your Mission
Conduct a complete, thorough screening of ALL candidates for job ID {job_id}. Leave no candidate unscreened.

## Execution Protocol
Follow these steps in exact order:
1. Retrieve job details to understand requirements
2. Get the complete list of all candidates
3. Score EVERY candidate individually — do not skip anyone
4. Analyze all scores together
5. Deliver your final hiring report

## Final Report Must Include
- Total candidates screened
- Ranked leaderboard (highest to lowest score)
- Top candidate with detailed justification
- Recommended for interview (score >= 70)
- Maybe pile (score 50-69) — worth a second look
- Reject pile (score < 50) — clear mismatch
- Red flags noticed across candidates
- Overall hiring recommendation with confidence level

## Rules
- Never skip a candidate — incomplete screening is a failed screening
- Base all decisions purely on data returned by tools
- Be specific — mention candidate names and actual scores
- If a candidate has no parsed resume, note it and skip scoring
- Do not give your final report until ALL candidates are scored

Begin now."""
        }
    ]

    max_iterations = 10
    iteration = 0


    while iteration < max_iterations:
        iteration += 1
        print(f"   Iteration {iteration}...")

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=0,
            max_tokens=2000
        )

        message = response.choices[0].message
        messages.append({
            "role": "assistant",
            "content": message.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                }
                for tc in (message.tool_calls or [])
            ] if message.tool_calls else None
        })

        if not message.tool_calls:
            print("[AGENT] Finished.")
            result = {
                "job_id": job_id,
                "iterations": iteration,
                "final_report": message.content
            }
            # Save memory of this run
            save_memory(
                job_id=job_id,
                memory_type="screening_complete",
                content=f"Screened job {job_id}. Report: {message.content[:200]}",
                db=db
            )
            return result

        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)
            print(f"   [TOOL] Calling: {tool_name}({tool_args})")

            result = execute_tool(tool_name, tool_args, db)
            print(f"   [RESULT] {result[:120]}...")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result
            })

    return {
        "job_id": job_id,
        "iterations": iteration,
        "final_report": "Agent reached maximum iterations without completing.",
        "error": "max_iterations_reached"
    }
