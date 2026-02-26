"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { fetchProjects, deleteProject, renameProject, type ProjectSummary } from "@/lib/api";
import {
  FolderPlus,
  Clock,
  Film,
  Users,
  Trash2,
  Loader2,
  Plus,
  Sparkles,
  RefreshCw,
  Settings,
  FileText,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Check,
  Pencil,
  LogOut,
  Bot,
  Hand,
  ArrowRight,
  MoreHorizontal,
  FolderOpen,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsModal from "@/components/settings/SettingsModal";
import { AnimatedFolder, type FolderProject } from "@/components/ui/3d-folder";

// ── Helpers ──

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatNum(n: number): string {
  return n.toString().padStart(2, "0");
}

// Gradient palette for recent cards
const RECENT_GRADIENTS = [
  "linear-gradient(135deg, #23809e 0%, #3ecfff 100%)",
  "linear-gradient(135deg, #1a6b8a 0%, #23809e 100%)",
  "linear-gradient(135deg, #3ecfff 0%, #23809e 100%)",
];

// Gradient palette for folders
const FOLDER_GRADIENTS = [
  "linear-gradient(135deg, #23809e, #1a6b8a)",
  "linear-gradient(135deg, #e73827, #f85032)",
  "linear-gradient(135deg, #f7b733, #fc4a1a)",
  "linear-gradient(135deg, #00c6ff, #0072ff)",
  "linear-gradient(135deg, #8e2de2, #4a00e0)",
  "linear-gradient(135deg, #414345, #232526)",
  "linear-gradient(135deg, #f80759, #bc4e9c)",
  "linear-gradient(135deg, #11998e, #38ef7d)",
];

// ── Types ──

interface Folder {
  id: string;
  name: string;
  adIds: string[];
}

const STORAGE_FOLDERS_KEY = "openframe-folders";
const STORAGE_AD_FOLDER_KEY = "openframe-ad-folders";

interface ProjectsPageProps {
  user?: { id: string; email: string; name: string };
  onLogout?: () => void;
}

// ── Recent Project Card (01, 02, 03) ──

function RecentCard({ project, index, onClick }: { project: ProjectSummary; index: number; onClick: () => void }) {
  const isManual = project.workflow_id.startsWith("manual-");
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-accent-primary/8 hover:border-accent-primary/20 transition-all duration-300"
    >
      {/* Left gradient accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: RECENT_GRADIENTS[index % RECENT_GRADIENTS.length] }} />

      <div className="pl-4 pr-3 py-3">
        {/* Row 1: Number + badges */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[22px] font-black leading-none tracking-tighter bg-clip-text text-transparent"
            style={{ backgroundImage: RECENT_GRADIENTS[index % RECENT_GRADIENTS.length] }}
          >
            {formatNum(index + 1)}
          </span>
          <div className="flex items-center gap-1">
            {isManual ? (
              <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold border border-amber-200/60">
                <Hand className="w-2 h-2" /> Manual
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full bg-accent-primary/8 text-accent-primary font-bold border border-accent-primary/15">
                <Bot className="w-2 h-2" /> AI
              </span>
            )}
            {project.status === "running" && (
              <span className="inline-flex items-center text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-200/60">
                <Loader2 className="w-2 h-2 animate-spin" />
              </span>
            )}
            {project.status === "error" && (
              <span className="inline-flex items-center text-[8px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-bold border border-red-200/60">
                ⚠
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[12px] font-bold text-neutral-800 leading-snug line-clamp-1 mb-0.5">
          {project.campaign_title || project.user_input || "Untitled"}
        </h3>

        {/* Subtitle */}
        <p className="text-[10px] text-neutral-400 line-clamp-1 italic mb-2">
          {project.tagline || project.user_input || "No description"}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-2.5 text-[9px] text-neutral-400">
          <div className="flex items-center gap-1">
            <Film className="w-2.5 h-2.5" />
            <span>{project.scene_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-2.5 h-2.5" />
            <span>{project.cast_count}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-2.5 h-2.5" />
            <span>{timeAgo(project.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-1/2 -translate-y-1/2 right-2.5 w-5 h-5 rounded-full bg-accent-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight className="w-3 h-3 text-accent-primary" />
      </div>
    </motion.div>
  );
}

// ── Project List Item (vertical card-style like task cards) ──

function ProjectListItem({
  project,
  index,
  folderName,
  isEditing,
  editingName,
  isDragging,
  deleting,
  onOpen,
  onDelete,
  onStartEdit,
  onEditName,
  onFinishEdit,
  onCancelEdit,
  onDragStart,
  onDragEnd,
}: {
  project: ProjectSummary;
  index: number;
  folderName?: string;
  isEditing: boolean;
  editingName: string;
  isDragging: boolean;
  deleting: boolean;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onStartEdit: () => void;
  onEditName: (v: string) => void;
  onFinishEdit: () => void;
  onCancelEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const isManual = project.workflow_id.startsWith("manual-");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => { if (!isEditing) onOpen(); }}
      className={cn(
        "group relative bg-white rounded-lg border border-border px-4 py-2.5 hover:shadow-sm hover:border-accent-primary/20 transition-all duration-200 cursor-pointer",
        isDragging && "opacity-40 scale-[0.98]",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isManual ? "#f59e0b" : "#23809e" }}
        />

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => onEditName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") onFinishEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              onBlur={onFinishEdit}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-[13px] font-semibold text-foreground bg-accent-primary/5 border border-accent-primary/30 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-accent-primary/20"
            />
          ) : (
            <>
              <h4 className="text-[13px] font-semibold text-foreground leading-tight line-clamp-1">
                {project.campaign_title || project.user_input || "Untitled"}
              </h4>
              <p className="text-[11px] text-muted line-clamp-1">
                {project.tagline || project.user_input || "No description"}
              </p>
            </>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isManual ? (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold border border-amber-200/60">
              <Hand className="w-2.5 h-2.5" /> Manual
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-accent-primary/8 text-accent-primary font-semibold border border-accent-primary/15">
              <Bot className="w-2.5 h-2.5" /> AI
            </span>
          )}
          {project.status === "running" && (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200/60">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running
            </span>
          )}
          {project.status === "error" && (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold border border-red-200/60">
              ⚠ Error
            </span>
          )}
          {folderName && (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-accent-primary/5 text-accent-primary/80 font-medium border border-accent-primary/10 truncate max-w-[100px]">
              <FolderOpen className="w-2.5 h-2.5" />
              {folderName}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-[10px] text-muted shrink-0">
          <div className="flex items-center gap-1" title="Scenes">
            <Film className="w-3 h-3" />
            <span>{project.scene_count}</span>
          </div>
          <div className="flex items-center gap-1" title="Cast">
            <Users className="w-3 h-3" />
            <span>{project.cast_count}</span>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-[10px] text-muted shrink-0">
          <Clock className="w-3 h-3" />
          <span>{timeAgo(project.created_at)}</span>
        </div>

        {/* 3-dot menu */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent-primary/5 transition-all"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-border z-50 overflow-hidden py-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onStartEdit(); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground hover:bg-accent-primary/5 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button
                  onClick={(e) => { onDelete(e); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
        {deleting && <Loader2 className="w-3 h-3 text-muted animate-spin shrink-0" />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ── Main ProjectsPage Component ──
// ═══════════════════════════════════════════

export default function ProjectsPage({ user, onLogout }: ProjectsPageProps) {
  const loadProject = useStore((s) => s.loadProject);
  const setView = useStore((s) => s.setView);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState("all");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [adFolderMap, setAdFolderMap] = useState<Record<string, string>>({});
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedAdId, setDraggedAdId] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const foldersScrollRef = useRef<HTMLDivElement>(null);
  const licenseStatus = useStore((s) => s.licenseStatus);
  const fetchLicense = useStore((s) => s.fetchLicenseStatus);
  const showLicenseUpgrade = useStore((s) => s.showLicenseUpgrade);
  const setShowLicenseUpgrade = useStore((s) => s.setShowLicenseUpgrade);
  const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);

  // Load folders from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (saved) setFolders(JSON.parse(saved));
      const savedMap = localStorage.getItem(STORAGE_AD_FOLDER_KEY);
      if (savedMap) setAdFolderMap(JSON.parse(savedMap));
    } catch { /* noop */ }
  }, []);

  // Fetch license status on mount
  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  // Listen for showLicenseUpgrade from any component (e.g. ProFeatureGate)
  useEffect(() => {
    if (showLicenseUpgrade) {
      setSettingsTab("license");
      setSettingsOpen(true);
      setShowLicenseUpgrade(false);
    }
  }, [showLicenseUpgrade, setShowLicenseUpgrade]);

  const saveFolders = (f: Folder[]) => {
    setFolders(f);
    try { localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(f)); } catch { /* noop */ }
  };

  const saveAdFolderMap = (m: Record<string, string>) => {
    setAdFolderMap(m);
    try { localStorage.setItem(STORAGE_AD_FOLDER_KEY, JSON.stringify(m)); } catch { /* noop */ }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Folder = { id: `folder-${Date.now()}`, name: newFolderName.trim(), adIds: [] };
    saveFolders([...folders, newFolder]);
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    saveFolders(folders.filter((f) => f.id !== folderId));
    // Remove all ad→folder mappings pointing to this folder
    const newMap = { ...adFolderMap };
    for (const [adId, fid] of Object.entries(newMap)) {
      if (fid === folderId) delete newMap[adId];
    }
    saveAdFolderMap(newMap);
    if (activeFolder === folderId) setActiveFolder("all");
  };

  const handleRename = async (workflowId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) { setEditingId(null); return; }
    try {
      await renameProject(workflowId, trimmed);
      setProjects((prev) => prev.map((p) =>
        p.workflow_id === workflowId ? { ...p, campaign_title: trimmed } : p
      ));
    } catch { /* silent */ }
    setEditingId(null);
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, workflowId: string) => {
    e.dataTransfer.setData("text/plain", workflowId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedAdId(workflowId);
  };
  const handleDragEnd = () => {
    setDraggedAdId(null);
    setDropTargetFolder(null);
  };
  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetFolder(folderId);
  };
  const handleFolderDragLeave = () => {
    setDropTargetFolder(null);
  };
  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const adId = e.dataTransfer.getData("text/plain");
    if (adId) {
      const newMap = { ...adFolderMap };
      if (folderId === "none") {
        delete newMap[adId];
      } else {
        newMap[adId] = folderId;
      }
      saveAdFolderMap(newMap);
    }
    setDraggedAdId(null);
    setDropTargetFolder(null);
  };

  // Filtered projects based on search + active folder
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = searchQuery.trim() === "" ||
      (p.campaign_title || p.user_input || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tagline || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = activeFolder === "all" || adFolderMap[p.workflow_id] === activeFolder;
    return matchesSearch && matchesFolder;
  });

  // Recent 3 projects (sorted by date, most recent first — already sorted from API)
  const recentProjects = projects.slice(0, 3);

  // Build folder → project mapping for 3D folders
  const buildFolderProjects = (folderId: string): FolderProject[] => {
    const folderAdIds = Object.entries(adFolderMap)
      .filter(([, fid]) => fid === folderId)
      .map(([adId]) => adId);
    return folderAdIds
      .map((adId) => {
        const p = projects.find((proj) => proj.workflow_id === adId);
        if (!p) return null;
        return { id: p.workflow_id, image: "", title: p.campaign_title || p.user_input || "Untitled" } as FolderProject;
      })
      .filter(Boolean) as FolderProject[];
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e: React.MouseEvent, wfId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(wfId);
    try {
      await deleteProject(wfId);
      setProjects((prev) => prev.filter((p) => p.workflow_id !== wfId));
    } catch { /* silent */ } finally {
      setDeleting(null);
    }
  };

  const handleNewProject = () => setView("create");

  const scrollFolders = (dir: "left" | "right") => {
    foldersScrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <div className="flex-1 h-full bg-[#fafbfc] overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-none">OpenFrame AI</h1>
              <button
                onClick={() => { setSettingsTab("license"); setSettingsOpen(true); }}
                className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity",
                  licenseStatus?.valid
                    ? licenseStatus.plan === "enterprise"
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : "bg-[#508ab7]/10 text-[#508ab7] border border-[#508ab7]/20"
                    : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                )}
                title="Manage license"
              >
                <Shield className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                {licenseStatus?.plan || "community"}
              </button>
            </div>
            <p className="text-[12px] text-muted mt-0.5">The Open Source Ad Engine</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg bg-white border border-border text-muted hover:text-foreground hover:border-border-bright transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={load}
              className="p-2 rounded-lg bg-white border border-border text-muted hover:text-foreground hover:border-border-bright transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-[14px] shadow-lg hover:shadow-xl active:scale-[0.97] transition-all"
              style={{ background: "linear-gradient(135deg, #23809e 0%, #3ecfff 100%)" }}
            >
              <Plus className="w-4 h-4" />
              Create New Ad
            </button>

            {user && (
              <div className="relative ml-1 group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-border hover:border-border-bright transition-all">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: "linear-gradient(135deg, #23809e 0%, #3ecfff 100%)" }}>
                    {(user.name || user.email)[0].toUpperCase()}
                  </div>
                  <span className="text-[12px] text-foreground font-medium max-w-[100px] truncate hidden sm:block">
                    {user.name || user.email.split("@")[0]}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-neutral-200/60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-[12px] font-medium text-foreground truncate">{user.name || "User"}</p>
                    <p className="text-[11px] text-muted truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-[12px] text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); setSettingsTab(undefined); }} initialTab={settingsTab} />

        {/* ═══ Loading State ═══ */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
            <span className="text-[13px] text-muted">Loading projects…</span>
          </div>
        )}

        {/* ═══ Empty State ═══ */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-muted" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground mb-1">No ads yet</h3>
            <p className="text-[13px] text-muted mb-6 max-w-xs mx-auto">
              Create your first luxury ad campaign with AI-powered creative agents.
            </p>
            <button
              onClick={handleNewProject}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white hover:bg-[#1a3f44] transition-all font-semibold text-[13px] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #23809e 0%, #3ecfff 100%)" }}
            >
              <Sparkles className="w-4 h-4" />
              Create Your First Ad
            </button>
          </div>
        )}

        {/* ═══ Content (when projects exist) ═══ */}
        {!loading && projects.length > 0 && (
          <>
            {/* ── Folders (original horizontal scroll, full width) ── */}
            {folders.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[13px] font-semibold text-muted uppercase tracking-wider">Folders</h2>
                    <p className="text-[11px] text-muted/70 mt-0.5">Organize your campaigns</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => scrollFolders("left")}
                      className="p-1.5 rounded-lg border border-border text-muted hover:text-foreground hover:bg-accent-primary/5 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => scrollFolders("right")}
                      className="p-1.5 rounded-lg border border-border text-muted hover:text-foreground hover:bg-accent-primary/5 transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  ref={foldersScrollRef}
                  className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide"
                  onDragOver={(e) => e.preventDefault()}
                >
                  {folders.map((f, fi) => {
                    const folderProjects = buildFolderProjects(f.id);
                    const count = Object.values(adFolderMap).filter((fid) => fid === f.id).length;
                    const isDropTarget = dropTargetFolder === f.id;
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "shrink-0 transition-all duration-300 rounded-2xl relative group/folder",
                          isDropTarget && "ring-2 ring-accent-primary ring-offset-2 scale-[1.02]",
                        )}
                        onDragOver={(e) => handleFolderDragOver(e, f.id)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleFolderDrop(e, f.id)}
                      >
                        {/* Delete folder button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                          className="absolute -top-2 -right-2 z-[100] w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-all shadow-lg hover:bg-red-600 hover:scale-110"
                          title="Delete folder"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                        <AnimatedFolder
                          title={f.name}
                          projects={folderProjects.length > 0 ? folderProjects : [{ id: "empty", image: "", title: "Empty" }]}
                          count={count}
                          gradient={FOLDER_GRADIENTS[fi % FOLDER_GRADIENTS.length]}
                          className="w-[180px]"
                          onClick={() => setActiveFolder(activeFolder === f.id ? "all" : f.id)}
                          onOpenProject={(proj) => loadProject(proj.id)}
                        />
                      </div>
                    );
                  })}

                  {/* New folder card */}
                  {creatingFolder ? (
                    <div className="shrink-0 flex flex-col items-center justify-center w-[180px] min-h-[190px] bg-white rounded-2xl border-2 border-accent-primary/30 p-5">
                      <input
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); } }}
                        placeholder="Folder name…"
                        className="w-full text-[12px] font-medium text-center bg-transparent outline-none border-b-2 border-accent-primary/30 pb-2 mb-3 placeholder:text-neutral-300 focus:border-accent-primary"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleCreateFolder} className="px-3 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-[10px] font-semibold hover:bg-accent-primary/20 transition-colors">
                          <Check className="w-3 h-3 inline mr-1" /> Create
                        </button>
                        <button onClick={() => { setCreatingFolder(false); setNewFolderName(""); }} className="px-2 py-1 rounded-lg bg-neutral-100 text-muted text-[10px] font-semibold hover:bg-neutral-200 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setCreatingFolder(true)}
                      className="shrink-0 w-[180px] min-h-[190px] bg-white/50 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent-primary/30 hover:bg-accent-primary/3 transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-accent-primary/10 flex items-center justify-center mb-2 transition-colors">
                        <FolderPlus className="w-4 h-4 text-muted group-hover:text-accent-primary transition-colors" />
                      </div>
                      <span className="text-[11px] font-semibold text-muted group-hover:text-accent-primary transition-colors">New Folder</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── If no folders yet: show inline new folder button ── */}
            {folders.length === 0 && (
              <div className="mb-6">
                {creatingFolder ? (
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); } }}
                      placeholder="Folder name…"
                      className="flex-1 text-[13px] bg-white border border-accent-primary/30 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary/30 placeholder:text-neutral-300"
                    />
                    <button onClick={handleCreateFolder} className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setCreatingFolder(false); setNewFolderName(""); }} className="p-2 rounded-lg bg-neutral-100 text-muted hover:bg-neutral-200 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingFolder(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-muted bg-white border border-border rounded-lg hover:border-accent-primary/30 hover:text-accent-primary hover:shadow-sm transition-all"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Create a Folder
                  </button>
                )}
              </div>
            )}

            {/* ── Two-column layout: Recent (left) + Search & List (right) ── */}
            <div className="flex gap-6">
              {/* LEFT COLUMN: Recent Projects */}
              <div className="w-[260px] shrink-0">
                <div className="sticky top-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[12px] font-semibold text-muted uppercase tracking-wider">Recent</h2>
                    {projects.length > 5 && (
                      <span className="text-[10px] text-accent-primary font-semibold">{projects.length} total</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 mb-5">
                    {recentProjects.map((p, i) => (
                      <RecentCard
                        key={p.workflow_id}
                        project={p}
                        index={i}
                        onClick={() => loadProject(p.workflow_id)}
                      />
                    ))}
                  </div>

                  {/* Create new ad button */}
                  <button
                    onClick={handleNewProject}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-[11px] font-semibold text-muted hover:border-accent-primary/30 hover:text-accent-primary hover:bg-accent-primary/3 transition-all duration-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Ad
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Search + Project List */}
              <div className="flex-1 min-w-0">
                {/* Search + Filter Bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ads and campaigns…"
                      className="w-full pl-9 pr-9 py-2.5 bg-white border border-border rounded-lg text-[13px] text-foreground placeholder:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-accent-primary/30 focus:border-accent-primary/30 transition-all font-light"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Active folder filter pill */}
                  {activeFolder !== "all" && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-accent-primary/8 text-accent-primary rounded-lg text-[11px] font-semibold border border-accent-primary/15">
                      <FolderOpen className="w-3.5 h-3.5" />
                      {folders.find((f) => f.id === activeFolder)?.name || "Folder"}
                      <button onClick={() => setActiveFolder("all")} className="ml-1 hover:bg-accent-primary/15 rounded-full p-0.5 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <span className="text-[11px] text-muted ml-auto shrink-0">{filteredProjects.length} projects</span>
                </div>

                {/* Project List */}
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {filteredProjects.map((p, i) => {
                      const currentFolder = adFolderMap[p.workflow_id];
                      const folderName = folders.find((f) => f.id === currentFolder)?.name;
                      return (
                        <ProjectListItem
                          key={p.workflow_id}
                          project={p}
                          index={i}
                          folderName={folderName}
                          isEditing={editingId === p.workflow_id}
                          editingName={editingName}
                          isDragging={draggedAdId === p.workflow_id}
                          deleting={deleting === p.workflow_id}
                          onOpen={() => loadProject(p.workflow_id)}
                          onDelete={(e) => handleDelete(e, p.workflow_id)}
                          onStartEdit={() => {
                            setEditingId(p.workflow_id);
                            setEditingName(p.campaign_title || p.user_input || "");
                          }}
                          onEditName={setEditingName}
                          onFinishEdit={() => handleRename(p.workflow_id)}
                          onCancelEdit={() => setEditingId(null)}
                          onDragStart={(e) => handleDragStart(e, p.workflow_id)}
                          onDragEnd={handleDragEnd}
                        />
                      );
                    })}
                  </AnimatePresence>

                  {filteredProjects.length === 0 && searchQuery && (
                    <div className="text-center py-16">
                      <Search className="w-6 h-6 text-neutral-300 mx-auto mb-3" />
                      <p className="text-[13px] text-muted">No results for &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
