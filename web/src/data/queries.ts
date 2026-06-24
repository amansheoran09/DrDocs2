import { supabase } from "../core/supabase";
import type {
  AgentProfile,
  Alert,
  AppUser,
  DocCashTxn,
  DocVaultDocument,
  HealthBreakdown,
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

// ER-02 — referrals made by the current user (RLS scopes to referrer).
export async function fetchReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase
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
