import { NextRequest, NextResponse } from "next/server";

/**
 * Claude chat proxy with streaming via SSE.
 * POST: { apiKey, messages, model? }
 */
export async function POST(req: NextRequest) {
  const { apiKey, messages, model = "claude-haiku-4-5-20251001" } = await req.json();

  if (!apiKey) {
    return NextResponse.json(
      { error: "No Anthropic API key. Add one in Settings." },
      { status: 400 },
    );
  }

  // Claude wants system separately, then alternating user/assistant
  const systemMsg = messages.find((m: any) => m.role === "system");
  const chatMsgs = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role, content: m.content }));

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        system: systemMsg?.content,
        messages: chatMsgs,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Cannot reach Anthropic: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try { detail = await upstream.text(); } catch {}
    return NextResponse.json(
      { error: `Claude returned ${upstream.status}. ${detail.slice(0, 300)}` },
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
            if (!payload) continue;
            try {
              const obj = JSON.parse(payload);
              if (obj.type === "content_block_delta" && obj.delta?.text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ chunk: obj.delta.text })}\n\n`),
                );
              }
              if (obj.type === "message_stop") {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
            } catch {}
          }
        }
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
