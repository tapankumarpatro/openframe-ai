"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ConsultTeamModal, { AGENTS, AgentAvatar } from "@/components/agents/ConsultTeamModal";
import ProjectsPage from "@/components/projects/ProjectsPage";
import ProjectStartModal from "@/components/overlay/ProjectStartModal";
import HiredCastPage from "@/components/hired-cast/HiredCastPage";
import ApiLogPanel from "@/components/logs/ApiLogPanel";
import AuthPage, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/components/auth/AuthPage";
import { authGetMe, type AuthUser } from "@/lib/api";
import { MessageCircle, ChevronDown, ArrowLeft } from "lucide-react";
import LicenseUpgradePrompt from "@/components/ui/LicenseUpgradePrompt";

const DirectorCanvas = dynamic(
  () => import("@/components/canvas/DirectorCanvas"),
  { ssr: false }
);

const VISIBLE_AVATARS = 4;

export default function Home() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const [teamOpen, setTeamOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) { setAuthChecking(false); return; }
    authGetMe(token)
      .then((user) => setAuthUser(user))
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthUser(null);
  };

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#fafbfc]">
        <div className="animate-pulse text-neutral-400 text-sm font-light">Loading...</div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        onAuthenticated={(user) => setAuthUser(user)}
      />
    );
  }

  if (view === "hired_cast") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="hired_cast"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="h-screen w-screen flex overflow-hidden bg-background relative"
        >
          <HiredCastPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (view === "projects" || view === "create") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="projects"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="h-screen w-screen flex overflow-hidden bg-background relative"
        >
          <ProjectsPage user={authUser} onLogout={handleLogout} />
          {view === "create" && <ProjectStartModal />}
        </motion.div>
      </AnimatePresence>
    );
  }

  const remainingCount = AGENTS.length - VISIBLE_AVATARS;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="workspace"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="h-screen w-screen flex flex-col overflow-hidden bg-background relative"
      >
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0">
            <DirectorCanvas />
          </div>
        </div>

        {/* Zone 3: API Log Panel (bottom bar) */}
        <ApiLogPanel />

        {/* Consult Team Modal */}
        {teamOpen && <ConsultTeamModal onClose={() => setTeamOpen(false)} />}

        {/* License upgrade prompt (floating toast on canvas) */}
        <LicenseUpgradePrompt />

        {/* Floating top-left controls — back button + Consult Team pill */}
        {!teamOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-3 left-4 z-40 flex items-center gap-2"
          >
            {/* Back to projects */}
            <button
              onClick={() => setView("projects")}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-xl border border-neutral-200/70 shadow-lg hover:shadow-xl hover:bg-white active:scale-[0.95] transition-all flex items-center justify-center"
              title="Back to projects"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-600" />
            </button>

            {/* Rainbow border wrapper — animates on load then fades */}
            <div className="consult-pill-glow rounded-full p-[2px]">
              <button
                onClick={() => setTeamOpen(true)}
                className="flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xl shadow-lg hover:shadow-xl hover:bg-white active:scale-[0.97] transition-all cursor-pointer group"
              >
                {/* Chat icon */}
                <div className="w-8 h-8 rounded-full bg-[#122d31] flex items-center justify-center shrink-0 mr-0.5">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </div>

                {/* Overlapping avatar stack */}
                <div className="flex items-center -space-x-2">
                  {AGENTS.slice(0, VISIBLE_AVATARS).map((agent) => (
                    <div
                      key={agent.agentName}
                      className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shrink-0"
                      style={{ background: `${agent.accentColor}18` }}
                    >
                      <AgentAvatar agent={agent} size={32} />
                    </div>
                  ))}
                </div>

                {/* +N remaining badge */}
                {remainingCount > 0 && (
                  <div className="flex items-center gap-0.5 ml-0.5 text-neutral-500 group-hover:text-neutral-700 transition-colors">
                    <span className="text-[11px] font-semibold">+{remainingCount}</span>
                    <ChevronDown className="w-3 h-3" />
                  </div>
                )}
              </button>
            </div>

          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
