"use client";
import { motion } from "framer-motion";
import { Quote, Sparkles } from "lucide-react";
import type { Slide, SlideBlock, GlossaryTerm } from "@/lib/types";
import { HoverGlossary } from "./HoverGlossary";
import { cn } from "@/lib/utils";

interface SlideRendererProps {
  slide: Slide;
  index: number;
  total: number;
  accentColor: string;
  zoom: number;
  /** Optional glossary for hover-to-explain */
  glossary?: GlossaryTerm[];
}

/**
 * The headline visual change. Instead of dumping slide.body as raw paragraphs,
 * we render each PPT element with type-appropriate styling:
 *   - title  → giant Satoshi display
 *   - subheading (ends in ":")  → tinted label
 *   - bullet  → icon + indented body
 *   - numbered  → big accented number circle + body (card style)
 *   - quote  → blockquote with quote mark
 *   - body  → readable serif-style paragraph
 *
 * Images are rendered at the bottom as a responsive gallery.
 */
export function SlideRenderer({ slide, index, total, accentColor, zoom, glossary }: SlideRendererProps) {
  if (!slide) return null; // defensive — caller should never pass undefined but be safe
  // Build groups: contiguous bullets/numbered get grouped into a list element
  const groups = groupBlocks(slide.blocks || []);

  // Detect what KIND of slide this is from the content shape
  const layout = detectLayout(slide);

  return (
    <div
      className="max-w-4xl mx-auto px-12 py-12"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
    >
      {/* Slide number pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-card border border-border-subtle text-xs text-ink-muted mb-6">
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse-glow"
          style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
        />
        Slide {index + 1} of {total} · {layout}
      </div>

      {/* Title with gradient accent underline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-10"
      >
        <h2
          className="font-display text-[2.75rem] leading-[1.1] font-bold tracking-tight"
          style={{ color: "#F5F7FA" }}
          lang={detectLang(slide.title)}
        >
          {slide.title}
        </h2>
        <div
          className="mt-4 h-[3px] w-16 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, transparent)`,
            boxShadow: `0 0 12px ${accentColor}80`,
          }}
        />
      </motion.div>

      {/* Real images from the .pptx — top of slide for visual hook */}
      {slide.images && slide.images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={cn(
            "mb-10 grid gap-3",
            slide.images.length === 1 && "grid-cols-1",
            slide.images.length === 2 && "grid-cols-2",
            slide.images.length >= 3 && "grid-cols-2 lg:grid-cols-3",
          )}
        >
          {slide.images.slice(0, 6).map((img, i) => (
            <div
              key={i}
              className="relative rounded-lg overflow-hidden border border-border-subtle bg-bg-card"
              style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.3)` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt || `Slide ${index + 1} image ${i + 1}`}
                className="w-full h-auto block"
              />
            </div>
          ))}
        </motion.div>
      )}

      {/* Content blocks */}
      <div className="space-y-5">
        {groups.map((g, gi) => (
          <BlockGroup key={gi} group={g} accentColor={accentColor} delay={0.05 * gi} glossary={glossary} />
        ))}
      </div>

      {/* Decorative concept card when slide is otherwise short */}
      {groups.length <= 1 && (!slide.images || slide.images.length === 0) && (
        <DecorativeCard title={slide.title} accentColor={accentColor} />
      )}

      {/* Speaker notes */}
      {slide.notes && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t border-border-subtle"
        >
          <div className="text-[10px] font-semibold tracking-[0.15em] text-ink-faint mb-3 flex items-center gap-1.5">
            <Sparkles size={10} />
            SPEAKER NOTES
          </div>
          <p
            className="text-[15px] italic leading-[1.7] text-ink-muted"
            lang={detectLang(slide.notes)}
          >
            {slide.notes}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ── Grouping ─────────────────────────────────────────────────────────
type Group =
  | { type: "list"; items: SlideBlock[]; numbered: boolean }
  | { type: "block"; block: SlideBlock };

function groupBlocks(blocks: SlideBlock[]): Group[] {
  const groups: Group[] = [];
  let current: SlideBlock[] = [];
  let currentKind: "bullet" | "numbered" | null = null;

  function flush() {
    if (current.length > 0 && currentKind) {
      groups.push({ type: "list", items: current, numbered: currentKind === "numbered" });
      current = [];
      currentKind = null;
    }
  }

  for (const b of blocks) {
    if (b.kind === "bullet" || b.kind === "numbered") {
      if (currentKind && currentKind !== b.kind) flush();
      currentKind = b.kind;
      current.push(b);
    } else {
      flush();
      groups.push({ type: "block", block: b });
    }
  }
  flush();
  return groups;
}

// ── Layout detection (for the pill label only) ──────────────────────
function detectLayout(slide: Slide): string {
  const blocks = slide.blocks || [];
  if (blocks.length === 0) return "cover";
  const hasNumbered = blocks.some((b) => b.kind === "numbered");
  const hasBullet = blocks.some((b) => b.kind === "bullet");
  const hasQuote = blocks.some((b) => b.kind === "quote");
  if (hasNumbered) return "steps";
  if (hasBullet) return "list";
  if (hasQuote) return "quote";
  if (slide.images && slide.images.length > 0) return "visual";
  if (blocks.length === 1 && blocks[0].text.length < 100) return "statement";
  return "content";
}

// ── Block group rendering ───────────────────────────────────────────
function BlockGroup({
  group,
  accentColor,
  delay,
  glossary,
}: {
  group: Group;
  accentColor: string;
  delay: number;
  glossary?: GlossaryTerm[];
}) {
  if (group.type === "list") {
    return group.numbered ? (
      <NumberedList items={group.items} accentColor={accentColor} delay={delay} glossary={glossary} />
    ) : (
      <BulletList items={group.items} accentColor={accentColor} delay={delay} glossary={glossary} />
    );
  }
  return <SingleBlock block={group.block} accentColor={accentColor} delay={delay} glossary={glossary} />;
}

function NumberedList({
  items,
  accentColor,
  delay,
  glossary,
}: {
  items: SlideBlock[];
  accentColor: string;
  delay: number;
  glossary?: GlossaryTerm[];
}) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + i * 0.06 }}
          className="group flex gap-4 p-4 rounded-xl bg-bg-card/40 border border-border-subtle hover:border-border-strong hover:bg-bg-card/80 transition-all"
        >
          <div
            className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center font-display font-bold text-base"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`,
              color: "#070B14",
              boxShadow: `0 4px 12px ${accentColor}40`,
            }}
          >
            {i + 1}
          </div>
          <p className="text-[17px] leading-[1.65] text-ink pt-1.5">
            <HoverGlossary text={it.text} glossary={glossary} accentColor={accentColor} lang={detectLang(it.text)} />
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function BulletList({
  items,
  accentColor,
  delay,
  glossary,
}: {
  items: SlideBlock[];
  accentColor: string;
  delay: number;
  glossary?: GlossaryTerm[];
}) {
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + i * 0.05 }}
          className="flex gap-3 items-start"
          style={{ paddingLeft: `${(it.level || 0) * 24}px` }}
        >
          <div
            className="shrink-0 mt-[11px] h-1.5 w-1.5 rounded-full"
            style={{
              background: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
            }}
          />
          <p className="text-[17px] leading-[1.65] text-ink-dim flex-1">
            <HoverGlossary text={it.text} glossary={glossary} accentColor={accentColor} lang={detectLang(it.text)} />
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function SingleBlock({
  block,
  accentColor,
  delay,
  glossary,
}: {
  block: SlideBlock;
  accentColor: string;
  delay: number;
  glossary?: GlossaryTerm[];
}) {
  const lang = detectLang(block.text);
  if (block.kind === "subheading") {
    return (
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay }}
        className="font-display text-xl font-bold mt-4 pb-1"
        style={{ color: accentColor }}
        lang={lang}
      >
        {block.text}
      </motion.h3>
    );
  }
  if (block.kind === "quote") {
    return (
      <motion.blockquote
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="relative px-6 py-5 rounded-xl bg-bg-card/40 border-l-4"
        style={{ borderColor: accentColor }}
      >
        <Quote
          size={22}
          className="absolute -top-2 -left-2 opacity-30"
          style={{ color: accentColor }}
        />
        <p className="text-[18px] leading-[1.7] italic text-ink font-display">
          <HoverGlossary text={block.text} glossary={glossary} accentColor={accentColor} lang={lang} />
        </p>
      </motion.blockquote>
    );
  }
  // body
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="text-[17px] leading-[1.7] text-ink-dim"
    >
      <HoverGlossary text={block.text} glossary={glossary} accentColor={accentColor} lang={lang} />
    </motion.p>
  );
}

