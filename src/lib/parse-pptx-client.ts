/**
 * Client-side PPTX parser — runs entirely in the browser, no upload needed.
 * Mirrors the logic from /api/parse-pptx/route.ts but uses browser APIs.
 */
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { SlideBlock } from "./types";

const EMU_PER_INCH = 914400;
const PX_PER_INCH = 96;
const emu2px = (emu: number) => (emu / EMU_PER_INCH) * PX_PER_INCH;

// Total base64 image budget per parse — keeps memory reasonable in the browser
const IMAGE_BUDGET_BYTES = 3 * 1024 * 1024;

interface PositionedShape {
  y: number;
  x: number;
  w: number;
  h: number;
  kind: "text" | "image";
  isTitle?: boolean;
  paragraphs?: { text: string; level: number; hasBullet: boolean; isNumberedBullet: boolean }[];
  rId?: string;
}

export interface ParsedSlide {
  index: number;
  title: string;
  blocks: SlideBlock[];
  notes: string;
  images: { src: string }[];
}

export interface ParsedPptx {
  name: string;
  slides: ParsedSlide[];
}

export async function parsePptxFile(file: File): Promise<ParsedPptx> {
  if (!file.name.endsWith(".pptx")) {
    throw new Error("Only .pptx files are supported");
  }

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    textNodeName: "_text",
  });

  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
      const nb = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
      return na - nb;
    });

  const imageCache: Record<string, { mime: string; data: string; size: number }> = {};
  let imageBytesUsed = 0;

  async function loadImage(path: string) {
    if (imageCache[path]) return imageCache[path];
    const f = zip.files[path];
    if (!f) return null;
    const ext = path.split(".").pop()?.toLowerCase() || "png";
    const mime =
      ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : ext === "gif" ? "image/gif"
      : ext === "svg" ? "image/svg+xml"
      : ext === "webp" ? "image/webp"
      : "image/png";
    const buf = await f.async("base64");
    if (buf.length > 3 * 1024 * 1024) return null; // skip individual images >3 MB
    imageCache[path] = { mime, data: buf, size: buf.length };
    return imageCache[path];
  }

  const slides: ParsedSlide[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i];
    const slideXml = await zip.files[slidePath].async("string");
    const slideObj = parser.parse(slideXml);

    // Load relationships for image lookup
    const relPath = slidePath.replace(/slides\//, "slides/_rels/") + ".rels";
    const relMap: Record<string, string> = {};
    if (zip.files[relPath]) {
      const relXml = await zip.files[relPath].async("string");
      const relObj = parser.parse(relXml);
      const rels = relObj?.Relationships?.Relationship;
      const arr = Array.isArray(rels) ? rels : rels ? [rels] : [];
      for (const r of arr) {
        const id = r["@_Id"];
        const target = r["@_Target"];
        if (id && target) relMap[id] = "ppt/" + target.replace(/^\.\.\//, "");
      }
    }

    const shapes: PositionedShape[] = [];
    collectShapes(slideObj?.sld?.cSld?.spTree, shapes, 0, 0);
    shapes.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 300000) return a.y - b.y;
      return a.x - b.x;
    });

    const cleaned = shapes.filter(isContentful);
    const paired = pairNumbersWithText(cleaned);

    const blocks: SlideBlock[] = [];
    const images: { src: string }[] = [];
    let foundTitle = false;

    for (const s of paired) {
      if (s.kind === "text" && s.paragraphs) {
        for (const p of s.paragraphs) {
          const block = paragraphToBlock(p.text, p.hasBullet, p.isNumberedBullet, p.level);
          if (!block) continue;
          if (s.isTitle && !foundTitle) {
            block.kind = "title";
            foundTitle = true;
          }
          blocks.push(block);
        }
      } else if (s.kind === "image" && s.rId) {
        const path = relMap[s.rId];
        if (!path) continue;
        const img = await loadImage(path);
        if (!img) continue;
        const slideW = emu2px(s.w);
        const slideH = emu2px(s.h);
        if (slideW < 80 || slideH < 80) continue;
        if (imageBytesUsed + img.size > IMAGE_BUDGET_BYTES) continue;
        imageBytesUsed += img.size;
        images.push({ src: `data:${img.mime};base64,${img.data}` });
      }
    }

    const titleBlock = blocks.find((b) => b.kind === "title") || blocks[0];
    const title = (titleBlock?.text || `Slide ${i + 1}`).slice(0, 200);
    const contentBlocks = blocks.filter((b) => b !== titleBlock);

    let notes = "";
    const noteFile = `ppt/notesSlides/notesSlide${i + 1}.xml`;
    if (zip.files[noteFile]) {
      const noteXml = await zip.files[noteFile].async("string");
      const noteObj = parser.parse(noteXml);
      const noteShapes: PositionedShape[] = [];
      collectShapes(noteObj?.notes?.cSld?.spTree, noteShapes, 0, 0);
      const noteTexts: string[] = [];
      for (const s of noteShapes) {
        if (s.paragraphs) for (const p of s.paragraphs) noteTexts.push(p.text);
      }
      notes = noteTexts.join(" ").trim();
    }

    slides.push({ index: i + 1, title, blocks: contentBlocks, notes, images });
  }

  const name = file.name.replace(/\.pptx$/i, "");
  return { name, slides };
}

