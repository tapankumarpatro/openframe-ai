"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Users, Search, Image as ImageIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHiredCastStore } from "@/lib/hiredCastStore";
import type { HiredCast } from "@/types/schema";

interface HiredCastSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cast: HiredCast) => void;
}

export default function HiredCastSelector({ open, onClose, onSelect }: HiredCastSelectorProps) {
  const hiredCast = useHiredCastStore((s) => s.hiredCast);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = search.trim()
    ? hiredCast.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        (c.driver_type || "").toLowerCase().includes(search.toLowerCase())
      )
    : hiredCast;

  const handleConfirm = () => {
    const cast = hiredCast.find((c) => c.id === selected);
    if (cast) {
      onSelect(cast);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-neutral-800">Select Cast Member</h3>
              <p className="text-[11px] text-neutral-400">Choose a hired cast member to add to this workflow</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cast members..."
                className="flex-1 text-[12px] bg-transparent outline-none text-neutral-700 placeholder:text-neutral-300"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <User className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-[12px] text-neutral-400">
                  {hiredCast.length === 0
                    ? "No hired cast members yet. Add some from the Hired Cast page."
                    : "No matches found."}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((cast) => {
                  const isSelected = selected === cast.id;
                  return (
                    <button
                      key={cast.id}
                      onClick={() => setSelected(isSelected ? null : cast.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                        isSelected
                          ? "bg-amber-50 border-2 border-amber-300 shadow-sm"
                          : "bg-white border-2 border-transparent hover:bg-neutral-50 hover:border-neutral-200"
                      )}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                        {cast.images[0] ? (
                          <img src={cast.images[0]} alt={cast.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-neutral-300" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-neutral-800 truncate">{cast.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-wider shrink-0">
                            {cast.driver_type}
                          </span>
                        </div>
                        {cast.description && (
                          <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{cast.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-neutral-400">
                          {cast.gender && <span>{cast.gender}</span>}
                          {cast.age_range && <span>· {cast.age_range}</span>}
                          {cast.images.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <ImageIcon className="w-2.5 h-2.5" /> {cast.images.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Check */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">{hiredCast.length} cast members available</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-neutral-500 hover:bg-neutral-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}
              >
                <Check className="w-3.5 h-3.5" /> Add to Workflow
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
