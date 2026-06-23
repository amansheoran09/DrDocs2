// _shared/format.ts — shared display helpers used by Edge Functions.

/** Paise -> "Rs.X" (rupees, no decimals for whole amounts). */
export function rupees(paise: number): string {
  const r = paise / 100;
  return `Rs.${Number.isInteger(r) ? r : r.toFixed(2)}`;
}

/** Machine doc_type -> human label, matching the UI copy in Section 7.2. */
const DOC_LABELS: Record<string, string> = {
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  passport: "Passport",
  driving_license: "Driving License",
  voter_id: "Voter ID",
  birth_cert: "Birth Certificate",
  marriage_cert: "Marriage Certificate",
  class10_cert: "Class 10 Certificate",
  class12_cert: "Class 12 Certificate",
  vehicle_rc: "Vehicle RC",
  bank_passbook: "Bank Passbook",
  ration_card: "Ration Card",
  pension_card: "Pension Card",
  health_card: "Health Card",
  other: "Document",
};

export function docLabel(docType: string): string {
  return DOC_LABELS[docType] ?? "Document";
}

/** "23 Mar 2031" */
export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
