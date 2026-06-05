import { NextRequest, NextResponse } from "next/server";
import { geminiPost } from "@/lib/gemini-fetch";

/**
 * Generate a podcast-style narration script from slides.
 * POST: { slides, apiKey, language }
 * Returns: { script: string }
 */
export async function POST(req: NextRequest) {
  const { slides, apiKey, language = "English" } = await req.json();

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "slides required" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "No Gemini API key." }, { status: 400 });
  }

  const context = slides
    .slice(0, 30)
    .map((s: any, i: number) => {
      const text = s.blocks ? s.blocks.map((b: any) => b.text).join(". ") : s.body || "";
      return `[Slide ${i + 1}: ${s.title}]\n${text}`;
    })
    .join("\n\n");

  const prompt = `You are a friendly, engaging podcast host and educator. Based on these lecture slides, write a natural, conversational podcast script that teaches the material as if speaking to a student.

Style:
- Warm, encouraging, and clear
- Use natural transitions: "Now, let's talk about...", "Here's the key thing to understand...", "Think of it this way..."
- Include brief pauses marked as [pause]
- Explain concepts with analogies and real-world examples
- Keep it engaging, not robotic
- Aim for 5-10 minutes of content (about 800-1500 words)

Respond in ${language}.

Write ONLY the script itself — no stage directions, no intro explaining this is a script. Just the spoken words.

Content:
${context}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await geminiPost(url, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }, 90000);

    if (!r.ok) {
      return NextResponse.json({ error: `Gemini returned ${r.status}` }, { status: 502 });
    }

    const data = await r.json();
    const script = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ script });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }
}
