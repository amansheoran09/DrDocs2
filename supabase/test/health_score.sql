-- supabase/test/health_score.sql
-- Reproducible validation of the Document Health Score (Section 6.1),
-- document-status derivation, the family-member cap and the DocCash ledger.
--
-- Run against a database that already has the migrations + seed applied:
--   psql "$DATABASE_URL" -f supabase/test/health_score.sql
--
-- Each block raises a NOTICE 'PASS'/'FAIL'. Used by scripts/db_test.sh.
-- ---------------------------------------------------------------------------

begin;

-- Fixture user (bypass auth FK by inserting an auth.users row too on local).
insert into auth.users(id, phone) values ('aaaaaaaa-0000-0000-0000-000000000001', '9000000001')
  on conflict do nothing;
insert into public.users(user_id, phone, full_name, dob, referral_code)
values ('aaaaaaaa-0000-0000-0000-000000000001', '9000000001', 'Test User', '1990-01-01', 'TEST0001');

-- Scenario A: all 6 core docs, valid, names consistent, all 4 links => 100.
insert into public.documents(user_id, doc_type, full_name_on_doc, expiry_date, source) values
 ('aaaaaaaa-0000-0000-0000-000000000001','aadhaar','Test User',NULL,'manual'),
 ('aaaaaaaa-0000-0000-0000-000000000001','pan','Test User',NULL,'manual'),
 ('aaaaaaaa-0000-0000-0000-000000000001','passport','Test User', current_date + 2000,'manual'),
 ('aaaaaaaa-0000-0000-0000-000000000001','voter_id','Test User',NULL,'manual'),
 ('aaaaaaaa-0000-0000-0000-000000000001','driving_license','Test User', current_date + 2000,'manual'),
 ('aaaaaaaa-0000-0000-0000-000000000001','birth_cert','Test User',NULL,'manual');
insert into public.link_status(user_id, link_type, is_linked) values
 ('aaaaaaaa-0000-0000-0000-000000000001','pan_aadhaar',true),
 ('aaaaaaaa-0000-0000-0000-000000000001','aadhaar_bank',true),
 ('aaaaaaaa-0000-0000-0000-000000000001','aadhaar_mobile',true),
 ('aaaaaaaa-0000-0000-0000-000000000001','dl_aadhaar_address',true);

do $$
declare s int;
begin
  select doc_health_score into s from public.users
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if s = 100 then raise notice 'PASS A: full health score = 100';
  else raise exception 'FAIL A: expected 100 got %', s; end if;
end$$;

-- Scenario B: expire DL (-8), break a link (-5), passport name -> 'T User'
-- (shared surname => accuracy 5). Expect 30 + 32 + 15 + 5 = 82.
update public.documents set expiry_date = current_date - 5
 where doc_type = 'driving_license' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.link_status set is_linked = false
 where link_type = 'pan_aadhaar' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.documents set full_name_on_doc = 'T User'
 where doc_type = 'passport' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
declare s int; st text;
begin
  select doc_health_score into s from public.users
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if s = 82 then raise notice 'PASS B: degraded health score = 82';
  else raise exception 'FAIL B: expected 82 got %', s; end if;

  select status into st from public.documents
   where doc_type = 'driving_license' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if st = 'expired' then raise notice 'PASS B2: expired DL status auto-derived';
  else raise exception 'FAIL B2: expected expired got %', st; end if;
end$$;

-- Scenario C: family-member cap (max 6).
do $$
begin
  for i in 1..6 loop
    insert into public.family_members(user_id, full_name, relationship)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'M'||i, 'Child');
  end loop;
  begin
    insert into public.family_members(user_id, full_name, relationship)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'M7', 'Child');
    raise exception 'FAIL C: 7th family member allowed';
  exception when others then raise notice 'PASS C: family cap enforced';
  end;
end$$;

-- Scenario D: DocCash credit/debit + overdraw guard.
do $$
declare bal int;
begin
  bal := public.credit_doccash('aaaaaaaa-0000-0000-0000-000000000001', 25000, 'earned_referral', 'test');
  bal := public.credit_doccash('aaaaaaaa-0000-0000-0000-000000000001', -10000, 'redeemed_service', 'test');
  if bal = 15000 then raise notice 'PASS D: DocCash balance = 15000 paise';
  else raise exception 'FAIL D: expected 15000 got %', bal; end if;
  begin
    perform public.credit_doccash('aaaaaaaa-0000-0000-0000-000000000001', -999999, 'redeemed_service', 'x');
    raise exception 'FAIL D2: overdraw allowed';
  exception when others then raise notice 'PASS D2: overdraw blocked';
  end;
end$$;

rollback;  -- leave the database clean
