"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Upload, Star, Trash2, MoreHorizontal, Clock } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useApp } from "@/lib/store";
import { parsePptxFile } from "@/lib/parse-pptx-client";
import { Dusty } from "./Dusty";
import { FirstRunBanner } from "./FirstRunBanner";
import { cn, formatRelativeTime } from "@/lib/utils";

// Hoisted Framer Motion config — stable references avoid spurious re-renders
const GRID_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};
const CARD_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 24 };

function extractKeywords(
  slides: { title: string; body?: string; blocks?: { text: string }[] }[],
): string[] {
  const text = slides
    .map((s) => {
      const bodyText = s.blocks ? s.blocks.map((b) => b.text).join(" ") : s.body || "";
      return `${s.title} ${bodyText}`;
    })
    .join(" ")
    .toLowerCase();
  const stop = new Set([
    "the","and","of","to","a","in","is","it","that","for","on","with","as","are","this",
    "an","be","by","from","or","at","which","but","not","have","has","was","were","will",
    "can","may","one","two","three","also","other","some","more","most","such","into","than",
    "they","them","their","there","these","those","when","where","what","how","why","who",
  ]);
  const words = text.match(/[a-z]{4,}/g) || [];
  const counts: Record<string, number> = {};
  for (const w of words) {
    if (stop.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
}

export function LibraryView() {
  const subjects = useApp((s) => s.subjects);
  const openSubject = useApp((s) => s.openSubject);
  const deleteSubject = useApp((s) => s.deleteSubject);
  const toggleFavorite = useApp((s) => s.toggleFavorite);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites" | "recent">("all");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let s = subjects;
    if (filter === "favorites") s = s.filter((x) => x.favorite);
    if (filter === "recent") s = [...s].sort((a, b) => (b.lastStudied || "").localeCompare(a.lastStudied || ""));
    if (search.trim())
      s = s.filter(
        (x) =>
          x.name.toLowerCase().includes(search.toLowerCase()) ||
          x.keywords?.some((k) => k.includes(search.toLowerCase())),
      );
    return s;
  }, [subjects, search, filter]);

  const recent = useMemo(
    () =>
      [...subjects]
        .filter((s) => s.lastStudied)
        .sort((a, b) => (b.lastStudied || "").localeCompare(a.lastStudied || ""))
        .slice(0, 4),
    [subjects],
  );

  function handleUpload(files: FileList | null) {
    if (!files || !files[0]) return;
    const file = files[0];
    setDragOver(false);

    // Parse entirely in the browser — no upload, no server size limits
    parsePptxFile(file)
      .then((data) => {
        const accents = ["#00F5C4", "#A78BFA", "#FF6B9D", "#FBBF24", "#60A5FA", "#34D399"];
        const subjectId = `s-${Date.now()}`;
        const newSubject: import("@/lib/types").Subject = {
          id: subjectId,
          name: data.name,
          slideCount: data.slides.length,
          mastery: 0,
          accentColor: accents[subjects.length % accents.length],
          createdAt: new Date().toISOString(),
          slides: data.slides,
          keywords: extractKeywords(data.slides),
        };
        useApp.getState().addSubject(newSubject);

        // Async: kick off glossary extraction in the background.
        // Best-effort — silently fails if AI unavailable.
        const settings = useApp.getState().settings;
        if (settings.geminiKey) {
          fetch("/api/generate-glossary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slides: data.slides,
              apiKey: settings.geminiKey,
            }),
          })
            .then((r) => r.json())
            .then((g) => {
              if (g.glossary && g.glossary.length > 0) {
                useApp.setState((state) => ({
                  subjects: state.subjects.map((s) =>
                    s.id === subjectId ? { ...s, glossary: g.glossary } : s,
                  ),
                }));
              }
            })
            .catch(() => {});
        }
      })
      .catch((e) => alert(`Could not parse PowerPoint: ${e.message}`));
  }

  return (
    <div
      className="flex-1 overflow-y-auto aurora-bg relative"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-4 z-50 rounded-2xl border-2 border-dashed border-accent flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(0,245,196,0.05)" }}
          >
            <div className="text-center">
              <Upload className="mx-auto mb-3 text-accent" size={48} />
              <div className="font-display text-2xl font-bold text-ink">Drop your PowerPoint</div>
              <div className="text-sm text-ink-muted mt-1">Dusty will start reading it</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-10 py-10 relative z-10">
        {/* First-run banner: prompts for API key if user has none set */}
        <FirstRunBanner />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between gap-6 mb-10"
        >
          <div>
            <div className="text-xs font-semibold tracking-widest text-accent mb-2">
              YOUR LIBRARY
            </div>
            <h1 className="font-display text-display-2 leading-tight">
              Welcome back.<br />
              <span className="text-ink-muted">What are we studying today?</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative overflow-hidden inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-glow-strong"
            >
              <Upload size={16} />
              <span>Add PowerPoint</span>
              <input
                ref={fileRef}
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </button>
          </div>
        </motion.div>

        {/* Recent strip */}
        {recent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold tracking-widest text-ink-faint">
              <Clock size={12} />
              <span>JUMP BACK IN</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {recent.map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={() => openSubject(s.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ y: -2 }}
                  className="group relative overflow-hidden text-left rounded-lg glass p-4 hover:border-accent/40 transition-all"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: s.accentColor }}
                  />
                  <div className="text-sm font-semibold text-ink truncate group-hover:text-accent transition-colors">
                    {s.name}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {s.lastStudied && formatRelativeTime(s.lastStudied)}
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-bg-hover overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.mastery * 100}%`, background: s.accentColor }}
                    />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects, keywords…"
              className="w-full pl-9 pr-3 py-2 rounded-md glass text-sm placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-md glass">
            {(["all", "favorites", "recent"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-all",
                  filter === f
                    ? "bg-accent/15 text-accent"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {f === "all" ? "All" : f === "favorites" ? "★ Favorites" : "Recent"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState onUpload={() => fileRef.current?.click()} />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={GRID_VARIANTS}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                onOpen={() => openSubject(s.id)}
                onFavorite={() => toggleFavorite(s.id)}
                onDelete={() => {
                  if (confirm(`Delete "${s.name}"? This can't be undone.`)) deleteSubject(s.id);
                }}
              />
            ))}
            <AddCard onClick={() => fileRef.current?.click()} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  onOpen,
  onFavorite,
  onDelete,
}: {
  subject: import("@/lib/types").Subject;
  onOpen: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pct = Math.round(subject.mastery * 100);

  return (
    <motion.div
      variants={CARD_VARIANTS}
      whileHover={{ y: -4 }}
      transition={CARD_TRANSITION}
      className="group relative"
    >
      <button
        onClick={onOpen}
        className="w-full text-left rounded-xl glass overflow-hidden border hover:border-border-strong transition-colors"
      >
        {/* Gradient header */}
        <div
          className="h-24 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${subject.accentColor}, ${subject.accentColor}80)`,
          }}
        >
          {/* Decorative grid */}
          <svg
            className="absolute inset-0 w-full h-full opacity-20 mix-blend-overlay"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id={`grid-${subject.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${subject.id})`} />
          </svg>
          {/* Slide count chip */}
          <div className="absolute bottom-3 left-4">
            <div className="text-xs font-mono font-semibold text-white/90 bg-black/20 backdrop-blur-sm rounded px-2 py-0.5">
              {subject.slideCount} slides
            </div>
          </div>
          {subject.favorite && (
            <div className="absolute top-3 right-3">
              <Star size={14} className="text-white fill-white drop-shadow" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold text-ink leading-tight line-clamp-2 min-h-[3.5rem]">
            {subject.name}
          </h3>

          {/* Keywords */}
          {subject.keywords && subject.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 min-h-[1.5rem]">
              {subject.keywords.slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-hover text-ink-muted"
                >
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Mastery */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-ink-faint">Mastery</span>
              <span className="text-ink font-semibold">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="h-full rounded-full"
                style={{
                  background: subject.accentColor,
                  boxShadow: `0 0 8px ${subject.accentColor}`,
                }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Hover actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="h-7 w-7 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          title={subject.favorite ? "Unfavorite" : "Favorite"}
        >
          <Star size={12} className={subject.favorite ? "fill-current" : ""} />
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="h-7 w-7 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <MoreHorizontal size={12} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onMouseLeave={() => setMenuOpen(false)}
                className="absolute top-9 right-0 w-40 glass-strong rounded-md p-1 z-20 inner-highlight"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-danger hover:bg-danger/10 rounded transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      variants={CARD_VARIANTS}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      className="group relative rounded-xl border-2 border-dashed border-border hover:border-accent/60 hover:bg-accent-soft transition-all flex flex-col items-center justify-center text-center p-8 min-h-[268px]"
    >
      <div className="h-12 w-12 rounded-full bg-bg-hover flex items-center justify-center text-ink-muted group-hover:text-accent group-hover:bg-accent-soft transition-colors mb-3">
        <Upload size={20} />
      </div>
      <div className="font-display font-semibold text-ink-dim group-hover:text-ink transition-colors">
        Add a PowerPoint
      </div>
      <div className="text-xs text-ink-faint mt-1">Drag & drop or click</div>
    </motion.button>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-20">
      <Dusty size={120} variant="thinking" alive />
      <h3 className="font-display text-2xl font-semibold mt-6">
        Hmm, no subjects yet.
      </h3>
      <p className="text-ink-muted mt-2 max-w-md">
        Drop a PowerPoint anywhere on this page, or use the button below.
        Dusty will read it and become your personal tutor.
      </p>
      <button
        onClick={onUpload}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-accent-ink font-semibold text-sm hover:bg-accent-hover transition-all hover:shadow-glow-strong"
      >
        <Upload size={16} />
        Add your first lecture
      </button>
    </div>
  );
}
