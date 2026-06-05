/**
 * Gemini API fetch with automatic retry on 429 (rate limit).
 * Retries up to 4 times with exponential backoff: 5s, 15s, 30s, 60s.
 */
/**
 * Retries on 429 (rate limit) and 503 (Gemini overloaded).
 * Two retries max: 3s then 8s — keeps total time inside Vercel's function limit.
 */
export async function geminiPost(
  url: string,
  body: object,
  timeoutMs = 50000,
): Promise<Response> {
  const RETRYABLE = new Set([429, 503, 502]);
  const delays = [3000, 8000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!RETRYABLE.has(r.status) || attempt === delays.length) return r;

    await new Promise((res) => setTimeout(res, delays[attempt]));
  }

  // Should never reach here — TypeScript needs a return
  return new Response(JSON.stringify({ error: "Max retries exceeded" }), { status: 503 });
}
