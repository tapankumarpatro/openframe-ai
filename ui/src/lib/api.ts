const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startWorkflow(
  userInput: string,
  adType?: string,
  productImage?: string,
  agentModels?: Record<string, { model: string; temperature: number }>,
): Promise<{ workflow_id: string; status: string }> {
  const body: Record<string, unknown> = { user_input: userInput };
  if (adType) body.ad_type = adType;
  if (productImage) body.product_image = productImage;
  if (agentModels) body.agent_models = agentModels;
  const res = await fetch(`${API_URL}/api/workflow/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to start workflow: ${res.statusText}`);
  return res.json();
}

export async function resumeWorkflow(
  workflowId: string,
  userInput: string,
  existingOutputs: Record<string, unknown>,
  adType?: string,
  productImage?: string,
  agentModels?: Record<string, { model: string; temperature: number }>,
): Promise<{ workflow_id: string; status: string }> {
  const body: Record<string, unknown> = {
    workflow_id: workflowId,
    user_input: userInput,
    existing_outputs: existingOutputs,
  };
  if (adType) body.ad_type = adType;
  if (productImage) body.product_image = productImage;
  if (agentModels) body.agent_models = agentModels;
  const res = await fetch(`${API_URL}/api/workflow/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to resume workflow: ${res.statusText}`);
  return res.json();
}

export interface SSEEvent {
  agent: string;
  status: string;
  data?: Record<string, unknown>;
  error?: string;
}

export function subscribeToWorkflow(
  workflowId: string,
  onEvent: (event: SSEEvent) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {
  const eventSource = new EventSource(`${API_URL}/api/workflow/${workflowId}/stream`);

  eventSource.addEventListener("agent_update", (e) => {
    try {
      const data: SSEEvent = JSON.parse(e.data);
      if (data.agent === "__done__") {
        onDone();
        eventSource.close();
        return;
      }
      if (data.agent === "__workflow__" && data.status === "error") {
        onError(data.error || "Unknown error");
        eventSource.close();
        return;
      }
      onEvent(data);
    } catch {
      // ignore parse errors
    }
  });

  eventSource.onerror = () => {
    onError("Connection lost");
    eventSource.close();
  };

  return () => eventSource.close();
}

export async function getWorkflowResult(workflowId: string) {
  const res = await fetch(`${API_URL}/api/workflow/${workflowId}/result`);
  if (!res.ok) throw new Error(`Failed to get result: ${res.statusText}`);
  return res.json();
}

export interface ProjectSummary {
  workflow_id: string;
  user_input: string;
  status: string;
  created_at: string;
  campaign_title: string;
  tagline: string;
  scene_count: number;
  cast_count: number;
}

export interface SavedProject {
  workflow_id: string;
  user_input: string;
  status: string;
  created_at: string;
  result: Record<string, unknown>;
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_URL}/api/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
  return res.json();
}

export async function fetchProject(workflowId: string): Promise<SavedProject> {
  const res = await fetch(`${API_URL}/api/projects/${workflowId}`);
  if (!res.ok) throw new Error(`Failed to fetch project: ${res.statusText}`);
  return res.json();
}

export async function saveProject(workflowId: string, userInput: string, result: Record<string, unknown>, status = "manual"): Promise<void> {
  const res = await fetch(`${API_URL}/api/projects/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow_id: workflowId, user_input: userInput, result, status }),
  });
  if (!res.ok) throw new Error(`Failed to save project: ${res.statusText}`);
}

export async function deleteProject(workflowId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/projects/${workflowId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete project: ${res.statusText}`);
}

export async function importWorkflow(workflowJson: Record<string, unknown>, title?: string): Promise<{ workflow_id: string }> {
  const body: Record<string, unknown> = { workflow_json: workflowJson };
  if (title) body.title = title;
  const res = await fetch(`${API_URL}/api/projects/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Import failed: ${res.statusText}`);
  return res.json();
}

