import { NextRequest, NextResponse } from "next/server";

/**
 * Transcribe & structure a recorded lecture via Gemini audio.
 * POST: multipart/form-data with { audio: Blob, apiKey, language }
 * Returns: { name, slides: [{index, title, blocks, notes, images}] }
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as Blob | null;
  const apiKey = formData.get("apiKey") as string;
  const language = (formData.get("language") as string) || "English";

  if (!audio) return NextResponse.json({ error: "No audio file" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "No Gemini API key. Add one in Settings." }, { status: 400 });

  // Convert audio to base64
  const arrayBuffer = await audio.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = audio.type || "audio/webm";

  const prompt = `You are a lecture transcription assistant. Listen to this lecture recording and extract its content into structured study sections.

For each major topic or concept covered, create one section with a clear title and the key points discussed.

Respond in ${language}.

Return ONLY a JSON array (no markdown), each item shaped like:
{"title":"Topic Title","blocks":[{"kind":"bullet","text":"key point or fact"},{"kind":"body","text":"explanation or context"}]}

Create 5-15 sections depending on lecture length. Capture all important concepts, definitions, and examples.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json(
        { error: `Gemini returned ${r.status}. ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let parsed: any[];
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    if (!Array.isArray(parsed)) parsed = [];

    const slides = parsed
      .filter((s: any) => s && s.title)
      .map((s: any, i: number) => ({
        index: i + 1,
        title: String(s.title).slice(0, 200),
        blocks: Array.isArray(s.blocks)
          ? s.blocks.filter((b: any) => b?.text).map((b: any) => ({
              kind: ["body","bullet","numbered","subheading","quote"].includes(b.kind) ? b.kind : "bullet",
              text: String(b.text),
              level: 0,
            }))
          : [],
        notes: "",
        images: [],
      }));

    if (slides.length === 0) {
      return NextResponse.json({ error: "Could not extract content. Make sure the recording has clear speech." }, { status: 422 });
    }

    const now = new Date();
    const name = `Lecture – ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return NextResponse.json({ name, slides });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }
}
