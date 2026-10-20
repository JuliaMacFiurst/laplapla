create or replace function public.enforce_payment_provider_event_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if row(
    new.provider,
    new.provider_event_id,
    new.event_type,
    new.transmission_id,
    new.provider_order_id,
    new.provider_capture_id,
    new.payload_hash,
    new.received_at
  ) is distinct from row(
    old.provider,
    old.provider_event_id,
    old.event_type,
    old.transmission_id,
    old.provider_order_id,
    old.provider_capture_id,
    old.payload_hash,
    old.received_at
  ) then
    raise exception 'Immutable provider event fields cannot be changed';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'processing' and new.status in ('processed', 'failed', 'ignored'))
    or (old.status = 'failed' and new.status = 'processing')
  ) then
    raise exception 'Invalid provider event status transition: % -> %', old.status, new.status;
  end if;

  if new.attempt_count <> old.attempt_count and not (
    (
      old.status = 'failed'
      and new.status = 'processing'
      and new.attempt_count = old.attempt_count + 1
    )
    or (
      old.status = 'processing'
      and new.status = 'processing'
      and old.updated_at <= now() - interval '5 minutes'
      and new.attempt_count = old.attempt_count + 1
    )
  ) then
    raise exception 'Invalid provider event attempt count';
  end if;

  return new;
end;
$$;

create or replace function public.claim_payment_provider_event(
  target_provider text,
  target_provider_event_id text,
  target_event_type text,
  target_transmission_id text,
  target_provider_order_id text,
  target_provider_capture_id text,
  target_payload_hash text
)
returns table (
  event_id uuid,
  claim_status text,
  claimed boolean,
  duplicate boolean,
  event_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  provider_event public.payment_provider_events;
begin
  if target_provider <> 'paypal' then
    raise exception 'Unsupported payment provider';
  end if;

  insert into public.payment_provider_events (
    provider,
    provider_event_id,
    event_type,
    transmission_id,
    provider_order_id,
    provider_capture_id,
    payload_hash,
    status
  ) values (
    target_provider,
    target_provider_event_id,
    target_event_type,
    target_transmission_id,
    target_provider_order_id,
    target_provider_capture_id,
    target_payload_hash,
    'processing'
  )
  on conflict (provider, provider_event_id) do nothing
  returning * into provider_event;

  if found then
    return query select provider_event.id, 'claimed'::text, true, false, provider_event.status;
    return;
  end if;

  select *
  into provider_event
  from public.payment_provider_events
  where provider = target_provider
    and provider_event_id = target_provider_event_id
  for update;

  if provider_event.event_type <> target_event_type
    or provider_event.payload_hash <> target_payload_hash
    or provider_event.provider_order_id is distinct from target_provider_order_id
    or provider_event.provider_capture_id is distinct from target_provider_capture_id then
    return query select provider_event.id, 'conflict'::text, false, true, provider_event.status;
    return;
  end if;

  if provider_event.status = 'failed'
    or (
      provider_event.status = 'processing'
      and provider_event.updated_at <= now() - interval '5 minutes'
    ) then
    update public.payment_provider_events
    set status = 'processing',
        attempt_count = attempt_count + 1,
        failure_code = null,
        processed_at = null
    where id = provider_event.id
    returning * into provider_event;

    return query select provider_event.id, 'retry_claimed'::text, true, true, provider_event.status;
    return;
  end if;

  return query select provider_event.id, 'duplicate'::text, false, true, provider_event.status;
end;
$$;

revoke all on function public.enforce_payment_provider_event_integrity()
  from public, anon, authenticated;

revoke all on function public.claim_payment_provider_event(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_payment_provider_event(text, text, text, text, text, text, text)
  to service_role;
