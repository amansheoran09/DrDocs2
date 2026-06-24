// Verify the per-document-type OCR parser against sample cards.
// Run from web/:  node --experimental-strip-types scripts/ocr-verify.ts <dir>
import { readFileSync } from "node:fs";
import Tesseract from "tesseract.js";

import { parse } from "../src/core/ocrParse.ts";

const DIR = process.argv[2] ?? "/tmp/ocrsamples";

const expected: Record<string, Record<string, string | undefined>> = {
  "aadhaar.png": { docType: "aadhaar", number: "682629610773", name: "Aman Sharma", dob: "2006-12-24", expiry: undefined },
  "pan.png": { docType: "pan", number: "ABCPS1234K", name: "Aman Sharma", dob: "2006-12-24", expiry: undefined },
  "passport.png": { docType: "passport", number: "P1234567", name: "Aman Sharma", dob: "2006-12-24", expiry: "2031-08-14" },
  "driving_license.png": { docType: "driving_license", number: "HR2620110012345", name: "Aman Sharma", dob: "2006-12-24", expiry: "2026-12-23" },
  "voter_id.png": { docType: "voter_id", number: "ABC1234567", name: "Aman Sharma", dob: "2006-12-24", expiry: undefined },
  "student.png": { docType: "other", number: "240097", name: "Aman Sharma", dob: "2006-12-24", expiry: "2028-07-31" },
};

const fields = ["docType", "number", "name", "dob", "expiry"] as const;

// jsdelivr is blocked in this sandbox; use the locally-downloaded tessdata.
const ocrOpts = { langPath: process.env.TESSDATA ?? "/tmp/tessdata", cachePath: "/tmp/tesscache" };

for (const file of Object.keys(expected)) {
  const { data } = await Tesseract.recognize(readFileSync(`${DIR}/${file}`), "eng", ocrOpts);
  const got = parse(data.text) as Record<string, string | undefined>;
  const exp = expected[file];
  console.log(`\n=== ${file}  (confidence ${Math.round(data.confidence)}%) ===`);
  for (const f of fields) {
    const ok = (got[f] ?? "") === (exp[f] ?? "");
    console.log(`  ${ok ? "✅" : "❌"} ${f.padEnd(8)} got=${JSON.stringify(got[f])}  exp=${JSON.stringify(exp[f])}`);
  }
  if (process.env.RAW) console.log("  --- raw ---\n" + data.text.split("\n").map((l) => "  | " + l).join("\n"));
}
