-- 0003_service_order_tables.sql
-- DocVault — Section 4.3 Service and Order Tables
-- ---------------------------------------------------------------------------

-- TABLE: services (catalogue) ----------------------------------------------
create table if not exists public.services (
  service_id    uuid         primary key default gen_random_uuid(),
  category      varchar(30)  not null
                check (category in ('pan', 'aadhaar', 'passport', 'driving_license',
                                    'voter_id', 'certificate', 'nri')),
  name          varchar(100) not null,
  description   text         not null,
  what_we_do    text         not null,
  docs_required jsonb        not null default '[]'::jsonb,
  govt_fee      integer      not null default 0 check (govt_fee >= 0),     -- paise
  service_fee   integer      not null default 0 check (service_fee >= 0),  -- paise
  total_price   integer      not null check (total_price >= 0),            -- paise
  estimated_days integer     not null check (estimated_days >= 0),
  is_active     boolean      not null default true,
  sort_order    integer      not null default 0
);

-- alerts.related_service_id can now reference services -----------------------
alter table public.alerts
  drop constraint if exists alerts_related_service_id_fkey;
alter table public.alerts
  add constraint alerts_related_service_id_fkey
  foreign key (related_service_id) references public.services (service_id) on delete set null;

-- TABLE: orders -------------------------------------------------------------
create table if not exists public.orders (
  order_id             uuid         primary key default gen_random_uuid(),
  user_id              uuid         not null references public.users (user_id) on delete cascade,
  service_id           uuid         not null references public.services (service_id),
  agent_id             uuid         references public.users (user_id),
  status               varchar(30)  not null default 'pending_payment'
                       check (status in ('pending_payment', 'confirmed', 'agent_assigned',
                                         'en_route', 'collected', 'processing',
                                         'completed', 'cancelled')),
  booking_date         date         not null,
  booking_slot         varchar(30)  not null,
  address_line1        text         not null,
  address_city         varchar(50)  not null,
  address_pincode      varchar(6)   not null check (address_pincode ~ '^[0-9]{6}$'),
  total_amount         integer      not null check (total_amount >= 0),   -- paise
  payment_id           varchar(100),
  payment_status       varchar(20)  not null default 'pending'
                       check (payment_status in ('pending', 'paid', 'refunded')),
  promo_code           varchar(20),
  discount_amount      integer      not null default 0 check (discount_amount >= 0),
  doccash_used         integer      not null default 0 check (doccash_used >= 0),
  agent_commission     integer      check (agent_commission >= 0),
  special_instructions text,
  completed_at         timestamptz,
  rating               integer      check (rating between 1 and 5),
  review_text          text,
  created_at           timestamptz  not null default now()
);
