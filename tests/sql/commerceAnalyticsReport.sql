\set ON_ERROR_STOP on

begin;

-- Isolate this report fixture from rows intentionally left by earlier disposable suites.
truncate table
  public.analytics_events,
  public.commerce_refund_operations,
  public.payment_provider_events,
  public.order_items,
  public.orders,
  public.product_entitlements,
  public.customer_profiles,
  auth.users
cascade;

insert into auth.users (id) values
  ('a1000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002'),
  ('a1000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000004'),
  ('a1000000-0000-4000-8000-000000000005'),
  ('a1000000-0000-4000-8000-000000000006'),
  ('a1000000-0000-4000-8000-000000000007'),
  ('a1000000-0000-4000-8000-000000000008'),
  ('a1000000-0000-4000-8000-000000000009');

insert into public.product_entitlements (id, user_id, product_id, source, status) values
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'sound-case-001', 'laplapla_web', 'active'),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'sound-case-legacy', 'laplapla_web', 'active'),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004', 'sound-case-refund', 'laplapla_web', 'active'),
  ('b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000005', 'sound-case-boundary', 'laplapla_web', 'active'),
  ('b1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000006', 'sound-case-live', 'laplapla_web', 'active'),
  ('b1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000007', 'sound-case-gift', 'promo', 'active'),
  ('b1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000009', 'sound-case-legacy-environment', 'laplapla_web', 'refunded');

insert into public.analytics_events (
  event_id, event_name, visitor_id, anonymous_user_id, session_id,
  section, content_type, content_id, content_slug, language, entry_point,
  properties, created_at
) values
  ('c1000000-0000-4000-8000-000000000001', 'shop_view',
   'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000001', 'shop', null, null, null, 'en', null,
   '{"section":"shop"}', '2026-10-19T00:00:00Z'),
  ('c1000000-0000-4000-8000-000000000002', 'product_view',
   'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000001', 'shop', 'shop_product',
   'sound-case-001', 'sound-case-001', 'en', null,
   '{"product_id":"sound-case-001"}', '2026-10-19T00:10:00Z'),
  ('c1000000-0000-4000-8000-000000000003', 'product_view',
   'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000001', 'shop', 'shop_product',
   'sound-case-001', 'sound-case-001', 'en', null,
   '{"product_id":"sound-case-001"}', '2026-10-19T00:20:00Z'),
  ('c1000000-0000-4000-8000-000000000004', 'product_interest',
   'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'e1000000-0000-4000-8000-000000000001', 'shop', 'shop_product',
   'sound-case-001', 'sound-case-001', 'en', 'home_promo',
   '{"product_id":"sound-case-001","content_slug":"sound-case-001","language":"en","entry_point":"home_promo","destination":"checkout"}',
   '2026-10-19T00:30:00Z'),
  -- Legacy identity uses visitor_id only.
  ('c1000000-0000-4000-8000-000000000006', 'page_view',
   'd1000000-0000-4000-8000-000000000002', null,
   'e1000000-0000-4000-8000-000000000001', 'shop', 'page', null, null, 'en', null,
   '{}', '2026-10-19T00:40:00Z'),
  -- Missing identity remains uncounted and observable in data quality.
  ('c1000000-0000-4000-8000-000000000007', 'page_view',
   null, null, 'e1000000-0000-4000-8000-000000000001', 'shop', 'page', null, null, 'en', null,
   '{}', '2026-10-19T00:50:00Z'),
  -- A conflicting row uses anonymous_user_id canonically and is flagged.
  ('c1000000-0000-4000-8000-000000000008', 'page_view',
   'd1000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000003',
   'e1000000-0000-4000-8000-000000000001', 'shop', 'page', null, null, 'en', null,
   '{}', '2026-10-19T00:55:00Z'),
  -- The upper bound is excluded.
  ('c1000000-0000-4000-8000-000000000005', 'product_view',
   'd1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002',
   'e1000000-0000-4000-8000-000000000002', 'shop', 'shop_product',
   'sound-case-001', 'sound-case-001', 'en', null,
   '{"product_id":"sound-case-001"}', '2026-10-20T00:00:00Z'),
  -- Legacy rows without event_id remain valid and are visible before cleanup.
  (null, 'shop_view', null, null, null, 'shop', null, null, null, 'en', null,
   '{}', '2025-01-01T00:00:00Z');

