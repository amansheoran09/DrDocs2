# DocVault by Dr.Docs

> Store, track and renew all your government documents — free, forever.

This repository implements the **DocVault Complete App Action Plan** — a
consumer mobile app (Android-first) with a Supabase backend, an intelligence
layer that scores your document health and warns you before anything expires,
and a Dr.Docs doorstep renewal marketplace.

The build follows the action plan section-by-section. The plan specifies
FlutterFlow (a no-code builder that *exports Flutter*); this repo contains the
**Flutter source directly** so it is reviewable, testable and version-controlled.

---

## Repository layout

```
.
├── app/                     # Flutter mobile app (Section 3, 7)
│   ├── lib/
│   │   ├── core/            # theme (Section 7.1), env, router (47 screen IDs)
│   │   ├── data/            # Supabase repositories + Riverpod providers
│   │   ├── l10n/            # English + Hindi strings (UX Rule 5)
│   │   ├── models/          # typed mappings of the Section 4 tables
│   │   ├── widgets/         # DocumentCard, AlertCard, ServiceCard, etc.
│   │   └── features/        # screens grouped by navigation zone
│   └── test/
├── supabase/                # Backend (Sections 4, 5, 6, 10)
│   ├── migrations/          # full schema, RLS, triggers, health-score logic
│   ├── functions/           # Edge Functions: alerts CRON + Razorpay webhook
│   ├── test/                # SQL test suite (validates Section 6.1 algorithm)
│   ├── seed.sql             # Dr.Docs service catalogue
│   └── config.toml
└── scripts/db_test.sh       # apply migrations + run the SQL test suite
```

---

## What is built and verified

### Backend (`supabase/`) — fully implemented and tested ✅

Validated by applying every migration + seed to a real PostgreSQL 16 instance
and running `supabase/test/health_score.sql` (all assertions pass):

- **Schema (Section 4)** — all core tables: `users`, `family_members`,
  `documents`, `alerts`, `services`, `orders`, `referrals`,
  `doccash_transactions`, `agent_profiles`, plus supporting tables for
  consent logging, audit, notification preferences, cross-link status and
  agent certification (Sections 8 & 10). Full constraints, checks and indexes.
- **Row Level Security (Section 10, P0)** — every table RLS-enabled; users can
  only touch their own rows; the service catalogue is public-readable; agents
  can read/update assigned orders. Verified with role impersonation tests.
- **Document Health Score (Section 6.1)** — the exact 4-component algorithm
  (Completeness 30 / Validity 40 / Linkage 20 / Accuracy 10) in PL/pgSQL,
  recomputed by trigger on every document or link change. Tests confirm a
  perfect portfolio scores **100** and a degraded one scores **82**.
- **Document status derivation (Section 7.2)** — `valid` / `expiring_soon` /
  `expired` set automatically from the expiry date.
- **Family cap (Section 2)** — max 6 sub-profiles per account, enforced by
  trigger.
- **DocCash ledger (Section 6.5)** — atomic `credit_doccash()` that writes the
  ledger row and updates the cached balance together, with overdraw protection.

### Edge Functions (`supabase/functions/`) — implemented

- **`generate-alerts`** — the daily 08:00 IST CRON job (Section 6.2). Evaluates
  every expiry bucket (180/90/60-DL/30/7/overdue), inserts de-duplicated
  `alerts` rows and dispatches the matching push (Section 8) via OneSignal,
  honouring each user's notification preferences.
- **`razorpay-webhook`** — verifies the HMAC signature, confirms the paid
  order, credits the referral reward (Section 6.5) and sends the NTF-06
  "Booking Confirmed" notification (Section 5.3 / 6.4).

### Flutter app (`app/`) — foundation + core journeys implemented

- **Design system (Section 7.1)** — exact colours, Poppins/Inter/Noto Sans
  Devanagari typography, radii, button sizes, 5-tab bottom navigation.
- **Reusable components (Section 9, Week 1-2)** — `DocumentCard`, `AlertCard`,
  `ServiceCard`, `DvBottomNav`, `LoadingState`, plus `HealthScoreRing`,
  `StatusPill` and `EmptyState`.
- **Bilingual from day one (UX Rule 5)** — English + Hindi, with a persisted
  language choice (OB-02) and a Devanagari theme.
- **Implemented screens:** OB-01…OB-06 (full onboarding + phone-OTP auth),
  HM-01 Home Dashboard (health ring, alert strip, quick actions),
  DW-01 All Documents, DW-02 Document Detail, DW-03 Add Document,
  DW-07 Manual Entry, SV-01 Services Home, SV-03 Service Detail,
  AL-01 Alerts Centre, ER-01 Earn Home, PR-01 Profile Home.
- **Navigation graph is complete:** every remaining Section 3 screen ID
  (DW-04/05/06, FM-01…03, SV-02/04…08, ER-02…05, AG-01…05, PR-02…07,
  AL-02…04) has a named route and renders a clearly-labelled scaffold, so the
  whole app is walkable and the routing matches the plan's vocabulary.

See [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md) for the screen-by-screen
coverage matrix.

---

## Running it

### Backend

With the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase start                       # local stack (Postgres on :54322)
supabase db reset                    # applies migrations/ then seed.sql
./scripts/db_test.sh                 # runs the SQL test suite
supabase functions serve             # run Edge Functions locally
```

Against any plain PostgreSQL:

```bash
DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/db_test.sh
```

> The first migration (`0000_supabase_shim.sql`) recreates the `auth` schema,
> roles and `auth.uid()` only when they are missing, so the suite runs on
> vanilla Postgres as well as hosted Supabase.

### App

```bash
cd app
flutter create --org in.drdocs --platforms=android .   # generate platform folders
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key>
flutter test
```

Secrets for server-only integrations (Vision API, Razorpay, OneSignal,
service-role key) live exclusively in Supabase Edge Function env vars and are
**never** bundled into the client (Section 10, P0). The Supabase anon key is
safe in the client because RLS gates every row.

---

## Security & privacy highlights (Section 10)

- OTP-only auth (no passwords), RLS on every table, HTTPS only.
- API keys proxied through Edge Functions; never in client code.
- Aadhaar / ID numbers masked to last 4 digits everywhere (`maskedNumber`).
- India data residency: Supabase + S3 in `ap-south-1` (config/infra).
- DPDPA-2023 consent log + admin audit log tables included.

---

*Dr.Docs · Mayur Rana · info@drdocs.in · www.drdocs.in · Gurgaon, India*
