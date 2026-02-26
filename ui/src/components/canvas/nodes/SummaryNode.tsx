"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
import { FileText, Clapperboard, Palette, Users, Camera, Music, Sparkles, Plus, X, Pencil } from "lucide-react";
import { useStore, AD_TYPES } from "@/lib/store";

/* ---------- helpers ---------- */
function safe(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return "";
}

function truncate(s: string, max = 120): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}

/* ---------- Section component ---------- */
function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 shrink-0" style={{ color }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="pl-[18px] text-[10px] text-foreground/75 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/* ---------- Editable inline text (click-to-edit) ---------- */
function EditableText({
  value,
  placeholder,
  onSave,
  bold,
  italic,
  className: extraClass,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  bold?: boolean;
  italic?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }, [draft, value, onSave]);

  if (editing) {
    return (
      <input
        ref={ref}
        className={`w-full bg-transparent border-b border-accent-primary/40 outline-none text-[10px] text-foreground/90 py-0.5 ${extraClass || ""}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-accent-primary/5 rounded px-0.5 -mx-0.5 transition-colors ${bold ? "font-semibold" : ""} ${italic ? "italic" : ""} ${!value ? "text-muted/40 italic" : ""} ${extraClass || ""}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}

/* ---------- Editable textarea (click-to-edit, multi-line) ---------- */
function EditableArea({
  value,
  placeholder,
  onSave,
  rows = 2,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  }, [draft, value, onSave]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="w-full bg-transparent border border-accent-primary/30 rounded outline-none text-[10px] text-foreground/90 p-1 resize-none"
        value={draft}
        rows={rows}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        placeholder={placeholder}
      />
    );
  }

  return (
    <p
      className={`cursor-pointer hover:bg-accent-primary/5 rounded px-0.5 -mx-0.5 transition-colors ${!value ? "text-muted/40 italic" : ""}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value ? truncate(value, 200) : placeholder}
    </p>
  );
}

