#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/laplapla-commerce-orders.XXXXXX")"
data_dir="$test_root/data"
socket_dir="$test_root/socket"
port="$((50000 + RANDOM % 10000))"

cleanup() {
  if [[ -f "$data_dir/postmaster.pid" ]]; then
    pg_ctl -D "$data_dir" stop -m fast >/dev/null 2>&1 || true
  fi
  case "$test_root" in
    "${TMPDIR:-/tmp}"/laplapla-commerce-orders.*) rm -rf -- "$test_root" ;;
    *) printf 'Refusing to remove unexpected test path: %s\n' "$test_root" >&2 ;;
  esac
}
trap cleanup EXIT

for command in initdb pg_ctl psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required PostgreSQL command is unavailable: %s\n' "$command" >&2
    exit 1
  fi
done

mkdir -p "$socket_dir"
initdb -D "$data_dir" --auth=trust --encoding=UTF8 --no-locale >/dev/null
pg_ctl -D "$data_dir" -l "$test_root/postgres.log" -o "-k $socket_dir -p $port" start >/dev/null

psql_local=(psql -X -v ON_ERROR_STOP=1 -h "$socket_dir" -p "$port" -d postgres)

"${psql_local[@]}" -c "create role anon; create role authenticated; create role service_role;" >/dev/null
"${psql_local[@]}" -c "alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;" >/dev/null
"${psql_local[@]}" -c "
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as 'select null::uuid';
" >/dev/null

"${psql_local[@]}" -f "$repo_root/supabase/migrations/202609290001_create_customer_profiles_and_product_entitlements.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610010001_create_commerce_order_foundation.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610010002_bind_paypal_checkout_orders.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610010003_add_paypal_checkout_recovery.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/tests/sql/commerceOrderFoundation.sql"

printf 'Commerce order foundation SQL regression checks passed.\n'
