"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, ImagePlus, Sparkles, Loader2, Package, User,
  ChevronDown, ChevronUp, Trash2, X, Wand2, Send,
  AlertTriangle, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { BatchCreator, BatchItem, BatchGenerationMode, BatchHistoryEntry } from "@/types/schema";

type BatchCreatorNodeData = {
  batchId: string;
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

const AD_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  luxury: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  commercial: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ugc: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  editorial: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  cinematic: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  beauty: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
};

const AR_MAP: Record<string, number> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "3:2": 3 / 2,
  "2:3": 2 / 3,
};

function isValidSrc(src?: string) {
  if (!src) return false;
  if (src === "generating") return false;
  if (src.startsWith("blob:")) return false;
  return src.startsWith("http") || src.startsWith("data:image");
}

/* ---------- Main Batch Creator Node ---------- */
function BatchCreatorNodeComponent({ data, selected, id: nodeId }: NodeProps) {
  const d = data as unknown as BatchCreatorNodeData;
  const bc = useStore((s) => s.batchCreators.find((b) => b.id === d.batchId));
  const keyItems = useStore((s) => s.keyItems);
  const updateBatchCreator = useStore((s) => s.updateBatchCreator);
  const removeBatchCreator = useStore((s) => s.removeBatchCreator);
  const genPrompts = useStore((s) => s.generateBatchPrompts);
  const genAllImages = useStore((s) => s.generateBatchAllImages);
  const storeEnhanceBatch = useStore((s) => s.enhanceBatchInstructions);
  const projectAspectRatio = useStore((s) => s.projectAspectRatio);

  const [expanded, setExpanded] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [enhanceHint, setEnhanceHint] = useState("");
  const [enhanceOpen, setEnhanceOpen] = useState(false);

  // Read connected asset IDs from store (synced by DirectorCanvas edge-sync useEffect)
  // No reliance on useEdges() — the store is always the source of truth
  const castAsset = bc?.connected_cast_id ? keyItems.find((k) => k.id === bc.connected_cast_id) : undefined;
  const productAsset = bc?.connected_product_id ? keyItems.find((k) => k.id === bc.connected_product_id) : undefined;
  const productDescription = productAsset?.text_prompt || "";
  const productImageUrl = productAsset?.image_url && isValidSrc(productAsset.image_url) ? productAsset.image_url : undefined;
  const isProductConnected = !!productAsset;
  const castDescription = castAsset?.text_prompt || "";
  const isCastConnected = !!castAsset;

  // Thumbnail for display
  const effectiveRefUrl = productImageUrl || (castAsset?.image_url && isValidSrc(castAsset.image_url) ? castAsset.image_url : undefined);

  if (!bc) return null;

  const isAgentRunning = bc.agent_status === "generating";
  const hasItems = bc.items.length > 0;
  const doneImages = bc.items.filter((it) => it.image_status === "done").length;
  const pendingImages = bc.items.filter((it) => it.image_status === "idle" || it.image_status === "error").length;
  const anyGenerating = bc.items.some((it) => it.image_status === "generating");
  const aspect = projectAspectRatio === "auto" ? "1:1" : projectAspectRatio;

  return (
    <div className="relative" style={{ width: 520 }}>
      {/* Product connection handle (top-left) */}
      <Handle type="target" position={Position.Left} id="batch-product"
        style={{ background: "#facc15", width: 10, height: 10, border: "2px solid #FFFFFF", top: 20 }} />
      <div className="absolute pointer-events-none" style={{ left: -8, top: 20, transform: "translate(-100%, -50%)" }}>
        <span className="text-[8px] font-semibold whitespace-nowrap px-1 py-0.5 rounded" style={{ color: "#facc15", background: "#FFFFFFee" }}>Product</span>
      </div>

      {/* Image reference handle (middle-left) */}
      <Handle type="target" position={Position.Left} id="batch-target"
        style={{ background: "#f59e0b", width: 10, height: 10, border: "2px solid #FFFFFF", top: 50 }} />
      <div className="absolute pointer-events-none" style={{ left: -8, top: 50, transform: "translate(-100%, -50%)" }}>
        <span className="text-[8px] font-semibold whitespace-nowrap px-1 py-0.5 rounded" style={{ color: "#f59e0b", background: "#FFFFFFee" }}>Image</span>
      </div>

      {/* Cast/Model connection handle (bottom-left) */}
      <Handle type="target" position={Position.Left} id="batch-cast"
        style={{ background: "#f87171", width: 10, height: 10, border: "2px solid #FFFFFF", top: 80 }} />
      <div className="absolute pointer-events-none" style={{ left: -8, top: 80, transform: "translate(-100%, -50%)" }}>
        <span className="text-[8px] font-semibold whitespace-nowrap px-1 py-0.5 rounded" style={{ color: "#f87171", background: "#FFFFFFee" }}>Cast</span>
      </div>

      <Handle type="source" position={Position.Right} id="batch-source"
        style={{ background: "#f59e0b", width: 10, height: 10, border: "2px solid #FFFFFF", top: 20 }} />

      <div
        className={cn(
          "bg-white rounded-2xl shadow-md transition-all relative",
          isAgentRunning || anyGenerating
            ? "border-2 border-amber-300/60"
            : selected
            ? "border-2 border-amber-500/50 shadow-lg shadow-amber-500/5"
            : "border border-neutral-200/80"
        )}
      >
        {/* Accent strip */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-t-2xl overflow-hidden" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground leading-tight">Batch Creator</h3>
              <p className="text-[10px] text-muted">
                {hasItems ? `${bc.items.length} variations · ${doneImages} images` : `${bc.batch_size} variations`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isAgentRunning && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
            <button
              onClick={(e) => { e.stopPropagation(); removeBatchCreator(bc.id); }}
              className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-3 nodrag nowheel">

                {/* Connected assets (optional indicators) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {productAsset ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                      <Package className="w-3 h-3 text-yellow-600 shrink-0" />
                      <span className="text-[9px] font-semibold text-yellow-700">{productAsset.label}</span>
                      {productImageUrl && (
                        <img src={productImageUrl} alt="" className="w-5 h-5 rounded object-cover border border-yellow-200 shrink-0" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-neutral-200">
                      <Package className="w-3 h-3 text-neutral-300 shrink-0" />
                      <span className="text-[8px] text-neutral-400">No product</span>
                    </div>
                  )}
                  {isCastConnected ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-50 border border-rose-200">
                      <User className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="text-[9px] font-semibold text-rose-700">{castAsset?.label}</span>
                      {castAsset?.image_url && isValidSrc(castAsset.image_url) && (
                        <img src={castAsset.image_url} alt="" className="w-5 h-5 rounded-full object-cover border border-rose-200 shrink-0" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-neutral-200">
                      <User className="w-3 h-3 text-neutral-300 shrink-0" />
                      <span className="text-[8px] text-neutral-400">No cast</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[9px] font-medium uppercase tracking-wider text-muted">Instructions</label>
                    <button
                      onClick={() => setEnhanceOpen(!enhanceOpen)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium transition-all",
                        enhanceOpen ? "bg-violet-50 text-violet-600" : "bg-neutral-100 text-muted hover:bg-violet-50 hover:text-violet-500"
                      )}
                    >
                      <Wand2 className="w-2.5 h-2.5" /> AI Enhance
                    </button>
                  </div>
                  <textarea
                    value={bc.user_comment}
                    onChange={(e) => updateBatchCreator(bc.id, { user_comment: e.target.value })}
                    placeholder="Describe what you want — product ads, model photoshoot, campaign, lookbook... The AI will understand your intent."
                    className="w-full min-h-[60px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-[11px] text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none font-light leading-relaxed"
                  />
                  {/* AI Enhance panel */}
                  <AnimatePresence>
                    {enhanceOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1.5 p-2 rounded-lg bg-violet-50/50 border border-violet-100 space-y-1.5">
                          <p className="text-[8px] text-violet-500">AI will write or improve your instructions based on context.</p>
                          <input
                            type="text"
                            value={enhanceHint}
                            onChange={(e) => setEnhanceHint(e.target.value)}
                            placeholder="Optional hint: e.g. 'make it more cinematic' or 'focus on close-ups'..."
                            className="nodrag w-full text-[10px] bg-white border border-violet-200 rounded px-2 py-1 text-neutral-700 outline-none focus:border-violet-400 placeholder:text-neutral-300"
                          />
                          <button
                            onClick={async () => {
                              setEnhanceLoading(true);
                              try {
                                await storeEnhanceBatch(bc.id, enhanceHint);
                                setEnhanceHint("");
                                setEnhanceOpen(false);
                              } catch (err) {
                                console.error("[BatchCreator] Enhance failed:", err);
                              } finally {
                                setEnhanceLoading(false);
                              }
                            }}
                            disabled={enhanceLoading}
                            className={cn(
                              "w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-semibold transition-all",
                              enhanceLoading
                                ? "bg-violet-100 text-violet-400 cursor-wait"
                                : "bg-[#122d31] text-white hover:bg-[#1a3f44]"
                            )}
                          >
                            {enhanceLoading ? (
                              <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Enhancing...</>
                            ) : (
                              <><Send className="w-2.5 h-2.5" /> {bc.user_comment ? "Enhance Instructions" : "Write Instructions"}</>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Controls row: count + history */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[9px] font-medium text-muted">Count:</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={bc.batch_size}
                      onChange={(e) => updateBatchCreator(bc.id, { batch_size: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
                      className="w-12 text-center text-[11px] bg-neutral-50 border border-neutral-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-50 border border-neutral-100 ml-auto">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-[8px] text-neutral-500">AI auto-detects shoot type from your instructions</span>
                  </div>
                  {(bc.prompt_history || []).length > 0 && (
                    <button
                      onClick={() => setHistoryOpen(!historyOpen)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all",
                        historyOpen ? "bg-amber-50 text-amber-600" : "bg-neutral-100 text-muted hover:bg-neutral-200"
                      )}
                    >
                      <History className="w-3 h-3" />
                      {(bc.prompt_history || []).length}
                    </button>
                  )}
                </div>

                {/* Generate prompts button */}
                <button
                  onClick={() => genPrompts(bc.id, effectiveRefUrl, productDescription, productImageUrl, castDescription, castAsset?.image_url)}
                  disabled={isAgentRunning || !bc.user_comment.trim()}
                  className="w-full flex items-center justify-center gap-2 text-[11px] font-medium py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white hover:shadow-md active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
                >
                  {isAgentRunning ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Prompts...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate {bc.batch_size} Variations</>
                  )}
                </button>

                {/* Error */}
                {bc.agent_status === "error" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-500">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Failed to generate prompts. Try again.</span>
                  </div>
                )}

                {/* Bulk actions — prompts are on output image nodes */}
                {hasItems && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {pendingImages > 0 && (
                      <button
                        onClick={() => {
                          genAllImages(bc.id);
                        }}
                        disabled={anyGenerating}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-semibold hover:bg-amber-100 transition-all disabled:opacity-40"
                      >
                        <ImagePlus className="w-3 h-3" /> Generate {pendingImages} Images
                      </button>
                    )}
                    <span className="ml-auto text-[9px] text-muted">
                      {doneImages}/{bc.items.length} images
                    </span>
                  </div>
                )}

                {/* History panel — flat row of all previously generated images */}
                {historyOpen && (bc.prompt_history || []).length > 0 && (() => {
                  // Flatten all history images into a single list
                  const allHistoryImages: { url: string; label: string; timestamp: number; items: BatchItem[]; mode: string }[] = [];
                  for (const entry of (bc.prompt_history || []).slice().reverse()) {
                    for (const it of entry.items) {
                      if (it.image_url && isValidSrc(it.image_url)) {
                        allHistoryImages.push({ url: it.image_url, label: it.style_label, timestamp: entry.timestamp, items: entry.items, mode: entry.mode });
                      }
                    }
                  }
                  return allHistoryImages.length > 0 ? (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
                      <div className="px-2.5 py-1.5 border-b border-neutral-200 flex items-center gap-1.5">
                        <History className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-semibold text-neutral-700">Previous Images</span>
                        <span className="text-[9px] text-muted ml-auto">{allHistoryImages.length} images</span>
                      </div>
                      <div className="flex gap-1.5 p-1.5 overflow-x-auto nowheel">
                        {allHistoryImages.map((img, i) => (
                          <button
                            key={`${img.timestamp}-${i}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateBatchCreator(bc.id, { items: img.items, generation_mode: img.mode as BatchGenerationMode });
                              setHistoryOpen(false);
                            }}
                            className="shrink-0 group relative rounded-lg overflow-hidden border border-neutral-200 hover:border-amber-300 transition-all"
                            title={img.label}
                          >
                            <img src={img.url} alt={img.label} className="w-16 h-16 object-cover" />
                            <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                              <span className="text-[7px] text-white truncate block">{img.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const BatchCreatorNode = memo(BatchCreatorNodeComponent);
export default BatchCreatorNode;
