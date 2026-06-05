/**
 * Client-side PDF parser using pdfjs-dist.
 * Extracts text page-by-page, each page becomes a "slide".
 */
import type { ParsedPptx, ParsedSlide } from "./parse-pptx-client";

export async function parsePdfFile(file: File): Promise<ParsedPptx> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only .pdf files are supported here");
  }

  // Dynamically import to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");
  // Use local worker to avoid CDN dependency
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const slides: ParsedSlide[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Collect text items, preserving rough line breaks
    const lines: string[] = [];
    let lastY: number | null = null;
    let currentLine = "";

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = Math.round(textItem.transform[5]);

      if (lastY !== null && Math.abs(y - lastY) > 2 && currentLine.trim()) {
        lines.push(currentLine.trim());
        currentLine = "";
      }
      currentLine += textItem.str;
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    // Filter empty lines and very short noise
    const meaningful = lines.filter((l) => l.length > 2);
    if (meaningful.length === 0) continue;

    // First substantial line is the title
    const title = meaningful[0].slice(0, 200) || `Page ${pageNum}`;
    const bodyLines = meaningful.slice(1);

    const blocks = bodyLines.map((text) => ({
      kind: "body" as const,
      text,
      level: 0,
    }));

    slides.push({
      index: pageNum,
      title,
      blocks,
      notes: "",
      images: [],
    });
  }

  const name = file.name.replace(/\.pdf$/i, "");
  return { name, slides };
}
