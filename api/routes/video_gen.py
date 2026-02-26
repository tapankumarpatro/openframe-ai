"""Video generation endpoints — multi-model, kie.ai backed.

Supported models (all via kie.ai):
  Standard flow (POST /api/v1/jobs/createTask):
    - kling-2.6/image-to-video          (i2v)
    - kling/v2-5-turbo-image-to-video-pro (i2v)
    - bytedance/v1-pro-fast-image-to-video (i2v)
    - bytedance/seedance-1.5-pro        (t2v + i2v)
    - kling-3.0/video                   (t2v)
    - hailuo/02-text-to-video-pro       (t2v)
    - wan/2-6-text-to-video             (t2v)
    - sora-2-pro-text-to-video          (t2v)
    - kling/v2-5-turbo-text-to-video-pro (t2v)

  Veo 3.1 flow (POST /api/v1/veo/generate):
    - veo3                              (t2v + i2v)
    - veo3_fast                         (t2v + i2v)
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
from api.routes.upload import resolve_image_urls
import httpx, json

router = APIRouter(prefix="/api/video", tags=["video"])

# ── Veo 3.1 endpoint (different from standard kie.ai flow)
VEO_GENERATE = "https://api.kie.ai/api/v1/veo/generate"

# Models that use the standard kie.ai createTask endpoint
STANDARD_MODELS = {
    "infinitalk/from-audio",
    "kling-2.6/image-to-video",
    "kling/v2-5-turbo-image-to-video-pro",
    "bytedance/v1-pro-fast-image-to-video",
    "bytedance/seedance-1.5-pro",
    "kling-3.0/video",
    "hailuo/02-text-to-video-pro",
    "wan/2-6-text-to-video",
    "sora-2-pro-text-to-video",
    "kling/v2-5-turbo-text-to-video-pro",
}

VEO_MODELS = {"veo3", "veo3_fast"}


# ---------- request / response schemas ----------
class VideoGenerateRequest(BaseModel):
    model: str = "kling-2.6/image-to-video"
    prompt: str = ""
    image_urls: Optional[List[str]] = None      # up to 2 images
    audio_url: Optional[str] = None             # for infinitalk/from-audio
    aspect_ratio: str = "16:9"
    duration: str = "5"                         # seconds as string
    resolution: str = "720p"
    # Model-specific optional params
    negative_prompt: Optional[str] = None
    cfg_scale: Optional[float] = None
    generate_audio: Optional[bool] = None
    fixed_lens: Optional[bool] = None
    sound: Optional[bool] = None
    prompt_optimizer: Optional[bool] = None


class VideoGenerateResponse(BaseModel):
    task_id: str
    model: str


class VideoStatusResponse(BaseModel):
    task_id: str
    state: str                                  # waiting | success | fail
    result_urls: Optional[List[str]] = None
    error_message: Optional[str] = None
    cost_time: Optional[int] = None


# Valid durations per model — used to clamp incoming values
VALID_DURATIONS: dict[str, list[str]] = {
    "kling-2.6/image-to-video":               ["5", "10"],
    "kling/v2-5-turbo-image-to-video-pro":    ["5", "10"],
    "bytedance/v1-pro-fast-image-to-video":   ["5", "10"],
    "bytedance/seedance-1.5-pro":             ["4", "8", "12"],
    "kling-3.0/video":                        ["5"],
    "hailuo/02-text-to-video-pro":            ["5"],
    "wan/2-6-text-to-video":                  ["5", "10", "15"],
    "sora-2-pro-text-to-video":               ["10", "15"],
    "kling/v2-5-turbo-text-to-video-pro":     ["5", "10"],
}

# Valid aspect ratios per model
VALID_ASPECTS: dict[str, list[str]] = {
    "bytedance/seedance-1.5-pro": ["1:1", "21:9", "4:3", "3:4", "16:9", "9:16"],
    "kling/v2-5-turbo-text-to-video-pro": ["16:9", "9:16", "1:1"],
    "kling/v2-5-turbo-image-to-video-pro": ["16:9", "9:16", "1:1"],
}


def _clamp_duration(model: str, duration: str) -> str:
    """Return a valid duration for the model, falling back to first valid option."""
    valid = VALID_DURATIONS.get(model)
    if not valid:
        return duration
    if duration in valid:
        return duration
    return valid[0]


# Max images per model — used to truncate image_urls before building payload
MAX_IMAGES: dict[str, int] = {
    "infinitalk/from-audio":                1,
    "kling-2.6/image-to-video":             1,
    "kling/v2-5-turbo-image-to-video-pro": 2,
    "kling-3.0/video":                     2,
    "bytedance/v1-pro-fast-image-to-video": 1,
    "bytedance/seedance-1.5-pro":           2,
    "veo3":                                 2,
    "veo3_fast":                            2,
    # t2v models default to 0 (no images)
}


def _clamp_images(model: str, urls: Optional[List[str]]) -> Optional[List[str]]:
    """Truncate image list to the model's max accepted count."""
    if not urls:
        return urls
    limit = MAX_IMAGES.get(model, 0)
    if limit <= 0:
        return None
    return urls[:limit]


