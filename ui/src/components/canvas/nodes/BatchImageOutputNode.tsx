"use client";

import { memo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  Play, Loader2, Upload, Copy, Expand,
  ChevronDown, X, History, Check,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { compressImageFile } from "@/lib/imageUtils";

type BatchImageOutputData = {
  batchId: string;
  itemId: string;
};

const IMAGE_MODELS = [
  { id: "seedream/4.5",      label: "Seedream 4.5" },
  { id: "nano-banana/pro",   label: "Nano Banana Pro" },
  { id: "nano-banana/2",     label: "Nano Banana 2" },
  { id: "qwen/image-edit",   label: "Qwen Edit" },
  { id: "flux-kontext/pro",  label: "Flux Kontext Pro" },
  { id: "flux-kontext/max",  label: "Flux Kontext Max" },
  { id: "gpt-image/1.5-i2i", label: "GPT Image 1.5 i2i" },
  { id: "z-image/1.0",       label: "Z Image" },
];

const CARD_WIDTH = 260;

function isValidSrc(src?: string) {
  if (!src) return false;
  if (src === "generating") return false;
  if (src.startsWith("blob:")) return false;
  return src.startsWith("http") || src.startsWith("data:image");
}

function BatchImageOutputNodeComponent({ data, selected, id: nodeId }: NodeProps) {
  const d = data as unknown as BatchImageOutputData;
  const bc = useStore((s) => s.batchCreators.find((b) => b.id === d.batchId));
  const item = bc?.items.find((it) => it.id === d.itemId);
  const projectAspectRatio = useStore((s) => s.projectAspectRatio);
  const updateBatchCreator = useStore((s) => s.updateBatchCreator);
  const genImage = useStore((s) => s.generateBatchImage);
  const selectFromHistory = useStore((s) => s.selectBatchImageFromHistory);

  const [expandedView, setExpandedView] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!bc || !item) return null;

  const hasImage = isValidSrc(item.image_url) && !imgError;
  const isImgGen = item.image_status === "generating";
  const isError = item.image_status === "error";
  const selectedModel = item.image_model || "nano-banana/2";
  const historyItems = (item.image_history || []).filter(isValidSrc);

  const setItemModel = (modelId: string) => {
    updateBatchCreator(bc.id, {
      items: bc.items.map((it) =>
        it.id === item.id ? { ...it, image_model: modelId } : it
      ),
    });
  };

  const updatePrompt = (newPrompt: string) => {
    updateBatchCreator(bc.id, {
      items: bc.items.map((it) =>
        it.id === item.id ? { ...it, prompt: newPrompt } : it
      ),
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      updateBatchCreator(bc.id, {
        items: bc.items.map((it) =>
          it.id === item.id ? { ...it, image_url: dataUrl, image_status: "done" as const } : it
        ),
      });
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          updateBatchCreator(bc.id, {
            items: bc.items.map((it) =>
              it.id === item.id ? { ...it, image_url: reader.result as string, image_status: "done" as const } : it
            ),
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Image style: respect global aspect ratio, similar to AssetNode
  const imgStyle: React.CSSProperties = expandedView
    ? { maxHeight: 600 }
    : imgSize && imgSize.h > imgSize.w * 1.3
    ? { maxHeight: 300 }
    : {};

  return (
    <div className="relative" style={{ width: CARD_WIDTH }}>
      {/* Source handle on right */}
      <div className="absolute right-0 top-5 translate-x-1/2 z-10">
        <Handle
          type="source"
          position={Position.Right}
          id="batch-img-out"
          style={{ background: "#f59e0b", width: 10, height: 10, border: "2px solid #FFFFFF", position: "relative" }}
        />
      </div>
      {/* Label near source handle */}
      <div className="absolute pointer-events-none" style={{ right: -8, top: 20, transform: "translate(100%, -50%)" }}>
        <span className="text-[8px] font-semibold whitespace-nowrap px-1 py-0.5 rounded" style={{ color: "#f59e0b", background: "#FFFFFFee" }}>
          {item.style_label || "Image"}
        </span>
      </div>

      {/* Target handle on left (from batch creator) */}
      <Handle
        type="target"
        position={Position.Left}
        id="batch-img-in"
        style={{ background: "#f59e0b", width: 10, height: 10, border: "2px solid #FFFFFF", top: 20 }}
      />

      <div
        className={cn(
          "bg-card rounded-xl border-2 shadow-lg transition-all overflow-hidden",
          selected ? "border-amber-400/70 shadow-amber-200/30" : "border-border"
        )}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <ImagePlus className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-foreground flex-1 truncate">{item.style_label || "Variation"}</span>
          {item.ad_type && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold uppercase tracking-wider border border-amber-200">
              {item.ad_type}
            </span>
          )}
        </div>

        {/* Image display — uses global aspect ratio (hidden during generation) */}
        {hasImage && !isImgGen && (
          <div className="border-b border-border cursor-pointer" onClick={() => setExpandedView(!expandedView)}>
            <img
              src={item.image_url}
              alt={item.style_label}
              className="w-full object-contain bg-background/40"
              style={imgStyle}
              onLoad={handleImageLoad}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {/* Generating spinner */}
        {isImgGen && (
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

        {/* Empty state */}
        {!hasImage && !isImgGen && (
          <div className="border-b border-border flex items-center justify-center py-10 text-muted">
            <div className="flex flex-col items-center gap-1">
              <ImagePlus className="w-6 h-6 opacity-30" />
              <span className="text-[9px]">No image yet</span>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && item.image_error && (
          <div className="px-3 py-1.5 border-b border-border">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] text-red-400">
              <X className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.image_error}</span>
            </div>
          </div>
        )}

        {/* Model selector + action buttons (matches AssetNode) */}
        {!isImgGen && (
          <div className="px-3 py-2 flex flex-col gap-1.5 border-b border-border">
            <div className="flex items-center gap-1">
              <select
                value={selectedModel}
                onChange={(e) => setItemModel(e.target.value)}
                className="nodrag text-[9px] bg-background/50 border border-border/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent-primary/30 text-muted flex-1 min-w-0"
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => genImage(bc.id, item.id)}
                disabled={isImgGen}
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
              {hasImage && (
                <button
                  onClick={() => item.image_url && navigator.clipboard.writeText(item.image_url)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-border/50 text-muted hover:bg-border hover:text-foreground transition-all"
                  title="Copy URL"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
              )}
              {historyItems.length >= 1 && (
                <button
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all ml-auto",
                    historyOpen ? "bg-amber-500/15 text-amber-500" : "bg-border/50 text-muted hover:bg-border hover:text-foreground"
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
                  onClick={(e) => { e.stopPropagation(); selectFromHistory(bc.id, item.id, url); }}
                  className={cn(
                    "relative shrink-0 w-10 h-10 rounded-md overflow-hidden border-2 transition-all",
                    url === item.image_url
                      ? "border-amber-400 shadow-lg shadow-amber-400/20"
                      : "border-border/50 hover:border-amber-300/50 opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={url} alt={`History ${i + 1}`} className="w-full h-full object-cover" />
                  {url === item.image_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible prompt (matches AssetNode style) */}
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
                value={item.prompt}
                onChange={(e) => updatePrompt(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded lightbox */}
      {expandedView && hasImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={() => setExpandedView(false)}
        >
          <img src={item.image_url} alt={item.style_label} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
        </motion.div>
      )}
    </div>
  );
}

const BatchImageOutputNode = memo(BatchImageOutputNodeComponent);
export default BatchImageOutputNode;
