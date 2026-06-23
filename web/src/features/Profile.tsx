import { useNavigate } from "react-router-dom";

import { useI18n } from "../core/i18n";
import { supabase } from "../core/supabase";
import { fetchCurrentUser } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AppBar, Skeleton } from "../components/ui";

// PR-01 Profile Home — account overview + settings menu (Section 3.8).
export function Profile() {
  const { t } = useI18n();
  const nav = useNavigate();
  const user = useAsync(fetchCurrentUser, []);

  const menu = [
    { icon: "👤", label: "Personal Details", to: "/profile/personal" },
    { icon: "🔔", label: "Notifications", to: "/profile/settings/notifications" },
    { icon: "🛡️", label: "Privacy & Data", to: "/profile/settings/privacy" },
    { icon: "🔒", label: "Security", to: "/profile/settings/security" },
    { icon: "⭐", label: "Subscription", to: "/profile/subscription" },
    { icon: "👨‍👩‍👧", label: "Family Members", to: "/family" },
    { icon: "❓", label: "Help & Support", to: "/profile/help" },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/phone", { replace: true });
  };

  return (
    <>
      <AppBar title={t("profile")} />
      <div className="screen" style={{ padding: 0 }}>
        {user.loading ? (
          <div style={{ padding: 16 }}>
            <Skeleton lines={1} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 24 }}>
            <div
              className="center"
              style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(26,60,110,0.1)", fontSize: 28 }}
            >
              {user.data?.profile_photo_url ? (
                <img src={user.data.profile_photo_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <h2>{user.data?.full_name ?? "—"}</h2>
              <span className="muted">+91 {user.data?.phone ?? ""}</span>
              <div style={{ marginTop: 6 }}>
                <span
                  className="pill"
                  style={{
                    color: user.data?.subscription_status === "member" ? "var(--gold)" : "var(--text-secondary)",
                    background: "color-mix(in srgb, var(--gold) 15%, white)",
                  }}
                >
                  {user.data?.subscription_status === "member" ? "Member" : "Free"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--border)" }}>
          {menu.map((m) => (
            <div
              key={m.label}
              onClick={() => nav(m.to)}
              style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 24px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
            >
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              <span style={{ color: "var(--text-secondary)" }}>›</span>
            </div>
          ))}
          <div
            onClick={logout}
            style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 24px", cursor: "pointer", color: "var(--red)" }}
          >
            <span style={{ fontSize: 20 }}>🚪</span>
            <span>{t("logout")}</span>
          </div>
        </div>
      </div>
    </>
  );
}