export async function renameProject(workflowId: string, title: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/projects/${workflowId}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to rename project: ${res.statusText}`);
}

export interface EnhancePromptsRequest {
  scene_info: Record<string, unknown>;
  connected_assets: Record<string, unknown>[];
  concept: string;
  technical_specs: string;
  lighting: string;
  existing_start_prompt: string;
  existing_end_prompt: string;
  user_instructions: string;
}

export interface EnhancePromptsResponse {
  start_image_prompt: string;
  end_image_prompt: string;
}

// ---------- Image Upload (base64 → HTTP URL) ----------
export async function uploadImage(base64Data: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/upload/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: base64Data }),
  });
  if (!res.ok) throw new Error("Image upload failed");
  const data: { url: string; filename: string } = await res.json();
  // URL is either a public catbox.moe URL or a local fallback path
  const url = data.url.startsWith("http") ? data.url : `${API_URL}${data.url}`;
  return url;
}

// ---------- Image Generation ----------
export interface ImageGenerateRequest {
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  quality?: string;
  image_urls?: string[];
}

export interface ImageGenerateResponse {
  task_id: string;
  provider: string;
}

export interface ImageTaskStatus {
  task_id: string;
  state: string; // "waiting" | "success" | "fail"
  result_urls?: string[];
  error_message?: string;
  cost_time?: number;
}

export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  supports_image_input: boolean;
  aspect_ratios: string[];
  qualities: string[];
}

export async function generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse> {
  const res = await fetch(`${API_URL}/api/image/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Image generation failed: ${detail}`);
  }
  return res.json();
}

export async function getImageTaskStatus(taskId: string, provider: string = "seedream"): Promise<ImageTaskStatus> {
  const res = await fetch(`${API_URL}/api/image/status/${taskId}?provider=${provider}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Status check failed: ${detail}`);
  }
  return res.json();
}

export async function listImageModels(): Promise<ImageModel[]> {
  const res = await fetch(`${API_URL}/api/image/models`);
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

// ── Video Generation ──────────────────────────────────────
export interface VideoGenerateRequest {
  model: string;
  prompt: string;
  image_urls?: string[];
  audio_url?: string;
  aspect_ratio?: string;
  duration?: string;
  resolution?: string;
  negative_prompt?: string;
  cfg_scale?: number;
  generate_audio?: boolean;
  fixed_lens?: boolean;
  sound?: boolean;
  prompt_optimizer?: boolean;
}

export interface VideoGenerateResponse {
  task_id: string;
  model: string;
}

export interface VideoTaskStatus {
  task_id: string;
  state: string; // "waiting" | "success" | "fail"
  result_urls?: string[];
  error_message?: string;
  cost_time?: number;
}

export async function generateVideo(req: VideoGenerateRequest): Promise<VideoGenerateResponse> {
  const res = await fetch(`${API_URL}/api/video/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Video generation failed: ${detail}`);
  }
  return res.json();
}

export async function getVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
  const res = await fetch(`${API_URL}/api/video/status/${taskId}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Video status check failed: ${detail}`);
  }
  return res.json();
}

// ── API Logs ──────────────────────────────────────────────
export interface ApiLogEntry {
  id: string;
  timestamp: number;
  call_type: string;
  model: string;
  provider: string;
  task_id?: string;
  status: string;
  input_summary: string;
  output_summary: string;
  error_message?: string;
  estimated_credits: number;
  duration_ms?: number;
}

export interface ApiLogStats {
  total_calls: number;
  total_estimated_credits: number;
  by_type: Record<string, { count: number; credits: number; errors: number }>;
}

export interface ApiLogsResponse {
  logs: ApiLogEntry[];
  stats: ApiLogStats;
}

export async function fetchApiLogs(limit = 100, callType?: string): Promise<ApiLogsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (callType) params.set("call_type", callType);
  const res = await fetch(`${API_URL}/api/logs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

// ── Settings / API Keys ───────────────────────────────────
export interface ProviderKeysStatus {
  agent_provider: string;
  agent_key_set: boolean;
  media_provider: string;
  media_key_set: boolean;
  imgbb_key_set: boolean;
  agent_key_preview?: string;
  media_key_preview?: string;
  imgbb_key_preview?: string;
}

export interface SaveKeysPayload {
  agent_provider: string;
  agent_api_key?: string;
  media_provider: string;
  media_api_key?: string;
  imgbb_api_key?: string;
}

export async function fetchKeysStatus(): Promise<ProviderKeysStatus> {
  const res = await fetch(`${API_URL}/api/settings/keys`);
  if (!res.ok) throw new Error("Failed to fetch key status");
  return res.json();
}

export async function saveApiKeys(payload: SaveKeysPayload): Promise<ProviderKeysStatus> {
  const res = await fetch(`${API_URL}/api/settings/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save keys");
  return res.json();
}

// ── Single Agent Run ──────────────────────────────────────
export interface RunSingleAgentRequest {
  agent_name: string;
  user_input: string;
  ad_type?: string;
  product_image?: string;
  existing_outputs: Record<string, Record<string, unknown>>;
  canvas_assets: { type: string; label: string; text_prompt?: string; driver_type?: string }[];
  canvas_scenes: Record<string, unknown>[];
}

export interface RunSingleAgentResponse {
  agent_name: string;
  output_key: string;
  output_data: Record<string, unknown>;
}

export async function runSingleAgent(req: RunSingleAgentRequest): Promise<RunSingleAgentResponse> {
  const res = await fetch(`${API_URL}/api/workflow/run-single-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Single agent run failed: ${detail}`);
  }
  return res.json();
}

// ── Prompt Enhancement ────────────────────────────────────
export async function enhancePrompts(req: EnhancePromptsRequest): Promise<EnhancePromptsResponse> {
  const res = await fetch(`${API_URL}/api/workflow/enhance-prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Prompt enhancement failed: ${detail}`);
  }
  return res.json();
}

// ── Video Prompt Enhancement ────────────────────────────────
export interface EnhanceVideoPromptsRequest {
  scene_info: Record<string, unknown>;
  connected_assets: Record<string, unknown>[];
  concept: string;
  technical_specs: string;
  lighting: string;
  start_image_prompt: string;
  end_image_prompt: string;
  existing_start_video_prompt: string;
  existing_end_video_prompt: string;
  existing_combined_video_prompt: string;
  audio_mode: string;
  dialogue: string;
  dialogue_speaker: string;
  user_instructions: string;
}

export interface EnhanceVideoPromptsResponse {
  start_video_prompt: string;
  end_video_prompt: string;
  combined_video_prompt: string;
}

export async function enhanceVideoPrompts(req: EnhanceVideoPromptsRequest): Promise<EnhanceVideoPromptsResponse> {
  const res = await fetch(`${API_URL}/api/workflow/enhance-video-prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Video prompt enhancement failed: ${detail}`);
  }
  return res.json();
}

export interface EnhanceAssetPromptRequest {
  asset_type: string;
  asset_label: string;
  existing_prompt: string;
  concept: string;
  user_instructions: string;
}

export async function enhanceAssetPrompt(req: EnhanceAssetPromptRequest): Promise<{ enhanced_prompt: string }> {
  const res = await fetch(`${API_URL}/api/workflow/enhance-asset-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Asset prompt enhancement failed: ${detail}`);
  }
  return res.json();
}

// ── Scene Audio Enhancement ────────────────────────────────
export interface EnhanceSceneAudioRequest {
  scene_info: Record<string, unknown>;
  connected_assets: Record<string, unknown>[];
  concept: string;
  audio_mode: string;
  existing_start_video_prompt: string;
  existing_end_video_prompt: string;
  existing_combined_video_prompt: string;
  existing_dialogue: string;
  user_instructions?: string;
}

export interface EnhanceSceneAudioResponse {
  dialogue: string;
  dialogue_speaker: string;
  scene_voice_prompt: string;
  combined_video_prompt: string;
  start_video_prompt: string;
  end_video_prompt: string;
}

export async function enhanceSceneAudio(req: EnhanceSceneAudioRequest): Promise<EnhanceSceneAudioResponse> {
  const res = await fetch(`${API_URL}/api/workflow/enhance-scene-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Scene audio enhancement failed: ${detail}`);
  }
  return res.json();
}

// ── Audio Generation (kie.ai) ─────────────────────────────

export interface AudioGenerateResponse {
  task_id: string;
  model: string;
}

export interface AudioTaskStatus {
  task_id: string;
  state: string;
  result_urls?: string[];
  error_message?: string;
  cost_time?: number;
}

export async function generateTalkingHead(imageUrl: string, audioUrl: string): Promise<AudioGenerateResponse> {
  const res = await fetch(`${API_URL}/api/audio/talking-head`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, audio_url: audioUrl }),
  });
  if (!res.ok) throw new Error(`Talking head generation failed: ${res.statusText}`);
  return res.json();
}

export async function generateVoiceover(
  text: string,
  voice = "Sarah",
  stability = 0.5,
  similarityBoost = 0.75,
  style = 0,
  speed = 1,
  languageCode = "",
): Promise<AudioGenerateResponse> {
  const res = await fetch(`${API_URL}/api/audio/voiceover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice,
      stability,
      similarity_boost: similarityBoost,
      style,
      speed,
      language_code: languageCode,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Voiceover generation failed: ${detail}`);
  }
  return res.json();
}

export async function generateMusic(
  prompt: string,
  customMode = false,
  instrumental = false,
  model = "V5",
  style = "",
  title = "",
  vocalGender = "",
  styleWeight?: number,
  weirdnessConstraint?: number,
  audioWeight?: number,
): Promise<AudioGenerateResponse> {
  const res = await fetch(`${API_URL}/api/audio/music`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      custom_mode: customMode,
      instrumental,
      model,
      style,
      title,
      vocal_gender: vocalGender,
      style_weight: styleWeight,
      weirdness_constraint: weirdnessConstraint,
      audio_weight: audioWeight,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Music generation failed: ${detail}`);
  }
  return res.json();
}

