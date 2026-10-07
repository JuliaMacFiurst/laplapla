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
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610060001_add_paypal_webhook_event_recovery.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/tests/sql/commerceOrderFoundation.sql"
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610070001_add_billing_identity_order_snapshots.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/tests/sql/billingIdentityOrderSnapshots.sql"
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610070002_create_receipt_ledger_foundation.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/tests/sql/receiptLedgerFoundation.sql"
"${psql_local[@]}" -f "$repo_root/supabase/migrations/202610070003_add_purchase_notification_delivery.sql" >/dev/null
"${psql_local[@]}" -f "$repo_root/tests/sql/purchaseNotificationDelivery.sql"
"${psql_local[@]}" -f "$repo_root/tests/sql/purchaseNotificationConcurrencySetup.sql" >/dev/null
purchase_notification_order_id="$("${psql_local[@]}" -Atc "select order_id from public.purchase_notification_concurrency_order")"
"${psql_local[@]}" -Atc "set role service_role; select result from public.claim_paid_order_purchase_notification('$purchase_notification_order_id')" >"$test_root/purchase-notification-a.out" &
purchase_notification_a_pid=$!
"${psql_local[@]}" -Atc "set role service_role; select result from public.claim_paid_order_purchase_notification('$purchase_notification_order_id')" >"$test_root/purchase-notification-b.out" &
purchase_notification_b_pid=$!
wait "$purchase_notification_a_pid" "$purchase_notification_b_pid"
purchase_notification_results="$(sort "$test_root/purchase-notification-a.out" "$test_root/purchase-notification-b.out" | tr '\n' ' ')"
[[ "$purchase_notification_results" = "claimed processing " ]]
"${psql_local[@]}" -f "$repo_root/tests/sql/purchaseNotificationConcurrencyAssert.sql"
"${psql_local[@]}" -f "$repo_root/tests/sql/receiptLedgerConcurrencySetup.sql" >/dev/null

same_order_id="$("${psql_local[@]}" -Atc "select order_id from public.receipt_concurrency_orders where label = 'same'")"
different_a_id="$("${psql_local[@]}" -Atc "select order_id from public.receipt_concurrency_orders where label = 'different-a'")"
different_b_id="$("${psql_local[@]}" -Atc "select order_id from public.receipt_concurrency_orders where label = 'different-b'")"

"${psql_local[@]}" -Atc "set role service_role; select result from public.issue_receipt_for_paid_order('$same_order_id')" >"$test_root/same-a.out" &
same_a_pid=$!
"${psql_local[@]}" -Atc "set role service_role; select result from public.issue_receipt_for_paid_order('$same_order_id')" >"$test_root/same-b.out" &
same_b_pid=$!
wait "$same_a_pid" "$same_b_pid"

"${psql_local[@]}" -Atc "set role service_role; select result from public.issue_receipt_for_paid_order('$different_a_id')" >"$test_root/different-a.out" &
different_a_pid=$!
"${psql_local[@]}" -Atc "set role service_role; select result from public.issue_receipt_for_paid_order('$different_b_id')" >"$test_root/different-b.out" &
different_b_pid=$!
wait "$different_a_pid" "$different_b_pid"

"${psql_local[@]}" -f "$repo_root/tests/sql/receiptLedgerConcurrencyAssert.sql"

printf 'Commerce order foundation SQL regression checks passed.\n'
