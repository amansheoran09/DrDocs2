// Compile-time configuration via Vite env vars (VITE_ prefix). Secrets for
// server-only integrations (Vision, Razorpay, OneSignal, service-role key)
// live exclusively in Supabase Edge Function env vars — never here (Section 10).
//
// Provide in web/.env.local:
//   VITE_SUPABASE_URL=https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon-key>
//
// The anon key is safe in the client because RLS gates every row.
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  // Razorpay publishable key id (rzp_test_… / rzp_live_…). Safe in the client;
  // the secret stays server-side (Edge Function webhook verifies payments).
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID ?? "",
};

export const isConfigured = () =>
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
