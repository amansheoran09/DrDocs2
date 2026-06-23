import { supabase } from "../core/supabase";
import type {
  Alert,
  AppUser,
  DocVaultDocument,
  HealthBreakdown,
  Order,
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
// {user_id}/{doc_id}.jpg and link it on the row. Returns the storage path.
// Non-fatal: if the bucket/policies are not set up yet, the document is still
// saved (just without an image) — see supabase/storage.sql.
export async function uploadDocumentImage(
  userId: string,
  docId: string,
  file: File,
): Promise<string | null> {
  const path = `${userId}/${docId}.jpg`;
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) {
    console.warn("document image upload skipped:", error.message);
    return null;
  }
  await supabase.from("documents").update({ doc_image_url: path }).eq("doc_id", docId);
  return path;
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
