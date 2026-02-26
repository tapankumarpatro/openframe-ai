"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { AssetType, KeyItem } from "@/types/schema";
import {
  User, Trees, Package, Camera, Mic, Music,
  Play, Loader2, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: AssetType[] = ["product", "character", "environment", "camera", "voiceover", "music", "image", "video"];

const CATEGORY_LABELS: Record<AssetType, string> = {
  product: "Product",
  character: "Casting",
  environment: "Environments",
  camera: "Camera & Light",
  voiceover: "Voiceover",
  music: "Music",
  image: "Images",
  video: "Videos",
};

const ICONS: Record<AssetType, React.ElementType> = {
  character: User,
  environment: Trees,
  product: Package,
  camera: Camera,
  voiceover: Mic,
  music: Music,
  image: Package,
  video: Package,
};

const DOT_COLORS: Record<AssetType, string> = {
  character: "#f87171",
  environment: "#4ade80",
  product: "#facc15",
  camera: "#22d3ee",
  voiceover: "#a855f7",
  music: "#e879f9",
  image: "#38bdf8",
  video: "#fb7185",
};

const BORDER_COLORS: Record<AssetType, string> = {
  character: "border-accent-red/40",
  environment: "border-accent-green/40",
  product: "border-accent-yellow/40",
  camera: "border-accent-cyan/40",
  voiceover: "border-accent-purple/40",
  music: "border-accent-magenta/40",
  image: "border-sky-400/40",
  video: "border-rose-400/40",
};

const BG_COLORS: Record<AssetType, string> = {
  character: "bg-accent-red/5",
  environment: "bg-accent-green/5",
  product: "bg-accent-yellow/5",
  camera: "bg-accent-cyan/5",
  voiceover: "bg-accent-purple/5",
  music: "bg-accent-magenta/5",
  image: "bg-sky-400/5",
  video: "bg-rose-400/5",
};

function AssetCard({ item }: { item: KeyItem }) {
  const [expanded, setExpanded] = useState(false);
  const generateAsset = useStore((s) => s.generateAsset);
  const Icon = ICONS[item.type] || Package;
  const isGenerating = item.image_url === "generating";
  const hasImage = item.image_url && item.image_url !== "generating";

  return (
    <div className={cn("border rounded-lg overflow-hidden transition-all", BORDER_COLORS[item.type], BG_COLORS[item.type])}>
      {/* Compact row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: DOT_COLORS[item.type] }} />
        <span className="text-[11px] font-medium text-foreground flex-1 text-left truncate">
          {item.label}
        </span>
        {item.driver_type && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-border text-muted font-medium flex-shrink-0">
            {item.driver_type}
          </span>
        )}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-background/50"
          style={{ backgroundColor: DOT_COLORS[item.type] }}
        />
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted flex-shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/50">
          {/* Image or generate */}
          {hasImage ? (
            <img src={item.image_url} alt={item.label} className="w-full h-32 object-cover" />
          ) : (
            <div className="flex items-center justify-center h-20 bg-background/30">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 text-accent-yellow animate-spin" />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateAsset(item.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium bg-border/50 text-muted hover:bg-border hover:text-foreground transition-all"
                >
                  <Play className="w-3 h-3" />
                  Generate
                </button>
              )}
            </div>
          )}
          {/* Prompt text */}
          <div className="px-2.5 py-2 max-h-36 overflow-y-auto">
            <p className="text-[10px] text-muted leading-relaxed">{item.text_prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KeyAssetDeck() {
  const keyItems = useStore((s) => s.keyItems);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Group items by type
  const grouped = CATEGORY_ORDER.reduce<{ type: AssetType; items: KeyItem[] }[]>((acc, type) => {
    const items = keyItems.filter((i) => i.type === type);
    if (items.length > 0) acc.push({ type, items });
    return acc;
  }, []);

  const toggleCategory = (type: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  };

  if (keyItems.length === 0) {
    return (
      <div className="w-60 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Key Assets</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[10px] text-muted">Waiting for agents…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Key Assets</h2>
        <p className="text-[9px] text-muted mt-0.5">{keyItems.length} items</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
        {grouped.map(({ type, items }) => (
          <div key={type}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(type)}
              className="flex items-center gap-2 w-full px-1 py-1 mb-1 text-left"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DOT_COLORS[type] }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted flex-1">
                {CATEGORY_LABELS[type]}
              </span>
              <span className="text-[9px] text-muted">{items.length}</span>
              {collapsedCategories.has(type) ? (
                <ChevronRight className="w-3 h-3 text-muted" />
              ) : (
                <ChevronDown className="w-3 h-3 text-muted" />
              )}
            </button>

            {/* Category items */}
            {!collapsedCategories.has(type) && (
              <div className="space-y-1.5">
                {items.map((item) => (
                  <AssetCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