insert into public.orders (
  id, user_id, provider, status, currency, total_minor, provider_order_id,
  provider_capture_id, checkout_idempotency_key, paypal_create_request_id,
  paypal_capture_request_id, paid_at, customer_name_snapshot,
  customer_email_snapshot, provider_environment, attribution_snapshot, created_at
) values
  -- Checkout only, legacy/unattributed.
  ('f1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'paypal', 'pending_approval', 'ILS', 3900, 'CHECKOUT-PENDING', null,
   '11000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001',
   '13000000-0000-4000-8000-000000000001', null, 'Pending Buyer', 'pending@example.com',
   'sandbox', null, '2026-10-19T01:00:00Z'),
  -- Paid in the window with Phase 2A attribution.
  ('f1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002',
   'paypal', 'paid', 'ILS', 3900, 'CHECKOUT-PAID-1', 'CAPTURE-PAID-1',
   '11000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002',
   '13000000-0000-4000-8000-000000000002', '2026-10-19T03:00:00Z',
   'Private Buyer', 'private@example.com', 'sandbox',
   '{"version":1,"visitor_id":"d1000000-0000-4000-8000-000000000001","session_id":"e1000000-0000-4000-8000-000000000001","first_touch":{"source":"youtube","utm_source":"youtube","utm_medium":"social","utm_campaign":"launch"},"session_touch":{"source":"instagram","utm_source":"instagram","utm_medium":"social","utm_campaign":"retarget"}}',
   '2026-10-19T02:00:00Z'),
  -- Paid in the window but created earlier and carrying no attribution.
  ('f1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003',
   'paypal', 'paid', 'ILS', 4900, 'CHECKOUT-PAID-2', 'CAPTURE-PAID-2',
   '11000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000003',
   '13000000-0000-4000-8000-000000000003', '2026-10-19T04:00:00Z',
   null, null, 'sandbox', null, '2026-10-18T02:00:00Z'),
  -- Purchase outside the window; its completed refund occurs inside the window.
  ('f1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004',
   'paypal', 'paid', 'ILS', 10000, 'CHECKOUT-PAID-3', 'CAPTURE-PAID-3',
   '11000000-0000-4000-8000-000000000004', '12000000-0000-4000-8000-000000000004',
   '13000000-0000-4000-8000-000000000004', '2026-10-18T04:00:00Z',
   null, null, 'sandbox', null, '2026-10-18T03:00:00Z'),
  -- Exactly at p_to: excluded from checkout and paid cohorts.
  ('f1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005',
   'paypal', 'paid', 'ILS', 3900, 'CHECKOUT-BOUNDARY', 'CAPTURE-BOUNDARY',
   '11000000-0000-4000-8000-000000000005', '12000000-0000-4000-8000-000000000005',
   '13000000-0000-4000-8000-000000000005', '2026-10-20T00:00:00Z',
   null, null, 'sandbox', null, '2026-10-20T00:00:00Z'),
  -- Same period, different environment.
  ('f1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000006',
   'paypal', 'paid', 'ILS', 4900, 'CHECKOUT-LIVE', 'CAPTURE-LIVE',
   '11000000-0000-4000-8000-000000000006', '12000000-0000-4000-8000-000000000006',
   '13000000-0000-4000-8000-000000000006', '2026-10-19T05:00:00Z',
   null, null, 'live', null, '2026-10-19T04:30:00Z'),
  -- Future-schema simulation: one paid order containing two item lines.
  ('f1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000008',
   'paypal', 'paid', 'ILS', 5000, 'CHECKOUT-MULTI', 'CAPTURE-MULTI',
   '11000000-0000-4000-8000-000000000007', '12000000-0000-4000-8000-000000000007',
   '13000000-0000-4000-8000-000000000007', '2026-10-19T08:00:00Z',
   null, null, 'sandbox', null, '2026-10-19T07:00:00Z'),
  -- Historical test order whose provider environment was never recorded.
  ('f1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000009',
   'paypal', 'paid', 'ILS', 4900, 'CHECKOUT-LEGACY-ENV', 'CAPTURE-LEGACY-ENV',
   '11000000-0000-4000-8000-000000000008', '12000000-0000-4000-8000-000000000008',
   '13000000-0000-4000-8000-000000000008', '2026-10-19T09:00:00Z',
   null, null, null, null, '2026-10-19T08:30:00Z');

