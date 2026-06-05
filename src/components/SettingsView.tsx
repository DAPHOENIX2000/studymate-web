"use client";
import { motion } from "framer-motion";
import { Bot, Volume2, Globe, Check, ExternalLink } from "lucide-react";

const LANGUAGES = [
  "English","French","Spanish","Arabic","Chinese (Simplified)","Chinese (Traditional)",
  "Hindi","Portuguese","German","Italian","Japanese","Korean","Russian","Turkish","Dutch",
  "Polish","Swedish","Norwegian","Danish","Finnish","Greek","Czech","Romanian","Hungarian",
  "Thai","Vietnamese","Indonesian","Malay","Filipino","Swahili","Hebrew","Persian",
  "Ukrainian","Bengali","Tamil","Telugu","Urdu","Punjabi","Gujarati","Marathi",
  "Kannada","Malayalam","Catalan","Croatian","Slovak","Serbian","Bulgarian",
];
import { useApp, type AIProvider } from "@/lib/store";
import { Dusty } from "./Dusty";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);

  return (
    <div className="flex-1 overflow-y-auto aurora-bg">
      <div className="max-w-3xl mx-auto px-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="text-xs font-semibold tracking-widest text-accent mb-2">
            SETTINGS
          </div>
          <h1 className="font-display text-display-2 leading-tight">
            Tune Dusty.
          </h1>
          <p className="text-ink-muted mt-2">
            Pick the AI brain that powers Dusty, and how voice should sound.
          </p>
        </motion.div>

        {/* AI Provider */}
        <Section icon={Bot} title="AI provider" subtitle="Which model answers your questions">
          <div className="grid sm:grid-cols-3 gap-3">
            <ProviderCard
              id="ollama"
              active={settings.aiProvider === "ollama"}
              onSelect={() => updateSettings({ aiProvider: "ollama" })}
              title="Ollama"
              tag="Free · Offline"
              tagColor="#00F5C4"
              description="Local model on your computer. No data leaves your machine."
            />
            <ProviderCard
              id="gemini"
              active={settings.aiProvider === "gemini"}
              onSelect={() => updateSettings({ aiProvider: "gemini" })}
              title="Google Gemini"
              tag="Free tier · Cloud"
              tagColor="#60A5FA"
              description="Fast and smart. Free up to a generous monthly limit."
            />
            <ProviderCard
              id="claude"
              active={settings.aiProvider === "claude"}
              onSelect={() => updateSettings({ aiProvider: "claude" })}
              title="Anthropic Claude"
              tag="Paid · Best quality"
              tagColor="#A78BFA"
              description="The most precise explanations. ~$3 per million tokens."
            />
          </div>

          {/* Provider-specific config */}
          {settings.aiProvider === "ollama" && (
            <div className="mt-5 p-4 rounded-lg bg-bg-card/40 border border-border-subtle">
              <Label>Ollama model name</Label>
              <input
                value={settings.ollamaModel}
                onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                placeholder="llama3.2:3b"
                className="mt-1 w-full px-3 py-2 rounded-md bg-bg-base border border-border-subtle text-sm font-mono focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-ink-faint mt-2 leading-relaxed">
                Run <code className="font-mono bg-bg-hover px-1 rounded">ollama pull {settings.ollamaModel || "llama3.2:3b"}</code> in your terminal first.
                Smarter options: <code>llama3.1:8b</code> (better), <code>qwen2.5:7b</code> (great with Chinese/Arabic).
              </p>
            </div>
          )}

          {settings.aiProvider === "gemini" && (
            <div className="mt-5 p-4 rounded-lg bg-bg-card/40 border border-border-subtle">
              <Label>Gemini API key</Label>
              <input
                type="password"
                value={settings.geminiKey}
                onChange={(e) => updateSettings({ geminiKey: e.target.value })}
                placeholder="AIza..."
                className="mt-1 w-full px-3 py-2 rounded-md bg-bg-base border border-border-subtle text-sm font-mono focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-ink-faint mt-2 flex items-center gap-1.5">
                Get a free key at
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com/apikey <ExternalLink size={10} />
                </a>
              </p>
            </div>
          )}

          {settings.aiProvider === "claude" && (
            <div className="mt-5 p-4 rounded-lg bg-bg-card/40 border border-border-subtle">
              <Label>Anthropic API key</Label>
              <input
                type="password"
                value={settings.claudeKey}
                onChange={(e) => updateSettings({ claudeKey: e.target.value })}
                placeholder="sk-ant-..."
                className="mt-1 w-full px-3 py-2 rounded-md bg-bg-base border border-border-subtle text-sm font-mono focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-ink-faint mt-2 flex items-center gap-1.5">
                Get a key at
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-0.5"
                >
                  console.anthropic.com <ExternalLink size={10} />
                </a>
              </p>
            </div>
          )}
        </Section>

        {/* Voice */}
        <Section
          icon={Volume2}
          title="Voice"
          subtitle="How Dusty sounds when reading slides or replying"
        >
          <Toggle
            label="Enable voice"
            description="Read slides aloud and speak AI responses"
            checked={settings.voiceEnabled}
            onChange={(v) => updateSettings({ voiceEnabled: v })}
          />

          {settings.voiceEnabled && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <ProviderCard
                  id="browser"
                  active={settings.voiceProvider === "browser"}
                  onSelect={() => updateSettings({ voiceProvider: "browser" })}
                  title="Browser voices"
                  tag="Free · Built-in"
                  tagColor="#00F5C4"
                  description="Uses your computer's text-to-speech. Works offline."
                />
                <ProviderCard
                  id="elevenlabs"
                  active={settings.voiceProvider === "elevenlabs"}
                  onSelect={() => updateSettings({ voiceProvider: "elevenlabs" })}
                  title="ElevenLabs"
                  tag="Paid · Premium"
                  tagColor="#FF6B9D"
                  description="Studio-quality, expressive voices. Needs API key."
                />
              </div>

              {settings.voiceProvider === "elevenlabs" && (
                <div className="mt-4 p-4 rounded-lg bg-bg-card/40 border border-border-subtle">
                  <Label>ElevenLabs API key</Label>
                  <input
                    type="password"
                    value={settings.elevenLabsKey}
                    onChange={(e) => updateSettings({ elevenLabsKey: e.target.value })}
                    placeholder="sk_..."
                    className="mt-1 w-full px-3 py-2 rounded-md bg-bg-base border border-border-subtle text-sm font-mono focus:outline-none focus:border-accent transition-colors"
                  />
                  <p className="text-[11px] text-ink-faint mt-2 flex items-center gap-1.5">
                    Sign up at
                    <a
                      href="https://elevenlabs.io"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-0.5"
                    >
                      elevenlabs.io <ExternalLink size={10} />
                    </a>
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 rounded-lg bg-bg-card/40 border border-border-subtle">
                <Label>Speaking rate: {settings.voiceRate.toFixed(1)}x</Label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={settings.voiceRate}
                  onChange={(e) => updateSettings({ voiceRate: parseFloat(e.target.value) })}
                  className="mt-2 w-full accent-accent"
                />
              </div>
            </>
          )}
        </Section>

        {/* Language */}
        <Section icon={Globe} title="Language" subtitle="AI responses, notes, flashcards and podcast will use this language">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => updateSettings({ language: lang })}
                className={cn(
                  "text-left px-3 py-2 rounded-lg border text-sm transition-all",
                  settings.language === lang
                    ? "border-accent bg-accent-soft text-accent font-semibold"
                    : "border-border-subtle bg-bg-card/40 text-ink-muted hover:border-border-strong hover:text-ink",
                )}
              >
                {settings.language === lang && <Check size={10} className="inline mr-1" />}
                {lang}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint mt-3">
            This affects AI-generated content (quiz explanations, flashcard answers, notes, podcast script). The app UI stays in English.
          </p>
        </Section>

        <div className="text-center mt-10">
          <Dusty size={80} variant="happy" />
          <p className="text-xs text-ink-faint mt-3">
            Settings save automatically. Crafted by Yassine Achouak.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Bot;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 glass rounded-2xl p-6 inner-highlight"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="h-9 w-9 rounded-lg bg-accent-soft flex items-center justify-center text-accent shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight">{title}</h2>
          <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function ProviderCard({
  id,
  active,
  onSelect,
  title,
  tag,
  tagColor,
  description,
}: {
  id: string;
  active: boolean;
  onSelect: () => void;
  title: string;
  tag: string;
  tagColor: string;
  description: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "text-left rounded-lg p-4 border-2 transition-all",
        active
          ? "border-accent bg-accent-soft"
          : "border-border-subtle bg-bg-card/40 hover:border-border-strong hover:bg-bg-card/80",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
          style={{ background: `${tagColor}20`, color: tagColor }}
        >
          {tag}
        </span>
        {active && (
          <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center">
            <Check size={11} className="text-accent-ink" strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="font-display text-base font-bold text-ink">{title}</div>
      <p className="text-xs text-ink-muted mt-1 leading-relaxed">{description}</p>
    </button>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-bg-card/40 border border-border-subtle">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="text-xs text-ink-muted mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "shrink-0 h-6 w-11 rounded-full relative transition-colors",
          checked ? "bg-accent" : "bg-bg-hover",
        )}
      >
        <motion.div
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow"
        />
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold tracking-[0.15em] text-ink-faint uppercase">{children}</div>;
}
