export type AssetType = "character" | "environment" | "product" | "camera" | "voiceover" | "music" | "image" | "video";

export type FrameStatus = "idle" | "generating" | "done" | "error";
export type VideoStatus = "idle" | "generating" | "done" | "error";
export type VideoMode = "combined" | "separate";
export type AudioMode = "silent" | "talking-head" | "audio-native";

export interface KeyItem {
  id: string;
  type: AssetType;
  label: string;
  driver_type?: string;
  text_prompt: string;
  image_url?: string;
  image_history?: string[];
  reference_image?: string;
  image_model?: string;
  image_quality?: string;
  image_error?: string;
  audio_urls?: string[];
  audio_history?: string[];
  audio_status?: FrameStatus;
  audio_error?: string;
  voice_name?: string;
  voice_stability?: number;
  voice_similarity?: number;
  voice_style?: number;
  voice_speed?: number;
  voice_language?: string;
  // Music-specific settings (for type === "music")
  music_custom_mode?: boolean;
  music_instrumental?: boolean;
  music_model?: string;
  music_style?: string;
  music_title?: string;
  music_vocal_gender?: string;
  music_style_weight?: number;
  music_weirdness?: number;
  music_audio_weight?: number;
  // Video-specific (for type === "video")
  video_url?: string;
  video_status?: FrameStatus;
  video_error?: string;
}

export interface Scene {
  id: string;
  scene_number: number;
  type: string;
  shot_type: string;
  visual_type?: string;
  visual_description: string;
  action_movement: string;
  start_image_prompt: string;
  end_image_prompt: string;
  start_frame_status: FrameStatus;
  start_frame_image?: string;
  start_frame_history?: string[];
  start_frame_model?: string;
  start_frame_quality?: string;
  start_frame_error?: string;
  end_frame_status: FrameStatus;
  end_frame_image?: string;
  end_frame_history?: string[];
  end_frame_model?: string;
  end_frame_quality?: string;
  end_frame_error?: string;
  start_video_prompt?: string;
  end_video_prompt?: string;
  combined_video_prompt?: string;
  active_cast?: string[];
  active_setting?: string;
  // Per-scene audio
  audio_mode?: AudioMode;
  start_audio_mode?: AudioMode;  // separate video mode only
  end_audio_mode?: AudioMode;    // separate video mode only
  dialogue?: string;
  dialogue_speaker?: string;
  scene_voice_prompt?: string;
  voice_id?: string;
  voice_stability?: number;
  voice_similarity?: number;
  voice_style?: number;
  voice_speed?: number;
  voice_language?: string;
  scene_audio_url?: string;
  scene_audio_status?: FrameStatus;
  scene_audio_history?: string[];
  // End-slot audio (separate video mode)
  end_dialogue?: string;
  end_dialogue_speaker?: string;
  end_scene_voice_prompt?: string;
  end_voice_id?: string;
  end_voice_stability?: number;
  end_voice_similarity?: number;
  end_voice_style?: number;
  end_voice_speed?: number;
  end_voice_language?: string;
  end_scene_audio_url?: string;
  end_scene_audio_status?: FrameStatus;
  end_scene_audio_history?: string[];
  // Video generation
  video_mode?: VideoMode;
  // Combined video (start → end)
  video_status?: VideoStatus;
  video_url?: string;
  video_model?: string;
  video_error?: string;
  video_duration?: number;       // seconds
  // Separate videos (per frame)
  start_video_status?: VideoStatus;
  start_video_url?: string;
  start_video_model?: string;
  start_video_error?: string;
  start_video_duration?: number;
  end_video_status?: VideoStatus;
  end_video_url?: string;
  end_video_model?: string;
  end_video_error?: string;
  end_video_duration?: number;
}

export type AgentStatus = "idle" | "running" | "done" | "error";

export interface AgentInfo {
  id: string;
  name: string;
  label: string;
  color: string;
  status: AgentStatus;
}

export interface WorkflowState {
  workflowId: string | null;
  isRunning: boolean;
  agents: AgentInfo[];
  keyItems: KeyItem[];
  scenes: Scene[];
  error: string | null;
}

// Backend response types
export interface CreativeBrief {
  campaign_title: string;
  concept_summary: string;
  mood_keywords: string[];
  tagline: string;
}

export interface VisualIdentity {
  color_palette: string[];
  textures_materials: string;
  composition_style: string;
}

export interface ProductSpecs {
  material_behavior: string;
  surface_detail: string;
  styling_integration: string;
  visual_product_description: string;
}

export interface CastMember {
  name: string;
  driver_type: string;
  visual_prompt: string;
}

export interface CastingBrief {
  cast_members: CastMember[];
  setting_a_description: string;
  setting_b_description: string;
}

export interface CameraSpecs {
  lighting: string;
  camera_gear: string;
  color_temperature: string;
  contrast_tone: string;
  technical_prompt_block: string;
}

export interface ShotListScene {
  scene_number: number;
  type: string;
  shot_type: string;
  visual_description: string;
  action_movement: string;
  start_image_prompt: string;
  end_image_prompt: string;
  start_video_prompt?: string;
  end_video_prompt?: string;
  combined_video_prompt?: string;
  audio_mode?: AudioMode;
  dialogue?: string;
  dialogue_speaker?: string;
  scene_voice_prompt?: string;
}

export interface ShotList {
  scenes: ShotListScene[];
}

export interface SceneDialogue {
  scene_number: number;
  dialogue: string;
  speaker: string;
  tone: string;
}

export interface AudioSpecs {
  voiceover_script: string;
  music_prompt_technical: string;
  audio_atmosphere_description: string;
  scene_dialogues?: SceneDialogue[];
}

export interface WorkflowResult {
  creative_brief?: CreativeBrief;
  visual_identity?: VisualIdentity;
  product_specs?: ProductSpecs;
  casting_brief?: CastingBrief;
  camera_specs?: CameraSpecs;
  shot_list?: ShotList;
  audio_specs?: AudioSpecs;
}
