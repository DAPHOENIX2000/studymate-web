import { NextRequest, NextResponse } from "next/server";

/**
 * Generate quiz questions via Gemini.
 * POST: { slides, apiKey, count? }
 * Returns: { questions: QuizQuestion[] }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slides, apiKey, count = 5 } = body;

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "slides array required" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Gemini API key. Add one in Settings → Google Gemini." },
      { status: 400 },
    );
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

Return ONLY a JSON array (no markdown, no explanation), each item shaped exactly like:
{"type":"mcq","difficulty":1,"question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"...","topic":"...","slideIndex":1}

Rules:
- type is "mcq" (4 options) or "tf" (options: ["True","False"])
- difficulty: 1=easy, 2=medium, 3=hard
- correctAnswer must be one of the strings in options
- Mix easy/medium/hard and mcq/tf
- Questions must test MEANING and APPLICATION of the slide content, not trivia`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      let hint = "";
      if (r.status === 400 || r.status === 401 || r.status === 403)
        hint = " Check your Gemini API key in Settings.";
      else if (r.status === 429) hint = " Rate limit hit — wait a moment and try again.";
      return NextResponse.json(
        { error: `Gemini returned ${r.status}.${hint}`, questions: [] },
        { status: 502 },
      );
    }

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
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
        difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
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
      {
        error: `Could not generate quiz: ${e instanceof Error ? e.message : "unknown"}`,
        questions: [],
      },
      { status: 503 },
    );
  }
}
