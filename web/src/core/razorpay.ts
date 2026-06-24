import { env } from "./env";

// Razorpay Checkout integration. The checkout.js script is loaded on demand;
// the publishable key comes from VITE_RAZORPAY_KEY_ID. Payment verification is
// done server-side by the razorpay-webhook Edge Function (Section 5.3).

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<boolean> | null = null;

export const razorpayConfigured = (): boolean => env.razorpayKeyId.length > 0;

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface CheckoutOptions {
  amountPaise: number;
  description: string;
  email?: string | null;
  contact?: string | null;
  notes?: Record<string, string>;
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(o: CheckoutOptions): Promise<void> {
  const ok = await loadCheckout();
  if (!ok || !window.Razorpay) throw new Error("Could not load the payment gateway. Check your connection.");

  const rzp = new window.Razorpay({
    key: env.razorpayKeyId,
    amount: o.amountPaise, // paise
    currency: "INR",
    name: "DocVault by Dr.Docs",
    description: o.description,
    prefill: { email: o.email ?? undefined, contact: o.contact ?? undefined },
    notes: o.notes ?? {},
    theme: { color: "#1A3C6E" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (resp: any) => o.onSuccess(resp.razorpay_payment_id as string),
    modal: { ondismiss: () => o.onDismiss?.() },
  });
  rzp.open();
}
