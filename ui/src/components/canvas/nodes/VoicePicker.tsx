"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, Mic, Keyboard, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ElevenLabs voice presets for text-to-speech-turbo-2-5
// Names are used directly; community voices use their ElevenLabs voice IDs
export const VOICE_PRESETS = [
  // ── Core Named Voices ──
  { name: "Sarah",     gender: "Female", accent: "American",      tone: "Soft, warm, narrative" },
  { name: "Rachel",    gender: "Female", accent: "American",      tone: "Calm, gentle, composed" },
  { name: "Laura",     gender: "Female", accent: "American",      tone: "Upbeat, friendly, clear" },
  { name: "Alice",     gender: "Female", accent: "British",       tone: "Confident, poised, elegant" },
  { name: "Charlotte", gender: "Female", accent: "European",      tone: "Alluring, smooth, refined" },
  { name: "Lily",      gender: "Female", accent: "British",       tone: "Warm, expressive, rich" },
  { name: "Aria",      gender: "Female", accent: "American",      tone: "Expressive, dynamic, bright" },
  { name: "Jessica",   gender: "Female", accent: "American",      tone: "Expressive, engaging" },
  { name: "Matilda",   gender: "Female", accent: "American",      tone: "Friendly, approachable" },
  { name: "Adam",      gender: "Male",   accent: "American",      tone: "Deep, authoritative, clear" },
  { name: "Brian",     gender: "Male",   accent: "American",      tone: "Deep, narration, resonant" },
  { name: "Bill",      gender: "Male",   accent: "American",      tone: "Trustworthy, measured" },
  { name: "George",    gender: "Male",   accent: "British",       tone: "Warm, storytelling" },
  { name: "Daniel",    gender: "Male",   accent: "British",       tone: "Authoritative, commanding" },
  { name: "Callum",    gender: "Male",   accent: "Transatlantic", tone: "Intense, dramatic" },
  { name: "Charlie",   gender: "Male",   accent: "Australian",    tone: "Natural, conversational" },
  { name: "Chris",     gender: "Male",   accent: "American",      tone: "Casual, laid-back" },
  { name: "Eric",      gender: "Male",   accent: "American",      tone: "Friendly, upbeat" },
  { name: "Roger",     gender: "Male",   accent: "American",      tone: "Confident, polished" },
  { name: "Will",      gender: "Male",   accent: "American",      tone: "Friendly, versatile" },
  { name: "Liam",      gender: "Male",   accent: "American",      tone: "Energetic, social media" },
  { name: "River",     gender: "Non-binary", accent: "American",  tone: "Confident, smooth" },
  // ── Community Voices (ID-based) ──
  { name: "BIvP0GN1cAtSRTxNHnWS", gender: "Female", accent: "American",  tone: "Ellen - Serious, direct, confident" },
  { name: "aMSt68OGf4xUZAnLpTU8", gender: "Female", accent: "American",  tone: "Juniper - Grounded, professional" },
  { name: "RILOU7YmBhvwJGDGjNmP", gender: "Female", accent: "American",  tone: "Jane - Professional audiobook" },
  { name: "Z3R5wn05IrDiVCyEkUrK", gender: "Female", accent: "American",  tone: "Arabella - Mysterious, emotive" },
  { name: "tnSpp4vdxKPjI9w0GnoV", gender: "Female", accent: "American",  tone: "Hope - Upbeat and clear" },
  { name: "BpjGufoPiobT79j2vtj4", gender: "Female", accent: "Indian",    tone: "Priyanka - Calm, neutral, relaxed" },
  { name: "5l5f8iK3YPeGga21rQIX", gender: "Female", accent: "American",  tone: "Adeline - Feminine, conversational" },
  { name: "BZgkqPqms7Kj9ulSkVzn", gender: "Female", accent: "American",  tone: "Eve - Authentic, energetic, happy" },
  { name: "ZF6FPAbjXT4488VcRRnw", gender: "Female", accent: "American",  tone: "Amelia - Enthusiastic, expressive" },
  { name: "hpp4J3VqNfWAUOO0d1Us", gender: "Female", accent: "American",  tone: "Bella - Professional, bright, warm" },
  { name: "FUfBrNit0NNZAwb58KWH", gender: "Female", accent: "American",  tone: "Angela - Conversational, friendly" },
  { name: "EkK5I93UQWFDigLMpZcX", gender: "Male",   accent: "American",  tone: "James - Husky, engaging, bold" },
  { name: "NNl6r8mD7vthiJatiJt1", gender: "Male",   accent: "American",  tone: "Bradford - Expressive, articulate" },
  { name: "YOq2y2Up4RgXP2HyXjE5", gender: "Male",   accent: "American",  tone: "Xavier - Dominating announcer" },
  { name: "Bj9UqZbhQsanLzgalpEG", gender: "Male",   accent: "American",  tone: "Austin - Deep, raspy, authentic" },
  { name: "pNInz6obpgDQGcFmaJgB", gender: "Male",   accent: "American",  tone: "Adam - Dominant, firm" },
  { name: "nPczCjzI2devNBz1zQrb", gender: "Male",   accent: "American",  tone: "Brian - Deep, resonant, comforting" },
  { name: "gs0tAILXbY5DNrJrsM6F", gender: "Male",   accent: "American",  tone: "Jeff - Classy, resonating, strong" },
  { name: "P1bg08DkjqiVEzOn76yG", gender: "Male",   accent: "Indian",    tone: "Viraj - Rich and soft" },
  { name: "DGTOOUoGpoP6UZ9uSWfA", gender: "Male",   accent: "French",    tone: "Célian - Documentary narrator" },
  { name: "FF7KdobWPaiR0vkcALHF", gender: "Male",   accent: "American",  tone: "David - Movie trailer narrator" },
  { name: "KoQQbl9zjAdLgKZjm8Ol", gender: "Male",   accent: "American",  tone: "Pro Narrator - Convincing storyteller" },
  { name: "IjnA9kwZJHJ20Fp7Vmy6", gender: "Male",   accent: "American",  tone: "Matthew - Casual, friendly, smooth" },
];