export async function getAudioTaskStatus(taskId: string): Promise<AudioTaskStatus> {
  const res = await fetch(`${API_URL}/api/audio/status/${taskId}`);
  if (!res.ok) throw new Error(`Audio status check failed: ${res.statusText}`);
  return res.json();
}

export async function getMusicTaskStatus(taskId: string): Promise<AudioTaskStatus> {
  const res = await fetch(`${API_URL}/api/audio/music/status/${taskId}`);
  if (!res.ok) throw new Error(`Music status check failed: ${res.statusText}`);
  return res.json();
}

// ── SRT Subtitle Generation (Whisper) ─────────────────────

export async function generateSrt(audioUrl: string, language = "en"): Promise<{ srt_text: string }> {
  const res = await fetch(`${API_URL}/api/srt/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_url: audioUrl, language }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`SRT generation failed: ${detail}`);
  }
  return res.json();
}


// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function authSignup(email: string, password: string, name?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: name || "" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Signup failed");
  }
  return res.json();
}

export async function authSignin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Invalid email or password");
  }
  return res.json();
}

export async function authResetPassword(email: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, new_password: newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Password reset failed");
  }
  return res.json();
}

export async function authGetMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/api/auth/me?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

// ── License ──────────────────────────────────────────────────
export interface LicenseStatus {
  instance_id: string;
  plan: string;
  valid: boolean;
  enforce: boolean;
  message: string;
}

export interface GeneratedKey {
  key: string;
  plan: string;
  email: string;
  company: string;
  message: string;
}

export async function fetchLicenseStatus(licenseKey?: string): Promise<LicenseStatus> {
  const url = new URL(`${API_URL}/api/license/status`);
  if (licenseKey) url.searchParams.set("license_key", licenseKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch license status");
  return res.json();
}

export async function saveLicenseKey(licenseKey: string): Promise<LicenseStatus> {
  const res = await fetch(`${API_URL}/api/license/save-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ license_key: licenseKey }),
  });
  if (!res.ok) throw new Error("Failed to save license key");
  return res.json();
}

export async function generateLicenseKey(email: string, company: string, plan: string = "pro"): Promise<GeneratedKey> {
  const res = await fetch(`${API_URL}/api/license/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, company, plan }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Key generation failed" }));
    throw new Error(body.detail || "Key generation failed");
  }
  return res.json();
}
