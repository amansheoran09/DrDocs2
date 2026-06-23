// Free, client-side OCR with Tesseract.js (no API key, no backend, no cost).
// Recognizes text from a document image and parses the fields DocVault needs,
// per-document-type — the post-processing layer the plan describes (Section 6.3),
// just running on-device instead of via Google Vision.
import Tesseract from "tesseract.js";

export interface OcrResult {
  rawText: string;
  docType?: string; // wire value, if confidently detected
  number?: string;
  expiry?: string; // yyyy-mm-dd
  name?: string;
  confidence: number; // 0..1
}

const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
const AADHAAR_RE = /\b(\d{4})\s?(\d{4})\s?(\d{4})\b/;
const PASSPORT_RE = /\b[A-PR-WYa-pr-wy][0-9]{7}\b/;
const DATE_RE = /\b(\d{2})[/\-.](\d{2})[/\-.](\d{4})\b/g;

function detectType(text: string): string | undefined {
  const t = text.toUpperCase();
  if (PAN_RE.test(t) || t.includes("INCOME TAX") || t.includes("PERMANENT ACCOUNT")) return "pan";
  if (AADHAAR_RE.test(t) || t.includes("AADHAAR") || t.includes("UNIQUE IDENTIFICATION")) return "aadhaar";
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
  // fall back to the strongest pattern present
  return t.match(PAN_RE)?.[0] ?? t.match(PASSPORT_RE)?.[0];
}

// Pick the latest date as the likely expiry (DOB is usually the earliest).
function extractExpiry(text: string): string | undefined {
  const dates: string[] = [];
  for (const m of text.matchAll(DATE_RE)) {
    const [, dd, mm, yyyy] = m;
    const day = Number(dd), month = Number(mm);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
  }
  if (dates.length === 0) return undefined;
  dates.sort();
  return dates[dates.length - 1];
}

// Best-effort name guess: a line of 2–3 alphabetic words, not a keyword line.
function extractName(text: string): string | undefined {
  const bad = /(INDIA|GOVERNMENT|INCOME|TAX|DEPARTMENT|AADHAAR|PASSPORT|LICENCE|LICENSE|MALE|FEMALE|DOB|YEAR|BIRTH|REPUBLIC)/i;
  for (const line of text.split("\n").map((l) => l.trim())) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 3 &&
      !bad.test(line) &&
      words.every((w) => /^[A-Za-z.]{2,}$/.test(w))
    ) {
      return line.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return undefined;
}

export async function runOcr(
  image: File | string,
  onProgress?: (p: number) => void,
): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(image, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  const text = data.text ?? "";
  const docType = detectType(text);
  return {
    rawText: text,
    docType,
    number: extractNumber(text, docType),
    expiry: extractExpiry(text),
    name: extractName(text),
    confidence: (data.confidence ?? 0) / 100,
  };
}
