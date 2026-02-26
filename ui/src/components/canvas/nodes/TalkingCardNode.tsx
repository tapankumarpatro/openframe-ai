"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Mic, Volume2, Play, Pause, Upload, Trash2, Bot, Send,
  Loader2, ChevronDown, ChevronUp, ArrowRightToLine, AlertTriangle, Video, History, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { FrameStatus, AudioMode, VideoStatus } from "@/types/schema";
import { VoicePicker, VoiceSettings } from "./VoicePicker";
import ProFeatureGate from "@/components/ui/ProFeatureGate";

function isValidSrc(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith("blob:")) return false;
  return true;
}

export type TalkingCardSlot = "combined" | "start" | "end";

export type TalkingCardData = {
  sceneId: string;
  scene_number: number;
  audio_mode: AudioMode;
  slot: TalkingCardSlot;
  dialogue?: string;
  dialogue_speaker?: string;
  scene_voice_prompt?: string;
  voice_id?: string;
  voice_stability?: number;
  voice_similarity?: number;
  voice_style?: number;
  voice_speed?: number;
  voice_language?: string;
  scene_audio_url?: string;
  scene_audio_status?: FrameStatus;
  scene_audio_history?: string[];
  combined_video_prompt?: string;
  start_video_prompt?: string;
  end_video_prompt?: string;
  // Video generation status (for InfiniTalk shortcut)
  video_status?: VideoStatus;
  frame_image?: string;   // start or end frame image depending on slot
};

/** Map generic field name → actual scene field, prefixed for "end" slot */
function sf(slot: TalkingCardSlot, field: string): string {
  if (slot === "end") return `end_${field}`;
  return field;
};

