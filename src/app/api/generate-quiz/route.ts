import { NextRequest, NextResponse } from "next/server";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

/**
 * Generate quiz questions from a batch of slides via Ollama.
 * POST: { slides, model?, count? }
 * Returns: { questions: QuizQuestion[] }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slides, model = "llama3.2:3b", count = 5 } = body;

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "slides array required" }, { status: 400 });
  }

  const context = slides
    .slice(0, 10)
    .map((s: any, i: number) => {
      const text = s.blocks ? s.blocks.map((b: any) => b.text).join(" | ") : s.body || "";
      return `Slide ${i + 1}: ${s.title}\n${text}`;
    })
    .join("\n\n");

  const prompt = `You are a quiz generator. Based on these lecture slides, generate ${count} varied quiz questions.

${context}

Return ONLY a JSON array (no markdown, no explanation), each item shaped like:
{"type":"mcq"|"tf","difficulty":1|2|3,"question":"...","options":["..."],"correctAnswer":"...","explanation":"...","topic":"...","slideIndex":1}

Mix easy/medium/hard. Mix mcq (4 options) and tf. Questions should test MEANING and APPLICATION, not surface trivia.`;

  try {
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model, prompt, stream: false, format: "json",
        options: { temperature: 0.7 },
      }),
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Ollama returned ${r.status}` }, { status: 502 });
    }
    const data = await r.json();
    let raw = data.response || "[]";
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.questions)) {
      parsed = parsed.questions;
    }
    if (!Array.isArray(parsed)) parsed = [];

    const questions = parsed
      .filter((q: any) => q && q.question && Array.isArray(q.options) && q.correctAnswer)
      .map((q: any, i: number) => ({
        id: `gen-${Date.now()}-${i}`,
        type: q.type === "tf" ? "tf" : "mcq",
        difficulty: [1,2,3].includes(q.difficulty) ? q.difficulty : 2,
        question: String(q.question),
        options: q.options.map(String),
        correctAnswer: String(q.correctAnswer),
        explanation: String(q.explanation || ""),
        topic: String(q.topic || "General"),
        slideIndex: typeof q.slideIndex === "number" ? q.slideIndex : 1,
      }));
    return NextResponse.json({ questions });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not generate quiz: ${e instanceof Error ? e.message : "unknown"}`, questions: [] },
      { status: 503 },
    );
  }
}
