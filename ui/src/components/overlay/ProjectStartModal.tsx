"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, AD_TYPES } from "@/lib/store";
import {
  Loader2, ImagePlus, X, ArrowRight, ArrowLeft, Sparkles, Pencil, Check,
} from "lucide-react";

function compressImage(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Showcase video (single CDN-hosted reel) ── */
const SHOWCASE_VIDEO = "https://minio-obj-storage-api.panaiq.com/appyfine/create_ad_video.mp4";

/* ── Rotating captions over the video ── */
const VIDEO_SLIDES = [
  { headline: "AI-Powered Studio", caption: "Seven creative agents collaborate to bring your vision to life." },
  { headline: "Cinematic Quality", caption: "From concept to brand film in minutes, every frame directed by AI." },
  { headline: "Precision Design", caption: "Automatic breakdowns with camera angles, mood, and art direction." },
  { headline: "Scene by Scene", caption: "Three clicks from idea to export-ready assets and scenes." },
  { headline: "Your Brand, Amplified", caption: "Auto-extracted palettes, textures, and typography from your identity." },
];

/* ── Ad category thumbnails ── */
const AD_CATEGORY_IMAGES: Record<string, string> = {
  fashion_luxury: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80",
  commercial_product: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
  beauty_skincare: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80",
  ugc_social: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80",
  cinematic_brand: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80",
};

export default function ProjectStartModal() {
  const [idea, setIdea] = useState("");
  const [adType, setAdType] = useState("fashion_luxury");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [videoIdx, setVideoIdx] = useState(0);
  const [aiAssist, setAiAssist] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializeWorkflow = useStore((s) => s.initializeWorkflow);
  const isRunning = useStore((s) => s.isRunning);
  const workflowId = useStore((s) => s.workflowId);
  const setView = useStore((s) => s.setView);

  useEffect(() => {
    const timer = setInterval(() => {
      setVideoIdx((prev) => (prev + 1) % VIDEO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (workflowId) return null;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const compressed = await compressImage(file);
    setProductImage(compressed);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim() || isRunning) return;
    await initializeWorkflow(idea.trim(), adType, productImage || undefined, aiAssist);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={() => setView("projects")}
      />

      {/* ══════════ Popup Card ══════════ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-[880px] h-[520px] bg-white rounded-2xl shadow-[0_8px_60px_-12px_rgba(0,0,0,0.15)] border border-neutral-200/60 overflow-hidden flex"
      >

          {/* ── Left: Form ── */}
          <div className="w-[420px] shrink-0 flex flex-col overflow-y-auto px-7 py-6">
            <div className="mb-5">
              <h1 className="text-[22px] font-extralight tracking-wide text-neutral-800 leading-tight">
                Create New Ad
              </h1>
              <p className="text-[12px] text-neutral-400 mt-1.5 font-light tracking-wide leading-relaxed">
                Select a category, describe your vision, and let AI handle the rest.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
              {/* Category grid */}
              <div>
                <label className="block text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400 mb-2">
                  Ad Category
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {AD_TYPES.map((t) => {
                    const selected = adType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAdType(t.id)}
                        disabled={isRunning}
                        className={`relative group text-left rounded-lg overflow-hidden border transition-all ${
                          selected
                            ? "border-neutral-400 ring-1 ring-neutral-300"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="h-[42px] overflow-hidden bg-neutral-50">
                          <img
                            src={AD_CATEGORY_IMAGES[t.id]}
                            alt={t.label}
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
                          />
                          {selected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-neutral-800 flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="px-1.5 py-1">
                          <p className={`text-[7.5px] font-light leading-tight truncate ${selected ? "text-neutral-700" : "text-neutral-400"}`}>
                            {t.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description + Image row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400 mb-1.5">
                    Describe your product
                  </label>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="A futuristic bamboo wristwatch with minimalist design..."
                    className="w-full min-h-[72px] bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-[13px] text-neutral-700 placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 resize-none transition-all font-light leading-relaxed"
                    disabled={isRunning}
                    autoFocus
                  />
                </div>
                <div className="w-[100px] shrink-0">
                  <label className="block text-[10px] font-light uppercase tracking-[0.15em] text-neutral-400 mb-1.5">
                    Reference
                  </label>
                  {productImage ? (
                    <div className="relative group rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 h-[72px]">
                      <img src={productImage} alt="Product" className="w-full h-full object-contain p-1.5" />
                      <button
                        type="button"
                        onClick={() => setProductImage(null)}
                        className="absolute top-1 right-1 p-0.5 rounded bg-white/80 text-neutral-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-[72px] flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed cursor-pointer transition-all ${
                        dragOver
                          ? "border-neutral-400 bg-neutral-100"
                          : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <ImagePlus className="w-4 h-4 text-neutral-300" />
                      <p className="text-[8px] text-neutral-300 font-light">Optional</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                </div>
              </div>

              {/* Creation mode */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAiAssist(true)}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                    aiAssist
                      ? "border-neutral-800 bg-neutral-800 text-white"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 shrink-0 ${aiAssist ? "text-white" : "text-neutral-400"}`} />
                  <div className="text-left">
                    <p className={`text-[11px] font-light leading-tight ${aiAssist ? "text-white" : "text-neutral-500"}`}>AI Create</p>
                    <p className={`text-[9px] font-light ${aiAssist ? "text-white/50" : "text-neutral-300"}`}>Auto scenes & direction</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAiAssist(false)}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
                    !aiAssist
                      ? "border-neutral-800 bg-neutral-800 text-white"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <Pencil className={`w-3.5 h-3.5 shrink-0 ${!aiAssist ? "text-white" : "text-neutral-400"}`} />
                  <div className="text-left">
                    <p className={`text-[11px] font-light leading-tight ${!aiAssist ? "text-white" : "text-neutral-500"}`}>Manual</p>
                    <p className={`text-[9px] font-light ${!aiAssist ? "text-white/50" : "text-neutral-300"}`}>Build from scratch</p>
                  </div>
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!idea.trim() || isRunning}
                className="w-full flex items-center justify-center gap-2 text-white font-light text-[13px] tracking-wide py-2.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98] mt-auto"
                style={{ background: "linear-gradient(135deg, #23809e 0%, #3ecfff 100%)" }}
              >
                {isRunning ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                ) : aiAssist ? (
                  <><Sparkles className="w-4 h-4" />Start Creating<ArrowRight className="w-4 h-4" /></>
                ) : (
                  <><Pencil className="w-4 h-4" />Start Building<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* ── Right: Video showcase ── */}
          <div className="flex-1 relative overflow-hidden bg-neutral-100">
            <video
              src={SHOWCASE_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/5 pointer-events-none" />

            {/* Text overlay */}
            <div className="absolute bottom-10 left-6 right-6 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={videoIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="text-[18px] font-extralight text-white tracking-wide leading-tight mb-1.5">
                    {VIDEO_SLIDES[videoIdx].headline}
                  </h3>
                  <p className="text-[12px] font-light text-white/60 leading-relaxed max-w-[280px]">
                    {VIDEO_SLIDES[videoIdx].caption}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Video indicators */}
            <div className="absolute bottom-4 left-6 flex gap-1.5">
              {VIDEO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setVideoIdx(i)}
                  className={`h-[2px] rounded-full transition-all duration-500 ${
                    i === videoIdx ? "w-6 bg-white/70" : "w-2 bg-white/25 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
      </motion.div>
    </div>
  );
}
