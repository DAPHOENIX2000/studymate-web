"use client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";

// ── Orbie character sheet variants ──────────────────────────────────
// Eye coordinates are well-spaced now (compare to reference card):
//   left eye center  = (32, 44)
//   right eye center = (68, 44)
//   eye radius       = 13
// Pupils sit slightly forward in the eye (offset down-right).
export type DustyVariant =
  | "default"     // NEUTRAL — looking ahead
  | "curious"     // both eyes glance up-right
  | "happy"       // closed crescent eyes
  | "love"        // looking at heart, slight blush
  | "thinking"    // pupils dart side to side
  | "surprised"   // pupils small, eyes wide
  | "sad"         // pupils low, slight droop
  | "winking"     // one eye closed
  | "sleepy"      // both eyes half closed
  | "squint";     // closed/loading — both eyes as lines

interface DustyProps {
  size?: number;
  variant?: DustyVariant;
  className?: string;
  /** If true, pupils follow mouse subtly (use sparingly) */
  alive?: boolean;
  /** Optional teal glow */
  glow?: boolean;
  /** Show little body (arms/legs) — true by default */
  body?: boolean;
}

export function Dusty({
  size = 80,
  variant = "default",
  className,
  alive = false,
  glow = false,
  body: showBody = false,
}: DustyProps) {
  const id = useId().replace(/:/g, "");

  // Motion values for mouse-follow (no React re-renders)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 22 });
  const sy = useSpring(y, { stiffness: 280, damping: 22 });

  useEffect(() => {
    if (!alive) return;
    function onMove(e: MouseEvent) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      x.set(Math.max(-1, Math.min(1, dx * 2.2)) * 2.2);
      y.set(Math.max(-1, Math.min(1, dy * 2.2)) * 2.2);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [alive, x, y]);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 align-middle",
        glow && "drop-shadow-[0_0_24px_rgba(0,245,196,0.4)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle body gradient for dimensional feel */}
          <radialGradient id={`body-${id}`} cx="0.4" cy="0.35">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="60%" stopColor="#0a0a0a" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          {/* Eye gradient — soft sphere */}
          <radialGradient id={`eye-${id}`} cx="0.4" cy="0.35">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f0f0f0" />
            <stop offset="100%" stopColor="#d8d8d8" />
          </radialGradient>
        </defs>

        {/* Body (round blob) */}
        <circle cx="50" cy="50" r="46" fill={`url(#body-${id})`} />

        {/* Optional arms/legs (squiggle limbs) */}
        {showBody && (
          <>
            {/* Left arm */}
            <path
              d="M 12 56 Q 6 64 8 72"
              stroke="#0a0a0a"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="8" cy="74" r="4" fill="#0a0a0a" />
            {/* Right arm */}
            <path
              d="M 88 56 Q 94 64 92 72"
              stroke="#0a0a0a"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="92" cy="74" r="4" fill="#0a0a0a" />
          </>
        )}

        {/* Eyes — well spaced */}
        {renderEyes(variant, id, sx, sy)}
      </svg>
    </div>
  );
}

