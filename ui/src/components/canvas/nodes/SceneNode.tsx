"use client";

import { memo, useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Loader2, ChevronDown, Film, Upload,
  Expand, Copy, Trash2, Download,
  ChevronUp, History, Check, Bot, Send, X,
  AlertTriangle, Video, Clapperboard,
  ArrowRight, Search, Sparkles, Mic, VolumeX, Volume2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { compressImageFile } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import type { FrameStatus, VideoStatus, VideoMode, AudioMode } from "@/types/schema";
import ProFeatureGate from "@/components/ui/ProFeatureGate";

function isValidSrc(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("blob:")) return false;
  return true;
}

const AR_MAP: Record<string, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
  "4:3": 4 / 3,
};

const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "4:3"];

type SceneNodeData = {
  sceneId: string;
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
  start_frame_error?: string;
  end_frame_status: FrameStatus;
  end_frame_image?: string;
  end_frame_history?: string[];
  end_frame_model?: string;
  end_frame_error?: string;
  start_video_prompt?: string;
  end_video_prompt?: string;
  combined_video_prompt?: string;
  aspect_ratio?: string;
  // Per-scene audio
  audio_mode?: AudioMode;
  start_audio_mode?: AudioMode;
  end_audio_mode?: AudioMode;
  dialogue?: string;
  dialogue_speaker?: string;
  scene_voice_prompt?: string;
  voice_id?: string;
  scene_audio_url?: string;
  scene_audio_status?: FrameStatus;
  end_scene_audio_url?: string;
  // Video
  video_mode?: VideoMode;
  video_status?: VideoStatus;
  video_url?: string;
  video_model?: string;
  video_error?: string;
  video_duration?: number;
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
};

const IMAGE_MODELS = [
  { id: "seedream/4.5",      label: "Seedream 4.5",        qualities: ["basic", "high"],       supportsImageInput: true },
  { id: "nano-banana/pro",   label: "Nano Banana Pro",     qualities: ["1K", "2K", "4K"],      supportsImageInput: true },
  { id: "gpt-image/1.5-i2i", label: "GPT Image 1.5 i2i",  qualities: ["medium", "high"],      supportsImageInput: true },
  { id: "z-image/1.0",       label: "Z Image",             qualities: [],                      supportsImageInput: false },
];

async function downloadImage(url: string, filename: string) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    navigator.clipboard.writeText(url);
  }
}

