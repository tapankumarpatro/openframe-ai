"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Trees, Package, Camera, Mic, Music, ImageIcon, Film,
  Play, Loader2, ChevronDown, ChevronUp, Upload,
  Expand, Pencil, Copy, Trash2, Download,
  History, Check, MoreHorizontal, X, Volume2, Pause, Save,
  Bot, Send, Search, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { compressImageFile } from "@/lib/imageUtils";
import type { AssetType } from "@/types/schema";
import { VoicePicker, VoiceSettings } from "./VoicePicker";
import ProFeatureGate from "@/components/ui/ProFeatureGate";

type AssetNodeData = {
  assetId: string;
  type: AssetType;
  label: string;
  driver_type?: string;
  text_prompt: string;
  image_url?: string;
  image_history?: string[];
  reference_image?: string;
  image_model?: string;
  image_error?: string;
  is_permanent_cast?: boolean;
  audio_urls?: string[];
  audio_history?: string[];
  audio_status?: string;
  audio_error?: string;
  voice_name?: string;
  voice_stability?: number;
  voice_similarity?: number;
  voice_style?: number;
  voice_speed?: number;
  voice_language?: string;
  music_custom_mode?: boolean;
  music_instrumental?: boolean;
  music_model?: string;
  music_style?: string;
  music_title?: string;
  music_vocal_gender?: string;
  music_style_weight?: number;
  music_weirdness?: number;
  music_audio_weight?: number;
  video_url?: string;
  video_status?: string;
  video_error?: string;
  isGlobal?: boolean;
};

// Which types use which rendering mode
const IMAGE_TYPES: AssetType[] = ["character", "environment", "product", "image"];
const TEXT_TYPES: AssetType[] = ["camera"];
const AUDIO_TYPES: AssetType[] = ["voiceover", "music"];
const VIDEO_TYPES: AssetType[] = ["video"];

const IMAGE_MODELS = [
  { id: "seedream/4.5",      label: "Seedream 4.5",        qualities: ["basic", "high"],       supportsImageInput: true },
  { id: "nano-banana/pro",   label: "Nano Banana Pro",     qualities: ["1K", "2K", "4K"],      supportsImageInput: true },
  { id: "nano-banana/2",     label: "Nano Banana 2",       qualities: ["1K", "2K", "4K"],      supportsImageInput: true },
  { id: "qwen/image-edit",   label: "Qwen Edit",           qualities: ["basic"],               supportsImageInput: true },
  { id: "flux-kontext/pro",  label: "Flux Kontext Pro",    qualities: ["basic"],               supportsImageInput: true },
  { id: "flux-kontext/max",  label: "Flux Kontext Max",    qualities: ["basic"],               supportsImageInput: true },
  { id: "gpt-image/1.5-i2i", label: "GPT Image 1.5 i2i",  qualities: ["medium", "high"],      supportsImageInput: true },
  { id: "z-image/1.0",       label: "Z Image",             qualities: [],                      supportsImageInput: false },
];

/* ---------- Model Picker Popover (portal-based, matches SceneNode style) ---------- */
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

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

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
                  placeholder="Search models"
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

