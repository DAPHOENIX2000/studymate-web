"use client";
import { motion } from "framer-motion";
import {
  Flame,
  Clock,
  Brain,
  Trophy,
  Target,
  Zap,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { useApp } from "@/lib/store";
import { Dusty } from "./Dusty";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function ProgressView() {
  const subject = useApp((s) => s.subjects.find((x) => x.id === s.currentSubjectId));
  const sessions = useApp((s) => s.studySessions);

  // ALL hooks must run on every render — call them BEFORE the early return.
  const streak = useMemo(() => calcStreak(sessions), [sessions]);
  const totalMinutes = useMemo(() => sessions.reduce((a, b) => a + b.minutes, 0), [sessions]);
  const weeklyMinutes = useMemo(() => {
    const week = sessions.filter((s) => {
      const d = new Date(s.date);
      const now = new Date();
      return (now.getTime() - d.getTime()) / 86400000 < 7;
    });
    return week.reduce((a, b) => a + b.minutes, 0);
  }, [sessions]);

  if (!subject) return null;

  const masteryPct = Math.round(subject.mastery * 100);

  const radarData = [
    { topic: "Cell Structure", value: 80 },
    { topic: "Membrane", value: 65 },
    { topic: "DNA", value: 45 },
    { topic: "Mitosis", value: 70 },
    { topic: "Energy", value: 55 },
    { topic: "Genetics", value: 30 },
  ];

  return (
    <div className="flex-1 overflow-y-auto aurora-bg">
      <div className="max-w-6xl mx-auto px-10 py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="text-xs font-semibold tracking-widest text-accent mb-2">
            PROGRESS · {subject.name.toUpperCase()}
          </div>
          <h1 className="font-display text-display-2 leading-tight">Your journey</h1>
        </motion.div>

        {/* Mastery hero card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl inner-highlight p-8 mb-6 relative overflow-hidden"
        >
          {/* Aurora glow */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 blur-3xl"
            style={{ background: `radial-gradient(circle, ${subject.accentColor}, transparent 70%)` }}
          />
          <div className="relative flex items-center gap-10">
            <div className="flex-1">
              <div className="text-xs font-semibold tracking-widest text-ink-faint mb-2">
                OVERALL MASTERY
              </div>
              <div className="flex items-baseline gap-3">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="font-display text-7xl font-bold tracking-tight text-ink"
                  style={{ textShadow: `0 0 40px ${subject.accentColor}40` }}
                >
                  {masteryPct}
                </motion.div>
                <div className="font-display text-3xl text-ink-muted">%</div>
              </div>
              <p className="text-ink-muted mt-2 max-w-md">{masteryMessage(masteryPct)}</p>

              {/* Animated bar */}
              <div className="mt-5 h-2 rounded-full bg-bg-hover overflow-hidden max-w-md">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${masteryPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${subject.accentColor}, ${subject.accentColor}cc)`,
                    boxShadow: `0 0 12px ${subject.accentColor}`,
                  }}
                />
              </div>
            </div>

            {/* Dusty cheering */}
            <div className="hidden md:block">
              <Dusty size={120} variant={masteryPct > 60 ? "happy" : "default"} glow alive />
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPI icon={Flame} label="Streak" value={`${streak}`} sub="days" color="#FF6B9D" delay={0.2} />
          <KPI
            icon={Clock}
            label="This week"
            value={`${weeklyMinutes}`}
            sub="minutes"
            color="#60A5FA"
            delay={0.25}
          />
          <KPI
            icon={Brain}
            label="Total time"
            value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`}
            sub="all time"
            color="#00F5C4"
            delay={0.3}
          />
          <KPI icon={Trophy} label="XP earned" value="2,440" sub="level 24" color="#FBBF24" delay={0.35} />
        </div>

        {/* Two-column: heatmap + radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-accent" />
              <h3 className="font-display text-h2">Study heatmap</h3>
            </div>
            <p className="text-xs text-ink-muted mb-5">Last 12 weeks · darker = more time studied</p>
            <Heatmap sessions={sessions} accent={subject.accentColor} />
          </motion.div>

          {/* Mastery radar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-rose" />
              <h3 className="font-display text-h2">Topic mastery</h3>
            </div>
            <p className="text-xs text-ink-muted mb-3">Where you're strong, where to focus</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis
                    dataKey="topic"
                    tick={{ fill: "#9BA4B8", fontSize: 11 }}
                  />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar
                    name="Mastery"
                    dataKey="value"
                    stroke={subject.accentColor}
                    fill={subject.accentColor}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Award size={14} className="text-amber" />
            <h3 className="font-display text-h2">Achievements</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Badge icon="🔥" label="On Fire" sub="3 day streak" unlocked />
            <Badge icon="🎯" label="Sharpshooter" sub="10/10 quiz" unlocked />
            <Badge icon="📚" label="Bookworm" sub="100 cards reviewed" unlocked />
            <Badge icon="🚀" label="Rocket" sub="20 day streak" locked />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  sub: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-xl p-4 group hover:bg-bg-hover transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[11px] tracking-widest text-ink-muted uppercase font-semibold">
          {label}
        </span>
      </div>
      <div className="font-display text-3xl font-bold text-ink">{value}</div>
      <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>
    </motion.div>
  );
}

function Heatmap({
  sessions,
  accent,
}: {
  sessions: { date: string; minutes: number }[];
  accent: string;
}) {
  const map = new Map(sessions.map((s) => [s.date, s.minutes]));
  // 12 weeks × 7 days
  const days: { date: string; minutes: number }[] = [];
  const today = new Date();
  // Start from 12*7-1 days ago
  for (let i = 12 * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, minutes: map.get(iso) || 0 });
  }

  function intensity(m: number) {
    if (m === 0) return 0;
    if (m < 15) return 1;
    if (m < 30) return 2;
    if (m < 60) return 3;
    return 4;
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {Array.from({ length: 12 }, (_, w) => (
        <div key={w} className="flex flex-col gap-1">
          {Array.from({ length: 7 }, (_, d) => {
            const day = days[w * 7 + d];
            if (!day) return <div key={d} className="w-3 h-3" />;
            const i = intensity(day.minutes);
            return (
              <div
                key={d}
                className="w-3 h-3 rounded-sm transition-all hover:scale-150"
                style={{
                  background:
                    i === 0
                      ? "rgba(255,255,255,0.04)"
                      : `${accent}${Math.round(i * 50)
                          .toString(16)
                          .padStart(2, "0")}`,
                  boxShadow: i === 4 ? `0 0 6px ${accent}` : "none",
                }}
                title={`${day.date}: ${day.minutes} min`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Badge({
  icon,
  label,
  sub,
  unlocked,
  locked,
}: {
  icon: string;
  label: string;
  sub: string;
  unlocked?: boolean;
  locked?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-lg p-4 text-center border transition-all",
        unlocked && "bg-bg-card border-amber/30 hover:border-amber",
        locked && "bg-bg-card/40 border-border-subtle opacity-50",
      )}
    >
      <div className={cn("text-3xl mb-1", locked && "grayscale")}>{icon}</div>
      <div className="text-sm font-semibold text-ink">{label}</div>
      <div className="text-[10px] text-ink-faint mt-0.5">{sub}</div>
    </motion.div>
  );
}

function calcStreak(sessions: { date: string; minutes: number }[]): number {
  const dates = new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.date));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (dates.has(iso)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function masteryMessage(p: number): string {
  if (p === 0) return "Take some quiz questions to start tracking mastery.";
  if (p < 30) return "Plenty to learn. Spend time in study mode to build a foundation.";
  if (p < 60) return "Good progress. Focus on the weak topics in your radar.";
  if (p < 85) return "Strong understanding. A few more rounds and you've got it.";
  return "Excellent mastery. Keep flashcards going to retain it long-term.";
}
