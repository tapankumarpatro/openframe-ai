"use client";

import { useState, useEffect } from "react";
import {
  Shield, CheckCircle, AlertCircle, Copy, Loader2,
  Eye, EyeOff, Save, Sparkles, Building2, Mail,
  Crown, Lock, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  saveLicenseKey, generateLicenseKey,
  type GeneratedKey,
} from "@/lib/api";

const PLAN_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  community:  { label: "Community",  color: "text-neutral-500", bg: "bg-neutral-100",    border: "border-neutral-200" },
  pro:        { label: "Pro",        color: "text-[#508ab7]",   bg: "bg-[#508ab7]/10",   border: "border-[#508ab7]/20" },
  enterprise: { label: "Enterprise", color: "text-amber-600",   bg: "bg-amber-50",       border: "border-amber-200" },
};

function maskKey(key: string): string {
  if (!key || key.length <= 8) return key;
  return key.slice(0, 8) + "\u2022".repeat(Math.min(key.length - 8, 16));
}

export default function LicenseSettingsTab() {
  const licenseStatus = useStore((s) => s.licenseStatus);
  const fetchLicense = useStore((s) => s.fetchLicenseStatus);
  const isPro = useStore((s) => s.isPro);
  const getUserLicenseKey = useStore((s) => s.getUserLicenseKey);
  const setUserLicenseKey = useStore((s) => s.setUserLicenseKey);

  // Enter key section
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"idle" | "success" | "error">("idle");

  // Generate key section
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [genError, setGenError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!licenseStatus) fetchLicense();
  }, [licenseStatus, fetchLicense]);

  // Pre-fill key input from per-user localStorage
  useEffect(() => {
    const stored = getUserLicenseKey();
    if (stored && !keyInput) setKeyInput(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setSaveResult("idle");
    try {
      setUserLicenseKey(keyInput.trim());
      await saveLicenseKey(keyInput.trim());
      await fetchLicense();
      setSaveResult("success");
      setTimeout(() => setSaveResult("idle"), 3000);
    } catch {
      setSaveResult("error");
      setTimeout(() => setSaveResult("idle"), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!email.trim()) return;
    setGenerating(true);
    setGenError("");
    setGeneratedKey(null);
    try {
      const result = await generateLicenseKey(email.trim(), company.trim());
      setGeneratedKey(result);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Key generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivateGeneratedKey = async () => {
    if (!generatedKey?.key) return;
    setKeyInput(generatedKey.key);
    setSaving(true);
    setSaveResult("idle");
    try {
      setUserLicenseKey(generatedKey.key);
      await saveLicenseKey(generatedKey.key);
      await fetchLicense();
      setSaveResult("success");
      setTimeout(() => setSaveResult("idle"), 3000);
    } catch {
      setSaveResult("error");
      setTimeout(() => setSaveResult("idle"), 4000);
    } finally {
      setSaving(false);
    }
  };

  const plan = PLAN_STYLES[licenseStatus?.plan || "community"] || PLAN_STYLES.community;
  const isActivated = isPro();

  return (
    <div className="flex flex-col h-full">
      {/* Header with plan badge */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent-primary" />
          <h3 className="text-[15px] font-semibold text-foreground">License</h3>
        </div>
        <span className={cn(
          "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border",
          plan.bg, plan.color, plan.border,
        )}>
          {isActivated && <Crown className="w-3 h-3 inline mr-1 -mt-px" />}
          {plan.label}
        </span>
      </div>
      <p className="text-[12px] text-muted mb-5 leading-relaxed">
        {isActivated
          ? "Your Pro license is active. All features are unlocked."
          : "Community edition is free for developers. Activate a Pro key to unlock all features."}
      </p>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">

        {/* ── Plan Status Banner ── */}
        {isActivated ? (
          <div className="p-4 bg-[#508ab7]/5 rounded-xl border border-[#508ab7]/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-[13px] font-semibold text-foreground">Pro License Active</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {licenseStatus?.message} &middot; Instance: <span className="font-mono text-[10px]">{licenseStatus?.instance_id}</span>
            </p>
          </div>
        ) : (
          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="text-[13px] font-semibold text-foreground">Unlock Pro Features</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Video generation, audio/voiceover, and advanced ad types require a Pro license.
              Generate a free key below to get started instantly.
            </p>
          </div>
        )}

        {/* ── Generate Key (TOP — prominent) ── */}
        {!isActivated && (
          <div className="p-4 bg-card rounded-xl border-2 border-[#508ab7]/30 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#508ab7]" />
              <span className="text-[13px] font-semibold text-foreground">Get Your Pro Key</span>
              <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Instant
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-muted font-medium mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-accent-primary/50 placeholder:text-muted/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted font-medium mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name (optional)"
                  className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-accent-primary/50 placeholder:text-muted/50"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !email.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all w-full justify-center",
                generating || !email.trim()
                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  : "bg-[#122d31] text-white hover:bg-[#1a3f44] active:scale-[0.97] shadow-sm"
              )}
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {generating ? "Generating..." : "Generate Pro License Key"}
            </button>

            {genError && (
              <div className="flex items-center gap-1 mt-2 text-[11px] text-red-500">
                <AlertCircle className="w-3 h-3" /> {genError}
              </div>
            )}

            {generatedKey && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-emerald-700">Your License Key</span>
                  <button
                    onClick={() => handleCopyKey(generatedKey.key)}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="font-mono text-[14px] font-bold text-emerald-800 mb-2 select-all break-all">
                  {generatedKey.key}
                </div>
                <button
                  onClick={handleActivateGeneratedKey}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition-all w-full justify-center"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  {saving ? "Activating..." : "Activate This Key Now"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Enter Existing Key ── */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#508ab7]" />
            <span className="text-[13px] font-semibold text-foreground">
              {isActivated ? "Change License Key" : "Have a Key Already?"}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={showKey ? keyInput : (keyInput ? maskKey(keyInput) : "")}
                onChange={(e) => setKeyInput(e.target.value)}
                onFocus={() => setShowKey(true)}
                onBlur={() => setShowKey(false)}
                placeholder="OF-XXXX-XXXX-XXXX-XXXX"
                className="w-full text-[12px] bg-card border border-border rounded-lg px-3 py-2 pr-9 text-foreground outline-none focus:border-accent-primary/50 font-mono placeholder:text-muted/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={handleSaveKey}
              disabled={saving || !keyInput.trim()}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all shrink-0",
                saving || !keyInput.trim()
                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                  : "bg-[#122d31] text-white hover:bg-[#1a3f44] active:scale-[0.97]"
              )}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {saveResult === "success" && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-emerald-500">
              <CheckCircle className="w-3 h-3" /> Key saved & validated
            </div>
          )}
          {saveResult === "error" && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-red-500">
              <AlertCircle className="w-3 h-3" /> Failed to save key
            </div>
          )}
        </div>

        {/* ── Plan Comparison ── */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <span className="text-[13px] font-semibold text-foreground block mb-3">Plans</span>
          <div className="grid grid-cols-3 gap-3">
            {/* Community */}
            <div className={cn(
              "p-3 rounded-lg border text-center",
              licenseStatus?.plan === "community" ? "border-neutral-300 bg-neutral-50" : "border-border"
            )}>
              <div className="text-[11px] font-bold text-neutral-500 mb-1">Community</div>
              <div className="text-[9px] text-muted mb-2">Free forever</div>
              <ul className="text-[9px] text-muted space-y-1 text-left">
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> AI Agents</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Image Gen</li>
                <li className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-neutral-300 shrink-0" /> Video Gen</li>
                <li className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-neutral-300 shrink-0" /> Audio / VO</li>
              </ul>
            </div>
            {/* Pro */}
            <div className={cn(
              "p-3 rounded-lg border text-center",
              licenseStatus?.plan === "pro" ? "border-[#508ab7] bg-[#508ab7]/5" : "border-border"
            )}>
              <div className="text-[11px] font-bold text-[#508ab7] mb-1">Pro</div>
              <div className="text-[9px] text-muted mb-2">Free key</div>
              <ul className="text-[9px] text-muted space-y-1 text-left">
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> AI Agents</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Image Gen</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Video Gen</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Audio / VO</li>
              </ul>
            </div>
            {/* Enterprise */}
            <div className={cn(
              "p-3 rounded-lg border text-center",
              licenseStatus?.plan === "enterprise" ? "border-amber-300 bg-amber-50" : "border-border"
            )}>
              <div className="text-[11px] font-bold text-amber-600 mb-1">Enterprise</div>
              <div className="text-[9px] text-muted mb-2">Custom</div>
              <ul className="text-[9px] text-muted space-y-1 text-left">
                <li className="flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" /> Everything in Pro</li>
                <li className="flex items-center gap-1"><Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Team Licenses</li>
                <li className="flex items-center gap-1"><Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Priority Support</li>
                <li className="flex items-center gap-1"><Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Custom Models</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Enterprise Contact ── */}
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] font-semibold text-foreground">Enterprise</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed mb-3">
            Need team licenses, SSO, custom model integration, SLA, or priority support?
            Get in touch for a tailored Enterprise plan.
          </p>
          <a
            href="https://forms.gle/H4xahTXxej1sfQYs9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Contact Sales
          </a>
        </div>

        {/* Instance info */}
        {licenseStatus?.instance_id && (
          <div className="text-[10px] text-muted font-mono px-1 pb-1">
            Instance: {licenseStatus.instance_id}
          </div>
        )}
      </div>
    </div>
  );
}
