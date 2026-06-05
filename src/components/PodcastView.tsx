"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Square, RefreshCcw, Headphones } from "lucide-react";
import { useApp } from "@/lib/store";
import { Dusty } from "./Dusty";

export function PodcastView() {
  const subject = useApp((s) => s.subjects.find((x) => x.id === s.currentSubjectId));
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const charRef = useRef(0);

  useEffect(() => {
    if (!subject?.slides?.length) return;
    const apiKey = useApp.getState().settings.geminiKey;
    if (!apiKey || script) return;
    generate();
  }, [subject]);

  useEffect(() => () => { stopSpeech(); }, []);

  function generate() {
    const apiKey = useApp.getState().settings.geminiKey;
    if (!apiKey) return;
    setLoading(true); setError(null); setScript(""); stopSpeech();
    fetch("/api/generate-podcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slides: subject!.slides,
        apiKey,
        language: useApp.getState().settings.language,
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.script) setScript(d.script); else setError(d.error || "Failed"); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function stopSpeech() {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPlaying(false);
    setProgress(0);
    charRef.current = 0;
  }

  function togglePlay() {
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setPlaying(true);
        startProgressTimer();
      } else {
        startSpeech();
      }
    }
  }

  function startSpeech() {
    if (!script) return;
    stopSpeech();
    const cleanScript = script.replace(/\[pause\]/gi, "... ").replace(/\[.*?\]/g, "");
    const utt = new SpeechSynthesisUtterance(cleanScript);
    utt.rate = useApp.getState().settings.voiceRate || 1.0;
    utt.pitch = 1.05;
    utt.volume = 1;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Premium"))
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];
    if (preferred) utt.voice = preferred;

    utt.onend = () => { setPlaying(false); setProgress(100); if (intervalRef.current) clearInterval(intervalRef.current); };
    utt.onerror = () => { setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); };

    uttRef.current = utt;
    charRef.current = 0;
    window.speechSynthesis.speak(utt);
    setPlaying(true);
    startProgressTimer();
  }

  function startProgressTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Estimate: average speaking rate ~150 wpm = ~750 chars/min
    const totalChars = script.length;
    const charsPerSec = (useApp.getState().settings.voiceRate || 1) * 12.5;
    intervalRef.current = setInterval(() => {
      charRef.current = Math.min(charRef.current + charsPerSec, totalChars);
      setProgress(Math.round((charRef.current / totalChars) * 100));
      if (charRef.current >= totalChars) clearInterval(intervalRef.current!);
    }, 1000);
  }

  if (!subject) return null;

  if (!subject.slides?.length) {
    return <EmptyState icon="sleepy" msg="Re-upload the PowerPoint from the Library." />;
  }
  if (!useApp.getState().settings.geminiKey) {
    return <EmptyState icon="curious" msg="Add a Gemini API key in Settings to generate podcasts." />;
  }
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center aurora-bg">
        <div className="text-center">
          <Dusty size={100} variant="happy" />
          <h3 className="font-display text-2xl mt-4">Writing your podcast script…</h3>
          <p className="text-ink-muted mt-2 text-sm max-w-xs mx-auto">Dusty is crafting a natural narration of your slides. ~15 seconds.</p>
          <div className="mt-5 flex justify-center gap-1.5 text-accent">
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
          <p className="text-rose-400 mt-4 text-sm">{error}</p>
          <button onClick={generate} className="mt-4 px-4 py-2 rounded-md bg-accent text-accent-ink font-semibold text-sm">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto aurora-bg">
      <div className="max-w-2xl mx-auto px-10 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-xs font-semibold tracking-widest text-accent mb-1">PODCAST · {subject.name.toUpperCase()}</div>
          <h1 className="font-display text-h1">Listen & Learn</h1>
          <p className="text-ink-muted text-sm mt-1">Dusty narrates your slides — study hands-free.</p>
        </motion.div>

        {/* Player */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl inner-highlight p-8 mb-6">
          <div className="flex items-center gap-6">
            <motion.div animate={playing ? { rotate: [0, -5, 5, -3, 3, 0] } : {}} transition={{ duration: 0.5, repeat: playing ? Infinity : 0, repeatDelay: 2 }}>
              <Dusty size={80} variant={playing ? "happy" : "default"} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-lg truncate">{subject.name}</div>
              <div className="text-sm text-ink-muted mt-0.5">AI Podcast · {Math.ceil(script.split(" ").length / 150)} min</div>
              {/* Progress bar */}
              <div className="mt-4 h-1.5 rounded-full bg-bg-hover overflow-hidden">
                <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="mt-1 text-[10px] text-ink-faint text-right">{progress}%</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={stopSpeech} className="h-10 w-10 rounded-full glass border border-border-subtle flex items-center justify-center text-ink-muted hover:text-ink transition-colors" title="Stop">
              <Square size={14} />
            </button>
            <button onClick={togglePlay}
              className="h-14 w-14 rounded-full bg-accent text-accent-ink flex items-center justify-center hover:bg-accent-hover transition-all hover:scale-105 shadow-glow"
            >
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>
            <button onClick={() => { setScript(""); generate(); }} className="h-10 w-10 rounded-full glass border border-border-subtle flex items-center justify-center text-ink-muted hover:text-ink transition-colors" title="Regenerate">
              <RefreshCcw size={14} />
            </button>
          </div>
        </motion.div>

        {/* Script */}
        {script && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold tracking-widest text-ink-faint">
              <Headphones size={12} /> TRANSCRIPT
            </div>
            <p className="text-sm text-ink-dim leading-relaxed whitespace-pre-wrap">{script}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, msg }: { icon: any; msg: string }) {
  return (
    <div className="flex-1 flex items-center justify-center aurora-bg">
      <div className="text-center">
        <Dusty size={90} variant={icon} />
        <p className="text-ink-muted mt-4 text-sm">{msg}</p>
      </div>
    </div>
  );
}
