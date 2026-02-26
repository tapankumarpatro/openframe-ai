"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  User,
  Trees,
  Package,
  Camera,
  Mic,
  Music,
  GripVertical,
  Globe,
} from "lucide-react";
import type { AssetType, KeyItem } from "@/types/schema";

const ASSET_ICONS: Record<AssetType, React.ElementType> = {
  character: User,
  environment: Trees,
  product: Package,
  camera: Camera,
  voiceover: Mic,
  music: Music,
  image: Package,
  video: Package,
};

const ASSET_COLORS: Record<AssetType, string> = {
  character: "border-accent-red/40 bg-accent-red/5",
  environment: "border-accent-green/40 bg-accent-green/5",
  product: "border-accent-yellow/40 bg-accent-yellow/5",
  camera: "border-accent-cyan/40 bg-accent-cyan/5",
  voiceover: "border-accent-purple/40 bg-accent-purple/5",
  music: "border-accent-magenta/40 bg-accent-magenta/5",
  image: "border-sky-400/40 bg-sky-400/5",
  video: "border-rose-400/40 bg-rose-400/5",
};

const ASSET_ICON_COLORS: Record<AssetType, string> = {
  character: "text-accent-red",
  environment: "text-accent-green",
  product: "text-accent-yellow",
  camera: "text-accent-cyan",
  voiceover: "text-accent-purple",
  music: "text-accent-magenta",
  image: "text-sky-400",
  video: "text-rose-400",
};

// Per-scene draggable assets
const SCENE_ASSET_TYPES: AssetType[] = ["product", "character", "environment"];
// Global project settings (display-only, not draggable)
const GLOBAL_ASSET_TYPES: AssetType[] = ["camera", "voiceover", "music"];

function DraggableCard({ item }: { item: KeyItem }) {
  const Icon = ASSET_ICONS[item.type] || Package;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/openframe-asset", JSON.stringify({
          id: item.id,
          type: item.type,
          label: item.label,
        }));
        e.dataTransfer.effectAllowed = "link";
      }}
      className={cn(
        "border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all hover:border-border-bright group",
        ASSET_COLORS[item.type]
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", ASSET_ICON_COLORS[item.type])} />
        <span className="text-xs font-medium text-foreground flex-1 truncate">
          {item.label}
        </span>
        <GripVertical className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-[11px] text-muted leading-relaxed line-clamp-3">
        {item.text_prompt}
      </p>
    </div>
  );
}

function GlobalCard({ item }: { item: KeyItem }) {
  const Icon = ASSET_ICONS[item.type] || Package;
  return (
    <div className={cn("border rounded-lg p-2.5", ASSET_COLORS[item.type])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-3 h-3", ASSET_ICON_COLORS[item.type])} />
        <span className="text-[10px] font-medium text-foreground flex-1 truncate">
          {item.label}
        </span>
      </div>
      <p className="text-[10px] text-muted leading-relaxed line-clamp-2">
        {item.text_prompt}
      </p>
    </div>
  );
}

export default function KeyItemsRail() {
  const keyItems = useStore((s) => s.keyItems);
  const isRunning = useStore((s) => s.isRunning);

  const sceneAssets = keyItems.filter((i) => SCENE_ASSET_TYPES.includes(i.type));
  const globalAssets = keyItems.filter((i) => GLOBAL_ASSET_TYPES.includes(i.type));

  return (
    <div className="w-80 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
          Key Items
        </h2>
        <p className="text-[10px] text-muted mt-0.5">
          {keyItems.length === 0
            ? isRunning
              ? "Assets will appear as agents complete…"
              : "Run a workflow to generate assets"
            : `${sceneAssets.length} scene asset${sceneAssets.length !== 1 ? "s" : ""} · ${globalAssets.length} global`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Scene Assets — draggable to canvas */}
        {sceneAssets.length > 0 && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <GripVertical className="w-3 h-3 text-muted" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Scene Assets
              </span>
              <span className="text-[9px] text-accent-cyan ml-auto">drag to scenes →</span>
            </div>
            <div className="space-y-2">
              {sceneAssets.map((item) => (
                <DraggableCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Global Settings — display only */}
        {globalAssets.length > 0 && (
          <div className="px-3 py-2 border-t border-border">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <Globe className="w-3 h-3 text-muted" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Global Settings
              </span>
            </div>
            <div className="space-y-1.5">
              {globalAssets.map((item) => (
                <GlobalCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
