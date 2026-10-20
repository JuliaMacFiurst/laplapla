-- Apply only after review. The row is the evidence for both affirmative checkboxes
-- shown before the PayPal order is created; the verified receipt email is retained
-- in the linked immutable order customer snapshot, not duplicated here.
create table public.checkout_consents (
  order_id uuid primary key references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  locale text not null check (locale in ('ru', 'en', 'he')),
  terms_of_sale_version text not null check (char_length(terms_of_sale_version) between 1 and 80),
  refund_policy_version text not null check (char_length(refund_policy_version) between 1 and 80),
  printable_license_version text not null check (char_length(printable_license_version) between 1 and 80),
  electronic_receipt_consent_version text not null check (char_length(electronic_receipt_consent_version) between 1 and 80),
  accepted_at timestamptz not null default now()
);

create index checkout_consents_user_accepted_idx on public.checkout_consents (user_id, accepted_at desc);
alter table public.checkout_consents enable row level security;
revoke all on public.checkout_consents from public, anon, authenticated;
grant select, insert on public.checkout_consents to service_role;

create function public.enforce_checkout_consent_integrity()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare linked_order public.orders;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Checkout consent evidence is immutable';
  end if;
  select * into linked_order from public.orders where id = new.order_id for update;
  if linked_order.id is null or linked_order.user_id <> new.user_id
    or linked_order.status not in ('creating', 'pending_approval') then
    raise exception 'Checkout consent must precede payment for the same customer';
  end if;
  return new;
end;
$$;

create trigger checkout_consents_enforce_integrity
  before insert or update or delete on public.checkout_consents
  for each row execute function public.enforce_checkout_consent_integrity();
revoke all on function public.enforce_checkout_consent_integrity() from public, anon, authenticated, service_role;

-- One provider attempt for the original. An ambiguous result is reviewed by a
-- person; the 24-hour Resend idempotency window is not an indefinite guarantee.
create table public.receipt_original_deliveries (
  receipt_id uuid primary key references public.receipts(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'sending', 'accepted', 'failed', 'uncertain')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 1),
  claim_token uuid,
  claimed_at timestamptz,
  provider_email_id text,
  accepted_at timestamptz,
  error_code text,
  updated_at timestamptz not null default now(),
  constraint receipt_original_delivery_state_check check (
    (status = 'pending' and attempt_count = 0 and claim_token is null and claimed_at is null)
    or (status = 'sending' and attempt_count = 1 and claim_token is not null and claimed_at is not null)
    or (status in ('accepted', 'failed', 'uncertain') and attempt_count = 1 and claim_token is not null and claimed_at is not null)
  ),
  constraint receipt_original_delivery_accepted_check check (
    status <> 'accepted' or (provider_email_id is not null and accepted_at is not null)
  )
);

create index receipt_original_delivery_review_idx on public.receipt_original_deliveries (status, updated_at);
alter table public.receipt_original_deliveries enable row level security;
revoke all on public.receipt_original_deliveries from public, anon, authenticated;
grant select, insert, update on public.receipt_original_deliveries to service_role;

create function public.enforce_receipt_original_delivery_integrity()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then raise exception 'Receipt delivery evidence cannot be deleted'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.attempt_count <> 0 then
      raise exception 'Receipt delivery must begin pending';
    end if;
    return new;
  end if;
  if new.receipt_id <> old.receipt_id or new.attempt_count < old.attempt_count then
    raise exception 'Receipt delivery identity and attempts are immutable';
  end if;
  if old.status = 'pending' and new.status = 'sending' and new.attempt_count = 1 then return new; end if;
  if old.status = 'sending' and new.status in ('accepted', 'failed', 'uncertain')
    and new.attempt_count = 1 and new.claim_token = old.claim_token
    and new.claimed_at = old.claimed_at then return new; end if;
  raise exception 'Invalid receipt original delivery transition';
end;
$$;

create trigger receipt_original_deliveries_enforce_integrity
  before insert or update or delete on public.receipt_original_deliveries
  for each row execute function public.enforce_receipt_original_delivery_integrity();
revoke all on function public.enforce_receipt_original_delivery_integrity() from public, anon, authenticated, service_role;

create function public.list_receipt_original_delivery_candidates(target_limit integer default 3)
returns table (receipt_id uuid)
language sql security definer set search_path = public, pg_temp as $$
  select r.id
  from public.receipts r
  join public.checkout_consents c on c.order_id = r.order_id
  join public.receipt_artifacts a on a.receipt_id = r.id
    and a.artifact_type = 'receipt_pdf' and a.document_copy = 'original' and a.status = 'ready'
  left join public.receipt_original_deliveries d on d.receipt_id = r.id
  where r.document_type = 'receipt'
    and (d.receipt_id is null or (d.status = 'pending' and d.attempt_count = 0))
  order by r.issued_at, r.id
  limit least(greatest(target_limit, 1), 3);
$$;
revoke all on function public.list_receipt_original_delivery_candidates(integer) from public, anon, authenticated;
grant execute on function public.list_receipt_original_delivery_candidates(integer) to service_role;
