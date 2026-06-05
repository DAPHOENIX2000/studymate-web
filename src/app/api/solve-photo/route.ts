import { NextRequest, NextResponse } from "next/server";

/**
 * Solve equations or explain content from a photo via Gemini Vision.
 * POST: multipart/form-data with { image: Blob, apiKey, language }
 * Returns: { solution: string } — markdown
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const image = formData.get("image") as Blob | null;
  const apiKey = formData.get("apiKey") as string;
  const language = (formData.get("language") as string) || "English";

  if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "No Gemini API key." }, { status: 400 });

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = image.type || "image/jpeg";

  const prompt = `You are a expert tutor. Look at this image and:
1. If it contains equations or math problems — solve them step by step, explaining each step clearly
2. If it contains text or diagrams — explain the key concepts shown
3. If it contains a question — answer it thoroughly

Respond in ${language}. Format your response in clean Markdown with clear headings, steps, and explanations. Be thorough — a student needs to understand, not just get the answer.`;

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
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!r.ok) {
      return NextResponse.json({ error: `Gemini returned ${r.status}` }, { status: 502 });
    }

    const data = await r.json();
    const solution = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ solution });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 503 },
    );
  }
}
