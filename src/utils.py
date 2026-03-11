import os
import time
from typing import Optional, List
from rich.console import Console
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

console = Console()

# ── Prompt Best Practices loader ──

_best_practices_cache: Optional[str] = None


def load_prompt_best_practices() -> str:
    """Load the prompt best practices guide from prompt_best_pratice.md.
    Cached after first read. Returns empty string if file not found."""
    global _best_practices_cache
    if _best_practices_cache is not None:
        return _best_practices_cache
    best_practices_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompt_best_pratice.md")
    try:
        with open(best_practices_path, "r", encoding="utf-8") as f:
            _best_practices_cache = f.read()
        console.print(f"    [dim]Loaded prompt best practices ({len(_best_practices_cache)} chars)[/dim]")
    except FileNotFoundError:
        console.print(f"    [yellow]⚠ prompt_best_pratice.md not found at {best_practices_path}[/yellow]")
        _best_practices_cache = ""
    return _best_practices_cache

# Default model — prefer paid model, fallback to free
DEFAULT_MODEL = os.getenv("OPENROUTER_PAID_MODEL") or os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
DEFAULT_TEMPERATURE = 0.7

_base_url = "https://openrouter.ai/api/v1"


def _resolve_openrouter_key() -> str:
    """Resolve OpenRouter API key: user-provided (settings.json) → env var."""
    try:
        from api.services.runtime_keys import get_key
        user_key = get_key("openrouter_api_key")
        if user_key:
            return user_key
    except Exception:
        pass
    return os.getenv("OPENROUTER_API_KEY", "")


_api_key = _resolve_openrouter_key() or os.getenv("OPENROUTER_API_KEY")

# Global fallback LLM (used when no per-agent override)
llm = ChatOpenAI(
    model=DEFAULT_MODEL,
    api_key=_api_key,
    base_url=_base_url,
)

MAX_RETRIES = 3
BASE_DELAY = 10  # seconds for retry backoff
REQUEST_TIMEOUT = 120  # seconds per LLM API call
# Paid models need less cooldown
CALL_COOLDOWN = int(os.getenv("CALL_COOLDOWN", "2" if os.getenv("OPENROUTER_PAID_MODEL") else "12"))

_last_call_time = 0.0

# Cache per-model LLM instances to avoid re-creating them every call
_llm_cache: dict[str, ChatOpenAI] = {}


_last_resolved_key = _api_key


def _get_llm(model_name: Optional[str] = None, temperature: Optional[float] = None) -> ChatOpenAI:
    """Get or create a ChatOpenAI instance for the given model/temperature."""
    global _last_resolved_key, _llm_cache
    model = model_name or DEFAULT_MODEL
    temp = temperature if temperature is not None else DEFAULT_TEMPERATURE

    # Re-resolve key each call so runtime changes (Settings UI) take effect
    current_key = _resolve_openrouter_key() or _api_key
    if current_key != _last_resolved_key:
        _llm_cache.clear()
        _last_resolved_key = current_key

    cache_key = f"{model}::{temp}"
    if cache_key not in _llm_cache:
        _llm_cache[cache_key] = ChatOpenAI(
            model=model,
            api_key=current_key,
            base_url=_base_url,
            temperature=temp,
            request_timeout=REQUEST_TIMEOUT,
        )
    return _llm_cache[cache_key]


