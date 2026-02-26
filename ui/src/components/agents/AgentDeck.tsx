"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { compressImageFile } from "@/lib/imageUtils";
import {
  Loader2, CheckCircle2, Circle, AlertCircle, ArrowLeft,
  ChevronDown, ChevronRight, User, Film, Camera, Music,
  Plus, X, RefreshCw, Sparkles, Palette, Package, ImagePlus, Trash2,
  Bot, Zap,
} from "lucide-react";
import type { KeyItem, Scene } from "@/types/schema";
import { cn } from "@/lib/utils";

/* ── Shared input class ── */
export const INPUT_CLS = "nodrag w-full text-[13px] bg-white border border-border rounded-lg px-3 py-2.5 text-foreground outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/10 placeholder:text-muted/40 shadow-xs hover:border-border-bright transition-all";
export const LABEL_CLS = "text-[11px] font-semibold uppercase tracking-wider text-muted/70 mb-1.5 block";
export const TEXTAREA_CLS = cn(INPUT_CLS, "resize-y min-h-[40px]");

/* ── Color resolver for fashion/luxury color names ── */
const COLOR_MAP: Record<string, string> = {
  "pure white": "#FFFFFF", "jet black": "#0A0A0A", "porcelain": "#F0E6DA", "alabaster": "#F2F0EB",
  "ivory": "#FFFFF0", "cream": "#FFFDD0", "champagne": "#F7E7CE", "gold": "#FFD700",
  "silver": "#C0C0C0", "rose gold": "#B76E79", "burgundy": "#800020", "navy": "#000080",
  "emerald": "#50C878", "sapphire": "#0F52BA", "ruby": "#E0115F", "onyx": "#353839",
  "pearl": "#EAE0C8", "charcoal": "#36454F", "blush": "#DE5D83", "nude": "#E3BC9A",
  "mauve": "#E0B0FF", "taupe": "#483C32", "cognac": "#9F381D", "camel": "#C19A6B",
  "slate": "#708090", "obsidian": "#0B0B0B", "midnight": "#191970", "bone": "#E3DAC9",
  "ecru": "#C2B280", "sand": "#C2B280", "copper": "#B87333", "bronze": "#CD7F32",
  "pewter": "#8E9196", "ash": "#B2BEB5", "snow": "#FFFAFA", "graphite": "#383838",
  "matte black": "#171717", "off-white": "#FAF9F6", "off white": "#FAF9F6",
  "deep black": "#0A0A0A", "rich black": "#010203", "soft white": "#F5F5F0",
  "warm white": "#FDF8F0", "cool white": "#F0F4F8", "stark white": "#FFFFFF",
};