// ── Decorative concept card for sparse slides ───────────────────────
function DecorativeCard({ title, accentColor }: { title: string; accentColor: string }) {
  // Pull 3-5 keywords from the title for a decorative keyword cloud
  const stop = new Set([
    "the","and","of","to","a","in","is","it","that","for","on","with","as","are","this",
    "an","be","by","from","or","at","which","but","not","have","has","was","were","will",
  ]);
  const words = title
    .toLowerCase()
    .match(/[a-z\u4e00-\u9fff\u0600-\u06ff]{3,}/gi)
    ?.filter((w) => !stop.has(w))
    .slice(0, 5) || [];

  if (words.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12 p-8 rounded-2xl relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top left, ${accentColor}15, transparent 70%), rgba(16, 24, 39, 0.4)`,
        border: `1px solid ${accentColor}30`,
      }}
    >
      <div className="text-[10px] font-semibold tracking-[0.15em] text-ink-faint mb-3">
        KEY CONCEPTS ON THIS SLIDE
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <motion.span
            key={w}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: `${accentColor}20`,
              color: accentColor,
              border: `1px solid ${accentColor}40`,
            }}
          >
            {w}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ── Language detection (Chinese, Arabic, default Latin) ────────────
function detectLang(text: string): string | undefined {
  if (!text) return undefined;
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[\u0600-\u06ff]/.test(text)) return "ar";
  return undefined;
}