/* ========== Talking Card Node ========== */
function TalkingCardNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as TalkingCardData;
  const updateSceneAudio = useStore((s) => s.updateSceneAudioMode);
  const generateSceneVoiceover = useStore((s) => s.generateSceneVoiceover);
  const generateVideo = useStore((s) => s.generateVideo);
  const [expanded, setExpanded] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiComment, setAiComment] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const isTalkingHead = d.audio_mode === "talking-head";
  const isAudioNative = d.audio_mode === "audio-native";
  const isEnhancing = d.scene_audio_status === "generating";

  const accentColor = isTalkingHead ? "red" : "orange";
  const borderClass = isTalkingHead ? "border-red-200/80" : "border-orange-200/80";
  const headerBg = isTalkingHead ? "bg-red-50" : "bg-orange-50";
  const iconColor = isTalkingHead ? "text-red-500" : "text-orange-500";
  const labelColor = isTalkingHead ? "text-red-700" : "text-orange-700";
  const handleColor = isTalkingHead ? "#ef4444" : "#f97316";

  const toggleAudioPlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setAudioPlaying(!audioPlaying);
  }, [audioPlaying]);

  const slot = d.slot || "combined";

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      useStore.setState((state) => ({
        scenes: state.scenes.map((s) =>
          s.id === d.sceneId ? { ...s, [sf(slot, "scene_audio_url")]: url, [sf(slot, "scene_audio_status")]: "done" as FrameStatus } : s
        ),
      }));
    };
    reader.readAsDataURL(file);
    if (audioFileRef.current) audioFileRef.current.value = "";
  }, [d.sceneId, slot]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAssistant = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      await updateSceneAudio(d.sceneId, aiComment);
      setAiComment("");
      setAiOpen(false);
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiLoading(false);
    }
  }, [d.sceneId, updateSceneAudio, aiComment]);

  const handleInsertToVideoPrompt = useCallback(() => {
    if (!d.dialogue) return;
    const state = useStore.getState();
    const scene = state.scenes.find((s) => s.id === d.sceneId);
    if (!scene) return;

    // Weave dialogue into the combined video prompt
    const currentPrompt = scene.combined_video_prompt || "";
    const dialogueLine = d.dialogue_speaker
      ? `${d.dialogue_speaker} says: "${d.dialogue}"`
      : `Character says: "${d.dialogue}"`;
    const voiceNote = d.scene_voice_prompt ? ` Voice style: ${d.scene_voice_prompt}.` : "";
    const insertion = `[Audio-native dialogue: ${dialogueLine}.${voiceNote}]`;

    // If prompt already has the insertion marker, replace it; otherwise append
    const marker = "[Audio-native dialogue:";
    let updatedPrompt: string;
    if (currentPrompt.includes(marker)) {
      const start = currentPrompt.indexOf(marker);
      const end = currentPrompt.indexOf("]", start);
      updatedPrompt = currentPrompt.slice(0, start) + insertion + currentPrompt.slice(end + 1);
    } else {
      updatedPrompt = currentPrompt ? `${currentPrompt}\n\n${insertion}` : insertion;
    }

    useStore.setState((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === d.sceneId ? { ...s, combined_video_prompt: updatedPrompt } : s
      ),
    }));
  }, [d.sceneId, d.dialogue, d.dialogue_speaker, d.scene_voice_prompt]);

  const updateField = useCallback((field: string, value: string | number) => {
    useStore.setState((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === d.sceneId ? { ...s, [field]: value } : s
      ),
    }));
  }, [d.sceneId]);

  const audioHistory = (d.scene_audio_history || []).filter(isValidSrc);
  // All audio items: current + history (for history strip)
  const allAudioItems = [
    ...(d.scene_audio_url && isValidSrc(d.scene_audio_url) ? [d.scene_audio_url] : []),
    ...audioHistory,
  ];

  const selectFromHistory = useCallback((url: string) => {
    // Swap current with selected: push current to history, set selected as current
    useStore.setState((state) => ({
      scenes: state.scenes.map((s) => {
        if (s.id !== d.sceneId) return s;
        const histField = sf(slot, "scene_audio_history");
        const urlField = sf(slot, "scene_audio_url");
        const r = s as unknown as Record<string, unknown>;
        const currentUrl = r[urlField] as string | undefined;
        const oldHistory = (r[histField] as string[] | undefined) || [];
        // Build new history: remove selected URL, add current URL if it exists
        let newHistory = oldHistory.filter((u: string) => u !== url);
        if (currentUrl && isValidSrc(currentUrl) && currentUrl !== url) {
          newHistory = [currentUrl, ...newHistory];
        }
        return { ...s, [urlField]: url, [histField]: newHistory };
      }),
    }));
  }, [d.sceneId, slot]);

  const Icon = isTalkingHead ? Mic : Volume2;

  return (
    <div className="relative" style={{ width: 260 }}>
      {/* Source handle — video wire (connects to scene node video-target) */}
      {isTalkingHead && (
        <Handle
          type="source"
          position={Position.Right}
          id="video-source"
          style={{ background: "#ef4444", width: 10, height: 10, border: "2px solid #FFFFFF", top: 20 }}
        />
      )}

      {/* Hidden file input */}
      <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />

      <div
        className={cn(
          "bg-white rounded-xl border-2 shadow-lg transition-all overflow-hidden",
          selected ? `border-${accentColor}-400/60 shadow-md` : borderClass
        )}
      >
        {/* Header */}
        <div
          className={cn("flex items-center gap-2 px-3 py-2 cursor-pointer select-none", headerBg)}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon className={cn("w-4 h-4", iconColor)} />
          <span className={cn("text-xs font-semibold flex-1 truncate", labelColor)}>
            {isTalkingHead
              ? d.slot === "end" ? "Talking Card (End)" : d.slot === "start" ? "Talking Card (Start)" : "Talking Card"
              : "Audio Native"}
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/60 text-neutral-500 font-medium">
            S{d.scene_number}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setAiOpen(!aiOpen); }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              aiLoading || isEnhancing
                ? "bg-amber-100/80 text-amber-500 animate-pulse"
                : aiOpen
                  ? isTalkingHead ? "bg-red-100 text-red-500" : "bg-orange-100 text-orange-500"
                  : "text-neutral-400 hover:bg-white/60 hover:text-neutral-600"
            )}
            title="AI Assistant"
          >
            {aiLoading || isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
          </button>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </div>

        {expanded && (
          <div className="px-3 py-2.5 flex flex-col gap-2 nodrag">
            {/* ── TALKING HEAD: voice_id + script + audio player ── */}
            {isTalkingHead && (
              <>
                {/* Voice selector */}
                <div>
                  <span className="text-[9px] font-medium text-neutral-500 mb-0.5 block">Voice</span>
                  <VoicePicker
                    selected={d.voice_id || "Sarah"}
                    onSelect={(name) => updateField(sf(slot, "voice_id"), name)}
                    accentColor="red"
                  />
                </div>

                {/* Voice settings */}
                <VoiceSettings
                  stability={d.voice_stability ?? 0.5}
                  similarity={d.voice_similarity ?? 0.75}
                  style={d.voice_style ?? 0}
                  speed={d.voice_speed ?? 1}
                  language={d.voice_language || ""}
                  onChange={(key, val) => {
                    const fieldMap: Record<string, string> = {
                      stability: "voice_stability",
                      similarity: "voice_similarity",
                      style: "voice_style",
                      speed: "voice_speed",
                      language: "voice_language",
                    };
                    updateField(sf(slot, fieldMap[key] || key), val);
                  }}
                  accentColor="red"
                />

                {/* Script (dialogue) */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-medium text-neutral-500">Script</span>
                    {d.dialogue_speaker && (
                      <span className="text-[8px] italic text-neutral-400">— {d.dialogue_speaker}</span>
                    )}
                  </div>
                  <textarea
                    className="nowheel w-full text-[10px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-foreground outline-none focus:border-red-300 resize-y min-h-[40px] max-h-24 placeholder:text-neutral-300"
                    value={d.dialogue || ""}
                    onChange={(e) => updateField(sf(slot, "dialogue"), e.target.value)}
                    placeholder="What the character says in this scene…"
                    rows={2}
                  />
                </div>

                {/* Speaker */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-500 font-medium shrink-0">Speaker:</span>
                  <input
                    className="nowheel flex-1 text-[10px] bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-foreground outline-none focus:border-red-300 placeholder:text-neutral-300"
                    value={d.dialogue_speaker || ""}
                    onChange={(e) => updateField(sf(slot, "dialogue_speaker"), e.target.value)}
                    placeholder="Cast member or narrator"
                  />
                </div>

                {/* Generating indicator */}
                {d.scene_audio_status === "generating" && (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-red-50/50 border border-red-200/30">
                    <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                    <span className="text-[9px] text-red-500 font-medium">Generating voiceover…</span>
                  </div>
                )}

                {/* Audio preview */}
                {d.scene_audio_url && isValidSrc(d.scene_audio_url) ? (
                  <div className="flex items-center gap-2 bg-neutral-50 rounded-lg border border-neutral-200 px-2.5 py-1.5">
                    <button onClick={toggleAudioPlay} className="shrink-0 p-1.5 rounded-md bg-red-50 hover:bg-red-100 transition-colors">
                      {audioPlaying ? <Pause className="w-3.5 h-3.5 text-red-500" /> : <Play className="w-3.5 h-3.5 text-red-500" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-neutral-500 truncate block">Generated voice</span>
                      <audio ref={audioRef} src={d.scene_audio_url} onEnded={() => setAudioPlaying(false)} className="w-full h-6 mt-0.5" controls controlsList={useStore.getState().isPro() ? undefined : "nodownload"} onContextMenu={useStore.getState().isPro() ? undefined : (e) => e.preventDefault()} style={{ height: 24 }} />
                    </div>
                    <button
                      onClick={() => {
                        useStore.setState((state) => ({
                          scenes: state.scenes.map((s) =>
                            s.id === d.sceneId ? { ...s, [sf(slot, "scene_audio_url")]: undefined, [sf(slot, "scene_audio_status")]: "idle" as FrameStatus } : s
                          ),
                        }));
                      }}
                      className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                      title="Remove audio"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : d.scene_audio_status !== "generating" ? (
                  <div className="flex items-center justify-center py-3 rounded-lg bg-neutral-50 border border-neutral-200/50">
                    <div className="flex flex-col items-center gap-1">
                      <Mic className="w-4 h-4 text-neutral-300" />
                      <span className="text-[9px] text-neutral-400">No audio yet</span>
                    </div>
                  </div>
                ) : null}

                {/* Audio history strip */}
                {historyOpen && allAudioItems.length > 0 && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
                    <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto nowheel p-1.5">
                      {allAudioItems.map((url, i) => {
                        const isCurrent = url === d.scene_audio_url;
                        return (
                          <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); if (!isCurrent) selectFromHistory(url); }}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md text-[9px] transition-all text-left",
                              isCurrent
                                ? "bg-red-50 text-red-600 font-medium border border-red-200/50"
                                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 border border-transparent"
                            )}
                          >
                            <Volume2 className={cn("w-3 h-3 shrink-0", isCurrent ? "text-red-500" : "text-neutral-400")} />
                            <span className="flex-1 truncate">Voice {i + 1}</span>
                            {isCurrent && <Check className="w-3 h-3 shrink-0 text-red-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  <ProFeatureGate feature="Voiceover generation" inline>
                    <button
                      onClick={() => generateSceneVoiceover(d.sceneId, slot)}
                      disabled={d.scene_audio_status === "generating" || !d.dialogue?.trim()}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                        d.scene_audio_status === "generating"
                          ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      )}
                    >
                      {d.scene_audio_status === "generating" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Generate
                    </button>
                  </ProFeatureGate>
                  <button
                    onClick={() => audioFileRef.current?.click()}
                    disabled={d.scene_audio_status === "generating"}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </button>
                  {allAudioItems.length >= 2 && (
                    <button
                      onClick={() => setHistoryOpen(!historyOpen)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all ml-auto",
                        historyOpen
                          ? "bg-red-100 text-red-600"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
                      )}
                    >
                      <History className="w-3 h-3" />
                      <span>{allAudioItems.length}</span>
                    </button>
                  )}
                </div>

                {/* Generate Talking Head Video (InfiniTalk) */}
                {d.scene_audio_url && isValidSrc(d.scene_audio_url) && (
                  <div className="border-t border-red-100 pt-2 mt-0.5">
                    <ProFeatureGate feature="Video generation" inline>
                      <button
                        onClick={() => {
                          const videoSlot = slot === "end" ? "end" : slot === "start" ? "start" : "combined";
                          useStore.getState().setVideoModel(d.sceneId, videoSlot, "infinitalk/from-audio");
                          generateVideo(d.sceneId, videoSlot);
                        }}
                        disabled={d.video_status === "generating" || !d.frame_image || !isValidSrc(d.frame_image)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all w-full justify-center",
                          d.video_status === "generating"
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            : d.frame_image && isValidSrc(d.frame_image)
                              ? "bg-[#122d31] text-white hover:bg-[#1a3f44]"
                              : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                        )}
                        title={!d.frame_image || !isValidSrc(d.frame_image) ? "Generate frame image first" : d.video_status === "generating" ? "Video generating…" : "Generate talking head video via InfiniTalk"}
                      >
                        {d.video_status === "generating" ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Generating Video…</>
                        ) : (
                          <><Video className="w-3 h-3" /> Generate Video (InfiniTalk)</>
                        )}
                      </button>
                    </ProFeatureGate>
                    {!d.frame_image && (
                      <p className="text-[8px] text-neutral-400 mt-1 text-center">Generate frame image first</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── AUDIO NATIVE: prompt + insert ── */}
            {isAudioNative && (
              <>
                {/* Dialogue / spoken text */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-medium text-neutral-500">Dialogue</span>
                    {d.dialogue_speaker && (
                      <span className="text-[8px] italic text-neutral-400">— {d.dialogue_speaker}</span>
                    )}
                  </div>
                  <textarea
                    className="nowheel w-full text-[10px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-foreground outline-none focus:border-orange-300 resize-y min-h-[40px] max-h-24 placeholder:text-neutral-300"
                    value={d.dialogue || ""}
                    onChange={(e) => updateField(sf(slot, "dialogue"), e.target.value)}
                    placeholder="Spoken dialogue for the video prompt…"
                    rows={2}
                  />
                </div>

                {/* Speaker */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-neutral-500 font-medium shrink-0">Speaker:</span>
                  <input
                    className="nowheel flex-1 text-[10px] bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-foreground outline-none focus:border-orange-300 placeholder:text-neutral-300"
                    value={d.dialogue_speaker || ""}
                    onChange={(e) => updateField(sf(slot, "dialogue_speaker"), e.target.value)}
                    placeholder="Cast member or narrator"
                  />
                </div>

                {/* Voice style */}
                <div>
                  <span className="text-[9px] font-medium text-neutral-500 mb-0.5 block">Voice Style</span>
                  <input
                    className="nowheel w-full text-[10px] bg-neutral-50 border border-neutral-200 rounded-md px-2.5 py-1.5 text-foreground outline-none focus:border-orange-300 placeholder:text-neutral-300"
                    value={d.scene_voice_prompt || ""}
                    onChange={(e) => updateField(sf(slot, "scene_voice_prompt"), e.target.value)}
                    placeholder="e.g. warm conversational tone…"
                  />
                </div>

                {/* Insert button */}
                <button
                  onClick={handleInsertToVideoPrompt}
                  disabled={!d.dialogue}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all w-full justify-center",
                    d.dialogue
                      ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  )}
                  title="Insert dialogue into the connected video prompt"
                >
                  <ArrowRightToLine className="w-3 h-3" />
                  Insert to Video Prompt
                </button>
              </>
            )}

            {/* ── Assistant panel (toggles via Bot icon in header) ── */}
            {aiOpen && (
              <div className={cn("border-t pt-2 mt-0.5", isTalkingHead ? "border-red-100" : "border-orange-100")}>
                {aiLoading || isEnhancing ? (
                  <div className="flex items-center gap-2 px-1 py-2">
                    <Loader2 className={cn("w-3.5 h-3.5 animate-spin", iconColor)} />
                    <span className="text-[10px] text-neutral-500">AI writing script…</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {aiError && (
                      <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-[9px] text-red-600 break-all">{aiError}</span>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <textarea
                        className="nowheel flex-1 text-[10px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2 text-foreground outline-none focus:border-neutral-300 resize-none placeholder:text-neutral-300"
                        value={aiComment}
                        onChange={(e) => setAiComment(e.target.value)}
                        placeholder={isTalkingHead ? "e.g. make it more conversational…" : "e.g. add excitement to the dialogue…"}
                        rows={2}
                      />
                      <button
                        onClick={handleAssistant}
                        className={cn(
                          "p-2 rounded-lg transition-all self-end shrink-0",
                          isTalkingHead
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                        )}
                        title="Send to AI"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TalkingCardNodeComponent);
