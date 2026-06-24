-- 0012_referral_rpc.sql
-- Make a referral code fully usable at signup. A new user can't write to the
-- referrer's rows under RLS, so this SECURITY DEFINER function performs the
-- whole exchange atomically when the new user submits a code:
--   * validates the code (must exist, can't be your own, one referral per user)
--   * links referred_by on the new user
--   * inserts the referrals row (status 'registered')
--   * credits the referrer Rs.50 DocCash (Section 6.5) via credit_doccash
-- ---------------------------------------------------------------------------

create or replace function public.apply_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref uuid;
  v_referral_id uuid;
begin
  if v_uid is null then
    return 'not_authenticated';
  end if;

  -- One referral per user.
  if exists (select 1 from public.users where user_id = v_uid and referred_by is not null) then
    return 'already_referred';
  end if;

  select user_id into v_ref
  from public.users
  where referral_code = upper(btrim(p_code)) and user_id <> v_uid;

  if v_ref is null then
    return 'invalid_code';
  end if;

  update public.users set referred_by = v_ref where user_id = v_uid;

  insert into public.referrals (referrer_user_id, referred_user_id, referral_code, status, reward_amount)
  values (v_ref, v_uid, upper(btrim(p_code)), 'registered', 5000)
  returning referral_id into v_referral_id;

  perform public.credit_doccash(v_ref, 5000, 'earned_referral', 'Referral signup bonus', v_referral_id);

  return 'ok';
end;
$$;

revoke execute on function public.apply_referral(text) from anon;
grant execute on function public.apply_referral(text) to authenticated;
