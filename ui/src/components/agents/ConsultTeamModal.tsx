"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import {
  Loader2, CheckCircle2, Circle, AlertCircle, ArrowLeft,
  ChevronRight, RefreshCw, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CreativeSection, BrandSection, ProductSection,
  CastingSection, CinemaSection, DirectorSection, SoundSection,
} from "@/components/agents/AgentDeck";

/* ═══════════════════════════════════════════════════════
   Agent Character Definitions
   ═══════════════════════════════════════════════════════ */

export interface AgentCharacter {
  agentName: string;       // maps to store agent.name
  characterName: string;   // human-readable character name
  role: string;            // short role tag
  description: string;     // one-liner
  skinColor: string;       // for SVG avatar
  hairColor: string;
  shirtColor: string;
  accentColor: string;     // card gradient accent
  hasGlasses: boolean;
  hasBow: boolean;
  hairStyle: "short" | "curly" | "long" | "bun" | "mohawk" | "wavy" | "spiky";
}

export const AGENTS: AgentCharacter[] = [
  {
    agentName: "creative_director",
    characterName: "Aria Chen",
    role: "Creative Director",
    description: "Shapes the campaign vision, title, concept, and mood.",
    skinColor: "#F5D6C3",
    hairColor: "#1A1A2E",
    shirtColor: "#7C3AED",
    accentColor: "#7C3AED",
    hasGlasses: false,
    hasBow: false,
    hairStyle: "long",
  },
  {
    agentName: "brand_stylist",
    characterName: "Luca Moretti",
    role: "Brand Stylist",
    description: "Defines color palette, textures, and composition style.",
    skinColor: "#E8C4A0",
    hairColor: "#5C3317",
    shirtColor: "#0EA5E9",
    accentColor: "#0EA5E9",
    hasGlasses: true,
    hasBow: false,
    hairStyle: "curly",
  },
  {
    agentName: "product_stylist",
    characterName: "Maya Okafor",
    role: "Product Stylist",
    description: "Crafts the visual product description and styling cues.",
    skinColor: "#8B6F47",
    hairColor: "#0A0A0A",
    shirtColor: "#F59E0B",
    accentColor: "#F59E0B",
    hasGlasses: false,
    hasBow: true,
    hairStyle: "bun",
  },
  {
    agentName: "casting_scout",
    characterName: "Kai Tanaka",
    role: "Casting & Scout",
    description: "Casts members, sets locations, and references.",
    skinColor: "#F0D5B8",
    hairColor: "#2D2D44",
    shirtColor: "#EF4444",
    accentColor: "#EF4444",
    hasGlasses: false,
    hasBow: false,
    hairStyle: "spiky",
  },
  {
    agentName: "cinematographer",
    characterName: "Elise Beaumont",
    role: "Cinematographer",
    description: "Controls lighting, camera gear, and color temperature.",
    skinColor: "#FCEBD5",
    hairColor: "#C8A87C",
    shirtColor: "#10B981",
    accentColor: "#10B981",
    hasGlasses: true,
    hasBow: false,
    hairStyle: "wavy",
  },
  {
    agentName: "director",
    characterName: "Renzo Vidal",
    role: "Director",
    description: "Orchestrates scenes, shot types, and visual flow.",
    skinColor: "#D4A574",
    hairColor: "#1C1C1C",
    shirtColor: "#8B5CF6",
    accentColor: "#8B5CF6",
    hasGlasses: false,
    hasBow: false,
    hairStyle: "short",
  },
  {
    agentName: "sound_designer",
    characterName: "Noa Bergman",
    role: "Sound Designer",
    description: "Writes voiceover scripts and designs the audio atmosphere.",
    skinColor: "#F5D0C5",
    hairColor: "#A0522D",
    shirtColor: "#EC4899",
    accentColor: "#EC4899",
    hasGlasses: false,
    hasBow: true,
    hairStyle: "mohawk",
  },
];

/* ═══════════════════════════════════════════════════════
   Animated SVG Avatar
   ═══════════════════════════════════════════════════════ */