def call_agent_model(
    system_prompt: str,
    user_content: str,
    pydantic_model=None,
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
):
    """
    Generic handler for all OpenFrame Agents.
    When pydantic_model is provided: enforces strict Pydantic output parsing.
    When pydantic_model is None: returns raw text string from the LLM.
    Includes retry + exponential backoff for rate limits.

    Args:
        pydantic_model: Pydantic class for structured output, or None for raw text
        model_name: OpenRouter model ID override (e.g. "anthropic/claude-sonnet-4")
        temperature: Temperature override (0.0 - 1.0)
    """
    global _last_call_time

    # Proactive cooldown: wait between consecutive calls
    elapsed = time.time() - _last_call_time
    if elapsed < CALL_COOLDOWN and _last_call_time > 0:
        wait = CALL_COOLDOWN - elapsed
        console.print(f"    [dim]Cooldown: waiting {wait:.0f}s before next call...[/dim]")
        time.sleep(wait)

    # Select LLM — per-agent override or global default
    active_llm = _get_llm(model_name, temperature)
    active_model = model_name or DEFAULT_MODEL
    console.print(f"    [dim]Using model: {active_model} (temp={temperature or DEFAULT_TEMPERATURE})[/dim]")

    # Plain text mode: no Pydantic parsing, just return LLM string
    if pydantic_model is None:
        from langchain_core.output_parsers import StrOutputParser
        safe_system = system_prompt.replace("{", "{{").replace("}", "}}")
        prompt = ChatPromptTemplate.from_messages([
            ("system", safe_system),
            ("user", "{input_text}"),
        ])
        chain = prompt | active_llm | StrOutputParser()
        _used_fallback = False
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result = chain.invoke({"input_text": user_content})
                _last_call_time = time.time()
                return result
            except Exception as e:
                error_str = str(e)
                if ("400" in error_str and "not a valid model" in error_str.lower()) and not _used_fallback:
                    active_llm = _get_llm(DEFAULT_MODEL, temperature)
                    chain = prompt | active_llm | StrOutputParser()
                    _used_fallback = True
                    continue
                if "429" in error_str or "rate" in error_str.lower():
                    delay = BASE_DELAY * (2 ** (attempt - 1))
                    time.sleep(delay)
                    continue
                if any(code in error_str for code in ("500", "502", "503")):
                    delay = BASE_DELAY * attempt
                    time.sleep(delay)
                    continue
                raise
        raise RuntimeError(f"call_agent_model (text mode) failed after {MAX_RETRIES} retries")

    parser = PydanticOutputParser(pydantic_object=pydantic_model)

    # Escape braces in system prompt so ChatPromptTemplate treats them as literals
    # (only the user message has real template variables: input_text, format_instructions)
    safe_system = system_prompt.replace("{", "{{").replace("}", "}}")
    prompt = ChatPromptTemplate.from_messages([
        ("system", safe_system),
        ("user", "{input_text}\n\n{format_instructions}"),
    ])

    chain = prompt | active_llm | parser

    _used_fallback = False

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = chain.invoke({
                "input_text": user_content,
                "format_instructions": parser.get_format_instructions(),
            })
            _last_call_time = time.time()
            return result
        except Exception as e:
            error_str = str(e)

            # Invalid model ID (400) → fallback to default model and retry once
            if ("400" in error_str and "not a valid model" in error_str.lower()) and not _used_fallback:
                console.print(f"    [red]✗ Invalid model '{active_model}'. Falling back to default: {DEFAULT_MODEL}[/red]")
                active_llm = _get_llm(DEFAULT_MODEL, temperature)
                chain = prompt | active_llm | parser
                _used_fallback = True
                continue

            # Rate limited (429) → exponential backoff
            if "429" in error_str or "rate" in error_str.lower():
                delay = BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"    [yellow]⚠ Rate limited (attempt {attempt}/{MAX_RETRIES}). Waiting {delay}s...[/yellow]")
                time.sleep(delay)
                continue

            # Transient server errors (500, 502, 503) → retry with backoff
            if any(code in error_str for code in ("500", "502", "503")):
                delay = BASE_DELAY * attempt
                console.print(f"    [yellow]⚠ Server error (attempt {attempt}/{MAX_RETRIES}). Waiting {delay}s...[/yellow]")
                time.sleep(delay)
                continue

            # All other errors → fatal
            raise
    raise RuntimeError(f"Failed after {MAX_RETRIES} retries due to rate limiting.")


# ── Vision model (Gemini) for image analysis ──

VISION_MODEL = os.getenv("OPENROUTER_VISION_MODEL", "google/gemini-2.5-pro-preview")


def call_vision_model(
    system_prompt: str,
    user_text: str,
    image_urls: List[str],
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
) -> str:
    """
    Call a vision-capable model (Gemini 2.5 Pro) with text + image(s).
    Returns raw text response.
    Uses OpenRouter's OpenAI-compatible multimodal message format.
    """
    global _last_call_time

    elapsed = time.time() - _last_call_time
    if elapsed < CALL_COOLDOWN and _last_call_time > 0:
        wait = CALL_COOLDOWN - elapsed
        console.print(f"    [dim]Cooldown: waiting {wait:.0f}s before next vision call...[/dim]")
        time.sleep(wait)

    model = model_name or VISION_MODEL
    temp = temperature if temperature is not None else 0.3  # Lower temp for analysis
    active_llm = _get_llm(model, temp)
    console.print(f"    [dim]Vision model: {model} (temp={temp})[/dim]")

    # Build multimodal content blocks
    content_blocks: list = [{"type": "text", "text": user_text}]
    for url in image_urls:
        content_blocks.append({
            "type": "image_url",
            "image_url": {"url": url},
        })

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=content_blocks),
    ]

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = active_llm.invoke(messages)
            _last_call_time = time.time()
            return result.content if hasattr(result, "content") else str(result)
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "rate" in error_str.lower():
                delay = BASE_DELAY * (2 ** (attempt - 1))
                console.print(f"    [yellow]⚠ Rate limited (attempt {attempt}/{MAX_RETRIES}). Waiting {delay}s...[/yellow]")
                time.sleep(delay)
                continue
            if any(code in error_str for code in ("500", "502", "503")):
                delay = BASE_DELAY * attempt
                console.print(f"    [yellow]⚠ Server error (attempt {attempt}/{MAX_RETRIES}). Waiting {delay}s...[/yellow]")
                time.sleep(delay)
                continue
            raise
    raise RuntimeError(f"Vision model call failed after {MAX_RETRIES} retries.")
