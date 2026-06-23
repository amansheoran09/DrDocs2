#!/usr/bin/env bash
# scripts/db_test.sh
# Spin up a throwaway database, apply every migration + seed, then run the SQL
# test suite. Works against any PostgreSQL (local Postgres or `supabase start`).
#
# Usage:
#   DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres ./scripts/db_test.sh
#
# If DATABASE_URL is unset it defaults to the standard `supabase start` URL.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:54322/postgres}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Applying migrations to $DATABASE_URL"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "    - $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "==> Seeding catalogue"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/seed.sql"

echo "==> Running SQL test suite"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/test/health_score.sql" 2>&1 \
  | grep -E 'PASS|FAIL' || true

echo "==> Done"
