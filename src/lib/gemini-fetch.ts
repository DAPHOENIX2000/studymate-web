/**
 * Gemini API fetch with automatic retry on 429 (rate limit).
 * Retries up to 4 times with exponential backoff: 5s, 15s, 30s, 60s.
 */
/**
 * Single retry after 4s on 429 — keeps total server time well under Vercel's limit.
 * Long retry chains belong on the client, not inside a serverless function.
 */
export async function geminiPost(
  url: string,
  body: object,
  timeoutMs = 55000,
): Promise<Response> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (r.status !== 429) return r;

  // One retry after 4 seconds
  await new Promise((res) => setTimeout(res, 4000));
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}
