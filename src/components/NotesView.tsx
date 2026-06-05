"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useApp } from "@/lib/store";
import { Dusty } from "./Dusty";

export function NotesView() {
  const subject = useApp((s) => s.subjects.find((x) => x.id === s.currentSubjectId));
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subject) return;
    if (!subject.slides || subject.slides.length === 0) return; // slides not loaded
    const apiKey = useApp.getState().settings.geminiKey;
    if (!apiKey || notes) return;
    generate(subject.slides, apiKey);
  }, [subject?.id]); // only re-run when subject changes, not on every render

  function generate(slides: any[], apiKey: string) {
    setLoading(true);
    setError(null);
    fetch("/api/generate-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides, apiKey }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.notes) setNotes(data.notes);
        else setError(data.error || "Could not generate notes — try again.");
      })
      .catch((e) => {
        if (e?.name === "AbortError") setError("Timed out — try again.");
        else setError("Failed to reach Gemini. Check your API key in Settings.");
      })
      .finally(() => setLoading(false));
  }

  function downloadNotes() {
    if (!notes || !subject) return;
    const blob = new Blob([notes], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${subject.name} — Study Notes.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!subject) return null;

  if (!subject.slides || subject.slides.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center max-w-sm px-6">
          <Dusty size={90} variant="sleepy" />
          <h3 className="font-display text-xl mt-4">Slides not loaded</h3>
          <p className="text-ink-muted mt-2 text-sm">
            Slides aren't saved between sessions. Go to <strong>Library</strong> and re-upload your PowerPoint or PDF — then come back here.
          </p>
        </div>
      </div>
    );
  }

  if (!useApp.getState().settings.geminiKey) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center">
          <Dusty size={90} variant="curious" />
          <h3 className="font-display text-xl mt-4">Add a Gemini API key first</h3>
          <p className="text-ink-muted mt-2 text-sm">Go to Settings → Google Gemini.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center">
          <Dusty size={90} variant="thinking" />
          <h3 className="font-display text-xl mt-4">Writing your study notes…</h3>
          <p className="text-ink-muted mt-2 text-sm max-w-xs mx-auto">
            Dusty is reading all {subject.slides.length} slides and crafting comprehensive notes. ~20 seconds.
          </p>
          <div className="mt-4 flex justify-center gap-1.5 text-accent">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center">
          <Dusty size={90} variant="sad" />
          <h3 className="font-display text-xl mt-4">Couldn't generate notes</h3>
          <p className="text-rose-400 mt-2 text-sm max-w-sm mx-auto">{error}</p>
          {error?.includes("429") || error?.includes("Rate limit") || error?.includes("busy") ? (
            <p className="text-ink-muted mt-2 text-xs max-w-xs mx-auto">
              Gemini's free tier allows ~15 requests/minute. Wait 1-2 minutes, then try again.
            </p>
          ) : null}
          <button
            onClick={() => generate(subject.slides, useApp.getState().settings.geminiKey)}
            className="mt-4 px-4 py-2 rounded-md bg-accent text-accent-ink font-semibold text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto aurora-bg">
      <div className="max-w-3xl mx-auto px-10 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="text-xs font-semibold tracking-widest text-accent mb-1">
              NOTES · {subject.name.toUpperCase()}
            </div>
            <h1 className="font-display text-h1">Study Notes</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setNotes(""); generate(subject.slides, useApp.getState().settings.geminiKey); }}
              className="h-9 px-3 rounded-md text-sm flex items-center gap-2 glass border border-border-subtle text-ink-muted hover:text-ink transition-all"
            >
              <RefreshCcw size={14} /> Regenerate
            </button>
            <button
              onClick={downloadNotes}
              className="h-9 px-3 rounded-md text-sm flex items-center gap-2 bg-accent text-accent-ink font-semibold transition-all hover:bg-accent-hover"
            >
              <Download size={14} /> Download .md
            </button>
          </div>
        </motion.div>

        {/* Notes content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl inner-highlight p-8"
        >
          <div className="prose-notes">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .prose-notes :global(h2) {
          font-family: "Satoshi", "Inter", sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #f5f7fa;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .prose-notes :global(h3) {
          font-size: 1rem;
          font-weight: 600;
          color: #c7ccd8;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .prose-notes :global(p) {
          color: #c7ccd8;
          line-height: 1.75;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        .prose-notes :global(ul), .prose-notes :global(ol) {
          padding-left: 1.25rem;
          margin: 0.5rem 0 1rem;
        }
        .prose-notes :global(li) {
          color: #c7ccd8;
          font-size: 0.95rem;
          line-height: 1.7;
          margin-bottom: 0.25rem;
        }
        .prose-notes :global(strong) {
          color: #f5f7fa;
          font-weight: 600;
        }
        .prose-notes :global(code) {
          background: rgba(255,255,255,0.08);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: "JetBrains Mono", monospace;
        }
        .prose-notes :global(blockquote) {
          border-left: 3px solid #00F5C4;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #8a93a6;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
