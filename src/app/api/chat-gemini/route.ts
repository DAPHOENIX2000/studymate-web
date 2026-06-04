import { NextRequest, NextResponse } from "next/server";

/**
 * Gemini chat proxy with streaming via SSE.
 * POST: { apiKey, messages: [{role, content}, ...], model? }
 *
 * NOTE: Default model is gemini-2.5-flash. gemini-2.0-flash was retired
 * in March 2026. If you want to override, pass model in the body.
 */
export async function POST(req: NextRequest) {
  const { apiKey, messages, model = "gemini-2.5-flash" } = await req.json();

  if (!apiKey) {
    return NextResponse.json(
      { error: "No Gemini API key. Add one in Settings." },
      { status: 400 },
    );
  }

  // Gemini wants 'contents' with role 'user'|'model' and parts: [{text}]
  // It also takes systemInstruction separately.
  const systemMsg = messages.find((m: any) => m.role === "system");
  const chatMsgs = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: any = { contents: chatMsgs };
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      {
        error:
          `Cannot reach Gemini: ${msg}. ` +
          `Possible causes: (1) network/firewall blocks generativelanguage.googleapis.com, ` +
          `(2) corporate VPN or proxy interference, (3) try restarting the dev server.`,
      },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try { detail = await upstream.text(); } catch {}
    // Common errors: 400 = bad request, 401 = bad key, 404 = wrong model name,
    // 429 = rate limit, 503 = Gemini server overloaded
    let hint = "";
    if (upstream.status === 400) hint = " (Check your API key is valid.)";
    else if (upstream.status === 401 || upstream.status === 403) hint = " (API key invalid or doesn't have access.)";
    else if (upstream.status === 404) hint = ` (Model "${model}" not found — try gemini-2.5-flash or gemini-3.5-flash.)`;
    else if (upstream.status === 429) hint = " (Rate limit hit — wait a minute.)";
    return NextResponse.json(
      { error: `Gemini returned ${upstream.status}.${hint} ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const chunk = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (chunk) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`),
                );
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (e) {
        try { controller.error(e); } catch {}
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