-- Production currently enforces one item with quantity one. Relax only the
-- disposable transaction so the report is regression-tested against a future
-- multi-item schema without changing the commerce domain migration.
alter table public.order_items drop constraint order_items_order_key;
alter table public.order_items drop constraint order_items_quantity_check;

insert into public.order_items (
  order_id, product_id, quantity, unit_price_minor, currency, price_source, entitlement_id
) values
  ('f1000000-0000-4000-8000-000000000001', 'sound-case-001', 1, 3900, 'ILS', 'catalog', null),
  ('f1000000-0000-4000-8000-000000000002', 'sound-case-001', 1, 3900, 'ILS', 'catalog', 'b1000000-0000-4000-8000-000000000001'),
  ('f1000000-0000-4000-8000-000000000003', 'sound-case-legacy', 1, 4900, 'ILS', 'catalog', 'b1000000-0000-4000-8000-000000000002'),
  ('f1000000-0000-4000-8000-000000000004', 'sound-case-refund', 1, 10000, 'ILS', 'catalog', 'b1000000-0000-4000-8000-000000000003'),
  ('f1000000-0000-4000-8000-000000000005', 'sound-case-boundary', 1, 3900, 'ILS', 'catalog', 'b1000000-0000-4000-8000-000000000004'),
  ('f1000000-0000-4000-8000-000000000006', 'sound-case-live', 1, 4900, 'ILS', 'catalog', 'b1000000-0000-4000-8000-000000000005'),
  ('f1000000-0000-4000-8000-000000000007', 'sound-case-bundle-a', 1, 2000, 'ILS', 'catalog', null),
  ('f1000000-0000-4000-8000-000000000007', 'sound-case-bundle-b', 2, 1500, 'ILS', 'catalog', null),
  ('f1000000-0000-4000-8000-000000000008', 'sound-case-legacy-environment', 1, 4900, 'ILS', 'catalog', 'b1000000-0000-4000-8000-000000000007');

-- Capture and webhook evidence may both exist, but the report counts the durable order once.
insert into public.payment_provider_events (
  provider, provider_event_id, event_type, provider_order_id, provider_capture_id,
  payload_hash, status, processed_at
) values
  ('paypal', 'PROVIDER-CAPTURE-1', 'PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT-PAID-1', 'CAPTURE-PAID-1',
   repeat('a', 64), 'processed', '2026-10-19T03:01:00Z'),
  ('paypal', 'PROVIDER-WEBHOOK-1', 'PAYMENT.CAPTURE.COMPLETED', 'CHECKOUT-PAID-1', 'CAPTURE-PAID-1',
   repeat('b', 64), 'processed', '2026-10-19T03:02:00Z');

