-- 0008_rls_policies.sql
-- DocVault — Row Level Security (Section 5.1 + Section 10, P0).
-- Principle: an authenticated user may only read/write rows that belong to
-- them (matched on user_id == auth.uid()). The `services` catalogue is the
-- only public-readable table. Edge Functions use the service_role key, which
-- bypasses RLS, for system jobs (alert generation, payouts, etc).
-- ---------------------------------------------------------------------------

alter table public.users                       enable row level security;
alter table public.family_members              enable row level security;
alter table public.documents                   enable row level security;
alter table public.alerts                       enable row level security;
alter table public.services                      enable row level security;
alter table public.orders                        enable row level security;
alter table public.referrals                     enable row level security;
alter table public.doccash_transactions          enable row level security;
alter table public.agent_profiles                enable row level security;
alter table public.consent_log                   enable row level security;
alter table public.notification_preferences      enable row level security;
alter table public.notifications                 enable row level security;
alter table public.link_status                   enable row level security;
alter table public.agent_certification_progress  enable row level security;
-- audit_log is intentionally NOT user-readable (admin/service_role only).
alter table public.audit_log                     enable row level security;

-- Helper macro pattern: "own row" == user_id = auth.uid() ------------------

-- users: read & update own profile; insert handled at signup (id = auth.uid)
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (user_id = auth.uid());
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (user_id = auth.uid());

-- A generic owner policy for the user-owned tables.
do $$
declare t text;
begin
  foreach t in array array[
    'family_members','documents','alerts','orders',
    'doccash_transactions','consent_log','notification_preferences',
    'notifications','link_status','agent_certification_progress'
  ] loop
    execute format('drop policy if exists %1$s_owner on public.%1$s;', t);
    execute format($f$
      create policy %1$s_owner on public.%1$s
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end$$;

-- referrals: the referrer owns the row (user_id alias = referrer_user_id).
drop policy if exists referrals_owner on public.referrals;
create policy referrals_owner on public.referrals
  for all using (referrer_user_id = auth.uid())
  with check (referrer_user_id = auth.uid());

-- agent_profiles keyed on agent_id ( == user_id ).
drop policy if exists agent_profiles_owner on public.agent_profiles;
create policy agent_profiles_owner on public.agent_profiles
  for all using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- orders: customer owns the order; an assigned agent may read & update it.
drop policy if exists orders_agent_rw on public.orders;
create policy orders_agent_rw on public.orders
  for update using (agent_id = auth.uid()) with check (agent_id = auth.uid());
drop policy if exists orders_agent_read on public.orders;
create policy orders_agent_read on public.orders
  for select using (agent_id = auth.uid());

-- services: catalogue is world-readable to any authenticated user.
drop policy if exists services_read_all on public.services;
create policy services_read_all on public.services
  for select using (true);

-- agent public profiles: any authenticated user may read agent profiles
-- (needed for SV-07 "agent name & photo" and AG-04 public profile).
drop policy if exists agent_profiles_read_all on public.agent_profiles;
create policy agent_profiles_read_all on public.agent_profiles
  for select using (true);
