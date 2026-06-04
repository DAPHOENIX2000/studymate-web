import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — deep navy + electric teal + warm rose
        bg: {
          base: "#080808",
          panel: "#101010",
          card: "#161616",
          elevated: "#1C1C1C",
          hover: "#222222",
          active: "#2A2A2A",
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
          DEFAULT: "rgba(255,255,255,0.10)",
          strong: "rgba(255,255,255,0.18)",
        },
        ink: {
          DEFAULT: "#F5F7FA",
          dim: "#C7CCD8",
          muted: "#8A93A6",
          faint: "#5A6175",
          disabled: "#3F4659",
        },
        accent: {
          DEFAULT: "#00F5C4",
          hover: "#5FFFD9",
          pressed: "#00D4A8",
          soft: "rgba(0,245,196,0.12)",
          glow: "rgba(0,245,196,0.35)",
          ink: "#070B14",
        },
        rose: {
          DEFAULT: "#FF6B9D",
          soft: "rgba(255,107,157,0.12)",
        },
        amber: {
          DEFAULT: "#FBBF24",
          soft: "rgba(251,191,36,0.12)",
        },
        violet: {
          DEFAULT: "#A78BFA",
          soft: "rgba(167,139,250,0.12)",
        },
        success: { DEFAULT: "#10B981", soft: "rgba(16,185,129,0.12)" },
        danger: { DEFAULT: "#F43F5E", soft: "rgba(244,63,94,0.12)" },
        info: { DEFAULT: "#60A5FA", soft: "rgba(96,165,250,0.12)" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Tight, premium hierarchy
        "display-1": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-2": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "700" }],
        "h1": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h2": ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.015em", fontWeight: "600" }],
        "h3": ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        soft: "0 4px 16px rgba(0,0,0,0.18)",
        elev: "0 12px 32px rgba(0,0,0,0.30)",
        glow: "0 0 24px rgba(0,245,196,0.20)",
        "glow-strong": "0 0 40px rgba(0,245,196,0.30)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "aurora": "radial-gradient(ellipse at top, rgba(0,245,196,0.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,107,157,0.10), transparent 50%)",
        "grain": "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' /></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.4'/></svg>\")",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "blink": "blink 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        blink: {
          "0%,92%,100%": { transform: "scaleY(1)" },
          "96%": { transform: "scaleY(0.1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