insert into public.commerce_refund_operations (
  id, order_id, entitlement_id, provider_capture_id, provider_environment,
  amount_minor, currency, status, provider_refund_id, accounting_status,
  provider_confirmed_at, access_revoked_at, created_at
) values
  ('21000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003',
   'b1000000-0000-4000-8000-000000000002', 'CAPTURE-PAID-2', 'sandbox',
   4900, 'ILS', 'completed', 'REFUND-COMPLETE-1', 'not_required',
   '2026-10-19T05:00:00Z', '2026-10-19T05:01:00Z', '2026-10-19T04:50:00Z'),
  ('21000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004',
   'b1000000-0000-4000-8000-000000000003', 'CAPTURE-PAID-3', 'sandbox',
   10000, 'ILS', 'completed', 'REFUND-COMPLETE-2', 'not_required',
   '2026-10-19T06:00:00Z', '2026-10-19T06:01:00Z', '2026-10-19T05:50:00Z'),
  -- The refund has trustworthy provider evidence, but its legacy order has no environment.
  ('21000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000008',
   'b1000000-0000-4000-8000-000000000007', 'CAPTURE-LEGACY-ENV', 'sandbox',
   4900, 'ILS', 'completed', 'REFUND-LEGACY-ENV', 'not_required',
   '2026-10-19T10:00:00Z', '2026-10-19T10:01:00Z', '2026-10-19T09:50:00Z');

-- A non-completed refund on a separate paid order is excluded.
insert into public.commerce_refund_operations (
  id, order_id, entitlement_id, provider_capture_id, provider_environment,
  amount_minor, currency, status, accounting_status, created_at
) values (
  '21000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001', 'CAPTURE-PAID-1', 'sandbox',
  3900, 'ILS', 'provider_pending', 'not_required', '2026-10-19T07:00:00Z'
);

do $$
declare
  report jsonb;
  live_report jsonb;
  empty_report jsonb;
  before_cleanup jsonb;
  after_cleanup jsonb;
  product_gross_minor bigint;
