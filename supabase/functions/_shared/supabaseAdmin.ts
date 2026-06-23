// _shared/supabaseAdmin.ts
// A service-role Supabase client for use inside Edge Functions. The
// service_role key bypasses RLS (Section 10) so background jobs can read and
// write across all users. NEVER ship this key to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
