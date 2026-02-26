"""SRT subtitle generation endpoint — uses local Whisper."""

import asyncio
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from api.services.api_logger import ApiLogger

router = APIRouter(prefix="/api/srt", tags=["srt"])


class SrtRequest(BaseModel):
    audio_url: str
    language: str = "en"


class SrtResponse(BaseModel):
    srt_text: str


@router.post("/generate", response_model=SrtResponse)
async def generate_srt(req: SrtRequest):
    """Transcribe audio URL to SRT subtitles using local Whisper."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="srt_generation",
        model="whisper-base",
        provider="local",
        status="running",
        input_summary=f"audio={req.audio_url[:60]}...",
        estimated_credits=0.0,
    )
    try:
        from api.services.srt_gen import generate_srt_from_audio
        srt_text = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_srt_from_audio(req.audio_url, req.language),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"SRT: {len(srt_text)} chars")
        return SrtResponse(srt_text=srt_text)
    except ImportError:
        ApiLogger.update(log_entry.id, status="error",
                         error_message="openai-whisper not installed",
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(
            status_code=501,
            detail="openai-whisper is not installed. Run: pip install openai-whisper"
        )
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))
