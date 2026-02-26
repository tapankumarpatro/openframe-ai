/**
 * Download utilities for exporting workflow data, images, videos, and text.
 *
 * 5 download modes:
 * 1. Download All — zip with workflow JSON + images + videos + prompts + audio
 * 2. Download Text — markdown of all prompts/agent outputs
 * 3. Download Images — zip of active scene/asset images
 * 4. Download Assets — zip of videos + music + voiceover audio
 * 5. Download Workflow — workflow JSON only
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { KeyItem, Scene } from "@/types/schema";

// ── Helpers ──────────────────────────────────────────

function safeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_\-. ]/g, "_").replace(/\s+/g, "_");
}

async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.blob();
  } catch {
    return null;
  }
}

function extFromUrl(url: string, fallback = "png"): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext && ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mp3", "wav", "ogg"].includes(ext)) return ext;
  } catch { /* ignore */ }
  return fallback;
}

interface DownloadContext {
  workflowId: string | null;
  userInput: string;
  keyItems: KeyItem[];
  scenes: Scene[];
  agentOutputs: Record<string, Record<string, unknown>>;
  productImage: string | null;
}

// ── 1. Download All ──────────────────────────────────

export async function downloadAll(ctx: DownloadContext) {
  const zip = new JSZip();
  const name = ctx.workflowId || "workflow";

  // Workflow JSON
  zip.file("workflow.json", JSON.stringify({
    workflow_id: ctx.workflowId,
    user_input: ctx.userInput,
    agent_outputs: ctx.agentOutputs,
    key_items: ctx.keyItems.map((k) => ({ ...k, image_url: k.image_url?.startsWith("data:") ? "(base64-omitted)" : k.image_url })),
    scenes: ctx.scenes,
  }, null, 2));

  // Text prompts
  zip.file("prompts.md", buildMarkdown(ctx));

  // Images
  const imgFolder = zip.folder("images")!;
  await addImages(imgFolder, ctx);

  // Videos
  const vidFolder = zip.folder("videos")!;
  await addVideos(vidFolder, ctx);

  // Audio
  const audioFolder = zip.folder("audio")!;
  await addAudio(audioFolder, ctx);

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${safeFilename(name)}-complete.zip`);
}

// ── 2. Download Text ─────────────────────────────────

export function downloadText(ctx: DownloadContext) {
  const md = buildMarkdown(ctx);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, `${safeFilename(ctx.workflowId || "workflow")}-prompts.md`);
}

// ── 3. Download Images ───────────────────────────────

export async function downloadImages(ctx: DownloadContext) {
  const zip = new JSZip();
  await addImages(zip, ctx);
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${safeFilename(ctx.workflowId || "workflow")}-images.zip`);
}

// ── 4. Download Assets (videos + audio) ──────────────

