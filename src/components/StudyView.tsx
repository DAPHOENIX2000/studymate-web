"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  Sparkles,
  Lightbulb,
  GitBranch,
  Globe,
  Languages,
  Copy,
  Send,
  X,
  Layers,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "@/lib/store";
import { Dusty } from "./Dusty";
import { cn, formatRelativeTime } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";
import { SlideRenderer } from "./SlideRenderer";
import { SlideTools } from "./SlideTools";
import { streamChat } from "@/lib/chat";
import { getVoice } from "@/lib/voice";

const SUGGESTIONS = [
  { icon: Lightbulb, label: "Explain simpler", prompt: "Explain this slide in simpler terms." },
  { icon: Sparkles, label: "Give example", prompt: "Give me a concrete example for this slide." },
  { icon: GitBranch, label: "Summarize", prompt: "Summarize the key points of this slide." },
  { icon: Globe, label: "Real-world", prompt: "Give a real-world analogy for this concept." },
  { icon: Languages, label: "Translate", prompt: "Translate this slide into Arabic." },
];

// Module-level stable empty array — returning a fresh [] from a Zustand
// selector triggers a re-render every call (new ref each time → infinite loop).
const EMPTY_MESSAGES: ChatMessage[] = [];

export function StudyView() {
  const subject = useApp((s) => s.subjects.find((x) => x.id === s.currentSubjectId));
  const chatMessages =
    useApp((s) => (s.currentSubjectId ? s.chatBySubject[s.currentSubjectId] : undefined)) ??
    EMPTY_MESSAGES;
  const addChatMessage = useApp((s) => s.addChatMessage);
  const [slideIdx, setSlideIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showThumbs, setShowThumbs] = useState(false);

  const slideCount = subject?.slides.length ?? 0;

  // Keyboard nav — hook MUST come before any early return
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") setSlideIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setSlideIdx((i) => Math.min(slideCount - 1, i + 1));
      else if (e.key === "f") setFullscreen((f) => !f);
      else if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slideCount]);

  if (!subject) return null;
  // Subjects rehydrated from localStorage have empty slides arrays (we don't persist
  // the heavy slide content). Show a friendly re-upload prompt instead of crashing.
  if (!subject.slides || subject.slides.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center max-w-md px-8">
          <div className="text-xs font-semibold tracking-widest text-accent mb-2">
            {subject.name.toUpperCase()}
          </div>
          <h2 className="font-display text-3xl font-bold leading-tight mb-3">
            Slides not loaded
          </h2>
          <p className="text-ink-muted leading-relaxed">
            Slide content isn't persisted between sessions yet. Head back to the Library
            and re-upload the PowerPoint to study this subject.
          </p>
        </div>
      </div>
    );
  }
  const slide = subject.slides[Math.min(slideIdx, subject.slides.length - 1)];

  return (
    <div className="flex-1 overflow-hidden flex aurora-bg">
      {/* Main slide area */}
      <div className={cn("flex-1 flex flex-col min-w-0", !fullscreen && "border-r border-border-subtle")}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border-subtle">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-widest text-accent mb-1">
              {subject.name.toUpperCase()}
            </div>
            <h1 className="font-display text-h1 truncate">Study</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowThumbs((v) => !v)}
              className={cn(
                "h-9 w-9 rounded-md flex items-center justify-center transition-colors",
                showThumbs ? "bg-accent-soft text-accent" : "glass text-ink-muted hover:text-ink",
              )}
              title="Toggle thumbnails (T)"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => {
                const v = getVoice();
                if (v.isSpeaking()) {
                  v.stop();
                  return;
                }
                const text = [
                  slide.title,
                  ...(slide.blocks || []).map((b) => b.text),
                ].join(". ");
                v.setRate(useApp.getState().settings.voiceRate);
                v.speak(text);
              }}
              className="h-9 px-3 rounded-md glass text-sm text-ink-muted hover:text-ink flex items-center gap-2 transition-colors"
              title="Read this slide aloud"
            >
              <Volume2 size={14} />
              <span>Read aloud</span>
            </button>
            <button
              onClick={() => setFullscreen((v) => !v)}
              className="h-9 w-9 rounded-md glass flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
              title="Focus mode (F)"
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Slide stage */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={slideIdx}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="h-full overflow-y-auto"
            >
              <SlideRenderer
                slide={slide}
                index={slideIdx}
                total={subject.slides.length}
                accentColor={subject.accentColor}
                zoom={zoom}
                glossary={subject.glossary}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Creative tools — Simplify / Quiz me / Notes / YouTube / Pomodoro */}
        <SlideTools
          subjectId={subject.id}
          subjectName={subject.name}
          slide={slide}
          slideIndex={slideIdx}
          accentColor={subject.accentColor}
        />

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-8 py-4 border-t border-border-subtle">
          <button
            onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
            disabled={slideIdx === 0}
            className="h-9 px-3 rounded-md glass text-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Zoom */}
            <div className="flex items-center gap-1 glass rounded-md px-1 py-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
                className="h-7 w-7 rounded text-ink-muted hover:text-ink hover:bg-bg-hover transition-colors text-sm font-bold"
              >
                −
              </button>
              <span className="text-[11px] text-ink-muted font-mono w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                className="h-7 w-7 rounded text-ink-muted hover:text-ink hover:bg-bg-hover transition-colors text-sm font-bold"
              >
                +
              </button>
            </div>

            <div className="text-xs text-ink-faint font-mono">
              {slideIdx + 1} / {subject.slides.length}
            </div>
          </div>

          <button
            onClick={() => setSlideIdx((i) => Math.min(subject.slides.length - 1, i + 1))}
            disabled={slideIdx === subject.slides.length - 1}
            className="h-9 px-3 rounded-md glass text-sm text-ink-muted hover:text-ink disabled:opacity-30 flex items-center gap-2 transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Thumbnails strip (overlay) */}
        <AnimatePresence>
          {showThumbs && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-20 left-8 right-8 h-28 glass-strong rounded-xl inner-highlight p-3 overflow-x-auto z-20"
            >
              <div className="flex gap-2 h-full">
                {subject.slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIdx(i)}
                    className={cn(
                      "h-full aspect-[16/10] shrink-0 rounded-md overflow-hidden border-2 transition-all relative",
                      i === slideIdx
                        ? "border-accent shadow-glow"
                        : "border-border-subtle hover:border-border-strong",
                    )}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${subject.accentColor}40, ${subject.accentColor}10)`,
                      }}
                    />
                    <div className="absolute inset-0 p-2 flex flex-col">
                      <div className="text-[8px] text-ink-faint font-mono">{i + 1}</div>
                      <div className="text-[9px] font-semibold text-ink leading-tight line-clamp-3 mt-1">
                        {s.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat panel */}
      {!fullscreen && (
        <ChatPanel
          subject={subject}
          messages={chatMessages}
          slideIdx={slideIdx}
          onSend={async (content) => {
            const userMsg: ChatMessage = {
              id: `m${Date.now()}`,
              role: "user",
              content,
              createdAt: new Date().toISOString(),
              slideIndex: slideIdx + 1,
            };
            addChatMessage(subject.id, userMsg);

            const replyId = `m${Date.now() + 1}`;
            const replyMsg: ChatMessage = {
              id: replyId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
              slideIndex: slideIdx + 1,
            };
            addChatMessage(subject.id, replyMsg);

            const slideText =
              slide.blocks && slide.blocks.length > 0
                ? slide.blocks.map((b) => b.text).join("\n")
                : slide.body || "";

            const systemPrompt = `You are Dusty, a friendly and patient AI tutor helping a student study a lecture titled "${subject.name}". The current slide (${slideIdx + 1} of ${subject.slides.length}) is:\n\nTITLE: ${slide.title}\n\nCONTENT: ${slideText}\n\nSPEAKER NOTES: ${slide.notes || "(none)"}\n\nAnswer the student's question clearly and warmly. Use markdown formatting. Be concise but thorough. If they're confused, simplify. If the slide is in another language (Chinese, Arabic, etc.), you can respond in that language.`;

            const messages = [
              { role: "system" as const, content: systemPrompt },
              ...[...chatMessages, userMsg].slice(-6).map((m) => ({
                role: m.role,
                content: m.content,
              })),
            ];

            let acc = "";
            try {
              await streamChat({
                messages,
                settings: useApp.getState().settings,
                onChunk: (chunk) => {
                  acc += chunk;
                  useApp.setState((state) => ({
                    chatBySubject: {
                      ...state.chatBySubject,
                      [subject.id]: state.chatBySubject[subject.id].map((m) =>
                        m.id === replyId ? { ...m, content: acc } : m,
                      ),
                    },
                  }));
                },
              });

              // Speak the response if voice enabled
              const s = useApp.getState().settings;
              if (s.voiceEnabled && s.voiceProvider === "browser" && acc.trim()) {
                const v = getVoice();
                v.setRate(s.voiceRate);
                // Strip markdown for TTS
                const plain = acc.replace(/[*_`#>]/g, "").replace(/\n+/g, ". ");
                v.speak(plain);
              }
            } catch (e) {
              const errorMsg = `**Couldn't reach the AI.**\n\n${e instanceof Error ? e.message : "Unknown error"}\n\n*Open Settings to check your API key or switch providers.*`;
              useApp.setState((state) => ({
                chatBySubject: {
                  ...state.chatBySubject,
                  [subject.id]: state.chatBySubject[subject.id].map((m) =>
                    m.id === replyId ? { ...m, content: errorMsg } : m,
                  ),
                },
              }));
            }
          }}
        />
      )}
    </div>
  );
}

