"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

interface SplashProps {
  visible: boolean;
  onEnter: () => void;
}

const SLOGANS = [
  "Your future self is watching. Make them proud.",
  "One slide at a time. Dusty's got your back.",
  "Every expert was once a beginner with good notes.",
  "Study now. Shine later.",
  "Knowledge is the one thing nobody can take from you.",
  "Hard now, easy later. Easy now, hard forever.",
  "Dusty never sleeps. Neither should your curiosity.",
  "Your brain is a muscle. Let's work it out.",
  "Small steps every day. Big results over time.",
  "Be the student your future career needs you to be.",
  "The best time to start was yesterday. Now is second best.",
  "Consistency beats talent when talent doesn't show up.",
  "You've got this. Dusty believes in you.",
  "Turn your slides into superpowers.",
  "The grind is temporary. The knowledge is forever.",
];

// Random particles for background ambiance
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: Math.random() * 4 + 2,
  delay: Math.random() * 8,
  duration: Math.random() * 6 + 10,
  opacity: Math.random() * 0.3 + 0.05,
}));

export function Splash({ visible, onEnter }: SplashProps) {
  // Pick a random slogan once per mount (stable across re-renders, changes on refresh)
  const slogan = useMemo(
    () => SLOGANS[Math.floor(Math.random() * SLOGANS.length)],
    [],
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: "#080808" }}
        >
          {/* ── Floating particles ── */}
          {PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${p.x}%`,
                bottom: "-20px",
                width: p.size,
                height: p.size,
                background: p.id % 3 === 0
                  ? "rgba(0,245,196,0.6)"
                  : p.id % 3 === 1
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(167,139,250,0.5)",
              }}
              animate={{
                y: [0, -1000],
                x: [0, (Math.random() - 0.5) * 120],
                opacity: [0, p.opacity, p.opacity, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}

          {/* ── Ambient glow orbs ── */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{
              top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,245,196,0.06) 0%, transparent 70%)" }}
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)" }}
            animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Main content ── */}
          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-xl">

            {/* Dusty — drops in with a bounce */}
            <motion.div
              initial={{ y: -120, opacity: 0, rotate: -8 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.1, duration: 0.9, type: "spring", stiffness: 180, damping: 14 }}
            >
              <motion.img
                src="/dusty.png"
                alt="Dusty"
                width={160}
                height={160}
                style={{
                  filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.7)) drop-shadow(0 0 60px rgba(255,255,255,0.08))",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                animate={{
                  y: [0, -10, 0],
                  rotate: [-1, 1, -1],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                draggable={false}
              />
            </motion.div>

            {/* App name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="mt-6"
            >
              <h1
                className="font-display font-bold tracking-tight text-white"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", letterSpacing: "-0.03em" }}
              >
                StudyMate{" "}
                <span style={{ color: "#00F5C4" }}>AI</span>
              </h1>
            </motion.div>

            {/* Slogan — unique on every refresh */}
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              className="mt-4 text-base leading-relaxed"
              style={{ color: "rgba(255,255,255,0.5)", maxWidth: "360px" }}
            >
              {slogan}
            </motion.p>

            {/* CTA button */}
            <motion.button
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, duration: 0.5, type: "spring", stiffness: 200, damping: 16 }}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              className="cta-pulse mt-10 inline-flex items-center gap-3 px-8 py-3.5 rounded-full font-semibold text-base transition-all"
              style={{
                background: "#00F5C4",
                color: "#080808",
                fontSize: "1rem",
              }}
            >
              <Sparkles size={18} />
              Start studying
              <ArrowRight size={18} />
            </motion.button>

            {/* Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="mt-5 text-xs tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Upload a PowerPoint · Dusty does the rest
            </motion.p>
          </div>

          {/* Bottom credit */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="absolute bottom-6 left-0 right-0 text-center text-xs tracking-widest"
            style={{ color: "rgba(255,255,255,0.12)" }}
          >
            CRAFTED BY YASSINE ACHOUAK
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
