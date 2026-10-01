create table public.product_preorder_offers (
  offer_code text primary key,
  product_id text not null,
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint product_preorder_offers_identity_key unique (offer_code, product_id),
  constraint product_preorder_offers_offer_code_check check (
    char_length(offer_code) between 1 and 120
  ),
  constraint product_preorder_offers_product_id_check check (
    char_length(product_id) between 1 and 120
  ),
  constraint product_preorder_offers_status_check check (
    status in ('open', 'closed')
  ),
  constraint product_preorder_offers_closed_at_check check (
    (status = 'open' and closed_at is null)
    or (status = 'closed' and closed_at is not null)
  )
);

create table public.product_preorders (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  offer_code text not null,
  email_normalized text not null,
  preferred_locale text not null,
  eligible_price_minor integer not null,
  currency text not null,
  signed_up_at timestamptz not null default now(),
  consented_at timestamptz not null default now(),
  consent_version text not null,
  created_at timestamptz not null default now(),
  constraint product_preorders_offer_identity_fkey
    foreign key (offer_code, product_id)
    references public.product_preorder_offers (offer_code, product_id),
  constraint product_preorders_identity_key unique (
    product_id,
    offer_code,
    email_normalized
  ),
  constraint product_preorders_product_id_check check (
    char_length(product_id) between 1 and 120
  ),
  constraint product_preorders_offer_code_check check (
    char_length(offer_code) between 1 and 120
  ),
  constraint product_preorders_email_length_check check (
    char_length(email_normalized) between 3 and 320
  ),
  constraint product_preorders_email_normalized_check check (
    email_normalized = lower(btrim(email_normalized))
  ),
  constraint product_preorders_locale_check check (
    preferred_locale in ('ru', 'en', 'he')
  ),
  constraint product_preorders_price_check check (
    eligible_price_minor > 0
  ),
  constraint product_preorders_currency_check check (
    currency = 'ILS'
  ),
  constraint product_preorders_consent_version_check check (
    char_length(consent_version) between 1 and 120
  )
);

create index product_preorders_product_email_idx
  on public.product_preorders(product_id, email_normalized);

create index product_preorders_offer_signed_up_idx
  on public.product_preorders(offer_code, signed_up_at);

alter table public.product_preorder_offers enable row level security;
alter table public.product_preorders enable row level security;

revoke all on table public.product_preorder_offers from public, anon, authenticated;
revoke all on table public.product_preorders from public, anon, authenticated;

grant select on table public.product_preorder_offers to service_role;
grant update (status, closed_at) on table public.product_preorder_offers to service_role;
grant select, insert on table public.product_preorders to service_role;

insert into public.product_preorder_offers (
  offer_code,
  product_id,
  status,
  opened_at,
  closed_at
)
values (
  'sound-case-001-preorder',
  'sound-case-001',
  'open',
  now(),
  null
);

create or replace function public.register_product_preorder(
  target_product_id text,
  target_offer_code text,
  target_email_normalized text,
  target_preferred_locale text,
  target_eligible_price_minor integer,
  target_currency text,
  target_consent_version text
)
returns table (result text, created boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  preorder_offer public.product_preorder_offers;
  registration_created boolean := false;
begin
  select *
  into preorder_offer
  from public.product_preorder_offers
  where offer_code = target_offer_code
    and product_id = target_product_id
  for update;

  if not found or preorder_offer.status <> 'open' then
    return query select 'closed'::text, false;
    return;
  end if;

  insert into public.product_preorders (
    product_id,
    offer_code,
    email_normalized,
    preferred_locale,
    eligible_price_minor,
    currency,
    signed_up_at,
    consented_at,
    consent_version,
    created_at
  ) values (
    target_product_id,
    target_offer_code,
    target_email_normalized,
    target_preferred_locale,
    target_eligible_price_minor,
    target_currency,
    now(),
    now(),
    target_consent_version,
    now()
  )
  on conflict (product_id, offer_code, email_normalized) do nothing
  returning true into registration_created;

  return query select 'registered'::text, coalesce(registration_created, false);
end;
$$;

revoke execute on function public.register_product_preorder(
  text,
  text,
  text,
  text,
  integer,
  text,
  text
) from public;
revoke execute on function public.register_product_preorder(
  text,
  text,
  text,
  text,
  integer,
  text,
  text
) from anon;
revoke execute on function public.register_product_preorder(
  text,
  text,
  text,
  text,
  integer,
  text,
  text
) from authenticated;
grant execute on function public.register_product_preorder(
  text,
  text,
  text,
  text,
  integer,
  text,
  text
) to service_role;
