import type { AlertSeverity, DocStatus } from "./types";

/** Paise -> "₹X". */
export const rupees = (paise: number): string => `₹${Math.round(paise / 100)}`;

/** Mask an ID number to its last 4 digits (Section 10 / 7.2). */
export function maskNumber(n: string | null): string {
  if (!n) return "—";
  if (n.length < 4) return n;
  return `XXXX XXXX ${n.slice(-4)}`;
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatMonthYear(date: string | null): string {
  if (!date) return "No Expiry";
  return `Valid until ${new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })}`;
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Status colours (Section 7.2 card spec).
export const statusColor: Record<DocStatus, string> = {
  valid: "var(--green)",
  expiring_soon: "var(--amber)",
  needs_renewal: "var(--amber)",
  expired: "var(--red)",
};

export const statusLabel: Record<DocStatus, string> = {
  valid: "Valid",
  expiring_soon: "Expiring Soon",
  needs_renewal: "Needs Renewal",
  expired: "Expired",
};

// Alert severity colours (AL-01 filter tabs).
export const severityColor: Record<AlertSeverity, string> = {
  critical: "var(--red)",
  urgent: "var(--orange)",
  warning: "var(--amber)",
  info: "var(--navy)",
};
