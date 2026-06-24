import { supabase } from "../core/supabase";
import type {
  AgentProfile,
  Alert,
  AppUser,
  DocCashTxn,
  DocVaultDocument,
  HealthBreakdown,
  NotificationPrefs,
  Order,
  Referral,
  Service,
} from "../models/types";

// All queries rely on Supabase RLS — they implicitly return only the signed-in
// user's rows (Section 5.1 / 10). The service catalogue is public-readable.

export async function fetchCurrentUser(): Promise<AppUser | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data as AppUser | null;
}

export async function fetchDocuments(): Promise<DocVaultDocument[]> {
  // DW-01 ordering: most-urgent expiry first; own docs only (member_id null).
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .is("member_id", null)
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as DocVaultDocument[];
}

export async function fetchDocument(docId: string): Promise<DocVaultDocument> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("doc_id", docId)
    .single();
  if (error) throw error;
  return data as DocVaultDocument;
}

export async function insertDocument(doc: Partial<DocVaultDocument>): Promise<string> {
  // DB triggers derive status + recompute the health score on insert (0007).
  const { data, error } = await supabase
    .from("documents")
    .insert(doc)
    .select("doc_id")
    .single();
  if (error) throw error;
  return (data as { doc_id: string }).doc_id;
}

// Upload a captured/selected image to the private `documents` bucket under
// {user_id}/{doc_id}.jpg and link it on the row. Returns {ok} with a reason on
// failure so the UI can tell the user (e.g. bucket not set up — storage.sql).
export async function uploadDocumentImage(
  userId: string,
  docId: string,
  file: File,
): Promise<{ ok: boolean; error?: string }> {
  const path = `${userId}/${docId}.jpg`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) {
    console.warn("document image upload failed:", error.message);
    return { ok: false, error: error.message };
  }
  await supabase.from("documents").update({ doc_image_url: path }).eq("doc_id", docId);
  return { ok: true };
}

// Resolve a stored image path to a temporary signed URL (1-hour, Section 5.7).
export async function signedDocImageUrl(path: string): Promise<string | null> {
  // Already a full URL (legacy/manual rows) — return as-is.
  if (path.startsWith("http")) return path;
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteDocument(docId: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("doc_id", docId);
  if (error) throw error;
}

export async function fetchAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("is_dismissed", false)
    .order("fires_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Alert[];
}

export async function fetchAlert(alertId: string): Promise<Alert> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("alert_id", alertId)
    .single();
  if (error) throw error;
  return data as Alert;
}

export async function dismissAlert(alertId: string): Promise<void> {
  const { error } = await supabase
    .from("alerts")
    .update({ is_dismissed: true })
    .eq("alert_id", alertId);
  if (error) throw error;
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function fetchService(serviceId: string): Promise<Service> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("service_id", serviceId)
    .single();
  if (error) throw error;
  return data as Service;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export interface NewOrder {
  service_id: string;
  booking_date: string; // yyyy-mm-dd
  booking_slot: string;
  address_line1: string;
  address_city: string;
  address_pincode: string;
  total_amount: number; // paise
  discount_amount?: number;
  promo_code?: string | null;
  payment_id?: string | null; // Razorpay payment id when paid via gateway
}

// SV-06 — create the booking. When a Razorpay payment id is supplied the order
// is recorded as paid/confirmed; otherwise it's left pending_payment (the
// gateway / webhook confirms it — Section 5.3 / supabase/functions).
export async function createOrder(o: NewOrder): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const paid = !!o.payment_id;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: uid,
      service_id: o.service_id,
      status: paid ? "confirmed" : "pending_payment",
      payment_status: paid ? "paid" : "pending",
      payment_id: o.payment_id ?? null,
      booking_date: o.booking_date,
      booking_slot: o.booking_slot,
      address_line1: o.address_line1,
      address_city: o.address_city,
      address_pincode: o.address_pincode,
      total_amount: o.total_amount,
      discount_amount: o.discount_amount ?? 0,
      promo_code: o.promo_code ?? null,
    })
    .select("order_id")
    .single();
  if (error) throw error;
  return (data as { order_id: string }).order_id;
}

