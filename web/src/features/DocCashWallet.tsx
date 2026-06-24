import { useState } from "react";

import { fetchCurrentUser, fetchDocCash } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AppBar, ErrorState, Skeleton } from "../components/ui";
import { rupees } from "../models/format";

// ER-05 DocCash Wallet — balance, ledger history and redeem options.
export function DocCashWallet() {
  const user = useAsync(fetchCurrentUser, []);
  const txns = useAsync(fetchDocCash, []);
  const [info, setInfo] = useState<string | null>(null);

  const balance = user.data?.doccash_balance ?? 0;
  const canRedeem = balance >= 50000; // ₹500 minimum (Section 6.5)

  const redeem = (kind: string) => {
    if (kind === "service") {
      setInfo("DocCash is applied automatically at checkout — up to 20% of an order (min ₹500).");
    } else if (!canRedeem) {
      setInfo("You need at least ₹500 DocCash to withdraw.");
    } else if (kind === "bank") {
      setInfo("Bank transfer needs a one-time Aadhaar KYC. Our team will reach out to verify, then transfer within 24 hours.");
    } else {
      setInfo("Voucher redemption requested — you'll get the code on WhatsApp within 24 hours.");
    }
  };

  return (
    <>
      <AppBar title="DocCash Wallet" back />
      <div className="screen">
        <div className="card center" style={{ flexDirection: "column", background: "var(--navy)", color: "#fff", padding: 24 }}>
          <span style={{ opacity: 0.8 }}>Balance</span>
          {user.loading ? <Skeleton lines={1} /> : <div style={{ fontSize: 40, fontWeight: 800 }}>{rupees(balance)}</div>}
        </div>

        <h3 style={{ marginTop: 16 }}>Redeem</h3>
        <div className="grid">
          <button className="card" style={btn} onClick={() => redeem("service")}>💸<br />Service discount</button>
          <button className="card" style={btn} onClick={() => redeem("bank")}>🏦<br />Transfer to bank</button>
          <button className="card" style={btn} onClick={() => redeem("voucher")}>🎁<br />Amazon voucher</button>
        </div>
        {info && (
          <div className="card" style={{ marginTop: 12, background: "color-mix(in srgb, var(--navy) 6%, white)" }}>
            <span className="muted">{info}</span>
          </div>
        )}

        <h3 style={{ marginTop: 16 }}>History</h3>
        {txns.loading ? (
          <Skeleton lines={3} />
        ) : txns.error ? (
          <ErrorState error={txns.error} />
        ) : (txns.data?.length ?? 0) === 0 ? (
          <p className="muted" style={{ textAlign: "center" }}>No transactions yet. Refer friends or complete your profile to earn.</p>
        ) : (
          txns.data!.map((t) => {
            const credit = t.amount >= 0;
            return (
              <div key={t.txn_id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.description}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString("en-IN")}</div>
                </div>
                <strong style={{ color: credit ? "var(--green)" : "var(--red)" }}>
                  {credit ? "+" : "−"}{rupees(Math.abs(t.amount))}
                </strong>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

const btn: React.CSSProperties = {
  cursor: "pointer",
  textAlign: "center",
  border: "1px solid var(--border)",
  fontSize: 13,
  lineHeight: 1.8,
};
