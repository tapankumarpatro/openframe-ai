from pydantic import BaseModel, Field
from typing import List, Optional


# --- Agent 1: Creative Director ---
class CreativeBrief(BaseModel):
    campaign_title: str = Field(description="Abstract, elegant title")
    concept_summary: str = Field(description="High-concept narrative summary")
    mood_keywords: List[str] = Field(description="5 adjectives describing emotional resonance")
    tagline: str = Field(description="Punchy closing line")


# --- Agent 1.1: Creative Critique ---
class CreativeCritique(BaseModel):
    alignment_score: int = Field(description="1-10 score of how well the brief matches user intent")
    critique_points: List[str] = Field(description="Specific issues or misalignments to fix")
    revision_instructions: str = Field(description="Clear, actionable instructions for the Creative Director to revise")


# --- Agent 2: Brand Stylist ---
class VisualIdentity(BaseModel):
    color_palette: List[str] = Field(description="Specific color codes/names")
    textures_materials: str = Field(description="Dominant materials (e.g., 'raw linen, fog')")
    composition_style: str = Field(description="Visual balance description")


# --- Agent 3: Product Stylist ---
class ProductSpecs(BaseModel):
    material_behavior: str = Field(description="How it moves/hangs")
    surface_detail: str = Field(description="Micro-texture, finish, highlight behavior")
    styling_integration: str = Field(description="How it is worn/placed")
    visual_product_description: str = Field(description="Cohesive paragraph combining the above for image prompts")


# --- Agent 4: Casting & Scout ---
class CastMember(BaseModel):
    name: str = Field(description="Short identifier, e.g. 'Hero Model', 'Bengal Cat', 'Crystal Sphere'")
    driver_type: str = Field(description="Category: human, animal, plant, object, shape, vehicle, etc.")
    visual_prompt: str = Field(description="Full visual description prompt for this individual driver")


class CastingBrief(BaseModel):
    cast_members: List[CastMember] = Field(description="Individual key drivers, each with its own prompt")
    setting_a_description: str = Field(description="Primary environment description")
    setting_b_description: str = Field(description="Secondary environment description")


# --- Agent 5: Cinematographer ---
class CameraSpecs(BaseModel):
    lighting: str = Field(description="Lighting setup description")
    camera_gear: str = Field(description="Camera, lens, film stock")
    color_temperature: str = Field(description="Color temp description")
    contrast_tone: str = Field(description="Contrast and tone description")
    technical_prompt_block: str = Field(description="Combined string of all tech specs for prompts")


# --- Agent 6: Director (The Shot List) ---
class Scene(BaseModel):
    scene_number: int
    type: str = Field(description="Scene type / narrative role (e.g., Intro, Reveal, Interaction, Hook, Closing)")
    shot_type: str
    visual_type: str = Field(default="Standard", description="Visual / art style for this scene (e.g., Standard, Model Shot, Product Shot, B-Roll, Glitch Art, Liquid Chrome, Surrealist Minimalism, Kinetic Typography, Mixed Media Collage, Digital Brutalism, Acid Graphics)")
    visual_description: str = Field(description="Visual description of the scene")
    action_movement: str = Field(description="Specific movement instructions")
    start_image_prompt: str = Field(description="Full text-to-image prompt for START frame")
    end_image_prompt: str = Field(description="Full text-to-image prompt for END frame")
    start_video_prompt: str = Field(default="", description="Simple director-style video prompt for animating from the START frame (e.g. 'Slow dolly in, model turns head left')")
    end_video_prompt: str = Field(default="", description="Simple director-style video prompt for animating from the END frame (e.g. 'Camera pulls back revealing full scene')")
    combined_video_prompt: str = Field(default="", description="Simple director-style video prompt for a combined start-to-end transition video (e.g. 'Tracking shot, model walks forward as camera pans right')")
    active_cast: List[str] = Field(default_factory=list, description="Names of cast members active in this scene (must match CastMember.name exactly)")
    active_setting: Optional[str] = Field(default=None, description="Which setting this scene uses: 'setting_a' or 'setting_b'")
    audio_mode: str = Field(default="silent", description="Audio generation mode for this scene: 'silent' (no sync audio), 'talking-head' (image + audio → lip-sync video), 'audio-native' (prompt → video with audio)")
    dialogue: Optional[str] = Field(default=None, description="Spoken dialogue / script line for this scene (used by talking-head and audio-native modes)")
    dialogue_speaker: Optional[str] = Field(default=None, description="Which cast member speaks this line (must match a CastMember.name)")
    scene_voice_prompt: Optional[str] = Field(default=None, description="TTS voice style description for talking-head mode (e.g., 'warm female voice, conversational pace, slight smile')")
    voice_id: Optional[str] = Field(default=None, description="ElevenLabs voice ID for TTS generation in talking-head mode")


class ShotList(BaseModel):
    scenes: List[Scene]


# --- Agent 7: Sound ---
class SceneDialogue(BaseModel):
    scene_number: int = Field(description="Which scene this dialogue belongs to")
    dialogue: str = Field(description="The spoken line for this scene")
    speaker: str = Field(description="Which cast member or narrator speaks this line")
    tone: str = Field(default="neutral", description="Delivery tone: casual, poetic, urgent, warm, confident, etc.")


class AudioSpecs(BaseModel):
    voiceover_script: str = Field(description="Global VO script for the whole video (used for silent scenes that get audio in post)")
    music_prompt_technical: str = Field(description="Technical prompt for Suno/Udio")
    audio_atmosphere_description: str = Field(description="Brief description of the audio vibe")
    scene_dialogues: List[SceneDialogue] = Field(default_factory=list, description="Per-scene dialogue lines for talking-head and audio-native scenes")


# --- Agent 8: Prompt Writer (on-demand, per-scene) ---
class ScenePrompts(BaseModel):
    start_image_prompt: str = Field(description="Full text-to-image prompt for the START frame")
    end_image_prompt: str = Field(description="Full text-to-image prompt for the END frame")


# --- Agent 10: Video Prompt Writer (on-demand, per-scene) ---
class VideoPrompts(BaseModel):
    start_video_prompt: str = Field(description="Director-style video prompt for animating the START frame")
    end_video_prompt: str = Field(description="Director-style video prompt for animating the END frame")
    combined_video_prompt: str = Field(description="Director-style video prompt for the full start-to-end transition")


# --- Agent 9: Scene Audio Enhancer (on-demand, per-scene) ---
class SceneAudioEnhancement(BaseModel):
    dialogue: str = Field(description="The spoken dialogue line for this scene")
    dialogue_speaker: str = Field(description="Who speaks: cast member name or 'narrator'")
    scene_voice_prompt: str = Field(description="TTS voice style description (tone, pace, emotion, voice character)")
    combined_video_prompt: str = Field(description="Updated combined video prompt — for audio-native, includes dialogue baked in; for talking-head, unchanged")
    start_video_prompt: str = Field(description="Updated start video prompt")
    end_video_prompt: str = Field(description="Updated end video prompt")
