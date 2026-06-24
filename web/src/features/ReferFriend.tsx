import { useState } from "react";

import { fetchCurrentUser, fetchReferrals } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AppBar, ErrorState, Skeleton } from "../components/ui";
import type { ReferralStatus } from "../models/types";

// ER-02 Refer a Friend — referral code, share actions, and a status tracker.
export function ReferFriend() {
  const user = useAsync(fetchCurrentUser, []);
  const referrals = useAsync(fetchReferrals, []);
  const [copied, setCopied] = useState(false);

  const code = user.data?.referral_code ?? "";
  const link = `https://drdocs.in/app?ref=${code}`;
  const msg = `Join DrDocs — store, track & renew all your government documents, free forever. Use my code ${code}: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "DrDocs", text: msg, url: link }).catch(() => {});
    else whatsapp();
  };

  const counts = {
    referred: referrals.data?.length ?? 0,
    signedUp: referrals.data?.filter((r) => r.status !== "pending").length ?? 0,
    completed: referrals.data?.filter((r) => r.status === "first_service_completed" || r.status === "rewarded").length ?? 0,
  };

  return (
    <>
      <AppBar title="Refer a Friend" back />
      <div className="screen">
        <div className="card center" style={{ flexDirection: "column", gap: 8 }}>
          <span className="muted">Your referral code</span>
          {user.loading ? (
            <Skeleton lines={1} />
          ) : (
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4, color: "var(--navy)" }}>{code}</div>
          )}
          <button className="btn btn-outline" style={{ maxWidth: 200 }} onClick={copy}>
            {copied ? "Copied ✓" : "Copy code"}
          </button>
        </div>

        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={whatsapp}>Share on WhatsApp</button>
          <button className="btn btn-outline" onClick={share}>More…</button>
        </div>

        <div className="card" style={{ marginTop: 16, background: "color-mix(in srgb, var(--gold) 10%, white)" }}>
          <strong>How you earn</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            ₹50 when a friend signs up with your code, and ₹250 more when they complete their first service.
          </p>
        </div>

        <h3 style={{ marginTop: 16 }}>Your referrals</h3>
        <div className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          <Stat n={counts.referred} label="Referred" />
          <Stat n={counts.signedUp} label="Signed Up" />
          <Stat n={counts.completed} label="Completed" />
        </div>

        {referrals.error ? (
          <ErrorState error={referrals.error} />
        ) : (referrals.data?.length ?? 0) === 0 ? (
          <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
            No referrals yet — share your code to start earning.
          </p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {referrals.data!.map((r) => (
              <div key={r.referral_id} className="card" style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                <ReferralBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)" }}>{n}</div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  );
}

function ReferralBadge({ status }: { status: ReferralStatus }) {
  const map: Record<ReferralStatus, [string, string]> = {
    pending: ["Link clicked", "var(--text-secondary)"],
    registered: ["Signed up", "var(--navy)"],
    first_service_completed: ["Service done", "var(--green)"],
    rewarded: ["Rewarded", "var(--green)"],
  };
  const [label, color] = map[status];
  return (
    <span className="pill" style={{ color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
      {label}
    </span>
  );
}
