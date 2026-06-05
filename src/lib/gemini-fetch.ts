/**
 * Gemini API fetch with automatic retry on 429 (rate limit).
 * Retries up to 4 times with exponential backoff: 5s, 15s, 30s, 60s.
 */
export async function geminiPost(
  url: string,
  body: object,
  timeoutMs = 90000,
): Promise<Response> {
  const delays = [5000, 15000, 30000, 60000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (r.status !== 429) return r; // success or non-rate-limit error

    if (attempt < delays.length) {
      // Rate limited — wait then retry
      await new Promise((res) => setTimeout(res, delays[attempt]));
    }
  }

  // All retries exhausted — return a synthetic 429
  return new Response(
    JSON.stringify({ error: "Rate limit: Gemini is busy. Wait 1-2 minutes and try again." }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}
