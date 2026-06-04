"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useRef } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import type { GlossaryTerm } from "@/lib/types";
import { useApp } from "@/lib/store";
import { streamChat } from "@/lib/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface HoverGlossaryProps {
  text: string;
  glossary?: GlossaryTerm[];
  accentColor: string;
  lang?: string;
}

/**
 * Wraps text. If any glossary term appears, it becomes a hoverable span that
 * shows a popover with the definition + "Tell me more" button.
 *
 * Be conservative: only mark terms 4+ chars long, only first occurrence per text.
 */
export function HoverGlossary({ text, glossary, accentColor, lang }: HoverGlossaryProps) {
  // Build the segments: alternating plain text + glossary terms
  const segments = useMemo(() => {
    if (!glossary || glossary.length === 0) {
      return [{ text, term: null as GlossaryTerm | null }];
    }
    // Sort terms by length descending so longer ones match first (avoid "AI" matching inside "AIDS")
    const sorted = [...glossary].sort((a, b) => b.term.length - a.term.length);
    const segs: { text: string; term: GlossaryTerm | null }[] = [];
    let remaining = text;
    const used = new Set<string>();

    while (remaining.length > 0) {
      let matchIdx = -1;
      let matchTerm: GlossaryTerm | null = null;
      let matchLen = 0;

      for (const term of sorted) {
        if (used.has(term.term.toLowerCase())) continue;
        if (term.term.length < 3) continue;
        // Whole-word case-insensitive match
        const re = new RegExp(`\\b${escapeRe(term.term)}\\b`, "i");
        const m = remaining.match(re);
        if (m && m.index !== undefined) {
          if (matchIdx === -1 || m.index < matchIdx) {
            matchIdx = m.index;
            matchTerm = term;
            matchLen = m[0].length;
          }
        }
      }

      if (matchIdx === -1 || !matchTerm) {
        segs.push({ text: remaining, term: null });
        break;
      }

      if (matchIdx > 0) segs.push({ text: remaining.slice(0, matchIdx), term: null });
      segs.push({
        text: remaining.slice(matchIdx, matchIdx + matchLen),
        term: matchTerm,
      });
      used.add(matchTerm.term.toLowerCase());
      remaining = remaining.slice(matchIdx + matchLen);
    }

    return segs;
  }, [text, glossary]);

  return (
    <span lang={lang}>
      {segments.map((s, i) =>
        s.term ? (
          <GlossaryWord key={i} segment={s.text} term={s.term} accentColor={accentColor} />
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}

function GlossaryWord({
  segment,
  term,
  accentColor,
}: {
  segment: string;
  term: GlossaryTerm;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help underline decoration-dotted decoration-1 underline-offset-[3px] transition-colors"
        style={{ textDecorationColor: `${accentColor}80` }}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
      >
        {segment}
      </span>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 max-w-[min(90vw,18rem)] p-3 rounded-lg shadow-2xl border bg-bg-elevated text-left"
            style={{
              borderColor: `${accentColor}40`,
              boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 20px ${accentColor}20`,
            }}
          >
            <div
              className="text-[10px] font-bold tracking-widest mb-1 flex items-center gap-1.5"
              style={{ color: accentColor }}
            >
              <Sparkles size={9} />
              {term.term.toUpperCase()}
            </div>
            <div className="text-[13px] leading-snug text-ink mb-2">{term.definition}</div>
            <button
              onClick={(e) => {
                e.preventDefault();
                askDusty(term.term);
                setOpen(false);
              }}
              className="text-[11px] font-semibold flex items-center gap-1 hover:underline"
              style={{ color: accentColor }}
            >
              Tell me more <ExternalLink size={9} />
            </button>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Helper to push a "tell me more about X" message into the current chat. */
function askDusty(term: string) {
  // Look up current subject from store
  const state = useApp.getState();
  if (!state.currentSubjectId) return;
  const msg = {
    id: `m${Date.now()}`,
    role: "user" as const,
    content: `Tell me more about "${term}"`,
    createdAt: new Date().toISOString(),
  };
  state.addChatMessage(state.currentSubjectId, msg);

  // Trigger a chat reply
  const subject = state.subjects.find((s) => s.id === state.currentSubjectId);
  if (!subject) return;

  const replyId = `m${Date.now() + 1}`;
  state.addChatMessage(state.currentSubjectId, {
    id: replyId,
    role: "assistant",
    content: "",
    createdAt: new Date().toISOString(),
  });

  let acc = "";
  streamChat({
    settings: state.settings,
    messages: [
      {
        role: "system",
        content: `You are Dusty, an AI tutor. The student is studying "${subject.name}". Explain the term they ask about clearly and concisely, with examples.`,
      },
      { role: "user", content: `Tell me more about "${term}"` },
    ],
    onChunk: (chunk) => {
      acc += chunk;
      useApp.setState((s) => ({
        chatBySubject: {
          ...s.chatBySubject,
          [state.currentSubjectId!]: (s.chatBySubject[state.currentSubjectId!] || []).map((m) =>
            m.id === replyId ? { ...m, content: acc } : m,
          ),
        },
      }));
    },
  }).catch((e) => {
    useApp.setState((s) => ({
      chatBySubject: {
        ...s.chatBySubject,
        [state.currentSubjectId!]: (s.chatBySubject[state.currentSubjectId!] || []).map((m) =>
          m.id === replyId
            ? { ...m, content: `**Couldn't reach AI.** ${e instanceof Error ? e.message : "Unknown error"}` }
            : m,
        ),
      },
    }));
  });
}
