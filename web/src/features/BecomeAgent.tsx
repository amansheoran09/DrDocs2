import { useState } from "react";

import { completeCertification, fetchAgentProfile, fetchCurrentUser, registerAgent } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AppBar, ErrorState, Skeleton } from "../components/ui";
import { rupees } from "../models/format";

const AVG_COMMISSION = 50000; // ₹500 per order, in paise

// ER-03 Become an Agent (+ ER-04 certification). Register, see the earning
// calculator, then the agent dashboard once enrolled.
export function BecomeAgent() {
  const profile = useAsync(fetchAgentProfile, []);
  const user = useAsync(fetchCurrentUser, []);
  const [orders, setOrders] = useState(20);
  const [pincode, setPincode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enroll = async () => {
    setBusy(true);
    setError(null);
    try {
      await registerAgent(pincode ? [pincode] : []);
      profile.reload();
      user.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const certify = async () => {
    setBusy(true);
    try {
      await completeCertification();
      profile.reload();
      user.reload();
    } finally {
      setBusy(false);
    }
  };

  if (profile.loading) return (<><AppBar title="Become an Agent" back /><div className="screen"><Skeleton /></div></>);
  if (profile.error) return (<><AppBar title="Become an Agent" back /><div className="screen"><ErrorState error={profile.error} /></div></>);

  const isAgent = !!profile.data;
  const certified = !!user.data?.agent_certified;

  return (
    <>
      <AppBar title="Become an Agent" back />
      <div className="screen">
        {!isAgent ? (
          <>
            <div className="card">
              <strong>Earn as a DocVault Student Agent</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Help people in your area get documents done at their doorstep and earn a commission on every completed order.
              </p>
            </div>

            <h3 style={{ marginTop: 16 }}>Earning calculator</h3>
            <div className="card">
              <label className="muted">Orders per month: <strong style={{ color: "var(--navy)" }}>{orders}</strong></label>
              <input type="range" min={1} max={100} value={orders} onChange={(e) => setOrders(Number(e.target.value))} style={{ width: "100%" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span className="muted">Estimated monthly income</span>
                <strong style={{ color: "var(--green)" }}>{rupees(orders * AVG_COMMISSION)}</strong>
              </div>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Area PIN code you'll serve (optional)</label>
              <input className="input" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
            </div>
            {error && <p style={{ color: "var(--red)" }}>{error}</p>}
            <button className="btn btn-primary" disabled={busy} onClick={enroll}>
              {busy ? "Registering…" : "Register as Agent"}
            </button>
          </>
        ) : (
          <>
            <div className="card center" style={{ flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 40 }}>{certified ? "🎖️" : "🧑‍🎓"}</span>
              <strong>{certified ? "Certified Agent" : "Registered Agent"}</strong>
              {!certified && <span className="muted">Complete certification to start accepting orders</span>}
            </div>

            <div className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginTop: 12 }}>
              <Stat n={`★ ${profile.data!.rating.toFixed(1)}`} label="Rating" />
              <Stat n={String(profile.data!.total_orders)} label="Orders" />
              <Stat n={rupees(profile.data!.total_earnings)} label="Earned" />
            </div>

            {!certified ? (
              <>
                <h3 style={{ marginTop: 16 }}>Certification — 5 modules</h3>
                {["Documents 101", "Field etiquette", "Using the app", "Payments & payouts", "Compliance"].map((m, i) => (
                  <div key={m} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span>{i + 1}.</span><span>{m}</span>
                  </div>
                ))}
                <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={certify}>
                  {busy ? "Saving…" : "Complete certification"}
                </button>
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Completing certification earns ₹200 DocCash (credited by Dr.Docs after review).
                </p>
              </>
            ) : (
              <div className="card" style={{ marginTop: 12, background: "color-mix(in srgb, var(--green) 8%, white)" }}>
                <strong style={{ color: "var(--green)" }}>You're all set!</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  New orders near your area will appear for you to accept. Pending payout: {rupees(profile.data!.pending_payout)}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>{n}</div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  );
}