function resolveColor(c: string): string {
  if (!c) return "#E5E7EB";
  // Already a hex color
  if (c.startsWith("#")) return c;
  // Already an rgb/hsl color
  if (c.startsWith("rgb") || c.startsWith("hsl")) return c;
  // Check our map (case-insensitive)
  const mapped = COLOR_MAP[c.toLowerCase().trim()];
  if (mapped) return mapped;
  // Try as a CSS color name
  const test = document.createElement("div");
  test.style.color = c;
  if (test.style.color) return c;
  // Fallback: hash to a color
  let hash = 0;
  for (let i = 0; i < c.length; i++) hash = c.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 45%, 55%)`;
}

function isLightColor(hex: string): boolean {
  try {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
  } catch { return true; }
}

/* ── Avatar color from name ── */
const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-500", "from-violet-400 to-purple-500",
  "from-teal-400 to-cyan-600", "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500", "from-slate-400 to-slate-600",
  "from-indigo-400 to-blue-600", "from-lime-400 to-green-500",
];
function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />;
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-accent-red" />;
    default:
      return <Circle className="w-4 h-4 text-border-bright" />;
  }
}

/* ---------- Creative Director Section ---------- */
export function CreativeSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const brief = outputs.creative_brief as Record<string, unknown> | undefined;
  if (!brief) return <p className="text-[13px] text-muted px-4 py-3">Waiting for agent…</p>;

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <label className={LABEL_CLS}>Campaign Title</label>
        <input
          className={INPUT_CLS}
          value={(brief.campaign_title as string) || ""}
          onChange={(e) => updateAgentOutput("creative_brief", { campaign_title: e.target.value })}
        />
      </div>
      <div>
        <label className={LABEL_CLS}>Concept</label>
        <textarea
          className={TEXTAREA_CLS}
          value={(brief.concept_summary as string) || ""}
          onChange={(e) => updateAgentOutput("creative_brief", { concept_summary: e.target.value })}
          rows={3}
        />
      </div>
      <div>
        <label className={LABEL_CLS}>Tagline</label>
        <input
          className={INPUT_CLS}
          value={(brief.tagline as string) || ""}
          onChange={(e) => updateAgentOutput("creative_brief", { tagline: e.target.value })}
        />
      </div>
      {Array.isArray(brief.mood_keywords) && (
        <div>
          <label className={LABEL_CLS}>Mood</label>
          <div className="flex flex-wrap gap-1.5">
            {(brief.mood_keywords as string[]).map((kw, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-accent-yellow/10 text-amber-700 font-medium">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Brand Stylist Section ---------- */
export function BrandSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const vi = outputs.visual_identity as Record<string, unknown> | undefined;
  if (!vi) return <p className="text-[13px] text-muted px-4 py-3">Waiting for agent…</p>;

  return (
    <div className="space-y-4 px-4 py-4">
      {Array.isArray(vi.color_palette) && (
        <div>
          <label className={LABEL_CLS}>Color Palette</label>
          <div className="flex flex-wrap gap-3 mt-2">
            {(vi.color_palette as string[]).map((c, i) => {
              const resolved = resolveColor(c);
              const light = isLightColor(resolved.startsWith("#") ? resolved : "#FFFFFF");
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 group">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl shadow-md transition-transform group-hover:scale-110 group-hover:shadow-lg",
                      light && "ring-1 ring-inset ring-black/10"
                    )}
                    style={{ background: resolved }}
                    title={`${c} → ${resolved}`}
                  />
                  <span className="text-[9px] text-muted font-medium text-center max-w-[56px] leading-tight">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl p-3 border border-border/50 shadow-xs">
        <label className={LABEL_CLS}>Textures & Materials</label>
        <p className="text-[13px] text-foreground/80 leading-relaxed">{(vi.textures_materials as string) || "—"}</p>
      </div>
      <div className="bg-white rounded-xl p-3 border border-border/50 shadow-xs">
        <label className={LABEL_CLS}>Composition Style</label>
        <p className="text-[13px] text-foreground/80 leading-relaxed">{(vi.composition_style as string) || "—"}</p>
      </div>
    </div>
  );
}

/* ---------- Casting Section ---------- */
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
}

export function CastingSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const keyItems = useStore((s) => s.keyItems);
  const casting = outputs.casting_brief as Record<string, unknown> | undefined;
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  if (!casting) return <p className="text-[13px] text-muted px-4 py-3">Waiting for agent…</p>;

  const members = (casting.cast_members as Array<Record<string, string>>) || [];

  // Resolve best avatar image: generated canvas image > user-uploaded reference > null
  const getAvatarImage = (m: Record<string, string>): string | undefined => {
    // Check keyItems for generated image_url
    const assetId = `cast-${slugify(m.name || "driver")}`;
    const asset = keyItems.find((k) => k.id === assetId);
    if (asset?.image_url && asset.image_url !== "generating" && !asset.image_url.startsWith("blob:")) {
      return asset.image_url;
    }
    // Fallback to user-uploaded reference_image
    if (m.reference_image) return m.reference_image;
    return undefined;
  };

  const updateMember = (idx: number, field: string, value: string) => {
    const updated = members.map((m, i) => i === idx ? { ...m, [field]: value } : m);
    updateAgentOutput("casting_brief", { cast_members: updated });
  };

  const addMember = () => {
    updateAgentOutput("casting_brief", {
      cast_members: [...members, { name: "New Driver", driver_type: "human", visual_prompt: "", reference_image: "" }],
    });
  };

  const removeMember = (idx: number) => {
    updateAgentOutput("casting_brief", {
      cast_members: members.filter((_, i) => i !== idx),
    });
  };

  const handleImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      updateMember(idx, "reference_image", dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          updateMember(idx, "reference_image", reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = "";
  };

  return (
    <div className="space-y-4 px-4 py-3">
      {/* Cast member avatars */}
      <div>
        <label className={LABEL_CLS}>Cast Members</label>
        <div className="flex flex-wrap gap-3 mt-2">
          {members.map((m, i) => {
            const avatarImg = getAvatarImage(m);
            return (
            <div key={`cast-icon-${i}`} className="group relative flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shadow-md ring-2 ring-white transition-transform group-hover:scale-105",
                !avatarImg && `bg-gradient-to-br ${getAvatarGradient(m.name || "A")}`
              )}>
                {avatarImg ? (
                  <img src={avatarImg} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-[14px] drop-shadow-sm">{getInitials(m.name || "?")}</span>
                )}
              </div>
              <span className="text-[10px] text-foreground/70 text-center max-w-[56px] truncate font-medium">{m.name}</span>
              <button
                onClick={() => removeMember(i)}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600 hover:scale-110"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )})}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={addMember}
              className="w-12 h-12 rounded-full border-2 border-dashed border-border-bright flex items-center justify-center hover:border-accent-primary hover:bg-accent-primary/5 hover:text-accent-primary text-muted transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5" />
            </button>
            <span className="text-[10px] text-muted">Add</span>
          </div>
        </div>
      </div>

      {/* Editable cast details */}
      {members.map((m, i) => (
        <div key={`cast-detail-${i}`} className="bg-card-hover/50 rounded-xl p-3 space-y-2.5 border border-border/50">
          <div className="flex gap-2">
            <input
              className={cn(INPUT_CLS, "flex-1")}
              value={m.name}
              onChange={(e) => updateMember(i, "name", e.target.value)}
              placeholder="Name"
            />
            <select
              className={cn(INPUT_CLS, "w-28")}
              value={m.driver_type || "human"}
              onChange={(e) => updateMember(i, "driver_type", e.target.value)}
            >
              <option value="human">Human</option>
              <option value="animal">Animal</option>
              <option value="object">Object</option>
              <option value="object_abstract">Abstract</option>
            </select>
          </div>
          <textarea
            className={cn(TEXTAREA_CLS, "max-h-40")}
            value={m.visual_prompt}
            onChange={(e) => updateMember(i, "visual_prompt", e.target.value)}
            rows={2}
            placeholder="Visual prompt…"
          />
          {/* Reference image upload */}
          <input
            ref={(el) => { fileRefs.current[i] = el; }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(i, e)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRefs.current[i]?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-card-hover border border-border text-muted hover:bg-border/60 hover:text-foreground transition-all"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {m.reference_image ? "Change Ref" : "Add Ref Image"}
            </button>
            {m.reference_image && (
              <>
                <img src={m.reference_image} alt="ref" className="w-8 h-8 rounded-lg object-cover border border-border shadow-xs" />
                <button
                  onClick={() => updateMember(i, "reference_image", "")}
                  className="text-accent-red/60 hover:text-accent-red transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Settings */}
      <div className="space-y-2.5">
        <div>
          <label className={LABEL_CLS}>Setting A</label>
          <textarea
            className={cn(TEXTAREA_CLS, "max-h-40")}
            value={(casting.setting_a_description as string) || ""}
            onChange={(e) => updateAgentOutput("casting_brief", { setting_a_description: e.target.value })}
            rows={2}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Setting B</label>
          <textarea
            className={cn(TEXTAREA_CLS, "max-h-40")}
            value={(casting.setting_b_description as string) || ""}
            onChange={(e) => updateAgentOutput("casting_brief", { setting_b_description: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Cinematographer Section ---------- */
const CINEMA_FIELDS: { key: string; label: string }[] = [
  { key: "lighting", label: "Lighting" },
  { key: "camera_gear", label: "Camera Gear" },
  { key: "color_temperature", label: "Color Temperature" },
  { key: "contrast_tone", label: "Contrast & Tone" },
];

export function CinemaSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const cam = outputs.camera_specs as Record<string, unknown> | undefined;
  if (!cam) return <p className="text-[13px] text-muted px-4 py-3">Waiting for agent…</p>;

  return (
    <div className="space-y-3 px-4 py-3">
      {CINEMA_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label className={LABEL_CLS}>{label}</label>
          <input
            className={INPUT_CLS}
            value={(cam[key] as string) || ""}
            onChange={(e) => updateAgentOutput("camera_specs", { [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------- Director Section ---------- */
const SCENE_TYPES = ["Intro", "Reveal", "Interaction", "Hook", "Lifestyle", "Action", "Detail", "Transition", "Montage", "Narrative", "Closing"];
const SHOT_TYPES = ["Wide Shot", "Medium Shot", "Close-Up", "Extreme Close-Up", "Tracking Shot", "Overhead", "POV", "Dolly", "Pan", "Tilt", "Over-the-Shoulder"];
const VISUAL_TYPES = [
  "Standard", "Model Shot", "Product Shot", "B-Roll",
  "Glitch Art", "Liquid Chrome", "Surrealist Minimalism",
  "Kinetic Typography", "Mixed Media Collage", "Digital Brutalism", "Acid Graphics",
];

export function DirectorSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const shotList = outputs.shot_list as Record<string, unknown> | undefined;
  const rawScenes = shotList ? (shotList.scenes as Array<Record<string, unknown>>) || [] : [];
  const [editIdx, setEditIdx] = useState<number | null>(null);

  if (rawScenes.length === 0) return <p className="text-[9px] text-muted px-2 py-1">Waiting…</p>;

  // Build dynamic scene type list: merge hardcoded + any director-generated types
  const directorTypes = rawScenes.map((s) => s.type as string).filter(Boolean);
  const allSceneTypes = [...new Set([...SCENE_TYPES, ...directorTypes])];
  const typePills = [...new Set(directorTypes)];

  const updateScene = (idx: number, field: string, value: string) => {
    const updated = rawScenes.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    updateAgentOutput("shot_list", { scenes: updated });
  };

  const removeScene = (idx: number) => {
    const updated = rawScenes.filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, scene_number: i + 1 }));
    updateAgentOutput("shot_list", { scenes: updated });
    // Also sync store.scenes so the canvas updates immediately
    const storeScenes = useStore.getState().scenes;
    if (storeScenes.length > idx) {
      const updatedStore = storeScenes.filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, scene_number: i + 1 }));
      useStore.setState({ scenes: updatedStore });
    }
    setEditIdx(null);
  };

  // Gather cast member names and settings for active_cast / active_setting pickers
  const castingBrief = outputs.casting_brief as Record<string, unknown> | undefined;
  const castNames: string[] = castingBrief
    ? ((castingBrief.cast_members as Array<Record<string, string>>) || []).map((m) => m.name).filter(Boolean)
    : [];
  const settingOptions: string[] = [];
  if (castingBrief?.setting_a_description) settingOptions.push("setting_a");
  if (castingBrief?.setting_b_description) settingOptions.push("setting_b");

  const toggleCast = (idx: number, name: string) => {
    const scene = rawScenes[idx];
    const current = (scene.active_cast as string[]) || [];
    const updated = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    updateScene(idx, "active_cast", updated as unknown as string);
  };

  const updateSceneField = (idx: number, field: string, value: unknown) => {
    const updated = rawScenes.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    updateAgentOutput("shot_list", { scenes: updated });
  };

  // Insert a scene AFTER the given index (-1 = prepend, rawScenes.length-1 = append)
  const insertScene = (afterIdx: number) => {
    const uid = `scene-ins-${Date.now()}`;
    const newRawScene = {
      _uid: uid,
      scene_number: 0,
      type: "Lifestyle",
      shot_type: "Wide Shot",
      visual_type: "Standard",
      visual_description: "",
      action_movement: "",
      start_image_prompt: "",
      end_image_prompt: "",
      start_video_prompt: "",
      end_video_prompt: "",
      combined_video_prompt: "",
      active_cast: [] as string[],
      active_setting: null as string | null,
    };
    const insertPos = afterIdx + 1;
    const updatedRaw = [
      ...rawScenes.slice(0, insertPos),
      newRawScene,
      ...rawScenes.slice(insertPos),
    ].map((s, i) => ({ ...s, scene_number: i + 1 }));
    updateAgentOutput("shot_list", { scenes: updatedRaw });

    // Also sync store.scenes so the canvas updates immediately
    const storeScenes = useStore.getState().scenes;
    const newStoreScene: Scene = {
      id: uid,
      scene_number: 0,
      type: "Lifestyle",
      shot_type: "Wide Shot",
      visual_type: "Standard",
      visual_description: "",
      action_movement: "",
      start_image_prompt: "",
      end_image_prompt: "",
      start_frame_status: "idle",
      end_frame_status: "idle",
    };
    const updatedStore = [
      ...storeScenes.slice(0, insertPos),
      newStoreScene,
      ...storeScenes.slice(insertPos),
    ].map((s, i) => ({ ...s, scene_number: i + 1 }));
    useStore.setState({ scenes: updatedStore });

    setEditIdx(insertPos);
  };

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <Film className="w-4 h-4 text-accent-magenta" />
        <span className="text-[13px] font-semibold text-foreground">{rawScenes.length} Scenes</span>
        <button
          onClick={() => insertScene(rawScenes.length - 1)}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-accent-magenta/10 text-accent-magenta hover:bg-accent-magenta/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Scene
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {typePills.map((t) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-accent-magenta/8 text-accent-magenta font-medium">{t}</span>
        ))}
      </div>
      <div className="space-y-1">
        {rawScenes.map((s, i) => (
          <div key={`scene-row-${i}`}>
            {/* Scene row */}
            <div
              className={cn(
                "flex items-center gap-2 text-[13px] cursor-pointer rounded-xl px-3 py-2 transition-all group",
                editIdx === i ? "bg-accent-magenta/8 text-foreground shadow-xs" : "text-foreground hover:bg-card-hover"
              )}
              onClick={() => setEditIdx(editIdx === i ? null : i)}
            >
              <span className="text-accent-magenta font-bold shrink-0 text-[14px]">S{(s.scene_number as number) || i + 1}</span>
              <span className="truncate flex-1 text-[12px]">
                {(s.type as string)} · {(s.shot_type as string)}
                {(s.visual_type as string) && (s.visual_type as string) !== "Standard" && (
                  <span className="text-accent-primary ml-1 font-medium">· {(s.visual_type as string)}</span>
                )}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); insertScene(i); }}
                className="shrink-0 text-muted hover:text-accent-primary transition-colors opacity-0 group-hover:opacity-100"
                title="Insert scene after"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeScene(i); }}
                className="shrink-0 text-muted hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className={cn("w-4 h-4 text-muted transition-transform", editIdx === i && "rotate-90")} />
            </div>

            {/* Inline editor */}
            <AnimatePresence>
              {editIdx === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="bg-card-hover/40 rounded-xl p-3 mt-1 space-y-2.5 border border-border/50">
                    <div className="flex gap-2">
                      <select
                        className={cn(INPUT_CLS, "flex-1")}
                        value={(s.type as string) || ""}
                        onChange={(e) => updateScene(i, "type", e.target.value)}
                      >
                        <option value="">Scene Type…</option>
                        {allSceneTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        className={cn(INPUT_CLS, "w-36")}
                        value={(s.shot_type as string) || ""}
                        onChange={(e) => updateScene(i, "shot_type", e.target.value)}
                      >
                        <option value="">Shot…</option>
                        {SHOT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {/* Visual Type */}
                    <div>
                      <label className={LABEL_CLS}>Visual Style</label>
                      <select
                        className={INPUT_CLS}
                        value={(s.visual_type as string) || "Standard"}
                        onChange={(e) => updateScene(i, "visual_type", e.target.value)}
                      >
                        {VISUAL_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Action / Movement</label>
                      <textarea
                        className={cn(TEXTAREA_CLS, "max-h-40")}
                        value={(s.action_movement as string) || ""}
                        onChange={(e) => updateScene(i, "action_movement", e.target.value)}
                        rows={2}
                        placeholder="Action / movement…"
                      />
                    </div>
                    {/* Active Cast — pill toggles */}
                    {castNames.length > 0 && (
                      <div>
                        <label className={LABEL_CLS}>Cast in Scene</label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {castNames.map((name) => {
                            const active = ((s.active_cast as string[]) || []).includes(name);
                            return (
                              <button
                                key={name}
                                onClick={() => toggleCast(i, name)}
                                className={cn(
                                  "text-[11px] px-2.5 py-1 rounded-full font-medium transition-all",
                                  active
                                    ? "bg-accent-red/15 text-accent-red border border-accent-red/30"
                                    : "bg-card-hover text-muted border border-border hover:border-accent-primary/30 hover:text-foreground"
                                )}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Active Setting */}
                    {settingOptions.length > 0 && (
                      <div>
                        <label className={LABEL_CLS}>Setting</label>
                        <select
                          className={INPUT_CLS}
                          value={(s.active_setting as string) || ""}
                          onChange={(e) => updateSceneField(i, "active_setting", e.target.value || null)}
                        >
                          <option value="">No setting</option>
                          {settingOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt === "setting_a" ? "Setting A" : "Setting B"}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Sound Section ---------- */
export function SoundSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const audio = outputs.audio_specs as Record<string, unknown> | undefined;
  if (!audio) return <p className="text-[13px] text-muted px-4 py-3">Waiting for agent…</p>;

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <label className={LABEL_CLS}>Voiceover Script</label>
        <textarea
          className={cn(TEXTAREA_CLS, "max-h-60")}
          value={(audio.voiceover_script as string) || ""}
          onChange={(e) => updateAgentOutput("audio_specs", { voiceover_script: e.target.value })}
          rows={3}
        />
      </div>
      <div>
        <label className={LABEL_CLS}>Music Prompt</label>
        <textarea
          className={cn(TEXTAREA_CLS, "max-h-60")}
          value={(audio.music_prompt_technical as string) || ""}
          onChange={(e) => updateAgentOutput("audio_specs", { music_prompt_technical: e.target.value })}
          rows={3}
        />
      </div>
      {typeof audio.audio_atmosphere_description === "string" && (
        <div>
          <label className={LABEL_CLS}>Atmosphere</label>
          <p className="text-[13px] text-foreground/70 leading-relaxed">{audio.audio_atmosphere_description as string}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Product Section ---------- */
export function ProductSection() {
  const outputs = useStore((s) => s.agentOutputs);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const specs = outputs.product_specs as Record<string, unknown> | undefined;
  if (!specs) return <p className="text-[13px] text-muted px-4 py-3">Waiting for agent…</p>;

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <label className={LABEL_CLS}>Product Description</label>
        <textarea
          className={cn(TEXTAREA_CLS, "min-h-[60px]")}
          value={(specs.visual_product_description as string) || ""}
          onChange={(e) => updateAgentOutput("product_specs", { visual_product_description: e.target.value })}
          rows={4}
        />
      </div>
    </div>
  );
}

/* ---------- Agent Row with Expandable Content ---------- */
const AGENT_ICONS: Record<string, React.ElementType> = {
  creative_director: Sparkles,
  brand_stylist: Palette,
  product_stylist: Package,
  casting_scout: User,
  cinematographer: Camera,
  director: Film,
  sound_designer: Music,
};

const AGENT_SECTIONS: Record<string, React.FC> = {
  creative_director: CreativeSection,
  brand_stylist: BrandSection,
  product_stylist: ProductSection,
  casting_scout: CastingSection,
  cinematographer: CinemaSection,
  director: DirectorSection,
  sound_designer: SoundSection,
};

/* ── Manual mode: smart status per agent ── */
interface ManualStatus {
  hasOutput: boolean;
  hasCanvasData: boolean;
  canvasItems: string[];
  helpMessage: string;
}

function getManualAgentStatus(
  agentName: string,
  outputs: Record<string, Record<string, unknown>>,
  keyItems: KeyItem[],
  scenes: Scene[],
): ManualStatus {
  const chars = keyItems.filter((k) => k.type === "character");
  const envs = keyItems.filter((k) => k.type === "environment");
  const product = keyItems.find((k) => k.type === "product");
  const cam = keyItems.find((k) => k.type === "camera");
  const vo = keyItems.find((k) => k.type === "voiceover");
  const music = keyItems.find((k) => k.type === "music");

  switch (agentName) {
    case "creative_director": {
      const has = !!outputs.creative_brief;
      return {
        hasOutput: has,
        hasCanvasData: false,
        canvasItems: [],
        helpMessage: "I can create a campaign concept, title & tagline from your brief.",
      };
    }
    case "brand_stylist": {
      const has = !!outputs.visual_identity;
      return {
        hasOutput: has,
        hasCanvasData: false,
        canvasItems: [],
        helpMessage: "I can define your color palette, textures & composition style.",
      };
    }
    case "product_stylist": {
      const has = !!outputs.product_specs;
      const items = product ? [`Product: ${product.label}`] : [];
      return {
        hasOutput: has,
        hasCanvasData: !!product?.text_prompt,
        canvasItems: items,
        helpMessage: product
          ? `I see your product "${product.label}". I can detail its visual specs for prompts.`
          : "I can create detailed product visual specs for your ad.",
      };
    }
    case "casting_scout": {
      const has = !!outputs.casting_brief;
      const items: string[] = [];
      if (chars.length) items.push(`${chars.length} cast member${chars.length > 1 ? "s" : ""}`);
      if (envs.length) items.push(`${envs.length} setting${envs.length > 1 ? "s" : ""}`);
      return {
        hasOutput: has,
        hasCanvasData: chars.length > 0 || envs.length > 0,
        canvasItems: items,
        helpMessage: chars.length > 0
          ? `I see you have ${items.join(" & ")}. I can help create settings or add more cast.`
          : "I can create cast members and settings for your ad.",
      };
    }
    case "cinematographer": {
      const has = !!outputs.camera_specs;
      const items = cam ? [`Camera: ${cam.label}`] : [];
      return {
        hasOutput: has,
        hasCanvasData: !!cam?.text_prompt,
        canvasItems: items,
        helpMessage: cam
          ? "I see camera settings exist. I can enhance lighting & technical specs."
          : "I can define lighting, camera gear & color temperature.",
      };
    }
    case "director": {
      const has = !!outputs.shot_list;
      const items = scenes.length > 0 ? [`${scenes.length} scene${scenes.length > 1 ? "s" : ""}`] : [];
      return {
        hasOutput: has,
        hasCanvasData: scenes.length > 0,
        canvasItems: items,
        helpMessage: scenes.length > 0
          ? `I see ${scenes.length} scene${scenes.length > 1 ? "s" : ""}. I can refine or create a full shot list.`
          : "I can plan your entire scene sequence with shot types & prompts.",
      };
    }
    case "sound_designer": {
      const has = !!outputs.audio_specs;
      const items: string[] = [];
      if (vo) items.push("Voiceover");
      if (music) items.push("Music");
      return {
        hasOutput: has,
        hasCanvasData: !!vo || !!music,
        canvasItems: items,
        helpMessage: (vo || music)
          ? `I see ${items.join(" & ")} configured. I can create the full audio direction.`
          : "I can create voiceover scripts & music direction for your ad.",
      };
    }
    default:
      return { hasOutput: false, hasCanvasData: false, canvasItems: [], helpMessage: "" };
  }
}

/* ── Manual Agent Helper (shown when agent hasn't run yet in manual mode) ── */
function ManualAgentHelper({
  agentName,
  status,
  onAskForHelp,
  isAgentRunning,
}: {
  agentName: string;
  status: ManualStatus;
  onAskForHelp: () => void;
  isAgentRunning: boolean;
}) {
  return (
    <div className="px-4 py-4 space-y-3">
      {/* Smart context message */}
      <div className="flex gap-2.5">
        <Bot className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[12px] text-foreground/80 leading-relaxed">
            {status.helpMessage}
          </p>
          {status.canvasItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {status.canvasItems.map((item) => (
                <span
                  key={item}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green font-medium"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ask for help button */}
      <button
        onClick={onAskForHelp}
        disabled={isAgentRunning}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all",
          isAgentRunning
            ? "bg-accent-primary/10 text-accent-primary/50 cursor-wait"
            : "bg-[#122d31] text-white hover:bg-[#1a3f44] hover:shadow-md active:scale-[0.98]"
        )}
      >
        {isAgentRunning ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working on it…</>
        ) : (
          <><Zap className="w-3.5 h-3.5" /> Ask Agent for Help</>
        )}
      </button>
    </div>
  );
}

export default function AgentDeck() {
  const agents = useStore((s) => s.agents);
  const isRunning = useStore((s) => s.isRunning);
  const workflowId = useStore((s) => s.workflowId);
  const reset = useStore((s) => s.reset);
  const userInput = useStore((s) => s.userInput);
  const outputs = useStore((s) => s.agentOutputs);
  const keyItems = useStore((s) => s.keyItems);
  const scenes = useStore((s) => s.scenes);
  const rebuildFromOutputs = useStore((s) => s.rebuildFromOutputs);
  const storeRunSingleAgent = useStore((s) => s.runSingleAgent);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const brief = outputs.creative_brief as Record<string, unknown> | undefined;
  const projectTitle = (brief?.campaign_title as string) || userInput || "Untitled Project";
  const tagline = (brief?.tagline as string) || "";
  const doneCount = agents.filter((a) => a.status === "done").length;
  const isManualMode = !!(workflowId?.startsWith("manual-"));

  const handleUpdateWorkflow = () => {
    setIsRebuilding(true);
    setTimeout(() => {
      rebuildFromOutputs();
      setIsRebuilding(false);
    }, 300);
  };

  const handleAskAgent = async (agentName: string) => {
    try {
      await storeRunSingleAgent(agentName);
    } catch {
      // error is already set in store
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50/80 border-r border-border">
      {/* Header: Back + Project Info */}
      <div className="px-5 pt-5 pb-4 border-b border-border bg-white">
        <button
          onClick={reset}
          className="flex items-center gap-2 text-[12px] text-muted hover:text-accent-primary transition-all mb-3 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span className="group-hover:underline">Back to Projects</span>
        </button>
        <h2 className="text-[18px] font-bold text-foreground truncate leading-snug tracking-tight">{projectTitle}</h2>
        {!!tagline && <p className="text-[13px] text-accent-primary mt-1 italic font-medium">{tagline}</p>}
        {userInput && (
          <p className="text-[12px] text-muted/70 mt-2 line-clamp-2 leading-relaxed">{userInput}</p>
        )}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-accent-primary/5 to-accent-primary/10 border border-accent-primary/15"
          >
            <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
            <span className="text-[12px] text-accent-primary font-semibold">Pipeline running…</span>
          </motion.div>
        )}
        {isManualMode && !isRunning && (
          <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-accent-primary/5 border border-accent-primary/10">
            <Bot className="w-4 h-4 text-accent-primary" />
            <span className="text-[11px] text-accent-primary font-medium">Your AI team is ready — ask any agent for help</span>
          </div>
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto py-1">
        {agents.map((agent) => {
          const isExpanded = expandedAgent === agent.id;
          const hasDone = agent.status === "done";
          const isAgentRunning = agent.status === "running";
          const AgentIcon = AGENT_ICONS[agent.name] || Circle;
          const Section = AGENT_SECTIONS[agent.name];
          const manualStatus = isManualMode ? getManualAgentStatus(agent.name, outputs, keyItems, scenes) : null;

          // In manual mode: expandable if agent has output OR can offer help
          // In pipeline mode: expandable only when done
          const canExpand = isManualMode ? !!Section : (hasDone && !!Section);

          // Manual mode status badge
          const manualBadge = isManualMode && !hasDone && !isAgentRunning
            ? (manualStatus?.hasCanvasData ? "has-data" : "available")
            : null;

          return (
            <div key={agent.id} className={cn(
              "border-b border-border/30 last:border-0 relative",
              isAgentRunning && "overflow-hidden",
            )}>
              {/* Glow pulse for running agent */}
              {isAgentRunning && (
                <motion.div
                  className="absolute inset-0 pointer-events-none z-0 rounded-sm"
                  style={{ background: `linear-gradient(90deg, transparent, ${agent.color}12, transparent)` }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <button
                onClick={() => canExpand ? setExpandedAgent(isExpanded ? null : agent.id) : undefined}
                className={cn(
                  "relative z-10 w-full flex items-center gap-3 px-5 py-3.5 transition-all text-left group",
                  isAgentRunning && "bg-accent-primary/3",
                  isExpanded ? "bg-white shadow-xs" : canExpand ? "hover:bg-white/60" : ""
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm",
                    agent.status === "idle" && !isManualMode ? "bg-gray-100" : "",
                    agent.status === "idle" && isManualMode ? "bg-accent-primary/8" : "",
                    isAgentRunning && "ring-2 ring-accent-primary/40 animate-pulse",
                  )}
                  style={{
                    backgroundColor: agent.status === "done" || agent.status === "running" ? `${agent.color}18` : undefined,
                    boxShadow: isAgentRunning ? `0 0 16px ${agent.color}40` : (agent.status === "done" ? `0 2px 8px ${agent.color}15` : undefined),
                  }}
                >
                  <AgentIcon
                    className="w-4 h-4 shrink-0"
                    style={{ color: (agent.status === "idle" && !isManualMode) ? "#9CA3AF" : agent.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-[13px] truncate font-semibold tracking-tight block",
                      agent.status === "idle" && !isManualMode ? "text-muted" : "text-foreground"
                    )}
                  >
                    {agent.label}
                  </span>
                  {isAgentRunning && (
                    <span className="text-[10px] text-accent-primary font-medium animate-pulse">Working on it…</span>
                  )}
                  {manualBadge === "has-data" && (
                    <span className="text-[10px] text-accent-green font-medium">Has your data</span>
                  )}
                  {manualBadge === "available" && (
                    <span className="text-[10px] text-accent-primary font-medium">Ready to help</span>
                  )}
                </div>
                {isManualMode && !hasDone && !isAgentRunning ? (
                  <span className="w-4 h-4 rounded-full bg-accent-primary/15 flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-accent-primary" />
                  </span>
                ) : (
                  <StatusIcon status={agent.status} />
                )}
                {canExpand && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </motion.div>
                )}
              </button>

              {/* Expanded content with animation */}
              <AnimatePresence>
                {isExpanded && canExpand && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gray-50/80 border-t border-border/30">
                      {hasDone && Section ? (
                        <Section />
                      ) : isManualMode && manualStatus ? (
                        <ManualAgentHelper
                          agentName={agent.name}
                          status={manualStatus}
                          onAskForHelp={() => handleAskAgent(agent.name)}
                          isAgentRunning={isAgentRunning}
                        />
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer: Update Workflow + stats */}
      <div className="px-5 py-4 pb-14 border-t border-border space-y-3">
        {isManualMode && doneCount === 0 ? (
          <p className="text-[11px] text-muted text-center leading-relaxed">
            Expand any agent above and click <strong>"Ask Agent for Help"</strong> to get AI assistance
          </p>
        ) : (
          <>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted font-medium">{doneCount} / {agents.length} agents complete</span>
                <span className="text-[11px] text-muted">{Math.round((doneCount / agents.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-card-hover rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / agents.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
            {doneCount > 0 && (
              <button
                onClick={handleUpdateWorkflow}
                disabled={isRebuilding}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold transition-all shadow-sm",
                  isRebuilding
                    ? "bg-[#122d31]/10 text-[#122d31]/50 cursor-wait"
                    : "bg-[#122d31] text-white hover:bg-[#1a3f44] hover:shadow-md active:scale-[0.98]"
                )}
              >
                {isRebuilding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isRebuilding ? "Rebuilding…" : "Update Workflow"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
