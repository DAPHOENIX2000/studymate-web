"use client";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Library,
  BookOpen,
  Brain,
  Layers,
  TrendingUp,
  FileText,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Settings as SettingsIcon,
} from "lucide-react";
import { useApp, type ViewName } from "@/lib/store";
import { Dusty } from "./Dusty";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface NavItem {
  id: ViewName;
  label: string;
  icon: typeof Library;
  requiresSubject?: boolean;
}

const TOP_NAV: NavItem[] = [{ id: "library", label: "Library", icon: Library }];

const SUBJECT_NAV: NavItem[] = [
  { id: "study", label: "Study", icon: BookOpen, requiresSubject: true },
  { id: "quiz", label: "Quiz", icon: Brain, requiresSubject: true },
  { id: "flashcards", label: "Flashcards", icon: Layers, requiresSubject: true },
  { id: "notes", label: "Notes", icon: FileText, requiresSubject: true },
  { id: "progress", label: "Progress", icon: TrendingUp, requiresSubject: true },
];

export function Sidebar({ onAboutClick }: { onAboutClick: () => void }) {
  const view = useApp((s) => s.currentView);
  const setView = useApp((s) => s.setView);
  const collapsed = useApp((s) => s.sidebarCollapsed);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const currentSubjectId = useApp((s) => s.currentSubjectId);
  const subjects = useApp((s) => s.subjects);
  const subject = subjects.find((s) => s.id === currentSubjectId);

  const { theme, setTheme } = useTheme();
  // CRITICAL: setMounted must live inside useEffect, not in the render body —
  // otherwise it triggers a re-render every render → infinite loop.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="relative z-20 h-screen shrink-0 border-r border-border-subtle bg-bg-panel/60 backdrop-blur-2xl flex flex-col"
    >
      {/* Header — brand */}
      <div className={cn("flex items-center px-3 pt-5 pb-2", collapsed ? "justify-center" : "px-4")}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Dusty size={32} alive />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-display text-lg font-bold tracking-tight truncate"
              >
                StudyMate
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-6 -right-3 z-30 h-6 w-6 rounded-full bg-bg-card border border-border-subtle hover:border-accent hover:text-accent flex items-center justify-center text-ink-muted transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeft size={12} /> : <PanelLeftClose size={12} />}
      </button>

      {/* Subject chip */}
      <AnimatePresence>
        {subject && !collapsed && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => setView("study")}
            className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-bg-card border border-border-subtle hover:border-border text-left transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0 animate-pulse-glow"
                style={{ background: subject.accentColor, boxShadow: `0 0 8px ${subject.accentColor}` }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-widest text-ink-faint">
                  STUDYING
                </div>
                <div className="text-sm font-semibold truncate text-ink group-hover:text-accent transition-colors">
                  {subject.name}
                </div>
              </div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <LayoutGroup id="sidebar-nav">
          <NavSection title={!collapsed ? "Library" : undefined}>
            {TOP_NAV.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                active={view === item.id}
                collapsed={collapsed}
                onClick={() => {
                  setView(item.id);
                  if (item.id === "library") useApp.setState({ currentSubjectId: null });
                }}
              />
            ))}
          </NavSection>

          {subject && (
            <NavSection title={!collapsed ? "Current subject" : undefined}>
              {SUBJECT_NAV.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  active={view === item.id}
                  collapsed={collapsed}
                  onClick={() => setView(item.id)}
                />
              ))}
            </NavSection>
          )}
        </LayoutGroup>
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-border-subtle px-2 py-3 space-y-1", collapsed && "px-2")}>
        {/* Settings */}
        <button
          onClick={() => setView("settings")}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2 transition-colors text-sm",
            view === "settings"
              ? "text-accent bg-accent-soft"
              : "text-ink-muted hover:text-ink hover:bg-bg-hover",
            collapsed && "justify-center px-2",
          )}
          title="Settings"
        >
          <SettingsIcon size={16} />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "w-full flex items-center gap-3 rounded-md px-3 py-2 text-ink-muted hover:text-ink hover:bg-bg-hover transition-colors text-sm",
            collapsed && "justify-center px-2",
          )}
          title="Toggle theme"
        >
          {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {!collapsed && <span>{mounted && theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>

        {/* AI status */}
        <AIStatusRow collapsed={collapsed} />

        {/* Credit */}
        {!collapsed && (
          <button
            onClick={onAboutClick}
            className="w-full text-left text-[10px] text-ink-faint hover:text-accent transition-colors px-3 py-1.5 tracking-wider"
          >
            CRAFTED BY YASSINE ACHOUAK
          </button>
        )}
      </div>
    </motion.aside>
  );
}

function NavSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {title && (
        <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-widest text-ink-faint">
          {title.toUpperCase()}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
        active ? "text-ink" : "text-ink-muted hover:text-ink hover:bg-bg-hover",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? item.label : undefined}
    >
      {active && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-md bg-bg-hover border border-accent/30"
          style={{ boxShadow: "inset 0 0 16px rgba(0,245,196,0.08)" }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <Icon
        size={16}
        className={cn(
          "relative z-10 transition-all",
          active ? "text-accent" : "text-ink-muted group-hover:text-ink",
          active && "drop-shadow-[0_0_4px_rgba(0,245,196,0.6)]",
        )}
      />
      {!collapsed && (
        <span className={cn("relative z-10 truncate", active && "font-semibold")}>
          {item.label}
        </span>
      )}
    </button>
  );
}

function AIStatusRow({ collapsed }: { collapsed: boolean }) {
  // For now, just show "AI connected" — in Phase 2, will check Ollama status
  const [online] = useState(true);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 text-xs",
        collapsed && "justify-center px-2",
      )}
      title={online ? "AI tutor connected" : "AI offline"}
    >
      <div className="relative">
        <Sparkles size={14} className={online ? "text-accent" : "text-ink-faint"} />
        {online && (
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
        )}
      </div>
      {!collapsed && (
        <span className={online ? "text-ink-dim" : "text-ink-faint"}>
          {online ? "Dusty is ready" : "AI offline"}
        </span>
      )}
    </div>
  );
}