/* ---------- Quality Picker Popover (portal-based, compact) ---------- */
function QualityPicker({
  qualities,
  selected,
  onSelect,
  className,
}: {
  qualities: string[];
  selected: string;
  onSelect: (q: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

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

  if (qualities.length === 0) return null;

  return (
    <div className={cn("nodrag nowheel", className)}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-neutral-200/80 text-[9px] font-medium text-neutral-600 hover:bg-white transition-all shadow-sm"
      >
        <span>{selected}</span>
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
            className="fixed w-28 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden nodrag nowheel"
            style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          >
            <div className="py-1">
              {qualities.map((q) => (
                <button
                  key={q}
                  onClick={(e) => { e.stopPropagation(); onSelect(q); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors",
                    q === selected
                      ? "bg-violet-50 text-violet-700 font-medium"
                      : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <span>{q}</span>
                  {q === selected && <Check className="w-3 h-3 text-violet-500 ml-auto shrink-0" />}
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

const ICONS: Record<AssetType, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  character: User,
  environment: Trees,
  product: Package,
  camera: Camera,
  voiceover: Mic,
  music: Music,
  image: ImageIcon,
  video: Film,
};

const BORDER_COLORS: Record<AssetType, string> = {
  character: "border-accent-red/60",
  environment: "border-accent-green/60",
  product: "border-accent-yellow/60",
  camera: "border-accent-primary/60",
  voiceover: "border-accent-purple/60",
  music: "border-accent-magenta/60",
  image: "border-sky-400/60",
  video: "border-rose-400/60",
};

const ICON_COLORS: Record<AssetType, string> = {
  character: "text-accent-red",
  environment: "text-accent-green",
  product: "text-accent-yellow",
  camera: "text-accent-primary",
  voiceover: "text-accent-purple",
  music: "text-accent-magenta",
  image: "text-sky-400",
  video: "text-rose-400",
};

const HANDLE_COLORS: Record<AssetType, string> = {
  character: "#f87171",
  environment: "#4ade80",
  product: "#facc15",
  camera: "#508ab7",
  voiceover: "#a855f7",
  music: "#e879f9",
  image: "#38bdf8",
  video: "#fb7185",
};

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
    // Fallback: copy URL to clipboard
    navigator.clipboard.writeText(url);
  }
}

// Reject blob: URLs (they die on refresh) and empty strings
function isValidSrc(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("blob:")) return false;
  return true;
}

/* ========== Audio Player sub-component ========== */
function AudioPlayer({ url, label }: { url: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const proUser = useStore((s) => s.isPro)();

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-background/50 border border-border/50">
      <button onClick={toggle} className="shrink-0 p-1.5 rounded-md bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 transition-all">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] text-foreground/80 truncate block">{label}</span>
        <audio
          ref={audioRef}
          src={url}
          onEnded={() => setPlaying(false)}
          className="w-full h-6 mt-0.5"
          controls
          controlsList={proUser ? undefined : "nodownload"}
          onContextMenu={proUser ? undefined : (e: React.MouseEvent) => e.preventDefault()}
          style={{ height: 28 }}
        />
      </div>
    </div>
  );
}

/* ========== Music Settings Component ========== */
const MUSIC_MODELS = [
  { id: "V5", label: "V5 (Fastest)" },
  { id: "V4_5PLUS", label: "V4.5+ (Rich)" },
  { id: "V4_5", label: "V4.5 (Smart)" },
  { id: "V4", label: "V4 (Classic)" },
];

function MusicSettings({
  customMode,
  instrumental,
  model,
  style,
  title,
  onChange,
}: {
  customMode: boolean;
  instrumental: boolean;
  model: string;
  style: string;
  title: string;
  onChange: (field: string, value: string | boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Model selector */}
      <div>
        <span className="text-[9px] text-muted font-medium mb-1 block">Model</span>
        <select
          value={model}
          onChange={(e) => onChange("model", e.target.value)}
          className="nodrag w-full text-[10px] px-2 py-1 rounded-md bg-background border border-border/50 text-foreground outline-none focus:border-accent-magenta/50"
        >
          {MUSIC_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Custom Mode toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={customMode}
          onChange={(e) => onChange("customMode", e.target.checked)}
          className="nodrag w-3.5 h-3.5 rounded accent-accent-magenta"
        />
        <span className="text-[9px] text-muted">Custom Mode (detailed control)</span>
      </label>

      {/* Instrumental toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={instrumental}
          onChange={(e) => onChange("instrumental", e.target.checked)}
          className="nodrag w-3.5 h-3.5 rounded accent-accent-magenta"
        />
        <span className="text-[9px] text-muted">Instrumental (no vocals)</span>
      </label>

      {/* Custom mode fields */}
      {customMode && (
        <>
          <div>
            <span className="text-[9px] text-muted font-medium mb-1 block">Style / Genre</span>
            <input
              type="text"
              value={style}
              onChange={(e) => onChange("style", e.target.value)}
              placeholder="e.g. Jazz, Classical, Electronic"
              className="nodrag w-full text-[10px] px-2 py-1 rounded-md bg-background border border-border/50 text-foreground outline-none focus:border-accent-magenta/50"
            />
          </div>
          <div>
            <span className="text-[9px] text-muted font-medium mb-1 block">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="Track title"
              className="nodrag w-full text-[10px] px-2 py-1 rounded-md bg-background border border-border/50 text-foreground outline-none focus:border-accent-magenta/50"
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ========== Main AssetNode ========== */
function AssetNodeComponent({ data }: NodeProps) {
  const d = data as unknown as AssetNodeData;
  const generateAsset = useStore((s) => s.generateAsset);
  const generateAudio = useStore((s) => s.generateAudio);
  const setVoiceName = useStore((s) => s.setVoiceName);
  const updateVoiceSetting = useStore((s) => s.updateVoiceSetting);
  const updateMusicSetting = useStore((s) => s.updateMusicSetting);
  const deleteAssetImage = useStore((s) => s.deleteAssetImage);
  const setAssetImage = useStore((s) => s.setAssetImage);
  const setAssetVideo = useStore((s) => s.setAssetVideo);
  const deleteAssetVideo = useStore((s) => s.deleteAssetVideo);
  const selectAssetFromHistory = useStore((s) => s.selectAssetFromHistory);
  const selectAudioFromHistory = useStore((s) => s.selectAudioFromHistory);
  const updateAssetPrompt = useStore((s) => s.updateAssetPrompt);
  const storeEnhanceAssetPrompt = useStore((s) => s.enhanceAssetPrompt);
  const removeKeyItem = useStore((s) => s.removeKeyItem);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiComment, setAiComment] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "done" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [audioHistoryOpen, setAudioHistoryOpen] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [expandedView, setExpandedView] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [refImgError, setRefImgError] = useState(false);

  // Reset image error state when the URL changes (e.g. after generation completes)
  useEffect(() => { setImgError(false); }, [d.image_url]);
  useEffect(() => { setRefImgError(false); }, [d.reference_image]);
  // Auto-open history strip when music generation returns multiple tracks
  const audioUrlCount = (d.audio_urls || []).length;
  const prevAudioCountRef = useRef(0);
  useEffect(() => {
    if (d.type === "music" && audioUrlCount > prevAudioCountRef.current && audioUrlCount >= 2) {
      setAudioHistoryOpen(true);
    }
    prevAudioCountRef.current = audioUrlCount;
  }, [audioUrlCount, d.type]);
  const [cardW, setCardW] = useState(260);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const Icon = ICONS[d.type] || Package;

  // Determine rendering mode
  const isImageType = IMAGE_TYPES.includes(d.type);
  const isTextType = TEXT_TYPES.includes(d.type);
  const isAudioType = AUDIO_TYPES.includes(d.type);
  const isVideoType = VIDEO_TYPES.includes(d.type);

  const isGenerating = d.image_url === "generating";
  const isError = !!d.image_error;
  const hasImage = isImageType && isValidSrc(d.image_url) && !imgError;
  const selectedModel = d.image_model || "seedream/4.5";
  const modelMeta = IMAGE_MODELS.find((m) => m.id === selectedModel) || IMAGE_MODELS[0];
  const selectedQuality = (d as unknown as Record<string, unknown>).image_quality as string | undefined
    || (modelMeta.qualities[0] ?? "basic");

  const setAssetModel = (modelId: string) => {
    const meta = IMAGE_MODELS.find((m) => m.id === modelId) || IMAGE_MODELS[0];
    useStore.setState((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === d.assetId ? { ...k, image_model: modelId, image_quality: meta.qualities[0] || "basic" } : k
      ),
    }));
  };
  const setAssetQuality = (q: string) => {
    useStore.setState((state) => ({
      keyItems: state.keyItems.map((k) =>
        k.id === d.assetId ? { ...k, image_quality: q } : k
      ),
    }));
  };
  const hasRefImage = isValidSrc(d.reference_image) && !refImgError;
  const handleColor = HANDLE_COLORS[d.type];
  const historyItems = (d.image_history || []).filter(isValidSrc);
  const audioUrls = (d.audio_urls || []).filter(isValidSrc);
  const currentAudioUrl = audioUrls.length > 0 ? audioUrls[0] : undefined;

  // Card width follows image aspect — wider for landscape, narrower for portrait
  const BASE_W = cardW;
  let cardWidth = BASE_W;
  if (imgSize && isImageType) {
    const ratio = imgSize.w / imgSize.h;
    if (ratio > 1.2) cardWidth = Math.min(420, Math.round(BASE_W * ratio * 0.7));
    else if (ratio < 0.8) cardWidth = Math.max(180, Math.round(BASE_W * ratio));
  }

  // Resize drag handler
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startW: cardWidth };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      setCardW(Math.max(160, Math.min(600, resizeRef.current.startW + delta)));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [cardWidth]);

  const handleAiEnhance = useCallback(async () => {
    setAiLoading(true);
    setAiStatus("idle");
    setAiError("");
    try {
      await storeEnhanceAssetPrompt(d.assetId, aiComment);
      setAiComment("");
      setAiStatus("done");
      setPromptOpen(true);
      // Auto-dismiss success after 2.5s
      setTimeout(() => setAiStatus((s) => s === "done" ? "idle" : s), 2500);
    } catch (err) {
      setAiStatus("error");
      setAiError(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setAiLoading(false);
    }
  }, [storeEnhanceAssetPrompt, d.assetId, aiComment]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress + convert to base64 data URL so it fits in localStorage and survives refresh
    try {
      const dataUrl = await compressImageFile(file);
      setAssetImage(d.assetId, dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAssetImage(d.assetId, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls: string[] = [];
    let loaded = 0;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          urls.push(reader.result);
        }
        loaded++;
        if (loaded === files.length) {
          useStore.setState((state) => ({
            keyItems: state.keyItems.map((k) => {
              if (k.id !== d.assetId) return k;
              const merged = [...urls, ...(k.audio_urls || [])];
              const history = [...(k.audio_history || []), ...urls];
              return { ...k, audio_urls: merged, audio_history: history, audio_status: "done" as const };
            }),
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    if (audioFileRef.current) audioFileRef.current.value = "";
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const toolbarActions = (action: string) => {
    switch (action) {
      case "Expand":
        setExpandedView(!expandedView);
        setMenuOpen(false);
        break;
      case "Edit":
        setPromptOpen(true);
        setMenuOpen(false);
        break;
      case "Copy":
        if (d.image_url) navigator.clipboard.writeText(d.image_url);
        setMenuOpen(false);
        break;
      case "Download":
        if (d.image_url) downloadImage(d.image_url, `${d.label}.png`);
        setMenuOpen(false);
        break;
      case "Delete":
        deleteAssetImage(d.assetId);
        setMenuOpen(false);
        setImgSize(null);
        break;
      case "More":
        break;
    }
  };

  // Image style based on aspect + expanded state
  const imgStyle: React.CSSProperties = expandedView
    ? { maxHeight: 600 }
    : imgSize && imgSize.h > imgSize.w * 1.3
    ? { maxHeight: 300 }
    : {};

  return (
    <div className="relative" style={{ width: cardWidth }}>
      {/* Source handle on right — pinned near header, not at 50% of tall cards */}
      {!d.isGlobal && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            style={{
              background: handleColor,
              width: 10,
              height: 10,
              border: "2px solid #FFFFFF",
              top: 20,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{ right: -8, top: 20, transform: "translate(100%, -50%)" }}
          >
            <span
              className="text-[8px] font-semibold whitespace-nowrap px-1 py-0.5 rounded"
              style={{ color: handleColor, background: "#FFFFFFee" }}
            >
              {d.label}
            </span>
          </div>
        </>
      )}

      {/* Card content — overflow-hidden keeps content inside rounded border */}
      <div
        className={cn(
          "bg-card rounded-xl border-2 shadow-lg transition-all overflow-hidden",
          d.is_permanent_cast ? "border-amber-400/70" : BORDER_COLORS[d.type]
        )}
      >
      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <input ref={audioFileRef} type="file" accept="audio/*" multiple={d.type === "music"} className="hidden" onChange={handleAudioUpload} />

      {/* Header — click to expand/collapse */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border cursor-pointer select-none group"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className={cn("w-4 h-4", d.is_permanent_cast ? "text-amber-500" : ICON_COLORS[d.type])} />
        <span className="text-xs font-semibold text-foreground flex-1 truncate">{d.label}</span>
        {d.is_permanent_cast && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-wider">
            Hired
          </span>
        )}
        {d.driver_type && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-border text-muted font-medium">
            {d.driver_type}
          </span>
        )}
        {isImageType && (
          <button
            onClick={(e) => { e.stopPropagation(); setAiOpen(!aiOpen); }}
            className={cn(
              "p-1 rounded-md transition-all",
              aiOpen || aiLoading
                ? "bg-accent-primary/15 text-accent-primary"
                : "text-muted hover:bg-card-hover hover:text-accent-primary"
            )}
            title="AI Prompt Writer"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${d.label}"?`)) removeKeyItem(d.assetId); }}
          className="p-1 rounded-md text-muted hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
          title="Delete card"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        )}
      </div>

      {/* AI Prompt Enhancer Panel (image types only) */}
      {aiOpen && isImageType && (
        <div className="px-3 py-2.5 bg-accent-primary/5 border-b border-accent-primary/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Bot className="w-3 h-3 text-accent-primary" />
            <span className="text-[10px] font-semibold text-accent-primary">AI Prompt Writer</span>
            <button onClick={() => setAiOpen(false)} className="ml-auto text-muted hover:text-foreground transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[9px] text-muted mb-1.5">
            Writes or enhances the visual prompt for this asset.
          </p>
          <textarea
            className="nodrag nowheel w-full text-[10px] bg-background border border-accent-primary/20 rounded-lg px-2.5 py-1.5 text-foreground outline-none focus:border-accent-primary/50 resize-y min-h-[32px] max-h-20 placeholder:text-muted/40"
            value={aiComment}
            onChange={(e) => setAiComment(e.target.value)}
            placeholder="Optional: e.g. 'dramatic lighting' or 'close-up on face'…"
            rows={2}
          />
          <button
            onClick={handleAiEnhance}
            disabled={aiLoading}
            className={cn(
              "mt-1.5 flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-semibold transition-all w-full justify-center",
              aiLoading
                ? "bg-accent-primary/10 text-accent-primary/50 cursor-wait"
                : "bg-[#122d31] text-white hover:bg-[#1a3f44]"
            )}
          >
            {aiLoading ? (
              <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Writing prompt…</>
            ) : (
              <><Send className="w-2.5 h-2.5" /> {d.text_prompt ? "Enhance Prompt" : "Write Prompt"}</>
            )}
          </button>
          {aiStatus === "done" && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-green-600 font-medium">
              <Check className="w-3 h-3" />
              <span>Prompt updated! Check below ↓</span>
            </div>
          )}
          {aiStatus === "error" && (
            <div className="mt-1.5 text-[9px] text-red-500 font-medium">
              ⚠ {aiError || "Enhancement failed"}
            </div>
          )}
        </div>
      )}

      {/* AI Loading bar (when panel closed) */}
      {aiLoading && !aiOpen && isImageType && (
        <div className="px-3 py-1.5 bg-accent-primary/5 border-b border-accent-primary/10 flex items-center gap-2">
          <Loader2 className="w-3 h-3 text-accent-primary animate-spin" />
          <span className="text-[9px] text-accent-primary font-medium">AI writing prompt…</span>
        </div>
      )}

      {expanded && (
        <>
          {/* ===== IMAGE MODE (character, environment, product) ===== */}
          {isImageType && (
            <>
              {/* Menu trigger + toolbar */}
              {hasImage && (
                <div className="flex items-center justify-end px-3 py-1 border-b border-border">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={cn(
                      "p-1 rounded-md transition-all",
                      menuOpen ? "bg-accent-primary/20 text-accent-primary" : "text-muted hover:text-foreground hover:bg-card-hover"
                    )}
                    title="Image options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {menuOpen && hasImage && (
                <div className="px-3 pb-1 border-b border-border">
                  <div className="flex items-center gap-0.5 bg-foreground/95 backdrop-blur-sm rounded-lg px-1.5 py-1 shadow-xl">
                    {[
                      { icon: Expand, title: "Expand" },
                      { icon: Pencil, title: "Edit" },
                      { icon: Copy, title: "Copy" },
                      { icon: Download, title: "Download" },
                      { icon: Trash2, title: "Delete" },
                    ].map(({ icon: Ic, title }) => (
                      <button
                        key={title}
                        className="p-1.5 rounded hover:bg-white/15 text-background transition-colors"
                        title={title}
                        onClick={() => toolbarActions(title)}
                      >
                        <Ic className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected image */}
              {hasImage && (
                <div className="border-b border-border cursor-pointer" onClick={() => setExpandedView(!expandedView)}>
                  <img
                    src={d.image_url}
                    alt={d.label}
                    className="w-full object-contain bg-background/40"
                    style={imgStyle}
                    onLoad={handleImageLoad}
                    onError={() => setImgError(true)}
                  />
                </div>
              )}

              {/* Reference image (shown when no generated image) */}
              {!hasImage && !isGenerating && hasRefImage && (
                <div className="border-b border-border relative">
                  <div className="absolute top-1 left-1 z-10 px-1 py-0.5 rounded bg-background/80 text-[7px] text-muted uppercase tracking-wider">
                    Reference
                  </div>
                  <img
                    src={d.reference_image}
                    alt="Reference"
                    className="w-full object-contain bg-background/40 opacity-80"
                    style={{ maxHeight: 200 }}
                    onError={() => setRefImgError(true)}
                  />
                </div>
              )}

              {/* Generating — rainbow border + spinner */}
              {isGenerating && (
                <div className="border-b border-border p-3">
                  <div className="rainbow-border rounded-xl p-[3px]">
                    <div className="w-full bg-card rounded-[9px] flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-1.5">
                        <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                        <span className="text-[9px] text-muted">Generating image…</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {isError && d.image_error && (
                <div className="px-3 py-1.5 border-b border-border">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] text-red-400">
                    <X className="w-3 h-3 shrink-0" />
                    <span className="truncate">{d.image_error}</span>
                  </div>
                </div>
              )}

              {/* Action buttons + model selector */}
              {!isGenerating && (
                <div className="px-3 py-2 flex flex-col gap-1.5 border-b border-border">
                  <div className="flex items-center gap-1">
                    <ModelPicker
                      models={IMAGE_MODELS}
                      selected={selectedModel}
                      onSelect={setAssetModel}
                      className="flex-1 min-w-0"
                    />
                    <QualityPicker
                      qualities={modelMeta.qualities}
                      selected={selectedQuality}
                      onSelect={setAssetQuality}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => generateAsset(d.assetId)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition-all"
                    >
                      <Play className="w-2.5 h-2.5" />
                      Generate
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-border/50 text-muted hover:bg-border hover:text-foreground transition-all"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      Upload
                    </button>
                    {historyItems.length >= 1 && (
                      <button
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all ml-auto",
                          historyOpen ? "bg-accent-yellow/15 text-accent-yellow" : "bg-border/50 text-muted hover:bg-border hover:text-foreground"
                        )}
                      >
                        <History className="w-2.5 h-2.5" />
                        {historyItems.length}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Image history strip */}
              {historyOpen && historyItems.length >= 1 && (
                <div className="px-3 py-1.5 border-b border-border">
                  <div className="flex gap-1 overflow-x-auto nodrag nowheel pb-0.5">
                    {historyItems.map((url, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); selectAssetFromHistory(d.assetId, url); }}
                        className={cn(
                          "relative shrink-0 w-10 h-10 rounded-md overflow-hidden border-2 transition-all",
                          url === d.image_url
                            ? "border-accent-primary shadow-sm shadow-accent-primary/30"
                            : "border-border/50 opacity-60 hover:opacity-100 hover:border-accent-primary/40"
                        )}
                      >
                        <img src={url} alt={`v${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
                        {url === d.image_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Check className="w-3 h-3 text-accent-primary drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable prompt */}
              <div className="px-3 py-2">
                <button
                  onClick={() => setPromptOpen(!promptOpen)}
                  className="flex items-center gap-1 text-[9px] text-muted hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform", !promptOpen && "-rotate-90")} />
                  <span>prompt</span>
                </button>
                {promptOpen && (
                  <div className="mt-1.5">
                    <textarea
                      className="nodrag nowheel w-full text-[10px] text-muted leading-relaxed bg-background/50 border border-border/50 rounded-lg p-2 resize-y min-h-[40px] max-h-40 outline-none focus:border-accent-primary/50"
                      value={d.text_prompt}
                      onChange={(e) => updateAssetPrompt(d.assetId, e.target.value)}
                      rows={4}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== TEXT MODE (camera / lighting) ===== */}
          {isTextType && (
            <div className="px-3 py-2.5">
              <textarea
                className="nodrag nowheel w-full text-[10px] text-foreground/80 leading-relaxed bg-background/50 border border-border/50 rounded-lg p-2.5 resize-y min-h-[80px] max-h-64 outline-none focus:border-accent-primary/50"
                value={d.text_prompt}
                onChange={(e) => updateAssetPrompt(d.assetId, e.target.value)}
                rows={6}
                placeholder="Camera & lighting notes…"
              />
              <div className="flex items-center justify-end mt-1">
                <span className="text-[8px] text-muted flex items-center gap-1">
                  <Save className="w-2.5 h-2.5" />
                  auto-saved
                </span>
              </div>
            </div>
          )}

          {/* ===== VIDEO MODE (standalone video card) ===== */}
          {isVideoType && (
            <div className="px-3 py-2.5 flex flex-col gap-2">
              {/* Video preview */}
              {d.video_url && (
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    src={d.video_url}
                    controls
                    className="w-full max-h-[220px] object-contain"
                  />
                  <button
                    onClick={() => deleteAssetVideo(d.assetId)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white/80 hover:text-red-400 hover:bg-black/80 transition-all"
                    title="Remove video"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Notes / description */}
              <textarea
                className="nodrag nowheel w-full text-[10px] text-foreground/80 leading-relaxed bg-background/50 border border-border/50 rounded-lg p-2.5 resize-y min-h-[50px] max-h-40 outline-none focus:border-accent-primary/50"
                value={d.text_prompt || ""}
                onChange={(e) => updateAssetPrompt(d.assetId, e.target.value)}
                placeholder="Video notes / description…"
              />

              {/* Upload button */}
              <input
                ref={videoFileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setAssetVideo(d.assetId, url);
                  e.target.value = "";
                }}
              />
              {!d.video_url && (
                <button
                  onClick={() => videoFileRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-8 rounded-lg border-2 border-dashed border-border/60 text-muted hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-primary/3 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-[11px] font-medium">Upload Video</span>
                </button>
              )}
              {d.video_url && (
                <button
                  onClick={() => videoFileRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-rose-400/15 text-rose-500 hover:bg-rose-400/25 transition-all self-start"
                >
                  <Upload className="w-2.5 h-2.5" />
                  Replace
                </button>
              )}
            </div>
          )}

          {/* ===== AUDIO MODE (voiceover, music) ===== */}
          {isAudioType && (
            <div className="px-3 py-2.5 flex flex-col gap-2">
              {/* 1. Settings (voice for voiceover, music params for music) */}
              {d.type === "voiceover" ? (
                <>
                  <div>
                    <span className="text-[9px] text-muted font-medium mb-1 block">Voice</span>
                    <VoicePicker
                      selected={d.voice_name || "Sarah"}
                      onSelect={(name) => setVoiceName(d.assetId, name)}
                      accentColor="violet"
                    />
                  </div>
                  <VoiceSettings
                    stability={d.voice_stability ?? 0.5}
                    similarity={d.voice_similarity ?? 0.75}
                    style={d.voice_style ?? 0}
                    speed={d.voice_speed ?? 1}
                    language={d.voice_language || ""}
                    onChange={(key, val) => updateVoiceSetting(d.assetId, key, val)}
                    accentColor="violet"
                  />
                </>
              ) : (
                <MusicSettings
                  customMode={d.music_custom_mode ?? false}
                  instrumental={d.music_instrumental ?? false}
                  model={d.music_model || "V5"}
                  style={d.music_style || ""}
                  title={d.music_title || ""}
                  onChange={(key, val) => updateMusicSetting(d.assetId, key, val)}
                />
              )}

              {/* 2. Script / Prompt */}
              {d.type === "voiceover" ? (
                <div>
                  <span className="text-[9px] text-muted font-medium mb-1 block">Script</span>
                  <textarea
                    className="nodrag nowheel w-full text-[10px] text-muted leading-relaxed bg-background/50 border border-border/50 rounded-lg p-2 resize-y min-h-[40px] max-h-40 outline-none focus:border-accent-primary/50"
                    value={d.text_prompt}
                    onChange={(e) => updateAssetPrompt(d.assetId, e.target.value)}
                    rows={4}
                  />
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setPromptOpen(!promptOpen)}
                    className="flex items-center gap-1 text-[9px] text-muted hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("w-3 h-3 transition-transform", !promptOpen && "-rotate-90")} />
                    <span>prompt</span>
                  </button>
                  {promptOpen && (
                    <div className="mt-1.5">
                      <textarea
                        className="nodrag nowheel w-full text-[10px] text-muted leading-relaxed bg-background/50 border border-border/50 rounded-lg p-2 resize-y min-h-[40px] max-h-40 outline-none focus:border-accent-primary/50"
                        value={d.text_prompt}
                        onChange={(e) => updateAssetPrompt(d.assetId, e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 2. Audio error banner */}
              {d.audio_error && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[9px] text-red-600">
                  <X className="w-3 h-3 shrink-0" />
                  <span className="truncate">{d.audio_error}</span>
                </div>
              )}

              {/* 3. Current audio player */}
              {currentAudioUrl ? (
                <AudioPlayer
                  url={currentAudioUrl}
                  label={d.type === "music" ? "Current Track" : "Voiceover"}
                />
              ) : d.audio_status !== "generating" ? (
                <div className="flex items-center justify-center py-4 rounded-lg bg-background/30 border border-border/30">
                  <div className="flex flex-col items-center gap-1">
                    <Volume2 className="w-5 h-5 text-muted/50" />
                    <span className="text-[9px] text-muted">No audio yet</span>
                  </div>
                </div>
              ) : null}

              {/* 4. Audio history strip */}
              {audioHistoryOpen && audioUrls.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background/30 overflow-hidden">
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto nowheel p-1.5">
                    {audioUrls.map((url, i) => {
                      const isCurrent = url === currentAudioUrl;
                      return (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); selectAudioFromHistory(d.assetId, url); }}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-[9px] transition-all text-left",
                            isCurrent
                              ? "bg-accent-purple/15 text-accent-purple font-medium border border-accent-purple/30"
                              : "text-muted hover:bg-border/50 hover:text-foreground border border-transparent"
                          )}
                        >
                          <Volume2 className={cn("w-3 h-3 shrink-0", isCurrent ? "text-accent-purple" : "text-muted/50")} />
                          <span className="flex-1 truncate">
                            {d.type === "music" ? "Track" : "Audio"} {i + 1}
                          </span>
                          {isCurrent && <Check className="w-3 h-3 shrink-0 text-accent-purple" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Generating indicator */}
              {d.audio_status === "generating" && (
                <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-accent-purple/5 border border-accent-purple/20">
                  <Loader2 className="w-3.5 h-3.5 text-accent-purple animate-spin" />
                  <span className="text-[9px] text-accent-purple font-medium">
                    Generating {d.type === "music" ? "music" : "voiceover"}…
                  </span>
                </div>
              )}

              {/* 6. Generate + Upload + History buttons */}
              <div className="flex items-center gap-1.5">
                <ProFeatureGate feature="Audio generation" inline>
                  <button
                    onClick={() => generateAudio(d.assetId)}
                    disabled={d.audio_status === "generating" || !d.text_prompt?.trim()}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all",
                      d.audio_status === "generating"
                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                        : "bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25"
                    )}
                  >
                    {d.audio_status === "generating" ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Play className="w-2.5 h-2.5" />
                    )}
                    Generate
                  </button>
                </ProFeatureGate>
                <button
                  onClick={() => audioFileRef.current?.click()}
                  disabled={d.audio_status === "generating"}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 transition-all"
                >
                  <Upload className="w-2.5 h-2.5" />
                  Upload
                </button>
                {audioUrls.length >= 1 && (
                  <button
                    onClick={() => setAudioHistoryOpen(!audioHistoryOpen)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all ml-auto",
                      audioHistoryOpen
                        ? "bg-accent-purple/15 text-accent-purple"
                        : "bg-border/50 text-muted hover:bg-border hover:text-foreground"
                    )}
                  >
                    <History className="w-2.5 h-2.5" />
                    {audioUrls.length}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {/* Resize grip — bottom-right corner */}
      <div
        className="nodrag absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-70 transition-opacity"
        onMouseDown={onResizeStart}
        title="Drag to resize"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-full h-full text-muted">
          <path d="M14 14H10L14 10V14ZM14 8L8 14H6L14 6V8Z" />
        </svg>
      </div>
      </div>
    </div>
  );
}

export default memo(AssetNodeComponent);
