import time
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hireflow.llm")

# Cost per 1M tokens (Groq Llama-3.3-70b)
INPUT_COST_PER_1M = 0.59
OUTPUT_COST_PER_1M = 0.79

def log_llm_call(
    endpoint: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    latency_ms: float,
    success: bool,
    error: str = None
):
    cost = (
        (prompt_tokens / 1_000_000) * INPUT_COST_PER_1M +
        (completion_tokens / 1_000_000) * OUTPUT_COST_PER_1M
    )

    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "endpoint": endpoint,
        "model": model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "latency_ms": round(latency_ms, 2),
        "cost_usd": round(cost, 6),
        "success": success,
        "error": error
    }

    logger.info(f"LLM_CALL: {json.dumps(log_entry)}")
    return log_entry


def tracked_llm_call(client, endpoint: str, **kwargs):
    start = time.time()
    error = None
    response = None

    try:
        response = client.chat.completions.create(**kwargs)
        success = True
    except Exception as e:
        error = str(e)
        success = False
        raise
    finally:
        latency_ms = (time.time() - start) * 1000
        if response:
            log_llm_call(
                endpoint=endpoint,
                model=kwargs.get("model", "unknown"),
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                latency_ms=latency_ms,
                success=success,
                error=error
            )

    return response
