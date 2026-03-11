"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  SelectionMode,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useStore } from "@/lib/store";
import { useHiredCastStore } from "@/lib/hiredCastStore";
import type { FrameStatus, VideoStatus, Scene, HiredCast } from "@/types/schema";
import SceneNode from "./nodes/SceneNode";
import AssetNode from "./nodes/AssetNode";
import NoteNode from "./nodes/NoteNode";
import SummaryNode from "./nodes/SummaryNode";
import TalkingCardNode from "./nodes/TalkingCardNode";
import BatchCreatorNode from "./nodes/BatchCreatorNode";
import BatchImageOutputNode from "./nodes/BatchImageOutputNode";
import HiredCastSelector from "../hired-cast/HiredCastSelector";
import SmartWire from "./edges/SmartWire";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, ZoomIn, ZoomOut, Scissors, Navigation, StickyNote, RatioIcon, Download, FileJson, FileText, Image, Film, Package, LayoutGrid, Plus, User, UserCheck, Trees, ShoppingBag, Mic, Music, Clapperboard, CheckCircle2, Loader2, Layers } from "lucide-react";
import { downloadAll, downloadText, downloadImages, downloadAssets, downloadWorkflow } from "@/lib/downloads";

const ASPECT_RATIOS: { label: string; value: string }[] = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
  { label: "4:5", value: "4:5" },
  { label: "4:3", value: "4:3" },
  { label: "Auto", value: "auto" },
];

/* ---------- localStorage helpers ---------- */
const STORAGE_PREFIX = "openframe-canvas-";
function saveCanvasState(workflowId: string | null, nodes: Node[], edges: Edge[]) {
  if (!workflowId) return;
  try {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) positions[n.id] = n.position;
    localStorage.setItem(`${STORAGE_PREFIX}pos-${workflowId}`, JSON.stringify(positions));
    localStorage.setItem(`${STORAGE_PREFIX}edges-${workflowId}`, JSON.stringify(edges));
    // Save note nodes
    const notes = nodes.filter((n) => n.type === "noteNode").map((n) => ({ id: n.id, position: n.position, data: n.data }));
    localStorage.setItem(`${STORAGE_PREFIX}notes-${workflowId}`, JSON.stringify(notes));
  } catch { /* quota */ }
}
function saveStoreData(workflowId: string | null, keyItems: unknown[], scenes: unknown[], projectAspectRatio: string, agentOutputs?: Record<string, unknown>, batchCreators?: unknown[]) {
  if (!workflowId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}keyItems-${workflowId}`, JSON.stringify(keyItems));
    localStorage.setItem(`${STORAGE_PREFIX}scenes-${workflowId}`, JSON.stringify(scenes));
    localStorage.setItem(`${STORAGE_PREFIX}ar-${workflowId}`, projectAspectRatio);
    if (agentOutputs) {
      localStorage.setItem(`${STORAGE_PREFIX}outputs-${workflowId}`, JSON.stringify(agentOutputs));
    }
    if (batchCreators) {
      localStorage.setItem(`${STORAGE_PREFIX}batch-${workflowId}`, JSON.stringify(batchCreators));
    }
  } catch (err) { console.warn("[OpenFrame] localStorage save failed (quota?):", err); }
}
// Strip dead blob: URLs from any string field in an object tree
function stripBlobUrls(obj: unknown): unknown {
  if (typeof obj === "string") return obj.startsWith("blob:") ? "" : obj;
  if (Array.isArray(obj)) return obj.map(stripBlobUrls);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = stripBlobUrls(v);
    return out;
  }
  return obj;
}

function loadStoreData(workflowId: string | null): { keyItems?: unknown[]; scenes?: unknown[]; projectAspectRatio?: string; agentOutputs?: Record<string, Record<string, unknown>>; batchCreators?: unknown[] } {
  if (!workflowId) return {};
  try {
    const ki = localStorage.getItem(`${STORAGE_PREFIX}keyItems-${workflowId}`);
    const sc = localStorage.getItem(`${STORAGE_PREFIX}scenes-${workflowId}`);
    const ar = localStorage.getItem(`${STORAGE_PREFIX}ar-${workflowId}`);
    const ao = localStorage.getItem(`${STORAGE_PREFIX}outputs-${workflowId}`);
    const bc = localStorage.getItem(`${STORAGE_PREFIX}batch-${workflowId}`);
    return {
      keyItems: ki ? stripBlobUrls(JSON.parse(ki)) as unknown[] : undefined,
      scenes: sc ? stripBlobUrls(JSON.parse(sc)) as unknown[] : undefined,
      projectAspectRatio: ar || undefined,
      agentOutputs: ao ? stripBlobUrls(JSON.parse(ao)) as Record<string, Record<string, unknown>> : undefined,
      batchCreators: bc ? stripBlobUrls(JSON.parse(bc)) as unknown[] : undefined,
    };
  } catch { return {}; }
}
function loadPositions(workflowId: string | null): Record<string, { x: number; y: number }> {
  if (!workflowId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}pos-${workflowId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function loadEdges(workflowId: string | null): Edge[] {
  if (!workflowId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}edges-${workflowId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function clearSavedEdges(workflowId: string | null) {
  if (!workflowId) return;
  try { localStorage.removeItem(`${STORAGE_PREFIX}edges-${workflowId}`); } catch { /* */ }
}
function loadNotes(workflowId: string | null): Node[] {
  if (!workflowId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}notes-${workflowId}`);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{ id: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
    return arr.map((n) => ({ id: n.id, type: "noteNode", position: n.position, data: n.data, draggable: true }));
  } catch { return []; }
}

const nodeTypes = {
  sceneNode: SceneNode,
  assetNode: AssetNode,
  noteNode: NoteNode,
  summaryNode: SummaryNode,
  talkingCardNode: TalkingCardNode,
  batchCreatorNode: BatchCreatorNode,
  batchImageOutputNode: BatchImageOutputNode,
};

const edgeTypes = {
  smartWire: SmartWire,
};

