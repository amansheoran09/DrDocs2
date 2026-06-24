// Pure OCR post-processing: turn recognised text into structured document
// fields, per document type (Section 5.2 / 6.3). No DOM/Tesseract deps so it
// can be unit-tested in Node (see web/scripts/ocr-verify).

export interface ParsedFields {
  docType?: string;
  number?: string;
  name?: string;
  dob?: string; // yyyy-mm-dd
  expiry?: string; // yyyy-mm-dd
}

const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
const AADHAAR_RE = /\b(\d{4})\s?(\d{4})\s?(\d{4})\b/;
const PASSPORT_RE = /\b[A-PR-WY][0-9]{7}\b/;
const DATE_G = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/g;
// Indian driving-licence: SS RR YYYY NNNNNNN (state, RTO, year, serial).
const DL_RE = /\b[A-Z]{2}[-\s]?\d{2}[-\s]?(?:19|20)\d{2}[-\s]?\d{6,8}\b/;
// Voter EPIC: 3 letters + 7 digits.
const VOTER_RE = /\b[A-Z]{3}\d{7}\b/;
const BAD_NAME =
  /(INDIA|GOVERNMENT|GOVT|INCOME|TAX|DEPARTMENT|AADHAAR|UNIQUE|IDENTIF|PASSPORT|LICENCE|LICENSE|ELECTION|MALE|FEMALE|DOB|YEAR|BIRTH|REPUBLIC|ISSUE|DATE|ROLL|NUMBER|PROGRAM|EMERGENCY|BLOOD|GROUP|STUDENT|INSTITUTE|TECHNOLOGY|UNIVERSITY|COLLEGE|SIGNATURE|VALID|UNTIL|HOLDER|EMPLOYEE|ENGINEERING|SCIENCE|DETAILS|ADDRESS|FATHER|MOTHER|GUARDIAN|AUTHORITY|TRANSPORT)/i;

const pad = (n: string) => (n.length === 1 ? `0${n}` : n);
const iso = (dd: string, mm: string, yyyy: string) => `${yyyy}-${pad(mm)}-${pad(dd)}`;

export function detectType(text: string): string | undefined {
  const t = text.toUpperCase();
  if (PAN_RE.test(t) || t.includes("INCOME TAX") || t.includes("PERMANENT ACCOUNT")) return "pan";
  if (AADHAAR_RE.test(t) || t.includes("AADHAAR") || t.includes("UNIQUE IDENTIF")) return "aadhaar";
  if (t.includes("PASSPORT")) return "passport";
  if (
    t.includes("DRIVING") || t.includes("LICENCE") || t.includes("LICENSE") ||
    /\bDL\s*NO\b/.test(t) || DL_RE.test(t)
  ) {
    return "driving_license";
  }
  if (t.includes("ELECTION") || t.includes("ELECTOR") || VOTER_RE.test(t)) return "voter_id";
  if (
    t.includes("STUDENT") || t.includes("INSTITUTE") || t.includes("UNIVERSITY") ||
    t.includes("COLLEGE") || t.includes("ROLL NUMBER") || t.includes("EMPLOYEE") ||
    t.includes("IDENTITY CARD") || t.includes("ID CARD")
  ) {
    return "other";
  }
  return undefined;
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const cleanName = (s: string) => s.replace(/[^A-Za-z .]/g, " ").replace(/\s+/g, " ").trim();
const isNameLike = (s: string) => {
  const w = s.split(/\s+/).filter(Boolean);
  return s.length >= 2 && w.length >= 1 && w.length <= 4 && !BAD_NAME.test(s) && w.every((x) => /^[A-Za-z.]{2,}$/.test(x));
};

const DATE_ONE = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/;

// A date that follows a label. Looks for the date on the SAME line after the
// label first (the common "Label : 24/12/2006" case), then on the next couple
// of lines — line-based so it can't grab a date from an unrelated column.
function labelledDate(text: string, labelSrc: string): string | undefined {
  const lines = text.split("\n");
  const head = new RegExp(`(?:${labelSrc})`, "i");
  const toIso = (m: RegExpMatchArray) => iso(m[1], m[2], m[3]);
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].search(head);
    if (idx < 0) continue;
    const after = lines[i].slice(idx).match(DATE_ONE);
    if (after) return toIso(after);
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const m = lines[j].match(DATE_ONE);
      if (m) return toIso(m);
    }
  }
  return undefined;
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

function nameAfterLabel(text: string, labelSrc: string): string | undefined {
  const lines = text.split("\n").map((l) => l.trim());
  const head = new RegExp(`^\\W*(?:${labelSrc})\\b\\s*[:\\-]?\\s*(.*)$`, "i");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    // If the captured value still contains a ":" (e.g. label was "Given
    // Name(s) : AMAN"), keep only the part after the last colon.
    let raw = m[1];
    if (raw.includes(":")) raw = raw.slice(raw.lastIndexOf(":") + 1);
    const same = cleanName(raw);
    if (isNameLike(same)) return titleCase(same);
    if (i + 1 < lines.length) {
      const next = cleanName(lines[i + 1]);
      if (isNameLike(next)) return titleCase(next);
    }
  }
  return undefined;
}

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

function firstNameLine(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const c = cleanName(line);
    const w = c.split(/\s+/).filter(Boolean);
    if (w.length >= 2 && w.length <= 3 && isNameLike(c)) return titleCase(c);
  }
  return undefined;
}

function numberFromText(s: string): string | undefined {
  const toks = s.toUpperCase().match(/[A-Z0-9]{4,}/g);
  return toks?.find((tk) => /\d/.test(tk));
}

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

function extractFields(text: string, docType?: string): Omit<ParsedFields, "docType"> {
  const t = text.toUpperCase();
  const dob = labelledDate(text, "DOB|D\\.?O\\.?B|Date of Birth|BIRTH|जन्म");
  const aadhaar = t.match(AADHAAR_RE);
  const aadhaarNum = aadhaar ? `${aadhaar[1]}${aadhaar[2]}${aadhaar[3]}` : undefined;
  const dates = allDates(text);
  const issue = labelledDate(text, "Issue Date|Date of Issue|ISS");
  const latestNonDob = [...dates].reverse().find((d) => d !== dob && d !== issue);

  switch (docType) {
    case "pan":
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
        expiry: undefined,
      };
    case "passport": {
      const surname = nameAfterLabel(text, "Surname");
      const given = nameAfterLabel(text, "Given Name|Given Names|Given Name\\(s\\)");
      const full = [given, surname].filter(Boolean).join(" ").trim();
      return {
        number: t.match(PASSPORT_RE)?.[0],
        name: full || nameNearDob(text),
        dob,
        expiry: labelledDate(text, "Date of Expiry|Expiry|Valid Until|Valid Till") ?? latestNonDob,
      };
    }
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
        number: t.match(VOTER_RE)?.[0] ?? labelledValue(text, "ID No|Card No|EPIC"),
        name: nameAfterLabel(text, "Elector's Name|Elector Name|Name") ?? firstNameLine(text),
        dob,
        expiry: undefined,
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

export function parse(text: string): ParsedFields {
  const docType = detectType(text);
  return { docType, ...extractFields(text, docType) };
}