begin
  report := public.commerce_analytics_report_v1(
    '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'sandbox'
  );

  assert report #>> '{period,from}' = '2026-10-19T00:00:00.000000Z';
  assert report #>> '{period,to}' = '2026-10-20T00:00:00.000000Z';
  assert report #>> '{period,interval}' = '[from,to)';
  assert report #>> '{traffic_scope}' = 'all_production';
  assert (report #>> '{audience,visitors}')::integer = 3;
  assert (report #>> '{audience,sessions}')::integer = 1;
  assert (report #>> '{audience,shop_visitors}')::integer = 1;
  assert (report #>> '{audience,product_viewers}')::integer = 1;
  assert (report #>> '{audience,product_views}')::integer = 2;
  assert (report #>> '{audience,interested_visitors}')::integer = 1;
  assert (report #>> '{audience,interest_events}')::integer = 1;
  assert (report #>> '{funnel,entry_points,home_promo}')::integer = 1;
  assert report #>> '{funnel,mode}' = 'independent_counts';
  assert (report #>> '{funnel,conversion_percentages_available}')::boolean = false;

  assert (report #>> '{commerce,checkout_starts}')::integer = 3;
  assert (report #>> '{commerce,paid_orders}')::integer = 3;
  assert (report #>> '{commerce,refunded_orders}')::integer = 3;
  assert (report #>> '{commerce,status_counts,pending_approval}')::integer = 1;
  assert (report #>> '{commerce,status_counts,paid}')::integer = 2;
  assert jsonb_array_length(report #> '{commerce,revenue}') = 1;
  assert report #>> '{commerce,revenue,0,currency}' = 'ILS';
  assert (report #>> '{commerce,revenue,0,gross_minor}')::bigint = 13800;
  assert (report #>> '{commerce,revenue,0,refunded_minor}')::bigint = 19800;
  assert (report #>> '{commerce,revenue,0,net_minor}')::bigint = -6000;

  assert (report #>> '{attribution,checkout_orders}')::integer = 3;
  assert (report #>> '{attribution,attributed_orders}')::integer = 1;
  assert (report #>> '{attribution,unattributed_orders}')::integer = 2;
  assert (report #>> '{attribution,coverage_percent}')::numeric = 33.3;
  assert (report #> '{sources,first_touch}') @> '[{"source":"youtube","utm_source":"youtube","utm_medium":"social","utm_campaign":"launch","currency":"ILS","paid_orders":1,"gross_minor":3900}]'::jsonb;
  assert (report #> '{sources,session_touch}') @> '[{"source":"instagram","utm_source":"instagram","utm_medium":"social","utm_campaign":"retarget","currency":"ILS","paid_orders":1,"gross_minor":3900}]'::jsonb;
  assert (report #> '{sources,first_touch}') @> '[{"source":"Unknown","currency":"ILS","paid_orders":2,"gross_minor":9900}]'::jsonb;

  assert (report #> '{products}') @> '[{"product_id":"sound-case-001","product_views":2,"product_viewers":1,"interest_events":1,"interested_visitors":1,"checkout_starts":2}]'::jsonb;
  assert (report #> '{products}') @> '[{"product_id":"sound-case-bundle-a","paid":[{"currency":"ILS","paid_orders":1,"gross_minor":2000}]}]'::jsonb;
  assert (report #> '{products}') @> '[{"product_id":"sound-case-bundle-b","paid":[{"currency":"ILS","paid_orders":1,"gross_minor":3000}]}]'::jsonb;
  select coalesce(sum((paid_metric ->> 'gross_minor')::bigint), 0)
  into product_gross_minor
  from jsonb_array_elements(report #> '{products}') product_metric
  cross join lateral jsonb_array_elements(product_metric -> 'paid') paid_metric;
  assert product_gross_minor = (report #>> '{commerce,revenue,0,gross_minor}')::bigint;
  assert (report #>> '{data_quality,events_without_visitor_id}')::integer = 1;
  assert (report #>> '{data_quality,legacy_visitor_fallback_events}')::integer = 1;
  assert (report #>> '{data_quality,visitor_identity_conflict_events}')::integer = 1;
  assert (report #>> '{data_quality,paid_orders_without_items}')::integer = 0;
  assert (report #>> '{data_quality,paid_orders_with_item_total_mismatch}')::integer = 0;
  assert (report #>> '{data_quality,paid_orders_with_item_currency_mismatch}')::integer = 0;
  assert (report #>> '{data_quality,unknown_environment_orders}')::integer = 1;
  assert (report #>> '{data_quality,unknown_environment_paid_orders}')::integer = 1;
  assert report #> '{data_quality,unknown_environment_paid_minor}' =
    '[{"currency":"ILS","paid_minor":4900}]'::jsonb;
  assert (report #>> '{data_quality,refund_order_environment_mismatch_count}')::integer = 1;
  assert report #>> '{data_quality,status}' = 'data incomplete';
  assert (report #>> '{commerce,paid_orders}')::integer = 3;
  assert (report #>> '{commerce,revenue,0,gross_minor}')::bigint = 13800;
  assert report::text not like '%sound-case-legacy-environment%';
  assert report::text not like '%private@example.com%';
  assert report::text not like '%Private Buyer%';
  assert report::text not like '%CHECKOUT-PAID-1%';
  assert report::text not like '%CAPTURE-PAID-1%';
  assert report::text not like '%d1000000-0000-4000-8000-000000000001%';

  live_report := public.commerce_analytics_report_v1(
    '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'live'
  );
  assert live_report #>> '{environment}' = 'live';
  assert (live_report #>> '{commerce,checkout_starts}')::integer = 1;
  assert (live_report #>> '{commerce,paid_orders}')::integer = 1;
  assert (live_report #>> '{commerce,revenue,0,gross_minor}')::bigint = 4900;
  assert (live_report #>> '{commerce,revenue,0,refunded_minor}')::bigint = 0;
  assert (live_report #>> '{commerce,revenue,0,net_minor}')::bigint = 4900;
  -- Top-of-funnel remains the same all-Production-site cohort for either commerce environment.
  assert live_report #> '{audience}' = report #> '{audience}';
  assert live_report::text not like '%sound-case-gift%';

  empty_report := public.commerce_analytics_report_v1(
    '2030-01-01T00:00:00Z', '2030-01-02T00:00:00Z', 'sandbox'
  );
  assert (empty_report #>> '{commerce,checkout_starts}')::integer = 0;
  assert (empty_report #>> '{commerce,paid_orders}')::integer = 0;
  assert empty_report #> '{commerce,revenue}' = '[]'::jsonb;
  assert empty_report #> '{products}' = '[]'::jsonb;
  assert empty_report #>> '{attribution,coverage_percent}' is null;
  assert (empty_report #>> '{data_quality,unknown_environment_orders}')::integer = 0;
  assert (empty_report #>> '{data_quality,unknown_environment_paid_orders}')::integer = 0;
  assert empty_report #> '{data_quality,unknown_environment_paid_minor}' = '[]'::jsonb;
  assert (empty_report #>> '{data_quality,refund_order_environment_mismatch_count}')::integer = 0;
  assert empty_report #>> '{data_quality,status}' = 'data ok';

  begin
    perform public.commerce_analytics_report_v1(
      '2026-10-20T00:00:00Z', '2026-10-19T00:00:00Z', 'sandbox'
    );
    assert false, 'invalid range must fail';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.commerce_analytics_report_v1(
      '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'production'
    );
    assert false, 'invalid environment must fail';
  exception when invalid_parameter_value then null;
  end;

  before_cleanup := public.commerce_analytics_report_v1(
    '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'sandbox'
  );
  perform public.cleanup_analytics_events(interval '15 days');
  after_cleanup := public.commerce_analytics_report_v1(
    '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'sandbox'
  );
  assert before_cleanup #> '{commerce}' = after_cleanup #> '{commerce}';
  assert before_cleanup #> '{attribution}' = after_cleanup #> '{attribution}';
  assert not exists (
    select 1 from public.analytics_events where created_at = '2025-01-01T00:00:00Z'
  );
  assert exists (
    select 1 from public.orders where id = 'f1000000-0000-4000-8000-000000000002'
  );
end;
$$;

do $$
begin
  assert to_regclass('public.orders_environment_created_at_idx') is not null;
  assert to_regclass('public.commerce_refunds_completed_environment_idx') is not null;
  assert pg_get_indexdef('public.orders_environment_created_at_idx'::regclass)
    like '%(provider_environment, created_at DESC)%';
  assert pg_get_indexdef('public.commerce_refunds_completed_environment_idx'::regclass)
    like '%(provider_environment, access_revoked_at DESC)%WHERE (status = ''completed''::text)%';
  assert not exists (
    select 1
    from pg_proc function_definition
    cross join lateral aclexplode(coalesce(
      function_definition.proacl,
      acldefault('f', function_definition.proowner)
    )) privilege
    where function_definition.oid = 'public.commerce_analytics_report_v1(timestamptz,timestamptz,text)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  );
  assert not has_function_privilege('anon', 'public.commerce_analytics_report_v1(timestamptz,timestamptz,text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.commerce_analytics_report_v1(timestamptz,timestamptz,text)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.commerce_analytics_report_v1(timestamptz,timestamptz,text)', 'EXECUTE');
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.commerce_analytics_report_v1(
      '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'sandbox'
    );
    assert false, 'anon must not execute commerce analytics';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set local role authenticated;
do $$
begin
  begin
    perform public.commerce_analytics_report_v1(
      '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'sandbox'
    );
    assert false, 'authenticated must not execute commerce analytics';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set local role service_role;
select public.commerce_analytics_report_v1(
  '2026-10-19T00:00:00Z', '2026-10-20T00:00:00Z', 'sandbox'
) is not null as service_role_can_execute;
reset role;

rollback;
