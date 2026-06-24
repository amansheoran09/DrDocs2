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
  /(INDIA|GOVERNMENT|GOVT|INCOME|TAX|DEPARTMENT|AADHAAR|UNIQUE|IDENTIF|PASSPORT|LICENCE|LICENSE|ELECTION|MALE|FEMALE|DOB|YEAR|BIRTH|REPUBLIC|ISSUE|DATE|ROLL|NUMBER|PROGRAM|EMERGENCY|BLOOD|GROUP|STUDENT|INSTITUTE|TECHNOLOGY|UNIVERSITY|COLLEGE|SIGNATURE|VALID|UNTIL|HOLDER|EMPLOYEE|ENGINEERING|SCIENCE|DETAILS|ADDRESS)/i;

const iso = (dd: string, mm: string, yyyy: string) => `${yyyy}-${mm}-${dd}`;

function detectType(text: string): string | undefined {
  const t = text.toUpperCase();
  if (PAN_RE.test(t) || t.includes("INCOME TAX") || t.includes("PERMANENT ACCOUNT")) return "pan";
  if (AADHAAR_RE.test(t) || t.includes("AADHAAR") || t.includes("UNIQUE IDENTIF")) return "aadhaar";
  if (t.includes("PASSPORT")) return "passport";
  if (t.includes("DRIVING") || t.includes("LICENCE") || t.includes("LICENSE")) return "driving_license";
  if (t.includes("ELECTION") || t.includes("ELECTOR")) return "voter_id";
  // Student / employee / institute ID cards aren't a government type — mark as
  // "other" so the form doesn't mislabel them as Aadhaar.
  if (
    t.includes("STUDENT") || t.includes("INSTITUTE") || t.includes("UNIVERSITY") ||
    t.includes("COLLEGE") || t.includes("ROLL NUMBER") || t.includes("EMPLOYEE") ||
    t.includes("IDENTITY CARD") || t.includes("ID CARD")
  ) {
    return "other";
  }
  return undefined;
}

// Indian driving-licence: SS RR YYYY NNNNNNN (state, RTO, year, serial).
const DL_RE = /\b[A-Z]{2}[-\s]?\d{2}[-\s]?(?:19|20)\d{2}[-\s]?\d{6,8}\b/;
// Voter EPIC: 3 letters + 7 digits.
const VOTER_RE = /\b[A-Z]{3}\d{7}\b/;

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const cleanName = (s: string) => s.replace(/[^A-Za-z .]/g, " ").replace(/\s+/g, " ").trim();
const isNameLike = (s: string) => {
  const w = s.split(/\s+/).filter(Boolean);
  return s.length >= 2 && w.length >= 1 && w.length <= 4 && !BAD_NAME.test(s) && w.every((x) => /^[A-Za-z.]{2,}$/.test(x));
};

// A date that follows a given label, e.g. labelledDate(t, "DOB|Date of Birth").
// The label alternation MUST be grouped, otherwise the date capture binds only
// to the last alternative and a plain "DOB" match yields empty groups.
function labelledDate(text: string, labelSrc: string): string | undefined {
  const re = new RegExp(`(?:${labelSrc})` + String.raw`\D{0,12}(\d{2})[/\-.](\d{2})[/\-.](\d{4})`, "i");
  const m = text.match(re);
  return m && m[1] && m[2] && m[3] ? iso(m[1], m[2], m[3]) : undefined;
}

function allDates(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(DATE_G)) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) out.push(iso(m[1], m[2], m[3]));
  }
  return out.sort();
}

// Name following a label like "Name:" / "Surname:" — either on the same line
// ("Name: AMAN") or with the label alone and the value on the next line
// ("Name" \n "AMAN"), as on student/employee ID cards.
function nameAfterLabel(text: string, labelSrc: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim());
  const head = new RegExp(`^(?:${labelSrc})\\b\\s*[:\\-]?\\s*(.*)$`, "i");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const same = cleanName(m[1]);
    if (isNameLike(same)) return titleCase(same);
    if (i + 1 < lines.length) {
      const next = cleanName(lines[i + 1]);
      if (isNameLike(next)) return titleCase(next);
    }
  }
  return undefined;
}

// Name on/above the DOB line (handles "Aman DOB : 24/12/2006" and single-word).
function nameNearDob(text: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/DOB|जन्म|BIRTH/i.test(lines[i])) {
      const before = cleanName(lines[i].split(/DOB|जन्म|BIRTH/i)[0]);
      if (isNameLike(before)) return titleCase(before);
      if (i > 0) {
        const prev = cleanName(lines[i - 1]);
        if (isNameLike(prev)) return titleCase(prev);
      }
    }
  }
  return undefined;
}

