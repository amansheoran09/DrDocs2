// Free, client-side OCR with Tesseract.js (no API key, no backend, no cost).
// Recognizes text from a document image and parses the fields DocVault needs.
//
// Phone photos of ID cards are frequently rotated (cards shot sideways) and
// large. Tesseract can't read rotated text, so we render the image to a canvas
// at 0/90/270/180°, OCR each, and keep the best-scoring orientation. Images are
// also downscaled for speed and better accuracy. Runs entirely on-device.
import Tesseract from "tesseract.js";

export interface OcrResult {
  rawText: string;
  docType?: string; // wire value, if confidently detected
  number?: string;
  name?: string;
  dob?: string; // yyyy-mm-dd
  expiry?: string; // yyyy-mm-dd
  confidence: number; // 0..1
  angle: number; // orientation that read best
}

const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
const AADHAAR_RE = /\b(\d{4})\s?(\d{4})\s?(\d{4})\b/;
const PASSPORT_RE = /\b[A-PR-WY][0-9]{7}\b/;
const DATE_G = /\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b/g;
const BAD_NAME =
  /(INDIA|GOVERNMENT|GOVT|INCOME|TAX|DEPARTMENT|AADHAAR|UNIQUE|IDENTIF|PASSPORT|LICENCE|LICENSE|ELECTION|MALE|FEMALE|DOB|YEAR|BIRTH|REPUBLIC|ISSUE|DATE)/i;

const iso = (dd: string, mm: string, yyyy: string) => `${yyyy}-${mm}-${dd}`;

function detectType(text: string): string | undefined {
  const t = text.toUpperCase();
  if (PAN_RE.test(t) || t.includes("INCOME TAX") || t.includes("PERMANENT ACCOUNT")) return "pan";
  if (AADHAAR_RE.test(t) || t.includes("AADHAAR") || t.includes("UNIQUE IDENTIF")) return "aadhaar";
  if (t.includes("PASSPORT")) return "passport";
  if (t.includes("DRIVING") || t.includes("LICENCE") || t.includes("LICENSE")) return "driving_license";
  if (t.includes("ELECTION") || t.includes("ELECTOR")) return "voter_id";
  return undefined;
}

function extractNumber(text: string, docType?: string): string | undefined {
  const t = text.toUpperCase();
  if (docType === "pan") return t.match(PAN_RE)?.[0];
  if (docType === "aadhaar") {
    const m = t.match(AADHAAR_RE);
    return m ? `${m[1]}${m[2]}${m[3]}` : undefined;
  }
  if (docType === "passport") return t.match(PASSPORT_RE)?.[0];
  const a = t.match(AADHAAR_RE);
  return t.match(PAN_RE)?.[0] ?? (a ? `${a[1]}${a[2]}${a[3]}` : undefined) ?? t.match(PASSPORT_RE)?.[0];
}

function matchLabelledDate(text: string, label: RegExp): string | undefined {
  const m = text.match(label);
  if (!m) return undefined;
  return iso(m[1], m[2], m[3]);
}

function parseDates(text: string) {
  const dob = matchLabelledDate(text, /(?:DOB|D\.?O\.?B|BIRTH|जन्म)\D{0,8}(\d{2})[/\-.](\d{2})[/\-.](\d{4})/i);
  const issue = matchLabelledDate(text, /ISSUE\s*DATE\D{0,8}(\d{2})[/\-.](\d{2})[/\-.](\d{4})/i);
  const all: string[] = [];
  for (const m of text.matchAll(DATE_G)) {
    const month = Number(m[2]);
    const day = Number(m[1]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) all.push(iso(m[1], m[2], m[3]));
  }
  all.sort();
  // Expiry = latest date that isn't the DOB or the issue date.
  const expiry = [...all].reverse().find((d) => d !== dob && d !== issue);
  return { dob: dob ?? all[0], expiry };
}

function extractName(text: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  // Aadhaar/most IDs: the name sits on the line just above the DOB line.
  for (let i = 1; i < lines.length; i++) {
    if (/DOB|जन्म|BIRTH/i.test(lines[i])) {
      const cand = lines[i - 1];
      const words = cand.split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && !BAD_NAME.test(cand) && words.every((w) => /^[A-Za-z.]{2,}$/.test(w))) {
        return title(cand);
      }
    }
  }
  // Fallback: first plausible 2–3 word alphabetic line.
  for (const line of lines) {
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 3 && !BAD_NAME.test(line) && words.every((w) => /^[A-Za-z.]{2,}$/.test(w))) {
      return title(line);
    }
  }
  return undefined;
}

function parse(text: string): Omit<OcrResult, "rawText" | "confidence" | "angle"> {
  const docType = detectType(text);
  const { dob, expiry } = parseDates(text);
  return { docType, number: extractNumber(text, docType), name: extractName(text), dob, expiry };
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
function score(p: ReturnType<typeof parse>, confidence: number): number {
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