export async function downloadAssets(ctx: DownloadContext) {
  const zip = new JSZip();
  const vidFolder = zip.folder("videos")!;
  await addVideos(vidFolder, ctx);
  const audioFolder = zip.folder("audio")!;
  await addAudio(audioFolder, ctx);
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${safeFilename(ctx.workflowId || "workflow")}-assets.zip`);
}

// ── 5. Download Workflow JSON ────────────────────────

export function downloadWorkflow(ctx: DownloadContext) {
  const json = JSON.stringify({
    workflow_id: ctx.workflowId,
    user_input: ctx.userInput,
    agent_outputs: ctx.agentOutputs,
    key_items: ctx.keyItems.map((k) => ({ ...k, image_url: k.image_url?.startsWith("data:") ? "(base64-omitted)" : k.image_url })),
    scenes: ctx.scenes,
  }, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  saveAs(blob, `${safeFilename(ctx.workflowId || "workflow")}.json`);
}

// ── Internal builders ────────────────────────────────

function buildMarkdown(ctx: DownloadContext): string {
  const lines: string[] = [];
  lines.push(`# Workflow: ${ctx.workflowId || "untitled"}`);
  lines.push("");
  lines.push(`> ${ctx.userInput}`);
  lines.push("");

  // Agent outputs
  const agentLabels: Record<string, string> = {
    creative_brief: "Creative Brief",
    visual_identity: "Visual Identity",
    product_specs: "Product Specs",
    casting_brief: "Casting Brief",
    camera_specs: "Camera Specs",
    shot_list: "Shot List",
    audio_specs: "Audio Specs",
  };

  for (const [key, label] of Object.entries(agentLabels)) {
    const data = ctx.agentOutputs[key];
    if (!data) continue;
    lines.push(`## ${label}`);
    lines.push("");
    for (const [field, val] of Object.entries(data)) {
      if (typeof val === "string") {
        lines.push(`**${field}**: ${val}`);
      } else if (Array.isArray(val)) {
        lines.push(`**${field}**: ${val.map((v) => typeof v === "string" ? v : JSON.stringify(v)).join(", ")}`);
      } else if (val && typeof val === "object") {
        lines.push(`**${field}**:`);
        lines.push("```json");
        lines.push(JSON.stringify(val, null, 2));
        lines.push("```");
      }
    }
    lines.push("");
  }

  // Key items
  lines.push("## Key Assets");
  lines.push("");
  for (const item of ctx.keyItems) {
    lines.push(`### ${item.label} (${item.type})`);
    if (item.driver_type) lines.push(`- **Driver**: ${item.driver_type}`);
    lines.push(`- **Prompt**: ${item.text_prompt}`);
    if (item.image_url && item.image_url.startsWith("http")) {
      lines.push(`- **Image**: ${item.image_url}`);
    }
    lines.push("");
  }

  // Scenes
  lines.push("## Scenes");
  lines.push("");
  for (const scene of ctx.scenes) {
    lines.push(`### Scene ${scene.scene_number} — ${scene.type} (${scene.shot_type})`);
    lines.push(`- **Visual**: ${scene.visual_description}`);
    lines.push(`- **Action**: ${scene.action_movement}`);
    lines.push(`- **Start Prompt**: ${scene.start_image_prompt}`);
    lines.push(`- **End Prompt**: ${scene.end_image_prompt}`);
    if (scene.active_cast?.length) lines.push(`- **Cast**: ${scene.active_cast.join(", ")}`);
    if (scene.active_setting) lines.push(`- **Setting**: ${scene.active_setting}`);
    if (scene.start_frame_image) lines.push(`- **Start Image**: ${scene.start_frame_image}`);
    if (scene.end_frame_image) lines.push(`- **End Image**: ${scene.end_frame_image}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function addImages(folder: JSZip, ctx: DownloadContext) {
  let idx = 0;

  // Asset images
  for (const item of ctx.keyItems) {
    if (item.image_url && item.image_url.startsWith("http")) {
      const ext = extFromUrl(item.image_url);
      const blob = await fetchAsBlob(item.image_url);
      if (blob) {
        folder.file(`asset-${safeFilename(item.label)}.${ext}`, blob);
        idx++;
      }
    }
  }

  // Scene frame images
  for (const scene of ctx.scenes) {
    for (const frame of ["start", "end"] as const) {
      const imgKey = `${frame}_frame_image` as keyof Scene;
      const url = scene[imgKey] as string | undefined;
      if (url && url.startsWith("http")) {
        const ext = extFromUrl(url);
        const blob = await fetchAsBlob(url);
        if (blob) {
          folder.file(`scene-${scene.scene_number}-${frame}.${ext}`, blob);
          idx++;
        }
      }
    }
  }

  // Product image (if HTTP)
  if (ctx.productImage && ctx.productImage.startsWith("http")) {
    const ext = extFromUrl(ctx.productImage);
    const blob = await fetchAsBlob(ctx.productImage);
    if (blob) {
      folder.file(`product.${ext}`, blob);
    }
  }
}

async function addVideos(folder: JSZip, ctx: DownloadContext) {
  for (const scene of ctx.scenes) {
    // Combined video
    if (scene.video_url && scene.video_url.startsWith("http")) {
      const ext = extFromUrl(scene.video_url, "mp4");
      const blob = await fetchAsBlob(scene.video_url);
      if (blob) folder.file(`scene-${scene.scene_number}-video.${ext}`, blob);
    }
    // Start video
    if (scene.start_video_url && scene.start_video_url.startsWith("http")) {
      const ext = extFromUrl(scene.start_video_url, "mp4");
      const blob = await fetchAsBlob(scene.start_video_url);
      if (blob) folder.file(`scene-${scene.scene_number}-start-video.${ext}`, blob);
    }
    // End video
    if (scene.end_video_url && scene.end_video_url.startsWith("http")) {
      const ext = extFromUrl(scene.end_video_url, "mp4");
      const blob = await fetchAsBlob(scene.end_video_url);
      if (blob) folder.file(`scene-${scene.scene_number}-end-video.${ext}`, blob);
    }
  }
}

async function addAudio(folder: JSZip, ctx: DownloadContext) {
  for (const item of ctx.keyItems) {
    if ((item.type === "voiceover" || item.type === "music") && item.audio_urls?.length) {
      for (let i = 0; i < item.audio_urls.length; i++) {
        const url = item.audio_urls[i];
        if (url.startsWith("http")) {
          const ext = extFromUrl(url, "mp3");
          const blob = await fetchAsBlob(url);
          if (blob) folder.file(`${safeFilename(item.label)}-${i + 1}.${ext}`, blob);
        }
      }
    }
  }
}
