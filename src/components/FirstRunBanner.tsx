"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useState } from "react";

/**
 * Shown at the top of the Library when the user hasn't set any API key yet.
 * Explains they need to bring their own free Gemini key.
 */
export function FirstRunBanner() {
  const settings = useApp((s) => s.settings);
  const setView = useApp((s) => s.setView);
  const [dismissed, setDismissed] = useState(false);

  const hasAnyKey =
    (settings.aiProvider === "gemini" && settings.geminiKey) ||
    (settings.aiProvider === "claude" && settings.claudeKey) ||
    settings.aiProvider === "ollama"; // assume self-hosted dev mode

  if (hasAnyKey || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-6 p-5 rounded-xl border border-accent/30 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0,245,196,0.10), transparent 70%), rgba(16, 24, 39, 0.6)",
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 h-7 w-7 rounded-md hover:bg-bg-hover flex items-center justify-center text-ink-faint hover:text-ink-muted transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center text-accent">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <div className="font-display text-lg font-bold text-ink leading-tight">
              One quick step to make Dusty smart
            </div>
            <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">
              Dusty needs an AI brain to explain your slides. Get a free Google Gemini
              API key (takes 2 minutes, no credit card), paste it in Settings, and
              you're ready. Until then, slide viewing, notes, and Pomodoro still work.
            </p>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setView("settings")}
                className="h-9 px-4 rounded-md bg-accent text-accent-ink font-semibold text-sm flex items-center gap-1.5 hover:bg-accent-hover transition-colors"
              >
                Open Settings <ArrowRight size={14} />
              </button>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                Get a free Gemini key →
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
