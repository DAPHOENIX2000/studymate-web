"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { RefreshCcw, Brain, Eye } from "lucide-react";
import { useApp } from "@/lib/store";
import { Dusty } from "./Dusty";
import { cn } from "@/lib/utils";

const QUALITY_BUTTONS = [
  { label: "Again", sub: "Forgot", quality: 1, color: "#F43F5E", interval: "<1 day" },
  { label: "Hard", sub: "Struggled", quality: 3, color: "#FBBF24", interval: "1 day" },
  { label: "Good", sub: "Recalled", quality: 4, color: "#00F5C4", interval: "3 days" },
  { label: "Easy", sub: "Instant", quality: 5, color: "#60A5FA", interval: "6 days" },
];

export function FlashcardsView() {
  const subject = useApp((s) => s.subjects.find((x) => x.id === s.currentSubjectId));
  const subjectId = useApp((s) => s.currentSubjectId);
  const cards = useApp((s) => (s.currentSubjectId ? s.flashcardsBySubject[s.currentSubjectId] : undefined)) ?? [];
  const addFlashcards = useApp((s) => s.addFlashcards);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Auto-generate flashcards when there are none for this subject
  useEffect(() => {
    if (!subject || !subjectId || cards.length > 0 || generating) return;
    if (!subject.slides || subject.slides.length === 0) return;
    const apiKey = useApp.getState().settings.geminiKey;
    if (!apiKey) return;

    setGenerating(true);
    setGenError(null);
    fetch("/api/generate-flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slides: subject.slides,
        apiKey,
        cardsPerSlide: 2,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.flashcards && data.flashcards.length > 0) {
          addFlashcards(subjectId, data.flashcards);
        } else {
          setGenError(data.error || "No flashcards generated — try again.");
        }
      })
      .catch((e) => setGenError(e.message || "Failed to generate flashcards."))
      .finally(() => setGenerating(false));
  }, [subject, subjectId, cards.length, generating, addFlashcards]);

  if (!subject) return null;

  if (generating) return <FlashcardsGenerating slideCount={subject.slides?.length ?? 0} />;

  if (genError) return <FlashcardsError error={genError} onRetry={() => setGenError(null)} />;

  if (cards.length === 0) {
    // No slides loaded or no API key
    if (!subject.slides || subject.slides.length === 0) return <FlashcardsNoSlides />;
    if (!useApp.getState().settings.geminiKey) return <FlashcardsNeedKey />;
    return <FlashcardsEmpty />;
  }

  const card = cards[idx % cards.length];
  const remaining = cards.length - reviewed;

  function handleQuality() {
    setFlipped(false);
    setTimeout(() => {
      setIdx((i) => i + 1);
      setReviewed((r) => r + 1);
    }, 250);
  }

  return (
    <div className="flex-1 overflow-y-auto aurora-bg">
      <div className="max-w-2xl mx-auto px-10 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs font-semibold tracking-widest text-accent mb-2">
              FLASHCARDS · {subject.name.toUpperCase()}
            </div>
            <h1 className="font-display text-h1">Memory check</h1>
          </div>
          <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
            <Brain size={12} className="text-accent" />
            <span className="text-xs font-semibold text-ink">{remaining} in queue</span>
          </div>
        </div>

        {/* Card stack */}
        <div className="relative h-[380px] perspective-1000 mb-6">
          {/* Background stack hint */}
          <motion.div
            className="absolute inset-0 rounded-2xl glass border border-border-subtle"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 0.96, y: 12 }}
            style={{ opacity: 0.4 }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl glass border border-border-subtle"
            initial={{ scale: 0.98, y: 6 }}
            animate={{ scale: 0.98, y: 6 }}
            style={{ opacity: 0.6 }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 cursor-pointer"
                onClick={() => setFlipped((f) => !f)}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Front */}
                <CardFace side="front">
                  <div className="text-[10px] font-semibold tracking-widest text-accent mb-4">
                    QUESTION · TAP TO REVEAL
                  </div>
                  <p className="font-display text-3xl font-medium text-ink leading-snug">
                    {card.front}
                  </p>
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs text-ink-faint">
                    <span>Slide {card.slideIndex}</span>
                    <span className="flex items-center gap-1.5">
                      <Eye size={12} />
                      Tap to flip
                    </span>
                  </div>
                </CardFace>

                {/* Back */}
                <CardFace side="back">
                  <div className="text-[10px] font-semibold tracking-widest text-rose mb-4">
                    ANSWER
                  </div>
                  <p className="text-xl text-ink leading-relaxed">{card.back}</p>
                  <div className="absolute bottom-6 left-6 right-6 flex items-center gap-1.5 text-xs text-ink-faint">
                    <RefreshCcw size={12} />
                    <span>How well did you know it?</span>
                  </div>
                </CardFace>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quality buttons */}
        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-4 gap-2"
            >
              {QUALITY_BUTTONS.map((b) => (
                <button
                  key={b.label}
                  onClick={handleQuality}
                  className="group glass rounded-lg p-3 text-left hover:bg-bg-hover transition-all"
                  style={{ borderLeft: `3px solid ${b.color}` }}
                >
                  <div className="text-sm font-bold text-ink">{b.label}</div>
                  <div className="text-[10px] text-ink-muted mt-0.5">{b.sub}</div>
                  <div
                    className="text-[10px] font-mono mt-2 opacity-70 group-hover:opacity-100"
                    style={{ color: b.color }}
                  >
                    next: {b.interval}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!flipped && (
          <div className="text-center text-xs text-ink-faint">
            Try to recall the answer, then tap the card.
          </div>
        )}
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1500px;
        }
      `}</style>
    </div>
  );
}

function CardFace({ side, children }: { side: "front" | "back"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 rounded-2xl p-8 flex flex-col items-start justify-center inner-highlight",
        side === "front" ? "glass-strong" : "glass-strong",
      )}
      style={{
        backfaceVisibility: "hidden",
        transform: side === "back" ? "rotateY(180deg)" : "none",
        background:
          side === "back"
            ? "linear-gradient(135deg, rgba(255,107,157,0.08), rgba(0,245,196,0.05))"
            : undefined,
      }}
    >
      {children}
    </div>
  );
}

function FlashcardsGenerating({ slideCount }: { slideCount: number }) {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center">
        <Dusty size={100} variant="thinking" alive />
        <h3 className="font-display text-2xl mt-4">Building your flashcard deck…</h3>
        <p className="text-ink-muted mt-2 max-w-md mx-auto">
          Dusty is reading all {slideCount} slides and writing flashcards for each one. This takes about 15–30 seconds.
        </p>
        <div className="mt-5 flex justify-center gap-1.5 text-accent">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function FlashcardsError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center max-w-md">
        <Dusty size={100} variant="sad" />
        <h3 className="font-display text-2xl mt-4">Couldn't generate flashcards</h3>
        <p className="text-rose-400 mt-2 text-sm">{error}</p>
        <button
          onClick={onRetry}
          className="mt-6 px-5 py-2 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function FlashcardsNeedKey() {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center max-w-md">
        <Dusty size={100} variant="curious" />
        <h3 className="font-display text-2xl mt-4">Add a Gemini API key first</h3>
        <p className="text-ink-muted mt-2 text-sm">
          Flashcards are generated by AI. Go to <strong>Settings → Google Gemini</strong> and paste your free API key, then come back here.
        </p>
      </div>
    </div>
  );
}

function FlashcardsNoSlides() {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center max-w-md">
        <Dusty size={100} variant="curious" />
        <h3 className="font-display text-2xl mt-4">Slides not loaded</h3>
        <p className="text-ink-muted mt-2 text-sm">
          Head back to the Library and re-upload the PowerPoint to generate flashcards.
        </p>
      </div>
    </div>
  );
}

function FlashcardsEmpty() {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center">
        <Dusty size={100} variant="happy" />
        <h3 className="font-display text-2xl mt-4">All caught up! 🎉</h3>
        <p className="text-ink-muted mt-2 max-w-md mx-auto">
          No flashcards due right now. Come back tomorrow — spaced repetition will schedule the
          next batch.
        </p>
      </div>
    </div>
  );
}
