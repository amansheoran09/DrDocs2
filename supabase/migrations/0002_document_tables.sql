-- 0002_document_tables.sql
-- DocVault — Section 4.2 Document Tables
-- ---------------------------------------------------------------------------

-- TABLE: documents ----------------------------------------------------------
create table if not exists public.documents (
  doc_id            uuid         primary key default gen_random_uuid(),
  user_id           uuid         not null references public.users (user_id) on delete cascade,
  member_id         uuid         references public.family_members (member_id) on delete cascade,
  doc_type          varchar(30)  not null
                    check (doc_type in (
                      'aadhaar', 'pan', 'passport', 'driving_license', 'voter_id',
                      'birth_cert', 'marriage_cert', 'class10_cert', 'class12_cert',
                      'vehicle_rc', 'bank_passbook', 'ration_card', 'pension_card',
                      'health_card', 'other')),
  doc_number        varchar(50),
  full_name_on_doc  varchar(100) not null,
  dob_on_doc        date,
  issue_date        date,
  expiry_date       date,                     -- null for non-expiring docs
  issuing_authority varchar(100),
  doc_image_url     text,                     -- encrypted S3 url
  thumbnail_url     text,
  source            varchar(20)  not null
                    check (source in ('camera_scan', 'gallery', 'digilocker', 'manual')),
  ocr_confidence    real         check (ocr_confidence between 0.0 and 1.0),
  is_verified       boolean      not null default false,
  status            varchar(20)  not null default 'valid'
                    check (status in ('valid', 'expiring_soon', 'expired', 'needs_renewal')),
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

comment on column public.documents.doc_number is 'Stored value; always masked to last 4 digits in the UI.';

-- TABLE: alerts -------------------------------------------------------------
create table if not exists public.alerts (
  alert_id           uuid         primary key default gen_random_uuid(),
  user_id            uuid         not null references public.users (user_id) on delete cascade,
  doc_id             uuid         references public.documents (doc_id) on delete cascade,
  alert_type         varchar(40)  not null
                     check (alert_type in (
                       'expiry_180', 'expiry_90', 'expiry_60_dl', 'expiry_30', 'expiry_7',
                       'expiry_overdue', 'link_gap_pan_aadhaar', 'name_mismatch',
                       'doc_missing', 'renewal_due')),
  severity           varchar(10)  not null
                     check (severity in ('critical', 'urgent', 'warning', 'info')),
  title              varchar(100) not null,
  message            text         not null,
  is_read            boolean      not null default false,
  is_dismissed       boolean      not null default false,
  related_service_id uuid,        -- FK added in 0003 after services exists
  created_at         timestamptz  not null default now(),
  fires_at           timestamptz  not null,
  sent_at            timestamptz
);
