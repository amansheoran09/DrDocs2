import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { createOrder, fetchDocuments, fetchService } from "../data/queries";
import { openRazorpayCheckout, razorpayConfigured } from "../core/razorpay";
import { useAsync } from "../data/useAsync";
import { AppBar, ErrorState, Skeleton } from "../components/ui";
import { docTypeMeta } from "../models/types";
import { rupees } from "../models/format";

const SLOTS = ["9am - 11am", "11am - 1pm", "1pm - 3pm", "3pm - 5pm", "5pm - 7pm"];
const PROMO: Record<string, number> = { DRDOCS10: 0.1 }; // code -> fraction off

function nextDays(n: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
    });
  }
  return out;
}

// SV-04 → SV-05 → SV-06 as a 3-step booking flow. Creates the order and hands
// off to SV-07 Order Tracking.
export function BookingFlow() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const service = useAsync(() => fetchService(id), [id]);
  const docs = useAsync(fetchDocuments, []);

  const [step, setStep] = useState(0); // 0=checklist 1=slot 2=pay
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Gurgaon");
  const [pincode, setPincode] = useState("");
  const [promo, setPromo] = useState("");
  const [pay, setPay] = useState("UPI");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = service.data?.docs_required ?? [];

  // Auto-tick required docs the user already holds (loose keyword match).
  const autoChecked = useMemo(() => {
    const have = (docs.data ?? []).map((d) => docTypeMeta(d.doc_type).label.toLowerCase());
    const map: Record<number, boolean> = {};
    required.forEach((r, i) => {
      const rl = r.toLowerCase();
      map[i] = have.some((h) => rl.includes(h.split(" ")[0]));
    });
    return map;
  }, [docs.data, required]);

  const isChecked = (i: number) => checked[i] ?? autoChecked[i] ?? false;
  const allChecked = required.length === 0 || required.every((_, i) => isChecked(i));

  const discountFrac = PROMO[promo.trim().toUpperCase()] ?? 0;
  const total = service.data ? Math.round(service.data.total_price * (1 - discountFrac)) : 0;
  const discount = service.data ? service.data.total_price - total : 0;

  const placeOrder = async (paymentId?: string) => {
    if (!service.data) return;
    setPlacing(true);
    setError(null);
    try {
      const orderId = await createOrder({
        service_id: service.data.service_id,
        booking_date: date,
        booking_slot: slot,
        address_line1: address.trim(),
        address_city: city,
        address_pincode: pincode,
        total_amount: total,
        discount_amount: discount,
        promo_code: discountFrac ? promo.trim().toUpperCase() : null,
        payment_id: paymentId ?? null,
      });
      nav(`/orders/${orderId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPlacing(false);
    }
  };

  // Pay Now: open the Razorpay gateway when configured, then record the paid
  // order on success. Without a key, fall back to recording a demo order.
  const payNow = async () => {
    if (!service.data) return;
    setError(null);
    if (!razorpayConfigured()) {
      await placeOrder();
      return;
    }
    setPlacing(true);
    try {
      await openRazorpayCheckout({
        amountPaise: total,
        description: service.data.name,
        notes: { service_id: service.data.service_id },
        onSuccess: (paymentId) => {
          void placeOrder(paymentId);
        },
        onDismiss: () => setPlacing(false),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPlacing(false);
    }
  };

  if (service.loading) return (<><AppBar title="Book Service" back /><div className="screen"><Skeleton /></div></>);
  if (service.error) return (<><AppBar title="Book Service" back /><div className="screen"><ErrorState error={service.error} /></div></>);
  const s = service.data!;

  return (
    <>
      <AppBar title={s.name} back />
      <div className="screen">
        <Stepper step={step} />

        {step === 0 && (
          <>
            <h3>Documents required</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Confirm you have these. Ones you've already added are ticked.
            </p>
            {required.length === 0 && <div className="card">No documents needed for this service.</div>}
            {required.map((doc, i) => (
              <label key={doc} className="card" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isChecked(i)}
                  onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })}
                />
                <span>{doc}</span>
              </label>
            ))}
            <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={!allChecked} onClick={() => setStep(1)}>
              Continue
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h3>Pick a date</h3>
            <div className="chips">
              {nextDays(7).map((d) => (
                <button key={d.iso} className={`chip ${date === d.iso ? "active" : ""}`} onClick={() => setDate(d.iso)}>
                  {d.label}
                </button>
              ))}
            </div>
            <h3 style={{ marginTop: 16 }}>Time slot</h3>
            <div className="grid">
              {SLOTS.map((sl) => (
                <button key={sl} className={`chip ${slot === sl ? "active" : ""}`} style={{ textAlign: "center" }} onClick={() => setSlot(sl)}>
                  {sl}
                </button>
              ))}
            </div>
            <h3 style={{ marginTop: 16 }}>Address</h3>
            <div className="field">
              <label>Flat / House, Street, Area</label>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field">
              <label>PIN code</label>
              <input className="input" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="btn-row">
              <button className="btn btn-outline" onClick={() => setStep(0)}>Back</button>
              <button
                className="btn btn-primary"
                disabled={!date || !slot || !address.trim() || pincode.length !== 6}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3>Order summary</h3>
            <div className="card">
              <Row k="Service" v={s.name} />
              <Row k="Date" v={date} />
              <Row k="Time" v={slot} />
              <Row k="Address" v={`${address}, ${city} ${pincode}`} />
            </div>

            <h3 style={{ marginTop: 16 }}>Price</h3>
            <div className="card">
              <Row k="Government fee" v={rupees(s.govt_fee)} />
              <Row k="Dr.Docs service fee" v={rupees(s.service_fee)} />
              {discount > 0 && <Row k={`Promo (${promo.toUpperCase()})`} v={`- ${rupees(discount)}`} />}
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />
              <Row k="Total" v={rupees(total)} bold />
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Promo code (try DRDOCS10)</label>
              <input className="input" value={promo} onChange={(e) => setPromo(e.target.value)} />
            </div>

            <h3>Payment method</h3>
            {["UPI", "Card", "Wallet", "DocCash"].map((m) => (
              <label key={m} className="card" style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                <input type="radio" name="pay" checked={pay === m} onChange={() => setPay(m)} />
                <span>{m}</span>
              </label>
            ))}

            {error && <p style={{ color: "var(--red)" }}>{error}</p>}
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" disabled={placing} onClick={payNow}>
                {placing ? "Processing…" : `Pay ${rupees(total)}`}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              {razorpayConfigured()
                ? "Secure payment via Razorpay. Use test cards in test mode."
                : "Demo mode — set VITE_RAZORPAY_KEY_ID to enable the Razorpay gateway."}
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Documents", "Slot", "Pay"];
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {labels.map((l, i) => (
        <div key={l} style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: i <= step ? "var(--navy)" : "var(--border)",
              marginBottom: 6,
            }}
          />
          <span style={{ fontSize: 12, color: i <= step ? "var(--navy)" : "var(--text-secondary)", fontWeight: i === step ? 700 : 500 }}>
            {l}
          </span>
        </div>
      ))}
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", gap: 12, fontWeight: bold ? 700 : 400 }}>
      <span className={bold ? "" : "muted"}>{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
}
