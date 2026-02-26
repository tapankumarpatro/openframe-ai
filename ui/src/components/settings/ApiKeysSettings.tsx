"use client";

import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchKeysStatus, saveApiKeys } from "@/lib/api";

const AGENT_PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", url: "https://openrouter.ai/keys" },
];

const MEDIA_PROVIDERS = [
  { id: "kie.ai", label: "kie.ai", url: "https://kie.ai" },
];

const LOCAL_STORAGE_KEY = "openframe-api-keys";

interface StoredKeys {
  agent_provider: string;
  agent_api_key: string;
  media_provider: string;
  media_api_key: string;
  imgbb_api_key: string;
}

function loadStoredKeys(): StoredKeys {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return { ...defaultKeys(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultKeys();
}

function defaultKeys(): StoredKeys {
  return {
    agent_provider: "openrouter",
    agent_api_key: "",
    media_provider: "kie.ai",
    media_api_key: "",
    imgbb_api_key: "",
  };
}

function persistKeys(keys: StoredKeys) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(keys));
  } catch { /* ignore */ }
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 5) return key;
  return key.slice(0, 5) + "•".repeat(Math.min(key.length - 5, 16));
}

export default function ApiKeysSettingsTab() {
  const [agentProvider, setAgentProvider] = useState("openrouter");
  const [agentKey, setAgentKey] = useState("");
  const [mediaProvider, setMediaProvider] = useState("kie.ai");
  const [mediaKey, setMediaKey] = useState("");
  const [showAgentKey, setShowAgentKey] = useState(false);
  const [showMediaKey, setShowMediaKey] = useState(false);
  const [imgbbKey, setImgbbKey] = useState("");
  const [showImgbbKey, setShowImgbbKey] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [backendStatus, setBackendStatus] = useState<{ agent_key_set: boolean; media_key_set: boolean; imgbb_key_set: boolean; agent_key_preview?: string; media_key_preview?: string; imgbb_key_preview?: string } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadStoredKeys();
    setAgentProvider(stored.agent_provider);
    setAgentKey(stored.agent_api_key);
    setMediaProvider(stored.media_provider);
    setMediaKey(stored.media_api_key);
    setImgbbKey(stored.imgbb_api_key);

    // Also check backend status
    fetchKeysStatus()
      .then((s) => setBackendStatus({
        agent_key_set: s.agent_key_set,
        media_key_set: s.media_key_set,
        imgbb_key_set: s.imgbb_key_set,
        agent_key_preview: s.agent_key_preview || "",
        media_key_preview: s.media_key_preview || "",
        imgbb_key_preview: s.imgbb_key_preview || "",
      }))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      // Persist to localStorage
      const keys: StoredKeys = {
        agent_provider: agentProvider,
        agent_api_key: agentKey,
        media_provider: mediaProvider,
        media_api_key: mediaKey,
        imgbb_api_key: imgbbKey,
      };
      persistKeys(keys);

      // Send to backend
      const status = await saveApiKeys({
        agent_provider: agentProvider,
        agent_api_key: agentKey || undefined,
        media_provider: mediaProvider,
        media_api_key: mediaKey || undefined,
        imgbb_api_key: imgbbKey || undefined,
      });
      setBackendStatus({ agent_key_set: status.agent_key_set, media_key_set: status.media_key_set, imgbb_key_set: status.imgbb_key_set });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <Key className="w-4 h-4 text-accent-primary" />
        <h3 className="text-[15px] font-semibold text-foreground">API Keys</h3>
      </div>
      <p className="text-[12px] text-muted mb-5 leading-relaxed">
        Provide your API keys to power the AI agents and media generation. Keys are stored locally in your browser and sent to the backend securely.
      </p>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Row 1: Agent Work Provider */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-[13px] font-semibold text-foreground">Agent Work Provider</span>
            {backendStatus && (
              <span className={cn(
                "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full",
                backendStatus.agent_key_set
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              )}>
                {backendStatus.agent_key_set ? "Key configured" : "No key set"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-3 items-start">
            <div>
              <label className="text-[10px] text-muted font-medium mb-1 block">Provider</label>
              <select
                value={agentProvider}
                onChange={(e) => setAgentProvider(e.target.value)}
                className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-accent-primary/50 cursor-pointer"
              >
                {AGENT_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted font-medium mb-1 block">API Key</label>
              <div className="relative">
                <input
                  type="text"
                  value={editingField === "agent" || showAgentKey ? agentKey : (agentKey ? maskKey(agentKey) : "")}
                  onChange={(e) => setAgentKey(e.target.value)}
                  onFocus={() => setEditingField("agent")}
                  onBlur={() => setEditingField(null)}
                  placeholder={!agentKey && backendStatus?.agent_key_preview ? backendStatus.agent_key_preview : "sk-or-v1-..."}
                  className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 pr-9 text-foreground outline-none focus:border-accent-primary/50 font-mono placeholder:text-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowAgentKey(!showAgentKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showAgentKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted mt-1">
                Get your key at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
                  openrouter.ai/keys
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Media Generation Provider */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[13px] font-semibold text-foreground">Media Generation Provider</span>
            {backendStatus && (
              <span className={cn(
                "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full",
                backendStatus.media_key_set
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              )}>
                {backendStatus.media_key_set ? "Key configured" : "No key set"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-3 items-start">
            <div>
              <label className="text-[10px] text-muted font-medium mb-1 block">Provider</label>
              <select
                value={mediaProvider}
                onChange={(e) => setMediaProvider(e.target.value)}
                className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-accent-primary/50 cursor-pointer"
              >
                {MEDIA_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted font-medium mb-1 block">API Key</label>
              <div className="relative">
                <input
                  type="text"
                  value={editingField === "media" || showMediaKey ? mediaKey : (mediaKey ? maskKey(mediaKey) : "")}
                  onChange={(e) => setMediaKey(e.target.value)}
                  onFocus={() => setEditingField("media")}
                  onBlur={() => setEditingField(null)}
                  placeholder={!mediaKey && backendStatus?.media_key_preview ? backendStatus.media_key_preview : "kie-..."}
                  className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 pr-9 text-foreground outline-none focus:border-accent-primary/50 font-mono placeholder:text-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowMediaKey(!showMediaKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showMediaKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted mt-1">
                Used for image &amp; video generation (Seedream, Kling, Veo, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Row 3: Image Hosting (ImageBB) */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[13px] font-semibold text-foreground">Image Hosting (ImageBB)</span>
            {backendStatus && (
              <span className={cn(
                "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full",
                backendStatus.imgbb_key_set
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-neutral-50 text-neutral-400"
              )}>
                {backendStatus.imgbb_key_set ? "Key configured" : "Optional"}
              </span>
            )}
          </div>
          <div>
            <label className="text-[10px] text-muted font-medium mb-1 block">API Key</label>
            <div className="relative">
              <input
                type="text"
                value={editingField === "imgbb" || showImgbbKey ? imgbbKey : (imgbbKey ? maskKey(imgbbKey) : "")}
                onChange={(e) => setImgbbKey(e.target.value)}
                onFocus={() => setEditingField("imgbb")}
                onBlur={() => setEditingField(null)}
                placeholder={!imgbbKey && backendStatus?.imgbb_key_preview ? backendStatus.imgbb_key_preview : "imgbb-..."}
                className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 pr-9 text-foreground outline-none focus:border-accent-primary/50 font-mono placeholder:text-muted/50"
              />
              <button
                type="button"
                onClick={() => setShowImgbbKey(!showImgbbKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                {showImgbbKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted mt-1">
              Optional — for persistent image hosting. Get a free key at{" "}
              <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
                api.imgbb.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer — Save */}
      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
        <div className="text-[11px] text-muted">
          {saveStatus === "success" && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle className="w-3.5 h-3.5" /> Keys saved successfully
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3.5 h-3.5" /> Failed to save — check backend connection
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-semibold transition-all",
            saving
              ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
              : "bg-[#122d31] text-white hover:bg-[#1a3f44] active:scale-[0.97] shadow-sm"
          )}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saving ? "Saving…" : "Save Keys"}
        </button>
      </div>
    </div>
  );
}
