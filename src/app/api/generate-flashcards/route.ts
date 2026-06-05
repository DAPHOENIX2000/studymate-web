import { NextRequest, NextResponse } from "next/server";
import { geminiPost } from "@/lib/gemini-fetch";

/**
 * Generate flashcards from slide content via Gemini.
 * POST: { slides, apiKey, cardsPerSlide? }
 * Returns: { flashcards: Flashcard[] }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slides, apiKey, cardsPerSlide = 2 } = body;

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "slides array required" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Gemini API key. Add one in Settings → Google Gemini." },
      { status: 400 },
    );
  }

  // Build context from all slides, capped to avoid token limits
  const context = slides
    .slice(0, 40)
    .map((s: any, i: number) => {
      const text = s.blocks ? s.blocks.map((b: any) => b.text).join(" | ") : s.body || "";
      return `[Slide ${i + 1}: ${s.title}]\n${text}`;
    })
    .join("\n\n");

  const totalCards = Math.min(slides.length * cardsPerSlide, 60);

  const prompt = `You are a flashcard generator. Based on these lecture slides, generate ${totalCards} high-quality flashcards that cover ALL slides evenly.

${context}

Rules:
- Cover every slide — don't cluster cards on just the first few slides
- Questions should test understanding, definitions, and application — not trivia
- Answers should be clear and 1-3 sentences
- Include the slideIndex (1-based) the card comes from

Return ONLY a JSON array (no markdown), each item shaped exactly like:
{"front":"question or term","back":"clear answer 1-3 sentences","slideIndex":1}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await geminiPost(url, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      let hint = "";
      if (r.status === 400 || r.status === 401 || r.status === 403)
        hint = " Check your Gemini API key in Settings.";
      else if (r.status === 429) hint = " Rate limit — wait 1-2 minutes and try again.";
      else if (r.status === 503 || r.status === 502) hint = " Gemini is temporarily overloaded — try again in a few seconds.";
      return NextResponse.json(
        { error: `Gemini returned ${r.status}.${hint}`, flashcards: [] },
        { status: 502 },
      );
    }

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.flashcards)) {
      parsed = parsed.flashcards;
    }
    if (!Array.isArray(parsed)) parsed = [];

    const now = new Date().toISOString();
    const flashcards = parsed
      .filter((f: any) => f && f.front && f.back)
      .map((f: any, i: number) => ({
        id: `fc-${Date.now()}-${i}`,
        front: String(f.front).trim(),
        back: String(f.back).trim(),
        slideIndex: typeof f.slideIndex === "number" ? f.slideIndex : 1,
        ease: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueDate: now,
      }));

    return NextResponse.json({ flashcards });
  } catch (e) {
    return NextResponse.json(
      {
        error: `Could not generate flashcards: ${e instanceof Error ? e.message : "unknown"}`,
        flashcards: [],
      },
      { status: 503 },
    );
  }
}
