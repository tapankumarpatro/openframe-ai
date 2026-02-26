"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ChevronDown, ChevronUp, Image, Sparkles, Film,
  Workflow, AlertCircle, CheckCircle2, Loader2, Clock, Coins,
  X, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApiLogs, type ApiLogEntry, type ApiLogStats } from "@/lib/api";

const TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  image_generation: { icon: Image, label: "Image Gen", color: "text-accent-primary" },
  prompt_enhancement: { icon: Sparkles, label: "Prompt", color: "text-accent-yellow" },
  workflow_pipeline: { icon: Workflow, label: "Pipeline", color: "text-accent-purple" },
  video_generation: { icon: Film, label: "Video Gen", color: "text-accent-green" },
};

const STATUS_META: Record<string, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: "text-muted" },
  running: { icon: Loader2, color: "text-accent-primary" },
  success: { icon: CheckCircle2, color: "text-accent-green" },
  error: { icon: AlertCircle, color: "text-accent-red" },
};

function formatTime(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatDuration(ms?: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ApiLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [stats, setStats] = useState<ApiLogStats | null>(null);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApiLogs(100, filter);
      setLogs(data.logs);
      setStats(data.stats);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Poll logs when panel is open
  useEffect(() => {
    if (!open) return;
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, fetchLogs]);

  const filterOptions = [
    { value: undefined, label: "All" },
    { value: "image_generation", label: "Image" },
    { value: "prompt_enhancement", label: "Prompt" },
    { value: "workflow_pipeline", label: "Pipeline" },
    { value: "video_generation", label: "Video" },
  ];

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
      open ? "h-[340px]" : "h-10"
    )}>
      {/* Header bar — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-10 flex items-center justify-between px-5 bg-card/95 backdrop-blur-md border-t border-border hover:bg-card-hover transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-accent-primary" />
          <span className="text-[11px] font-semibold text-foreground tracking-wide uppercase">API Log</span>
          {stats && (
            <div className="flex items-center gap-4 ml-3">
              <span className="text-[11px] text-muted">
                {stats.total_calls} calls
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-amber-600">
                <Coins className="w-3.5 h-3.5" />
                ~${stats.total_estimated_credits.toFixed(3)}
              </span>
              {stats.by_type.image_generation && (
                <span className="flex items-center gap-1 text-[11px] text-accent-primary">
                  <Image className="w-3.5 h-3.5" />
                  {stats.by_type.image_generation.count}
                </span>
              )}
              {stats.by_type.prompt_enhancement && (
                <span className="flex items-center gap-1 text-[11px] text-accent-purple">
                  <Sparkles className="w-3.5 h-3.5" />
                  {stats.by_type.prompt_enhancement.count}
                </span>
              )}
            </div>
          )}
          {loading && <Loader2 className="w-3.5 h-3.5 text-muted animate-spin ml-1" />}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronUp className="w-4 h-4 text-muted" />}
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-[calc(100%-40px)] bg-card/98 backdrop-blur-md border-t border-border flex flex-col overflow-hidden"
          >
            {/* Filters */}
            <div className="flex items-center gap-2 px-5 py-2 border-b border-border/50">
              <Filter className="w-3.5 h-3.5 text-muted" />
              {filterOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                    filter === opt.value
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "text-muted hover:text-foreground hover:bg-card-hover"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[80px_100px_140px_90px_1fr_90px_70px_60px] gap-2 px-5 py-2 border-b border-border/50 text-[10px] text-muted uppercase tracking-wider font-semibold">
              <span>Time</span>
              <span>Type</span>
              <span>Model</span>
              <span>Task ID</span>
              <span>Input</span>
              <span>Status</span>
              <span>Duration</span>
              <span className="text-right">Credits</span>
            </div>

            {/* Log rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {logs.length === 0 && (
                <div className="flex items-center justify-center h-full text-[12px] text-muted">
                  No API calls logged yet. Generate an image or enhance prompts to see logs here.
                </div>
              )}
              {logs.map((log) => {
                const typeMeta = TYPE_META[log.call_type] || { icon: Activity, label: log.call_type, color: "text-muted" };
                const statusMeta = STATUS_META[log.status] || STATUS_META.pending;
                const TypeIcon = typeMeta.icon;
                const StatusIcon = statusMeta.icon;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "grid grid-cols-[80px_100px_140px_90px_1fr_90px_70px_60px] gap-2 px-5 py-2 border-b border-border/30 hover:bg-card-hover/50 transition-colors items-center",
                      log.status === "error" && "bg-accent-red/3"
                    )}
                  >
                    <span className="text-[11px] text-muted tabular-nums">{formatTime(log.timestamp)}</span>
                    <span className={cn("flex items-center gap-1.5 text-[11px] font-medium", typeMeta.color)}>
                      <TypeIcon className="w-3.5 h-3.5" />
                      {typeMeta.label}
                    </span>
                    <span className="text-[11px] text-foreground/80 truncate font-mono">{log.model}</span>
                    <span className="text-[10px] text-muted font-mono truncate" title={log.task_id || "—"}>
                      {log.task_id ? log.task_id.slice(0, 12) + "…" : "—"}
                    </span>
                    <span className="text-[11px] text-muted truncate" title={log.input_summary}>
                      {log.input_summary || "—"}
                    </span>
                    <span className={cn("flex items-center gap-1.5 text-[11px] font-medium", statusMeta.color)}>
                      <StatusIcon className={cn("w-3.5 h-3.5", log.status === "running" && "animate-spin")} />
                      {log.status}
                      {log.error_message && (
                        <span className="text-[10px] text-accent-red truncate max-w-[60px]" title={log.error_message}>
                          <X className="w-3 h-3 inline" />
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted tabular-nums">{formatDuration(log.duration_ms)}</span>
                    <span className="text-[11px] text-amber-600 tabular-nums text-right">
                      ${log.estimated_credits.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
