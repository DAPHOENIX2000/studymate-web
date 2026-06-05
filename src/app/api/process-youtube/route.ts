import { NextRequest, NextResponse } from "next/server";
import { geminiPost } from "@/lib/gemini-fetch";

/**
 * Process a YouTube video by fetching its transcript and structuring it via Gemini.
 * POST: { url, apiKey, language? }
 * Returns: { name, slides: [{index, title, blocks, notes, images}] }
 */
export async function POST(req: NextRequest) {
  const { url, apiKey, language = "English" } = await req.json();

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "No Gemini API key. Add one in Settings." }, { status: 400 });

  // Extract video ID
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  if (!ytMatch) {
    return NextResponse.json({ error: "Please enter a valid YouTube URL (youtube.com or youtu.be)." }, { status: 400 });
  }
  const videoId = ytMatch[1];

  // ── Step 1: Fetch transcript from YouTube ──────────────────────────
  let transcript = "";
  let videoTitle = `YouTube – ${videoId}`;

  try {
    // Fetch the video page to get caption track URLs and title
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!pageRes.ok) throw new Error(`YouTube page returned ${pageRes.status}`);
    const html = await pageRes.text();

    // Extract video title
    const titleMatch = html.match(/"title":"([^"]+)"/);
    if (titleMatch) videoTitle = titleMatch[1].replace(/\\u0026/g, "&").slice(0, 100);

    // Find caption tracks in ytInitialPlayerResponse
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionMatch) throw new Error("NO_CAPTIONS");

    let tracks: any[];
    try {
      tracks = JSON.parse(captionMatch[1]);
    } catch {
      throw new Error("NO_CAPTIONS");
    }

    if (!tracks.length) throw new Error("NO_CAPTIONS");

    // Prefer English, fall back to first available
    const track =
      tracks.find((t: any) => t.languageCode === "en" && !t.kind) ||
      tracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      tracks[0];

    if (!track?.baseUrl) throw new Error("NO_CAPTIONS");

    // Fetch the caption XML
    const captionRes = await fetch(track.baseUrl, { signal: AbortSignal.timeout(10000) });
    const captionXml = await captionRes.text();

    // Parse timed text XML to plain text
    const textMatches = captionXml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || [];
    transcript = textMatches
      .map((t) =>
        t
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n/g, " ")
          .trim(),
      )
      .filter(Boolean)
      .join(" ");
  } catch (err: any) {
    if (err.message === "NO_CAPTIONS") {
      return NextResponse.json({
        error: "This video has no captions/subtitles available. Try a different video.",
      }, { status: 422 });
    }
    return NextResponse.json({
      error: `Could not access this video. Make sure it's public and not age-restricted. (${err.message})`,
    }, { status: 422 });
  }

  if (!transcript || transcript.length < 100) {
    return NextResponse.json({
      error: "Transcript is too short or empty. Try a different video.",
    }, { status: 422 });
  }

  // ── Step 2: Structure transcript into slides via Gemini ────────────
  const trimmedTranscript = transcript.slice(0, 12000); // ~3000 tokens max

  const prompt = `You are a study assistant. Based on this YouTube video transcript, extract and organize the educational content into structured sections like lecture slides.

Video: "${videoTitle}"

For each major topic or section covered in the video, create one entry with a clear title and key bullet points. Respond in ${language}.

Return ONLY a JSON array (no markdown), each item shaped like:
{"title":"Section Title","blocks":[{"kind":"bullet","text":"key point or fact"},{"kind":"body","text":"explanation or definition"}]}

Create 5-15 sections. Focus on all important concepts, definitions, examples, and explanations mentioned.

Transcript:
${trimmedTranscript}`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await geminiPost(geminiUrl, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }, 50000);

    if (!r.ok) {
      let hint = r.status === 429 ? " Rate limit — wait a moment." : r.status === 503 ? " Gemini is busy — try again." : "";
      return NextResponse.json({ error: `Gemini returned ${r.status}.${hint}` }, { status: 502 });
    }

    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let parsed: any[];
    try { parsed = JSON.parse(raw); }
    catch { const m = raw.match(/\[[\s\S]*\]/); parsed = m ? JSON.parse(m[0]) : []; }
    if (!Array.isArray(parsed)) parsed = [];

    const slides = parsed
      .filter((s: any) => s?.title)
      .map((s: any, i: number) => ({
        index: i + 1,
        title: String(s.title).slice(0, 200),
        blocks: Array.isArray(s.blocks)
          ? s.blocks.filter((b: any) => b?.text).map((b: any) => ({
              kind: ["body", "bullet", "numbered", "subheading", "quote"].includes(b.kind) ? b.kind : "bullet",
              text: String(b.text),
              level: 0,
            }))
          : [],
        notes: "",
        images: [],
      }));

    if (slides.length === 0) {
      return NextResponse.json({ error: "Could not extract content from transcript." }, { status: 422 });
    }

    return NextResponse.json({ name: videoTitle, slides });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }
}