// Submit a rating/review for a completed order (SV-08).
export async function rateOrder(orderId: string, rating: number, review: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ rating, review_text: review || null })
    .eq("order_id", orderId);
  if (error) throw error;
}

// Service id -> name lookup for the order list.
export async function fetchServiceNames(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("services").select("service_id, name");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as { service_id: string; name: string }[]) map[r.service_id] = r.name;
  return map;
}

// Apply a referral code at signup — server-side RPC that links the referral
// and credits the referrer Rs.50. Returns 'ok' | 'already_referred' |
// 'invalid_code' | 'not_authenticated'.
export async function applyReferral(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("apply_referral", { p_code: code });
  if (error) throw error;
  return (data as string) ?? "error";
}

// ER-02 — referrals made by the current user (RLS scopes to referrer).
export async function fetchReferrals(): Promise<Referral[]> {  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Referral[];
}

// ER-05 — DocCash ledger for the current user.
export async function fetchDocCash(): Promise<DocCashTxn[]> {
  const { data, error } = await supabase
    .from("doccash_transactions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocCashTxn[];
}

// ER-03 — the current user's agent profile, if they're registered.
export async function fetchAgentProfile(): Promise<AgentProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("agent_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data as AgentProfile | null;
}

// Register as a student agent: create the profile and flag the user.
export async function registerAgent(areas: string[]): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("agent_profiles")
    .insert({ agent_id: uid, areas_served: areas });
  if (error) throw error;
  await supabase.from("users").update({ is_agent: true }).eq("user_id", uid);
}

// Mark agent certification complete (ER-04). The Rs.200 reward is credited
// server-side (credit_doccash is service_role-only).
export async function completeCertification(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  await supabase
    .from("agent_profiles")
    .update({ certification_date: new Date().toISOString().slice(0, 10) })
    .eq("agent_id", uid);
  await supabase.from("users").update({ agent_certified: true }).eq("user_id", uid);
}

// PR-02 — update editable profile fields.
export async function updateProfile(
  patch: Partial<Pick<AppUser, "full_name" | "dob" | "city" | "email">>,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("users").update(patch).eq("user_id", uid);
  if (error) throw error;
}

const DEFAULT_PREFS: NotificationPrefs = {
  expiry_alerts: true,
  order_updates: true,
  referral_updates: true,
  promotional: false,
  alert_timings: [180, 90, 30, 7],
};

// PR-03 — notification preferences (one row per user).
export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return DEFAULT_PREFS;
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? ({ ...DEFAULT_PREFS, ...(data as NotificationPrefs) }) : DEFAULT_PREFS;
}

export async function saveNotificationPrefs(p: NotificationPrefs): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: uid, ...p, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// PR-04 — export everything DocVault holds for the user (DPDPA right to access).
export async function exportUserData(): Promise<Record<string, unknown>> {
  const [user, documents, orders, referrals, doccash, alerts] = await Promise.all([
    supabase.from("users").select("*").maybeSingle(),
    supabase.from("documents").select("*"),
    supabase.from("orders").select("*"),
    supabase.from("referrals").select("*"),
    supabase.from("doccash_transactions").select("*"),
    supabase.from("alerts").select("*"),
  ]);
  return {
    exported_at: new Date().toISOString(),
    user: user.data,
    documents: documents.data,
    orders: orders.data,
    referrals: referrals.data,
    doccash_transactions: doccash.data,
    alerts: alerts.data,
  };
}

// PR-04 — log an account-deletion request (the full cascade runs server-side).
export async function requestAccountDeletion(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  await supabase.from("consent_log").insert({ user_id: uid, action: "account_deletion_requested", consented: true });
}

// PR-06 — activate annual membership after payment.
export async function upgradeMembership(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const { error } = await supabase
    .from("users")
    .update({ subscription_status: "member", subscription_expiry: expiry.toISOString().slice(0, 10) })
    .eq("user_id", uid);
  if (error) throw error;
}

// AL-03 — the four sub-scores computed by the DB function (Section 6.1).
export async function fetchHealthBreakdown(): Promise<HealthBreakdown | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.rpc("health_score_breakdown", {
    p_user_id: uid,
  });
  if (error) throw error;
  return data as HealthBreakdown;
}
