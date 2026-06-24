import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  exportUserData,
  fetchCurrentUser,
  fetchNotificationPrefs,
  requestAccountDeletion,
  saveNotificationPrefs,
  updateProfile,
  upgradeMembership,
} from "../data/queries";
import { openRazorpayCheckout, razorpayConfigured } from "../core/razorpay";
import { supabase } from "../core/supabase";
import { useAsync } from "../data/useAsync";
import { AppBar, ErrorState, Skeleton } from "../components/ui";
import type { NotificationPrefs } from "../models/types";
import { rupees } from "../models/format";

const MEMBERSHIP_PAISE = 749700; // ₹7,497 / year

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
        background: on ? "var(--green)" : "var(--border)", position: "relative", transition: "background .15s",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%",
        background: "#fff", transition: "left .15s",
      }} />
    </button>
  );
}

// PR-02 Personal Details
export function PersonalDetails() {
  const nav = useNavigate();
  const user = useAsync(fetchCurrentUser, []);
  const [form, setForm] = useState<{ full_name: string; dob: string; city: string; email: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const f = form ?? (user.data
    ? { full_name: user.data.full_name, dob: user.data.dob, city: user.data.city, email: user.data.email ?? "" }
    : null);

  const save = async () => {
    if (!f) return;
    setSaving(true); setError(null);
    try {
      await updateProfile({ full_name: f.full_name.trim(), dob: f.dob, city: f.city, email: f.email.trim() || null });
      nav(-1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <>
      <AppBar title="Personal Details" back />
      <div className="screen">
        {user.loading || !f ? <Skeleton /> : (
          <>
            <Field label="Full name" value={f.full_name} onChange={(v) => setForm({ ...f, full_name: v })} />
            <Field label="Date of birth" type="date" value={f.dob} onChange={(v) => setForm({ ...f, dob: v })} />
            <Field label="City" value={f.city} onChange={(v) => setForm({ ...f, city: v })} />
            <Field label="Email (optional)" type="email" value={f.email} onChange={(v) => setForm({ ...f, email: v })} />
            {error && <p style={{ color: "var(--red)" }}>{error}</p>}
            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          </>
        )}
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// PR-03 Notification Settings
export function NotificationSettings() {
  const prefs = useAsync(fetchNotificationPrefs, []);
  const [local, setLocal] = useState<NotificationPrefs | null>(null);
  const [saved, setSaved] = useState(false);
  const p = local ?? prefs.data ?? null;

  const update = async (next: NotificationPrefs) => {
    setLocal(next);
    await saveNotificationPrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };
  const toggle = (k: keyof NotificationPrefs) => p && update({ ...p, [k]: !p[k] });
  const setTiming = (days: number) => {
    if (!p) return;
    const has = p.alert_timings.includes(days);
    update({ ...p, alert_timings: has ? p.alert_timings.filter((d) => d !== days) : [...p.alert_timings, days].sort((a, b) => b - a) });
  };

  return (
    <>
      <AppBar title="Notifications" back action={saved ? <span className="muted">Saved ✓</span> : undefined} />
      <div className="screen">
        {prefs.loading || !p ? <Skeleton /> : prefs.error ? <ErrorState error={prefs.error} /> : (
          <>
            <Row label="Expiry alerts" on={p.expiry_alerts} onChange={() => toggle("expiry_alerts")} />
            <Row label="Order updates" on={p.order_updates} onChange={() => toggle("order_updates")} />
            <Row label="Referral updates" on={p.referral_updates} onChange={() => toggle("referral_updates")} />
            <Row label="Promotional" on={p.promotional} onChange={() => toggle("promotional")} />
            <h3 style={{ marginTop: 16 }}>Remind me before expiry</h3>
            <div className="chips">
              {[180, 90, 30, 7].map((d) => (
                <button key={d} className={`chip ${p.alert_timings.includes(d) ? "active" : ""}`} onClick={() => setTiming(d)}>
                  {d} days
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// PR-04 Privacy & Data
export function PrivacyData() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "docvault-data.json"; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete your account and all data? This starts a 30-day cool-off and cannot be undone.")) return;
    setBusy(true);
    try {
      await requestAccountDeletion();
      await supabase.auth.signOut();
      nav("/login", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppBar title="Privacy & Data" back />
      <div className="screen">
        <div className="card">
          <strong>Your data</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            DrDocs stores your profile, documents, orders, referrals and DocCash ledger — all private to your account (RLS).
          </p>
        </div>
        <button className="btn btn-outline" style={{ marginTop: 12 }} disabled={busy} onClick={download}>
          ⬇ Download my data
        </button>
        <button
          className="btn btn-outline"
          style={{ marginTop: 12, color: "var(--red)", borderColor: "var(--red)" }}
          disabled={busy}
          onClick={del}
        >
          Delete my account
        </button>
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Aadhaar/ID numbers are masked everywhere and document images are stored encrypted with 1-hour signed access (DPDPA 2023).
        </p>
      </div>
    </>
  );
}

// PR-05 Security Settings (device-local app lock)
export function SecuritySettings() {
  const [pin, setPin] = useState(() => localStorage.getItem("app_pin") ?? "");
  const [entry, setEntry] = useState("");
  const [bio, setBio] = useState(() => localStorage.getItem("biometric_lock") === "1");
  const [msg, setMsg] = useState<string | null>(null);

  const savePin = () => {
    if (!/^\d{4}$/.test(entry)) { setMsg("Enter a 4-digit PIN."); return; }
    localStorage.setItem("app_pin", entry);
    setPin(entry); setEntry(""); setMsg("App PIN set.");
  };
  const clearPin = () => { localStorage.removeItem("app_pin"); setPin(""); setMsg("App PIN removed."); };
  const toggleBio = (v: boolean) => { setBio(v); localStorage.setItem("biometric_lock", v ? "1" : "0"); };

  return (
    <>
      <AppBar title="Security" back />
      <div className="screen">
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>Biometric / device unlock</strong><p className="muted" style={{ margin: 0 }}>Require unlock to open documents</p></div>
          <Toggle on={bio} onChange={toggleBio} />
        </div>

        <h3 style={{ marginTop: 16 }}>App PIN</h3>
        {pin ? (
          <>
            <div className="card">A 4-digit app PIN is set. 🔒</div>
            <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={clearPin}>Remove PIN</button>
          </>
        ) : (
          <>
            <div className="field">
              <label>Set a 4-digit PIN</label>
              <input className="input" inputMode="numeric" maxLength={4} value={entry} onChange={(e) => setEntry(e.target.value.replace(/\D/g, ""))} />
            </div>
            <button className="btn btn-primary" onClick={savePin}>Set PIN</button>
          </>
        )}

        <h3 style={{ marginTop: 16 }}>Active sessions</h3>
        <div className="card" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>This device</span><span className="muted">current</span>
        </div>
        {msg && <p className="muted" style={{ marginTop: 12 }}>{msg}</p>}
      </div>
    </>
  );
}

// PR-06 Subscription
export function Subscription() {
  const user = useAsync(fetchCurrentUser, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const member = user.data?.subscription_status === "member";

  const activate = async () => {
    await upgradeMembership();
    user.reload();
    setBusy(false);
  };
  const upgrade = async () => {
    setError(null); setBusy(true);
    if (!razorpayConfigured()) { await activate(); return; }
    try {
      await openRazorpayCheckout({
        amountPaise: MEMBERSHIP_PAISE,
        description: "DrDocs Annual Membership",
        onSuccess: () => void activate(),
        onDismiss: () => setBusy(false),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <>
      <AppBar title="Subscription" back />
      <div className="screen">
        {user.loading ? <Skeleton /> : (
          <>
            <div className="card center" style={{ flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 36 }}>{member ? "👑" : "🆓"}</span>
              <strong>{member ? "Member" : "Free plan"}</strong>
              {member && user.data?.subscription_expiry && (
                <span className="muted">Renews on {user.data.subscription_expiry}</span>
              )}
            </div>

            <h3 style={{ marginTop: 16 }}>Membership includes</h3>
            {["Priority doorstep service", "Family profiles (up to 6)", "Unlimited expiry alerts", "Exclusive service discounts"].map((b) => (
              <div key={b} className="card" style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "var(--green)" }}>✓</span><span>{b}</span>
              </div>
            ))}

            {error && <p style={{ color: "var(--red)" }}>{error}</p>}
            {!member ? (
              <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={upgrade}>
                {busy ? "Processing…" : `Upgrade — ${rupees(MEMBERSHIP_PAISE)}/year`}
              </button>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>Auto-renews annually. Contact support to cancel.</p>
            )}
          </>
        )}
      </div>
    </>
  );
}

// PR-07 Help & Support
const FAQS: [string, string][] = [
  ["Is DrDocs free?", "Yes — storing and tracking your documents is free forever. You only pay for optional Dr.Docs doorstep services."],
  ["Are my documents safe?", "Documents are private to your account (row-level security), ID numbers are masked, and images are encrypted with short-lived signed access."],
  ["How do expiry alerts work?", "We read each document's expiry and alert you 180/90/30/7 days before — adjustable in Notifications."],
  ["How do I earn DocCash?", "Refer friends, complete your profile, become an agent, or review the app. Manage it in the DocCash Wallet."],
];

export function HelpSupport() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <AppBar title="Help & Support" back />
      <div className="screen">
        <button className="btn btn-primary" onClick={() => window.open("https://wa.me/919311668300", "_blank")}>
          💬 Chat on WhatsApp
        </button>
        <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => window.open("mailto:info@drdocs.in", "_blank")}>
          ✉ Email support
        </button>

        <h3 style={{ marginTop: 16 }}>FAQs</h3>
        {FAQS.map(([q, a], i) => (
          <div key={q} className="card" style={{ cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{q}</strong><span>{open === i ? "−" : "+"}</span>
            </div>
            {open === i && <p className="muted" style={{ margin: "8px 0 0" }}>{a}</p>}
          </div>
        ))}

        <p className="muted" style={{ textAlign: "center", marginTop: 24, fontSize: 12 }}>
          DrDocs · v1.0.0 · info@drdocs.in · 9311668300
        </p>
      </div>
    </>
  );
}
