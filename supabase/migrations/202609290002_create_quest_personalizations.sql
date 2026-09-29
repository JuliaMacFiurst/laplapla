alter table public.product_entitlements
  add constraint product_entitlements_identity_key
  unique (id, user_id, product_id);

create table public.quest_personalizations (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quest_personalizations_entitlement_key unique (entitlement_id),
  constraint quest_personalizations_entitlement_identity_fkey
    foreign key (entitlement_id, user_id, product_id)
    references public.product_entitlements (id, user_id, product_id)
    on delete cascade,
  constraint quest_personalizations_product_id_check check (
    char_length(product_id) between 1 and 120
  ),
  constraint quest_personalizations_payload_object_check check (
    jsonb_typeof(payload) = 'object'
  ),
  constraint quest_personalizations_payload_size_check check (
    octet_length(payload::text) <= 4096
  )
);

create index quest_personalizations_user_product_idx
  on public.quest_personalizations(user_id, product_id);

alter table public.quest_personalizations enable row level security;

revoke all on table public.quest_personalizations from anon, authenticated;
grant select on table public.quest_personalizations to authenticated;
grant select, insert, update, delete on table public.quest_personalizations to service_role;

create policy "Customers can read their own quest personalization"
  on public.quest_personalizations
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.product_entitlements entitlement
      where entitlement.id = quest_personalizations.entitlement_id
        and entitlement.user_id = (select auth.uid())
        and entitlement.product_id = quest_personalizations.product_id
        and entitlement.status = 'active'
    )
  );

create or replace function public.enforce_active_quest_personalization_entitlement()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform 1
  from public.product_entitlements entitlement
  where entitlement.id = new.entitlement_id
    and entitlement.user_id = new.user_id
    and entitlement.product_id = new.product_id
    and entitlement.status = 'active'
  for update;

  if not found then
    raise exception 'An active matching entitlement is required'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_active_quest_personalization_entitlement()
  from public, anon, authenticated;
grant execute on function public.enforce_active_quest_personalization_entitlement()
  to service_role;

create trigger quest_personalizations_require_active_entitlement
  before insert or update on public.quest_personalizations
  for each row execute function public.enforce_active_quest_personalization_entitlement();

create trigger quest_personalizations_set_updated_at
  before update on public.quest_personalizations
  for each row execute function public.set_customer_record_updated_at();
