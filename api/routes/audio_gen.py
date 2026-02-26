"""Audio generation endpoints — kie.ai backed.

Three audio generation modes:
  - Talking Head (infinitalk/from-audio): lip-sync video from image + audio
  - Voiceover (elevenlabs/text-to-dialogue-v3): TTS from script text
  - Music (suno/generate): background music from prompt
"""

import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from api.services.image_gen.kie_common import (
    kie_create_task,
    kie_get_task_status,
    kie_headers,
)
from api.services.api_logger import ApiLogger
from api.services.license import report_event, check_license
import httpx

router = APIRouter(prefix="/api/audio", tags=["audio"])


# ── Request / Response schemas ──

class TalkingHeadRequest(BaseModel):
    """Generate lip-sync video from a static image + audio file."""
    image_url: str
    audio_url: str
    model: str = "infinitalk/from-audio"


class VoiceoverRequest(BaseModel):
    """Generate speech audio from text via ElevenLabs TTS Turbo 2.5."""
    text: str
    voice: str = "Sarah"                  # ElevenLabs voice name or ID
    stability: float = 0.5                # 0-1, voice stability
    similarity_boost: float = 0.75        # 0-1, similarity boost
    style: float = 0.0                    # 0-1, style exaggeration
    speed: float = 1.0                    # 0.7-1.2, speech speed
    language_code: str = ""               # ISO 639-1 language code (empty = auto-detect)
    model: str = "elevenlabs/text-to-speech-turbo-2-5"


class MusicRequest(BaseModel):
    """Generate background music using Suno API via kie.ai."""
    prompt: str                            # Required: music description or lyrics
    custom_mode: bool = False              # If True, requires style/title; if False, only prompt
    instrumental: bool = False             # If True, no lyrics
    model: str = "V5"                      # V4, V4_5, V4_5PLUS, V4_5ALL, V5
    style: str = ""                        # Music style (required in custom mode)
    title: str = ""                        # Track title (required in custom mode)
    vocal_gender: str = ""                 # 'm' or 'f' (custom mode only)
    style_weight: Optional[float] = None   # 0-1, adherence to style
    weirdness_constraint: Optional[float] = None  # 0-1, creative deviation
    audio_weight: Optional[float] = None   # 0-1, audio feature balance


class AudioGenerateResponse(BaseModel):
    task_id: str
    model: str


class AudioStatusResponse(BaseModel):
    task_id: str
    state: str
    result_urls: Optional[List[str]] = None
    error_message: Optional[str] = None
    cost_time: Optional[int] = None


# ── Talking Head (infinitalk) ──

@router.post("/talking-head", response_model=AudioGenerateResponse, dependencies=[Depends(check_license)])
async def generate_talking_head(req: TalkingHeadRequest):
    """Create a talking-head lip-sync video from image + audio."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="talking_head",
        model=req.model,
        provider="kie.ai",
        status="running",
        input_summary=f"image={req.image_url[:60]}...",
        estimated_credits=0.10,
    )
    try:
        payload = {
            "model": req.model,
            "input": {
                "image_url": req.image_url,
                "audio_url": req.audio_url,
            },
        }
        task = await kie_create_task(payload, "kie.ai")
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"task={task.task_id}")
        await report_event("audio_generation")
        return AudioGenerateResponse(task_id=task.task_id, model=req.model)
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


# ── Voiceover (ElevenLabs TTS) ──

@router.post("/voiceover", response_model=AudioGenerateResponse, dependencies=[Depends(check_license)])
async def generate_voiceover(req: VoiceoverRequest):
    """Generate speech from text using ElevenLabs via kie.ai."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="voiceover",
        model=req.model,
        provider="kie.ai",
        status="running",
        input_summary=f"text={req.text[:80]}...",
        estimated_credits=0.05,
    )
    try:
        payload = {
            "model": req.model,
            "input": {
                "text": req.text,
                "voice": req.voice,
                "stability": req.stability,
                "similarity_boost": req.similarity_boost,
                "style": req.style,
                "speed": req.speed,
                "language_code": req.language_code,
            },
        }
        task = await kie_create_task(payload, "kie.ai")
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"task={task.task_id}")
        await report_event("audio_generation")
        return AudioGenerateResponse(task_id=task.task_id, model=req.model)
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


