import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import type { DocStatus } from "../models/types";
import { statusColor, statusLabel } from "../models/format";

export function AppBar({
  title,
  back,
  action,
}: {
  title: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="appbar">
      {back && (
        <button className="icon" aria-label="Back" onClick={() => nav(-1)}>
          ‹
        </button>
      )}
      <span>{title}</span>
      <span className="spacer" />
      {action}
    </div>
  );
}

export function StatusPill({ status, verified = true }: { status: DocStatus; verified?: boolean }) {
  const color = verified ? statusColor[status] : "#8a929e";
  const label = verified ? statusLabel[status] : "Not Verified";
  return (
    <span className="pill" style={{ color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
      {label}
    </span>
  );
}

export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  // UX Rule 3: every empty state has an illustration, explanation and action.
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 56 }}>{icon}</div>
      <h3 style={{ marginTop: 16 }}>{title}</h3>
      <p className="muted">{message}</p>
      {actionLabel && (
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <div style={{ padding: 24 }}>
      <p style={{ color: "var(--red)" }}>Something went wrong.</p>
      <p className="muted">{error.message}</p>
    </div>
  );
}

// Scaffolded screen for Section 3 screen IDs still on the backlog. Keeps the
// whole navigation graph walkable.
export function Placeholder({ id, title }: { id: string; title: string }) {
  return (
    <>
      <AppBar title={title} back />
      <div className="screen center" style={{ flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 48 }}>🚧</div>
        <strong style={{ color: "var(--navy)" }}>{id}</strong>
        <span className="muted">{title} — scaffolded</span>
      </div>
    </>
  );
}
