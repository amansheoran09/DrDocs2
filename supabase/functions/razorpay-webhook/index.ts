// razorpay-webhook/index.ts
// ---------------------------------------------------------------------------
// Razorpay payment webhook handler (Section 5.3 / Section 6.4 step 5).
//
// On `payment.captured` we:
//   1. verify the webhook HMAC signature (never trust an unsigned webhook),
//   2. mark the order paid + confirmed,
//   3. credit any pending referral reward (Section 6.5),
//   4. send the NTF-06 "Booking Confirmed" push (Section 8).
//
// Deploy: supabase functions deploy razorpay-webhook --no-verify-jwt
// Configure the same URL + secret in the Razorpay dashboard.
// ---------------------------------------------------------------------------

import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { sendPush } from "../_shared/onesignal.ts";
import { formatDate } from "../_shared/format.ts";

const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

// Rewards from Section 6.5, in paise.
const REWARD_REFERRAL_REGISTER = 5_000; //  Rs.50
const REWARD_REFERRAL_FIRST_SERVICE = 25_000; // Rs.250

/** Constant-time-ish HMAC-SHA256 verification of the raw request body. */
async function verifySignature(raw: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // length-safe compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function handlePaymentCaptured(payment: Record<string, unknown>) {
  // The booking flow stores order_id in Razorpay order notes.
  const notes = (payment.notes ?? {}) as Record<string, string>;
  const orderId = notes.docvault_order_id;
  const paymentId = payment.id as string;
  if (!orderId) {
    console.warn("payment.captured with no docvault_order_id note", paymentId);
    return;
  }

  // 1. Confirm the order (idempotent: only act on a still-pending order).
  const { data: order } = await supabaseAdmin
    .from("orders")
    .update({ status: "confirmed", payment_status: "paid", payment_id: paymentId })
    .eq("order_id", orderId)
    .eq("payment_status", "pending")
    .select("user_id, service_id, booking_date, booking_slot")
    .maybeSingle();

  if (!order) return; // already processed or not found

  // 2. Referral: if this user's referral is awaiting their first completed
  //    service booking, credit the referrer (Section 6.5).
  await creditReferralIfFirstService(order.user_id);

  // 3. NTF-06 Booking Confirmed.
  await supabaseAdmin.from("notifications").insert({
    user_id: order.user_id,
    template_id: "NTF-06",
    title: "Booking Confirmed!",
    body:
      `Order confirmed for ${formatDate(order.booking_date)} ${order.booking_slot}. ` +
      `Agent will arrive at your address.`,
    deep_link: "SV-07",
  });
  try {
    await sendPush({
      externalUserId: order.user_id,
      title: "Booking Confirmed!",
      body:
        `Order confirmed for ${formatDate(order.booking_date)} ${order.booking_slot}. ` +
        `Agent will arrive at your address.`,
      deepLink: "SV-07",
    });
  } catch (e) {
    console.error("confirm push failed", e);
  }
}

async function creditReferralIfFirstService(userId: string) {
  const { data: ref } = await supabaseAdmin
    .from("referrals")
    .select("referral_id, referrer_user_id, status")
    .eq("referred_user_id", userId)
    .eq("status", "registered")
    .maybeSingle();
  if (!ref) return;

  // Atomic ledger insert + balance update.
  await supabaseAdmin.rpc("credit_doccash", {
    p_user_id: ref.referrer_user_id,
    p_amount: REWARD_REFERRAL_FIRST_SERVICE,
    p_type: "earned_referral",
    p_description: "Referral reward — friend completed first service booking",
    p_reference_id: ref.referral_id,
  });
  await supabaseAdmin
    .from("referrals")
    .update({
      status: "first_service_completed",
      reward_amount: REWARD_REFERRAL_REGISTER + REWARD_REFERRAL_FIRST_SERVICE,
      rewarded_at: new Date().toISOString(),
    })
    .eq("referral_id", ref.referral_id);
}

Deno.serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!(await verifySignature(raw, signature))) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw);
  try {
    if (event.event === "payment.captured") {
      await handlePaymentCaptured(event.payload.payment.entity);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
