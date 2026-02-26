"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, X, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";

export default function LicenseUpgradePrompt() {
  const show = useStore((s) => s.showLicenseUpgrade);
  const setShow = useStore((s) => s.setShowLicenseUpgrade);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  // On projects view, the ProjectsPage handles it by opening SettingsModal
  // This component only renders the floating prompt on the canvas view
  useEffect(() => {
    if (show && (view === "projects" || view === "create")) {
      // ProjectsPage handles this — don't show the floating prompt
    }
  }, [show, view]);

  const isCanvas = view === "canvas";
  const shouldShow = show && isCanvas;

  const handleGoToSettings = () => {
    setShow(false);
    setView("projects");
    // After navigation, the flag will be re-set by a microtask
    setTimeout(() => useStore.getState().setShowLicenseUpgrade(true), 100);
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-neutral-200 shadow-2xl">
            <div className="w-8 h-8 rounded-full bg-[#122d31] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground">Pro License Required</p>
              <p className="text-[10px] text-muted">Activate your key in Settings → License</p>
            </div>
            <button
              onClick={handleGoToSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold
                bg-[#122d31] text-white hover:bg-[#1a3f44] active:scale-[0.97] transition-all ml-2"
            >
              <Sparkles className="w-3 h-3" />
              Activate
            </button>
            <button
              onClick={() => setShow(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
