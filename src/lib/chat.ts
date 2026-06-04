"use client";
import type { AppSettings } from "./store";

export interface ChatHelperArgs {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  settings: AppSettings;
  onChunk: (chunk: string) => void;
}

/**
 * Streaming chat across providers (Ollama / Gemini / Claude).
 * Calls onChunk for each delta. Resolves when stream completes.
 * Throws if the provider can't be reached.
 */
export async function streamChat({ messages, settings, onChunk }: ChatHelperArgs): Promise<void> {
  let url: string;
  let body: any;

  if (settings.aiProvider === "ollama") {
    url = "/api/chat";
    body = { model: settings.ollamaModel || "llama3.2:3b", messages };
  } else if (settings.aiProvider === "gemini") {
    if (!settings.geminiKey) {
      throw new Error("No Gemini API key set. Add one in Settings.");
    }
    url = "/api/chat-gemini";
    body = { apiKey: settings.geminiKey, messages };
  } else if (settings.aiProvider === "claude") {
    if (!settings.claudeKey) {
      throw new Error("No Claude API key set. Add one in Settings.");
    }
    url = "/api/chat-claude";
    body = { apiKey: settings.claudeKey, messages };
  } else {
    throw new Error("Unknown provider");
  }

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok || !r.body) {
    let detail = "";
    try {
      const data = await r.json();
      detail = data.error || JSON.stringify(data);
    } catch {}
    throw new Error(detail || `Provider returned ${r.status}`);
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      if (!payload) continue;
      try {
        const obj = JSON.parse(payload);
        if (obj.chunk) onChunk(obj.chunk);
      } catch {}
    }
  }
}
