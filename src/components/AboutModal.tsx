"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Dusty } from "./Dusty";

export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full glass-strong rounded-2xl inner-highlight p-8 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-md text-ink-muted hover:text-ink hover:bg-bg-hover transition-colors flex items-center justify-center"
            >
              <X size={14} />
            </button>

            <Dusty size={120} alive glow className="mx-auto" />

            <h2 className="font-display text-4xl font-bold mt-5 tracking-tight">
              StudyMate AI
            </h2>
            <p className="text-ink-muted italic text-sm mt-1">
              Your PowerPoints, taught by Dusty.
            </p>

            <div className="my-6 px-6 py-5 rounded-xl bg-bg-card border border-border-subtle">
              <div className="text-[10px] font-semibold tracking-[0.15em] text-ink-faint mb-2">
                CRAFTED BY
              </div>
              <div className="font-display text-2xl font-bold text-accent">
                Yassine Achouak
              </div>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              Built with Next.js, Tailwind, Framer Motion, and Ollama.
              <br />
              Everything runs locally — your data never leaves your computer.
            </p>

            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-glow-strong"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
