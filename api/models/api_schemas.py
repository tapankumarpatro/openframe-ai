from pydantic import BaseModel
from typing import Optional, Any, List


class AgentModelSetting(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = None


class WorkflowRequest(BaseModel):
    user_input: str
    ad_type: Optional[str] = None
    product_image: Optional[str] = None
    agent_models: Optional[dict[str, AgentModelSetting]] = None


class EnhancePromptsRequest(BaseModel):
    scene_info: dict
    connected_assets: List[dict] = []
    concept: str = ""
    technical_specs: str = ""
    lighting: str = ""
    existing_start_prompt: str = ""
    existing_end_prompt: str = ""
    user_instructions: str = ""


class EnhancePromptsResponse(BaseModel):
    start_image_prompt: str
    end_image_prompt: str


class EnhanceVideoPromptsRequest(BaseModel):
    scene_info: dict
    connected_assets: List[dict] = []
    concept: str = ""
    technical_specs: str = ""
    lighting: str = ""
    start_image_prompt: str = ""
    end_image_prompt: str = ""
    existing_start_video_prompt: str = ""
    existing_end_video_prompt: str = ""
    existing_combined_video_prompt: str = ""
    audio_mode: str = "silent"
    dialogue: str = ""
    dialogue_speaker: str = ""
    user_instructions: str = ""


class EnhanceVideoPromptsResponse(BaseModel):
    start_video_prompt: str
    end_video_prompt: str
    combined_video_prompt: str


class EnhanceSceneAudioRequest(BaseModel):
    scene_info: dict
    connected_assets: List[dict] = []
    concept: str = ""
    audio_mode: str = "talking-head"
    existing_start_video_prompt: str = ""
    existing_end_video_prompt: str = ""
    existing_combined_video_prompt: str = ""
    existing_dialogue: str = ""
    user_instructions: str = ""


class EnhanceSceneAudioResponse(BaseModel):
    dialogue: str
    dialogue_speaker: str
    scene_voice_prompt: str
    combined_video_prompt: str
    start_video_prompt: str
    end_video_prompt: str


class EnhanceAssetPromptRequest(BaseModel):
    asset_type: str  # character, environment, product
    asset_label: str = ""
    existing_prompt: str = ""
    concept: str = ""
    user_instructions: str = ""


class EnhanceAssetPromptResponse(BaseModel):
    enhanced_prompt: str


class RunSingleAgentRequest(BaseModel):
    agent_name: str  # creative_director, brand_stylist, product_stylist, casting_scout, cinematographer, director, sound_designer
    user_input: str = ""
    ad_type: Optional[str] = None
    product_image: Optional[str] = None
    existing_outputs: dict = {}  # { "creative_brief": {...}, "casting_brief": {...}, ... }
    canvas_assets: List[dict] = []  # simplified keyItems [{ type, label, text_prompt }]
    canvas_scenes: List[dict] = []  # simplified scenes [{ scene_number, type, shot_type, ... }]


class RunSingleAgentResponse(BaseModel):
    agent_name: str
    output_key: str  # e.g. "creative_brief", "casting_brief"
    output_data: dict


class ResumeWorkflowRequest(BaseModel):
    workflow_id: str
    user_input: str
    ad_type: Optional[str] = None
    product_image: Optional[str] = None
    existing_outputs: dict = {}  # { "creative_brief": {...}, "visual_identity": {...}, ... }
    agent_models: Optional[dict[str, AgentModelSetting]] = None


class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str


class AgentEvent(BaseModel):
    workflow_id: str
    agent: str
    status: str  # "running" | "done" | "error"
    data: Optional[Any] = None
    error: Optional[str] = None


class WorkflowResult(BaseModel):
    workflow_id: str
    status: str  # "running" | "completed" | "error"
    result: Optional[dict] = None
    error: Optional[str] = None