/* ---------- Model Picker Popover (portal-based to escape node overflow) ---------- */
function ModelPicker<T extends { id: string; label: string }>({
  models,
  selected,
  onSelect,
  className,
}: {
  models: T[];
  selected: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const selectedLabel = models.find((m) => m.id === selected)?.label || selected;

  // Position the portal dropdown below the button
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Close on outside click (check both button and portal dropdown)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (dropRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search
    ? models.filter((m) => m.label.toLowerCase().includes(search.toLowerCase()))
    : models;

  return (
    <div className={cn("nodrag nowheel", className)}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-neutral-200/80 text-[9px] font-medium text-neutral-700 hover:bg-white transition-all shadow-sm"
      >
        <Sparkles className="w-3 h-3 text-violet-400" />
        <span className="truncate max-w-[80px]">{selectedLabel}</span>
        <ChevronDown className="w-2.5 h-2.5 text-neutral-400" />
      </button>
      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropRef}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed w-52 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden nodrag nowheel"
            style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          >
            {/* Search */}
            <div className="p-2 border-b border-neutral-100">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200">
                <Search className="w-3 h-3 text-neutral-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="text-[10px] bg-transparent outline-none flex-1 text-foreground placeholder:text-neutral-300"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {/* Model list */}
            <div className="max-h-48 overflow-y-auto py-1 nowheel">
              {filtered.length === 0 && (
                <p className="text-[10px] text-neutral-400 px-3 py-2">No models found</p>
              )}
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={(e) => { e.stopPropagation(); onSelect(m.id); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors",
                    m.id === selected
                      ? "bg-violet-50 text-violet-700 font-medium"
                      : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <Sparkles className="w-3 h-3 text-violet-300 shrink-0" />
                  <span className="truncate">{m.label}</span>
                  {m.id === selected && <Check className="w-3 h-3 text-violet-500 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ---------- Per-frame card (Freepik-style: prompt on image, controls on hover) ---------- */
function FrameCard({
  sceneId,
  frame,
  prompt,
  status,
  image,
  history,
  model,
  error,
  color,
  aspectRatio,
}: {
  sceneId: string;
  frame: "start" | "end";
  prompt: string;
  status: FrameStatus;
  image?: string;
  history?: string[];
  model?: string;
  error?: string;
  color: string;
  aspectRatio?: string;
}) {
  const generateFrame = useStore((s) => s.generateFrame);
  const getMissingReferences = useStore((s) => s.getMissingReferences);
  const deleteFrameImage = useStore((s) => s.deleteFrameImage);
  const setFrameImage = useStore((s) => s.setFrameImage);
  const selectFrameFromHistory = useStore((s) => s.selectFrameFromHistory);
  const updateFramePrompt = useStore((s) => s.updateFramePrompt);
  const [promptOpen, setPromptOpen] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [missingRefs, setMissingRefs] = useState<{ name: string; type: string }[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const label = frame === "start" ? "Start Frame" : "End Frame";
  const isGenerating = status === "generating";
  const isError = status === "error";
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [image]);
  const hasImage = isValidSrc(image) && !imgError;
  const historyItems = (history || []).filter(isValidSrc);
  const selectedModel = model || "seedream/4.5";
  const modelMeta = IMAGE_MODELS.find((m) => m.id === selectedModel) || IMAGE_MODELS[0];

  const allScenes = useStore((s) => s.scenes);
  const sceneData = allScenes.find((s) => s.id === sceneId);
  const qualityField = frame === "start" ? "start_frame_quality" : "end_frame_quality";
  const selectedQuality = (sceneData as unknown as Record<string, unknown>)?.[qualityField] as string | undefined
    || (modelMeta.qualities[0] ?? "basic");

  const handleGenerate = () => {
    const missing = getMissingReferences(sceneId);
    if (missing.length > 0) { setMissingRefs(missing); return; }
    setMissingRefs(null);
    generateFrame(sceneId, frame);
  };
  const handleGenerateAnyway = () => { setMissingRefs(null); generateFrame(sceneId, frame); };

  const setFrameModel = (modelId: string) => {
    const modelKey = frame === "start" ? "start_frame_model" : "end_frame_model";
    const qKey = frame === "start" ? "start_frame_quality" : "end_frame_quality";
    const meta = IMAGE_MODELS.find((m) => m.id === modelId) || IMAGE_MODELS[0];
    useStore.setState((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [modelKey]: modelId, [qKey]: meta.qualities[0] || "basic" } : s
      ),
    }));
  };
  const setFrameQuality = (q: string) => {
    const qKey = frame === "start" ? "start_frame_quality" : "end_frame_quality";
    useStore.setState((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [qKey]: q } : s
      ),
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setFrameImage(sceneId, frame, dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === "string") setFrameImage(sceneId, frame, reader.result); };
      reader.readAsDataURL(file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const arNum = aspectRatio && aspectRatio !== "auto" ? AR_MAP[aspectRatio] : null;

  return (
    <div className="flex-1 min-w-0">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Frame label */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        {isGenerating && (
          <span className="text-[9px] text-accent-primary ml-auto flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Generating
          </span>
        )}
      </div>

      {/* ── Image area — the main visual container ── */}
      <div
        className="relative rounded-xl overflow-hidden bg-neutral-100/80 group"
        style={arNum ? { aspectRatio: `${arNum}` } : { minHeight: 140 }}
      >
        {/* Image */}
        {hasImage && !isGenerating && (
          <motion.img
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src={image}
            alt={label}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}

        {/* Generating spinner */}
        {isGenerating && (
          <div className="absolute inset-0 rainbow-border rounded-xl p-[3px]">
            <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-1.5">
                <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                <span className="text-[10px] text-muted">Generating…</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty state + prompt overlay (light bg, same layout as after-image overlay) */}
        {!hasImage && !isGenerating && (
          <div
            className={cn(
              "absolute inset-0 z-20 flex flex-col transition-all duration-300 ease-out",
              promptOpen ? "bg-white/95 backdrop-blur-[2px] justify-end" : "justify-end cursor-pointer"
            )}
            onClick={() => { if (!promptOpen) setPromptOpen(true); else setPromptOpen(false); }}
          >
            {!promptOpen ? (
              <>
                <div className="flex-1 flex flex-col items-center justify-center text-neutral-300">
                  <Film className="w-5 h-5 mb-1" />
                  <span className="text-[9px]">No image yet</span>
                </div>
                <div className="bg-gradient-to-t from-neutral-200/80 via-neutral-100/40 to-transparent pt-6 pb-2 px-2.5" title="Click to edit prompt">
                  <p className="text-[9px] text-neutral-600 leading-relaxed line-clamp-2">
                    {prompt || "Click to add prompt…"}
                  </p>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="p-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  autoFocus
                  className="nodrag nowheel w-full text-[10px] text-neutral-700 leading-relaxed bg-neutral-50 border border-neutral-200 rounded-lg p-2 resize-none min-h-[56px] max-h-32 outline-none focus:border-accent-primary/50 placeholder:text-neutral-400"
                  value={prompt}
                  onChange={(e) => updateFramePrompt(sceneId, frame, e.target.value)}
                  rows={3}
                  placeholder="Describe the frame…"
                />
                <div className="flex items-center gap-2.5 mt-1.5">
                  <button
                    onClick={() => { if (prompt) navigator.clipboard.writeText(prompt); }}
                    className="text-[9px] text-neutral-400 hover:text-neutral-700 transition-colors flex items-center gap-1"
                    title="Copy prompt"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </button>
                  <button
                    onClick={() => setPromptOpen(false)}
                    className="text-[9px] text-neutral-400 hover:text-neutral-700 transition-colors ml-auto font-medium"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Prompt tray overlay (slides up from bottom, stays inside image) ── */}
        {hasImage && !isGenerating && (
          <div
            className={cn(
              "absolute bottom-0 inset-x-0 transition-all duration-300 ease-out z-20 flex flex-col justify-end",
              promptOpen ? "top-0 bg-black/60 backdrop-blur-[2px]" : "bg-gradient-to-t from-black/70 via-black/40 to-transparent cursor-pointer"
            )}
            onClick={() => { if (!promptOpen) setPromptOpen(true); else setPromptOpen(false); }}
          >
            {!promptOpen ? (
              /* Collapsed: 2-line preview */
              <div className="pt-8 pb-2 px-2.5" title="Click to edit prompt">
                <p className="text-[9px] text-white/90 leading-relaxed line-clamp-2 drop-shadow-sm">
                  {prompt || "Click to add prompt…"}
                </p>
              </div>
            ) : (
              /* Expanded: editable tray that slid up */
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="p-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  autoFocus
                  className="nodrag nowheel w-full text-[10px] text-white leading-relaxed bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 resize-none min-h-[56px] max-h-32 outline-none focus:border-white/40 placeholder:text-white/40"
                  value={prompt}
                  onChange={(e) => updateFramePrompt(sceneId, frame, e.target.value)}
                  rows={3}
                  placeholder="Describe the frame…"
                />
                <div className="flex items-center gap-2.5 mt-1.5">
                  <button
                    onClick={() => { if (prompt) navigator.clipboard.writeText(prompt); }}
                    className="text-[9px] text-white/60 hover:text-white transition-colors flex items-center gap-1"
                    title="Copy prompt"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </button>
                  <button
                    onClick={() => setPromptOpen(false)}
                    className="text-[9px] text-white/60 hover:text-white transition-colors ml-auto font-medium"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Hover action icons — top right corner ── */}
        {hasImage && !isGenerating && !promptOpen && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
            {[
              { icon: Expand, title: "Expand", onClick: () => setExpandedView(true) },
              { icon: Download, title: "Download", onClick: () => image && downloadImage(image, `scene-${sceneId}-${frame}.png`) },
              { icon: Copy, title: "Copy URL", onClick: () => image && navigator.clipboard.writeText(image) },
              { icon: Trash2, title: "Delete", onClick: () => deleteFrameImage(sceneId, frame), danger: true },
            ].map(({ icon: Ic, title, onClick, danger }) => (
              <button
                key={title}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className={cn(
                  "p-1 rounded-md bg-white/80 backdrop-blur-sm text-neutral-600 transition-all shadow-sm",
                  danger ? "hover:bg-red-50 hover:text-red-500" : "hover:bg-white hover:text-neutral-800"
                )}
                title={title}
              >
                <Ic className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

      </div>

      {/* ── Action buttons below image (always visible, never overlapping) ── */}
      {!isGenerating && (
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <ModelPicker
            models={IMAGE_MODELS}
            selected={selectedModel}
            onSelect={setFrameModel}
          />
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[#122d31] text-white hover:bg-[#1a3f44] transition-all active:scale-[0.97]"
          >
            <Play className="w-3 h-3" />
            Generate
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium bg-neutral-100 text-muted hover:bg-neutral-200 hover:text-foreground transition-all"
          >
            <Upload className="w-3 h-3" />
          </button>
          {historyItems.length >= 1 && (
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ml-auto",
                historyOpen ? "bg-amber-50 text-amber-600" : "bg-neutral-100 text-muted hover:bg-neutral-200"
              )}
            >
              <History className="w-3 h-3" />
              {historyItems.length}
            </button>
          )}
        </div>
      )}


      {/* Expanded view lightbox */}
      {expandedView && hasImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setExpandedView(false)}
        >
          <img src={image} alt={label} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
        </motion.div>
      )}

      {/* Error */}
      {isError && error && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-500">
          <X className="w-3 h-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Missing reference warning */}
      {missingRefs && missingRefs.length > 0 && (
        <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2">
          <div className="flex items-start gap-1.5 text-[10px] text-amber-600 mb-1">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="font-semibold">Missing references</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2 pl-4">
            {missingRefs.map((ref, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 text-[9px] text-amber-700 font-medium">
                {ref.type}: {ref.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 pl-4">
            <button onClick={handleGenerateAnyway} className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all">
              Generate Anyway
            </button>
            <button onClick={() => setMissingRefs(null)} className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-neutral-100 text-muted hover:text-foreground transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* History strip */}
      {historyOpen && historyItems.length >= 1 && (
        <div className="mt-1.5">
          <div className="flex gap-1.5 overflow-x-auto nodrag nowheel pb-1">
            {historyItems.map((url, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); selectFrameFromHistory(sceneId, frame, url); }}
                className={cn(
                  "relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  url === image
                    ? "border-accent-primary shadow-sm"
                    : "border-neutral-200 opacity-60 hover:opacity-100 hover:border-accent-primary/40"
                )}
              >
                <img src={url} alt={`v${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
                {url === image && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="w-3 h-3 text-white drop-shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Video models (kie.ai backed) ---------- */
const VIDEO_MODELS: {
  id: string;
  label: string;
  type: "i2v" | "t2v" | "both" | "talking";
  durations: number[];
  supportsImageInput: boolean;
  maxImages: number;
  needsAudio?: boolean;        // requires audio_url (InfiniTalk)
  hasBuiltinAudio?: boolean;   // model generates audio natively
  comingSoon?: boolean;
}[] = [
  // Talking-head only
  { id: "infinitalk/from-audio",                  label: "InfiniTalk",              type: "talking", durations: [15], supportsImageInput: true, maxImages: 1, needsAudio: true },
  // Audio-native (built-in audio models)
  { id: "kling-3.0/video",                        label: "Kling 3.0",               type: "both", durations: [5], supportsImageInput: true,  maxImages: 2, hasBuiltinAudio: true },
  { id: "veo3_fast",                              label: "Veo 3.1 Fast",            type: "both", durations: [8], supportsImageInput: true,  maxImages: 2, hasBuiltinAudio: true },
  { id: "veo3",                                   label: "Veo 3.1 Quality",         type: "both", durations: [8], supportsImageInput: true,  maxImages: 2, hasBuiltinAudio: true },
  { id: "bytedance/seedance-2-i2v",               label: "Seedance 2",              type: "i2v",  durations: [5], supportsImageInput: true,  maxImages: 1, hasBuiltinAudio: true, comingSoon: true },
  // Standard video models (silent / general)
  { id: "kling/v2-5-turbo-image-to-video-pro",     label: "Kling 2.5 Turbo i2v Pro",  type: "i2v",  durations: [5, 10], supportsImageInput: true,  maxImages: 2 },
  { id: "kling-2.6/image-to-video",               label: "Kling 2.6 i2v",           type: "i2v",  durations: [5, 10], supportsImageInput: true,  maxImages: 1 },
  { id: "bytedance/v1-pro-fast-image-to-video",   label: "Seedance Fast i2v",        type: "i2v",  durations: [5, 10], supportsImageInput: true,  maxImages: 1 },
  { id: "bytedance/seedance-1.5-pro",             label: "Seedance 1.5 Pro",         type: "both", durations: [4, 8, 12], supportsImageInput: true,  maxImages: 2 },
  { id: "hailuo/02-text-to-video-pro",            label: "Hailuo 02 Pro",            type: "t2v",  durations: [5], supportsImageInput: false, maxImages: 0 },
  { id: "wan/2-6-text-to-video",                  label: "Wan 2.6 t2v",              type: "t2v",  durations: [5, 10, 15], supportsImageInput: false, maxImages: 0 },
  { id: "sora-2-pro-text-to-video",               label: "Sora 2 Pro",               type: "t2v",  durations: [10, 15], supportsImageInput: false, maxImages: 0 },
  { id: "kling/v2-5-turbo-text-to-video-pro",     label: "Kling 2.5 Turbo Pro",      type: "t2v",  durations: [5, 10], supportsImageInput: false, maxImages: 0 },
];

// Model IDs allowed per audio mode
const TALKING_HEAD_MODELS = new Set(["infinitalk/from-audio"]);
const AUDIO_NATIVE_MODELS = new Set(["kling-3.0/video", "veo3_fast", "veo3", "bytedance/seedance-2-i2v"]);

function getModelsForAudioMode(audioMode: AudioMode) {
  if (audioMode === "talking-head") return VIDEO_MODELS.filter((m) => TALKING_HEAD_MODELS.has(m.id));
  if (audioMode === "audio-native") return VIDEO_MODELS.filter((m) => AUDIO_NATIVE_MODELS.has(m.id));
  // silent — all except talking-head-only and coming-soon
  return VIDEO_MODELS.filter((m) => !m.needsAudio && !m.comingSoon);
}

/* ---------- Per-slot video mini section ---------- */
function VideoSlot({
  sceneId,
  slot,
  label,
  status,
  videoUrl,
  model,
  error,
  duration,
  sourceImage,
  endImage,
  audioMode = "silent",
  sceneAudioUrl,
}: {
  sceneId: string;
  slot: "combined" | "start" | "end";
  label: string;
  status: VideoStatus;
  videoUrl?: string;
  model?: string;
  error?: string;
  duration?: number;
  sourceImage?: string;
  endImage?: string;
  audioMode?: AudioMode;
  sceneAudioUrl?: string;
}) {
  const generateVideo = useStore((s) => s.generateVideo);
  const setVideoModel = useStore((s) => s.setVideoModel);
  const setVideoDuration = useStore((s) => s.setVideoDuration);
  const deleteVideo = useStore((s) => s.deleteVideo);
  const projectAspectRatio = useStore((s) => s.projectAspectRatio);
  const setProjectAspectRatio = useStore((s) => s.setProjectAspectRatio);
  const proUser = useStore((s) => s.isPro)();

  const hasEndImg = endImage && isValidSrc(endImage);
  // Filter models by audio mode first — show all compatible models regardless of image count
  const modeModels = getModelsForAudioMode(audioMode);
  const availableModels = modeModels;
  const selectedModel = model || availableModels[0]?.id || VIDEO_MODELS[0].id;
  const modelMeta = availableModels.find((m) => m.id === selectedModel) || availableModels[0] || VIDEO_MODELS[0];
  const selectedDuration = duration || modelMeta.durations[0];
  const isGenerating = status === "generating";
  const hasVideo = status === "done" && !!videoUrl;
  const hasSourceImage = sourceImage && isValidSrc(sourceImage);
  const needsAudio = modelMeta?.needsAudio;
  const hasAudio = sceneAudioUrl && isValidSrc(sceneAudioUrl);
  const isComingSoon = modelMeta?.comingSoon;
  const canGenerate = hasSourceImage && (!needsAudio || hasAudio) && !isComingSoon;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Video className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[10px] font-semibold text-neutral-600">{label}</span>
        {isGenerating && (
          <span className="text-[9px] text-accent-primary ml-auto flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Generating
          </span>
        )}
        {hasVideo && <span className="text-[9px] text-emerald-500 ml-auto font-medium">Done</span>}
      </div>

      {/* Video player */}
      {hasVideo && (
        <div className="rounded-xl overflow-hidden bg-black/5 border border-neutral-200">
          <video
            src={videoUrl}
            controls
            controlsList={proUser ? undefined : "nodownload"}
            onContextMenu={proUser ? undefined : (e) => e.preventDefault()}
            className="w-full rounded-xl"
            style={{ maxHeight: 220 }}
          />
        </div>
      )}

      {/* Generating spinner */}
      {isGenerating && (
        <div className="rainbow-border rounded-xl p-[3px]">
          <div className="w-full bg-white rounded-[9px] flex items-center justify-center py-6">
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              <span className="text-[9px] text-muted">Creating video…</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && error && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[9px] text-red-500">
          <X className="w-3 h-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Controls */}
      {!isGenerating && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ModelPicker
              models={availableModels}
              selected={selectedModel}
              onSelect={(id) => setVideoModel(sceneId, slot, id)}
            />
            <select
              value={selectedDuration}
              onChange={(e) => setVideoDuration(sceneId, slot, Number(e.target.value))}
              className="nodrag nowheel text-[9px] bg-white border border-neutral-200 rounded-lg px-1.5 py-1 text-neutral-600 outline-none focus:border-violet-300 cursor-pointer shadow-sm"
            >
              {modelMeta.durations.map((d) => (
                <option key={d} value={d}>{d}s</option>
              ))}
            </select>
            <select
              value={projectAspectRatio === "auto" ? "16:9" : projectAspectRatio}
              onChange={(e) => setProjectAspectRatio(e.target.value)}
              className="nodrag nowheel text-[9px] bg-white border border-neutral-200 rounded-lg px-1.5 py-1 text-neutral-600 outline-none focus:border-violet-300 cursor-pointer shadow-sm"
              title="Aspect ratio"
            >
              {VIDEO_ASPECT_RATIOS.map((ar) => (
                <option key={ar} value={ar}>{ar}</option>
              ))}
            </select>
          </div>
          {needsAudio && !hasAudio && (
            <div className="text-[9px] text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-100">
              Generate voiceover audio in the Talking Card first
            </div>
          )}
          {isComingSoon && (
            <div className="text-[9px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
              Coming soon
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <ProFeatureGate feature="Video generation" inline>
              <button
                onClick={() => generateVideo(sceneId, slot)}
                disabled={!canGenerate}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
                  canGenerate
                    ? "bg-[#122d31] text-white hover:bg-[#1a3f44] active:scale-[0.97]"
                    : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                )}
                title={!hasSourceImage ? "Generate frame image first" : needsAudio && !hasAudio ? "Generate voiceover first" : isComingSoon ? "Coming soon" : "Generate video"}
              >
                <Play className="w-3 h-3" />
                Generate
              </button>
            </ProFeatureGate>
            {hasVideo && (
              <button
                onClick={() => deleteVideo(sceneId, slot)}
                className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete video"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Audio Mode Toggle (reusable) ---------- */
function AudioModeToggle({ mode, onChange }: { mode: AudioMode; onChange: (m: AudioMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
      <button
        onClick={() => onChange("silent")}
        className={cn(
          "px-2 py-1 rounded-md text-[8px] font-medium transition-all",
          mode === "silent"
            ? "bg-white text-neutral-600 shadow-sm"
            : "text-muted hover:text-foreground"
        )}
        title="Silent — no scene audio"
      >
        <VolumeX className="w-3 h-3" />
      </button>
      <button
        onClick={() => onChange("talking-head")}
        className={cn(
          "px-2 py-1 rounded-md text-[8px] font-medium transition-all",
          mode === "talking-head"
            ? "bg-red-50 text-red-600 shadow-sm"
            : "text-muted hover:text-foreground"
        )}
        title="Talking Head — separate audio card for lip-sync"
      >
        <Mic className="w-3 h-3" />
      </button>
      <button
        onClick={() => onChange("audio-native")}
        className={cn(
          "px-2 py-1 rounded-md text-[8px] font-medium transition-all",
          mode === "audio-native"
            ? "bg-orange-50 text-orange-600 shadow-sm"
            : "text-muted hover:text-foreground"
        )}
        title="Audio Native — dialogue baked into video prompt"
      >
        <Volume2 className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ---------- Video Section (always visible, no collapse) ---------- */
function VideoSection({ sceneId, d }: { sceneId: string; d: SceneNodeData }) {
  const setVideoMode = useStore((s) => s.setVideoMode);
  const enhanceSceneVideoPrompts = useStore((s) => s.enhanceSceneVideoPrompts);
  const [videoAiOpen, setVideoAiOpen] = useState(false);
  const [videoAiComment, setVideoAiComment] = useState("");
  const [videoAiLoading, setVideoAiLoading] = useState(false);

  const handleVideoAiEnhance = useCallback(async () => {
    setVideoAiLoading(true);
    try {
      await enhanceSceneVideoPrompts(sceneId, videoAiComment);
      setVideoAiComment("");
      setVideoAiOpen(false);
    } catch {
      // error handled in store
    } finally {
      setVideoAiLoading(false);
    }
  }, [enhanceSceneVideoPrompts, sceneId, videoAiComment]);

  const mode: VideoMode = d.video_mode || "combined";
  const audioMode: AudioMode = (d.audio_mode as AudioMode) || "silent";

  const setAudioMode = (m: AudioMode) => {
    useStore.setState((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, audio_mode: m } : s
      ),
    }));
  };

  const setSlotAudioMode = (slot: "start" | "end", m: AudioMode) => {
    const field = slot === "start" ? "start_audio_mode" : "end_audio_mode";
    useStore.setState((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, [field]: m } : s
      ),
    }));
  };

  const startAudioMode: AudioMode = (d.start_audio_mode as AudioMode) || "silent";
  const endAudioMode: AudioMode = (d.end_audio_mode as AudioMode) || "silent";

  return (
    <div className="px-5 pb-4">
      {/* Section header + mode toggles */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[12px] font-semibold text-foreground">Video</span>
          {mode === "combined" && d.video_status === "done" && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Done</span>
          )}
          {mode === "separate" && (d.start_video_status === "done" || d.end_video_status === "done") && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
              {[d.start_video_status, d.end_video_status].filter((s) => s === "done").length} done
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {/* AI Video Prompt Writer button */}
          <button
            onClick={() => setVideoAiOpen(!videoAiOpen)}
            className={cn(
              "p-1.5 rounded-lg text-[10px] transition-all",
              videoAiOpen
                ? "bg-violet-100 text-violet-600 shadow-sm"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-violet-500"
            )}
            title="AI Video Prompt Writer"
          >
            {videoAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          </button>
          {/* Audio mode toggle — only in combined mode */}
          {mode === "combined" && (
            <AudioModeToggle mode={audioMode} onChange={setAudioMode} />
          )}
          {/* Video mode toggle */}
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => setVideoMode(sceneId, "combined")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-medium transition-all",
                mode === "combined"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              Combined
            </button>
            <button
              onClick={() => setVideoMode(sceneId, "separate")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-medium transition-all",
                mode === "separate"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              Separate
            </button>
          </div>
        </div>
      </div>

      {/* AI Video Prompt Writer panel */}
      {videoAiOpen && (
        <div className="mb-3 px-4 py-3 bg-violet-50/50 border border-violet-200/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-semibold text-violet-600">AI Video Prompt Writer</span>
            <button onClick={() => setVideoAiOpen(false)} className="ml-auto text-neutral-400 hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted mb-2">
            Writes or enhances all 3 video prompts (start, end, combined) using scene context, image prompts, and your instructions.
          </p>
          <textarea
            className="nodrag nowheel w-full text-[10px] bg-white border border-violet-200/40 rounded-lg px-3 py-2 text-foreground outline-none focus:border-violet-400/50 resize-y min-h-[36px] max-h-24 placeholder:text-neutral-300"
            placeholder="Optional: e.g. 'Make camera movements more dynamic' or 'Add slow-motion pull back'…"
            value={videoAiComment}
            onChange={(e) => setVideoAiComment(e.target.value)}
            rows={2}
          />
          <button
            onClick={handleVideoAiEnhance}
            disabled={videoAiLoading}
            className={cn(
              "mt-2 flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-semibold transition-all w-full justify-center",
              videoAiLoading
                ? "bg-violet-100 text-violet-400 cursor-wait"
                : "bg-violet-500 text-white hover:bg-violet-600 active:scale-[0.98]"
            )}
          >
            {videoAiLoading ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Writing video prompts…</>
            ) : (
              <><Send className="w-3 h-3" /> {d.combined_video_prompt ? "Enhance Video Prompts" : "Write Video Prompts"}</>
            )}
          </button>
        </div>
      )}

      {/* Loading indicator when AI panel is closed */}
      {videoAiLoading && !videoAiOpen && (
        <div className="mb-3 px-4 py-2 bg-violet-50/50 border border-violet-200/20 rounded-lg flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
          <span className="text-[10px] text-violet-500 font-medium">AI writing video prompts…</span>
        </div>
      )}

      {/* Combined mode */}
      {mode === "combined" && (
        <div className="flex flex-col gap-2.5">
          <textarea
            value={d.combined_video_prompt || ""}
            onChange={(e) => useStore.getState().setVideoPrompt(sceneId, "combined", e.target.value)}
            placeholder="Video prompt: e.g. Tracking shot from wide to close-up…"
            rows={2}
            className="nodrag nowheel text-[10px] bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-foreground placeholder:text-neutral-300 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100 resize-none"
          />
          <VideoSlot
            sceneId={sceneId}
            slot="combined"
            label="Start → End"
            status={d.video_status || "idle"}
            videoUrl={d.video_url}
            model={d.video_model}
            error={d.video_error}
            duration={d.video_duration}
            sourceImage={d.start_frame_image}
            endImage={d.end_frame_image}
            audioMode={audioMode}
            sceneAudioUrl={d.scene_audio_url}
          />
        </div>
      )}

      {/* Separate mode */}
      {mode === "separate" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-500">Start Video</span>
              <AudioModeToggle mode={startAudioMode} onChange={(m) => setSlotAudioMode("start", m)} />
            </div>
            <textarea
              value={d.start_video_prompt || ""}
              onChange={(e) => useStore.getState().setVideoPrompt(sceneId, "start", e.target.value)}
              placeholder="Start video prompt…"
              rows={2}
              className="nodrag nowheel text-[10px] bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-foreground placeholder:text-neutral-300 outline-none focus:border-violet-300 resize-none"
            />
            <VideoSlot
              sceneId={sceneId}
              slot="start"
              label="Start Video"
              status={d.start_video_status || "idle"}
              videoUrl={d.start_video_url}
              model={d.start_video_model}
              error={d.start_video_error}
              duration={d.start_video_duration}
              sourceImage={d.start_frame_image}
              audioMode={startAudioMode}
              sceneAudioUrl={d.scene_audio_url}
            />
          </div>
          <div className="border-t border-neutral-100" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-500">End Video</span>
              <AudioModeToggle mode={endAudioMode} onChange={(m) => setSlotAudioMode("end", m)} />
            </div>
            <textarea
              value={d.end_video_prompt || ""}
              onChange={(e) => useStore.getState().setVideoPrompt(sceneId, "end", e.target.value)}
              placeholder="End video prompt…"
              rows={2}
              className="nodrag nowheel text-[10px] bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-foreground placeholder:text-neutral-300 outline-none focus:border-violet-300 resize-none"
            />
            <VideoSlot
              sceneId={sceneId}
              slot="end"
              label="End Video"
              status={d.end_video_status || "idle"}
              videoUrl={d.end_video_url}
              model={d.end_video_model}
              error={d.end_video_error}
              duration={d.end_video_duration}
              sourceImage={d.end_frame_image}
              audioMode={endAudioMode}
              sceneAudioUrl={d.end_scene_audio_url}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Scene Node (v5 — Timeline Card) ---------- */
function SceneNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as SceneNodeData;
  const enhanceScenePrompts = useStore((s) => s.enhanceScenePrompts);
  const [expanded, setExpanded] = useState(true);
  const [cardW, setCardW] = useState(560);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiComment, setAiComment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  const handleAiEnhance = useCallback(async () => {
    setAiLoading(true);
    try {
      await enhanceScenePrompts(d.sceneId, aiComment);
      setAiComment("");
      setAiOpen(false);
    } catch {
      // error handled in store
    } finally {
      setAiLoading(false);
    }
  }, [enhanceScenePrompts, d.sceneId, aiComment]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startW: cardW };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      setCardW(Math.max(420, Math.min(900, resizeRef.current.startW + delta)));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [cardW]);


  return (
    <div className="relative" style={{ width: cardW }}>
      {/* Rainbow rotating border when AI is working */}
      {aiLoading && (
        <div className="absolute inset-[-2px] rounded-[18px] overflow-hidden z-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
            style={{
              width: "200%",
              height: "200%",
              background: "conic-gradient(#508ab7, #22d3ee, #4ade80, #facc15, #a855f7, #508ab7)",
              animationDuration: "3s",
            }}
          />
        </div>
      )}

      {/* All 4 handles at top level with explicit positioning */}
      <Handle type="target" position={Position.Left} id="start-target"
        style={{ background: "#508ab7", width: 10, height: 10, border: "2px solid #FFFFFF", top: "35%" }} />
      <Handle type="source" position={Position.Right} id="start-source"
        style={{ background: "#508ab7", width: 10, height: 10, border: "2px solid #FFFFFF", top: "30%" }} />
      <Handle type="target" position={Position.Left} id="end-target"
        style={{ background: "#a855f7", width: 10, height: 10, border: "2px solid #FFFFFF", top: "45%" }} />
      <Handle type="source" position={Position.Right} id="end-source"
        style={{ background: "#a855f7", width: 10, height: 10, border: "2px solid #FFFFFF", top: "40%" }} />
      <Handle type="target" position={Position.Left} id="video-target"
        style={{ background: "#ef4444", width: 10, height: 10, border: "2px solid #FFFFFF", top: "80%" }} />
      <Handle type="target" position={Position.Left} id="start-video-target"
        style={{ background: "#ef4444", width: 10, height: 10, border: "2px solid #FFFFFF", top: "75%" }} />
      <Handle type="target" position={Position.Left} id="end-video-target"
        style={{ background: "#ef4444", width: 10, height: 10, border: "2px solid #FFFFFF", top: "90%" }} />

      <div
        className={cn(
          "bg-white rounded-2xl shadow-md transition-all relative",
          aiLoading
            ? "border-2 border-transparent"
            : selected
            ? "border-2 border-accent-primary/50 shadow-lg shadow-accent-primary/5"
            : "border border-neutral-200/80"
        )}
      >
        {/* Accent gradient strip */}
        <div className="h-1 bg-gradient-to-r from-[#508ab7] via-[#22d3ee] to-[#a855f7] rounded-t-2xl overflow-hidden" />

        {/* Scene Header */}
        <div
          className="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[15px] font-bold text-[#122d31]">S{d.scene_number}</span>
            <span className="text-[12px] text-neutral-500 truncate">{d.type} · {d.shot_type}</span>
            {d.visual_type && d.visual_type !== "Standard" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary font-medium shrink-0">{d.visual_type}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setAiOpen(!aiOpen); }}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                aiOpen || aiLoading
                  ? "bg-accent-primary/15 text-accent-primary"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-accent-primary"
              )}
              title="AI Prompt Writer"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            </button>
            <div className="text-neutral-400">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 py-3 bg-accent-primary/5 border-y border-accent-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-3.5 h-3.5 text-accent-primary" />
                  <span className="text-[11px] font-semibold text-accent-primary">AI Prompt Writer</span>
                  <button onClick={() => setAiOpen(false)} className="ml-auto text-neutral-400 hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted mb-2">
                  Writes or enhances start &amp; end image prompts using scene context and your instructions.
                </p>
                <textarea
                  className="nodrag nowheel w-full text-[10px] bg-white border border-accent-primary/20 rounded-lg px-3 py-2 text-foreground outline-none focus:border-accent-primary/50 resize-y min-h-[36px] max-h-24 placeholder:text-neutral-300"
                  value={aiComment}
                  onChange={(e) => setAiComment(e.target.value)}
                  placeholder="Optional: e.g. 'make it more dramatic' or 'focus on the bag close-up'…"
                  rows={2}
                />
                <button
                  onClick={handleAiEnhance}
                  disabled={aiLoading}
                  className={cn(
                    "mt-2 flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-semibold transition-all w-full justify-center",
                    aiLoading
                      ? "bg-accent-primary/10 text-accent-primary/50 cursor-wait"
                      : "bg-[#122d31] text-white hover:bg-[#1a3f44]"
                  )}
                >
                  {aiLoading ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Writing prompts…</>
                  ) : (
                    <><Send className="w-3 h-3" /> {d.start_image_prompt ? "Enhance Prompts" : "Write Prompts"}</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Loading bar */}
        {aiLoading && !aiOpen && (
          <div className="px-5 py-2 bg-accent-primary/5 border-b border-accent-primary/10 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-accent-primary animate-spin" />
            <span className="text-[10px] text-accent-primary font-medium">AI writing prompts…</span>
          </div>
        )}


        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {/* Action description */}
              <div className="px-5 py-2.5">
                <p className="text-[12px] text-neutral-600 leading-relaxed line-clamp-2">{d.action_movement}</p>
              </div>

              {/* ── Side-by-side frames with flow arrow ── */}
              <div className="px-5 pb-4">
                <div className="flex gap-3 items-start">
                  {/* Start Frame */}
                  <FrameCard
                    sceneId={d.sceneId}
                    frame="start"
                    prompt={d.start_image_prompt}
                    status={d.start_frame_status}
                    image={d.start_frame_image}
                    history={d.start_frame_history}
                    model={d.start_frame_model}
                    error={d.start_frame_error}
                    color="#508ab7"
                    aspectRatio={d.aspect_ratio}
                  />

                  {/* Flow arrow */}
                  <div className="flex flex-col items-center justify-center pt-16 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </div>

                  {/* End Frame */}
                  <FrameCard
                    sceneId={d.sceneId}
                    frame="end"
                    prompt={d.end_image_prompt}
                    status={d.end_frame_status}
                    image={d.end_frame_image}
                    history={d.end_frame_history}
                    model={d.end_frame_model}
                    error={d.end_frame_error}
                    color="#a855f7"
                    aspectRatio={d.aspect_ratio}
                  />
                </div>
              </div>

              {/* ── Separator ── */}
              <div className="mx-5 border-t border-neutral-100 mb-3" />

              {/* ── Video Section (always visible) ── */}
              <VideoSection sceneId={d.sceneId} d={d} />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {/* Collapsed: mini preview thumbnails */}
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#508ab7]" />
                  <span className="text-[10px] text-neutral-500">Start</span>
                  {d.start_frame_image && isValidSrc(d.start_frame_image) && (
                    <div className="w-8 h-8 rounded-md overflow-hidden border border-neutral-200">
                      <img src={d.start_frame_image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-300" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7]" />
                  <span className="text-[10px] text-neutral-500">End</span>
                  {d.end_frame_image && isValidSrc(d.end_frame_image) && (
                    <div className="w-8 h-8 rounded-md overflow-hidden border border-neutral-200">
                      <img src={d.end_frame_image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resize grip */}
        <div
          className="nodrag absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-20 hover:opacity-60 transition-opacity z-10"
          onMouseDown={onResizeStart}
          title="Drag to resize"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-full h-full text-neutral-400">
            <path d="M14 14H10L14 10V14ZM14 8L8 14H6L14 6V8Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default memo(SceneNodeComponent);
