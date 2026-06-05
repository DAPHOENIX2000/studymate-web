import { NextRequest, NextResponse } from "next/server";
import { geminiPost } from "@/lib/gemini-fetch";

export async function POST(req: NextRequest) {
  const { slides, apiKey } = await req.json();

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "slides required" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "No Gemini API key." }, { status: 400 });
  }

  const context = slides
    .slice(0, 40)
    .map((s: any, i: number) => {
      const text = s.blocks ? s.blocks.map((b: any) => b.text).join(" | ") : s.body || "";
      return `[Slide ${i + 1}: ${s.title}]\n${text}`;
    })
    .join("\n\n");

  const prompt = `You are a professional note-taker. Based on these lecture slides, write comprehensive study notes in clean Markdown.

Structure:
- Use ## for main sections (grouped by topic)
- Use **bold** for key terms and definitions
- Use bullet points for lists
- Include a ## Summary at the end (3-5 sentences)
- Include a ## Key Terms section at the end with definitions

Be thorough — capture every important concept, formula, date, or example. Write in a way that helps a student study without looking at the original slides.

Slides:
${context}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await geminiPost(url, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }, 120000);

    if (!r.ok) {
      const msg = r.status === 429
        ? "Rate limit hit — Gemini is busy. Wait 1-2 minutes and click Try again."
        : `Gemini returned ${r.status}`;
      return NextResponse.json({ error: msg }, { status: r.status });
    }

    const data = await r.json();
    const notes = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ notes });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }
}