export type VoicePreset = (typeof VOICE_PRESETS)[number];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
];

/* ---------- Voice Settings (stability, similarity, style, speed, language) ---------- */
export type VoiceSettingsValues = {
  stability: number;
  similarity: number;
  style: number;
  speed: number;
  language: string;
};

export function VoiceSettings({
  stability,
  similarity,
  style,
  speed,
  language,
  onChange,
  accentColor = "violet",
}: VoiceSettingsValues & {
  onChange: (key: keyof VoiceSettingsValues, value: number | string) => void;
  accentColor?: "violet" | "red" | "orange";
}) {
  const [open, setOpen] = useState(false);
  const colorMap = { violet: "text-violet-500", red: "text-red-500", orange: "text-orange-500" };
  const bgMap = { violet: "bg-violet-50 border-violet-200/60", red: "bg-red-50 border-red-200/60", orange: "bg-orange-50 border-orange-200/60" };
  const acColor = accentColor === "red" ? "#ef4444" : accentColor === "orange" ? "#f97316" : "#8b5cf6";

  const Slider = ({ label, value, min, max, step, field, leftLabel, rightLabel }: {
    label: string; value: number; min: number; max: number; step: number;
    field: keyof VoiceSettingsValues; leftLabel: string; rightLabel: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-medium text-neutral-500">{label}</span>
        <span className="text-[9px] font-mono text-neutral-400">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(field, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-neutral-200 cursor-pointer"
        style={{ accentColor: acColor }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[7px] text-neutral-300">{leftLabel}</span>
        <span className="text-[7px] text-neutral-300">{rightLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="nodrag nowheel">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={cn(
          "flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-md transition-all",
          open ? cn(bgMap[accentColor], colorMap[accentColor]) : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
        )}
      >
        <Settings2 className="w-3 h-3" />
        Settings
        <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-1.5 rounded-lg border border-neutral-200 bg-white/80 backdrop-blur-sm p-2.5 flex flex-col gap-2.5"
        >
          <Slider label="Stability" value={stability} min={0} max={1} step={0.01}
            field="stability" leftLabel="More variable" rightLabel="More stable" />

          <Slider label="Similarity Boost" value={similarity} min={0} max={1} step={0.01}
            field="similarity" leftLabel="Low" rightLabel="High" />

          <Slider label="Style" value={style} min={0} max={1} step={0.01}
            field="style" leftLabel="None" rightLabel="Exaggerated" />

          <Slider label="Speed" value={speed} min={0.7} max={1.2} step={0.01}
            field="speed" leftLabel="0.70x Slow" rightLabel="1.20x Fast" />

          {/* Language selector */}
          <div>
            <span className="text-[9px] font-medium text-neutral-500 mb-1 block">Language</span>
            <select
              value={language}
              onChange={(e) => onChange("language", e.target.value)}
              className="w-full text-[10px] bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1.5 text-foreground outline-none focus:border-neutral-300 cursor-pointer"
            >
              <option value="">Auto-detect</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
              ))}
            </select>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ---------- Voice Picker (portal-based, matches SceneNode ModelPicker style) ---------- */
export function VoicePicker({
  selected,
  onSelect,
  className,
  accentColor = "violet",
}: {
  selected: string;
  onSelect: (name: string) => void;
  className?: string;
  accentColor?: "violet" | "red" | "orange";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });

  const sel = VOICE_PRESETS.find((v) => v.name === selected);
  const isCustom = !sel;
  const isIdPreset = sel && sel.name.length > 15; // community voice with ID name
  const displayName = sel
    ? (isIdPreset ? (sel.tone.split(" - ")[0] || sel.name.slice(0, 10)) : sel.name)
    : selected || "Select voice";
  const displayAccent = sel ? sel.accent : "Custom ID";

  // Position the portal dropdown below the button
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) });
  }, [open]);

  // Close on outside click
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
    ? VOICE_PRESETS.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.tone.toLowerCase().includes(search.toLowerCase()) ||
          v.accent.toLowerCase().includes(search.toLowerCase()) ||
          v.gender.toLowerCase().includes(search.toLowerCase())
      )
    : VOICE_PRESETS;

  // Show "Use custom" option when search doesn't match any preset exactly
  const hasExactMatch = VOICE_PRESETS.some((v) => v.name.toLowerCase() === search.toLowerCase());
  const showCustomOption = search.trim().length > 0 && !hasExactMatch;

  // Separate core (short names) from community (ID-based) voices
  const isIdBased = (name: string) => name.length > 15;
  const coreFiltered = filtered.filter((v) => !isIdBased(v.name));
  const communityFiltered = filtered.filter((v) => isIdBased(v.name));

  const coreGroups = [
    { label: "Female", items: coreFiltered.filter((v) => v.gender === "Female") },
    { label: "Male", items: coreFiltered.filter((v) => v.gender === "Male") },
    { label: "Non-binary", items: coreFiltered.filter((v) => v.gender === "Non-binary") },
  ].filter((g) => g.items.length > 0);

  const communityGroups = [
    { label: "Female", items: communityFiltered.filter((v) => v.gender === "Female") },
    { label: "Male", items: communityFiltered.filter((v) => v.gender === "Male") },
  ].filter((g) => g.items.length > 0);

  const groups = coreGroups;
  const hasCommunity = communityGroups.length > 0;

  const accentMap = {
    violet: { bg: "bg-violet-50", text: "text-violet-700", ring: "border-violet-200/80", icon: "text-violet-400", hover: "hover:bg-violet-50", selectedBg: "bg-violet-50", selectedText: "text-violet-700" },
    red:    { bg: "bg-red-50",    text: "text-red-700",    ring: "border-red-200/80",    icon: "text-red-400",    hover: "hover:bg-red-50",    selectedBg: "bg-red-50",    selectedText: "text-red-700" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", ring: "border-orange-200/80", icon: "text-orange-400", hover: "hover:bg-orange-50", selectedBg: "bg-orange-50", selectedText: "text-orange-700" },
  };
  const ac = accentMap[accentColor];

  const genderBadge = (gender: string) => {
    if (gender === "Female") return "bg-pink-50 text-pink-500";
    if (gender === "Male") return "bg-blue-50 text-blue-500";
    return "bg-purple-50 text-purple-500";
  };

  return (
    <div className={cn("nodrag nowheel", className)}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={cn(
          "w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border text-[10px] font-medium text-neutral-700 hover:bg-white transition-all shadow-sm",
          ac.ring
        )}
      >
        {isCustom ? (
          <Keyboard className={cn("w-3 h-3 shrink-0", ac.icon)} />
        ) : (
          <Mic className={cn("w-3 h-3 shrink-0", ac.icon)} />
        )}
        <span className="truncate flex-1 text-left">{displayName}</span>
        <span className="text-[8px] text-neutral-400 truncate">{displayAccent}</span>
        <ChevronDown className={cn("w-2.5 h-2.5 text-neutral-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Detail chip under button */}
      {sel ? (
        <div className="flex items-center gap-1.5 mt-1 px-0.5">
          <span className={cn("text-[8px] font-medium px-1.5 py-0.5 rounded-full", genderBadge(sel.gender))}>{sel.gender}</span>
          <span className="text-[8px] text-neutral-400">{sel.accent}</span>
          <span className="text-[8px] text-neutral-300">·</span>
          <span className="text-[8px] text-neutral-400 italic truncate">{sel.tone}</span>
        </div>
      ) : selected ? (
        <div className="flex items-center gap-1.5 mt-1 px-0.5">
          <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">Custom</span>
          <span className="text-[8px] text-neutral-400 font-mono truncate">{selected}</span>
        </div>
      ) : null}

      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropRef}
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden nodrag nowheel"
            style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          >
            {/* Search / paste voice ID */}
            <div className="p-2 border-b border-neutral-100">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200">
                <Search className="w-3 h-3 text-neutral-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search.trim()) {
                      const match = VOICE_PRESETS.find((v) => v.name.toLowerCase() === search.toLowerCase());
                      onSelect(match ? match.name : search.trim());
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                  placeholder="Search or paste voice ID…"
                  className="text-[10px] bg-transparent outline-none flex-1 text-foreground placeholder:text-neutral-300"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Custom voice ID option */}
            {showCustomOption && (
              <div className="border-b border-neutral-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(search.trim()); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[10px] text-amber-700 bg-amber-50/50 hover:bg-amber-50 transition-colors"
                >
                  <Keyboard className="w-3 h-3 text-amber-500 shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">Use custom voice ID</span>
                    <span className="text-[8px] text-amber-500 font-mono truncate">{search.trim()}</span>
                  </div>
                </button>
              </div>
            )}

            {/* Voice list */}
            <div className="max-h-64 overflow-y-auto py-1 nowheel">
              {groups.length === 0 && !hasCommunity && !showCustomOption && (
                <p className="text-[10px] text-neutral-400 px-3 py-2">No voices found — type to use custom ID</p>
              )}
              {/* Core voices */}
              {groups.length > 0 && (
                <div className="px-3 pt-1 pb-0.5">
                  <span className="text-[7px] uppercase tracking-widest text-neutral-300 font-bold">Core Voices</span>
                </div>
              )}
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="px-3 pt-1.5 pb-0.5">
                    <span className="text-[8px] uppercase tracking-wider text-neutral-400 font-semibold">{group.label}</span>
                  </div>
                  {group.items.map((v) => (
                    <button
                      key={v.name}
                      onClick={(e) => { e.stopPropagation(); onSelect(v.name); setOpen(false); setSearch(""); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors",
                        v.name === selected
                          ? cn(ac.selectedBg, ac.selectedText, "font-medium")
                          : cn("text-neutral-600", ac.hover)
                      )}
                    >
                      <Mic className={cn("w-3 h-3 shrink-0", v.name === selected ? ac.icon : "text-neutral-300")} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate font-medium">{v.name}</span>
                        <span className="text-[8px] text-neutral-400 truncate">{v.accent} · {v.tone}</span>
                      </div>
                      {v.name === selected && <Check className={cn("w-3 h-3 shrink-0 ml-auto", ac.text)} />}
                    </button>
                  ))}
                </div>
              ))}
              {/* Community voices */}
              {hasCommunity && (
                <>
                  <div className="px-3 pt-2.5 pb-0.5 border-t border-neutral-100 mt-1">
                    <span className="text-[7px] uppercase tracking-widest text-neutral-300 font-bold">Community Voices</span>
                  </div>
                  {communityGroups.map((group) => (
                    <div key={`community-${group.label}`}>
                      <div className="px-3 pt-1.5 pb-0.5">
                        <span className="text-[8px] uppercase tracking-wider text-neutral-400 font-semibold">{group.label}</span>
                      </div>
                      {group.items.map((v) => {
                        const readableName = v.tone.split(" - ")[0] || v.name.slice(0, 8);
                        const description = v.tone.split(" - ").slice(1).join(" - ") || v.tone;
                        return (
                          <button
                            key={v.name}
                            onClick={(e) => { e.stopPropagation(); onSelect(v.name); setOpen(false); setSearch(""); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[10px] transition-colors",
                              v.name === selected
                                ? cn(ac.selectedBg, ac.selectedText, "font-medium")
                                : cn("text-neutral-600", ac.hover)
                            )}
                          >
                            <Mic className={cn("w-3 h-3 shrink-0", v.name === selected ? ac.icon : "text-neutral-300")} />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate font-medium">{readableName}</span>
                              <span className="text-[8px] text-neutral-400 truncate">{description}</span>
                              <span className="text-[7px] text-neutral-300 font-mono truncate">{v.name.slice(0, 12)}…</span>
                            </div>
                            {v.name === selected && <Check className={cn("w-3 h-3 shrink-0 ml-auto", ac.text)} />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
