"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Info, Key, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import AgentModelSettingsTab from "./AgentModelSettings";
import ApiKeysSettingsTab from "./ApiKeysSettings";
import LicenseSettingsTab from "./LicenseSettings";

const SETTINGS_TABS = [
  { id: "api_keys", label: "API Keys", icon: Key },
  { id: "agent_models", label: "Agent Models", icon: Cpu },
  { id: "license", label: "License", icon: Shield },
  { id: "about", label: "About", icon: Info },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: string;
}

export default function SettingsModal({ open, onClose, initialTab }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab || "api_keys");

  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-4xl mx-4 h-[75vh] flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-[16px] font-semibold text-foreground">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-card-hover transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar tabs */}
            <div className="w-48 shrink-0 border-r border-border bg-card-hover/30 py-3 px-2.5">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all mb-1",
                      isActive
                        ? "bg-accent-primary/10 text-accent-primary shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-card"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 p-6 flex flex-col">
              {activeTab === "api_keys" && <ApiKeysSettingsTab />}
              {activeTab === "agent_models" && <AgentModelSettingsTab />}
              {activeTab === "license" && <LicenseSettingsTab />}
              {activeTab === "about" && (
                <div className="text-[14px] text-muted">
                  <h3 className="text-foreground font-semibold mb-3 text-[16px]">OpenFrame AI</h3>
                  <p className="text-[13px] leading-relaxed mb-4">
                    The Open Source Ad Engine — powered by 7 specialised AI agents.
                    Each agent can be configured with its own LLM model and temperature
                    to fine-tune creative output.
                  </p>
                  <div className="border-t border-border pt-4 mt-auto">
                    <p className="text-[12px] text-muted">
                      Version 1.0 &middot; Built with LangGraph + Next.js
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
