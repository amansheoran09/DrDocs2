import { createClient } from "@supabase/supabase-js";

import { env } from "./env";

// Single browser Supabase client. Phone-OTP auth (Section 5.1); session
// persisted in localStorage and auto-refreshed.
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
