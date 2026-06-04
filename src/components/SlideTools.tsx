"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Brain,
  StickyNote,
  Youtube,
  Timer,
  X,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { streamChat } from "@/lib/chat";
import { Dusty } from "./Dusty";
import { cn } from "@/lib/utils";
import type { Slide } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SlideToolsProps {
  subjectId: string;
  subjectName: string;
  slide: Slide;
  slideIndex: number;
  accentColor: string;
}

type Tool = "none" | "simplify" | "quiz" | "notes" | "pomodoro";

export function SlideTools({ subjectId, subjectName, slide, slideIndex, accentColor }: SlideToolsProps) {
  const [active, setActive] = useState<Tool>("none");

  const toolList: { id: Tool; icon: typeof Wand2; label: string; tip: string }[] = [
    { id: "simplify", icon: Wand2, label: "Simplify", tip: "Plain-language rewrite" },
    { id: "quiz", icon: Brain, label: "Quiz me", tip: "3 quick questions on this slide" },
    { id: "notes", icon: StickyNote, label: "Notes", tip: "Type your own notes" },
    { id: "pomodoro", icon: Timer, label: "Pomodoro", tip: "25-min focus timer" },
  ];

  function openYouTube() {
    const q = encodeURIComponent(`${subjectName} ${slide.title}`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank", "noopener");
  }

  return (
    <>
      {/* Tool bar */}
      <div className="border-t border-border-subtle px-6 py-3 flex items-center gap-2 flex-wrap bg-bg-panel/40">
        {toolList.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(active === t.id ? "none" : t.id)}
            className={cn(
              "h-9 px-3 rounded-md text-sm flex items-center gap-2 transition-all",
              active === t.id
                ? "bg-accent text-accent-ink font-semibold"
                : "bg-bg-card/40 text-ink-muted hover:text-ink hover:bg-bg-card border border-border-subtle",
            )}
            title={t.tip}
          >
            <t.icon size={14} />
            <span className="hidden lg:inline">{t.label}</span>
          </button>
        ))}
        <button
          onClick={openYouTube}
          className="h-9 px-3 rounded-md text-sm flex items-center gap-2 bg-bg-card/40 text-ink-muted hover:text-ink hover:bg-bg-card border border-border-subtle transition-all"
          title="Search YouTube for this slide topic"
        >
          <Youtube size={14} />
          <span className="hidden lg:inline">YouTube</span>
        </button>
      </div>

      {/* Tool panel */}
      <AnimatePresence>
        {active !== "none" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border-subtle bg-bg-panel/30 overflow-hidden"
          >
            <div className="px-6 py-5">
              {active === "simplify" && (
                <SimplifyPanel slide={slide} accentColor={accentColor} />
              )}
              {active === "quiz" && (
                <SlideQuizPanel slide={slide} accentColor={accentColor} />
              )}
              {active === "notes" && (
                <NotesPanel subjectId={subjectId} slideIndex={slideIndex} accentColor={accentColor} />
              )}
              {active === "pomodoro" && <PomodoroPanel accentColor={accentColor} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Simplify ────────────────────────────────────────────────────────
function SimplifyPanel({ slide, accentColor }: { slide: Slide; accentColor: string }) {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setOutput("");
    const slideText =
      slide.blocks && slide.blocks.length > 0
        ? slide.blocks.map((b) => b.text).join("\n")
        : slide.body || "";
    let acc = "";
    try {
      await streamChat({
        settings: useApp.getState().settings,
        messages: [
          {
            role: "system",
            content:
              "You are Dusty, a tutor who rewrites academic content at a 5th-grade reading level. Use simple words, short sentences, and concrete examples. Use markdown.",
          },
          {
            role: "user",
            content: `Rewrite this slide so a 10-year-old could understand it. Keep the meaning but make it MUCH easier to read.\n\nTitle: ${slide.title}\n\nContent:\n${slideText}`,
          },
        ],
        onChunk: (c) => {
          acc += c;
          setOutput(acc);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-3 mb-4">
        <Dusty size={36} variant="curious" />
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-base text-ink">
            Plain-language rewrite
          </div>
          <div className="text-xs text-ink-muted mt-0.5">
            Dusty will rewrite this slide using simple words and concrete examples.
          </div>
        </div>
        {!loading && (
          <button
            onClick={run}
            className="shrink-0 h-9 px-4 rounded-md font-semibold text-sm text-accent-ink"
            style={{ background: accentColor }}
          >
            {output ? "Try again" : "Simplify"}
          </button>
        )}
        {loading && <Loader2 size={20} className="animate-spin text-accent shrink-0" />}
      </div>
      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md p-3">
          {error}
        </div>
      )}
      {output && (
        <div className="prose-chat text-[15px] leading-relaxed text-ink-dim p-4 rounded-md bg-bg-card/60 border border-border-subtle">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ── Quiz me on this slide ───────────────────────────────────────────
interface QQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

function SlideQuizPanel({ slide, accentColor }: { slide: Slide; accentColor: string }) {
  const [questions, setQuestions] = useState<QQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setIdx(0);
    setSelected(null);
    setSubmitted(false);
    try {
      const r = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: [slide],
          model: useApp.getState().settings.ollamaModel || "llama3.2:3b",
          count: 3,
        }),
      });
      const data = await r.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setError(data.error || "No questions generated. Try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setSelected(null);
    setSubmitted(false);
    setIdx((i) => Math.min(questions.length - 1, i + 1));
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-3 mb-4">
        <Dusty size={36} variant="thinking" />
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-base text-ink">Quiz me on this slide</div>
          <div className="text-xs text-ink-muted mt-0.5">
            3 quick questions to check your understanding right now.
          </div>
        </div>
        {!loading && questions.length === 0 && (
          <button
            onClick={generate}
            className="shrink-0 h-9 px-4 rounded-md font-semibold text-sm text-accent-ink"
            style={{ background: accentColor }}
          >
            Generate
          </button>
        )}
        {loading && <Loader2 size={20} className="animate-spin text-accent shrink-0" />}
      </div>

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-md p-3">
          {error}
        </div>
      )}

      {questions.length > 0 && questions[idx] && (
        <div className="p-4 rounded-md bg-bg-card/60 border border-border-subtle">
          <div className="text-[10px] font-semibold tracking-widest text-ink-faint mb-2">
            QUESTION {idx + 1} OF {questions.length}
          </div>
          <div className="font-display text-lg font-bold mb-4">{questions[idx].question}</div>
          <div className="space-y-2">
            {questions[idx].options.map((opt) => {
              const isCorrect = opt === questions[idx].correctAnswer;
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  disabled={submitted}
                  onClick={() => setSelected(opt)}
                  className={cn(
                    "w-full text-left p-3 rounded-md border text-sm transition-all",
                    !submitted && isSelected && "border-accent bg-accent-soft",
                    !submitted && !isSelected && "border-border-subtle bg-bg-base hover:border-border-strong",
                    submitted && isCorrect && "border-emerald-500 bg-emerald-500/10",
                    submitted && isSelected && !isCorrect && "border-rose-500 bg-rose-500/10",
                    submitted && !isSelected && !isCorrect && "border-border-subtle opacity-50",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            {submitted ? (
              <>
                <div className="text-sm text-ink-muted italic flex-1">{questions[idx].explanation}</div>
                {idx < questions.length - 1 ? (
                  <button
                    onClick={next}
                    className="shrink-0 h-9 px-4 rounded-md font-semibold text-sm bg-bg-card border border-border-strong hover:bg-bg-hover"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={generate}
                    className="shrink-0 h-9 px-4 rounded-md font-semibold text-sm text-accent-ink"
                    style={{ background: accentColor }}
                  >
                    New 3 questions
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-xs text-ink-faint">Select an answer</div>
                <button
                  disabled={!selected}
                  onClick={() => setSubmitted(true)}
                  className={cn(
                    "shrink-0 h-9 px-4 rounded-md font-semibold text-sm",
                    selected
                      ? "text-accent-ink"
                      : "bg-bg-card text-ink-faint cursor-not-allowed",
                  )}
                  style={selected ? { background: accentColor } : {}}
                >
                  Submit
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes ───────────────────────────────────────────────────────────
function NotesPanel({
  subjectId,
  slideIndex,
  accentColor,
}: {
  subjectId: string;
  slideIndex: number;
  accentColor: string;
}) {
  const key = `studymate-note:${subjectId}:${slideIndex}`;
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      setText(v || "");
      setSaved(true);
    } catch {}
  }, [key]);

  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => {
      try {
        if (text) localStorage.setItem(key, text);
        else localStorage.removeItem(key);
        setSaved(true);
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [text, key]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-3">
        <StickyNote size={20} style={{ color: accentColor }} />
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-base text-ink">Your notes for this slide</div>
          <div className="text-xs text-ink-muted">
            Saved locally to your browser · {saved ? "✓ Saved" : "Saving…"}
          </div>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your thoughts, questions, summaries… anything you want to remember about this slide."
        className="w-full min-h-[160px] p-4 rounded-md bg-bg-card/60 border border-border-subtle text-[15px] leading-relaxed text-ink resize-vertical focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  );
}

// ── Pomodoro ────────────────────────────────────────────────────────
function PomodoroPanel({ accentColor }: { accentColor: string }) {
  const WORK = 25 * 60;
  const BREAK = 5 * 60;
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secs, setSecs] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs((s) => {
          if (s <= 1) {
            // Cycle complete
            const nextMode = mode === "work" ? "break" : "work";
            setMode(nextMode);
            if (mode === "work") setCycles((c) => c + 1);
            // Play a soft notification
            try {
              const audio = new Audio(
                "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
              );
              audio.play().catch(() => {});
            } catch {}
            return nextMode === "work" ? WORK : BREAK;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  function reset() {
    setRunning(false);
    setMode("work");
    setSecs(WORK);
  }

  const total = mode === "work" ? WORK : BREAK;
  const pct = ((total - secs) / total) * 100;
  const minutes = Math.floor(secs / 60).toString().padStart(2, "0");
  const seconds = (secs % 60).toString().padStart(2, "0");

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        <Dusty
          size={48}
          variant={mode === "work" ? "thinking" : "happy"}
          glow={running}
        />
        <div className="text-left">
          <div className="text-[10px] font-semibold tracking-widest text-ink-faint">
            {mode === "work" ? "FOCUS TIME" : "BREAK TIME"}
          </div>
          <div className="text-xs text-ink-muted">
            {cycles > 0 && `${cycles} ${cycles === 1 ? "cycle" : "cycles"} done · `}
            {mode === "work" ? "Stay on the slide" : "Stretch, breathe, sip water"}
          </div>
        </div>
      </div>
      <div className="font-display text-6xl font-bold tabular-nums mt-4" style={{ color: accentColor }}>
        {minutes}:{seconds}
      </div>
      <div className="mt-3 h-1.5 bg-bg-card rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: accentColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          onClick={() => setRunning(!running)}
          className="h-10 px-5 rounded-md font-semibold text-sm flex items-center gap-2 text-accent-ink"
          style={{ background: accentColor }}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={reset}
          className="h-10 px-4 rounded-md text-sm flex items-center gap-2 bg-bg-card border border-border-subtle text-ink-muted hover:text-ink"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
    </div>
  );
}
