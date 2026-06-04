"use client";

/**
 * Lightweight voice helper around the browser's built-in speechSynthesis API.
 * No mic input here — that's a future feature.
 *
 * Usage:
 *   const v = getVoice();
 *   v.speak("Hello there");
 *   v.stop();
 */

class VoiceController {
  private utterance: SpeechSynthesisUtterance | null = null;
  private currentVoice: SpeechSynthesisVoice | null = null;
  private rate = 1.0;
  private listeners = new Set<(speaking: boolean) => void>();
  private speaking = false;

  /** Set playback rate (0.5 to 2.0). */
  setRate(r: number) {
    this.rate = Math.max(0.5, Math.min(2, r));
  }

  /** Pick a voice. If you pass a language tag, will try to match. */
  selectVoice(langOrName?: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    if (langOrName) {
      // Try exact name match first
      let v = voices.find((vv) => vv.name === langOrName);
      // Then language prefix match
      if (!v) v = voices.find((vv) => vv.lang.startsWith(langOrName));
      if (v) this.currentVoice = v;
    } else {
      // Default to a good English voice
      this.currentVoice =
        voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];
    }
    return this.currentVoice;
  }

  /** Returns all available voices grouped by language. */
  getVoices() {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }

  /** Speak text, auto-detecting language from content. */
  speak(text: string, opts?: { lang?: string }) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = this.rate;
    // Auto-detect language if not explicitly set
    const detectedLang = opts?.lang || detectLang(text);
    if (detectedLang) {
      const matched = this.getVoices().find((v) => v.lang.startsWith(detectedLang));
      if (matched) u.voice = matched;
      u.lang = detectedLang;
    } else if (this.currentVoice) {
      u.voice = this.currentVoice;
    }
    u.onstart = () => this.setSpeaking(true);
    u.onend = () => this.setSpeaking(false);
    u.onerror = () => this.setSpeaking(false);
    this.utterance = u;
    window.speechSynthesis.speak(u);
  }

  stop() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    this.setSpeaking(false);
  }

  isSpeaking() {
    return this.speaking;
  }

  onSpeakingChange(fn: (speaking: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private setSpeaking(v: boolean) {
    this.speaking = v;
    for (const l of this.listeners) l(v);
  }
}

let _instance: VoiceController | null = null;
export function getVoice(): VoiceController {
  if (!_instance) _instance = new VoiceController();
  return _instance;
}

function detectLang(text: string): string | undefined {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u0600-\u06ff]/.test(text)) return "ar-SA";
  return undefined;
}