export function AgentAvatar({ agent, size = 80 }: { agent: AgentCharacter; size?: number }) {
  const s = agent.skinColor;
  const h = agent.hairColor;
  const sh = agent.shirtColor;
  const r = size / 2;
  const cx = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-md">
      {/* Background circle */}
      <circle cx={cx} cy={cx} r={r} fill={`${sh}20`} />

      {/* Body / shirt */}
      <ellipse cx={cx} cy={size * 0.92} rx={size * 0.32} ry={size * 0.18} fill={sh} />

      {/* Neck */}
      <rect x={cx - size * 0.06} y={size * 0.58} width={size * 0.12} height={size * 0.14} rx={size * 0.03} fill={s} />

      {/* Head */}
      <ellipse cx={cx} cy={size * 0.38} rx={size * 0.22} ry={size * 0.26} fill={s} />

      {/* Eyes */}
      <g>
        <ellipse cx={cx - size * 0.08} cy={size * 0.36} rx={size * 0.035} ry={size * 0.04} fill="#1A1A2E">
          <animate attributeName="ry" values={`${size * 0.04};${size * 0.005};${size * 0.04}`} dur="3.5s" repeatCount="indefinite" begin="0.5s" keyTimes="0;0.03;0.06" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" calcMode="spline" />
        </ellipse>
        <ellipse cx={cx + size * 0.08} cy={size * 0.36} rx={size * 0.035} ry={size * 0.04} fill="#1A1A2E">
          <animate attributeName="ry" values={`${size * 0.04};${size * 0.005};${size * 0.04}`} dur="3.5s" repeatCount="indefinite" begin="0.5s" keyTimes="0;0.03;0.06" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" calcMode="spline" />
        </ellipse>
        {/* Eye shine */}
        <circle cx={cx - size * 0.07} cy={size * 0.35} r={size * 0.012} fill="white" opacity="0.8" />
        <circle cx={cx + size * 0.09} cy={size * 0.35} r={size * 0.012} fill="white" opacity="0.8" />
      </g>

      {/* Glasses */}
      {agent.hasGlasses && (
        <g stroke={h} strokeWidth={size * 0.015} fill="none" opacity="0.7">
          <circle cx={cx - size * 0.08} cy={size * 0.36} r={size * 0.06} />
          <circle cx={cx + size * 0.08} cy={size * 0.36} r={size * 0.06} />
          <line x1={cx - size * 0.02} y1={size * 0.36} x2={cx + size * 0.02} y2={size * 0.36} />
        </g>
      )}

      {/* Mouth — small smile */}
      <path
        d={`M ${cx - size * 0.05} ${size * 0.44} Q ${cx} ${size * 0.48} ${cx + size * 0.05} ${size * 0.44}`}
        stroke="#C4856C"
        strokeWidth={size * 0.015}
        fill="none"
        strokeLinecap="round"
      />

      {/* Cheek blush */}
      <circle cx={cx - size * 0.14} cy={size * 0.42} r={size * 0.035} fill="#FF9999" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx + size * 0.14} cy={size * 0.42} r={size * 0.035} fill="#FF9999" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Hair */}
      {agent.hairStyle === "short" && (
        <ellipse cx={cx} cy={size * 0.24} rx={size * 0.23} ry={size * 0.16} fill={h} />
      )}
      {agent.hairStyle === "curly" && (
        <g fill={h}>
          <ellipse cx={cx} cy={size * 0.22} rx={size * 0.24} ry={size * 0.15} />
          <circle cx={cx - size * 0.18} cy={size * 0.28} r={size * 0.06} />
          <circle cx={cx + size * 0.18} cy={size * 0.28} r={size * 0.06} />
          <circle cx={cx - size * 0.12} cy={size * 0.16} r={size * 0.06} />
          <circle cx={cx + size * 0.12} cy={size * 0.16} r={size * 0.06} />
        </g>
      )}
      {agent.hairStyle === "long" && (
        <g fill={h}>
          <ellipse cx={cx} cy={size * 0.22} rx={size * 0.24} ry={size * 0.16} />
          <rect x={cx - size * 0.24} y={size * 0.26} width={size * 0.12} height={size * 0.32} rx={size * 0.06} />
          <rect x={cx + size * 0.12} y={size * 0.26} width={size * 0.12} height={size * 0.32} rx={size * 0.06} />
        </g>
      )}
      {agent.hairStyle === "bun" && (
        <g fill={h}>
          <ellipse cx={cx} cy={size * 0.24} rx={size * 0.23} ry={size * 0.14} />
          <circle cx={cx} cy={size * 0.12} r={size * 0.09} />
        </g>
      )}
      {agent.hairStyle === "mohawk" && (
        <g fill={h}>
          <rect x={cx - size * 0.06} y={size * 0.06} width={size * 0.12} height={size * 0.22} rx={size * 0.06} />
          <ellipse cx={cx} cy={size * 0.24} rx={size * 0.2} ry={size * 0.1} />
        </g>
      )}
      {agent.hairStyle === "wavy" && (
        <g fill={h}>
          <ellipse cx={cx} cy={size * 0.22} rx={size * 0.25} ry={size * 0.15} />
          <ellipse cx={cx - size * 0.2} cy={size * 0.34} rx={size * 0.07} ry={size * 0.1} />
          <ellipse cx={cx + size * 0.2} cy={size * 0.34} rx={size * 0.07} ry={size * 0.1} />
        </g>
      )}
      {agent.hairStyle === "spiky" && (
        <g fill={h}>
          <polygon points={`${cx},${size * 0.04} ${cx - size * 0.08},${size * 0.22} ${cx + size * 0.08},${size * 0.22}`} />
          <polygon points={`${cx - size * 0.12},${size * 0.08} ${cx - size * 0.2},${size * 0.26} ${cx - size * 0.04},${size * 0.22}`} />
          <polygon points={`${cx + size * 0.12},${size * 0.08} ${cx + size * 0.2},${size * 0.26} ${cx + size * 0.04},${size * 0.22}`} />
          <ellipse cx={cx} cy={size * 0.24} rx={size * 0.22} ry={size * 0.12} />
        </g>
      )}

      {/* Bow accessory */}
      {agent.hasBow && (
        <g fill={sh} opacity="0.9">
          <polygon points={`${cx + size * 0.12},${size * 0.18} ${cx + size * 0.2},${size * 0.12} ${cx + size * 0.2},${size * 0.24}`} />
          <polygon points={`${cx + size * 0.12},${size * 0.18} ${cx + size * 0.04},${size * 0.12} ${cx + size * 0.04},${size * 0.24}`} />
          <circle cx={cx + size * 0.12} cy={size * 0.18} r={size * 0.02} fill="white" />
        </g>
      )}

      {/* Subtle idle animation — gentle bobbing */}
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0,0;0,-1.5;0,0"
        dur="3s"
        repeatCount="indefinite"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   Agent → Editable Section mapping (from AgentDeck)
   ═══════════════════════════════════════════════════════ */