/* ---------- SummaryNode ---------- */
function SummaryNodeComponent({ selected }: NodeProps) {
  const outputs = useStore((s) => s.agentOutputs);
  const scenes = useStore((s) => s.scenes);
  const keyItems = useStore((s) => s.keyItems);
  const userInput = useStore((s) => s.userInput);
  const isRunning = useStore((s) => s.isRunning);
  const adType = useStore((s) => s.adType);
  const updateAgentOutput = useStore((s) => s.updateAgentOutput);
  const adTypeLabel = AD_TYPES.find((t) => t.id === adType)?.label;

  const brief = (outputs.creative_brief || {}) as Record<string, unknown>;
  const identity = (outputs.visual_identity || {}) as Record<string, unknown>;
  const casting = (outputs.casting_brief || {}) as Record<string, unknown>;
  const camera = (outputs.camera_specs || {}) as Record<string, unknown>;
  const audio = (outputs.audio_specs || {}) as Record<string, unknown>;

  const hasAnyData = outputs.creative_brief || outputs.visual_identity || outputs.casting_brief || outputs.camera_specs || outputs.audio_specs;

  // Waiting for agents only if agents are actively running and no data yet
  if (!hasAnyData && scenes.length === 0 && keyItems.length === 0 && isRunning) {
    return (
      <div
        className={`bg-card/90 backdrop-blur-sm rounded-xl border-2 shadow-lg w-[320px] transition-colors ${
          selected ? "border-accent-primary/60 shadow-accent-primary/10" : "border-border"
        }`}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <FileText className="w-4 h-4 text-accent-primary" />
          <span className="text-xs font-bold text-foreground">Production Brief</span>
        </div>
        <div className="px-4 py-6 flex flex-col items-center gap-2">
          <Sparkles className="w-5 h-5 text-muted/40 animate-pulse" />
          <span className="text-[10px] text-muted">Waiting for agents…</span>
        </div>
      </div>
    );
  }

  const campaignTitle = safe(brief.campaign_title);
  const tagline = safe(brief.tagline);
  const concept = safe(brief.concept_summary);
  const moodStr = safe(brief.mood_keywords);

  const colorsRaw = safe(identity.color_palette);
  const textures = safe(identity.textures_materials);
  const composition = safe(identity.composition_style);

  const castMembers = (casting.cast_members as Array<Record<string, unknown>>) || [];
  const settingA = safe(casting.setting_a_description);
  const settingB = safe(casting.setting_b_description);

  const lighting = safe(camera.lighting);
  const gear = safe(camera.camera_gear);
  const colorTemp = safe(camera.color_temperature);

  const atmosphere = safe(audio.audio_atmosphere_description);
  const musicPrompt = safe(audio.music_prompt_technical);

  // Parse color palette for display
  const colorChips = colorsRaw ? colorsRaw.split(",").map((c) => c.trim()).filter(Boolean) : [];

  // Cast member management
  const addCastMember = useCallback(() => {
    const members = [...castMembers, { name: "New Character", driver_type: "human", visual_prompt: "" }];
    updateAgentOutput("casting_brief", { cast_members: members });
  }, [castMembers, updateAgentOutput]);

  const removeCastMember = useCallback((idx: number) => {
    const members = castMembers.filter((_, i) => i !== idx);
    updateAgentOutput("casting_brief", { cast_members: members });
  }, [castMembers, updateAgentOutput]);

  const updateCastMember = useCallback((idx: number, field: string, val: string) => {
    const members = castMembers.map((m, i) => i === idx ? { ...m, [field]: val } : m);
    updateAgentOutput("casting_brief", { cast_members: members });
  }, [castMembers, updateAgentOutput]);

  return (
    <div
      className={`bg-card/90 backdrop-blur-sm rounded-xl border-2 shadow-lg w-[320px] transition-colors ${
        selected ? "border-accent-primary/60 shadow-accent-primary/10" : "border-border"
      }`}
    >
      {/* Header — editable title & tagline */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-accent-primary" />
          <span className="text-xs font-bold text-foreground">Production Brief</span>
          {adTypeLabel && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-accent-primary/10 text-[8px] font-semibold text-accent-primary whitespace-nowrap">
              {adTypeLabel}
            </span>
          )}
        </div>
        <div className="text-[11px]">
          <EditableText
            value={campaignTitle}
            placeholder={userInput ? truncate(userInput, 60) : "Campaign title…"}
            onSave={(v) => updateAgentOutput("creative_brief", { campaign_title: v })}
            bold
            className="text-accent-primary text-[11px]"
          />
        </div>
        <div className="mt-0.5">
          <EditableText
            value={tagline}
            placeholder="Tagline…"
            onSave={(v) => updateAgentOutput("creative_brief", { tagline: v })}
            italic
            className="text-accent-yellow/80 text-[10px]"
          />
        </div>
      </div>

      {/* Body — all sections always visible & editable */}
      <div className="px-4 py-3 max-h-[600px] overflow-y-auto nodrag nowheel">
        {/* Concept */}
        <Section icon={Sparkles} title="Concept" color="#508ab7">
          <EditableArea
            value={concept}
            placeholder="Describe the campaign concept…"
            onSave={(v) => updateAgentOutput("creative_brief", { concept_summary: v })}
            rows={2}
          />
          <div className="mt-1">
            <EditableText
              value={moodStr}
              placeholder="Mood keywords (comma-separated)…"
              onSave={(v) => updateAgentOutput("creative_brief", { mood_keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="text-[9px]"
            />
            {Array.isArray(brief.mood_keywords) && (brief.mood_keywords as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(brief.mood_keywords as string[]).map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded-full bg-accent-primary/10 text-[8px] text-accent-primary font-medium">{kw}</span>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Visual Style */}
        <Section icon={Palette} title="Visual Style" color="#a855f7">
          <div className="mb-1">
            <span className="text-[9px] text-muted/60 mr-1">Colors:</span>
            <EditableText
              value={colorsRaw}
              placeholder="Color palette (e.g. #1a1a1a, #f5e6d3, gold)…"
              onSave={(v) => updateAgentOutput("visual_identity", { color_palette: v.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="text-[9px]"
            />
            {colorChips.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {colorChips.map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-border" style={{ background: c }} title={c} />
                ))}
              </div>
            )}
          </div>
          <p><b>Textures:</b> <EditableText value={textures} placeholder="Textures & materials…" onSave={(v) => updateAgentOutput("visual_identity", { textures_materials: v })} /></p>
          <p><b>Composition:</b> <EditableText value={composition} placeholder="Composition style…" onSave={(v) => updateAgentOutput("visual_identity", { composition_style: v })} /></p>
        </Section>

        {/* Camera & Lighting */}
        <Section icon={Camera} title="Camera & Lighting" color="#508ab7">
          <p><b>Lighting:</b> <EditableText value={lighting} placeholder="Lighting setup…" onSave={(v) => updateAgentOutput("camera_specs", { lighting: v })} /></p>
          <p><b>Gear:</b> <EditableText value={gear} placeholder="Camera gear…" onSave={(v) => updateAgentOutput("camera_specs", { camera_gear: v })} /></p>
          <p><b>Color temp:</b> <EditableText value={colorTemp} placeholder="Color temperature…" onSave={(v) => updateAgentOutput("camera_specs", { color_temperature: v })} /></p>
        </Section>

        {/* Cast & Settings */}
        <Section icon={Users} title="Cast & Settings" color="#f87171">
          {castMembers.map((m, i) => (
            <div key={i} className="mb-1.5 p-1 rounded bg-foreground/[0.02] border border-transparent hover:border-border group relative">
              <button
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeCastMember(i)}
                title="Remove"
              >
                <X className="w-2 h-2" />
              </button>
              <div className="flex items-center gap-1">
                <EditableText value={safe(m.name)} placeholder="Name…" onSave={(v) => updateCastMember(i, "name", v)} bold className="text-[10px]" />
                <span className="text-muted/40 text-[8px]">(</span>
                <EditableText value={safe(m.driver_type)} placeholder="type" onSave={(v) => updateCastMember(i, "driver_type", v)} className="text-[8px] text-muted" />
                <span className="text-muted/40 text-[8px]">)</span>
              </div>
              <EditableText value={safe(m.visual_prompt)} placeholder="Visual description…" onSave={(v) => updateCastMember(i, "visual_prompt", v)} className="text-[9px]" />
            </div>
          ))}
          <button
            className="flex items-center gap-1 text-[9px] text-accent-primary/70 hover:text-accent-primary transition-colors mt-1"
            onClick={addCastMember}
          >
            <Plus className="w-3 h-3" /> Add cast member
          </button>
          <div className="mt-2">
            <p><b>Setting A:</b> <EditableText value={settingA} placeholder="Primary environment…" onSave={(v) => updateAgentOutput("casting_brief", { setting_a_description: v })} /></p>
            <p><b>Setting B:</b> <EditableText value={settingB} placeholder="Secondary environment…" onSave={(v) => updateAgentOutput("casting_brief", { setting_b_description: v })} /></p>
          </div>
        </Section>

        {/* Scenes (read-only summary — scenes are managed on canvas) */}
        <Section icon={Clapperboard} title={scenes.length > 0 ? `Scenes (${scenes.length})` : "Scenes"} color="#e879f9">
          {scenes.length > 0 ? (
            scenes.map((s) => (
              <p key={s.id} className="mb-0.5">
                <b className="text-accent-magenta">S{s.scene_number}</b>{" "}
                <span className="text-muted text-[9px]">{s.type} · {s.shot_type}</span>{" "}
                — {truncate(s.action_movement || s.visual_description || "Empty scene", 90)}
              </p>
            ))
          ) : (
            <p className="text-[9px] italic text-muted/50">Use <b>+ Add</b> in toolbar to add scenes</p>
          )}
        </Section>

        {/* Audio & Music */}
        <Section icon={Music} title="Audio & Music" color="#e879f9">
          <p><b>Atmosphere:</b></p>
          <EditableArea value={atmosphere} placeholder="Audio atmosphere description…" onSave={(v) => updateAgentOutput("audio_specs", { audio_atmosphere_description: v })} rows={2} />
          <p className="mt-1"><b>Music:</b></p>
          <EditableArea value={musicPrompt} placeholder="Music generation prompt…" onSave={(v) => updateAgentOutput("audio_specs", { music_prompt_technical: v })} rows={2} />
        </Section>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-border flex items-center gap-1">
        <Pencil className="w-2.5 h-2.5 text-muted/40" />
        <p className="text-[8px] text-muted truncate">{truncate(userInput, 70)} · Click any field to edit</p>
      </div>
    </div>
  );
}

export default memo(SummaryNodeComponent);