// ── Shape collection ──────────────────────────────────────────────────
function collectShapes(node: any, out: PositionedShape[], offsetX: number, offsetY: number): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const x of node) collectShapes(x, out, offsetX, offsetY);
    return;
  }
  if (typeof node !== "object") return;

  if (node.sp) {
    const shapes = Array.isArray(node.sp) ? node.sp : [node.sp];
    for (const s of shapes) {
      const pos = readPosition(s, offsetX, offsetY);
      const placeholderType = s?.nvSpPr?.nvPr?.ph?.["@_type"];
      const isTitle = placeholderType === "title" || placeholderType === "ctrTitle";
      const txBody = s?.txBody;
      if (!txBody) continue;
      const paras = Array.isArray(txBody.p) ? txBody.p : txBody.p ? [txBody.p] : [];
      const paragraphs: PositionedShape["paragraphs"] = [];
      for (const p of paras) {
        const para = readParagraph(p);
        if (para) paragraphs.push(para);
      }
      if (paragraphs.length === 0) continue;
      out.push({ x: pos.x, y: pos.y, w: pos.w, h: pos.h, kind: "text", isTitle, paragraphs });
    }
  }

  if (node.pic) {
    const pics = Array.isArray(node.pic) ? node.pic : [node.pic];
    for (const p of pics) {
      const pos = readPosition(p, offsetX, offsetY);
      const blip = p?.blipFill?.blip;
      const rId = blip?.["@_embed"];
      if (rId) out.push({ x: pos.x, y: pos.y, w: pos.w, h: pos.h, kind: "image", rId });
    }
  }

  if (node.grpSp) {
    const grps = Array.isArray(node.grpSp) ? node.grpSp : [node.grpSp];
    for (const g of grps) {
      const pos = readPosition(g, offsetX, offsetY);
      collectShapes(g, out, pos.x, pos.y);
    }
  }
}

function readPosition(shape: any, offsetX: number, offsetY: number) {
  const xfrm = shape?.spPr?.xfrm || shape?.grpSpPr?.xfrm;
  const off = xfrm?.off;
  const ext = xfrm?.ext;
  const x = off ? parseInt(off["@_x"] || "0") : 0;
  const y = off ? parseInt(off["@_y"] || "0") : 0;
  const w = ext ? parseInt(ext["@_cx"] || "0") : 0;
  const h = ext ? parseInt(ext["@_cy"] || "0") : 0;
  return { x: offsetX + x, y: offsetY + y, w, h };
}

