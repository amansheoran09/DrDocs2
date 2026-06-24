import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchOrders, fetchServiceNames, rateOrder } from "../data/queries";
import { useAsync } from "../data/useAsync";
import { AppBar, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { ORDER_TIMELINE, type OrderStatus } from "../models/types";
import { rupees } from "../models/format";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending Payment",
  confirmed: "Confirmed",
  agent_assigned: "Agent Assigned",
  en_route: "Agent En Route",
  collected: "Documents Collected",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusColor = (s: OrderStatus) =>
  s === "completed" ? "var(--green)" : s === "cancelled" ? "var(--red)" : "var(--navy)";

// SV-08 Order History — past & active orders, with rate/track actions.
export function OrderHistory() {
  const nav = useNavigate();
  const orders = useAsync(fetchOrders, []);
  const names = useAsync(fetchServiceNames, []);

  return (
    <>
      <AppBar title="My Orders" back />
      <div className="screen">
        {orders.loading || names.loading ? (
          <Skeleton />
        ) : orders.error ? (
          <ErrorState error={orders.error} />
        ) : (orders.data ?? []).length === 0 ? (
          <EmptyState
            icon="🧾"
            title="No orders yet"
            message="Book a Dr.Docs service and it'll show up here."
            actionLabel="Browse services"
            onAction={() => nav("/services")}
          />
        ) : (
          <div className="grid">
            {orders.data!.map((o) => (
              <div key={o.order_id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{names.data?.[o.service_id] ?? "Service"}</strong>
                  <span className="pill" style={{ color: statusColor(o.status), background: `color-mix(in srgb, ${statusColor(o.status)} 12%, white)` }}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
                <p className="muted" style={{ margin: "6px 0" }}>
                  {o.booking_date} · {o.booking_slot} · {rupees(o.total_amount)}
                </p>
                <div className="btn-row">
                  {ORDER_TIMELINE.some((t) => t.status === o.status) && (
                    <button className="btn btn-outline" onClick={() => nav(`/orders/${o.order_id}`)}>
                      Track
                    </button>
                  )}
                  {o.status === "completed" && o.rating == null && (
                    <RateButton orderId={o.order_id} onRated={() => orders.reload()} />
                  )}
                  {o.rating != null && (
                    <span className="muted" style={{ alignSelf: "center" }}>★ {o.rating}/5</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RateButton({ orderId, onRated }: { orderId: string; onRated: () => void }) {
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return <button className="btn btn-primary" onClick={() => setOpen(true)}>Rate & Review</button>;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 24, cursor: "pointer", marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} onClick={() => setStars(n)} style={{ color: n <= stars ? "var(--gold)" : "var(--border)" }}>★</span>
        ))}
      </div>
      <textarea
        className="input"
        style={{ height: 70, padding: 10 }}
        placeholder="How was the service?"
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />
      <button
        className="btn btn-primary"
        style={{ marginTop: 8 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await rateOrder(orderId, stars, review);
          onRated();
        }}
      >
        {busy ? "Saving…" : "Submit"}
      </button>
    </div>
  );
}
