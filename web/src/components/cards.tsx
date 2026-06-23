import type { Alert, DocVaultDocument, Service } from "../models/types";
import {
  daysUntil,
  formatMonthYear,
  maskNumber,
  rupees,
  severityColor,
} from "../models/format";
import { docTypeMeta } from "../models/types";
import { StatusPill } from "./ui";

// DocumentCard — the most-seen UI element (Section 7.2).
export function DocumentCard({
  doc,
  onOpen,
  onRenew,
}: {
  doc: DocVaultDocument;
  onOpen: () => void;
  onRenew: () => void;
}) {
  const meta = docTypeMeta(doc.doc_type);
  const days = daysUntil(doc.expiry_date);
  const expiringSoon = days != null && days >= 0 && days <= 90;
  const expired = doc.status === "expired";

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={onOpen}>
      <div style={{ display: "flex", gap: 12, padding: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(26,60,110,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ fontSize: 18 }}>{meta.label}</strong>
            <StatusPill status={doc.status} verified={doc.is_verified} />
          </div>
          <div className="muted">{maskNumber(doc.doc_number)}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {formatMonthYear(doc.expiry_date)}
          </div>
        </div>
      </div>
      {expired ? (
        <div
          style={{
            background: "color-mix(in srgb, var(--red) 12%, white)",
            color: "var(--red)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <span>⚠ EXPIRED</span>
          <button
            className="btn-text"
            onClick={(e) => {
              e.stopPropagation();
              onRenew();
            }}
          >
            Renew Now
          </button>
        </div>
      ) : expiringSoon ? (
        <div
          style={{
            background: "color-mix(in srgb, var(--amber) 12%, white)",
            color: "var(--amber)",
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          ⏳ Expires in {days} days
        </div>
      ) : null}
    </div>
  );
}

// AlertCard — HM-01 alert strip + AL-01 list.
export function AlertCard({
  alert,
  onOpen,
  onFix,
}: {
  alert: Alert;
  onOpen: () => void;
  onFix?: () => void;
}) {
  const color = severityColor[alert.severity];
  return (
    <div className="card" style={{ display: "flex", gap: 12, cursor: "pointer" }} onClick={onOpen}>
      <div style={{ width: 4, borderRadius: 4, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <strong style={{ color, fontSize: 15 }}>{alert.title}</strong>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          {alert.message}
        </p>
        {onFix && (
          <button
            className="btn btn-primary"
            style={{ height: 40, marginTop: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              onFix();
            }}
          >
            Fix with Dr.Docs
          </button>
        )}
      </div>
    </div>
  );
}

// ServiceCard — SV-01 / SV-02.
export function ServiceCard({ service, onBook }: { service: Service; onBook: () => void }) {
  return (
    <div className="card" style={{ cursor: "pointer" }} onClick={onBook}>
      <strong style={{ fontSize: 16 }}>{service.name}</strong>
      <p className="muted" style={{ margin: "6px 0 10px" }}>
        {service.what_we_do}
      </p>
      {service.govt_fee > 0 && (
        <span className="pill" style={{ color: "var(--green)", background: "color-mix(in srgb, var(--green) 12%, white)" }}>
          Govt fee included
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <strong style={{ fontSize: 18, color: "var(--navy)" }}>{rupees(service.total_price)}</strong>
        <span className="muted">· ~{service.estimated_days} days</span>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" style={{ width: "auto", padding: "0 18px", height: 40 }}>
          Book Now
        </button>
      </div>
    </div>
  );
}
