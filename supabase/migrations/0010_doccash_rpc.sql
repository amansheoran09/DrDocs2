-- 0010_doccash_rpc.sql
-- Atomic DocCash mutation helpers (Section 6.5). Called by Edge Functions
-- (service_role) and by the app via RPC. Doing the ledger insert and the
-- balance update in one function keeps users.doccash_balance consistent with
-- the doccash_transactions ledger.
-- ---------------------------------------------------------------------------

-- Credit (positive) or debit (negative) DocCash, writing a ledger row and
-- updating the cached balance in a single statement-atomic call.
create or replace function public.credit_doccash(
  p_user_id     uuid,
  p_amount      integer,             -- paise; +credit / -debit
  p_type        varchar,
  p_description varchar,
  p_reference_id uuid default null
)
returns integer                       -- new balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  -- Guard against overdrawing on a debit.
  update public.users
     set doccash_balance = doccash_balance + p_amount,
         updated_at = now()
   where user_id = p_user_id
     and doccash_balance + p_amount >= 0
  returning doccash_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'Insufficient DocCash balance for user %', p_user_id
      using errcode = 'check_violation';
  end if;

  insert into public.doccash_transactions(user_id, amount, type, description, reference_id)
  values (p_user_id, p_amount, p_type, p_description, p_reference_id);

  return v_new_balance;
end;
$$;

-- Only the service_role (Edge Functions) may move money directly. End users
-- earn/spend DocCash exclusively through server-side flows, never client RPC.
revoke execute on function public.credit_doccash(uuid, integer, varchar, varchar, uuid)
  from anon, authenticated;
grant execute on function public.credit_doccash(uuid, integer, varchar, varchar, uuid)
  to service_role;