/* ---------- Canvas zoom toolbar ---------- */
function CanvasToolbar({ onAddNote, onOrganize, onHireCast }: { onAddNote: () => void; onOrganize: () => void; onHireCast: () => void }) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(100);
  const projectAspectRatio = useStore((s) => s.projectAspectRatio);
  const setProjectAspectRatio = useStore((s) => s.setProjectAspectRatio);
  const addKeyItem = useStore((s) => s.addKeyItem);
  const addScene = useStore((s) => s.addScene);
  const addBatchCreator = useStore((s) => s.addBatchCreator);
  const hiredCastCount = useHiredCastStore((s) => s.hiredCast.length);
  const workflowId = useStore((s) => s.workflowId);
  const userInput = useStore((s) => s.userInput);
  const keyItems = useStore((s) => s.keyItems);
  const scenes = useStore((s) => s.scenes);
  const agentOutputs = useStore((s) => s.agentOutputs);
  const productImage = useStore((s) => s.productImage);
  const [arOpen, setArOpen] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const dlCtx = { workflowId, userInput, keyItems, scenes, agentOutputs, productImage };

  const handleDownload = async (mode: string) => {
    setDlBusy(true);
    setDlOpen(false);
    try {
      switch (mode) {
        case "all":      await downloadAll(dlCtx); break;
        case "text":     downloadText(dlCtx); break;
        case "images":   await downloadImages(dlCtx); break;
        case "assets":   await downloadAssets(dlCtx); break;
        case "workflow":  downloadWorkflow(dlCtx); break;
      }
    } catch (err) {
      console.error("[Download] Failed:", err);
    } finally {
      setDlBusy(false);
    }
  };

  const handleZoomIn = () => {
    zoomIn();
    setTimeout(() => setZoom(Math.round(getZoom() * 100)), 50);
  };
  const handleZoomOut = () => {
    zoomOut();
    setTimeout(() => setZoom(Math.round(getZoom() * 100)), 50);
  };
  const handleFitView = () => {
    fitView({ padding: 0.12, duration: 300 });
    setTimeout(() => setZoom(Math.round(getZoom() * 100)), 350);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      try { setZoom(Math.round(getZoom() * 100)); } catch { /* unmounted */ }
    }, 500);
    return () => clearInterval(interval);
  }, [getZoom]);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 glass-panel rounded-2xl px-3 py-2">
      <button onClick={handleZoomOut} className="p-2 rounded-xl hover:bg-card-hover transition-colors text-muted hover:text-foreground" title="Zoom Out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <span className="text-[11px] text-muted font-mono w-12 text-center tabular-nums">{zoom}%</span>
      <button onClick={handleZoomIn} className="p-2 rounded-xl hover:bg-card-hover transition-colors text-muted hover:text-foreground" title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </button>
      <div className="w-px h-5 bg-border mx-1.5" />
      <button onClick={handleFitView} className="p-2 rounded-xl hover:bg-card-hover transition-colors text-muted hover:text-foreground" title="Fit View">
        <Maximize2 className="w-4 h-4" />
      </button>
      <button onClick={onOrganize} className="p-2 rounded-xl hover:bg-accent-primary/10 transition-colors text-muted hover:text-accent-primary" title="Organize Layout">
        <LayoutGrid className="w-4 h-4" />
      </button>
      <div className="w-px h-5 bg-border mx-1.5" />
      <button onClick={onAddNote} className="p-2 rounded-xl hover:bg-accent-yellow/10 transition-colors text-accent-yellow" title="Add Note">
        <StickyNote className="w-4 h-4" />
      </button>
      {/* Add Card dropdown */}
      <div className="relative">
        <button
          onClick={() => { setAddOpen(!addOpen); setArOpen(false); setDlOpen(false); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
            addOpen ? "bg-accent-primary/10 text-accent-primary" : "text-muted hover:text-foreground hover:bg-card-hover"
          }`}
          title="Add Card"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[11px] font-medium">Add</span>
        </button>
        {addOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-lg py-2 min-w-[220px] z-50">
            <div className="px-3 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider">Image Cards</div>
            {([
              { type: "character"   as const, icon: User,        label: "Cast Member",  desc: "Character / person" },
              { type: "product"     as const, icon: ShoppingBag, label: "Product",       desc: "Product key asset" },
              { type: "environment" as const, icon: Trees,       label: "Setting",       desc: "Environment / location" },
            ]).map(({ type, icon: Ic, label, desc }) => (
              <button
                key={type}
                onClick={() => { addKeyItem(type); setAddOpen(false); }}
                className="w-full px-3.5 py-2 text-left hover:bg-card-hover transition-colors flex items-center gap-3"
              >
                <Ic className="w-4 h-4 text-accent-primary shrink-0" />
                <div>
                  <div className="text-[12px] font-medium text-foreground">{label}</div>
                  <div className="text-[10px] text-muted">{desc}</div>
                </div>
              </button>
            ))}
            <div className="border-t border-border my-1.5" />
            <div className="px-3 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider">Audio Cards</div>
            {([
              { type: "voiceover" as const, icon: Mic,   label: "Voiceover",  desc: "Voice narration" },
              { type: "music"     as const, icon: Music, label: "Music",       desc: "Background music" },
            ]).map(({ type, icon: Ic, label, desc }) => (
              <button
                key={type}
                onClick={() => { addKeyItem(type); setAddOpen(false); }}
                className="w-full px-3.5 py-2 text-left hover:bg-card-hover transition-colors flex items-center gap-3"
              >
                <Ic className="w-4 h-4 text-violet-400 shrink-0" />
                <div>
                  <div className="text-[12px] font-medium text-foreground">{label}</div>
                  <div className="text-[10px] text-muted">{desc}</div>
                </div>
              </button>
            ))}
            <div className="border-t border-border my-1.5" />
            <div className="px-3 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider">Media Cards</div>
            {([
              { type: "image" as const, icon: Image, label: "Image",  desc: "Standalone image card" },
              { type: "video" as const, icon: Film,  label: "Video",  desc: "Standalone video card" },
            ]).map(({ type, icon: Ic, label, desc }) => (
              <button
                key={type}
                onClick={() => { addKeyItem(type); setAddOpen(false); }}
                className="w-full px-3.5 py-2 text-left hover:bg-card-hover transition-colors flex items-center gap-3"
              >
                <Ic className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-[12px] font-medium text-foreground">{label}</div>
                  <div className="text-[10px] text-muted">{desc}</div>
                </div>
              </button>
            ))}
            <div className="border-t border-border my-1.5" />
            <div className="px-3 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider">Scene</div>
            <button
              onClick={() => { addScene(); setAddOpen(false); }}
              className="w-full px-3.5 py-2 text-left hover:bg-card-hover transition-colors flex items-center gap-3"
            >
              <Clapperboard className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <div className="text-[12px] font-medium text-foreground">Scene</div>
                <div className="text-[10px] text-muted">Image frames + video generation</div>
              </div>
            </button>
            <div className="border-t border-border my-1.5" />
            <div className="px-3 py-1 text-[9px] font-semibold text-muted uppercase tracking-wider">Special</div>
            <button
              onClick={() => { addBatchCreator(); setAddOpen(false); }}
              className="w-full px-3.5 py-2 text-left hover:bg-card-hover transition-colors flex items-center gap-3"
            >
              <Layers className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-[12px] font-medium text-foreground">Batch Creator</div>
                <div className="text-[10px] text-muted">Generate N image variations + videos</div>
              </div>
            </button>
            <button
              onClick={() => { onHireCast(); setAddOpen(false); }}
              className="w-full px-3.5 py-2 text-left hover:bg-card-hover transition-colors flex items-center gap-3"
            >
              <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <div className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
                  Hire Cast
                  {hiredCastCount > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold">{hiredCastCount}</span>
                  )}
                </div>
                <div className="text-[10px] text-muted">Select from saved cast members</div>
              </div>
            </button>
          </div>
        )}
      </div>
      <div className="w-px h-5 bg-border mx-1.5" />
      {/* Project-level aspect ratio */}
      <div className="relative">
        <button
          onClick={() => { setArOpen(!arOpen); setAddOpen(false); setDlOpen(false); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
            arOpen ? "bg-accent-primary/10 text-accent-primary" : "text-muted hover:text-foreground hover:bg-card-hover"
          }`}
          title="Scene Aspect Ratio"
        >
          <RatioIcon className="w-4 h-4" />
          <span className="text-[11px] font-mono">{projectAspectRatio === "auto" ? "Auto" : projectAspectRatio}</span>
        </button>
        {arOpen && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-lg py-1.5 min-w-[110px] z-50">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                onClick={() => { setProjectAspectRatio(ar.value); setArOpen(false); }}
                className={`w-full px-3.5 py-2 text-left text-[12px] font-medium transition-colors ${
                  projectAspectRatio === ar.value
                    ? "text-accent-primary bg-accent-primary/8"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                {ar.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="w-px h-5 bg-border mx-1.5" />
      {/* Download menu */}
      <div className="relative">
        <button
          onClick={() => { setDlOpen(!dlOpen); setArOpen(false); setAddOpen(false); }}
          disabled={dlBusy}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all ${
            dlOpen ? "bg-accent-green/10 text-accent-green" : dlBusy ? "text-accent-primary animate-pulse" : "text-muted hover:text-foreground hover:bg-card-hover"
          }`}
          title="Download / Export"
        >
          <Download className="w-4 h-4" />
          {dlBusy && <span className="text-[10px]">…</span>}
        </button>
        {dlOpen && (
          <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl shadow-lg py-1.5 min-w-[200px] z-50">
            {([
              { mode: "all",      icon: Package,  label: "Download All",       desc: "ZIP: everything" },
              { mode: "text",     icon: FileText, label: "Download Text",      desc: "Markdown prompts" },
              { mode: "images",   icon: Image,    label: "Download Images",    desc: "ZIP: scene + asset images" },
              { mode: "assets",   icon: Film,     label: "Download Assets",    desc: "ZIP: videos + audio" },
              { mode: "workflow", icon: FileJson, label: "Download Workflow",  desc: "JSON only" },
            ] as const).map(({ mode, icon: Ic, label, desc }) => (
              <button
                key={mode}
                onClick={() => handleDownload(mode)}
                className="w-full px-3.5 py-2.5 text-left hover:bg-card-hover transition-colors flex items-center gap-3 rounded-lg mx-1"
              >
                <Ic className="w-4 h-4 text-muted shrink-0" />
                <div>
                  <div className="text-[12px] font-medium text-foreground">{label}</div>
                  <div className="text-[10px] text-muted">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Handle context menu (locate / cut) ---------- */
type ConnectionEntry = { edgeId: string; targetNodeId: string; targetLabel: string; frame?: string };
type HandleMenuState = {
  x: number;
  y: number;
  connections: ConnectionEntry[];
} | null;

function HandleContextMenu({
  menu,
  onClose,
  onLocate,
  onCut,
  onCutAll,
}: {
  menu: HandleMenuState;
  onClose: () => void;
  onLocate: (nodeId: string) => void;
  onCut: (edgeId: string) => void;
  onCutAll: (edgeIds: string[]) => void;
}) {
  if (!menu) return null;

  // Group connections by target node
  const grouped = new Map<string, { label: string; nodeId: string; edges: { edgeId: string; frame?: string }[] }>();
  for (const c of menu.connections) {
    const existing = grouped.get(c.targetNodeId);
    if (existing) {
      existing.edges.push({ edgeId: c.edgeId, frame: c.frame });
    } else {
      grouped.set(c.targetNodeId, {
        label: c.targetLabel,
        nodeId: c.targetNodeId,
        edges: [{ edgeId: c.edgeId, frame: c.frame }],
      });
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute z-40 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[180px] max-h-[400px] overflow-y-auto"
        style={{ left: menu.x, top: menu.y }}
      >
        {menu.connections.length === 0 && (
          <div className="px-3 py-1.5 text-[10px] text-muted">No connections</div>
        )}
        {Array.from(grouped.values()).map((g) => (
          <div key={g.nodeId} className="border-b border-border last:border-0">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] text-foreground font-semibold truncate">{g.label}</span>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={() => { onLocate(g.nodeId); onClose(); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-accent-primary hover:bg-accent-primary/10 transition-colors"
                  title="Locate"
                >
                  <Navigation className="w-2.5 h-2.5" /> Locate
                </button>
                <button
                  onClick={() => { onCutAll(g.edges.map((e) => e.edgeId)); onClose(); }}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-accent-red hover:bg-accent-red/10 transition-colors"
                  title="Cut all connections to this node"
                >
                  <Scissors className="w-2.5 h-2.5" /> Cut
                </button>
              </div>
            </div>
            {/* Show individual frame edges if multiple */}
            {g.edges.length > 1 && g.edges.some((e) => e.frame) && (
              <div className="px-3 pb-1 flex flex-wrap gap-1">
                {g.edges.map((e) => (
                  <button
                    key={e.edgeId}
                    onClick={() => { onCut(e.edgeId); onClose(); }}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-border/50 text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    title={`Cut ${e.frame || ''} wire`}
                  >
                    ✕ {e.frame || 'wire'}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Canvas Status Bar (running progress + error/retry) ---------- */
function CanvasStatusBar() {
  const agents = useStore((s) => s.agents);
  const isRunning = useStore((s) => s.isRunning);
  const error = useStore((s) => s.error);
  const retryWorkflow = useStore((s) => s.retryWorkflow);
  const runningAgent = agents.find((a) => a.status === "running");
  const doneCount = agents.filter((a) => a.status === "done").length;
  const hasError = agents.some((a) => a.status === "error");

  const showRunning = isRunning;
  const showError = !isRunning && (!!error || hasError) && doneCount < agents.length;

  if (!showRunning && !showError) return null;

  return (
    <AnimatePresence>
      {/* Running status pill */}
      {showRunning && (
        <motion.div
          key="running"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-full border border-border shadow-lg">
            <div className="flex items-center gap-1">
              {agents.map((agent) => (
                <div key={agent.id} className="relative" title={agent.label}>
                  <div
                    className="w-2 h-2 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor:
                        agent.status === "done" ? "#4ade80"
                        : agent.status === "running" ? agent.color
                        : agent.status === "error" ? "#ef4444"
                        : "#d4d4d8",
                    }}
                  />
                  {agent.status === "running" && (
                    <motion.div
                      className="absolute inset-[-2px] rounded-full border-2"
                      style={{ borderColor: agent.color }}
                      animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            <AnimatePresence mode="wait">
              {runningAgent && (
                <motion.div
                  key={runningAgent.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-1.5"
                >
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: runningAgent.color }} />
                  <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">
                    {runningAgent.label}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="text-[10px] text-muted whitespace-nowrap">{doneCount}/{agents.length}</span>
          </div>
        </motion.div>
      )}

      {/* Error + Retry pill */}
      {showError && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="flex items-center gap-3 px-5 py-3 bg-white/95 backdrop-blur-md rounded-2xl border border-red-200 shadow-xl">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <span className="text-sm">⚠</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground">Pipeline failed</p>
              <p className="text-[10px] text-muted truncate max-w-[280px]">
                {error || `${doneCount}/${agents.length} agents completed`}
              </p>
            </div>
            <button
              onClick={() => retryWorkflow()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#122d31] text-white text-[11px] font-semibold hover:bg-[#1a3f44] active:scale-[0.97] transition-all shrink-0 shadow-sm"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Retry
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Layout constants ---------- */
const GLOBAL_TYPES = new Set(["voiceover", "music", "camera"]);

const CAST_X = 0;
const CAST_Y_GAP = 220;
const GLOBAL_X = -350;
const GLOBAL_Y_START = 0;
const GLOBAL_Y_GAP = 240;
const SCENE_X = 400;
const SCENE_COLS = 2;
const SCENE_X_GAP = 620;
const SCENE_Y_GAP = 660;

/* ---------- Main canvas ---------- */
function CanvasInner() {
  const scenes = useStore((s) => s.scenes);
  const keyItems = useStore((s) => s.keyItems);
  const batchCreators = useStore((s) => s.batchCreators);
  const workflowId = useStore((s) => s.workflowId);
  const addPermanentCast = useStore((s) => s.addPermanentCast);
  const { fitView, setCenter, getZoom, getViewport } = useReactFlow();
  const prevCount = useRef(0);
  const [handleMenu, setHandleMenu] = useState<HandleMenuState>(null);
  const noteCounter = useRef(0);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [castSelectorOpen, setCastSelectorOpen] = useState(false);
  const projectAspectRatio = useStore((s) => s.projectAspectRatio);
  const rebuildCount = useStore((s) => s.rebuildCount);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const autoWired = useRef(false);
  const restoredEdges = useRef(false);
  const restoredStore = useRef(false);

  // Reset auto-wiring + edges when switching projects
  const prevWorkflowId = useRef(workflowId);
  useEffect(() => {
    if (workflowId !== prevWorkflowId.current) {
      prevWorkflowId.current = workflowId;
      autoWired.current = false;
      restoredEdges.current = false;
      restoredStore.current = false;
      prevCount.current = 0;
    }
  }, [workflowId]);

  // Reset auto-wiring + edges when "Update Workflow" rebuilds keyItems/scenes
  const prevRebuild = useRef(rebuildCount);
  useEffect(() => {
    if (rebuildCount > prevRebuild.current) {
      prevRebuild.current = rebuildCount;
      autoWired.current = false;
      restoredEdges.current = true; // Mark as restored so layout effect doesn't re-restore old edges
      clearSavedEdges(workflowId); // Remove stale edges from localStorage
      setEdges([]);
      prevCount.current = 0;
    }
  }, [rebuildCount, setEdges, workflowId]);

  // Refs for save data — avoids re-triggering effects on every store change
  const keyItemsRef = useRef(keyItems);
  const scenesRef = useRef(scenes);
  const arRef = useRef(projectAspectRatio);
  const agentOutputsRef = useRef(useStore.getState().agentOutputs);
  const batchCreatorsRef = useRef(batchCreators);
  const storeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { keyItemsRef.current = keyItems; }, [keyItems]);
  useEffect(() => { scenesRef.current = scenes; }, [scenes]);
  useEffect(() => { arRef.current = projectAspectRatio; }, [projectAspectRatio]);
  useEffect(() => { batchCreatorsRef.current = batchCreators; }, [batchCreators]);
  useEffect(() => { agentOutputsRef.current = useStore.getState().agentOutputs; });

  // Instant-save helper — used by debounce + beforeunload
  const saveAll = useCallback(() => {
    saveCanvasState(workflowId, nodes, edges);
    saveStoreData(workflowId, keyItemsRef.current, scenesRef.current, arRef.current, agentOutputsRef.current, batchCreatorsRef.current);
  }, [workflowId, nodes, edges]);
  const saveAllRef = useRef(saveAll);
  useEffect(() => { saveAllRef.current = saveAll; }, [saveAll]);

  // Save before tab close / refresh — guarantees no data loss
  useEffect(() => {
    const handler = () => { saveAllRef.current(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Subscribe to agentOutputs changes for auto-save (doesn't cause re-render)
  useEffect(() => {
    let prev = useStore.getState().agentOutputs;
    const unsub = useStore.subscribe((state) => {
      if (state.agentOutputs !== prev) {
        prev = state.agentOutputs;
        agentOutputsRef.current = state.agentOutputs;
        if (storeSaveTimer.current) clearTimeout(storeSaveTimer.current);
        storeSaveTimer.current = setTimeout(() => {
          saveStoreData(workflowId, keyItemsRef.current, scenesRef.current, arRef.current, state.agentOutputs, batchCreatorsRef.current);
        }, 500);
      }
    });
    return unsub;
  }, [workflowId]);

  // Restore saved store data once per workflow (uses interval polling to wait for API data)
  useEffect(() => {
    if (!workflowId) return;
    restoredStore.current = false;
    const check = setInterval(() => {
      if (restoredStore.current) { clearInterval(check); return; }
      const ki = useStore.getState().keyItems;
      const sc = useStore.getState().scenes;
      if (ki.length === 0 && sc.length === 0) return;
      restoredStore.current = true;
      clearInterval(check);

      const saved = loadStoreData(workflowId);

      // Determine whether to restore agentOutputs from localStorage.
      // Only overwrite if the store has NO agentOutputs yet (edge case).
      // When loadProject or SSE has already populated agentOutputs, those are
      // authoritative — overwriting with (potentially stale) localStorage data
      // causes key assets to disappear.
      const currentOutputs = useStore.getState().agentOutputs;
      const storeHasOutputs = Object.keys(currentOutputs).length >= 3;

      if (saved.agentOutputs && Object.keys(saved.agentOutputs).length > 0 && !storeHasOutputs) {
        useStore.setState({ agentOutputs: saved.agentOutputs });
        useStore.getState().rebuildFromOutputs();
        prevRebuild.current = useStore.getState().rebuildCount;
      }

      // Merge saved images/history into current keyItems (never overwrite structure)
      const currentKi = useStore.getState().keyItems;
      const currentSc = useStore.getState().scenes;

      if (saved.keyItems && Array.isArray(saved.keyItems)) {
        const savedMap = new Map<string, Record<string, unknown>>();
        for (const item of saved.keyItems as Record<string, unknown>[]) {
          if (item.id) savedMap.set(item.id as string, item);
        }
        useStore.setState({
          keyItems: currentKi.map((k) => {
            const s = savedMap.get(k.id);
            if (!s) return k;
            return {
              ...k,
              image_url: (s.image_url as string) || k.image_url,
              image_history: (s.image_history as string[]) || k.image_history,
              audio_urls: (s.audio_urls as string[]) || k.audio_urls,
              audio_history: (s.audio_history as string[]) || k.audio_history,
              audio_status: s.audio_urls ? "done" as FrameStatus : k.audio_status,
              voice_name: (s.voice_name as string) || k.voice_name,
              voice_stability: (s.voice_stability as number) ?? k.voice_stability,
              voice_similarity: (s.voice_similarity as number) ?? k.voice_similarity,
              voice_style: (s.voice_style as number) ?? k.voice_style,
              voice_speed: (s.voice_speed as number) ?? k.voice_speed,
              voice_language: (s.voice_language as string) || k.voice_language,
              music_custom_mode: (s.music_custom_mode as boolean) ?? k.music_custom_mode,
              music_instrumental: (s.music_instrumental as boolean) ?? k.music_instrumental,
              music_model: (s.music_model as string) || k.music_model,
              music_style: (s.music_style as string) || k.music_style,
              music_title: (s.music_title as string) || k.music_title,
              music_vocal_gender: (s.music_vocal_gender as string) || k.music_vocal_gender,
              music_style_weight: (s.music_style_weight as number) ?? k.music_style_weight,
              music_weirdness: (s.music_weirdness as number) ?? k.music_weirdness,
              music_audio_weight: (s.music_audio_weight as number) ?? k.music_audio_weight,
            };
          }),
        });
      }
      if (saved.scenes && Array.isArray(saved.scenes)) {
        const savedArr = saved.scenes as Record<string, unknown>[];
        // Merge by INDEX first (most reliable), fallback to ID match
        useStore.setState({
          scenes: currentSc.map((scene, idx) => {
            // Try index match first, then ID match
            let s: Record<string, unknown> | undefined = idx < savedArr.length ? savedArr[idx] : undefined;
            if (!s || s.id !== scene.id) {
              s = savedArr.find((x) => x.id === scene.id) as Record<string, unknown> | undefined;
            }
            if (!s) return scene;
            return {
              ...scene,
              start_image_prompt: (s.start_image_prompt as string) || scene.start_image_prompt,
              end_image_prompt: (s.end_image_prompt as string) || scene.end_image_prompt,
              start_frame_image: (s.start_frame_image as string) || scene.start_frame_image,
              start_frame_history: (s.start_frame_history as string[]) || scene.start_frame_history,
              start_frame_status: s.start_frame_image ? "done" as FrameStatus : scene.start_frame_status,
              end_frame_image: (s.end_frame_image as string) || scene.end_frame_image,
              end_frame_history: (s.end_frame_history as string[]) || scene.end_frame_history,
              end_frame_status: s.end_frame_image ? "done" as FrameStatus : scene.end_frame_status,
              start_video_prompt: (s.start_video_prompt as string) || scene.start_video_prompt,
              end_video_prompt: (s.end_video_prompt as string) || scene.end_video_prompt,
              combined_video_prompt: (s.combined_video_prompt as string) || scene.combined_video_prompt,
              video_mode: (s.video_mode as Scene["video_mode"]) || scene.video_mode,
              video_url: (s.video_url as string) || scene.video_url,
              video_status: s.video_url ? "done" as VideoStatus : scene.video_status,
              video_model: (s.video_model as string) || scene.video_model,
              video_error: (s.video_error as string) || scene.video_error,
              video_duration: (s.video_duration as number) || scene.video_duration,
              start_video_url: (s.start_video_url as string) || scene.start_video_url,
              start_video_status: s.start_video_url ? "done" as VideoStatus : scene.start_video_status,
              start_video_model: (s.start_video_model as string) || scene.start_video_model,
              start_video_error: (s.start_video_error as string) || scene.start_video_error,
              start_video_duration: (s.start_video_duration as number) || scene.start_video_duration,
              end_video_url: (s.end_video_url as string) || scene.end_video_url,
              end_video_status: s.end_video_url ? "done" as VideoStatus : scene.end_video_status,
              end_video_model: (s.end_video_model as string) || scene.end_video_model,
              end_video_error: (s.end_video_error as string) || scene.end_video_error,
              end_video_duration: (s.end_video_duration as number) || scene.end_video_duration,
              // Audio fields — infer from video model for legacy data
              audio_mode: (s.audio_mode as Scene["audio_mode"]) || scene.audio_mode
                || (s.video_model === "infinitalk/from-audio" ? "talking-head" : s.video_model === "kling-3.0/video" ? "audio-native" : undefined),
              start_audio_mode: (s.start_audio_mode as Scene["start_audio_mode"]) || scene.start_audio_mode
                || (s.start_video_model === "infinitalk/from-audio" ? "talking-head" : s.start_video_model === "kling-3.0/video" ? "audio-native" : undefined),
              end_audio_mode: (s.end_audio_mode as Scene["end_audio_mode"]) || scene.end_audio_mode
                || (s.end_video_model === "infinitalk/from-audio" ? "talking-head" : s.end_video_model === "kling-3.0/video" ? "audio-native" : undefined),
              dialogue: (s.dialogue as string) || scene.dialogue,
              dialogue_speaker: (s.dialogue_speaker as string) || scene.dialogue_speaker,
              scene_voice_prompt: (s.scene_voice_prompt as string) || scene.scene_voice_prompt,
              voice_id: (s.voice_id as string) || scene.voice_id,
              voice_stability: (s.voice_stability as number) ?? scene.voice_stability,
              voice_similarity: (s.voice_similarity as number) ?? scene.voice_similarity,
              voice_style: (s.voice_style as number) ?? scene.voice_style,
              voice_speed: (s.voice_speed as number) ?? scene.voice_speed,
              voice_language: (s.voice_language as string) || scene.voice_language,
              scene_audio_url: (s.scene_audio_url as string) || scene.scene_audio_url,
              scene_audio_status: s.scene_audio_url ? "done" as FrameStatus : scene.scene_audio_status,
              // End-slot audio fields (separate video mode)
              end_dialogue: (s.end_dialogue as string) || scene.end_dialogue,
              end_dialogue_speaker: (s.end_dialogue_speaker as string) || scene.end_dialogue_speaker,
              end_scene_voice_prompt: (s.end_scene_voice_prompt as string) || scene.end_scene_voice_prompt,
              end_voice_id: (s.end_voice_id as string) || scene.end_voice_id,
              end_voice_stability: (s.end_voice_stability as number) ?? scene.end_voice_stability,
              end_voice_similarity: (s.end_voice_similarity as number) ?? scene.end_voice_similarity,
              end_voice_style: (s.end_voice_style as number) ?? scene.end_voice_style,
              end_voice_speed: (s.end_voice_speed as number) ?? scene.end_voice_speed,
              end_voice_language: (s.end_voice_language as string) || scene.end_voice_language,
              end_scene_audio_url: (s.end_scene_audio_url as string) || scene.end_scene_audio_url,
              end_scene_audio_status: s.end_scene_audio_url ? "done" as FrameStatus : scene.end_scene_audio_status,
            };
          }),
        });
      }

      // Restore batch creators
      if (saved.batchCreators && Array.isArray(saved.batchCreators) && saved.batchCreators.length > 0) {
        const currentBatch = useStore.getState().batchCreators;
        if (currentBatch.length === 0) {
          useStore.setState({ batchCreators: saved.batchCreators as import("@/types/schema").BatchCreator[] });
        }
      }

      if (saved.projectAspectRatio && saved.projectAspectRatio !== "auto") {
        useStore.getState().setProjectAspectRatio(saved.projectAspectRatio);
      }
    }, 300);
    return () => clearInterval(check);
  }, [workflowId]);

  // Persist canvas + store state (fast debounce 500ms)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveAll(); }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [nodes, edges, workflowId, saveAll]);

  // Also save store data when it changes (500ms debounce)
  useEffect(() => {
    if (storeSaveTimer.current) clearTimeout(storeSaveTimer.current);
    storeSaveTimer.current = setTimeout(() => {
      saveStoreData(workflowId, keyItems, scenes, projectAspectRatio, useStore.getState().agentOutputs, batchCreators);
    }, 500);
    return () => { if (storeSaveTimer.current) clearTimeout(storeSaveTimer.current); };
  }, [keyItems, scenes, projectAspectRatio, workflowId, batchCreators]);

  // FitView after aspect ratio change
  const prevAr = useRef(projectAspectRatio);
  useEffect(() => {
    if (prevAr.current !== projectAspectRatio) {
      prevAr.current = projectAspectRatio;
      setTimeout(() => fitView({ padding: 0.12, duration: 300 }), 200);
    }
  }, [projectAspectRatio, fitView]);

  // Merge store data into nodes — preserve existing positions & restore from localStorage
  useEffect(() => {
    const savedPositions = loadPositions(workflowId);

    setNodes((prev) => {
      const posMap = new Map<string, { x: number; y: number }>();
      for (const n of prev) posMap.set(n.id, n.position);

      // Split keyItems into cast/product/env vs global (camera, vo, music)
      const castItems = keyItems.filter((k) => !GLOBAL_TYPES.has(k.type));
      const globalItems = keyItems.filter((k) => GLOBAL_TYPES.has(k.type));

      // Find max Y among existing cast node positions so new items go below, not overlapping
      let maxCastY = -CAST_Y_GAP;
      for (const item of castItems) {
        const nid = `asset-${item.id}`;
        const pos = posMap.get(nid) ?? savedPositions[nid];
        if (pos) maxCastY = Math.max(maxCastY, pos.y);
      }
      let nextNewCastY = maxCastY + CAST_Y_GAP;

      const castNodes: Node[] = castItems.map((item, i) => {
        const id = `asset-${item.id}`;
        const existing = posMap.get(id) ?? savedPositions[id];
        let position: { x: number; y: number };
        if (existing) {
          position = existing;
        } else {
          // New item — place below all existing cast nodes to avoid overlap
          const defaultY = i * CAST_Y_GAP;
          const occupied = new Set<number>();
          for (const ci of castItems) {
            const cid = `asset-${ci.id}`;
            const cp = posMap.get(cid) ?? savedPositions[cid];
            if (cp) occupied.add(cp.y);
          }
          position = occupied.has(defaultY) ? { x: CAST_X, y: nextNewCastY } : { x: CAST_X, y: defaultY };
          nextNewCastY = Math.max(nextNewCastY, position.y) + CAST_Y_GAP;
        }
        return {
          id,
          type: "assetNode",
          position,
          data: {
            assetId: item.id,
            type: item.type,
            label: item.label,
            driver_type: item.driver_type,
            text_prompt: item.text_prompt,
            image_url: item.image_url,
            image_history: item.image_history,
            image_model: item.image_model,
            image_error: item.image_error,
            reference_image: item.reference_image,
            audio_urls: item.audio_urls,
            audio_history: item.audio_history,
            audio_status: item.audio_status,
            audio_error: item.audio_error,
            voice_name: item.voice_name,
            voice_stability: item.voice_stability,
            voice_similarity: item.voice_similarity,
            voice_style: item.voice_style,
            voice_speed: item.voice_speed,
            voice_language: item.voice_language,
            music_custom_mode: item.music_custom_mode,
            music_instrumental: item.music_instrumental,
            music_model: item.music_model,
            music_style: item.music_style,
            music_title: item.music_title,
            music_vocal_gender: item.music_vocal_gender,
            music_style_weight: item.music_style_weight,
            music_weirdness: item.music_weirdness,
            music_audio_weight: item.music_audio_weight,
            is_permanent_cast: item.is_permanent_cast,
          },
          draggable: true,
        };
      });

      const globalNodes: Node[] = globalItems.map((item, i) => {
        const id = `asset-${item.id}`;
        return {
          id,
          type: "assetNode",
          position: posMap.get(id) ?? (savedPositions[id] ? savedPositions[id] : { x: GLOBAL_X, y: GLOBAL_Y_START + i * GLOBAL_Y_GAP }),
          data: {
            assetId: item.id,
            type: item.type,
            label: item.label,
            driver_type: item.driver_type,
            text_prompt: item.text_prompt,
            image_url: item.image_url,
            image_history: item.image_history,
            image_model: item.image_model,
            image_error: item.image_error,
            audio_urls: item.audio_urls,
            audio_history: item.audio_history,
            audio_status: item.audio_status,
            audio_error: item.audio_error,
            voice_name: item.voice_name,
            voice_stability: item.voice_stability,
            voice_similarity: item.voice_similarity,
            voice_style: item.voice_style,
            voice_speed: item.voice_speed,
            voice_language: item.voice_language,
            music_custom_mode: item.music_custom_mode,
            music_instrumental: item.music_instrumental,
            music_model: item.music_model,
            music_style: item.music_style,
            music_title: item.music_title,
            music_vocal_gender: item.music_vocal_gender,
            music_style_weight: item.music_style_weight,
            music_weirdness: item.music_weirdness,
            music_audio_weight: item.music_audio_weight,
            isGlobal: true,
          },
          draggable: true,
        };
      });

      const sceneNodes: Node[] = scenes.map((scene, i) => ({
        id: scene.id,
        type: "sceneNode",
        position: posMap.get(scene.id) ?? (savedPositions[scene.id] ? savedPositions[scene.id] : {
          x: SCENE_X + (i % SCENE_COLS) * SCENE_X_GAP,
          y: Math.floor(i / SCENE_COLS) * SCENE_Y_GAP,
        }),
        data: {
          sceneId: scene.id,
          scene_number: scene.scene_number,
          type: scene.type,
          shot_type: scene.shot_type,
          visual_type: scene.visual_type,
          visual_description: scene.visual_description,
          action_movement: scene.action_movement,
          start_image_prompt: scene.start_image_prompt,
          end_image_prompt: scene.end_image_prompt,
          start_frame_status: scene.start_frame_status,
          start_frame_image: scene.start_frame_image,
          start_frame_history: scene.start_frame_history,
          start_frame_model: scene.start_frame_model,
          start_frame_error: scene.start_frame_error,
          end_frame_status: scene.end_frame_status,
          end_frame_image: scene.end_frame_image,
          end_frame_history: scene.end_frame_history,
          end_frame_model: scene.end_frame_model,
          end_frame_error: scene.end_frame_error,
          start_video_prompt: scene.start_video_prompt,
          end_video_prompt: scene.end_video_prompt,
          combined_video_prompt: scene.combined_video_prompt,
          aspect_ratio: projectAspectRatio,
          // Per-scene audio fields
          audio_mode: scene.audio_mode,
          start_audio_mode: scene.start_audio_mode,
          end_audio_mode: scene.end_audio_mode,
          dialogue: scene.dialogue,
          dialogue_speaker: scene.dialogue_speaker,
          scene_voice_prompt: scene.scene_voice_prompt,
          voice_id: scene.voice_id,
          scene_audio_url: scene.scene_audio_url,
          scene_audio_status: scene.scene_audio_status,
          end_scene_audio_url: scene.end_scene_audio_url,
          // Video fields
          video_mode: scene.video_mode,
          video_status: scene.video_status,
          video_url: scene.video_url,
          video_model: scene.video_model,
          video_error: scene.video_error,
          video_duration: scene.video_duration,
          start_video_status: scene.start_video_status,
          start_video_url: scene.start_video_url,
          start_video_model: scene.start_video_model,
          start_video_error: scene.start_video_error,
          start_video_duration: scene.start_video_duration,
          end_video_status: scene.end_video_status,
          end_video_url: scene.end_video_url,
          end_video_model: scene.end_video_model,
          end_video_error: scene.end_video_error,
          end_video_duration: scene.end_video_duration,
        },
        draggable: true,
      }));

      // Talking card nodes — only for non-silent slots
      // Combined → 1 card if audio_mode non-silent
      // Separate → independent cards per slot based on start_audio_mode / end_audio_mode
      const TALKING_CARD_OFFSET_X = -310; // Left of scene node
      const talkingCardNodes: Node[] = [];
      for (const scene of scenes) {
        const sceneNode = sceneNodes.find((n) => n.id === scene.id);
        const scenePos = sceneNode?.position ?? { x: SCENE_X, y: 0 };
        const isSeparate = scene.video_mode === "separate";

        const makeCard = (slot: "combined" | "start" | "end", slotAudioMode: string, yOffset: number) => {
          const tcId = slot === "combined"
            ? `talking-card-${scene.id}`
            : `talking-card-${slot}-${scene.id}`;
          const isEnd = slot === "end";
          return {
            id: tcId,
            type: "talkingCardNode",
            position: posMap.get(tcId) ?? savedPositions[tcId] ?? {
              x: scenePos.x + TALKING_CARD_OFFSET_X,
              y: scenePos.y + yOffset,
            },
            data: {
              sceneId: scene.id,
              scene_number: scene.scene_number,
              audio_mode: slotAudioMode,
              slot,
              dialogue: isEnd ? scene.end_dialogue : scene.dialogue,
              dialogue_speaker: isEnd ? scene.end_dialogue_speaker : scene.dialogue_speaker,
              scene_voice_prompt: isEnd ? scene.end_scene_voice_prompt : scene.scene_voice_prompt,
              voice_id: isEnd ? scene.end_voice_id : scene.voice_id,
              voice_stability: isEnd ? scene.end_voice_stability : scene.voice_stability,
              voice_similarity: isEnd ? scene.end_voice_similarity : scene.voice_similarity,
              voice_style: isEnd ? scene.end_voice_style : scene.voice_style,
              voice_speed: isEnd ? scene.end_voice_speed : scene.voice_speed,
              voice_language: isEnd ? scene.end_voice_language : scene.voice_language,
              scene_audio_url: isEnd ? scene.end_scene_audio_url : scene.scene_audio_url,
              scene_audio_status: isEnd ? scene.end_scene_audio_status : scene.scene_audio_status,
              scene_audio_history: isEnd ? scene.end_scene_audio_history : scene.scene_audio_history,
              combined_video_prompt: scene.combined_video_prompt,
              start_video_prompt: scene.start_video_prompt,
              end_video_prompt: scene.end_video_prompt,
              video_status: isEnd ? scene.end_video_status : (slot === "start" ? scene.start_video_status : scene.video_status),
              frame_image: isEnd ? scene.end_frame_image : scene.start_frame_image,
            },
            draggable: true,
          };
        };

        if (isSeparate) {
          const startMode = scene.start_audio_mode || "silent";
          const endMode = scene.end_audio_mode || "silent";
          if (startMode !== "silent") talkingCardNodes.push(makeCard("start", startMode, 40));
          if (endMode !== "silent") talkingCardNodes.push(makeCard("end", endMode, 340));
        } else {
          const mode = scene.audio_mode || "silent";
          if (mode !== "silent") talkingCardNodes.push(makeCard("combined", mode, 80));
        }
      }

      // Preserve existing note nodes
      const existingNotes = prev.filter((n) => n.type === "noteNode");
      // On first load, also restore notes from localStorage
      const savedNotes = existingNotes.length > 0 ? existingNotes : loadNotes(workflowId);

      // Auto-created summary node (always present, positioned above globals)
      const summaryId = "node-summary-brief";
      const summaryPos = posMap.get(summaryId) ?? savedPositions[summaryId] ?? { x: GLOBAL_X, y: GLOBAL_Y_START - 340 };
      const summaryNode: Node = {
        id: summaryId,
        type: "summaryNode",
        position: summaryPos,
        data: {},
        draggable: true,
      };

      // Batch creator nodes
      const BATCH_X = SCENE_X + SCENE_COLS * SCENE_X_GAP + 200;
      const batchNodes: Node[] = batchCreators.map((bc, i) => {
        const id = `batch-${bc.id}`;
        return {
          id,
          type: "batchCreatorNode",
          position: posMap.get(id) ?? savedPositions[id] ?? { x: BATCH_X, y: i * 500 },
          data: { batchId: bc.id },
          draggable: true,
        };
      });

      // Batch image output nodes — one per batch item
      const BATCH_OUT_X_OFFSET = 520; // right of batch creator
      const BATCH_OUT_COLS = 3;
      const BATCH_OUT_X_GAP = 290;
      const BATCH_OUT_Y_GAP = 420;
      const batchOutputNodes: Node[] = [];
      batchCreators.forEach((bc, bcIdx) => {
        const batchNodeId = `batch-${bc.id}`;
        const batchPos = posMap.get(batchNodeId) ?? savedPositions[batchNodeId] ?? { x: BATCH_X, y: bcIdx * 500 };
        bc.items.forEach((item, itemIdx) => {
          const outId = `batch-out-${bc.id}-${item.id}`;
          const col = itemIdx % BATCH_OUT_COLS;
          const row = Math.floor(itemIdx / BATCH_OUT_COLS);
          const defaultPos = {
            x: batchPos.x + BATCH_OUT_X_OFFSET + col * BATCH_OUT_X_GAP,
            y: batchPos.y + row * BATCH_OUT_Y_GAP,
          };
          batchOutputNodes.push({
            id: outId,
            type: "batchImageOutputNode",
            position: posMap.get(outId) ?? savedPositions[outId] ?? defaultPos,
            data: { batchId: bc.id, itemId: item.id },
            draggable: true,
          });
        });
      });

      return [summaryNode, ...globalNodes, ...castNodes, ...sceneNodes, ...talkingCardNodes, ...batchNodes, ...batchOutputNodes, ...savedNotes];
    });

    // Restore saved edges on first load (only once)
    if (!restoredEdges.current && keyItems.length > 0) {
      restoredEdges.current = true;
      const saved = loadEdges(workflowId);
      // Only trust saved edges if they contain actual asset→scene connections
      // (not just talking-card edges or empty). Otherwise let auto-wiring run fresh.
      const hasValidEdges = saved.some(
        (e) => (e.source.startsWith("asset-") && !e.source.startsWith("asset-camera") &&
               (e.targetHandle === "start-target" || e.targetHandle === "end-target")) ||
               e.targetHandle === "batch-target" || e.targetHandle === "batch-product" || e.targetHandle === "batch-cast"
      );
      if (saved.length > 0 && hasValidEdges) {
        setEdges(saved);
        autoWired.current = true;
      }
    }

    // Auto-fit when content first appears
    const totalCount = keyItems.length + scenes.length;
    if (totalCount > 0 && prevCount.current === 0) {
      setTimeout(() => fitView({ padding: 0.12, duration: 300 }), 150);
    }
    // Reset auto-wiring flag when store is cleared (new workflow)
    if (totalCount === 0) {
      autoWired.current = false;
      restoredEdges.current = false;
    }
    prevCount.current = totalCount;
  }, [scenes, keyItems, setNodes, fitView, workflowId, setEdges, projectAspectRatio, batchCreators]);

  // Auto-wire batch creator → output nodes (structural edges, always kept in sync)
  useEffect(() => {
    if (batchCreators.length === 0) return;
    setEdges((prev) => {
      // Remove stale batch-output edges
      const nonBatchOut = prev.filter((e) => !e.id.startsWith("batch-out-edge-"));
      const newEdges: Edge[] = [];
      const seen = new Set(nonBatchOut.map((e) => `${e.source}→${e.target}`));
      for (const bc of batchCreators) {
        const srcId = `batch-${bc.id}`;
        for (const item of bc.items) {
          const tgtId = `batch-out-${bc.id}-${item.id}`;
          const key = `${srcId}→${tgtId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          newEdges.push({
            id: `batch-out-edge-${bc.id}-${item.id}`,
            source: srcId,
            target: tgtId,
            targetHandle: "batch-img-in",
            type: "smartWire",
            data: { wireType: "batch-output" },
          });
        }
      }
      if (newEdges.length === 0 && nonBatchOut.length === prev.length) return prev;
      return [...nonBatchOut, ...newEdges];
    });
  }, [batchCreators, setEdges]);

  // Sync batch creator edge connections → stored IDs on the BatchCreator object
  // Smart auto-classify: scans ALL edges targeting the batch node, resolves source
  // asset type from keyItems, and auto-classifies as cast/product/ref.
  // Uses direct setState (NOT updateBatchCreator) to avoid triggering _debouncedSave —
  // these are transient runtime values re-derived from edges, not persistent data.
  useEffect(() => {
    if (batchCreators.length === 0) return;
    let needsUpdate = false;
    const updated = batchCreators.map((bc) => {
      const batchNodeId = `batch-${bc.id}`;
      const incomingEdges = edges.filter(
        (e) => e.target === batchNodeId && e.source?.startsWith("asset-")
      );
      let castId: string | undefined;
      let productId: string | undefined;
      let refId: string | undefined;
      for (const edge of incomingEdges) {
        const assetId = edge.source.replace(/^asset-/, "");
        const item = keyItems.find((k) => k.id === assetId);
        if (!item) continue;
        const handle = edge.targetHandle || "";
        if (handle === "batch-cast" || item.type === "character") {
          if (!castId) castId = assetId;
        } else if (handle === "batch-product" || item.type === "product") {
          if (!productId) productId = assetId;
        } else {
          if (!refId) refId = assetId;
        }
      }
      if (bc.connected_cast_id !== castId || bc.connected_product_id !== productId || bc.connected_ref_id !== refId) {
        needsUpdate = true;
        return { ...bc, connected_cast_id: castId, connected_product_id: productId, connected_ref_id: refId };
      }
      return bc;
    });
    if (needsUpdate) {
      useStore.setState({ batchCreators: updated });
    }
  }, [edges, batchCreators, keyItems]);

  // Sync permanent cast keyItems with hiredCastStore — when images are added/removed
  // in the hired cast page, the canvas cards and API calls use the live data
  const hiredCastList = useHiredCastStore((s) => s.hiredCast);
  useEffect(() => {
    const permanentItems = keyItems.filter((k) => k.is_permanent_cast && k.hired_cast_id);
    if (permanentItems.length === 0) return;
    let needsUpdate = false;
    const updatedItems = keyItems.map((k) => {
      if (!k.is_permanent_cast || !k.hired_cast_id) return k;
      const hc = hiredCastList.find((c) => c.id === k.hired_cast_id);
      if (!hc) return k;
      const liveFirst = hc.images[0] || undefined;
      const liveAll = hc.images.length > 0 ? [...hc.images] : undefined;
      // Only update if images actually changed
      const currentFirst = k.image_url;
      const currentAll = k.reference_images;
      const firstChanged = liveFirst !== currentFirst;
      const allChanged = JSON.stringify(liveAll) !== JSON.stringify(currentAll);
      if (firstChanged || allChanged) {
        needsUpdate = true;
        return { ...k, image_url: liveFirst, reference_image: liveFirst, reference_images: liveAll };
      }
      return k;
    });
    if (needsUpdate) {
      useStore.setState({ keyItems: updatedItems });
    }
  }, [hiredCastList, keyItems]);

  // Auto-wire: when scenes + keyItems both exist, generate edges from active_cast/active_setting
  // Only runs once per workflow (autoWired flag), and only if no saved edges were restored
  // Fallback: if no active_cast/active_setting data, connect ALL visual assets to ALL scenes
  useEffect(() => {
    if (autoWired.current) return;
    if (scenes.length === 0 || keyItems.length === 0) return;
    // Need at least one scene-type asset (character/environment/product) to wire
    const WIREABLE_TYPES = new Set(["character", "environment", "product"]);
    const hasWireableAssets = keyItems.some((k) => WIREABLE_TYPES.has(k.type));
    if (!hasWireableAssets) return;

    autoWired.current = true;

    // Build lookup: asset label → asset node ID (skip voiceover & music — global, no wiring)
    // Multiple aliases per item to handle any casing/format the Director might output
    const NO_WIRE_TYPES = new Set(["voiceover", "music", "camera"]);
    const labelToNodeId = new Map<string, string>();
    for (const item of keyItems) {
      if (NO_WIRE_TYPES.has(item.type)) continue;
      const nodeId = `asset-${item.id}`;
      // Primary: exact lowercase label
      labelToNodeId.set(item.label.toLowerCase(), nodeId);
      // Also: snake_case version ("hero model" → "hero_model")
      labelToNodeId.set(item.label.toLowerCase().replace(/\s+/g, "_"), nodeId);
    }

    // Map setting labels — add ALL possible alias forms for robust matching
    const settingAItem = keyItems.find((k) => k.id === "env-a" || k.label === "Setting A");
    const settingBItem = keyItems.find((k) => k.id === "env-b" || k.label === "Setting B");
    if (settingAItem) {
      const nid = `asset-${settingAItem.id}`;
      labelToNodeId.set("setting_a", nid);
      labelToNodeId.set("setting a", nid);
      labelToNodeId.set("setting-a", nid);
      labelToNodeId.set("settinga", nid);
    }
    if (settingBItem) {
      const nid = `asset-${settingBItem.id}`;
      labelToNodeId.set("setting_b", nid);
      labelToNodeId.set("setting b", nid);
      labelToNodeId.set("setting-b", nid);
      labelToNodeId.set("settingb", nid);
    }

    // Collect all wireable asset node IDs for fallback
    const allCharacterNodeIds = keyItems.filter((k) => k.type === "character").map((k) => `asset-${k.id}`);
    const allEnvironmentNodeIds = keyItems.filter((k) => k.type === "environment").map((k) => `asset-${k.id}`);

    // Product node ID (connects to every scene)
    const productItem = keyItems.find((k) => k.type === "product");
    const productNodeId = productItem ? `asset-${productItem.id}` : null;

    const uid = () => `ae-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newEdges: Edge[] = [];
    // Deduplicate: track source+target+handle combos already added
    const seen = new Set<string>();

    for (const scene of scenes) {
      const wireAsset = (assetNodeId: string) => {
        for (const handle of ["start-target", "end-target"]) {
          const key = `${assetNodeId}→${scene.id}:${handle}`;
          if (seen.has(key)) continue;
          seen.add(key);
          newEdges.push({
            id: uid(),
            source: assetNodeId,
            target: scene.id,
            targetHandle: handle,
            type: "smartWire",
            data: { wireType: "visual" },
          });
        }
      };

      const hasCastData = scene.active_cast && scene.active_cast.length > 0;
      const hasSettingData = !!scene.active_setting;

      if (hasCastData) {
        // Connect active cast members → scene (both frames)
        let matched = 0;
        for (const castName of scene.active_cast!) {
          // Try multiple normalization forms for the name
          const normalized = castName.toLowerCase().trim();
          const assetNodeId = labelToNodeId.get(normalized)
            || labelToNodeId.get(normalized.replace(/\s+/g, "_"))
            || labelToNodeId.get(normalized.replace(/_/g, " "));
          if (assetNodeId) { wireAsset(assetNodeId); matched++; }
        }
        // If none matched, fall back to ALL character assets
        if (matched === 0) {
          for (const nodeId of allCharacterNodeIds) wireAsset(nodeId);
        }
      } else {
        // No active_cast data: connect ALL character assets → this scene
        for (const nodeId of allCharacterNodeIds) wireAsset(nodeId);
      }

      if (hasSettingData) {
        // Try multiple normalization forms for the setting name
        const raw = scene.active_setting!.toLowerCase().trim();
        const settingNodeId = labelToNodeId.get(raw)
          || labelToNodeId.get(raw.replace(/\s+/g, "_"))
          || labelToNodeId.get(raw.replace(/_/g, " "))
          || labelToNodeId.get(raw.replace(/[-_\s]/g, ""));
        if (settingNodeId) {
          wireAsset(settingNodeId);
        } else {
          // Setting name didn't match any known label — fall back to ALL environments
          for (const nodeId of allEnvironmentNodeIds) wireAsset(nodeId);
        }
      } else {
        // No active_setting data: connect ALL environment assets → this scene
        for (const nodeId of allEnvironmentNodeIds) wireAsset(nodeId);
      }

      // Connect product → scene (both frames) — always
      if (productNodeId) {
        wireAsset(productNodeId);
      }

      // Connect talking card → scene video section (video wire for all non-silent audio modes)
      {
        const isSep = scene.video_mode === "separate";
        const cards: { tcId: string; handle: string }[] = [];
        if (isSep) {
          if (scene.start_audio_mode && scene.start_audio_mode !== "silent")
            cards.push({ tcId: `talking-card-start-${scene.id}`, handle: "start-video-target" });
          if (scene.end_audio_mode && scene.end_audio_mode !== "silent")
            cards.push({ tcId: `talking-card-end-${scene.id}`, handle: "end-video-target" });
        } else {
          if (scene.audio_mode && scene.audio_mode !== "silent")
            cards.push({ tcId: `talking-card-${scene.id}`, handle: "video-target" });
        }
        for (const { tcId, handle } of cards) {
          const key = `${tcId}:video-source→${scene.id}:${handle}`;
          if (!seen.has(key)) {
            seen.add(key);
            newEdges.push({
              id: uid(),
              source: tcId,
              sourceHandle: "video-source",
              target: scene.id,
              targetHandle: handle,
              type: "smartWire",
              data: { wireType: "video" },
            });
          }
        }
      }
    }

    if (newEdges.length > 0) {
      setEdges(newEdges); // Replace, not append — fresh wiring
    }
  }, [scenes, keyItems, setEdges]);

  // Dynamic edge management for talking cards: sync video wires with per-slot audio_mode changes
  useEffect(() => {
    if (scenes.length === 0) return;

    // Helper: extract sceneId from talking card node id
    const tcSceneId = (src: string) => {
      if (src.startsWith("talking-card-start-")) return src.replace("talking-card-start-", "");
      if (src.startsWith("talking-card-end-")) return src.replace("talking-card-end-", "");
      return src.replace("talking-card-", "");
    };

    setEdges((eds) => {
      const sceneMap = new Map(scenes.map((s) => [s.id, s]));

      // Remove stale talking card edges
      let updated = eds.filter((e) => {
        if (!e.source.startsWith("talking-card-")) return true;
        const sId = tcSceneId(e.source);
        const scene = sceneMap.get(sId);
        if (!scene) return false;
        const isSep = scene.video_mode === "separate";
        const isCombinedCard = e.source === `talking-card-${sId}`;
        const isStartCard = e.source === `talking-card-start-${sId}`;
        const isEndCard = e.source === `talking-card-end-${sId}`;
        // Remove combined cards in separate mode and vice versa
        if (isSep && isCombinedCard) return false;
        if (!isSep && (isStartCard || isEndCard)) return false;
        // Check per-slot audio mode (keep edges for any non-silent mode)
        if (isSep) {
          if (isStartCard && (!scene.start_audio_mode || scene.start_audio_mode === "silent")) return false;
          if (isEndCard && (!scene.end_audio_mode || scene.end_audio_mode === "silent")) return false;
        } else {
          if (!scene.audio_mode || scene.audio_mode === "silent") return false;
        }
        return true;
      });

      // Track existing edges
      const existingKeys = new Set(
        updated
          .filter((e) => e.source.startsWith("talking-card-"))
          .map((e) => `${e.source}→${e.targetHandle || "default"}`)
      );

      for (const scene of scenes) {
        const isSep = scene.video_mode === "separate";
        const cards: { tcId: string; handle: string }[] = [];
        if (isSep) {
          if (scene.start_audio_mode && scene.start_audio_mode !== "silent")
            cards.push({ tcId: `talking-card-start-${scene.id}`, handle: "start-video-target" });
          if (scene.end_audio_mode && scene.end_audio_mode !== "silent")
            cards.push({ tcId: `talking-card-end-${scene.id}`, handle: "end-video-target" });
        } else {
          if (scene.audio_mode && scene.audio_mode !== "silent")
            cards.push({ tcId: `talking-card-${scene.id}`, handle: "video-target" });
        }

        for (const { tcId, handle } of cards) {
          const key = `${tcId}→${handle}`;
          if (!existingKeys.has(key)) {
            updated = [
              ...updated,
              {
                id: `tc-video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                source: tcId,
                sourceHandle: "video-source",
                target: scene.id,
                targetHandle: handle,
                type: "smartWire",
                data: { wireType: "video" },
              },
            ];
          }
        }
      }

      return updated;
    });
  }, [scenes, setEdges]);

  // Handle connections: asset→scene or scene→scene
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceId = connection.source || "";
      const isAssetSource = sourceId.startsWith("asset-");
      const isTalkingCard = sourceId.startsWith("talking-card-");
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smartWire",
            data: {
              wireType: isTalkingCard ? "video" : isAssetSource ? "visual" : "scene-link",
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Click on a handle dot → show context menu with connections (locate / cut)
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const target = event.target as HTMLElement;
      // Only trigger on handle dots
      if (!target.classList.contains("react-flow__handle")) return;
      event.stopPropagation();

      const nodeEdges = edges.filter(
        (e) => e.source === node.id || e.target === node.id
      );

      const connections: ConnectionEntry[] = nodeEdges.map((e) => {
        const isSource = e.source === node.id;
        const otherNodeId = isSource ? (e.target ?? "") : (e.source ?? "");
        const otherNode = nodes.find((n) => n.id === otherNodeId);
        const otherData = otherNode?.data as Record<string, unknown> | undefined;

        // Build a friendly label
        let label: string;
        if (otherData?.scene_number) {
          label = `S${otherData.scene_number}`;
        } else if (otherData?.label) {
          label = otherData.label as string;
        } else {
          label = otherNodeId;
        }

        // Determine which frame handle this edge connects to
        const handle = isSource ? (e.targetHandle ?? "") : (e.sourceHandle ?? "");
        let frame: string | undefined;
        if (handle.includes("start")) frame = "Start";
        else if (handle.includes("end")) frame = "End";

        return { edgeId: e.id, targetNodeId: otherNodeId, targetLabel: label, frame };
      });

      const rfBounds = (event.currentTarget as HTMLElement).closest(".react-flow")?.getBoundingClientRect();
      setHandleMenu({
        x: event.clientX - (rfBounds?.left ?? 0),
        y: event.clientY - (rfBounds?.top ?? 0),
        connections,
      });
    },
    [edges, nodes]
  );

  // Locate: pan to target node + highlight for 1.5s
  const handleLocate = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setCenter(node.position.x + 150, node.position.y + 100, {
        zoom: getZoom(),
        duration: 400,
      });
      setHighlightNodeId(nodeId);
      setTimeout(() => setHighlightNodeId(null), 1500);
    },
    [nodes, setCenter, getZoom]
  );

  // Cut: remove edge(s)
  const handleCut = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [setEdges]
  );

  const handleCutAll = useCallback(
    (edgeIds: string[]) => {
      const idSet = new Set(edgeIds);
      setEdges((eds) => eds.filter((e) => !idSet.has(e.id)));
    },
    [setEdges]
  );

  // Organize: rearrange all nodes into a clean grid layout
  const organizeNodes = useCallback(() => {
    setNodes((prev) => {
      const summary = prev.filter((n) => n.type === "summaryNode");
      const assets = prev.filter((n) => n.type === "assetNode");
      const sceneNds = prev.filter((n) => n.type === "sceneNode");
      const notes = prev.filter((n) => n.type === "noteNode");

      // Split assets into global vs cast/product/setting
      const globalAssets = assets.filter((n) => {
        const t = (n.data as Record<string, unknown>)?.type as string;
        return GLOBAL_TYPES.has(t);
      });
      const castAssets = assets.filter((n) => {
        const t = (n.data as Record<string, unknown>)?.type as string;
        return !GLOBAL_TYPES.has(t);
      });

      // Layout constants — generous spacing to prevent overlap
      const startX = 0;
      const startY = 0;
      const summaryW = 340;    // summary node width
      const summaryH = 400;    // summary node height (includes brief text)
      const assetW = 240;      // asset card width
      const assetH = 380;      // asset card height (image + controls)
      const sceneW = 620;      // scene node width (side-by-side frames)
      const sceneH = 900;      // scene node height (frames + video section)
      const gapX = 60;         // horizontal gap between columns
      const gapY = 60;         // vertical gap between rows

      const updated = new Map<string, { x: number; y: number }>();

      // Column 1: Summary + Global assets (stacked vertically)
      const col1X = startX;
      let y = startY;
      for (const n of summary) {
        updated.set(n.id, { x: col1X, y });
        y += summaryH + gapY;
      }
      for (const n of globalAssets) {
        updated.set(n.id, { x: col1X, y });
        y += assetH + gapY;
      }

      // Column 2: Cast/product/setting assets in a 2-wide grid
      const castColX = col1X + summaryW + gapX;
      const castCols = 2;
      for (let i = 0; i < castAssets.length; i++) {
        const col = i % castCols;
        const row = Math.floor(i / castCols);
        updated.set(castAssets[i].id, {
          x: castColX + col * (assetW + gapX),
          y: startY + row * (assetH + gapY),
        });
      }

      // Column 3: Scenes in a 2-wide grid, to the right of all assets
      const castGridWidth = castCols * assetW + (castCols - 1) * gapX;
      const sceneStartX = castColX + castGridWidth + gapX * 2;
      const sceneCols = SCENE_COLS;
      for (let i = 0; i < sceneNds.length; i++) {
        const col = i % sceneCols;
        const row = Math.floor(i / sceneCols);
        updated.set(sceneNds[i].id, {
          x: sceneStartX + col * (sceneW + gapX),
          y: startY + row * (sceneH + gapY),
        });
      }

      // Notes: stack below scenes
      const maxSceneY = sceneNds.length > 0
        ? startY + Math.ceil(sceneNds.length / sceneCols) * (sceneH + gapY) + gapY
        : startY;
      for (let i = 0; i < notes.length; i++) {
        updated.set(notes[i].id, {
          x: sceneStartX + i * 400,
          y: maxSceneY,
        });
      }

      return prev.map((n) => {
        const pos = updated.get(n.id);
        return pos ? { ...n, position: pos } : n;
      });
    });

    // Fit view after layout
    setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 50);
  }, [setNodes, fitView]);

  // Add a markdown note at the center of current viewport
  const addNote = useCallback(() => {
    const vp = getViewport();
    const noteId = `note-${Date.now()}-${noteCounter.current++}`;
    const centerX = (-vp.x + 400) / vp.zoom;
    const centerY = (-vp.y + 300) / vp.zoom;

    const updateNote = (nid: string, content: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === `node-${nid}` ? { ...n, data: { ...n.data, content } } : n
        )
      );
    };

    const deleteNote = (nid: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== `node-${nid}`));
    };

    setNodes((nds) => [
      ...nds,
      {
        id: `node-${noteId}`,
        type: "noteNode",
        position: { x: centerX, y: centerY },
        data: { noteId, content: "", onUpdate: updateNote, onDelete: deleteNote },
        draggable: true,
      },
    ]);
  }, [setNodes, getViewport]);

  // Memoize nodes with highlight to avoid new array every render
  const displayNodes = useMemo(() => {
    if (!highlightNodeId) return nodes;
    return nodes.map((n) => n.id === highlightNodeId ? { ...n, className: "locate-highlight" } : n);
  }, [nodes, highlightNodeId]);

  return (
    <>
      <CanvasToolbar onAddNote={addNote} onOrganize={organizeNodes} onHireCast={() => setCastSelectorOpen(true)} />
      <HiredCastSelector
        open={castSelectorOpen}
        onClose={() => setCastSelectorOpen(false)}
        onSelect={(cast: HiredCast) => {
          // Build description from hired cast fields
          const descParts: string[] = [];
          if (cast.description) descParts.push(cast.description);
          if (cast.gender) descParts.push(`Gender: ${cast.gender}`);
          if (cast.age_range) descParts.push(`Age: ${cast.age_range}`);
          if (cast.ethnicity) descParts.push(`Ethnicity: ${cast.ethnicity}`);
          if (cast.physical_details) descParts.push(`Physical: ${cast.physical_details}`);
          const fullDesc = descParts.join(". ");
          // Create a pre-populated cast card
          const id = addPermanentCast(cast.name);
          // Update with all the hired cast details
          useStore.setState((s) => ({
            keyItems: s.keyItems.map((k) =>
              k.id === id
                ? {
                    ...k,
                    text_prompt: fullDesc,
                    driver_type: cast.driver_type,
                    image_url: cast.images[0] || undefined,
                    reference_image: cast.images[0] || undefined,
                    reference_images: cast.images.length > 0 ? [...cast.images] : undefined,
                    hired_cast_id: cast.id,
                  }
                : k
            ),
          }));
        }}
      />
      <HandleContextMenu
        menu={handleMenu}
        onClose={() => setHandleMenu(null)}
        onLocate={handleLocate}
        onCut={handleCut}
        onCutAll={handleCutAll}
      />
      <CanvasStatusBar />
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "smartWire" }}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.05}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{ background: "#18181b", border: "1px solid #27272a" }}
        />
      </ReactFlow>
    </>
  );
}

export default function DirectorCanvas() {
  return (
    <div className="flex-1 h-full relative">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
