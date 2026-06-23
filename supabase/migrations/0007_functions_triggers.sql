-- 0007_functions_triggers.sql
-- DocVault — business logic implemented in the database.
--   * Document status derivation       (Section 7.2 colour coding)
--   * Document Health Score algorithm   (Section 6.1)
--   * Family-member 6-profile limit     (Section 2)
--   * updated_at maintenance
-- ---------------------------------------------------------------------------

-- The six "core" Indian documents used by the Completeness sub-score.
create or replace function public.core_doc_types()
returns text[] language sql immutable as $$
  select array['aadhaar','pan','passport','voter_id','driving_license','birth_cert'];
$$;

-- Derive a document's status from its expiry date. -------------------------
-- expiring_soon == within 90 days (matches the orange card border in 7.2).
create or replace function public.compute_doc_status(p_expiry date)
returns varchar language sql immutable as $$
  select case
    when p_expiry is null                       then 'valid'          -- non-expiring
    when p_expiry <  current_date                then 'expired'
    when p_expiry <= current_date + 90           then 'expiring_soon'
    else 'valid'
  end;
$$;

create or replace function public.trg_documents_biu()
returns trigger language plpgsql as $$
begin
  -- Never trust a client-supplied status for an expiring doc; derive it,
  -- but preserve an explicit 'needs_renewal' flag set by the app/agent flow.
  if new.status is distinct from 'needs_renewal' then
    new.status := public.compute_doc_status(new.expiry_date);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists documents_biu on public.documents;
create trigger documents_biu
  before insert or update on public.documents
  for each row execute function public.trg_documents_biu();

-- ---------------------------------------------------------------------------
-- DOCUMENT HEALTH SCORE  (Section 6.1)
-- Computed over the account holder's OWN documents (member_id is null).
-- Returns a jsonb breakdown so screen AL-03 can show the sub-scores too.
-- ---------------------------------------------------------------------------
create or replace function public.health_score_breakdown(p_user_id uuid)
returns jsonb language plpgsql stable as $$
declare
  v_completeness int := 0;
  v_validity     int := 40;
  v_linkage      int := 0;
  v_accuracy     int := 0;
  v_core_present int := 0;
  v_expired      int := 0;
  v_exp30        int := 0;
  v_exp90        int := 0;
  v_links        int := 0;
  v_distinct_names int := 0;
  v_total_named  int := 0;
begin
  -- Completeness: 5 pts per distinct core doc present, capped at 30.
  select count(distinct doc_type)
    into v_core_present
  from public.documents
  where user_id = p_user_id and member_id is null
    and doc_type = any (public.core_doc_types());
  v_completeness := least(v_core_present * 5, 30);

  -- Validity: start 40, deduct per expiry bucket (each doc counts once).
  select
    count(*) filter (where expiry_date < current_date),
    count(*) filter (where expiry_date >= current_date and expiry_date <= current_date + 30),
    count(*) filter (where expiry_date >  current_date + 30 and expiry_date <= current_date + 90)
    into v_expired, v_exp30, v_exp90
  from public.documents
  where user_id = p_user_id and member_id is null and expiry_date is not null;
  v_validity := greatest(0, 40 - (v_expired * 8) - (v_exp30 * 4) - (v_exp90 * 2));

  -- Linkage: 5 pts for each verified cross-link.
  select count(*) into v_links
  from public.link_status
  where user_id = p_user_id and is_linked = true;
  v_linkage := least(v_links * 5, 20);

  -- Accuracy: compare names across the user's own documents.
  select count(distinct lower(btrim(full_name_on_doc))), count(*)
    into v_distinct_names, v_total_named
  from public.documents
  where user_id = p_user_id and member_id is null
    and full_name_on_doc is not null and btrim(full_name_on_doc) <> '';

  if v_total_named = 0 or v_distinct_names <= 1 then
    v_accuracy := 10;                       -- consistent (or nothing to compare)
  elsif exists (                            -- minor mismatch: shared surname
    select 1 from (
      select split_part(lower(btrim(full_name_on_doc)), ' ',
               array_length(string_to_array(btrim(full_name_on_doc), ' '), 1)) as surname
      from public.documents
      where user_id = p_user_id and member_id is null
        and full_name_on_doc is not null and btrim(full_name_on_doc) <> ''
    ) s group by surname having count(*) = v_total_named
  ) then
    v_accuracy := 5;
  else
    v_accuracy := 0;                        -- major mismatch
  end if;

  return jsonb_build_object(
    'completeness', v_completeness,
    'validity',     v_validity,
    'linkage',      v_linkage,
    'accuracy',     v_accuracy,
    'total',        v_completeness + v_validity + v_linkage + v_accuracy,
    'detail', jsonb_build_object(
      'core_docs_present', v_core_present,
      'expired',           v_expired,
      'expiring_30',       v_exp30,
      'expiring_90',       v_exp90,
      'links_verified',    v_links
    )
  );
end;
$$;

create or replace function public.calc_health_score(p_user_id uuid)
returns integer language sql stable as $$
  select (public.health_score_breakdown(p_user_id) ->> 'total')::int;
$$;

-- Persist the recomputed score onto users.doc_health_score.
create or replace function public.refresh_health_score(p_user_id uuid)
returns void language sql as $$
  update public.users
     set doc_health_score = public.calc_health_score(p_user_id),
         updated_at = now()
   where user_id = p_user_id;
$$;

-- Recalculate whenever a document or a link changes. -----------------------
create or replace function public.trg_recalc_health()
returns trigger language plpgsql as $$
begin
  perform public.refresh_health_score(coalesce(new.user_id, old.user_id));
  return null;   -- AFTER trigger
end;
$$;

drop trigger if exists documents_recalc_health on public.documents;
create trigger documents_recalc_health
  after insert or update or delete on public.documents
  for each row execute function public.trg_recalc_health();

drop trigger if exists link_status_recalc_health on public.link_status;
create trigger link_status_recalc_health
  after insert or update or delete on public.link_status
  for each row execute function public.trg_recalc_health();

-- Family-member cap: max 6 sub-profiles per account (Section 2). -----------
create or replace function public.trg_family_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.family_members where user_id = new.user_id) >= 6 then
    raise exception 'Family limit reached: a maximum of 6 family members is allowed per account';
  end if;
  return new;
end;
$$;

drop trigger if exists family_members_limit on public.family_members;
create trigger family_members_limit
  before insert on public.family_members
  for each row execute function public.trg_family_limit();

-- Generic updated_at touch trigger. ----------------------------------------
create or replace function public.trg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_touch on public.users;
create trigger users_touch
  before update on public.users
  for each row execute function public.trg_touch_updated_at();