def _clamp_aspect(model: str, aspect: str) -> str:
    """Return a valid aspect ratio for the model, falling back to 16:9."""
    valid = VALID_ASPECTS.get(model)
    if not valid:
        return aspect
    if aspect in valid:
        return aspect
    return "16:9" if "16:9" in valid else valid[0]


# ---------- helpers: build model-specific payloads ----------
def _build_standard_payload(req: VideoGenerateRequest, resolved_urls: Optional[List[str]]) -> dict:
    """Build a createTask payload for kie.ai standard video models."""
    model = req.model
    inp: dict = {}

    # -- infinitalk/from-audio (talking head) --
    if model == "infinitalk/from-audio":
        if not resolved_urls:
            raise ValueError("infinitalk/from-audio requires an image_url")
        inp["image_url"] = resolved_urls[0]
        inp["audio_url"] = req.audio_url or ""
        if not inp["audio_url"]:
            raise ValueError("infinitalk/from-audio requires an audio_url")
        inp["prompt"] = req.prompt or "A person talking naturally."
        inp["resolution"] = req.resolution if req.resolution in ("480p", "720p") else "480p"
        return {"model": model, "input": inp}

    # -- kling-2.6/image-to-video --
    elif model == "kling-2.6/image-to-video":
        inp["prompt"] = req.prompt
        inp["image_urls"] = resolved_urls or []
        inp["sound"] = req.sound if req.sound is not None else False
        inp["duration"] = _clamp_duration(model, req.duration)

    # -- kling/v2-5-turbo-image-to-video-pro --
    elif model == "kling/v2-5-turbo-image-to-video-pro":
        if not resolved_urls:
            raise ValueError("kling/v2-5-turbo-image-to-video-pro requires an image_url")
        inp["prompt"] = req.prompt
        inp["image_url"] = resolved_urls[0]
        inp["tail_image_url"] = resolved_urls[1] if len(resolved_urls) > 1 else ""
        inp["duration"] = _clamp_duration(model, req.duration)
        inp["negative_prompt"] = req.negative_prompt or "blur, distort, and low quality"
        inp["cfg_scale"] = req.cfg_scale if req.cfg_scale is not None else 0.5

    # -- bytedance/v1-pro-fast-image-to-video --
    elif model == "bytedance/v1-pro-fast-image-to-video":
        inp["prompt"] = req.prompt
        inp["image_url"] = (resolved_urls[0]) if resolved_urls else ""
        inp["resolution"] = req.resolution
        inp["duration"] = _clamp_duration(model, req.duration)

    # -- bytedance/seedance-1.5-pro --
    elif model == "bytedance/seedance-1.5-pro":
        inp["prompt"] = req.prompt
        if resolved_urls:
            inp["input_urls"] = resolved_urls
        inp["aspect_ratio"] = _clamp_aspect(model, req.aspect_ratio)
        inp["resolution"] = req.resolution
        inp["duration"] = _clamp_duration(model, req.duration)
        if req.fixed_lens is not None:
            inp["fixed_lens"] = req.fixed_lens
        if req.generate_audio is not None:
            inp["generate_audio"] = req.generate_audio

    # -- kling-3.0/video --
    elif model == "kling-3.0/video":
        inp["prompt"] = req.prompt
        inp["multi_shots"] = False
        inp["mode"] = "std"
        inp["sound"] = req.sound if req.sound is not None else True
        inp["duration"] = _clamp_duration(model, req.duration)
        if resolved_urls:
            inp["image_urls"] = resolved_urls
        if req.aspect_ratio and req.aspect_ratio != "auto":
            inp["aspect_ratio"] = req.aspect_ratio

    # -- hailuo/02-text-to-video-pro --
    elif model == "hailuo/02-text-to-video-pro":
        inp["prompt"] = req.prompt
        if req.prompt_optimizer is not None:
            inp["prompt_optimizer"] = req.prompt_optimizer
        else:
            inp["prompt_optimizer"] = True

    # -- wan/2-6-text-to-video --
    elif model == "wan/2-6-text-to-video":
        inp["prompt"] = req.prompt
        inp["duration"] = _clamp_duration(model, req.duration)
        inp["resolution"] = req.resolution

    # -- sora-2-pro-text-to-video --
    elif model == "sora-2-pro-text-to-video":
        inp["prompt"] = req.prompt
        inp["aspect_ratio"] = "landscape" if req.aspect_ratio in ("16:9", "auto") else "portrait"
        inp["n_frames"] = "10" if req.duration in ("5", "10") else "15"
        inp["size"] = "high"
        inp["remove_watermark"] = True

    # -- kling/v2-5-turbo-text-to-video-pro --
    elif model == "kling/v2-5-turbo-text-to-video-pro":
        inp["prompt"] = req.prompt
        inp["duration"] = _clamp_duration(model, req.duration)
        inp["aspect_ratio"] = _clamp_aspect(model, req.aspect_ratio)
        if req.negative_prompt:
            inp["negative_prompt"] = req.negative_prompt
        if req.cfg_scale is not None:
            inp["cfg_scale"] = req.cfg_scale

    else:
        raise ValueError(f"Unknown standard model: {model}")

    return {"model": model, "input": inp}