const AGENT_SECTIONS: Record<string, React.FC> = {
  creative_director: CreativeSection,
  brand_stylist: BrandSection,
  product_stylist: ProductSection,
  casting_scout: CastingSection,
  cinematographer: CinemaSection,
  director: DirectorSection,
  sound_designer: SoundSection,
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-cyan-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    case "done":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
          <CheckCircle2 className="w-3 h-3" />
          Done
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-red-500">
          <AlertCircle className="w-3 h-3" />
          Error
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-300">
          <Circle className="w-3 h-3" />
          Idle
        </span>
      );
  }
}

/* ═══════════════════════════════════════════════════════
   Main Modal
   ═══════════════════════════════════════════════════════ */

export default function ConsultTeamModal({ onClose }: { onClose: () => void }) {
  const agents = useStore((s) => s.agents);
  const reset = useStore((s) => s.reset);
  const isRunning = useStore((s) => s.isRunning);
  const error = useStore((s) => s.error);
  const outputs = useStore((s) => s.agentOutputs);
  const rebuildFromOutputs = useStore((s) => s.rebuildFromOutputs);
  const retryWorkflow = useStore((s) => s.retryWorkflow);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const brief = outputs.creative_brief as Record<string, unknown> | undefined;
  const projectTitle = (brief?.campaign_title as string) || "Untitled Project";
  const doneCount = agents.filter((a) => a.status === "done").length;
  const hasError = agents.some((a) => a.status === "error");
  const pipelineFailed = !isRunning && (!!error || hasError) && doneCount < agents.length;

  const handleUpdateWorkflow = () => {
    rebuildFromOutputs();
    onClose();
  };

  const selectedChar = AGENTS.find((a) => a.agentName === selectedAgent);
  const selectedStoreAgent = agents.find((a) => a.name === selectedAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal card — white theme */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-[75vh] h-[75vh] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_60px_-12px_rgba(0,0,0,0.15)] border border-neutral-200/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Projects
            </button>
            <div className="w-px h-4 bg-neutral-200" />
            <h2 className="text-[15px] font-light text-neutral-800 tracking-wide">{projectTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-[11px] text-cyan-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Pipeline running
              </span>
            )}
            {pipelineFailed && (
              <span className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Pipeline failed
              </span>
            )}
            <span className="text-[11px] text-neutral-300 font-light">{doneCount}/{agents.length} complete</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — always two columns, detail fades in/out */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* Left: Agent list (always visible, fixed width when detail open) */}
          <div className={cn(
            "overflow-y-auto transition-[width] duration-200 ease-out",
            selectedAgent ? "w-[260px] shrink-0 border-r border-neutral-100 p-3" : "flex-1 flex items-center justify-center px-6 py-3"
          )}>
            <div className={cn(
              selectedAgent ? "flex flex-col gap-1.5 w-full" : "grid grid-cols-3 gap-3 w-full max-w-[540px]"
            )}>
              {AGENTS.map((char, idx) => {
                const storeAgent = agents.find((a) => a.name === char.agentName);
                const status = storeAgent?.status || "idle";
                const isSelected = selectedAgent === char.agentName;

                return (
                  <motion.button
                    key={char.agentName}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    onClick={() => setSelectedAgent(isSelected ? null : char.agentName)}
                    className={cn(
                      "relative group text-left rounded-xl overflow-hidden border transition-all duration-150",
                      isSelected
                        ? "border-neutral-300 bg-neutral-50 shadow-sm"
                        : "border-neutral-100 bg-white hover:bg-neutral-50 hover:border-neutral-200 hover:shadow-sm",
                      selectedAgent && !isSelected && "opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-3 p-2.5",
                      !selectedAgent && "flex-col text-center p-2.5"
                    )}>
                      {/* Avatar */}
                      <div className={cn(
                        "shrink-0 rounded-xl overflow-hidden",
                        selectedAgent ? "w-9 h-9" : "w-12 h-12 mx-auto"
                      )} style={{ background: `${char.accentColor}10` }}>
                        <AgentAvatar agent={char} size={selectedAgent ? 36 : 48} />
                      </div>

                      {/* Info */}
                      <div className={cn("min-w-0", !selectedAgent && "w-full")}>
                        <p className={cn(
                          "font-medium text-neutral-700 truncate",
                          selectedAgent ? "text-[13px]" : "text-[12px] mt-1"
                        )}>
                          {char.characterName}
                        </p>
                        <p className={cn(
                          "text-neutral-400 font-light truncate",
                          selectedAgent ? "text-[11px]" : "text-[10px]"
                        )}>
                          {char.role}
                        </p>
                        {selectedAgent && <div className="mt-0.5"><StatusBadge status={status} /></div>}
                      </div>

                      {/* Status dot (grid mode) */}
                      {!selectedAgent && (
                        <div className="absolute top-2 right-2">
                          <StatusBadge status={status} />
                        </div>
                      )}

                      {/* Arrow */}
                      {selectedAgent && (
                        <ChevronRight className={cn(
                          "w-4 h-4 text-neutral-300 shrink-0 transition-transform ml-auto",
                          isSelected && "rotate-90 text-neutral-500"
                        )} />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right: Detail Panel — uses key to re-render cleanly per agent */}
          <AnimatePresence mode="wait">
            {selectedAgent && selectedChar && (
              <motion.div
                key={selectedAgent}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex-1 overflow-hidden"
              >
                <div className="h-full overflow-y-auto">
                  {/* Agent header */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: `${selectedChar.accentColor}10` }}>
                      <AgentAvatar agent={selectedChar} size={48} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-medium text-neutral-800 tracking-wide">{selectedChar.characterName}</h3>
                        {selectedStoreAgent && <StatusBadge status={selectedStoreAgent.status} />}
                      </div>
                      <p className="text-[11px] text-neutral-400 font-light">{selectedChar.role} — {selectedChar.description}</p>
                    </div>
                  </div>

                  {/* Editable agent section (full AgentDeck functionality) */}
                  {(() => {
                    const Section = AGENT_SECTIONS[selectedAgent];
                    return Section ? <Section /> : <p className="text-[13px] text-neutral-300 p-4">No data yet</p>;
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50/80">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: pipelineFailed ? "#ef4444" : "linear-gradient(90deg, #23809e, #3ecfff)" }}
                initial={{ width: 0 }}
                animate={{ width: `${(doneCount / agents.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className={cn("text-[11px] font-light", pipelineFailed ? "text-red-400" : "text-neutral-400")}>
              {doneCount}/{agents.length} agents
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Retry button — shown when pipeline failed */}
            {pipelineFailed && (
              <button
                onClick={() => retryWorkflow()}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 active:scale-[0.97] transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Retry Pipeline
              </button>
            )}

            {/* Update Workflow button */}
            {doneCount > 0 && (
              <button
                onClick={handleUpdateWorkflow}
                disabled={isRebuilding}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-full text-[14px] font-semibold transition-all shadow-lg",
                  isRebuilding
                    ? "bg-neutral-200 text-neutral-400 cursor-wait"
                    : "bg-[#122d31] text-white hover:bg-[#1a3f44] hover:shadow-lg active:scale-[0.97]"
                )}
              >
                {isRebuilding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isRebuilding ? "Rebuilding..." : "Update Workflow"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
