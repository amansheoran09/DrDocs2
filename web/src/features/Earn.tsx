import { useNavigate } from "react-router-dom";

import { useI18n } from "../core/i18n";
import { fetchCurrentUser } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AppBar, Skeleton } from "../components/ui";

// ER-01 Earn Home — DocCash balance + earning streams (Section 3.7).
export function Earn() {
  const { t } = useI18n();
  const nav = useNavigate();
  const user = useAsync(fetchCurrentUser, []);

  const reviewMsg =
    "Hi Dr.Docs! I left a 5-star review for DrDocs on the Play Store. Here's my screenshot for the ₹100 DocCash reward.";
  const streams = [
    { icon: "👥", title: "Refer a Friend", reward: "Earn ₹50 + ₹250", run: () => nav("/earn/refer") },
    { icon: "🎖️", title: "Become an Agent", reward: "Earn ₹200 on certification", run: () => nav("/earn/agent") },
    {
      icon: "⭐",
      title: "Write a Review",
      reward: "Earn ₹100",
      run: () => window.open(`https://wa.me/919311668300?text=${encodeURIComponent(reviewMsg)}`, "_blank"),
    },
    { icon: "✅", title: "Complete Your Profile", reward: "Earn ₹150 (all 6 core docs)", run: () => nav("/documents") },
  ];

  return (
    <>
      <AppBar title={t("earn")} />
      <div className="screen">
        <div className="card center" style={{ flexDirection: "column", background: "var(--navy)", color: "#fff", padding: 24 }}>
          <span style={{ opacity: 0.8 }}>DocCash Balance</span>
          {user.loading ? (
            <Skeleton lines={1} />
          ) : (
            <div style={{ fontSize: 40, fontWeight: 800 }}>₹{Math.round((user.data?.doccash_balance ?? 0) / 100)}</div>
          )}
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          {streams.map((s) => (
            <div key={s.title} className="card" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={s.run}>
              <span style={{ fontSize: 26 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <strong>{s.title}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {s.reward}
                </p>
              </div>
              <span style={{ color: "var(--text-secondary)" }}>›</span>
            </div>
          ))}
        </div>
        <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => nav("/earn/wallet")}>
          DocCash Wallet
        </button>
      </div>
    </>
  );
}