async def _create_veo_task(req: VideoGenerateRequest, resolved_urls: Optional[List[str]]) -> str:
    """Create a Veo 3.1 generation task (different endpoint)."""
    payload: dict = {
        "prompt": req.prompt,
        "model": req.model,                     # veo3 or veo3_fast
        "aspect_ratio": req.aspect_ratio,
    }

    if resolved_urls:
        payload["imageUrls"] = resolved_urls
        if len(resolved_urls) == 2:
            payload["generationType"] = "FIRST_AND_LAST_FRAMES_2_VIDEO"
        else:
            payload["generationType"] = "FIRST_AND_LAST_FRAMES_2_VIDEO"
    else:
        payload["generationType"] = "TEXT_2_VIDEO"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(VEO_GENERATE, json=payload, headers=kie_headers())
        body = resp.json()

    code = body.get("code")
    if code != 200:
        raise RuntimeError(body.get("msg", f"Veo API error (HTTP {resp.status_code})"))

    return body["data"]["taskId"]


# ---------- endpoints ----------
@router.post("/generate", response_model=VideoGenerateResponse, dependencies=[Depends(check_license)])
async def generate_video(req: VideoGenerateRequest):
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="video_generation",
        model=req.model,
        provider="kie.ai",
        status="running",
        input_summary=f"{req.model} | {req.prompt[:80]}",
    )
    try:
        # Resolve base64 data-URLs → public HTTP URLs
        resolved_urls = None
        if req.image_urls:
            resolved_urls = await resolve_image_urls(req.image_urls)
            resolved_urls = resolved_urls if resolved_urls else None

        # Clamp image count to model's max (safety net)
        resolved_urls = _clamp_images(req.model, resolved_urls)

        if req.model in VEO_MODELS:
            task_id = await _create_veo_task(req, resolved_urls)
        elif req.model in STANDARD_MODELS:
            payload = _build_standard_payload(req, resolved_urls)
            task = await kie_create_task(payload, provider_name="kie-video")
            task_id = task.task_id
        else:
            raise ValueError(f"Unsupported video model: {req.model}")

        ApiLogger.update(log_entry.id, task_id=task_id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Task created: {task_id}")
        await report_event("video_generation")
        return VideoGenerateResponse(task_id=task_id, model=req.model)

    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}", response_model=VideoStatusResponse)
async def get_video_status(task_id: str):
    """Poll kie.ai for task status. Works for both standard and Veo tasks."""
    try:
        status = await kie_get_task_status(task_id)
        return VideoStatusResponse(
            task_id=status.task_id,
            state=status.state,
            result_urls=status.result_urls,
            error_message=status.error_message,
            cost_time=status.cost_time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
