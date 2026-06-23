// generate-alerts/index.ts
// ---------------------------------------------------------------------------
// DocVault daily alert CRON job (Section 6.2).
//
// Scheduled by pg_cron / Supabase Scheduled Functions to run every day at
// 08:00 IST. For every document it evaluates the expiry buckets and the
// cross-link gaps, inserts an `alerts` row (de-duplicated per doc+type+day),
// and dispatches the matching push notification (Section 8) via OneSignal.
//
// Invoke locally:  supabase functions serve generate-alerts
// Deploy:          supabase functions deploy generate-alerts --no-verify-jwt
// ---------------------------------------------------------------------------

import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { sendPush } from "../_shared/onesignal.ts";
import { docLabel, formatDate, rupees } from "../_shared/format.ts";

type Severity = "critical" | "urgent" | "warning" | "info";

interface DocRow {
  doc_id: string;
  user_id: string;
  doc_type: string;
  expiry_date: string | null;
  full_name: string;
  promotional: boolean;
  expiry_alerts: boolean;
}

interface BuiltAlert {
  alert_type: string;
  severity: Severity;
  title: string;
  message: string;
  deep_link: string;
}

/** Whole days from today until `date` (negative => already past). */
function daysUntil(date: string): number {
  const ms = new Date(date).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

/** The expiry rule-set from Section 6.2, evaluated newest-trigger-first. */
function buildExpiryAlert(doc: DocRow, firstName: string): BuiltAlert | null {
  if (!doc.expiry_date) return null;
  const days = daysUntil(doc.expiry_date);
  const name = docLabel(doc.doc_type);
  const on = formatDate(doc.expiry_date);
  const isDL = doc.doc_type === "driving_license";

  if (days < 0) {
    return {
      alert_type: "expiry_overdue",
      severity: "critical",
      title: `${name} has EXPIRED`,
      message:
        `Your ${name} expired on ${on}. You cannot use this document. Renew immediately.`,
      deep_link: "SV-03",
    };
  }
  if (days <= 7) {
    return {
      alert_type: "expiry_7",
      severity: "critical",
      title: "ACTION REQUIRED: 7 days left",
      message:
        `${firstName}, your ${name} expires ${on}. Book TATKAL service today — we process in 7 days.`,
      deep_link: "SV-03",
    };
  }
  if (days <= 30) {
    return {
      alert_type: "expiry_30",
      severity: "urgent",
      title: `URGENT: ${name} expires in 30 days`,
      message:
        `${firstName}, your ${name} must be renewed before ${on}. Tap to book now.`,
      deep_link: "SV-03",
    };
  }
  if (isDL && days <= 60) {
    return {
      alert_type: "expiry_60_dl",
      severity: "urgent",
      title: "Driving License expires in 60 days",
      message:
        `Your Driving License expires ${on}. Driving with an expired DL is a ${rupees(500000)} fine.`,
      deep_link: "SV-03",
    };
  }
  if (days <= 90) {
    return {
      alert_type: "expiry_90",
      severity: "warning",
      title: `Renew your ${name} soon`,
      message:
        `Only 3 months left on your ${name}. Book doorstep renewal now — we handle everything.`,
      deep_link: "SV-02",
    };
  }
  if (days <= 180) {
    return {
      alert_type: "expiry_180",
      severity: "info",
      title: `Your ${name} expires soon`,
      message:
        `${firstName}, your ${name} expires in 6 months on ${on}. Time to plan renewal.`,
      deep_link: "AL-02",
    };
  }
  return null;
}

async function run(): Promise<{ alerts: number; pushes: number }> {
  // Pull every expiring document joined with the owner's name + push prefs.
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select(
      "doc_id, user_id, doc_type, expiry_date, " +
        "users!inner(full_name), " +
        "notification_preferences(expiry_alerts)",
    )
    .not("expiry_date", "is", null);

  if (error) throw error;

  let alertCount = 0;
  let pushCount = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const raw of data ?? []) {
    // deno-lint-ignore no-explicit-any
    const r = raw as any;
    const doc: DocRow = {
      doc_id: r.doc_id,
      user_id: r.user_id,
      doc_type: r.doc_type,
      expiry_date: r.expiry_date,
      full_name: r.users?.full_name ?? "there",
      expiry_alerts: r.notification_preferences?.expiry_alerts ?? true,
      promotional: false,
    };
    const firstName = doc.full_name.split(" ")[0];
    const built = buildExpiryAlert(doc, firstName);
    if (!built) continue;

    // De-dupe: one alert per (doc, alert_type) per day.
    const { data: existing } = await supabaseAdmin
      .from("alerts")
      .select("alert_id")
      .eq("doc_id", doc.doc_id)
      .eq("alert_type", built.alert_type)
      .gte("created_at", `${today}T00:00:00Z`)
      .maybeSingle();
    if (existing) continue;

    const { error: insErr } = await supabaseAdmin.from("alerts").insert({
      user_id: doc.user_id,
      doc_id: doc.doc_id,
      alert_type: built.alert_type,
      severity: built.severity,
      title: built.title,
      message: built.message,
      fires_at: new Date().toISOString(),
    });
    if (insErr) {
      console.error("alert insert failed", insErr);
      continue;
    }
    alertCount++;

    // Respect the user's notification preference before pushing.
    if (!doc.expiry_alerts) continue;
    try {
      await sendPush({
        externalUserId: doc.user_id,
        title: built.title,
        body: built.message,
        deepLink: built.deep_link,
      });
      await supabaseAdmin
        .from("alerts")
        .update({ sent_at: new Date().toISOString() })
        .eq("doc_id", doc.doc_id)
        .eq("alert_type", built.alert_type)
        .is("sent_at", null);
      pushCount++;
    } catch (e) {
      console.error("push failed for", doc.user_id, e);
    }
  }

  return { alerts: alertCount, pushes: pushCount };
}

Deno.serve(async () => {
  try {
    const result = await run();
    return new Response(JSON.stringify({ ok: true, ...result }), {
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
