\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values ('91919191-9191-4191-8191-919191919191');

insert into public.orders (
  id, user_id, provider, status, currency, total_minor,
  checkout_idempotency_key, paypal_create_request_id, paypal_capture_request_id,
  customer_name_snapshot, customer_email_snapshot, provider_environment
) values (
  '92929292-9292-4292-8292-929292929292',
  '91919191-9191-4191-8191-919191919191',
  'paypal', 'creating', 'ILS', 4900,
  '93939393-9393-4393-8393-939393939393',
  '94949494-9494-4494-8494-949494949494',
  '95959595-9595-4595-8595-959595959595',
  'Attribution Test', 'attribution-test@example.com', 'sandbox'
);

do $$
declare
  first_snapshot jsonb := '{
    "version": 1,
    "visitor_id": "11111111-1111-4111-8111-111111111111",
    "session_id": "22222222-2222-4222-8222-222222222222",
    "first_touch": {
      "utm_source": "youtube", "utm_medium": "social", "utm_campaign": "launch",
      "utm_content": "video-1", "utm_term": null,
      "external_referrer": "https://youtube.com/watch", "landing_pathname": "/shop",
      "attributed_at": "2026-10-19T10:00:00.000Z", "source": "youtube", "channel": "social"
    },
    "session_touch": {
      "utm_source": null, "utm_medium": null, "utm_campaign": null,
      "utm_content": null, "utm_term": null, "external_referrer": null,
      "landing_pathname": "/shop/sound-case-001/checkout",
      "attributed_at": "2026-10-19T10:05:00.000Z", "source": "direct", "channel": "direct"
    }
  }'::jsonb;
  retry_snapshot jsonb;
  attached jsonb;
begin
  retry_snapshot := jsonb_set(first_snapshot, '{first_touch,utm_campaign}', '"changed-on-retry"'::jsonb);

  assert not exists (
    select 1
    from pg_proc function_definition
    cross join lateral aclexplode(coalesce(
      function_definition.proacl,
      acldefault('f', function_definition.proowner)
    )) privilege
    where function_definition.oid = 'public.attach_commerce_order_attribution_once(uuid,uuid,jsonb)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  );
  assert not has_function_privilege('anon', 'public.attach_commerce_order_attribution_once(uuid,uuid,jsonb)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.attach_commerce_order_attribution_once(uuid,uuid,jsonb)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.attach_commerce_order_attribution_once(uuid,uuid,jsonb)', 'EXECUTE');

  assert (select attribution_snapshot is null from public.orders where id = '92929292-9292-4292-8292-929292929292');

  attached := public.attach_commerce_order_attribution_once(
    '92929292-9292-4292-8292-929292929292',
    '91919191-9191-4191-8191-919191919191',
    first_snapshot
  );
  assert attached = first_snapshot;

  attached := public.attach_commerce_order_attribution_once(
    '92929292-9292-4292-8292-929292929292',
    '91919191-9191-4191-8191-919191919191',
    retry_snapshot
  );
  assert attached = first_snapshot, 'retry/resume must return the original attribution snapshot';
  assert (select attribution_snapshot = first_snapshot from public.orders where id = '92929292-9292-4292-8292-929292929292');

  begin
    update public.orders set attribution_snapshot = retry_snapshot
    where id = '92929292-9292-4292-8292-929292929292';
    assert false, 'direct attribution overwrite should fail';
  exception when others then
    assert sqlerrm = 'Order attribution snapshot cannot be changed';
  end;
end;
$$;

rollback;
