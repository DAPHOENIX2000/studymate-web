import { NextRequest, NextResponse } from "next/server";

/**
 * Process a YouTube URL via Gemini — extracts key concepts as slide-like sections.
 * POST: { url, apiKey }
 * Returns: { name, slides: [{index, title, blocks, notes, images}] }
 */
export async function POST(req: NextRequest) {
  const { url, apiKey } = await req.json();

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "No Gemini API key. Add one in Settings." }, { status: 400 });

  // Validate YouTube URL
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (!ytMatch) {
    return NextResponse.json({ error: "Please enter a valid YouTube URL." }, { status: 400 });
  }

  const prompt = `You are a study assistant. Analyze this YouTube video and extract its educational content into structured sections like lecture slides.

For each major topic or section in the video, create one entry with:
- A clear title (the topic)
- Key bullet points, definitions, and concepts from that section

Return ONLY a JSON array (no markdown), each item shaped like:
{"title":"Section Title","blocks":[{"kind":"bullet","text":"key point"},{"kind":"body","text":"explanation"}]}

Create 5-15 sections depending on video length. Focus on educational value — capture all important concepts, definitions, examples, and explanations.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const r = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { fileData: { mimeType: "video/youtube", fileUri: url } },
          ],
        }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      let hint = "";
      if (r.status === 400) hint = " The video may be private, age-restricted, or unavailable.";
      else if (r.status === 401 || r.status === 403) hint = " Check your Gemini API key in Settings.";
      else if (r.status === 429) hint = " Rate limit hit — wait a moment and try again.";
      return NextResponse.json(
        { error: `Could not process video: Gemini returned ${r.status}.${hint}` },
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
          ? s.blocks.filter((b: any) => b && b.text).map((b: any) => ({
              kind: ["title","body","bullet","numbered","subheading","quote"].includes(b.kind) ? b.kind : "bullet",
              text: String(b.text),
              level: 0,
            }))
          : [],
        notes: "",
        images: [],
      }));

    if (slides.length === 0) {
      return NextResponse.json({ error: "Could not extract content from this video. It may have no captions or be unavailable." }, { status: 422 });
    }

    // Extract a clean title from the URL / video ID
    const videoId = ytMatch[1];
    const name = `YouTube – ${videoId}`;

    return NextResponse.json({ name, slides });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to process video: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }
}
