import { NextRequest, NextResponse } from "next/server";

// Use 127.0.0.1 explicitly. On Windows, Node.js may resolve "localhost" to
// IPv6 ::1, but Ollama by default only listens on IPv4 — causes silent fail.
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

/**
 * Streaming chat proxy to local Ollama. The frontend posts:
 *   { model, messages: [{role, content}, ...] }
 * We forward to /api/chat with stream=true and pipe the response back as SSE.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { model = "llama3.2:3b", messages } = body;

  let upstream: Response;
  try {
    upstream = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: { temperature: 0.4 },
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      {
        error: `Cannot reach Ollama at ${OLLAMA_BASE}. Is the Ollama app running? (${msg})`,
      },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try {
      detail = await upstream.text();
    } catch {}
    return NextResponse.json(
      {
        error: `Ollama returned ${upstream.status}. ${detail}`.slice(0, 500),
        hint:
          upstream.status === 404
            ? `The model "${model}" isn't installed. Run: ollama pull ${model}`
            : undefined,
      },
      { status: 502 },
    );
  }

  // Forward the NDJSON stream as text/event-stream
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
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              const chunk = obj?.message?.content;
              if (chunk) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`),
                );
              }
              if (obj?.done) {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } catch (e) {
        try {
          controller.error(e);
        } catch {}
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

/** Health check — GET to see if Ollama is reachable and which models are installed. */
export async function GET() {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) {
      return NextResponse.json({
        online: false,
        error: `Ollama responded with ${r.status}`,
        base: OLLAMA_BASE,
      });
    }
    const data = await r.json();
    return NextResponse.json({
      online: true,
      base: OLLAMA_BASE,
      models: (data.models || []).map((m: any) => m.name),
    });
  } catch (e) {
    return NextResponse.json({
      online: false,
      error: e instanceof Error ? e.message : "unknown",
      base: OLLAMA_BASE,
      hint:
        "On Windows, make sure (1) Ollama is installed from ollama.com/download, " +
        "(2) the Ollama icon is visible in your system tray, and " +
        "(3) you've run `ollama pull llama3.2:3b` in a terminal at least once.",
    });
  }
}