function renderEyes(
  variant: DustyVariant,
  id: string,
  sx: ReturnType<typeof useSpring>,
  sy: ReturnType<typeof useSpring>,
) {
  // Common eye centers — wider spacing matches reference
  const LX = 32, RX = 68, EY = 44, ER = 13; // left X, right X, eye Y, eye radius

  switch (variant) {
    case "squint":
      return (
        <>
          <rect x={LX - 11} y={EY - 1.5} width="22" height="3" rx="1.5" fill="#ffffff" />
          <rect x={RX - 11} y={EY - 1.5} width="22" height="3" rx="1.5" fill="#ffffff" />
        </>
      );

    case "happy":
      return (
        <>
          <path
            d={`M ${LX - 11} ${EY + 2} Q ${LX} ${EY - 8} ${LX + 11} ${EY + 2}`}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M ${RX - 11} ${EY + 2} Q ${RX} ${EY - 8} ${RX + 11} ${EY + 2}`}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case "sleepy":
      return (
        <>
          {/* Half-closed eyes */}
          <path
            d={`M ${LX - 11} ${EY} Q ${LX} ${EY + 5} ${LX + 11} ${EY}`}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M ${RX - 11} ${EY} Q ${RX} ${EY + 5} ${RX + 11} ${EY}`}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case "winking":
      return (
        <>
          {/* Left open */}
          <circle cx={LX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={LX + 2} cy={EY + 2} r="4" fill="#0a0a0a" />
          <circle cx={LX + 3.5} cy={EY + 0.5} r="1.2" fill="#ffffff" />
          {/* Right winking */}
          <path
            d={`M ${RX - 11} ${EY + 2} Q ${RX} ${EY - 8} ${RX + 11} ${EY + 2}`}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );

    case "surprised":
      return (
        <>
          <circle cx={LX} cy={EY} r={ER + 1} fill={`url(#eye-${id})`} />
          <circle cx={RX} cy={EY} r={ER + 1} fill={`url(#eye-${id})`} />
          {/* Small pupils */}
          <circle cx={LX} cy={EY} r="2.5" fill="#0a0a0a" />
          <circle cx={RX} cy={EY} r="2.5" fill="#0a0a0a" />
        </>
      );

    case "sad":
      return (
        <>
          <circle cx={LX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={RX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          {/* Pupils low — looking down */}
          <circle cx={LX + 1} cy={EY + 5} r="4" fill="#0a0a0a" />
          <circle cx={RX + 1} cy={EY + 5} r="4" fill="#0a0a0a" />
          {/* Slight droopy eyebrow effect */}
          <path
            d={`M ${LX - 12} ${EY - 13} L ${LX + 5} ${EY - 9}`}
            stroke="#0a0a0a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={`M ${RX - 5} ${EY - 9} L ${RX + 12} ${EY - 13}`}
            stroke="#0a0a0a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      );

    case "curious": {
      // Eyes glance to the right and slightly up
      const dx = 3, dy = -2;
      return (
        <>
          <circle cx={LX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={RX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={LX + dx} cy={EY + dy} r="4" fill="#0a0a0a" />
          <circle cx={RX + dx} cy={EY + dy} r="4" fill="#0a0a0a" />
          <circle cx={LX + dx + 1.5} cy={EY + dy - 1.5} r="1.3" fill="#ffffff" />
          <circle cx={RX + dx + 1.5} cy={EY + dy - 1.5} r="1.3" fill="#ffffff" />
        </>
      );
    }

    case "love": {
      // Heart-eyed: white eyes with tiny heart pupils
      return (
        <>
          <circle cx={LX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={RX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <path
            d={heartPath(LX, EY + 2, 5)}
            fill="#FF6B9D"
          />
          <path
            d={heartPath(RX, EY + 2, 5)}
            fill="#FF6B9D"
          />
        </>
      );
    }

    case "thinking":
      return (
        <>
          <circle cx={LX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={RX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          {/* Pupils dart side to side — animate the whole group's translate */}
          <motion.g
            animate={{ x: [-4, 5, -4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx={LX} cy={EY + 1} r="4" fill="#0a0a0a" />
            <circle cx={RX} cy={EY + 1} r="4" fill="#0a0a0a" />
          </motion.g>
        </>
      );

    case "default":
    default:
      return (
        <>
          <circle cx={LX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          <circle cx={RX} cy={EY} r={ER} fill={`url(#eye-${id})`} />
          {/* Pupils — slightly forward/down, follow mouse if alive.
              Use a single motion.g wrapper instead of per-circle motion to avoid
              Framer trying to set <circle cx="undefined"> during first render. */}
          <motion.g style={{ x: sx, y: sy }}>
            <circle cx={LX + 1} cy={EY + 2} r="4.5" fill="#0a0a0a" />
            <circle cx={RX + 1} cy={EY + 2} r="4.5" fill="#0a0a0a" />
          </motion.g>
          {/* Light dots */}
          <circle cx={LX + 2.5} cy={EY + 0.5} r="1.3" fill="#ffffff" opacity="0.9" />
          <circle cx={RX + 2.5} cy={EY + 0.5} r="1.3" fill="#ffffff" opacity="0.9" />
        </>
      );
  }
}

// Tiny heart path centered at (cx, cy) with width s
function heartPath(cx: number, cy: number, s: number): string {
  return `M ${cx},${cy + s * 0.4}
          C ${cx - s},${cy - s * 0.2} ${cx - s},${cy - s * 0.9} ${cx},${cy - s * 0.2}
          C ${cx + s},${cy - s * 0.9} ${cx + s},${cy - s * 0.2} ${cx},${cy + s * 0.4} Z`;
}
