import os
import time
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def groq_with_retry(max_retries: int = 3, **kwargs):
    """
    Groq API call with exponential backoff retry.
    Retries on rate limit and server errors.
    Includes a default timeout of 30 seconds if not specified.
    """
    if "timeout" not in kwargs:
        kwargs["timeout"] = 30.0

    last_error = None
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(**kwargs)
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            if "rate limit" in error_str or "429" in error_str:
                wait = (2 ** attempt) + 1  # 2s, 5s, 9s
                print(f"[GROQ] Rate limited — waiting {wait}s (attempt {attempt + 1})")
                time.sleep(wait)
            elif "500" in error_str or "503" in error_str:
                wait = 2 ** attempt
                print(f"[GROQ] Server error — waiting {wait}s (attempt {attempt + 1})")
                time.sleep(wait)
            else:
                raise  # don't retry on other errors

    raise last_error
