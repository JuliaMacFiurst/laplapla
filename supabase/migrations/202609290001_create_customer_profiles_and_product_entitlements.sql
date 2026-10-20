create extension if not exists "pgcrypto";

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  source text not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_entitlements_product_id_check check (
    char_length(product_id) between 1 and 120
  ),
  constraint product_entitlements_source_check check (
    source in ('laplapla_web', 'etsy', 'google_play', 'gift', 'promo')
  ),
  constraint product_entitlements_status_check check (
    status in ('active', 'inactive', 'revoked', 'refunded', 'expired')
  ),
  constraint product_entitlements_user_product_source_key unique (
    user_id,
    product_id,
    source
  )
);

create index if not exists product_entitlements_user_status_idx
  on public.product_entitlements(user_id, status);

create index if not exists product_entitlements_user_product_status_idx
  on public.product_entitlements(user_id, product_id, status);

alter table public.customer_profiles enable row level security;
alter table public.product_entitlements enable row level security;

revoke all on table public.customer_profiles from anon, authenticated;
revoke all on table public.product_entitlements from anon, authenticated;

grant select on table public.customer_profiles to authenticated;
grant select on table public.product_entitlements to authenticated;
grant select, insert, update, delete on table public.customer_profiles to service_role;
grant select, insert, update, delete on table public.product_entitlements to service_role;

create policy "Customers can read their own profile"
  on public.customer_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Customers can read their own entitlements"
  on public.product_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_customer_record_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customer_profiles_set_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_customer_record_updated_at();

create trigger product_entitlements_set_updated_at
  before update on public.product_entitlements
  for each row execute function public.set_customer_record_updated_at();

create or replace function public.create_customer_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.customer_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_customer_profile_after_auth_signup on auth.users;
create trigger create_customer_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_customer_profile_for_auth_user();

insert into public.customer_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.grant_product_entitlement(
  target_user_id uuid,
  target_product_id text,
  entitlement_source text default 'promo'
)
returns public.product_entitlements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  granted_entitlement public.product_entitlements;
begin
  if target_product_id is null or char_length(target_product_id) not between 1 and 120 then
    raise exception 'A valid product id is required';
  end if;

  if entitlement_source not in ('laplapla_web', 'etsy', 'google_play', 'gift', 'promo') then
    raise exception 'Unsupported entitlement source';
  end if;

  insert into public.product_entitlements (
    user_id,
    product_id,
    source,
    status,
    granted_at
  )
  values (
    target_user_id,
    target_product_id,
    entitlement_source,
    'active',
    now()
  )
  on conflict (user_id, product_id, source)
  do update set
    status = 'active',
    granted_at = now(),
    updated_at = now()
  returning * into granted_entitlement;

  return granted_entitlement;
end;
$$;

revoke all on function public.set_customer_record_updated_at() from public, anon, authenticated;
revoke all on function public.create_customer_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.grant_product_entitlement(uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_product_entitlement(uuid, text, text) to service_role;
