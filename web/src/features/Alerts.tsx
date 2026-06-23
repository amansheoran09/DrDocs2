import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useI18n } from "../core/i18n";
import { dismissAlert, fetchAlert, fetchAlerts, fetchHealthBreakdown } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AlertCard } from "../components/cards";
import { HealthRing } from "../components/HealthRing";
import { AppBar, EmptyState, ErrorState, Skeleton } from "../components/ui";
import type { AlertSeverity } from "../models/types";
import { severityColor } from "../models/format";

const SEVERITY_TABS: { label: string; value: AlertSeverity | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Urgent", value: "urgent" },
  { label: "Upcoming", value: "warning" },
  { label: "Info", value: "info" },
];

// AL-01 Alerts Centre — severity filter tabs (Section 3.5).
export function AlertsCentre() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [filter, setFilter] = useState<AlertSeverity | "all">("all");
  const alerts = useAsync(fetchAlerts, []);

  return (
    <>
      <AppBar title={t("alerts")} back />
      <div className="screen">
        <div className="chips">
          {SEVERITY_TABS.map((tab) => (
            <button key={tab.value} className={`chip ${filter === tab.value ? "active" : ""}`} onClick={() => setFilter(tab.value)}>
              {tab.label}
            </button>
          ))}
        </div>
        {alerts.loading ? (
          <Skeleton />
        ) : alerts.error ? (
          <ErrorState error={alerts.error} />
        ) : (
          (() => {
            const list = (alerts.data ?? []).filter((a) => filter === "all" || a.severity === filter);
            if (list.length === 0)
              return <EmptyState icon="🔕" title={t("no_alerts")} message="No alerts in this category right now." />;
            return (
              <div className="grid">
                {list.map((a) => (
                  <AlertCard
                    key={a.alert_id}
                    alert={a}
                    onOpen={() => nav(`/alerts/detail/${a.alert_id}`)}
                    onFix={a.related_service_id ? () => nav(`/services/${a.related_service_id}`) : undefined}
                  />
                ))}
              </div>
            );
          })()
        )}
      </div>
    </>
  );
}

// AL-02 Alert Detail — plain-language explanation + consequences + CTA (3.5).
const consequence = (alertType: string): string => {
  switch (alertType) {
    case "expiry_overdue":
      return "An expired document is not legally valid and can be rejected anywhere it is required.";
    case "link_gap_pan_aadhaar":
      return "An unlinked PAN can be deactivated and attracts a penalty of up to Rs.10,000.";
    case "name_mismatch":
      return "Name mismatches across documents cause rejections during verification.";
    default:
      return "Leaving this unresolved can lead to last-minute stress, fines or service rejections.";
  }
};

export function AlertDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const alert = useAsync(() => fetchAlert(id), [id]);

  return (
    <>
      <AppBar title="Alert" back />
      <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
        {alert.loading ? (
          <Skeleton />
        ) : alert.error ? (
          <ErrorState error={alert.error} />
        ) : alert.data ? (
          (() => {
            const a = alert.data;
            const color = severityColor[a.severity];
            return (
              <>
                <h2 style={{ color }}>⚠ {a.title}</h2>
                <p style={{ fontSize: 16, lineHeight: 1.6 }}>{a.message}</p>

                <InfoBlock title="What happens if you ignore this" body={consequence(a.alert_type)} color="var(--amber)" />
                <InfoBlock
                  title="How Dr.Docs fixes this"
                  body="A Dr.Docs agent collects your documents from home and completes the process for you — you just need to be present."
                  color="var(--green)"
                />

                <span style={{ flex: 1 }} />
                <div className="btn-row" style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-outline"
                    onClick={async () => {
                      await dismissAlert(a.alert_id);
                      nav(-1);
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => nav(a.related_service_id ? `/services/${a.related_service_id}` : "/services")}
                  >
                    Book Now
                  </button>
                </div>
              </>
            );
          })()
        ) : null}
      </div>
    </>
  );
}

function InfoBlock({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <div
      className="card"
      style={{ background: `color-mix(in srgb, ${color} 8%, white)`, marginTop: 12 }}
    >
      <strong style={{ color }}>{title}</strong>
      <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

// AL-03 Health Score Detail — the four sub-scores from the DB (Section 6.1).
export function HealthScoreDetail() {
  const breakdown = useAsync(fetchHealthBreakdown, []);
  return (
    <>
      <AppBar title="Health Score" back />
      <div className="screen">
        {breakdown.loading ? (
          <Skeleton />
        ) : breakdown.error ? (
          <ErrorState error={breakdown.error} />
        ) : breakdown.data ? (
          (() => {
            const b = breakdown.data;
            const tips: string[] = [];
            if (b.detail.core_docs_present < 6)
              tips.push(`Add ${6 - b.detail.core_docs_present} more core document(s) for full completeness.`);
            if (b.detail.expired > 0) tips.push("Renew expired documents — each costs you 8 points.");
            if (b.detail.links_verified < 4) tips.push("Verify cross-links like PAN-Aadhaar to gain up to 20 points.");
            if (tips.length === 0) tips.push("Great job — your document health is excellent!");
            return (
              <>
                <div className="center" style={{ margin: "8px 0 24px" }}>
                  <HealthRing score={b.total} />
                </div>
                <SubScore label="Completeness" value={b.completeness} max={30} hint="Do you have the 6 core documents?" />
                <SubScore label="Validity" value={b.validity} max={40} hint="Are all your documents currently valid?" />
                <SubScore label="Linkage" value={b.linkage} max={20} hint="Are your documents cross-linked?" />
                <SubScore label="Accuracy" value={b.accuracy} max={10} hint="Do names and dates match across documents?" />
                <div className="card" style={{ marginTop: 16 }}>
                  <strong>Improvement tips</strong>
                  {tips.map((tip) => (
                    <p key={tip} style={{ margin: "8px 0 0" }}>
                      💡 {tip}
                    </p>
                  ))}
                </div>
              </>
            );
          })()
        ) : (
          <p className="muted">Sign in to see your score</p>
        )}
      </div>
    </>
  );
}

function SubScore({ label, value, max, hint }: { label: string; value: number; max: number; hint: string }) {
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{label}</strong>
        <strong style={{ color: "var(--navy)" }}>
          {value} / {max}
        </strong>
      </div>
      <div style={{ height: 8, background: "var(--border)", borderRadius: 4, margin: "6px 0", overflow: "hidden" }}>
        <div style={{ width: `${max ? (value / max) * 100 : 0}%`, height: "100%", background: "var(--navy)" }} />
      </div>
      <span className="muted" style={{ fontSize: 12 }}>
        {hint}
      </span>
    </div>
  );
}
