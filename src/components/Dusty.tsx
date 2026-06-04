"use client";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type DustyVariant =
  | "default"
  | "curious"
  | "happy"
  | "love"
  | "thinking"
  | "surprised"
  | "sad"
  | "winking"
  | "sleepy"
  | "squint";

interface DustyProps {
  size?: number;
  variant?: DustyVariant;
  className?: string;
  /** If true, character bobs gently (use on hero screens) */
  alive?: boolean;
  /** Optional teal glow */
  glow?: boolean;
  /** Ignored — kept for API compatibility */
  body?: boolean;
}

// Per-variant animation config
const VARIANT_ANIM: Record<DustyVariant, {
  rotate?: number[];
  y?: number[];
  scale?: number[];
  duration?: number;
  filter?: string;
}> = {
  default:   { y: [0, -3, 0],          duration: 3.5 },
  curious:   { rotate: [-4, 4, -4],    y: [0, -4, 0], duration: 2.8 },
  happy:     { y: [0, -6, 0],          scale: [1, 1.04, 1], duration: 2.2 },
  love:      { y: [0, -5, 0],          scale: [1, 1.06, 1], duration: 2.0, filter: "brightness(1.08) saturate(1.2)" },
  thinking:  { rotate: [-3, 3, -3],    duration: 2.4 },
  surprised: { scale: [1, 1.08, 1],    duration: 1.4 },
  sad:       { y: [0, 2, 0],           rotate: [-2, 2, -2], duration: 4.0, filter: "brightness(0.85) saturate(0.8)" },
  winking:   { rotate: [-6, 0, -6],    y: [0, -3, 0], duration: 2.6 },
  sleepy:    { y: [0, 3, 0],           duration: 5.0, filter: "brightness(0.9) saturate(0.7)" },
  squint:    { rotate: [-2, 2, -2],    duration: 3.0 },
};

export function Dusty({
  size = 80,
  variant = "default",
  className,
  alive = false,
  glow = false,
}: DustyProps) {
  const cfg = VARIANT_ANIM[variant];

  // Build framer-motion animate object from config
  const animate: Record<string, any> = {};
  if (cfg.y)      animate.y      = cfg.y;
  if (cfg.rotate) animate.rotate = cfg.rotate;
  if (cfg.scale)  animate.scale  = cfg.scale;

  const transition = {
    duration: cfg.duration ?? 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  return (
    <motion.div
      className={cn(
        "relative inline-flex shrink-0 align-middle select-none",
        glow && "drop-shadow-[0_0_28px_rgba(0,245,196,0.45)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        filter: cfg.filter,
      }}
      animate={animate}
      transition={transition}
    >
      <img
        src="/dusty.png"
        alt="Dusty"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
          // Drop shadow to make it feel present on dark backgrounds
          filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
        }}
        draggable={false}
      />
    </motion.div>
  );
}
