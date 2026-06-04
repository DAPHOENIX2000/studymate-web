import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a glossary of key terms from slide content via Gemini.
 * POST: { slides, apiKey }
 * Returns: { glossary: [{term, definition}] }
 *
 * Best-effort: if AI fails or returns garbage, returns empty glossary.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slides, apiKey } = body;

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ glossary: [] });
  }
  if (!apiKey) {
    return NextResponse.json({ glossary: [], warning: "No API key — glossary skipped." });
  }

  const context = slides
    .slice(0, 15)
    .map((s: any) => {
      const text = s.blocks ? s.blocks.map((b: any) => b.text).join(" ") : s.body || "";
      return `${s.title}: ${text}`;
    })
    .join("\n");

  const prompt = `From these lecture slides, extract 20-40 KEY TERMS with brief definitions (1-2 sentences each).

Include only terms that students would want to click for an explanation: technical concepts, proper nouns, jargon, methods, theories. Skip common words.

Return ONLY a JSON array (no markdown), each item shaped: {"term":"exact word or phrase","definition":"1-2 sentences"}.

Slides:
${context}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!r.ok) return NextResponse.json({ glossary: [], warning: `Gemini ${r.status}` });

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    if (parsed && !Array.isArray(parsed)) {
      parsed = parsed.glossary || parsed.terms || [];
    }
    if (!Array.isArray(parsed)) parsed = [];

    const glossary = parsed
      .filter((g: any) => g && g.term && g.definition)
      .map((g: any) => ({
        term: String(g.term).trim(),
        definition: String(g.definition).trim(),
      }))
      .slice(0, 50);

    return NextResponse.json({ glossary });
  } catch (e) {
    return NextResponse.json({
      glossary: [],
      warning: `Glossary unavailable: ${e instanceof Error ? e.message : "unknown"}`,
    });
  }
}
