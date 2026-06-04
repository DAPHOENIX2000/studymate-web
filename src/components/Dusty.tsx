"use client";
import { motion } from "framer-motion";
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
  alive?: boolean; // kept for API compat
  glow?: boolean;
  body?: boolean;  // kept for API compat
}

// Map each variant to the correct PNG file
// 1=neutral, 2=thinking, 3=surprised/excited, 4=sad, 5=love, 6=curious, 7=sleepy
const VARIANT_SRC: Record<DustyVariant, string> = {
  default:   "/dusty/1.png",
  winking:   "/dusty/1.png", // closest: neutral
  squint:    "/dusty/1.png", // closest: neutral
  thinking:  "/dusty/2.png",
  surprised: "/dusty/3.png",
  happy:     "/dusty/3.png", // closest: excited/surprised
  sad:       "/dusty/4.png",
  love:      "/dusty/5.png",
  curious:   "/dusty/6.png",
  sleepy:    "/dusty/7.png",
};

// Per-variant animation personality
const VARIANT_ANIM: Record<DustyVariant, {
  y?: number[];
  rotate?: number[];
  scale?: number[];
  duration: number;
  filter?: string;
}> = {
  default:   { y: [0, -5, 0],          duration: 3.5 },
  curious:   { y: [0, -6, 0], rotate: [-4, 4, -4],   duration: 2.6 },
  happy:     { y: [0, -10, 0], scale: [1, 1.05, 1],   duration: 2.0 },
  love:      { y: [0, -8, 0],  scale: [1, 1.07, 1],   duration: 1.9 },
  thinking:  { rotate: [-4, 4, -4],                    duration: 2.4 },
  surprised: { scale: [1, 1.10, 1], y: [0, -4, 0],    duration: 1.3 },
  sad:       { y: [0, 4, 0],   rotate: [-2, 2, -2],   duration: 4.5, filter: "brightness(0.82) saturate(0.6)" },
  winking:   { rotate: [-6, 0, -6], y: [0, -5, 0],    duration: 2.4 },
  sleepy:    { y: [0, 6, 0],   rotate: [-3, 3, -3],   duration: 5.5, filter: "brightness(0.75) saturate(0.5)" },
  squint:    { rotate: [-2, 2, -2],                    duration: 3.0 },
};

export function Dusty({
  size = 80,
  variant = "default",
  className,
  glow = false,
}: DustyProps) {
  const src = VARIANT_SRC[variant];
  const cfg = VARIANT_ANIM[variant];

  const animate: Record<string, any> = {};
  if (cfg.y)      animate.y      = cfg.y;
  if (cfg.rotate) animate.rotate = cfg.rotate;
  if (cfg.scale)  animate.scale  = cfg.scale;

  return (
    <motion.div
      className={cn(
        "relative inline-flex shrink-0 align-middle select-none",
        glow && "drop-shadow-[0_0_32px_rgba(255,255,255,0.18)]",
        className,
      )}
      style={{ width: size, height: size, filter: cfg.filter }}
      animate={animate}
      transition={{
        duration: cfg.duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <img
        src={src}
        alt="Dusty"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
          filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.6))",
        }}
        draggable={false}
      />
    </motion.div>
  );
}
