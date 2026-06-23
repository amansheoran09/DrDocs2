-- 0006_indexes.sql
-- Indexes that back the most frequent access patterns described in Section 3.
-- ---------------------------------------------------------------------------

-- DW-01 "All Documents" — fetch all docs for a user ordered by expiry urgency
create index if not exists idx_documents_user        on public.documents (user_id);
create index if not exists idx_documents_member      on public.documents (member_id);
create index if not exists idx_documents_expiry      on public.documents (expiry_date);
create index if not exists idx_documents_user_status on public.documents (user_id, status);

-- AL-01 "Alerts Centre" — alerts for a user by priority
create index if not exists idx_alerts_user           on public.alerts (user_id);
create index if not exists idx_alerts_fires_at       on public.alerts (fires_at) where sent_at is null;
create index if not exists idx_alerts_user_unread    on public.alerts (user_id) where is_read = false;

-- SV-08 "Order History" — orders by user, newest first
create index if not exists idx_orders_user           on public.orders (user_id, created_at desc);
create index if not exists idx_orders_agent          on public.orders (agent_id);
create index if not exists idx_orders_pincode_open   on public.orders (address_pincode)
  where status in ('confirmed');           -- agent assignment lookup

-- ER-02 referral tracking
create index if not exists idx_referrals_referrer    on public.referrals (referrer_user_id);

-- ER-05 DocCash wallet history
create index if not exists idx_doccash_user          on public.doccash_transactions (user_id, created_at desc);

-- families
create index if not exists idx_family_user           on public.family_members (user_id);

-- services browse (SV-01 / SV-02)
create index if not exists idx_services_category     on public.services (category, sort_order)
  where is_active = true;