# ── Music (Suno — uses dedicated /api/v1/generate endpoint, NOT kie.ai jobs) ──

SUNO_BASE = "https://api.kie.ai/api/v1"

@router.post("/music", response_model=AudioGenerateResponse, dependencies=[Depends(check_license)])
async def generate_music(req: MusicRequest):
    """Generate background music from a text prompt using Suno via kie.ai."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="music",
        model=f"suno/{req.model}",
        provider="kie.ai",
        status="running",
        input_summary=f"prompt={req.prompt[:80]}...",
        estimated_credits=0.20,
    )
    try:
        payload: dict = {
            "prompt": req.prompt,
            "customMode": req.custom_mode,
            "instrumental": req.instrumental,
            "model": req.model,
            "callBackUrl": "https://localhost/no-callback",  # required field; we poll instead
        }

        # Add optional fields only if provided
        if req.custom_mode:
            if req.style:
                payload["style"] = req.style
            if req.title:
                payload["title"] = req.title

        if req.vocal_gender:
            payload["vocalGender"] = req.vocal_gender
        if req.style_weight is not None:
            payload["styleWeight"] = req.style_weight
        if req.weirdness_constraint is not None:
            payload["weirdnessConstraint"] = req.weirdness_constraint
        if req.audio_weight is not None:
            payload["audioWeight"] = req.audio_weight

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{SUNO_BASE}/generate",
                json=payload,
                headers=kie_headers(),
            )
            body = resp.json()

        if body.get("code") != 200:
            raise RuntimeError(body.get("msg", f"Suno API error (HTTP {resp.status_code})"))

        task_id = body["data"]["taskId"]
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"task={task_id}")
        await report_event("audio_generation")
        return AudioGenerateResponse(task_id=task_id, model=f"suno/{req.model}")
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/music/status/{task_id}")
async def get_music_status(task_id: str):
    """Poll Suno music task status via /api/v1/generate/record-info."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{SUNO_BASE}/generate/record-info",
                params={"taskId": task_id},
                headers=kie_headers(),
            )
            body = resp.json()

        if body.get("code") != 200:
            raise RuntimeError(body.get("msg", "Failed to query music task"))

        d = body["data"]
        status = d.get("status", "PENDING")

        # Map Suno statuses to our standard states
        state_map = {
            "SUCCESS": "success",
            "FIRST_SUCCESS": "running",
            "TEXT_SUCCESS": "running",
            "PENDING": "running",
            "CREATE_TASK_FAILED": "fail",
            "GENERATE_AUDIO_FAILED": "fail",
            "CALLBACK_EXCEPTION": "fail",
            "SENSITIVE_WORD_ERROR": "fail",
        }
        mapped_state = state_map.get(status, "running")

        # Extract audio URLs from sunoData
        result_urls = []
        resp_data = d.get("response") or {}
        for track in resp_data.get("sunoData", []):
            url = track.get("audioUrl") or track.get("audio_url")
            if url:
                result_urls.append(url)

        return AudioStatusResponse(
            task_id=task_id,
            state=mapped_state,
            result_urls=result_urls if result_urls else None,
            error_message=d.get("errorMessage"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Status polling (shared, reuses kie.ai task status) ──

@router.get("/status/{task_id}", response_model=AudioStatusResponse)
async def get_audio_status(task_id: str):
    """Poll the status of any audio generation task."""
    try:
        status = await kie_get_task_status(task_id)
        return AudioStatusResponse(
            task_id=status.task_id,
            state=status.state,
            result_urls=status.result_urls,
            error_message=status.error_message,
            cost_time=status.cost_time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
