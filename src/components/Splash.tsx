"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Dusty } from "./Dusty";

interface SplashProps {
  visible: boolean;
}

export function Splash({ visible }: SplashProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center aurora-bg"
        >
          {/* Ambient floating accents */}
          <motion.div
            className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #00F5C4, transparent 70%)" }}
            animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #FF6B9D, transparent 70%)" }}
            animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="flex flex-col items-center gap-6 relative z-10">
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Dusty size={140} glow />
            </motion.div>

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="font-display text-5xl font-bold tracking-tight">
                StudyMate
              </h1>
              <p className="mt-2 text-ink-muted text-sm tracking-wide">
                Your PowerPoints, taught by Dusty
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-1.5 text-accent mt-6"
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="absolute -bottom-16 text-xs text-ink-faint tracking-widest"
            >
              CRAFTED BY YASSINE ACHOUAK
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
