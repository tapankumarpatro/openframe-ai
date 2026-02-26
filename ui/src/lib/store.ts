import { create } from "zustand";
import type {
  AgentInfo,
  KeyItem,
  Scene,
  AgentStatus,
  AssetType,
  FrameStatus,
} from "@/types/schema";
import { startWorkflow, resumeWorkflow, subscribeToWorkflow, fetchProject, saveProject, enhancePrompts, enhanceVideoPrompts, enhanceAssetPrompt, enhanceSceneAudio, runSingleAgent, generateImage, getImageTaskStatus, uploadImage, generateVideo as apiGenerateVideo, getVideoTaskStatus, generateVoiceover, generateMusic, getAudioTaskStatus, getMusicTaskStatus, fetchLicenseStatus as apiFetchLicenseStatus, type SSEEvent, type LicenseStatus } from "./api";

export type AppView = "projects" | "canvas" | "create";

// ── OpenRouter Model Registry ──────────────────────────────
export interface LLMModel {
  id: string;
  label: string;
  provider: string;
  defaultTemp: number;
  inputCost: number;   // $ per 1M input tokens
  outputCost: number;  // $ per 1M output tokens
  tier: "free" | "low" | "mid" | "premium";
}

// Provider display order
export const PROVIDER_ORDER = [
  "Google", "Anthropic", "OpenAI", "Meta", "DeepSeek", "Mistral", "Qwen",
] as const;