// Last resort: first clean 2–3 word alphabetic line.
function firstNameLine(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const c = cleanName(line);
    const w = c.split(/\s+/).filter(Boolean);
    if (w.length >= 2 && w.length <= 3 && isNameLike(c)) return titleCase(c);
  }
  return undefined;
}

// First alphanumeric token (>=4 chars) that contains a digit — a plausible ID.
function numberFromText(s: string): string | undefined {
  const toks = s.toUpperCase().match(/[A-Z0-9]{4,}/g);
  return toks?.find((tk) => /\d/.test(tk));
}

// A labelled ID value, on the same line or the next ("Roll Number" \n "240097").
function labelledValue(text: string, labelSrc: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim());
  const head = new RegExp(`^\\W*(?:${labelSrc})\\b\\s*[:\\-]?\\s*(.*)$`, "i");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const same = numberFromText(m[1]);
    if (same) return same;
    if (i + 1 < lines.length) {
      const next = numberFromText(lines[i + 1]);
      if (next) return next;
    }
  }
  return undefined;
}

const ID_LABELS =
  "Roll Number|Roll No|Registration No|Regn No|Reg No|Enrol?ment No|Enrolment|ID No|ID Number|Card No|Membership No|Account No|UAN";

type Fields = Pick<OcrResult, "number" | "name" | "dob" | "expiry">;

// Per-document-type extraction templates (Section 5.2 / 6.3 post-processing).
function extractFields(text: string, docType?: string): Fields {
  const t = text.toUpperCase();
  const dob = labelledDate(text, "DOB|D\\.?O\\.?B|Date of Birth|BIRTH|जन्म");
  const aadhaar = t.match(AADHAAR_RE);
  const aadhaarNum = aadhaar ? `${aadhaar[1]}${aadhaar[2]}${aadhaar[3]}` : undefined;
  const dates = allDates(text);
  const issue = labelledDate(text, "Issue Date|Date of Issue|ISS");
  const latestNonDob = [...dates].reverse().find((d) => d !== dob && d !== issue);

  switch (docType) {
    case "pan":
      // PAN: holder name is usually labelled or the first clean name line;
      // no expiry.
      return {
        number: t.match(PAN_RE)?.[0],
        name: nameAfterLabel(text, "Name") ?? nameNearDob(text) ?? firstNameLine(text),
        dob: dob ?? dates[0],
        expiry: undefined,
      };
    case "aadhaar":
      return {
        number: aadhaarNum,
        name: nameNearDob(text) ?? nameAfterLabel(text, "Name") ?? firstNameLine(text),
        dob: dob ?? dates[0],
        expiry: undefined, // Aadhaar never expires
      };
    case "passport":
      return {
        number: t.match(PASSPORT_RE)?.[0],
        name:
          nameAfterLabel(text, "Surname") ??
          nameAfterLabel(text, "Given Name|Given Names") ??
          nameNearDob(text),
        dob,
        expiry: labelledDate(text, "Date of Expiry|Expiry|Valid Until") ?? latestNonDob,
      };
    case "driving_license": {
      const labelled = t.match(/(?:DL|LICENCE|LICENSE)\s*(?:NO|NUMBER)?\.?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s-]{8,18})/);
      return {
        number: t.match(DL_RE)?.[0]?.replace(/\s+/g, "") ?? labelled?.[1]?.replace(/\s+/g, ""),
        name: nameAfterLabel(text, "Name") ?? nameNearDob(text) ?? firstNameLine(text),
        dob,
        expiry: labelledDate(text, "Valid Till|Validity|Valid Upto|Valid Up to|Date of Expiry") ?? latestNonDob,
      };
    }
    case "voter_id":
      return {
        number: t.match(VOTER_RE)?.[0],
        name: nameAfterLabel(text, "Elector's Name|Name") ?? firstNameLine(text),
        dob,
        expiry: undefined, // Voter ID does not expire
      };
    default:
      return {
        number:
          t.match(PAN_RE)?.[0] ?? aadhaarNum ?? t.match(PASSPORT_RE)?.[0] ?? labelledValue(text, ID_LABELS),
        name: nameAfterLabel(text, "Name") ?? nameNearDob(text) ?? firstNameLine(text),
        dob: dob ?? dates[0],
        expiry: latestNonDob,
      };
  }
}

function parse(text: string): Omit<OcrResult, "rawText" | "confidence" | "angle"> {
  const docType = detectType(text);
  return { docType, ...extractFields(text, docType) };
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