function readParagraph(p: any) {
  if (!p) return null;
  const runs = Array.isArray(p.r) ? p.r : p.r ? [p.r] : [];
  const texts: string[] = [];
  for (const r of runs) {
    const t = r?.t;
    if (typeof t === "string") texts.push(t);
    else if (t && typeof t === "object" && typeof t._text === "string") texts.push(t._text);
  }
  if (typeof p.t === "string") texts.push(p.t);
  const text = texts.join("").trim();
  if (!text) return null;
  const pPr = p.pPr;
  const level = parseInt(pPr?.["@_lvl"] || "0", 10) || 0;
  const hasBullet = pPr?.buChar !== undefined || pPr?.buAutoNum !== undefined || pPr?.buBlip !== undefined;
  const isNumberedBullet = pPr?.buAutoNum !== undefined;
  return { text, level, hasBullet, isNumberedBullet };
}

function isContentful(s: PositionedShape): boolean {
  if (s.kind === "image") {
    return emu2px(s.w) >= 80 && emu2px(s.h) >= 80;
  }
  if (s.kind === "text" && s.paragraphs) {
    const combined = s.paragraphs.map((p) => p.text).join(" ").trim();
    if (!combined) return false;
    if (/^[\s■-◿☀-➿○●◦◇★☆▪▫■□△▲▽▼※]+$/.test(combined)) return false;
    return true;
  }
  return false;
}

function pairNumbersWithText(shapes: PositionedShape[]): PositionedShape[] {
  const out: PositionedShape[] = [];
  for (let i = 0; i < shapes.length; i++) {
    const s = shapes[i];
    if (s.kind !== "text" || !s.paragraphs) { out.push(s); continue; }
    const combined = s.paragraphs.map((p) => p.text).join(" ").trim();
    const isJustNumber = /^[\d]{1,3}[.)]?$/.test(combined) || /^[A-Z][.)]?$/.test(combined);
    if (isJustNumber) {
      let targetIdx = -1;
      let bestDist = Infinity;
      for (let j = i + 1; j < shapes.length; j++) {
        const t = shapes[j];
        if (t.kind !== "text" || !t.paragraphs) continue;
        const tText = t.paragraphs.map((p) => p.text).join(" ").trim();
        if (!tText || tText.length < 10) continue;
        if (/^[\d]{1,3}[.)]?$/.test(tText)) continue;
        const dy = Math.abs(t.y - s.y);
        const dx = Math.abs(t.x - s.x);
        const dist = dy * 0.7 + dx * 0.3;
        if (dist < bestDist && dist < 2_000_000) { bestDist = dist; targetIdx = j; }
      }
      if (targetIdx >= 0) {
        const target = shapes[targetIdx];
        const numText = combined.replace(/[.)]/g, "");
        shapes[targetIdx] = {
          ...target,
          paragraphs: target.paragraphs!.map((p, idx) =>
            idx === 0 ? { ...p, text: `${numText}. ${p.text}`, isNumberedBullet: true } : p,
          ),
        };
        continue;
      }
    }
    out.push(s);
  }
  return out;
}

function paragraphToBlock(text: string, hasBullet: boolean, isNumberedBullet: boolean, level: number): SlideBlock | null {
  if (!text) return null;
  const numberedMatch = text.match(/^(\d+)[.)]\s+(.+)/);
  const bulletMatch = text.match(/^[•·▪◦●○■□▪]\s+(.+)/);
  let kind: SlideBlock["kind"] = "body";
  let cleanText = text;
  if (isNumberedBullet || numberedMatch) {
    kind = "numbered";
    cleanText = numberedMatch ? numberedMatch[2] : text;
  } else if (hasBullet || bulletMatch || level > 0) {
    kind = "bullet";
    cleanText = bulletMatch ? bulletMatch[1] : text;
  } else if (text.startsWith('"') && text.endsWith('"') && text.length > 20) {
    kind = "quote";
    cleanText = text.slice(1, -1);
  } else if (text.endsWith(":") && text.length < 60) {
    kind = "subheading";
  }
  return { kind, text: cleanText, level };
}
