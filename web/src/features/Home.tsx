import { useNavigate } from "react-router-dom";

import { useI18n } from "../core/i18n";
import { fetchAlerts, fetchCurrentUser } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AlertCard } from "../components/cards";
import { HealthRing } from "../components/HealthRing";
import { AppBar, ErrorState, Skeleton } from "../components/ui";

// HM-01 Home Dashboard — health ring, alert strip, quick actions (Section 3.2).
export function Home() {
  const { t } = useI18n();
  const nav = useNavigate();
  const user = useAsync(fetchCurrentUser, []);
  const alerts = useAsync(fetchAlerts, []);

  const quick = [
    { icon: "📷", label: t("quick_scan"), to: "/documents/add" },
    { icon: "🛠️", label: t("quick_book"), to: "/services" },
    { icon: "📂", label: t("quick_view"), to: "/documents" },
  ];

  return (
    <>
      <AppBar
        title={t("app_name")}
        action={
          <button className="icon" aria-label="Alerts" onClick={() => nav("/alerts")}>
            🔔
          </button>
        }
      />
      <div className="screen">
        <div className="card center" style={{ flexDirection: "column", padding: 24 }}>
          {user.loading ? (
            <Skeleton lines={1} />
          ) : (
            <>
              {user.data && <strong style={{ marginBottom: 12 }}>Hi {user.data.full_name.split(" ")[0]} 👋</strong>}
              <div style={{ cursor: "pointer" }} onClick={() => nav("/alerts/health")}>
                <HealthRing score={user.data?.doc_health_score ?? 0} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {quick.map((q) => (
            <button
              key={q.to}
              onClick={() => nav(q.to)}
              style={{
                flex: 1,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 4px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>{q.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{q.label}</span>
            </button>
          ))}
        </div>

        <h3 style={{ margin: "24px 0 8px" }}>{t("alerts")}</h3>
        {alerts.loading ? (
          <Skeleton lines={2} />
        ) : alerts.error ? (
          <ErrorState error={alerts.error} />
        ) : alerts.data && alerts.data.length > 0 ? (
          alerts.data.slice(0, 3).map((a) => (
            <AlertCard
              key={a.alert_id}
              alert={a}
              onOpen={() => nav(`/alerts/detail/${a.alert_id}`)}
              onFix={a.related_service_id ? () => nav(`/services/${a.related_service_id}`) : undefined}
            />
          ))
        ) : (
          <div className="card">✅ {t("no_alerts")}</div>
        )}
      </div>
    </>
  );
}
