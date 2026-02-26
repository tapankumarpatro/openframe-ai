"use client";

import { Lock, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";

interface ProFeatureGateProps {
  children: React.ReactNode;
  feature?: string;
  inline?: boolean;
}

export default function ProFeatureGate({ children, feature = "This feature", inline }: ProFeatureGateProps) {
  const isPro = useStore((s) => s.isPro);
  const setShowLicenseUpgrade = useStore((s) => s.setShowLicenseUpgrade);

  if (isPro()) return <>{children}</>;

  if (inline) {
    return (
      <button
        onClick={() => setShowLicenseUpgrade(true)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold
          bg-[#122d31]/90 text-white shadow-sm
          hover:bg-[#1a3f44] active:scale-[0.97] transition-all"
        title={`${feature} requires a Pro license`}
      >
        <Lock className="w-3 h-3" />
        Pro
        <Sparkles className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="relative group">
      <div className="opacity-30 pointer-events-none select-none blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <button
          onClick={() => setShowLicenseUpgrade(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold
            bg-[#122d31]/90 text-white backdrop-blur-sm shadow-lg
            hover:bg-[#1a3f44] active:scale-[0.97] transition-all"
          title={`${feature} requires a Pro license`}
        >
          <Lock className="w-3 h-3" />
          <span>Activate Pro</span>
          <Sparkles className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
