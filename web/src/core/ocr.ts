// Free, client-side OCR with Tesseract.js (no API key, no backend, no cost).
//
// Phone photos of ID cards are frequently rotated (cards shot sideways) and
// large. Tesseract can't read rotated text, so we render the image to a canvas
// at 0/90/270/180°, OCR each, and keep the best-scoring orientation. Images are
// also downscaled for speed and better accuracy. Runs entirely on-device.
// Field parsing lives in ./ocrParse (pure, unit-tested in Node).
import Tesseract from "tesseract.js";

import { parse, type ParsedFields } from "./ocrParse";

export interface OcrResult extends ParsedFields {
  rawText: string;
  confidence: number; // 0..1
  angle: number; // orientation that read best
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// Draw the image rotated by `deg`, downscaled so the long edge <= maxDim.
function rotatedDataUrl(img: HTMLImageElement, deg: number, maxDim = 1600): string {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = img.width * scale;
  const h = img.height * scale;
  const swap = deg === 90 || deg === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.92);
}

// Score a parse so we can compare orientations — matched fields matter more
// than Tesseract's raw confidence (which can be high on garbage).
function score(p: ParsedFields, confidence: number): number {
  return (p.number ? 3 : 0) + (p.dob ? 2 : 0) + (p.docType ? 1 : 0) + (p.expiry ? 1 : 0) + confidence;
}

export async function runOcr(
  image: File,
  onProgress?: (p: number) => void,
): Promise<OcrResult> {
  const objUrl = URL.createObjectURL(image);
  try {
    const img = await loadImage(objUrl);
    const angles = [0, 90, 270, 180];
    let best: OcrResult | null = null;

    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];
      const url = rotatedDataUrl(img, angle);
      const { data } = await Tesseract.recognize(url, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && onProgress) {
            onProgress((i + m.progress) / angles.length);
          }
        },
      });
      const text = data.text ?? "";
      const parsed = parse(text);
      const conf = (data.confidence ?? 0) / 100;
      const candidate: OcrResult = { rawText: text, confidence: conf, angle, ...parsed };
      if (!best || score(parsed, conf) > score(best, best.confidence)) best = candidate;
      // Good enough — stop early (most photos are upright or a single 90° turn).
      if (parsed.number && (parsed.dob || parsed.expiry)) break;
    }
    return best!;
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}