export const LLM_MODELS: LLMModel[] = [
  // ── Google (12) ────────────────────────────────
  { id: "google/gemini-2.0-flash-exp:free",       label: "Gemini 2.0 Flash Exp (Free)", provider: "Google", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B (Free)",          provider: "Google", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "google/gemma-3-4b-it:free",              label: "Gemma 3 4B (Free)",           provider: "Google", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "google/gemini-2.0-flash",                label: "Gemini 2.0 Flash",            provider: "Google", defaultTemp: 0.7, inputCost: 0.10,  outputCost: 0.40,  tier: "low" },
  { id: "google/gemini-2.0-flash-lite",            label: "Gemini 2.0 Flash Lite",       provider: "Google", defaultTemp: 0.7, inputCost: 0.075, outputCost: 0.30,  tier: "low" },
  { id: "google/gemini-2.5-flash",                  label: "Gemini 2.5 Flash",            provider: "Google", defaultTemp: 0.7, inputCost: 0.15,  outputCost: 0.60,  tier: "low" },
  { id: "google/gemini-2.5-pro-preview",           label: "Gemini 2.5 Pro",              provider: "Google", defaultTemp: 0.7, inputCost: 1.25,  outputCost: 10.00, tier: "mid" },
  { id: "google/gemini-1.5-flash",                label: "Gemini 1.5 Flash",            provider: "Google", defaultTemp: 0.7, inputCost: 0.075, outputCost: 0.30,  tier: "low" },
  { id: "google/gemini-1.5-pro",                  label: "Gemini 1.5 Pro",              provider: "Google", defaultTemp: 0.7, inputCost: 1.25,  outputCost: 5.00,  tier: "mid" },
  { id: "google/gemini-3-flash",                   label: "Gemini 3 Flash",              provider: "Google", defaultTemp: 0.7, inputCost: 0.20,  outputCost: 0.80,  tier: "low" },
  { id: "google/gemini-3-flash-lite",              label: "Gemini 3 Flash Lite",         provider: "Google", defaultTemp: 0.7, inputCost: 0.05,  outputCost: 0.20,  tier: "low" },
  { id: "google/gemini-3-pro",                     label: "Gemini 3 Pro",                provider: "Google", defaultTemp: 0.7, inputCost: 2.50,  outputCost: 15.00, tier: "premium" },

  // ── Anthropic (9) ──────────────────────────────
  { id: "anthropic/claude-3-haiku",                label: "Claude 3 Haiku",              provider: "Anthropic", defaultTemp: 0.7, inputCost: 0.25,  outputCost: 1.25,  tier: "low" },
  { id: "anthropic/claude-3.5-haiku",              label: "Claude 3.5 Haiku",            provider: "Anthropic", defaultTemp: 0.7, inputCost: 0.80,  outputCost: 4.00,  tier: "low" },
  { id: "anthropic/claude-4.5-haiku",              label: "Claude 4.5 Haiku",            provider: "Anthropic", defaultTemp: 0.7, inputCost: 1.00,  outputCost: 5.00,  tier: "mid" },
  { id: "anthropic/claude-3.5-sonnet",             label: "Claude 3.5 Sonnet",           provider: "Anthropic", defaultTemp: 0.7, inputCost: 3.00,  outputCost: 15.00, tier: "mid" },
  { id: "anthropic/claude-sonnet-4",               label: "Claude Sonnet 4",             provider: "Anthropic", defaultTemp: 0.7, inputCost: 3.00,  outputCost: 15.00, tier: "mid" },
  { id: "anthropic/claude-4.5-sonnet",             label: "Claude 4.5 Sonnet",           provider: "Anthropic", defaultTemp: 0.7, inputCost: 4.00,  outputCost: 20.00, tier: "premium" },
  { id: "anthropic/claude-3-opus",                 label: "Claude 3 Opus",               provider: "Anthropic", defaultTemp: 0.7, inputCost: 15.00, outputCost: 75.00, tier: "premium" },
  { id: "anthropic/claude-opus-4",                 label: "Claude Opus 4",               provider: "Anthropic", defaultTemp: 0.7, inputCost: 15.00, outputCost: 75.00, tier: "premium" },
  { id: "anthropic/claude-4.5-opus",               label: "Claude 4.5 Opus",             provider: "Anthropic", defaultTemp: 0.7, inputCost: 18.00, outputCost: 90.00, tier: "premium" },

  // ── OpenAI (12) ────────────────────────────────
  { id: "openai/gpt-4.1-nano",                    label: "GPT-4.1 Nano",                provider: "OpenAI", defaultTemp: 0.7, inputCost: 0.10,  outputCost: 0.40,  tier: "low" },
  { id: "openai/gpt-4o-mini",                     label: "GPT-4o Mini",                 provider: "OpenAI", defaultTemp: 0.7, inputCost: 0.15,  outputCost: 0.60,  tier: "low" },
  { id: "openai/gpt-4.1-mini",                    label: "GPT-4.1 Mini",                provider: "OpenAI", defaultTemp: 0.7, inputCost: 0.40,  outputCost: 1.60,  tier: "low" },
  { id: "openai/o4-mini",                         label: "o4-mini",                     provider: "OpenAI", defaultTemp: 0.7, inputCost: 1.10,  outputCost: 4.40,  tier: "mid" },
  { id: "openai/gpt-4.1",                         label: "GPT-4.1",                     provider: "OpenAI", defaultTemp: 0.7, inputCost: 2.00,  outputCost: 8.00,  tier: "mid" },
  { id: "openai/gpt-4o",                          label: "GPT-4o",                      provider: "OpenAI", defaultTemp: 0.7, inputCost: 2.50,  outputCost: 10.00, tier: "mid" },
  { id: "openai/o1-mini",                         label: "o1-mini",                     provider: "OpenAI", defaultTemp: 0.7, inputCost: 3.00,  outputCost: 12.00, tier: "mid" },
  { id: "openai/o1",                              label: "o1",                          provider: "OpenAI", defaultTemp: 0.7, inputCost: 15.00, outputCost: 60.00, tier: "premium" },
  { id: "openai/o3-mini",                         label: "o3-mini",                     provider: "OpenAI", defaultTemp: 0.7, inputCost: 1.10,  outputCost: 4.40,  tier: "mid" },
  { id: "openai/o3",                              label: "o3",                          provider: "OpenAI", defaultTemp: 0.7, inputCost: 10.00, outputCost: 40.00, tier: "premium" },
  { id: "openai/o3-pro",                          label: "o3-pro",                      provider: "OpenAI", defaultTemp: 0.7, inputCost: 20.00, outputCost: 80.00, tier: "premium" },
  { id: "openai/gpt-4-turbo",                     label: "GPT-4 Turbo",                 provider: "OpenAI", defaultTemp: 0.7, inputCost: 10.00, outputCost: 30.00, tier: "premium" },

  // ── Meta (7) ───────────────────────────────────
  { id: "meta-llama/llama-3.1-8b-instruct:free",  label: "Llama 3.1 8B (Free)",         provider: "Meta", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)",        provider: "Meta", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "meta-llama/llama-3.1-70b-instruct",      label: "Llama 3.1 70B",               provider: "Meta", defaultTemp: 0.7, inputCost: 0.12,  outputCost: 0.30,  tier: "low" },
  { id: "meta-llama/llama-4-scout",               label: "Llama 4 Scout",               provider: "Meta", defaultTemp: 0.7, inputCost: 0.15,  outputCost: 0.40,  tier: "low" },
  { id: "meta-llama/llama-4-maverick",             label: "Llama 4 Maverick",            provider: "Meta", defaultTemp: 0.7, inputCost: 0.50,  outputCost: 0.77,  tier: "low" },
  { id: "meta-llama/llama-3.1-405b-instruct",     label: "Llama 3.1 405B",              provider: "Meta", defaultTemp: 0.7, inputCost: 0.80,  outputCost: 0.80,  tier: "mid" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B", provider: "Meta", defaultTemp: 0.7, inputCost: 0.30,  outputCost: 0.50,  tier: "low" },

  // ── DeepSeek (5) ───────────────────────────────
  { id: "deepseek/deepseek-chat-v3-0324:free",    label: "DeepSeek V3 (Free)",          provider: "DeepSeek", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "deepseek/deepseek-r1:free",              label: "DeepSeek R1 (Free)",          provider: "DeepSeek", defaultTemp: 0.6, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "deepseek/deepseek-chat-v3-0324",         label: "DeepSeek V3",                 provider: "DeepSeek", defaultTemp: 0.7, inputCost: 0.14,  outputCost: 0.28,  tier: "low" },
  { id: "deepseek/deepseek-r1",                   label: "DeepSeek R1",                 provider: "DeepSeek", defaultTemp: 0.6, inputCost: 0.55,  outputCost: 2.19,  tier: "low" },
  { id: "deepseek/deepseek-r1-0528",              label: "DeepSeek R1 0528",            provider: "DeepSeek", defaultTemp: 0.6, inputCost: 0.55,  outputCost: 2.19,  tier: "low" },

  // ── Mistral (7) ────────────────────────────────
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1 (Free)", provider: "Mistral", defaultTemp: 0.7, inputCost: 0,    outputCost: 0,    tier: "free" },
  { id: "mistralai/mistral-nemo:free",                    label: "Mistral Nemo (Free)",      provider: "Mistral", defaultTemp: 0.7, inputCost: 0,    outputCost: 0,    tier: "free" },
  { id: "mistralai/mistral-small-3.1-24b-instruct",      label: "Mistral Small 3.1",        provider: "Mistral", defaultTemp: 0.7, inputCost: 0.10, outputCost: 0.30, tier: "low" },
  { id: "mistralai/mistral-medium-3",                     label: "Mistral Medium 3",         provider: "Mistral", defaultTemp: 0.7, inputCost: 0.40, outputCost: 2.00, tier: "low" },
  { id: "mistralai/codestral-2501",                       label: "Codestral",                provider: "Mistral", defaultTemp: 0.7, inputCost: 0.30, outputCost: 0.90, tier: "low" },
  { id: "mistralai/mistral-large-2",                      label: "Mistral Large 2",          provider: "Mistral", defaultTemp: 0.7, inputCost: 2.00, outputCost: 6.00, tier: "mid" },
  { id: "mistralai/pixtral-large-2411",                   label: "Pixtral Large",            provider: "Mistral", defaultTemp: 0.7, inputCost: 2.00, outputCost: 6.00, tier: "mid" },

  // ── Qwen (6) ──────────────────────────────────
  { id: "qwen/qwen-2.5-72b-instruct:free",        label: "Qwen 2.5 72B (Free)",         provider: "Qwen", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "qwen/qwq-32b:free",                      label: "QwQ 32B (Free)",              provider: "Qwen", defaultTemp: 0.7, inputCost: 0,     outputCost: 0,     tier: "free" },
  { id: "qwen/qwen3-30b-a3b",                     label: "Qwen3 30B",                   provider: "Qwen", defaultTemp: 0.7, inputCost: 0.10,  outputCost: 0.30,  tier: "low" },
  { id: "qwen/qwen3-32b",                         label: "Qwen3 32B",                   provider: "Qwen", defaultTemp: 0.7, inputCost: 0.10,  outputCost: 0.30,  tier: "low" },
  { id: "qwen/qwen3-235b-a22b",                   label: "Qwen3 235B",                  provider: "Qwen", defaultTemp: 0.7, inputCost: 0.20,  outputCost: 0.60,  tier: "low" },
  { id: "qwen/qwen-2.5-coder-32b-instruct",       label: "Qwen 2.5 Coder 32B",         provider: "Qwen", defaultTemp: 0.7, inputCost: 0.07,  outputCost: 0.16,  tier: "low" },
];

export interface AgentModelSetting {
  model: string;
  temperature: number;
}

export type AgentModelSettings = Record<string, AgentModelSetting>;

const DEFAULT_AGENT_MODELS: AgentModelSettings = {
  creative_director: { model: "anthropic/claude-sonnet-4",     temperature: 0.9 },
  brand_stylist:     { model: "anthropic/claude-sonnet-4",     temperature: 0.8 },
  product_stylist:   { model: "google/gemini-2.5-pro-preview", temperature: 0.7 },
  casting_scout:     { model: "anthropic/claude-sonnet-4",     temperature: 0.8 },
  cinematographer:   { model: "google/gemini-2.5-pro-preview", temperature: 0.7 },
  director:          { model: "anthropic/claude-sonnet-4",     temperature: 0.8 },
  sound_designer:    { model: "google/gemini-2.5-pro-preview", temperature: 0.7 },
};

// Persist agent model settings in localStorage
const AGENT_MODELS_STORAGE_KEY = "openframe-agent-models";

// Model ID migrations: old → new (fix stale localStorage entries)
const MODEL_ID_MIGRATIONS: Record<string, string> = {
  "google/gemini-2.5-flash-preview": "google/gemini-2.5-flash",
};

function loadAgentModels(): AgentModelSettings {
  try {
    const raw = localStorage.getItem(AGENT_MODELS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AgentModelSettings;
      // Migrate any stale model IDs
      let migrated = false;
      for (const key of Object.keys(parsed)) {
        const old = parsed[key]?.model;
        if (old && MODEL_ID_MIGRATIONS[old]) {
          parsed[key].model = MODEL_ID_MIGRATIONS[old];
          migrated = true;
        }
      }
      if (migrated) saveAgentModels({ ...DEFAULT_AGENT_MODELS, ...parsed });
      return { ...DEFAULT_AGENT_MODELS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_AGENT_MODELS };
}

function saveAgentModels(settings: AgentModelSettings) {
  try {
    localStorage.setItem(AGENT_MODELS_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ── Pending Task Registry (survives refresh) ──────────────
// Tracks active generation tasks so polling can resume after page reload
interface PendingTask {
  taskId: string;
  taskType: "image" | "video" | "audio" | "music";
  targetType: "scene" | "asset";
  targetId: string;         // sceneId or assetId
  statusField: string;      // e.g. "start_frame_status", "video_status"
  urlField: string;         // e.g. "start_frame_image", "video_url"
  errorField?: string;
  historyField?: string;
  provider?: string;        // for image tasks
  model?: string;
  createdAt: number;
}

const PENDING_TASKS_KEY = "openframe-pending-tasks";

function loadPendingTasks(): PendingTask[] {
  try {
    const raw = localStorage.getItem(PENDING_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePendingTasks(tasks: PendingTask[]) {
  try { localStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
}

function addPendingTask(task: PendingTask) {
  const tasks = loadPendingTasks().filter((t) => t.taskId !== task.taskId);
  tasks.push(task);
  savePendingTasks(tasks);
}

function removePendingTask(taskId: string) {
  savePendingTasks(loadPendingTasks().filter((t) => t.taskId !== taskId));
}

/** Generic poll-and-complete: resumes polling for any saved task */
async function pollAndComplete(
  task: PendingTask,
  get: () => StoreState,
  set: (fn: (s: StoreState) => Partial<StoreState>) => void,
) {
  const POLL_INTERVAL = task.taskType === "video" ? 5000 : 3000;
  const MAX_POLLS = task.taskType === "video" ? 180 : 120;
  // How old is this task? Skip expired ones (>20 min)
  if (Date.now() - task.createdAt > 20 * 60 * 1000) {
    removePendingTask(task.taskId);
    // Mark as error so user sees feedback
    if (task.targetType === "scene") {
      set((s) => ({ scenes: s.scenes.map((sc) => sc.id === task.targetId ? { ...sc, [task.statusField]: "error" as FrameStatus, ...(task.errorField ? { [task.errorField]: "Task expired (started >20 min ago)" } : {}) } : sc) }));
    } else {
      set((s) => ({ keyItems: s.keyItems.map((k) => k.id === task.targetId ? { ...k, [task.statusField]: "error" as FrameStatus, ...(task.errorField ? { [task.errorField]: "Task expired (started >20 min ago)" } : {}) } : k) }));
    }
    return;
  }

  try {
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      // Determine status checker based on task type
      let st: { state: string; result_urls?: string[]; error_message?: string };
      if (task.taskType === "image") {
        st = await getImageTaskStatus(task.taskId, task.provider || "seedream");
      } else if (task.taskType === "video") {
        st = await getVideoTaskStatus(task.taskId);
      } else if (task.taskType === "music") {
        st = await getMusicTaskStatus(task.taskId);
      } else {
        st = await getAudioTaskStatus(task.taskId);
      }

      if (st.state === "success" && st.result_urls?.length) {
        removePendingTask(task.taskId);
        const resultUrls = st.result_urls!;

        if (task.targetType === "scene") {
          set((s) => ({
            scenes: s.scenes.map((sc) => {
              if (sc.id !== task.targetId) return sc;
              const updates: Record<string, unknown> = {
                [task.statusField]: "done" as FrameStatus,
                [task.urlField]: resultUrls[0],
              };
              if (task.errorField) updates[task.errorField] = undefined;
              if (task.model) {
                // Persist model for video
                const modelKey = task.statusField.replace("_status", "_model").replace("video_status", "video_model");
                if (modelKey !== task.statusField) updates[modelKey] = task.model;
              }
              if (task.historyField) {
                const oldHist = (sc as unknown as Record<string, unknown>)[task.historyField] as string[] || [];
                // For scene audio: push old URL to history
                if (task.taskType === "audio") {
                  const oldUrl = (sc as unknown as Record<string, unknown>)[task.urlField] as string | undefined;
                  if (oldUrl && oldUrl !== resultUrls[0]) updates[task.historyField] = [...oldHist, oldUrl];
                } else {
                  updates[task.historyField] = [...oldHist, resultUrls[0]];
                }
              }
              return { ...sc, ...updates };
            }),
          }));
        } else {
          // Asset (keyItem)
          set((s) => ({
            keyItems: s.keyItems.map((k) => {
              if (k.id !== task.targetId) return k;
              if (task.taskType === "audio" || task.taskType === "music") {
                const urls = [...resultUrls, ...(k.audio_urls || [])];
                const history = [...(k.audio_history || []), ...resultUrls];
                return { ...k, audio_urls: urls, audio_history: history, audio_status: "done" as FrameStatus, audio_error: undefined };
              } else {
                const history = [...(k.image_history || []), resultUrls[0]];
                return { ...k, image_url: resultUrls[0], image_history: history, image_error: undefined };
              }
            }),
          }));
        }
        // Save after resumed task completes
        _debouncedSave(get);
        return;
      }

      if (st.state === "fail") {
        throw new Error(st.error_message || "Generation failed");
      }
      // "waiting" / "running" → keep polling
    }
    throw new Error("Generation timed out");
  } catch (err: unknown) {
    removePendingTask(task.taskId);
    const msg = err instanceof Error ? err.message : "Generation failed";
    if (task.targetType === "scene") {
      set((s) => ({
        scenes: s.scenes.map((sc) => sc.id === task.targetId ? { ...sc, [task.statusField]: "error" as FrameStatus, ...(task.errorField ? { [task.errorField]: msg } : {}) } : sc),
      }));
    } else {
      set((s) => ({
        keyItems: s.keyItems.map((k) => k.id === task.targetId ? { ...k, [task.statusField]: "error" as FrameStatus, ...(task.errorField ? { [task.errorField]: msg } : {}) } : k),
      }));
    }
  }
}

// ── Ad Type Categories ─────────────────────────────────────
export interface AdType {
  id: string;
  label: string;
  description: string;
}

export const AD_TYPES: AdType[] = [
  { id: "fashion_luxury",     label: "Fashion & Luxury Editorial", description: "Artistic, moody, model-driven. 8-15 scenes. Think Vogue, Gucci campaigns." },
  { id: "commercial_product", label: "Commercial / Product",       description: "Clean, bright, product-hero. 5-8 scenes. Think Apple, Glossier." },
  { id: "beauty_skincare",    label: "Beauty & Skincare",          description: "Intimate, luminous, skin-focused. 5-10 scenes. Dewy, clinical luxury." },
  { id: "ugc_social",         label: "UGC / Social Media",         description: "Raw, authentic, short-form. 1-3 scenes. TikTok / Reels style." },
  { id: "cinematic_brand",    label: "Cinematic Brand Film",       description: "Story-driven, emotional, epic. 10-20 scenes. Think Nike, Apple '1984'." },
];

const DEFAULT_AGENTS: AgentInfo[] = [
  { id: "creative_director", name: "creative_director", label: "Creative Director", color: "#facc15", status: "idle" },
  { id: "brand_stylist", name: "brand_stylist", label: "Brand Stylist", color: "#60a5fa", status: "idle" },
  { id: "product_stylist", name: "product_stylist", label: "Product Stylist", color: "#4ade80", status: "idle" },
  { id: "casting_scout", name: "casting_scout", label: "Casting & Scout", color: "#f87171", status: "idle" },
  { id: "cinematographer", name: "cinematographer", label: "Cinematographer", color: "#22d3ee", status: "idle" },
  { id: "director", name: "director", label: "Director", color: "#e879f9", status: "idle" },
  { id: "sound_designer", name: "sound_designer", label: "Sound Designer", color: "#fafafa", status: "idle" },
];

interface StoreState {
  view: AppView;
  workflowId: string | null;
  userInput: string;
  adType: string | null;
  isRunning: boolean;
  agents: AgentInfo[];
  keyItems: KeyItem[];
  scenes: Scene[];
  agentOutputs: Record<string, Record<string, unknown>>;
  rebuildCount: number;
  projectAspectRatio: string;
  agentModelSettings: AgentModelSettings;
  error: string | null;
  unsubscribe: (() => void) | null;
  licenseStatus: LicenseStatus | null;
  showLicenseUpgrade: boolean;
  isPro: () => boolean;
  fetchLicenseStatus: () => Promise<void>;
  setShowLicenseUpgrade: (show: boolean) => void;
  getUserLicenseKey: () => string | null;
  setUserLicenseKey: (key: string | null) => void;

  setView: (view: AppView) => void;
  setUserInput: (input: string) => void;
  setAgentModelSetting: (agentId: string, setting: Partial<AgentModelSetting>) => void;
  resetAgentModelSettings: () => void;
  productImage: string | null;
  initializeWorkflow: (idea: string, adType?: string, productImage?: string, aiAssist?: boolean) => Promise<void>;
  loadProject: (workflowId: string) => Promise<void>;
  setAgentStatus: (agentName: string, status: AgentStatus) => void;
  setAgentOutput: (agentName: string, data: Record<string, unknown>) => void;
  updateAgentOutput: (agentName: string, data: Record<string, unknown>) => void;
  rebuildFromOutputs: () => void;
  getMissingReferences: (sceneId: string) => { name: string; type: string }[];
  generateFrame: (sceneId: string, frame: "start" | "end") => Promise<void>;
  generateAsset: (assetId: string) => Promise<void>;
  generateAudio: (assetId: string) => Promise<void>;
  setVoiceName: (assetId: string, voiceName: string) => void;
  updateVoiceSetting: (assetId: string, field: string, value: number | string) => void;
  updateMusicSetting: (assetId: string, field: string, value: number | string | boolean) => void;
  updateAssetPrompt: (assetId: string, prompt: string) => void;
  updateFramePrompt: (sceneId: string, frame: "start" | "end", prompt: string) => void;
  setAssetImage: (assetId: string, imageUrl: string) => void;
  setFrameImage: (sceneId: string, frame: "start" | "end", imageUrl: string) => void;
  deleteAssetImage: (assetId: string) => void;
  setAssetVideo: (assetId: string, videoUrl: string) => void;
  deleteAssetVideo: (assetId: string) => void;
  selectAssetFromHistory: (assetId: string, imageUrl: string) => void;
  selectAudioFromHistory: (assetId: string, audioUrl: string) => void;
  deleteFrameImage: (sceneId: string, frame: "start" | "end") => void;
  selectFrameFromHistory: (sceneId: string, frame: "start" | "end", imageUrl: string) => void;
  runSingleAgent: (agentName: string) => Promise<void>;
  enhanceAssetPrompt: (assetId: string, userInstructions: string) => Promise<void>;
  enhanceScenePrompts: (sceneId: string, userInstructions: string) => Promise<void>;
  enhanceSceneVideoPrompts: (sceneId: string, userInstructions: string) => Promise<void>;
  updateSceneAudioMode: (sceneId: string, userInstructions?: string) => Promise<void>;
  setProjectAspectRatio: (ratio: string) => void;
  // Video generation
  setVideoPrompt: (sceneId: string, slot: "combined" | "start" | "end", prompt: string) => void;
  setVideoMode: (sceneId: string, mode: "combined" | "separate") => void;
  setVideoModel: (sceneId: string, slot: "combined" | "start" | "end", modelId: string) => void;
  setVideoDuration: (sceneId: string, slot: "combined" | "start" | "end", duration: number) => void;
  generateVideo: (sceneId: string, slot: "combined" | "start" | "end") => Promise<void>;
  deleteVideo: (sceneId: string, slot: "combined" | "start" | "end") => void;
  generateSceneVoiceover: (sceneId: string, slot?: "combined" | "start" | "end") => Promise<void>;
  // Manual card creation
  addKeyItem: (type: AssetType) => string;
  addScene: () => string;
  removeKeyItem: (id: string) => void;
  removeScene: (id: string) => void;
  retryWorkflow: () => Promise<void>;
  resumePendingTasks: () => void;
  reset: () => void;
}

// Deterministic slug for stable IDs across rebuilds
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}

function parseAgentData(agentName: string, data: Record<string, unknown>): { items: KeyItem[]; scenes: Scene[] } {
  const items: KeyItem[] = [];
  const scenes: Scene[] = [];

  switch (agentName) {
    case "creative_director":
      break;

    case "brand_stylist":
      break;

    case "product_stylist":
      items.push({
        id: "product-main",
        type: "product",
        label: "Product",
        text_prompt: (data.visual_product_description as string) || "",
      });
      break;

    case "casting_scout": {
      const members = (data.cast_members as Array<Record<string, string>>) || [];
      for (const m of members) {
        items.push({
          id: `cast-${slug(m.name || "driver")}`,
          type: "character",
          label: m.name || "Driver",
          driver_type: m.driver_type || "human",
          text_prompt: m.visual_prompt || "",
          reference_image: m.reference_image || undefined,
        });
      }
      // Settings: check multiple possible field names from the casting agent
      const settingA = (data.setting_a_description ?? data.setting_a) as string | undefined;
      const settingB = (data.setting_b_description ?? data.setting_b) as string | undefined;
      if (settingA != null) {
        items.push({
          id: "env-a",
          type: "environment",
          label: "Setting A",
          text_prompt: settingA,
        });
      }
      if (settingB != null) {
        items.push({
          id: "env-b",
          type: "environment",
          label: "Setting B",
          text_prompt: settingB,
        });
      }
      break;
    }

    case "cinematographer":
      items.push({
        id: "camera-main",
        type: "camera",
        label: "Camera & Lighting",
        text_prompt: (data.technical_prompt_block as string) || "",
      });
      break;

    case "director": {
      const sceneList = (data.scenes as Array<Record<string, unknown>>) || [];
      for (const s of sceneList) {
        const num = (s.scene_number as number) || 0;
        const rawAudioMode = (s.audio_mode as string) || "silent";
        const audioMode = (["silent", "talking-head", "audio-native"].includes(rawAudioMode)
          ? rawAudioMode
          : "silent") as "silent" | "talking-head" | "audio-native";
        scenes.push({
          id: (s._uid as string) || `scene-${num}`,
          scene_number: num,
          type: (s.type as string) || "",
          shot_type: (s.shot_type as string) || "",
          visual_type: (s.visual_type as string) || "Standard",
          visual_description: (s.visual_description as string) || "",
          action_movement: (s.action_movement as string) || "",
          start_image_prompt: (s.start_image_prompt as string) || "",
          end_image_prompt: (s.end_image_prompt as string) || "",
          start_video_prompt: (s.start_video_prompt as string) || "",
          end_video_prompt: (s.end_video_prompt as string) || "",
          combined_video_prompt: (s.combined_video_prompt as string) || "",
          start_frame_status: "idle",
          end_frame_status: "idle",
          active_cast: (s.active_cast as string[]) || [],
          active_setting: (s.active_setting as string) || undefined,
          audio_mode: audioMode,
          dialogue: (s.dialogue as string) || undefined,
          dialogue_speaker: (s.dialogue_speaker as string) || undefined,
          scene_voice_prompt: (s.scene_voice_prompt as string) || undefined,
        });
      }
      break;
    }

    case "sound_designer":
      items.push({
        id: "vo-main",
        type: "voiceover",
        label: "Voiceover",
        text_prompt: (data.voiceover_script as string) || "",
      });
      items.push({
        id: "music-main",
        type: "music",
        label: "Music Prompt",
        text_prompt: (data.music_prompt_technical as string) || "",
      });
      break;
  }

  return { items, scenes };
}

// ── Helper: build full save payload for any project ──
function _buildSaveResult(state: { agentOutputs: Record<string, Record<string, unknown>>; keyItems: KeyItem[]; scenes: Scene[]; productImage: string | null; adType: string | null }): Record<string, unknown> {
  return {
    ...state.agentOutputs,
    _standalone_items: state.keyItems.filter((k) => k.type === "image" || k.type === "video"),
    _manual_items: state.keyItems,
    _manual_scenes: state.scenes,
    product_image: state.productImage || undefined,
    ad_type: state.adType || undefined,
  };
}

// Debounced auto-save for ALL projects (manual + AI)
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function _debouncedSave(get: () => StoreState) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const s = get();
    if (!s.workflowId) return;
    const status = s.workflowId.startsWith("manual-") ? "manual" : "completed";
    saveProject(s.workflowId, s.userInput, _buildSaveResult(s), status).catch(() => {});
  }, 1500);
}

export const useStore = create<StoreState>((set, get) => ({
  view: "projects" as AppView,
  workflowId: null,
  userInput: "",
  adType: null,
  isRunning: false,
  agents: DEFAULT_AGENTS.map((a) => ({ ...a })),
  keyItems: [],
  scenes: [],
  agentOutputs: {},
  rebuildCount: 0,
  projectAspectRatio: "auto",
  productImage: null,
  error: null,
  unsubscribe: null,
  licenseStatus: null,
  showLicenseUpgrade: false,

  isPro: () => {
    const s = get().licenseStatus;
    return !!s && s.valid && (s.plan === "pro" || s.plan === "enterprise");
  },

  getUserLicenseKey: () => {
    try {
      const userJson = localStorage.getItem("openframe-auth-user");
      if (!userJson) return null;
      const user = JSON.parse(userJson);
      const email = user?.email;
      if (!email) return null;
      return localStorage.getItem(`openframe-license-key-${email}`) || null;
    } catch { return null; }
  },

  setUserLicenseKey: (key) => {
    try {
      const userJson = localStorage.getItem("openframe-auth-user");
      if (!userJson) return;
      const user = JSON.parse(userJson);
      const email = user?.email;
      if (!email) return;
      if (key) {
        localStorage.setItem(`openframe-license-key-${email}`, key);
      } else {
        localStorage.removeItem(`openframe-license-key-${email}`);
      }
    } catch { /* noop */ }
  },

  fetchLicenseStatus: async () => {
    try {
      const userKey = get().getUserLicenseKey();
      const status = await apiFetchLicenseStatus(userKey || undefined);
      set({ licenseStatus: status });
    } catch {
      // Backend unreachable — default to community
      set({ licenseStatus: { instance_id: "", plan: "community", valid: false, enforce: false, message: "" } });
    }
  },

  setShowLicenseUpgrade: (show) => set({ showLicenseUpgrade: show }),

  agentModelSettings: typeof window !== "undefined" ? loadAgentModels() : { ...DEFAULT_AGENT_MODELS },

  setView: (view) => set({ view }),
  setUserInput: (input) => set({ userInput: input }),

  setAgentModelSetting: (agentId, setting) => {
    const current = get().agentModelSettings;
    const updated = { ...current, [agentId]: { ...current[agentId], ...setting } };
    set({ agentModelSettings: updated });
    saveAgentModels(updated);
  },

  resetAgentModelSettings: () => {
    const defaults = { ...DEFAULT_AGENT_MODELS };
    set({ agentModelSettings: defaults });
    saveAgentModels(defaults);
  },

  initializeWorkflow: async (idea: string, adType?: string, productImage?: string, aiAssist: boolean = true) => {
    // Upload product image to get an HTTP URL (kie.ai needs HTTP URLs for image_input)
    let productImageUrl: string | null = null;
    if (productImage) {
      try {
        productImageUrl = await uploadImage(productImage);
        // uploaded successfully
      } catch (err) {
        console.warn("[Store] Product image upload failed, using base64 for display only:", err);
        productImageUrl = productImage; // fallback to base64 for display
      }
    }

    set({
      view: "canvas",
      isRunning: aiAssist,
      error: null,
      keyItems: [],
      scenes: [],
      userInput: idea,
      adType: adType || null,
      productImage: productImageUrl,
      agents: DEFAULT_AGENTS.map((a) => ({ ...a, status: "idle" as AgentStatus })),
    });

    // Manual mode: skip AI workflow, go straight to empty canvas
    if (!aiAssist) {
      const slug = idea.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/).slice(0, 5).join("-") || "project";
      const short = Math.random().toString(36).slice(2, 8);
      const manualId = `manual-${slug}-${short}`;
      set({ workflowId: manualId });
      // Persist to backend so it shows in the project list
      saveProject(manualId, idea, {}, "manual").catch(() => {});
      return;
    }

    try {
      const { workflow_id } = await startWorkflow(idea, adType, productImage, get().agentModelSettings);
      set({ workflowId: workflow_id });

      const unsub = subscribeToWorkflow(
        workflow_id,
        (event: SSEEvent) => {
          const state = get();

          if (event.agent && event.status) {
            set({
              agents: state.agents.map((a) =>
                a.name === event.agent ? { ...a, status: event.status as AgentStatus } : a
              ),
            });
          }

          if (event.status === "done" && event.data && event.agent !== "__workflow__") {
            // Store raw agent output
            const agentKey: Record<string, string> = {
              creative_director: "creative_brief",
              brand_stylist: "visual_identity",
              product_stylist: "product_specs",
              casting_scout: "casting_brief",
              cinematographer: "camera_specs",
              director: "shot_list",
              sound_designer: "audio_specs",
            };
            const key = agentKey[event.agent] || event.agent;
            // Assign stable _uid to director scenes on first arrival
            if (event.agent === "director" && event.data.scenes) {
              for (const s of event.data.scenes as Array<Record<string, unknown>>) {
                if (!s._uid) s._uid = `scene-${(s.scene_number as number) || 0}`;
              }
            }
            set((s) => ({ agentOutputs: { ...s.agentOutputs, [key]: event.data! } }));

            const { items, scenes: newScenes } = parseAgentData(event.agent, event.data);
            if (items.length > 0) {
              // If product_stylist and we have an uploaded product image, auto-set it
              if (event.agent === "product_stylist" && get().productImage) {
                for (const item of items) {
                  if (item.type === "product") {
                    item.image_url = get().productImage!;
                  }
                }
              }
              set((s) => ({ keyItems: [...s.keyItems, ...items] }));
            }
            if (newScenes.length > 0) {
              set((s) => ({ scenes: [...s.scenes, ...newScenes] }));
            }
            // Save after each agent completes so partial progress is never lost
            _debouncedSave(get);
          }
        },
        () => { set({ isRunning: false }); _debouncedSave(get); },
        (error: string) => set({ isRunning: false, error })
      );

      set({ unsubscribe: unsub });
    } catch (err) {
      set({ isRunning: false, error: String(err) });
    }
  },

  retryWorkflow: async () => {
    const { userInput, workflowId, unsubscribe: oldUnsub, agentOutputs, agents } = get();
    if (!userInput || !workflowId) return;

    // Clean up old subscription
    if (oldUnsub) oldUnsub();

    const agentKeyMap: Record<string, string> = {
      creative_director: "creative_brief",
      brand_stylist: "visual_identity",
      product_stylist: "product_specs",
      casting_scout: "casting_brief",
      cinematographer: "camera_specs",
      director: "shot_list",
      sound_designer: "audio_specs",
    };

    // Keep agents that already completed as "done", reset others to "idle"
    const completedAgents = new Set(
      agents.filter((a) => a.status === "done").map((a) => a.name)
    );
    set({
      isRunning: true,
      error: null,
      agents: DEFAULT_AGENTS.map((a) => ({
        ...a,
        status: (completedAgents.has(a.name) ? "done" : "idle") as AgentStatus,
      })),
    });

    try {
      // Send existing outputs to backend so it skips completed agents
      const { workflow_id } = await resumeWorkflow(
        workflowId,
        userInput,
        agentOutputs,
        undefined,
        get().productImage || undefined,
        get().agentModelSettings,
      );
      set({ workflowId: workflow_id });

      const unsub = subscribeToWorkflow(
        workflow_id,
        (event: SSEEvent) => {
          const state = get();

          if (event.agent && event.status) {
            set({
              agents: state.agents.map((a) =>
                a.name === event.agent ? { ...a, status: event.status as AgentStatus } : a
              ),
            });
          }

          if (event.status === "done" && event.data && event.agent !== "__workflow__") {
            const key = agentKeyMap[event.agent] || event.agent;
            if (event.agent === "director" && event.data.scenes) {
              for (const s of event.data.scenes as Array<Record<string, unknown>>) {
                if (!s._uid) s._uid = `scene-${(s.scene_number as number) || 0}`;
              }
            }
            set((s) => ({ agentOutputs: { ...s.agentOutputs, [key]: event.data! } }));

            // Only add new items/scenes for agents that weren't already done
            if (!completedAgents.has(event.agent)) {
              const { items, scenes: newScenes } = parseAgentData(event.agent, event.data);
              if (items.length > 0) {
                if (event.agent === "product_stylist" && get().productImage) {
                  for (const item of items) {
                    if (item.type === "product") item.image_url = get().productImage!;
                  }
                }
                set((s) => ({ keyItems: [...s.keyItems, ...items] }));
              }
              if (newScenes.length > 0) {
                set((s) => ({ scenes: [...s.scenes, ...newScenes] }));
              }
            }
            _debouncedSave(get);
          }
        },
        () => { set({ isRunning: false }); _debouncedSave(get); },
        (error: string) => set({ isRunning: false, error })
      );

      set({ unsubscribe: unsub });
    } catch (err) {
      set({ isRunning: false, error: String(err) });
    }
  },

  loadProject: async (workflowId: string) => {
    set({
      isRunning: false,
      error: null,
      keyItems: [],
      scenes: [],
      workflowId,
      agents: DEFAULT_AGENTS.map((a) => ({ ...a, status: "idle" as AgentStatus })),
    });

    try {
      const project = await fetchProject(workflowId);
      const result = project.result as Record<string, unknown>;
      // Restore product image and ad type from saved data
      const savedProductImage = (result.product_image as string) || null;
      const savedAdType = (result.ad_type as string) || null;
      set({ userInput: project.user_input, productImage: savedProductImage, adType: savedAdType });

      // Parse all agent data into keyItems and scenes
      const allItems: KeyItem[] = [];
      const allScenes: Scene[] = [];

      const rawOutputs: Record<string, Record<string, unknown>> = {};
      const agentKeyMap: Record<string, string> = {
        creative_director: "creative_brief",
        brand_stylist: "visual_identity",
        product_stylist: "product_specs",
        casting_scout: "casting_brief",
        cinematographer: "camera_specs",
        director: "shot_list",
        sound_designer: "audio_specs",
      };

      for (const agentName of [
        "product_stylist",
        "casting_scout",
        "cinematographer",
        "director",
        "sound_designer",
      ]) {
        const data = result[agentKeyMap[agentName]] as Record<string, unknown> | undefined;
        if (!data) continue;
        // Assign stable _uid to director scenes on load
        if (agentName === "director" && Array.isArray(data.scenes)) {
          for (const s of data.scenes as Array<Record<string, unknown>>) {
            if (!s._uid) s._uid = `scene-${(s.scene_number as number) || 0}`;
          }
        }
        rawOutputs[agentKeyMap[agentName]] = data;
        const { items, scenes } = parseAgentData(agentName, data);
        allItems.push(...items);
        allScenes.push(...scenes);
      }
      // Also capture creative_brief and visual_identity
      if (result.creative_brief) rawOutputs.creative_brief = result.creative_brief as Record<string, unknown>;
      if (result.visual_identity) rawOutputs.visual_identity = result.visual_identity as Record<string, unknown>;

      // Apply product image to product keyItems if available
      if (savedProductImage) {
        for (const item of allItems) {
          if (item.type === "product" && !item.image_url) {
            item.image_url = savedProductImage;
          }
        }
      }

      // Restore full keyItems and scenes from saved data (contains generated image/video/audio URLs)
      const savedItems = result._manual_items as KeyItem[] | undefined;
      const savedScenes = result._manual_scenes as Scene[] | undefined;
      if (savedItems && Array.isArray(savedItems) && savedItems.length > 0) {
        allItems.length = 0;
        allItems.push(...savedItems);
      }
      if (savedScenes && Array.isArray(savedScenes) && savedScenes.length > 0) {
        allScenes.length = 0;
        allScenes.push(...savedScenes);
      }

      // Set agent statuses based on which outputs actually exist
      const projectFailed = project.status === "error";
      const projectRunning = project.status === "running";
      let firstFailedMarked = false;
      const agentStatuses = DEFAULT_AGENTS.map((a) => {
        const key = agentKeyMap[a.name];
        const hasDone = key && !!rawOutputs[key];
        if (hasDone) return { ...a, status: "done" as AgentStatus };
        // Mark the first non-done agent as "error" when project failed
        if (projectFailed && !firstFailedMarked) {
          firstFailedMarked = true;
          return { ...a, status: "error" as AgentStatus };
        }
        return { ...a, status: "idle" as AgentStatus };
      });

      set({
        keyItems: allItems,
        scenes: allScenes,
        agentOutputs: rawOutputs,
        agents: agentStatuses,
        view: "canvas",
        error: projectFailed ? "Pipeline failed — click Retry to re-run" : null,
      });

      // Resume any pending generation tasks now that scenes/keyItems are loaded
      get().resumePendingTasks();

      // Clean up stuck "generating" states that have no pending task (orphaned before persistence was deployed)
      setTimeout(() => {
        const pending = loadPendingTasks();
        const pendingTargets = new Set(pending.map((t) => `${t.targetId}::${t.statusField}`));
        // Scenes
        const stuckScenes = get().scenes.filter((sc) => {
          const fields: (keyof Scene)[] = [
            "start_frame_status", "end_frame_status",
            "video_status", "start_video_status", "end_video_status",
            "scene_audio_status", "end_scene_audio_status" as keyof Scene,
          ];
          return fields.some((f) => sc[f] === "generating" && !pendingTargets.has(`${sc.id}::${f}`));
        });
        if (stuckScenes.length > 0) {
          set((s) => ({
            scenes: s.scenes.map((sc) => {
              let updated = { ...sc };
              const check = (statusF: string, errorF?: string) => {
                if ((updated as Record<string, unknown>)[statusF] === "generating" && !pendingTargets.has(`${sc.id}::${statusF}`)) {
                  (updated as Record<string, unknown>)[statusF] = "error";
                  if (errorF) (updated as Record<string, unknown>)[errorF] = "Generation interrupted — please retry";
                }
              };
              check("start_frame_status", "start_frame_error");
              check("end_frame_status", "end_frame_error");
              check("video_status", "video_error");
              check("start_video_status", "start_video_error");
              check("end_video_status", "end_video_error");
              check("scene_audio_status");
              check("end_scene_audio_status" as string);
              return updated;
            }),
          }));
        }
        // KeyItems
        const stuckItems = get().keyItems.filter((k) => {
          return (k.image_url === "generating" && !pendingTargets.has(`${k.id}::image_url`)) ||
                 (k.audio_status === "generating" && !pendingTargets.has(`${k.id}::audio_status`));
        });
        if (stuckItems.length > 0) {
          set((s) => ({
            keyItems: s.keyItems.map((k) => {
              let updated = { ...k };
              if (k.image_url === "generating" && !pendingTargets.has(`${k.id}::image_url`)) {
                updated.image_url = undefined;
                updated.image_error = "Generation interrupted — please retry";
              }
              if (k.audio_status === "generating" && !pendingTargets.has(`${k.id}::audio_status`)) {
                updated.audio_status = "error" as FrameStatus;
                updated.audio_error = "Generation interrupted — please retry";
              }
              return updated;
            }),
          }));
        }
      }, 3000); // Wait 3s to let any resuming polls start first

      // If the project is still running on the backend, re-subscribe to SSE
      if (projectRunning) {
        set({ isRunning: true });
        const unsub = subscribeToWorkflow(
          workflowId,
          (event: SSEEvent) => {
            const state = get();
            if (event.agent && event.status) {
              set({
                agents: state.agents.map((a) =>
                  a.name === event.agent ? { ...a, status: event.status as AgentStatus } : a
                ),
              });
            }
            if (event.status === "done" && event.data && event.agent !== "__workflow__") {
              const key = agentKeyMap[event.agent] || event.agent;
              if (event.agent === "director" && event.data.scenes) {
                for (const s of event.data.scenes as Array<Record<string, unknown>>) {
                  if (!s._uid) s._uid = `scene-${(s.scene_number as number) || 0}`;
                }
              }
              set((s) => ({ agentOutputs: { ...s.agentOutputs, [key]: event.data! } }));
              const { items, scenes: newScenes } = parseAgentData(event.agent, event.data);
              if (items.length > 0) {
                if (event.agent === "product_stylist" && get().productImage) {
                  for (const item of items) {
                    if (item.type === "product") item.image_url = get().productImage!;
                  }
                }
                set((s) => ({ keyItems: [...s.keyItems, ...items] }));
              }
              if (newScenes.length > 0) {
                set((s) => ({ scenes: [...s.scenes, ...newScenes] }));
              }
              _debouncedSave(get);
            }
          },
          () => { set({ isRunning: false }); _debouncedSave(get); },
          (error: string) => set({ isRunning: false, error })
        );
        set({ unsubscribe: unsub });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  setAgentStatus: (agentName, status) => {
    set((state) => ({
      agents: state.agents.map((a) =>
        a.name === agentName ? { ...a, status } : a
      ),
    }));
  },

  setAgentOutput: (agentName, data) => {
    set((s) => ({ agentOutputs: { ...s.agentOutputs, [agentName]: data } }));
  },

  updateAgentOutput: (agentName, data) => {
    set((s) => ({
      agentOutputs: { ...s.agentOutputs, [agentName]: { ...s.agentOutputs[agentName], ...data } },
    }));
  },

  rebuildFromOutputs: () => {
    const outputs = get().agentOutputs;
    const oldItems = get().keyItems;
    const oldScenes = get().scenes;

    // ── KeyItems: parse from all agents (except director which only has scenes) ──
    const allItems: KeyItem[] = [];
    const itemAgents: Record<string, string> = {
      product_specs: "product_stylist",
      casting_brief: "casting_scout",
      camera_specs: "cinematographer",
      audio_specs: "sound_designer",
    };
    for (const [key, agentName] of Object.entries(itemAgents)) {
      const data = outputs[key];
      if (!data) continue;
      const { items } = parseAgentData(agentName, data);
      if (agentName === "product_stylist" && get().productImage) {
        for (const item of items) {
          if (item.type === "product") item.image_url = get().productImage!;
        }
      }
      allItems.push(...items);
    }
    // Preserve generated images/history from old items with same stable ID
    const oldItemMap = new Map(oldItems.map((i) => [i.id, i]));
    for (const item of allItems) {
      const old = oldItemMap.get(item.id);
      if (old) {
        item.image_url = old.image_url;
        item.image_history = old.image_history;
        item.audio_urls = old.audio_urls;
        item.audio_history = old.audio_history;
        item.audio_status = old.audio_status;
        item.audio_error = old.audio_error;
        item.voice_name = old.voice_name;
        item.voice_stability = old.voice_stability;
        item.voice_similarity = old.voice_similarity;
        item.voice_style = old.voice_style;
        item.voice_speed = old.voice_speed;
        item.voice_language = old.voice_language;
        item.music_custom_mode = old.music_custom_mode;
        item.music_instrumental = old.music_instrumental;
        item.music_model = old.music_model;
        item.music_style = old.music_style;
        item.music_title = old.music_title;
        item.music_vocal_gender = old.music_vocal_gender;
        item.music_style_weight = old.music_style_weight;
        item.music_weirdness = old.music_weirdness;
        item.music_audio_weight = old.music_audio_weight;
      }
    }

    // ── Scenes: build from raw agentOutputs, SPREAD old scene first ──
    // By spreading the old scene as the base, ALL generated assets (images,
    // video, history, status, etc.) are automatically preserved.  Only
    // text / structural fields are overlaid from the raw data.
    // Raw scenes and store scenes are always index-aligned because
    // insertScene / removeScene update both at the same position.
    const rawShot = outputs.shot_list as Record<string, unknown> | undefined;
    const rawSceneArr = (rawShot?.scenes as Array<Record<string, unknown>>) || [];
    const allScenes: Scene[] = rawSceneArr.map((raw, i) => {
      const old: Scene | undefined = i < oldScenes.length ? oldScenes[i] : undefined;
      const num = (raw.scene_number as number) || i + 1;
      return {
        // 1) Defaults for brand-new scenes (no old scene to spread)
        start_frame_status: "idle" as FrameStatus,
        end_frame_status: "idle" as FrameStatus,
        // 2) Spread old scene → preserves ALL images, video, history, models, errors, status
        ...(old || {}),
        // 3) Overlay text / structural fields from raw data (modal edits)
        id: (raw._uid as string) || old?.id || `scene-${num}`,
        scene_number: num,
        type: (raw.type as string) || "",
        shot_type: (raw.shot_type as string) || "",
        visual_type: (raw.visual_type as string) || "Standard",
        visual_description: (raw.visual_description as string) || "",
        action_movement: (raw.action_movement as string) || "",
        start_image_prompt: (raw.start_image_prompt as string) || "",
        end_image_prompt: (raw.end_image_prompt as string) || "",
        active_cast: (raw.active_cast as string[]) || [],
        active_setting: (raw.active_setting as string) || undefined,
        // 4) Video prompts: prefer old (canvas-edited) over raw
        start_video_prompt: old?.start_video_prompt || (raw.start_video_prompt as string) || "",
        end_video_prompt: old?.end_video_prompt || (raw.end_video_prompt as string) || "",
        combined_video_prompt: old?.combined_video_prompt || (raw.combined_video_prompt as string) || "",
        // 5) Per-scene audio (from director)
        audio_mode: (raw.audio_mode as Scene["audio_mode"]) || old?.audio_mode || "silent",
        dialogue: (raw.dialogue as string) || old?.dialogue || undefined,
        dialogue_speaker: (raw.dialogue_speaker as string) || old?.dialogue_speaker || undefined,
        scene_voice_prompt: (raw.scene_voice_prompt as string) || old?.scene_voice_prompt || undefined,
        voice_id: old?.voice_id || undefined,
      } as Scene;
    });

    set((s) => ({ keyItems: allItems, scenes: allScenes, rebuildCount: s.rebuildCount + 1 }));
  },

  getMissingReferences: (sceneId) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === sceneId);
    if (!scene) return [];
    const items = state.keyItems;
    const missing: { name: string; type: string }[] = [];

    const isReady = (url?: string) => url && url !== "generating" && !url.startsWith("blob:");

    // Check active cast members
    for (const castName of scene.active_cast || []) {
      const asset = items.find((k) => k.label === castName && k.type === "character");
      if (!asset || !isReady(asset.image_url)) {
        missing.push({ name: castName, type: "Cast" });
      }
    }
    // Check active setting
    if (scene.active_setting) {
      const settingLabel = scene.active_setting === "setting_a" ? "Setting A" : scene.active_setting === "setting_b" ? "Setting B" : scene.active_setting;
      const asset = items.find((k) => k.type === "environment" && (k.label === settingLabel || k.id.includes(scene.active_setting!)));
      if (!asset || !isReady(asset.image_url)) {
        missing.push({ name: settingLabel, type: "Setting" });
      }
    }
    // Check products
    const products = items.filter((k) => k.type === "product");
    for (const p of products) {
      if (!isReady(p.image_url)) {
        missing.push({ name: p.label, type: "Product" });
      }
    }
    return missing;
  },

  generateFrame: async (sceneId, frame) => {
    const statusKey = frame === "start" ? "start_frame_status" : "end_frame_status";
    const imgKey = frame === "start" ? "start_frame_image" : "end_frame_image";
    const histKey = frame === "start" ? "start_frame_history" : "end_frame_history";
    const modelKey = frame === "start" ? "start_frame_model" : "end_frame_model";
    const errorKey = frame === "start" ? "start_frame_error" : "end_frame_error";
    const promptKey = frame === "start" ? "start_image_prompt" : "end_image_prompt";

    const state = get();
    const scene = state.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const prompt = scene[promptKey];
    const model = (scene[modelKey as keyof Scene] as string) || "seedream/4.5";
    const qualityKey = frame === "start" ? "start_frame_quality" : "end_frame_quality";
    const quality = (scene[qualityKey as keyof Scene] as string) || "basic";
    const aspect = state.projectAspectRatio === "auto" ? "1:1" : state.projectAspectRatio;

    // Gather reference images from connected asset nodes (cast, setting, product)
    const refImages: string[] = [];
    const items = state.keyItems;
    // Active cast member images
    for (const castName of scene.active_cast || []) {
      const asset = items.find((k) => k.label === castName && k.type === "character");
      if (asset?.image_url && asset.image_url !== "generating" && !asset.image_url.startsWith("blob:")) {
        refImages.push(asset.image_url);
      }
    }
    // Active setting image
    if (scene.active_setting) {
      const settingLabel = scene.active_setting === "setting_a" ? "Setting A" : scene.active_setting === "setting_b" ? "Setting B" : scene.active_setting;
      const asset = items.find((k) => k.type === "environment" && (k.label === settingLabel || k.id.includes(scene.active_setting!)));
      if (asset?.image_url && asset.image_url !== "generating" && !asset.image_url.startsWith("blob:")) {
        refImages.push(asset.image_url);
      }
    }
    // Product images
    const products = items.filter((k) => k.type === "product" && k.image_url && k.image_url !== "generating" && !k.image_url.startsWith("blob:"));
    for (const p of products) refImages.push(p.image_url!);
    // Also include the frame's own existing image if it's an http URL (for re-generation/edit)
    const existingImage = scene[imgKey as keyof Scene] as string | undefined;
    if (existingImage && existingImage.startsWith("http") && !refImages.includes(existingImage)) {
      refImages.push(existingImage);
    }

    // Filter out blob: URLs and "generating" placeholders; keep http + data: URLs
    // (backend will convert data: URLs to public imgbb URLs before sending to kie.ai)
    const validRefImages = refImages.filter((u) => u.startsWith("http") || u.startsWith("data:image"));

    // Filter complete — validRefImages now contains only usable HTTP/base64 URLs

    // Set generating state, clear previous error
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [statusKey]: "generating" as FrameStatus, [errorKey]: undefined } : s
      ),
    }));

    try {
      const { task_id, provider } = await generateImage({
        prompt,
        model,
        aspect_ratio: aspect,
        quality,
        image_urls: validRefImages.length > 0 ? validRefImages : undefined,
      });

      // Persist task for resume-after-refresh
      addPendingTask({
        taskId: task_id, taskType: "image", targetType: "scene", targetId: sceneId,
        statusField: statusKey, urlField: imgKey, errorField: errorKey, historyField: histKey,
        provider, createdAt: Date.now(),
      });

      // Poll for result
      const poll = async () => {
        for (let i = 0; i < 120; i++) { // max ~6 min
          await new Promise((r) => setTimeout(r, 3000));
          const status = await getImageTaskStatus(task_id, provider);

          if (status.state === "success" && status.result_urls?.length) {
            removePendingTask(task_id);
            const newUrl = status.result_urls[0];
            set((state) => ({
              scenes: state.scenes.map((s) => {
                if (s.id !== sceneId) return s;
                const history = [...(s[histKey as keyof typeof s] as string[] || []), newUrl];
                return { ...s, [statusKey]: "done" as FrameStatus, [imgKey]: newUrl, [histKey]: history, [errorKey]: undefined };
              }),
            }));
            _debouncedSave(get);
            return;
          }

          if (status.state === "fail") {
            throw new Error(status.error_message || "Generation failed");
          }
        }
        throw new Error("Generation timed out");
      };

      await poll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      set((state) => ({
        scenes: state.scenes.map((s) =>
          s.id === sceneId ? { ...s, [statusKey]: "error" as FrameStatus, [errorKey]: msg } : s
        ),
      }));
      // Clean up any pending task (task_id may not exist if API call itself failed)
      loadPendingTasks().filter((t) => t.targetId === sceneId && t.statusField === statusKey).forEach((t) => removePendingTask(t.taskId));
    }
  },

  generateAsset: async (assetId) => {
    const item = get().keyItems.find((k) => k.id === assetId);
    if (!item) return;

    const model = item.image_model || "seedream/4.5";
    const quality = item.image_quality || "basic";
    const aspect = get().projectAspectRatio === "auto" ? "1:1" : get().projectAspectRatio;
    // Use the asset's own existing image as reference (for re-generation / edit), plus its reference_image if any
    const refImages: string[] = [];
    if (item.reference_image && item.reference_image.startsWith("http")) {
      refImages.push(item.reference_image);
    }
    if (item.image_url && item.image_url !== "generating" && item.image_url.startsWith("http")) {
      refImages.push(item.image_url);
    }

    // Set generating state, clear error
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, image_url: "generating", image_error: undefined } : k
      ),
    }));

    try {
      const { task_id, provider } = await generateImage({
        prompt: item.text_prompt,
        model,
        aspect_ratio: aspect,
        quality,
        image_urls: refImages.length > 0 ? refImages : undefined,
      });

      // Persist task for resume-after-refresh
      addPendingTask({
        taskId: task_id, taskType: "image", targetType: "asset", targetId: assetId,
        statusField: "image_url", urlField: "image_url", errorField: "image_error",
        provider, createdAt: Date.now(),
      });

      // Poll for result
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const status = await getImageTaskStatus(task_id, provider);

        if (status.state === "success" && status.result_urls?.length) {
          removePendingTask(task_id);
          const newUrl = status.result_urls[0];
          set((state) => ({
            keyItems: state.keyItems.map((k) => {
              if (k.id !== assetId) return k;
              const history = [...(k.image_history || []), newUrl];
              return { ...k, image_url: newUrl, image_history: history, image_error: undefined };
            }),
          }));
          _debouncedSave(get);
          return;
        }

        if (status.state === "fail") {
          throw new Error(status.error_message || "Generation failed");
        }
      }
      throw new Error("Generation timed out");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      set((state) => ({
        keyItems: state.keyItems.map((k) =>
          k.id === assetId ? { ...k, image_url: undefined, image_error: msg } : k
        ),
      }));
    }
  },

  generateAudio: async (assetId) => {
    const item = get().keyItems.find((k) => k.id === assetId);
    if (!item) return;
    if (!item.text_prompt?.trim()) return;

    // Set generating state, clear error
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, audio_status: "generating" as FrameStatus, audio_error: undefined } : k
      ),
    }));

    try {
      let taskResult: { task_id: string };

      if (item.type === "voiceover") {
        taskResult = await generateVoiceover(
          item.text_prompt,
          item.voice_name || "Sarah",
          item.voice_stability ?? 0.5,
          item.voice_similarity ?? 0.75,
          item.voice_style ?? 0,
          item.voice_speed ?? 1,
          item.voice_language || "",
        );
      } else {
        // Music generation
        taskResult = await generateMusic(
          item.text_prompt,
          item.music_custom_mode ?? false,
          item.music_instrumental ?? false,
          item.music_model || "V5",
          item.music_style || "",
          item.music_title || "",
          item.music_vocal_gender || "",
          item.music_style_weight,
          item.music_weirdness,
          item.music_audio_weight,
        );
      }

      // Persist task for resume-after-refresh
      addPendingTask({
        taskId: taskResult.task_id,
        taskType: item.type === "music" ? "music" : "audio",
        targetType: "asset", targetId: assetId,
        statusField: "audio_status", urlField: "audio_urls", errorField: "audio_error",
        createdAt: Date.now(),
      });

      // Poll for result (music uses dedicated Suno status endpoint)
      const pollStatus = item.type === "music" ? getMusicTaskStatus : getAudioTaskStatus;
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const status = await pollStatus(taskResult.task_id);

        if (status.state === "success" && status.result_urls?.length) {
          removePendingTask(taskResult.task_id);
          const newUrls = status.result_urls; // Suno returns 2 tracks
          set((state) => ({
            keyItems: state.keyItems.map((k) => {
              if (k.id !== assetId) return k;
              const urls = [...newUrls, ...(k.audio_urls || [])];
              const history = [...(k.audio_history || []), ...newUrls];
              return { ...k, audio_urls: urls, audio_history: history, audio_status: "done" as FrameStatus, audio_error: undefined };
            }),
          }));
          _debouncedSave(get);
          return;
        }

        if (status.state === "fail") {
          throw new Error(status.error_message || "Audio generation failed");
        }
      }
      throw new Error("Audio generation timed out");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Audio generation failed";
      set((state) => ({
        keyItems: state.keyItems.map((k) =>
          k.id === assetId ? { ...k, audio_status: "error" as FrameStatus, audio_error: msg } : k
        ),
      }));
    }
  },

  setVoiceName: (assetId, voiceName) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, voice_name: voiceName } : k
      ),
    }));
  },

  updateVoiceSetting: (assetId: string, field: string, value: number | string) => {
    const keyMap: Record<string, string> = {
      stability: "voice_stability",
      similarity: "voice_similarity",
      style: "voice_style",
      speed: "voice_speed",
      language: "voice_language",
    };
    const storeField = keyMap[field] || field;
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, [storeField]: value } : k
      ),
    }));
  },

  updateMusicSetting: (assetId: string, field: string, value: number | string | boolean) => {
    const keyMap: Record<string, string> = {
      customMode: "music_custom_mode",
      instrumental: "music_instrumental",
      model: "music_model",
      style: "music_style",
      title: "music_title",
      vocalGender: "music_vocal_gender",
      styleWeight: "music_style_weight",
      weirdness: "music_weirdness",
      audioWeight: "music_audio_weight",
    };
    const storeField = keyMap[field] || field;
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, [storeField]: value } : k
      ),
    }));
  },

  updateAssetPrompt: (assetId, prompt) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, text_prompt: prompt } : k
      ),
    }));
    _debouncedSave(get);
  },

  updateFramePrompt: (sceneId, frame, prompt) => {
    const key = frame === "start" ? "start_image_prompt" : "end_image_prompt";
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [key]: prompt } : s
      ),
    }));
    _debouncedSave(get);
  },

  setAssetImage: (assetId, imageUrl) => {
    // Set immediately for display
    set((state) => ({
      keyItems: state.keyItems.map((k) => {
        if (k.id !== assetId) return k;
        const history = [...(k.image_history || []), imageUrl];
        return { ...k, image_url: imageUrl, image_history: history };
      }),
    }));
    // If base64, upload in background to get HTTP URL for reference image usage
    if (imageUrl.startsWith("data:")) {
      uploadImage(imageUrl).then((httpUrl) => {
        // Replace base64 with HTTP URL for reference usage
        set((state) => ({
          keyItems: state.keyItems.map((k) =>
            k.id === assetId && k.image_url === imageUrl ? { ...k, image_url: httpUrl } : k
          ),
        }));
        _debouncedSave(get);
      }).catch((err) => console.warn("[setAssetImage] Upload failed:", err));
    } else {
      _debouncedSave(get);
    }
  },

  setFrameImage: (sceneId, frame, imageUrl) => {
    const key = frame === "start" ? "start_frame_image" : "end_frame_image";
    const statusKey = frame === "start" ? "start_frame_status" : "end_frame_status";
    const histKey = frame === "start" ? "start_frame_history" : "end_frame_history";
    set((state) => ({
      scenes: state.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const history = [...(s[histKey as keyof typeof s] as string[] || []), imageUrl];
        return { ...s, [key]: imageUrl, [statusKey]: "done" as FrameStatus, [histKey]: history };
      }),
    }));
    _debouncedSave(get);
  },

  deleteAssetImage: (assetId) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, image_url: undefined } : k
      ),
    }));
    _debouncedSave(get);
  },

  setAssetVideo: (assetId, videoUrl) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, video_url: videoUrl, video_status: "done" as const } : k
      ),
    }));
    _debouncedSave(get);
  },

  deleteAssetVideo: (assetId) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, video_url: undefined, video_status: "idle" as const } : k
      ),
    }));
    _debouncedSave(get);
  },

  selectAssetFromHistory: (assetId, imageUrl) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === assetId ? { ...k, image_url: imageUrl } : k
      ),
    }));
    _debouncedSave(get);
  },

  selectAudioFromHistory: (assetId, audioUrl) => {
    set((state) => ({
      keyItems: state.keyItems.map((k) => {
        if (k.id !== assetId) return k;
        // Move selected URL to front of audio_urls
        const others = (k.audio_urls || []).filter((u) => u !== audioUrl);
        return { ...k, audio_urls: [audioUrl, ...others] };
      }),
    }));
    _debouncedSave(get);
  },

  deleteFrameImage: (sceneId, frame) => {
    const key = frame === "start" ? "start_frame_image" : "end_frame_image";
    const statusKey = frame === "start" ? "start_frame_status" : "end_frame_status";
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [key]: undefined, [statusKey]: "idle" as FrameStatus } : s
      ),
    }));
    _debouncedSave(get);
  },

  selectFrameFromHistory: (sceneId, frame, imageUrl) => {
    const key = frame === "start" ? "start_frame_image" : "end_frame_image";
    const statusKey = frame === "start" ? "start_frame_status" : "end_frame_status";
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [key]: imageUrl, [statusKey]: "done" as FrameStatus } : s
      ),
    }));
    _debouncedSave(get);
  },

  runSingleAgent: async (agentName) => {
    const state = get();

    // Mark agent as running
    set((s) => ({
      agents: s.agents.map((a) => a.name === agentName ? { ...a, status: "running" as AgentStatus } : a),
    }));

    try {
      const canvasAssets = state.keyItems.map((k) => ({
        type: k.type,
        label: k.label,
        text_prompt: k.text_prompt || "",
        driver_type: k.driver_type || "",
      }));
      const canvasScenes = state.scenes.map((s) => ({
        scene_number: s.scene_number,
        type: s.type,
        shot_type: s.shot_type,
        visual_type: s.visual_type || "Standard",
        visual_description: s.visual_description || "",
        action_movement: s.action_movement || "",
        start_image_prompt: s.start_image_prompt || "",
        end_image_prompt: s.end_image_prompt || "",
      }));

      const result = await runSingleAgent({
        agent_name: agentName,
        user_input: state.userInput,
        existing_outputs: state.agentOutputs,
        canvas_assets: canvasAssets,
        canvas_scenes: canvasScenes,
      });

      // Store the output
      set((s) => ({
        agentOutputs: { ...s.agentOutputs, [result.output_key]: result.output_data },
        agents: s.agents.map((a) => a.name === agentName ? { ...a, status: "done" as AgentStatus } : a),
      }));

      // Auto-save so outputs persist across sessions
      _debouncedSave(get);
    } catch (err) {
      set((s) => ({
        agents: s.agents.map((a) => a.name === agentName ? { ...a, status: "error" as AgentStatus } : a),
      }));
      throw err;
    }
  },

  enhanceAssetPrompt: async (assetId, userInstructions) => {
    const state = get();
    const asset = state.keyItems.find((k) => k.id === assetId);
    if (!asset) return;

    const outputs = state.agentOutputs;
    const creativeBrief = outputs.creative_brief as Record<string, unknown> | undefined;
    const concept = (creativeBrief?.concept_summary as string) || "";

    const result = await enhanceAssetPrompt({
      asset_type: asset.type,
      asset_label: asset.label,
      existing_prompt: asset.text_prompt || "",
      concept,
      user_instructions: userInstructions,
    });

    set((s) => ({
      keyItems: s.keyItems.map((k) =>
        k.id === assetId ? { ...k, text_prompt: result.enhanced_prompt } : k
      ),
    }));
  },

  enhanceScenePrompts: async (sceneId, userInstructions) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Gather context from agentOutputs
    const outputs = state.agentOutputs;
    const creativeBrief = outputs.creative_brief as Record<string, unknown> | undefined;
    const concept = (creativeBrief?.concept_summary as string) || "";
    const cameraSpecs = outputs.camera_specs as Record<string, unknown> | undefined;
    const technicalSpecs = (cameraSpecs?.technical_prompt_block as string) || "";
    const lighting = (cameraSpecs?.lighting as string) || "";

    // Gather connected assets: active_cast members + active_setting + product
    const connectedAssets: Record<string, unknown>[] = [];
    const castingBrief = outputs.casting_brief as Record<string, unknown> | undefined;
    const castMembers = (castingBrief?.cast_members as Array<Record<string, string>>) || [];
    for (const name of scene.active_cast || []) {
      const member = castMembers.find((m) => m.name === name);
      if (member) {
        connectedAssets.push({ label: member.name, type: "character", text_prompt: member.visual_prompt || "" });
      }
    }
    if (scene.active_setting === "setting_a" && castingBrief?.setting_a_description) {
      connectedAssets.push({ label: "Setting A", type: "environment", text_prompt: castingBrief.setting_a_description as string });
    }
    if (scene.active_setting === "setting_b" && castingBrief?.setting_b_description) {
      connectedAssets.push({ label: "Setting B", type: "environment", text_prompt: castingBrief.setting_b_description as string });
    }
    const productSpecs = outputs.product_specs as Record<string, unknown> | undefined;
    if (productSpecs?.visual_product_description) {
      connectedAssets.push({ label: "Product", type: "product", text_prompt: productSpecs.visual_product_description as string });
    }

    try {
      const result = await enhancePrompts({
        scene_info: {
          scene_number: scene.scene_number,
          type: scene.type,
          shot_type: scene.shot_type,
          action_movement: scene.action_movement,
          visual_description: scene.visual_description,
        },
        connected_assets: connectedAssets,
        concept,
        technical_specs: technicalSpecs,
        lighting,
        existing_start_prompt: scene.start_image_prompt,
        existing_end_prompt: scene.end_image_prompt,
        user_instructions: userInstructions,
      });

      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId
            ? {
                ...sc,
                start_image_prompt: result.start_image_prompt,
                end_image_prompt: result.end_image_prompt,
              }
            : sc
        ),
      }));
    } catch (err) {
      console.error("[OpenFrame] Prompt enhancement failed:", err);
      set({ error: `Prompt enhancement failed: ${err}` });
    }
  },

  enhanceSceneVideoPrompts: async (sceneId, userInstructions) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Gather context from agentOutputs
    const outputs = state.agentOutputs;
    const creativeBrief = outputs.creative_brief as Record<string, unknown> | undefined;
    const concept = (creativeBrief?.concept_summary as string) || "";
    const cameraSpecs = outputs.camera_specs as Record<string, unknown> | undefined;
    const technicalSpecs = (cameraSpecs?.technical_prompt_block as string) || "";
    const lighting = (cameraSpecs?.lighting as string) || "";

    // Gather connected assets: active_cast members + active_setting + product
    const connectedAssets: Record<string, unknown>[] = [];
    const castingBrief = outputs.casting_brief as Record<string, unknown> | undefined;
    const castMembers = (castingBrief?.cast_members as Array<Record<string, string>>) || [];
    for (const name of scene.active_cast || []) {
      const member = castMembers.find((m) => m.name === name);
      if (member) {
        connectedAssets.push({ label: member.name, type: "character", text_prompt: member.visual_prompt || "" });
      }
    }
    if (scene.active_setting === "setting_a" && castingBrief?.setting_a_description) {
      connectedAssets.push({ label: "Setting A", type: "environment", text_prompt: castingBrief.setting_a_description as string });
    }
    if (scene.active_setting === "setting_b" && castingBrief?.setting_b_description) {
      connectedAssets.push({ label: "Setting B", type: "environment", text_prompt: castingBrief.setting_b_description as string });
    }
    const productSpecs = outputs.product_specs as Record<string, unknown> | undefined;
    if (productSpecs?.visual_product_description) {
      connectedAssets.push({ label: "Product", type: "product", text_prompt: productSpecs.visual_product_description as string });
    }

    try {
      const result = await enhanceVideoPrompts({
        scene_info: {
          scene_number: scene.scene_number,
          type: scene.type,
          shot_type: scene.shot_type,
          visual_type: scene.visual_type || "Standard",
          action_movement: scene.action_movement,
          visual_description: scene.visual_description,
        },
        connected_assets: connectedAssets,
        concept,
        technical_specs: technicalSpecs,
        lighting,
        start_image_prompt: scene.start_image_prompt || "",
        end_image_prompt: scene.end_image_prompt || "",
        existing_start_video_prompt: scene.start_video_prompt || "",
        existing_end_video_prompt: scene.end_video_prompt || "",
        existing_combined_video_prompt: scene.combined_video_prompt || "",
        audio_mode: scene.audio_mode || "silent",
        dialogue: scene.dialogue || "",
        dialogue_speaker: scene.dialogue_speaker || "",
        user_instructions: userInstructions,
      });

      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId
            ? {
                ...sc,
                start_video_prompt: result.start_video_prompt,
                end_video_prompt: result.end_video_prompt,
                combined_video_prompt: result.combined_video_prompt,
              }
            : sc
        ),
      }));
    } catch (err) {
      console.error("[OpenFrame] Video prompt enhancement failed:", err);
      set({ error: `Video prompt enhancement failed: ${err}` });
    }
  },

  updateSceneAudioMode: async (sceneId, userInstructions) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const mode = scene.audio_mode || "silent";

    // If silent, nothing to enhance
    if (mode === "silent") return;

    // Mark as loading
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === sceneId ? { ...sc, scene_audio_status: "generating" as FrameStatus } : sc
      ),
    }));

    // Gather context
    const outputs = state.agentOutputs;
    const creativeBrief = outputs.creative_brief as Record<string, unknown> | undefined;
    const concept = (creativeBrief?.concept_summary as string) || "";
    const castingBrief = outputs.casting_brief as Record<string, unknown> | undefined;
    const castMembers = (castingBrief?.cast_members as Array<Record<string, string>>) || [];

    const connectedAssets: Record<string, unknown>[] = [];
    for (const name of scene.active_cast || []) {
      const member = castMembers.find((m) => m.name === name);
      if (member) {
        connectedAssets.push({ label: member.name, type: "character", text_prompt: member.visual_prompt || "" });
      }
    }
    const productSpecs = outputs.product_specs as Record<string, unknown> | undefined;
    if (productSpecs?.visual_product_description) {
      connectedAssets.push({ label: "Product", type: "product", text_prompt: productSpecs.visual_product_description as string });
    }

    try {
      const result = await enhanceSceneAudio({
        scene_info: {
          scene_number: scene.scene_number,
          type: scene.type,
          shot_type: scene.shot_type,
          action_movement: scene.action_movement,
          visual_description: scene.visual_description,
        },
        connected_assets: connectedAssets,
        concept,
        audio_mode: mode,
        existing_start_video_prompt: scene.start_video_prompt || "",
        existing_end_video_prompt: scene.end_video_prompt || "",
        existing_combined_video_prompt: scene.combined_video_prompt || "",
        existing_dialogue: scene.dialogue || "",
        user_instructions: userInstructions || "",
      });

      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId
            ? {
                ...sc,
                dialogue: result.dialogue,
                dialogue_speaker: result.dialogue_speaker,
                scene_voice_prompt: result.scene_voice_prompt,
                combined_video_prompt: result.combined_video_prompt,
                start_video_prompt: result.start_video_prompt,
                end_video_prompt: result.end_video_prompt,
                scene_audio_status: "idle" as FrameStatus,
              }
            : sc
        ),
      }));
    } catch (err) {
      console.error("[OpenFrame] Scene audio enhancement failed:", err);
      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId ? { ...sc, scene_audio_status: "error" as FrameStatus } : sc
        ),
        error: `Scene audio enhancement failed: ${err}`,
      }));
      throw err; // Re-throw so callers can handle UI feedback
    }
  },

  setProjectAspectRatio: (ratio) => {
    set({ projectAspectRatio: ratio });
  },

  // ── Video Generation ─────────────────────────────
  setVideoPrompt: (sceneId, slot, prompt) => {
    const key = slot === "combined" ? "combined_video_prompt" : slot === "start" ? "start_video_prompt" : "end_video_prompt";
    set((s) => ({
      scenes: s.scenes.map((sc) => sc.id === sceneId ? { ...sc, [key]: prompt } : sc),
    }));
  },

  setVideoMode: (sceneId, mode) => {
    set((s) => ({
      scenes: s.scenes.map((sc) => sc.id === sceneId ? { ...sc, video_mode: mode } : sc),
    }));
  },

  setVideoModel: (sceneId, slot, modelId) => {
    const key = slot === "combined" ? "video_model" : slot === "start" ? "start_video_model" : "end_video_model";
    set((s) => ({
      scenes: s.scenes.map((sc) => sc.id === sceneId ? { ...sc, [key]: modelId } : sc),
    }));
  },

  setVideoDuration: (sceneId, slot, duration) => {
    const key = slot === "combined" ? "video_duration" : slot === "start" ? "start_video_duration" : "end_video_duration";
    set((s) => ({
      scenes: s.scenes.map((sc) => sc.id === sceneId ? { ...sc, [key]: duration } : sc),
    }));
  },

  generateVideo: async (sceneId, slot) => {
    const statusKey = slot === "combined" ? "video_status" : slot === "start" ? "start_video_status" : "end_video_status";
    const errorKey = slot === "combined" ? "video_error" : slot === "start" ? "start_video_error" : "end_video_error";
    const urlKey = slot === "combined" ? "video_url" : slot === "start" ? "start_video_url" : "end_video_url";
    const modelKey = slot === "combined" ? "video_model" : slot === "start" ? "start_video_model" : "end_video_model";
    const durationKey = slot === "combined" ? "video_duration" : slot === "start" ? "start_video_duration" : "end_video_duration";

    try {
      const scene = get().scenes.find((sc) => sc.id === sceneId);
      if (!scene) throw new Error("Scene not found");

      // Pick stored model, or default based on per-slot audio mode
      let selectedModel = slot === "combined" ? scene.video_model : slot === "start" ? scene.start_video_model : scene.end_video_model;
      if (!selectedModel) {
        // Resolve effective audio mode for this slot
        const isSep = scene.video_mode === "separate";
        const slotAudioMode = isSep
          ? (slot === "end" ? scene.end_audio_mode : scene.start_audio_mode) || "silent"
          : scene.audio_mode || "silent";
        if (slotAudioMode === "talking-head") selectedModel = "infinitalk/from-audio";
        else if (slotAudioMode === "audio-native") selectedModel = "kling-3.0/video";
        else selectedModel = "kling-2.6/image-to-video";
      }

      // Persist model selection + audio mode so they survive reloads
      const audioModeKey = slot === "combined" ? "audio_mode"
        : slot === "start" ? "start_audio_mode" : "end_audio_mode";
      const resolvedAudioMode = slot === "combined"
        ? scene.audio_mode || "silent"
        : slot === "start" ? scene.start_audio_mode || "silent"
        : scene.end_audio_mode || "silent";

      // Set generating state with persisted model + audio mode
      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId
            ? { ...sc, [statusKey]: "generating" as const, [errorKey]: undefined, [modelKey]: selectedModel, [audioModeKey]: resolvedAudioMode }
            : sc
        ),
      }));
      const selectedDuration = (slot === "combined" ? scene.video_duration : slot === "start" ? scene.start_video_duration : scene.end_video_duration) || 5;
      const aspectRatio = get().projectAspectRatio || "16:9";

      // Determine images to send
      const imageUrls: string[] = [];
      if (slot === "combined") {
        if (scene.start_frame_image) imageUrls.push(scene.start_frame_image);
        if (scene.end_frame_image) imageUrls.push(scene.end_frame_image);
      } else if (slot === "start" && scene.start_frame_image) {
        imageUrls.push(scene.start_frame_image);
      } else if (slot === "end" && scene.end_frame_image) {
        imageUrls.push(scene.end_frame_image);
      }

      // Build prompt: prefer slot-specific video prompt from director, fallback to visual_description
      const videoPrompt = slot === "combined" ? scene.combined_video_prompt
        : slot === "start" ? scene.start_video_prompt
        : scene.end_video_prompt;
      const prompt = videoPrompt
        ? videoPrompt
        : scene.visual_description
          ? `${scene.visual_description}. ${scene.action_movement || ""}`
          : (slot === "start" ? scene.start_image_prompt : slot === "end" ? scene.end_image_prompt : scene.start_image_prompt) || "cinematic fashion video";

      // 1. Create video task via api.ts (includes API_URL prefix)
      const isInfiniTalk = selectedModel === "infinitalk/from-audio";
      // Pull audio from the correct slot for InfiniTalk
      const audioUrl = isInfiniTalk
        ? (slot === "end" ? scene.end_scene_audio_url : scene.scene_audio_url)
        : undefined;
      const { task_id } = await apiGenerateVideo({
        model: selectedModel,
        prompt,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        audio_url: audioUrl,
        aspect_ratio: aspectRatio === "auto" ? "16:9" : aspectRatio,
        duration: String(selectedDuration),
        resolution: isInfiniTalk ? "480p" : "720p",
      });

      // Persist task for resume-after-refresh
      addPendingTask({
        taskId: task_id, taskType: "video", targetType: "scene", targetId: sceneId,
        statusField: statusKey, urlField: urlKey, errorField: errorKey,
        model: selectedModel, createdAt: Date.now(),
      });

      // 2. Poll for result
      const POLL_INTERVAL = 5000;
      const MAX_POLLS = 180; // 15 minutes max
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        // Check if scene still exists and is still generating (user may have deleted)
        const current = get().scenes.find((sc) => sc.id === sceneId);
        if (!current) { removePendingTask(task_id); return; }
        const curStatus = slot === "combined" ? current.video_status : slot === "start" ? current.start_video_status : current.end_video_status;
        if (curStatus !== "generating") { removePendingTask(task_id); return; }

        let taskFailed: Error | null = null;
        try {
          const st = await getVideoTaskStatus(task_id);

          if (st.state === "success" && st.result_urls?.length) {
            removePendingTask(task_id);
            set((s) => ({
              scenes: s.scenes.map((sc) =>
                sc.id === sceneId
                  ? { ...sc, [statusKey]: "done" as const, [urlKey]: st.result_urls![0], [modelKey]: selectedModel, [errorKey]: undefined }
                  : sc
              ),
            }));
            _debouncedSave(get);
            return;
          }

          if (st.state === "fail") {
            taskFailed = new Error(st.error_message || "Video generation failed");
          }
        } catch {
          // Transient network error — keep polling
        }
        if (taskFailed) throw taskFailed;
        // state === "waiting" → keep polling
      }
      throw new Error("Video generation timed out after 15 minutes");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown video generation error";
      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId ? { ...sc, [statusKey]: "error" as const, [errorKey]: msg } : sc
        ),
      }));
    }
  },

  deleteVideo: (sceneId, slot) => {
    if (slot === "combined") {
      set((s) => ({
        scenes: s.scenes.map((sc) => sc.id === sceneId
          ? { ...sc, video_status: "idle" as const, video_url: undefined, video_error: undefined } : sc),
      }));
    } else {
      const statusKey = slot === "start" ? "start_video_status" : "end_video_status";
      const urlKey = slot === "start" ? "start_video_url" : "end_video_url";
      const errorKey = slot === "start" ? "start_video_error" : "end_video_error";
      set((s) => ({
        scenes: s.scenes.map((sc) => sc.id === sceneId
          ? { ...sc, [statusKey]: "idle" as const, [urlKey]: undefined, [errorKey]: undefined } : sc),
      }));
    }
    _debouncedSave(get);
  },

  generateSceneVoiceover: async (sceneId, slot = "combined") => {
    const scene = get().scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    // Slot-aware field access
    const p = slot === "end" ? "end_" : "";
    const r = scene as unknown as Record<string, unknown>;
    const dialogue = r[`${p}dialogue`] as string | undefined;
    if (!dialogue?.trim()) return;

    const statusField = `${p}scene_audio_status`;
    const urlField = `${p}scene_audio_url`;

    // Set generating state
    set((s) => ({
      scenes: s.scenes.map((sc) =>
        sc.id === sceneId ? { ...sc, [statusField]: "generating" as FrameStatus } : sc
      ),
    }));

    try {
      const voiceName = (r[`${p}voice_id`] as string) || "Sarah";
      const taskResult = await generateVoiceover(
        dialogue,
        voiceName,
        (r[`${p}voice_stability`] as number) ?? 0.5,
        (r[`${p}voice_similarity`] as number) ?? 0.75,
        (r[`${p}voice_style`] as number) ?? 0,
        (r[`${p}voice_speed`] as number) ?? 1,
        (r[`${p}voice_language`] as string) || "",
      );

      // Persist task for resume-after-refresh
      addPendingTask({
        taskId: taskResult.task_id, taskType: "audio", targetType: "scene", targetId: sceneId,
        statusField: statusField, urlField: urlField, errorField: undefined,
        historyField: `${p}scene_audio_history`,
        createdAt: Date.now(),
      });

      // Poll for result
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const status = await getAudioTaskStatus(taskResult.task_id);

        if (status.state === "success" && status.result_urls?.length) {
          removePendingTask(taskResult.task_id);
          const historyField = `${p}scene_audio_history`;
          set((s) => ({
            scenes: s.scenes.map((sc) => {
              if (sc.id !== sceneId) return sc;
              const oldUrl = (sc as unknown as Record<string, unknown>)[urlField] as string | undefined;
              const oldHistory = ((sc as unknown as Record<string, unknown>)[historyField] as string[] | undefined) || [];
              const newHistory = oldUrl && oldUrl !== status.result_urls![0]
                ? [...oldHistory, oldUrl]
                : oldHistory;
              return { ...sc, [urlField]: status.result_urls![0], [statusField]: "done" as FrameStatus, [historyField]: newHistory };
            }),
          }));
          _debouncedSave(get);
          return;
        }

        if (status.state === "fail") {
          throw new Error(status.error_message || "Voice generation failed");
        }
      }
      throw new Error("Voice generation timed out");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Voice generation failed";
      set((s) => ({
        scenes: s.scenes.map((sc) =>
          sc.id === sceneId ? { ...sc, [statusField]: "error" as FrameStatus } : sc
        ),
        error: msg,
      }));
    }
  },

  // ── Manual card creation ──────────────────────────────
  addKeyItem: (type) => {
    const ts = Date.now().toString(36);
    const LABELS: Record<AssetType, string> = {
      character: "Cast Member",
      environment: "Setting",
      product: "Product",
      camera: "Camera",
      voiceover: "Voiceover",
      music: "Music",
      image: "Image",
      video: "Video",
    };
    const id = `${type}-${ts}`;
    const newItem: KeyItem = {
      id,
      type,
      label: LABELS[type] || type,
      text_prompt: "",
    };
    set((s) => ({ keyItems: [...s.keyItems, newItem] }));
    _debouncedSave(get);
    return id;
  },

  addScene: () => {
    const id = `scene-${Date.now().toString(36)}`;
    const nextNum = (get().scenes.length > 0 ? Math.max(...get().scenes.map((s) => s.scene_number)) : 0) + 1;
    const newScene: Scene = {
      id,
      scene_number: nextNum,
      type: "custom",
      shot_type: "medium",
      visual_description: "",
      action_movement: "",
      start_image_prompt: "",
      end_image_prompt: "",
      start_frame_status: "idle",
      end_frame_status: "idle",
    };
    set((s) => ({ scenes: [...s.scenes, newScene] }));
    _debouncedSave(get);
    return id;
  },

  removeKeyItem: (id) => {
    set((s) => ({ keyItems: s.keyItems.filter((k) => k.id !== id) }));
    _debouncedSave(get);
  },

  removeScene: (id) => {
    set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id) }));
    _debouncedSave(get);
  },

  resumePendingTasks: () => {
    const tasks = loadPendingTasks();
    if (tasks.length === 0) return;
    console.log(`[TaskRegistry] Resuming ${tasks.length} pending task(s)…`);
    for (const task of tasks) {
      pollAndComplete(task, get, set).catch((err) => {
        console.warn(`[TaskRegistry] Resume failed for ${task.taskId}:`, err);
      });
    }
  },

  reset: () => {
    const unsub = get().unsubscribe;
    if (unsub) unsub();
    set({
      view: "projects",
      workflowId: null,
      userInput: "",
      adType: null,
      isRunning: false,
      agents: DEFAULT_AGENTS.map((a) => ({ ...a, status: "idle" as AgentStatus })),
      keyItems: [],
      scenes: [],
      agentOutputs: {},
      error: null,
      unsubscribe: null,
    });
  },
}));
