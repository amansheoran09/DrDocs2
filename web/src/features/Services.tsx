import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useI18n } from "../core/i18n";
import { fetchService, fetchServices } from "../data/queries";
import { supabase } from "../core/supabase";
import { useAsync } from "../data/useAsync";
import { ServiceCard } from "../components/cards";
import { AppBar, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { ORDER_TIMELINE, type Order } from "../models/types";
import { rupees } from "../models/format";

// SV-01 Services Home — browse the Dr.Docs catalogue (Section 3.6).
export function ServicesHome() {
  const { t } = useI18n();
  const nav = useNavigate();
  const services = useAsync(fetchServices, []);
  return (
    <>
      <AppBar title={t("services")} />
      <div className="screen">
        {services.loading ? (
          <Skeleton />
        ) : services.error ? (
          <ErrorState error={services.error} />
        ) : services.data && services.data.length > 0 ? (
          <div className="grid">
            {services.data.map((s) => (
              <ServiceCard key={s.service_id} service={s} onBook={() => nav(`/services/${s.service_id}`)} />
            ))}
          </div>
        ) : (
          <EmptyState icon="🛠️" title="No services yet" message="The Dr.Docs catalogue is being set up." />
        )}
      </div>
    </>
  );
}

// SV-03 Service Detail — what we do, docs, price breakdown, guarantee (3.6).
export function ServiceDetail() {
  const { id = "" } = useParams();
  const service = useAsync(() => fetchService(id), [id]);
  return (
    <>
      <AppBar title="Service" back />
      <div className="screen">
        {service.loading ? (
          <Skeleton />
        ) : service.error ? (
          <ErrorState error={service.error} />
        ) : service.data ? (
          (() => {
            const s = service.data;
            return (
              <>
                <h2>{s.name}</h2>
                <p className="muted">{s.description}</p>

                <h3 style={{ marginTop: 20 }}>What Dr.Docs does</h3>
                <p style={{ lineHeight: 1.6 }}>{s.what_we_do}</p>

                <h3 style={{ marginTop: 20 }}>Documents required</h3>
                {s.docs_required.map((d) => (
                  <div key={d} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
                    <span style={{ color: "var(--green)" }}>✓</span> {d}
                  </div>
                ))}

                <h3 style={{ marginTop: 20 }}>Price breakdown</h3>
                <PriceRow label="Government fee" value={rupees(s.govt_fee)} />
                <PriceRow label="Dr.Docs service fee" value={rupees(s.service_fee)} />
                <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
                <PriceRow label="Total" value={rupees(s.total_price)} bold />

                <div
                  className="card"
                  style={{ marginTop: 16, background: "color-mix(in srgb, var(--green) 8%, white)", display: "flex", gap: 12, alignItems: "center" }}
                >
                  <span style={{ fontSize: 24 }}>🛡️</span>
                  <strong style={{ color: "var(--green)" }}>
                    100% money-back guarantee · ~{s.estimated_days} days
                  </strong>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                  onClick={() => alert("Next: Document Checklist (SV-04)")}
                >
                  Book Now · {rupees(s.total_price)}
                </button>
              </>
            );
          })()
        ) : null}
      </div>
    </>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// SV-07 Order Tracking — live status timeline via Supabase Realtime (Section 6.4).
export function OrderTracking() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("orders")
      .select("*")
      .eq("order_id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setOrder(data as Order | null);
          setLoading(false);
        }
      });

    // Realtime: subscribe to status changes for this order.
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_id=eq.${id}` },
        (payload) => setOrder(payload.new as Order),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const currentStep = order ? ORDER_TIMELINE.findIndex((s) => s.status === order.status) : -1;

  return (
    <>
      <AppBar title="Order Tracking" back />
      <div className="screen">
        {loading ? (
          <Skeleton lines={3} />
        ) : !order ? (
          <p className="muted">Order not found</p>
        ) : order.status === "cancelled" ? (
          <p style={{ color: "var(--red)" }}>This order was cancelled</p>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 24 }}>
              📅 {order.booking_slot} · {order.address_city}
            </div>
            {ORDER_TIMELINE.map((step, i) => {
              const done = i <= currentStep;
              return (
                <div key={step.status} style={{ display: "flex", gap: 16, minHeight: 56 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: done ? "var(--green)" : "var(--border)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                      }}
                    >
                      {done ? "✓" : ""}
                    </div>
                    {i < ORDER_TIMELINE.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: done ? "var(--green)" : "var(--border)" }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 24, fontWeight: i === currentStep ? 700 : 500, color: done ? "var(--text)" : "var(--text-secondary)" }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
