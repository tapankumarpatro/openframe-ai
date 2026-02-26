from typing import TypedDict, Optional, List, Dict, Any
from src.models.schemas import (
    CreativeBrief, CreativeCritique, VisualIdentity, ProductSpecs,
    CastingBrief, CameraSpecs, ShotList, AudioSpecs
)


class AgentModelConfig(TypedDict, total=False):
    model: str
    temperature: float


def get_agent_llm_kwargs(state: "OpenFrameState", agent_name: str) -> dict:
    """Extract model_name and temperature kwargs for call_agent_model from state."""
    agent_models = state.get("agent_models") or {}
    cfg = agent_models.get(agent_name, {})
    kwargs = {}
    if cfg.get("model"):
        kwargs["model_name"] = cfg["model"]
    if cfg.get("temperature") is not None:
        kwargs["temperature"] = cfg["temperature"]
    return kwargs


class OpenFrameState(TypedDict):
    # Raw Input
    user_input: str

    # Ad type preset id (e.g. "fashion_luxury", "ugc_social", "commercial_product")
    ad_type: Optional[str]

    # Product reference image (base64 data URI) uploaded by user
    product_image: Optional[str]

    # Per-agent LLM settings (optional — falls back to global default)
    agent_models: Optional[Dict[str, AgentModelConfig]]

    # Structured Outputs (Optional until populated)
    creative_brief: Optional[CreativeBrief]
    creative_critique: Optional[CreativeCritique]
    visual_identity: Optional[VisualIdentity]
    product_specs: Optional[ProductSpecs]
    casting_brief: Optional[CastingBrief]
    camera_specs: Optional[CameraSpecs]
    shot_list: Optional[ShotList]
    audio_specs: Optional[AudioSpecs]
