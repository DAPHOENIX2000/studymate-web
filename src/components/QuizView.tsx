"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Check, X, ArrowRight, Flame, Zap, Trophy } from "lucide-react";
import { useApp } from "@/lib/store";
import { Dusty } from "./Dusty";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { MOCK_QUESTIONS } from "@/lib/mock-data";
import type { QuizQuestion } from "@/lib/types";

export function QuizView() {
  const subject = useApp((s) => s.subjects.find((x) => x.id === s.currentSubjectId));
  const questions =
    useApp((s) => (s.currentSubjectId ? s.questionsBySubject[s.currentSubjectId] : undefined)) ??
    [];
  const answered = useApp((s) => s.answeredInSession);
  const sessionCorrect = useApp((s) => s.quizSessionCorrect);
  const sessionTotal = useApp((s) => s.quizSessionTotal);
  const recordAnswer = useApp((s) => s.recordQuizAnswer);
  const markAnswered = useApp((s) => s.markAnswered);
  const resetSession = useApp((s) => s.resetQuizSession);
  const addQuestions = useApp((s) => s.addQuestions);

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    resetSession();
  }, [resetSession]);

  // Pick the next question we haven't answered yet
  const question = useMemo(() => {
    const unanswered = questions.filter((q) => !answered.has(q.id));
    return unanswered[0] || null;
  }, [questions, answered]);

  // Auto-generate MORE questions only when running low mid-session (not on first open)
  useEffect(() => {
    if (!subject || generating) return;
    const unansweredCount = questions.filter((q) => !answered.has(q.id)).length;
    // Only auto-refill when user has already answered some and is running low
    if (questions.length > 0 && unansweredCount < 3) {
      generateQuestions();
    }
  }, [subject, questions, answered, generating]);

  function generateQuestions() {
    if (!subject || generating) return;
    const apiKey = useApp.getState().settings.geminiKey;
    if (!apiKey) return;
    setGenerating(true);

    // Limit slides & text to keep payload small and fast
    const slides = (subject.slides || []).slice(0, 20).map((s: any) => ({
      title: s.title,
      blocks: (s.blocks || []).slice(0, 8).map((b: any) => ({
        text: String(b.text || "").slice(0, 200),
      })),
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000); // 40s client timeout

    fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides, apiKey, count: 8 }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.questions?.length > 0) addQuestions(subject.id, data.questions);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setGenerating(false); });
  }

  if (!subject) return null;

  // No questions yet — show start button (don't auto-generate)
  if (questions.length === 0 && !generating) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center max-w-sm">
          <Dusty size={110} variant="curious" />
          <h3 className="font-display text-2xl mt-5">Ready to be quizzed?</h3>
          <p className="text-ink-muted mt-2 text-sm">
            Dusty will generate questions from your slides. Takes about 15 seconds.
          </p>
          {!useApp.getState().settings.geminiKey ? (
            <p className="text-rose-400 mt-4 text-sm">Add a Gemini API key in Settings first.</p>
          ) : (
            <button
              onClick={generateQuestions}
              className="mt-6 px-6 py-3 rounded-full bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-glow-strong"
            >
              Generate Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  if (generating && questions.length === 0) return <QuizLoading />;

  if (!question) {
    return generating ? <QuizLoading /> : <QuizAllDone onReset={() => resetSession()} />;
  }

  const isCorrect = selected === question.correctAnswer;

  function handleSubmit() {
    if (!selected || !question) return;
    setSubmitted(true);
    recordAnswer(isCorrect);
    markAnswered(question.id);
    if (isCorrect) {
      setStreak((s) => s + 1);
      const gained = 10 + streak * 2;
      setXp((x) => x + gained);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00F5C4", "#5FFFD9", "#FF6B9D", "#FBBF24"],
      });
    } else {
      setStreak(0);
    }
  }

  function handleNext() {
    setSubmitted(false);
    setSelected(null);
    // Next question is picked automatically via the `question` memo
  }

  const xpToNext = 100;
  const xpPct = (xp % xpToNext) / xpToNext;
  const level = Math.floor(xp / xpToNext) + 1;

  return (
    <div className="flex-1 overflow-y-auto aurora-bg">
      <div className="max-w-3xl mx-auto px-10 py-10">
        {/* HUD */}
        <div className="flex items-center gap-3 mb-8">
          <div className="text-xs font-semibold tracking-widest text-accent">
            QUIZ · {subject.name.toUpperCase()}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatTile
            icon={Trophy}
            label="Level"
            value={`${level}`}
            sub={`${Math.round(xpPct * 100)}% to next`}
            progress={xpPct}
            color="#FBBF24"
          />
          <StatTile
            icon={Flame}
            label="Streak"
            value={`${streak}`}
            sub={streak > 0 ? "On fire!" : "Get one right"}
            color="#FF6B9D"
            highlight={streak >= 3}
          />
          <StatTile
            icon={Zap}
            label="Session"
            value={`${sessionCorrect}/${sessionTotal}`}
            sub={sessionTotal > 0 ? `${Math.round((sessionCorrect / sessionTotal) * 100)}% accuracy` : "Just started"}
            color="#00F5C4"
          />
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="glass-strong rounded-2xl inner-highlight p-8"
          >
            {/* Difficulty + topic pills */}
            <div className="flex items-center gap-2 mb-5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                  question.difficulty === 1 && "bg-success-soft text-success",
                  question.difficulty === 2 && "bg-accent-soft text-accent",
                  question.difficulty === 3 && "bg-rose-soft text-rose",
                )}
              >
                {question.difficulty === 1 ? "Easy" : question.difficulty === 2 ? "Medium" : "Hard"}
              </span>
              <span className="text-[11px] text-ink-muted">·</span>
              <span className="text-[11px] text-ink-muted">{question.topic}</span>
              <span className="text-[11px] text-ink-muted">·</span>
              <span className="text-[11px] text-ink-muted uppercase tracking-wider">
                {question.type === "mcq" ? "Multiple choice" : "True / false"}
              </span>
            </div>

            <h2 className="font-display text-2xl font-semibold leading-snug mb-8">
              {question.question}
            </h2>

            {/* Options */}
            <div className="space-y-2">
              {question.options.map((opt, i) => (
                <Option
                  key={opt}
                  text={opt}
                  index={i}
                  selected={selected === opt}
                  submitted={submitted}
                  correct={opt === question.correctAnswer}
                  onClick={() => !submitted && setSelected(opt)}
                />
              ))}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-border-subtle flex gap-3">
                    <Dusty
                      size={36}
                      variant={isCorrect ? "love" : "sad"}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "font-semibold text-sm mb-1",
                          isCorrect ? "text-success" : "text-rose",
                        )}
                      >
                        {isCorrect
                          ? `Correct! +${10 + (streak - 1) * 2} XP`
                          : `Not quite — the answer was "${question.correctAnswer}"`}
                      </div>
                      <p className="text-sm text-ink-dim leading-relaxed">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex justify-end mt-6">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-glow-strong"
            >
              <Check size={14} />
              Submit answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-glow-strong"
            >
              Next question
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  color,
  progress,
  highlight,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  sub: string;
  color: string;
  progress?: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      animate={highlight ? { scale: [1, 1.04, 1] } : {}}
      transition={{ duration: 0.6 }}
      className="glass rounded-xl p-4 relative overflow-hidden"
    >
      {highlight && (
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(circle at center, ${color}40, transparent 70%)` }}
        />
      )}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} style={{ color }} />
          <span className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
            {label}
          </span>
        </div>
        <div className="font-display text-2xl font-bold text-ink">{value}</div>
        <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>
        {progress !== undefined && (
          <div className="mt-2 h-1 rounded-full bg-bg-hover overflow-hidden">
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Option({
  text,
  index,
  selected,
  submitted,
  correct,
  onClick,
}: {
  text: string;
  index: number;
  selected: boolean;
  submitted: boolean;
  correct: boolean;
  onClick: () => void;
}) {
  const letter = ["A", "B", "C", "D", "E"][index];
  const state = !submitted
    ? selected
      ? "selected"
      : "idle"
    : correct
      ? "correct"
      : selected
        ? "wrong"
        : "muted";

  return (
    <motion.button
      onClick={onClick}
      whileHover={!submitted ? { x: 4 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3.5 rounded-lg border-2 text-left transition-all group",
        state === "idle" && "border-border-subtle hover:border-border-strong bg-bg-card",
        state === "selected" && "border-accent bg-accent-soft",
        state === "correct" && "border-success bg-success-soft",
        state === "wrong" && "border-rose bg-rose-soft",
        state === "muted" && "border-border-subtle bg-bg-card opacity-40",
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-colors",
          state === "idle" && "bg-bg-hover text-ink-muted group-hover:text-ink",
          state === "selected" && "bg-accent text-accent-ink",
          state === "correct" && "bg-success text-white",
          state === "wrong" && "bg-rose text-white",
          state === "muted" && "bg-bg-hover text-ink-faint",
        )}
      >
        {state === "correct" ? <Check size={14} /> : state === "wrong" ? <X size={14} /> : letter}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          state === "muted" ? "text-ink-faint" : "text-ink",
        )}
      >
        {text}
      </span>
    </motion.button>
  );
}

function QuizLoading() {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center">
        <Dusty size={100} variant="thinking" />
        <h3 className="font-display text-2xl mt-4">Crafting your questions…</h3>
        <p className="text-ink-muted mt-2 max-w-md mx-auto">
          Dusty is reading your slides and generating fresh quiz questions.
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

function QuizAllDone({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center">
        <Dusty size={100} variant="happy" glow />
        <h3 className="font-display text-2xl mt-4">All caught up! 🎉</h3>
        <p className="text-ink-muted mt-2 max-w-md mx-auto">
          You've answered every question in the bank. Come back later — Dusty is brewing more.
        </p>
        <button
          onClick={onReset}
          className="mt-6 px-5 py-2 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-glow-strong"
        >
          Reset session and review again
        </button>
      </div>
    </div>
  );
}
