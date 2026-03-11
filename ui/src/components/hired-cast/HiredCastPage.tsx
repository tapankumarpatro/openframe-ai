"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, Upload, X, User, Image as ImageIcon,
  Pencil, Check, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useHiredCastStore } from "@/lib/hiredCastStore";
import { compressImageFile } from "@/lib/imageUtils";
import type { HiredCast } from "@/types/schema";

const DRIVER_TYPES = ["human", "animal", "object", "abstract", "vehicle"];

/* ---------- Single Cast Card (Edit Mode) ---------- */
function CastEditor({ cast, onClose }: { cast: HiredCast; onClose: () => void }) {
  const update = useHiredCastStore((s) => s.updateHiredCast);
  const addImage = useHiredCastStore((s) => s.addImageToHiredCast);
  const removeImage = useHiredCastStore((s) => s.removeImageFromHiredCast);
  const remove = useHiredCastStore((s) => s.removeHiredCast);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < Math.min(files.length, 20 - cast.images.length); i++) {
      try {
        const dataUrl = await compressImageFile(files[i]);
        addImage(cast.id, dataUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") addImage(cast.id, reader.result);
        };
        reader.readAsDataURL(files[i]);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }, [cast.id, cast.images.length, addImage]);

  const handleDelete = () => {
    if (confirm(`Delete "${cast.name}"? This cannot be undone.`)) {
      remove(cast.id);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <User className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={cast.name}
              onChange={(e) => update(cast.id, { name: e.target.value })}
              className="text-[16px] font-bold text-neutral-800 bg-transparent border-none outline-none w-full placeholder:text-neutral-300"
              placeholder="Cast member name..."
            />
            <p className="text-[11px] text-neutral-400">
              Created {new Date(cast.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete cast member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Basic Info Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Type</label>
              <select
                value={cast.driver_type}
                onChange={(e) => update(cast.id, { driver_type: e.target.value })}
                className="w-full px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300"
              >
                {DRIVER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Gender</label>
              <input
                value={cast.gender || ""}
                onChange={(e) => update(cast.id, { gender: e.target.value })}
                placeholder="e.g. Male, Female, Non-binary"
                className="w-full px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-neutral-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Age Range</label>
              <input
                value={cast.age_range || ""}
                onChange={(e) => update(cast.id, { age_range: e.target.value })}
                placeholder="e.g. 25-30"
                className="w-full px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-neutral-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Ethnicity</label>
              <input
                value={cast.ethnicity || ""}
                onChange={(e) => update(cast.id, { ethnicity: e.target.value })}
                placeholder="e.g. South Asian, East Asian, Caucasian"
                className="w-full px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-neutral-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Physical Details</label>
              <input
                value={cast.physical_details || ""}
                onChange={(e) => update(cast.id, { physical_details: e.target.value })}
                placeholder="e.g. 5'10, athletic build, dark hair"
                className="w-full px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-neutral-300"
              />
            </div>
          </div>

          {/* Visual Description */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Visual Description / Prompt</label>
            <textarea
              value={cast.description}
              onChange={(e) => update(cast.id, { description: e.target.value })}
              placeholder="Detailed visual description for AI image generation... e.g. 'tall 28-year-old South Asian man with warm brown skin, trimmed beard, sharp jawline, dark expressive eyes, athletic build'"
              className="w-full min-h-[80px] px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none placeholder:text-neutral-300 leading-relaxed"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Notes</label>
            <textarea
              value={cast.notes || ""}
              onChange={(e) => update(cast.id, { notes: e.target.value })}
              placeholder="Internal notes about this cast member (not used in prompts)..."
              className="w-full min-h-[50px] px-3 py-2 text-[12px] bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none placeholder:text-neutral-300"
              rows={2}
            />
          </div>

          {/* Reference Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Reference Images ({cast.images.length}/20)
              </label>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={cast.images.length >= 20}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-30"
              >
                <Upload className="w-3 h-3" /> Add Images
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>

            {cast.images.length === 0 ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-neutral-200 rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all"
              >
                <ImageIcon className="w-8 h-8 text-neutral-300 mb-2" />
                <span className="text-[11px] text-neutral-400">Click to upload reference images</span>
                <span className="text-[9px] text-neutral-300 mt-0.5">Up to 20 images</span>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {cast.images.map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-neutral-200 aspect-square">
                    <img src={img} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(cast.id, i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[8px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {i + 1}
                    </div>
                  </div>
                ))}
                {cast.images.length < 20 && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-neutral-200 rounded-lg aspect-square flex items-center justify-center cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all"
                  >
                    <Plus className="w-5 h-5 text-neutral-300" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-[10px] text-neutral-400">
            Last updated: {new Date(cast.updated_at).toLocaleString()}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-all hover:shadow-md active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
          >
            <Check className="w-3.5 h-3.5" /> Done
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Cast Card (Grid View) ---------- */
function CastCard({ cast, onClick }: { cast: HiredCast; onClick: () => void }) {
  const primaryImage = cast.images[0];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group bg-white rounded-xl border border-neutral-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-amber-300/50 transition-all"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-neutral-100">
        {primaryImage ? (
          <img src={primaryImage} alt={cast.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
            <User className="w-10 h-10 mb-1" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
        {/* Image count badge */}
        {cast.images.length > 1 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium">
            <ImageIcon className="w-2.5 h-2.5" />
            {cast.images.length}
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-bold uppercase tracking-wider">
          {cast.driver_type}
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <h3 className="text-[13px] font-bold text-neutral-800 leading-tight truncate">{cast.name}</h3>
        {cast.description && (
          <p className="text-[10px] text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">{cast.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-[9px] text-neutral-400">
          {cast.gender && <span className="px-1.5 py-0.5 rounded bg-neutral-100">{cast.gender}</span>}
          {cast.age_range && <span className="px-1.5 py-0.5 rounded bg-neutral-100">{cast.age_range}</span>}
          {cast.ethnicity && <span className="px-1.5 py-0.5 rounded bg-neutral-100 truncate max-w-[80px]">{cast.ethnicity}</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Main Hired Cast Page ---------- */
export default function HiredCastPage() {
  const setView = useStore((s) => s.setView);
  const hiredCast = useHiredCastStore((s) => s.hiredCast);
  const addHiredCast = useHiredCastStore((s) => s.addHiredCast);
  const [editingCast, setEditingCast] = useState<string | null>(null);

  const editingItem = editingCast ? hiredCast.find((c) => c.id === editingCast) : null;

  const handleAddNew = () => {
    const newCast = addHiredCast();
    setEditingCast(newCast.id);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#fafbfc] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-neutral-200/60 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView("projects")}
              className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h1 className="text-[20px] font-bold text-neutral-800 tracking-tight">Hired Cast</h1>
              </div>
              <p className="text-[12px] text-neutral-400 mt-0.5">
                Manage your signed models and cast members. Use them in any workflow.
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold text-[13px] shadow-lg hover:shadow-xl active:scale-[0.97] transition-all"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
          >
            <Plus className="w-4 h-4" />
            Add Cast Member
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-6">
          {hiredCast.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-neutral-700 mb-1">No cast members yet</h3>
              <p className="text-[13px] text-neutral-400 mb-6 max-w-sm mx-auto">
                Add your signed models and frequently used cast members here. They'll be available in all your workflows.
              </p>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold text-[13px] active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
              >
                <Plus className="w-4 h-4" />
                Add Your First Cast Member
              </button>
            </div>
          ) : (
            /* Grid of cast cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {hiredCast.map((cast) => (
                <CastCard
                  key={cast.id}
                  cast={cast}
                  onClick={() => setEditingCast(cast.id)}
                />
              ))}
              {/* Add new card */}
              <motion.div
                whileHover={{ y: -2 }}
                onClick={handleAddNew}
                className="bg-white rounded-xl border-2 border-dashed border-neutral-200 overflow-hidden cursor-pointer hover:border-amber-300 hover:bg-amber-50/20 transition-all flex flex-col items-center justify-center aspect-[4/3]"
              >
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
                  <Plus className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-[11px] font-medium text-neutral-500">Add Cast Member</span>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editingItem && (
          <CastEditor
            key={editingItem.id}
            cast={editingItem}
            onClose={() => setEditingCast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