function ChatPanel({
  subject,
  messages,
  slideIdx,
  onSend,
}: {
  subject: import("@/lib/types").Subject;
  messages: ChatMessage[];
  slideIdx: number;
  onSend: (content: string) => void;
}) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  function handleSend(content?: string) {
    const text = (content || input).trim();
    if (!text) return;
    setInput("");
    onSend(text);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 1300);
  }

  return (
    <div className="w-[440px] shrink-0 flex flex-col bg-bg-panel/40 backdrop-blur-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
        <Dusty size={36} />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-ink">Dusty</div>
          <div className="text-[11px] text-ink-muted">Your AI tutor · Slide {slideIdx + 1}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
          ONLINE
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && <ChatEmptyState />}

        {messages.map((m, i) => (
          <ChatBubble key={m.id} message={m} delay={i * 0.04} />
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <Dusty size={28} variant="thinking" />
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="typing-dot text-accent" />
              <span className="typing-dot text-accent" />
              <span className="typing-dot text-accent" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggestion chips */}
      <div className="px-5 py-3 flex gap-2 flex-wrap border-t border-border-subtle">
        {SUGGESTIONS.slice(0, 4).map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => handleSend(s.prompt)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-[11px] text-ink-dim hover:text-ink hover:border-accent/30 transition-colors"
            >
              <Icon size={11} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-5 pb-4 pt-1">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Dusty anything…"
            className="w-full pl-4 pr-12 py-3 rounded-xl glass-strong text-sm placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-accent text-accent-ink flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-hover transition-all hover:shadow-glow"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="text-[10px] text-ink-faint mt-2 px-1">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message, delay }: { message: ChatMessage; delay: number }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn("flex gap-2", isUser && "flex-row-reverse")}
    >
      {!isUser && <Dusty size={28} />}
      {isUser && (
        <div className="h-7 w-7 shrink-0 rounded-full bg-bg-hover border border-border-subtle flex items-center justify-center text-[10px] font-semibold text-ink">
          You
        </div>
      )}
      <div className={cn("max-w-[85%] group", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed prose-chat",
            isUser
              ? "bg-accent text-accent-ink rounded-tr-sm font-medium"
              : "glass rounded-tl-sm text-ink",
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          )}
        </div>
        {!isUser && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-[10px] text-ink-faint hover:text-accent flex items-center gap-1 transition-colors"
            >
              <Copy size={10} />
              {copied ? "Copied" : "Copy"}
            </button>
            <span className="text-[10px] text-ink-faint">·</span>
            <span className="text-[10px] text-ink-faint">{formatRelativeTime(message.createdAt)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <Dusty size={64} variant="happy" />
      <p className="mt-4 text-sm text-ink-dim font-medium">Hi! I'm Dusty.</p>
      <p className="text-xs text-ink-muted mt-1 max-w-[260px]">
        Ask me anything about this slide, or tap a suggestion below.
      </p>
    </div>
  );
}
