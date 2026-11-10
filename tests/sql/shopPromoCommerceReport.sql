\set ON_ERROR_STOP on
begin;

insert into public.analytics_events(event_name, entity_type, entity_id, content_id,
  anonymous_user_id, session_id, entry_point, created_at, properties)
values
  ('shop_promo_impression', 'shop_product', 'sound-case-001', 'sound-case-001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'home_promo', '2027-01-01T10:00:00Z', '{}'::jsonb),
  ('shop_promo_impression', 'shop_product', 'sound-case-001', 'sound-case-001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'home_promo', '2027-01-01T10:01:00Z', '{}'::jsonb),
  ('shop_promo_click', 'shop_product', 'sound-case-001', 'sound-case-001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'home_promo', '2027-01-01T10:02:00Z', '{}'::jsonb),
  ('shop_promo_click', 'shop_product', 'sound-case-001', 'sound-case-001',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'home_promo', '2027-01-01T10:03:00Z', '{}'::jsonb),
  ('shop_promo_impression', 'shop_product', 'other-product', 'other-product',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'home_promo', '2027-01-01T10:04:00Z', '{}'::jsonb),
  ('product_interest', 'shop_product', 'sound-case-001', 'sound-case-001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'home_promo', '2027-01-01T10:05:00Z',
    '{"product_id":"sound-case-001","content_slug":"sound-case-001","language":"en","entry_point":"home_promo","destination":"checkout"}'::jsonb),
  ('shop_promo_click', 'shop_product', 'sound-case-001', 'sound-case-001',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'home_promo', '2027-01-02T00:00:00Z', '{}'::jsonb);

do $$
declare report jsonb; live_report jsonb; promo jsonb;
begin
  assert to_regprocedure('public.shop_conversion_funnel_v1(timestamptz,timestamptz,text,text)') is null;
  assert not has_function_privilege('anon', 'public.commerce_analytics_report_v1(timestamptz,timestamptz,text)', 'EXECUTE');
  report := public.commerce_analytics_report_v1('2027-01-01T00:00:00Z', '2027-01-02T00:00:00Z', 'sandbox');
  live_report := public.commerce_analytics_report_v1('2027-01-01T00:00:00Z', '2027-01-02T00:00:00Z', 'live');
  assert report #> '{promotions}' = live_report #> '{promotions}';
  assert jsonb_array_length(report -> 'promotions') = 2;
  select value into promo from jsonb_array_elements(report -> 'promotions')
    where value ->> 'product_id' = 'sound-case-001';
  assert promo ->> 'impressions' = '2';
  assert promo ->> 'impression_visitors' = '1';
  assert promo ->> 'impression_sessions' = '1';
  assert promo ->> 'clicks' = '2';
  assert promo ->> 'click_visitors' = '2';
  assert promo ->> 'click_sessions' = '2';
  assert report #>> '{funnel,entry_points,home_promo}' = '1';
  assert report #>> '{funnel,mode}' = 'independent_counts';
  assert report #>> '{funnel,conversion_percentages_available}' = 'false';
  assert report #>> '{commerce,paid_orders}' = '0';
  assert report #>> '{commerce,checkout_starts}' = '0';
  assert report #>> '{data_quality,traffic_environment_segmented}' = 'false';
end;
$$;
rollback;
