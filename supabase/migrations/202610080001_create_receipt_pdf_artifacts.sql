create table public.receipt_artifacts (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete restrict,
  artifact_type text not null default 'receipt_pdf' check (artifact_type = 'receipt_pdf'),
  document_copy text not null check (document_copy in ('original', 'copy')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  storage_bucket text not null check (char_length(storage_bucket) between 1 and 100),
  storage_key text not null check (char_length(storage_key) between 1 and 500),
  content_type text null check (content_type is null or content_type = 'application/pdf'),
  byte_size bigint null check (byte_size is null or byte_size > 0),
  sha256 text null check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  template_version text not null check (char_length(template_version) between 1 and 100),
  generated_at timestamptz null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_token uuid null,
  lease_expires_at timestamptz null,
  last_failure_code text null check (last_failure_code is null or char_length(last_failure_code) between 1 and 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (receipt_id, artifact_type, document_copy),
  unique (storage_bucket, storage_key),
  check (
    (status = 'ready' and content_type = 'application/pdf' and byte_size is not null and sha256 is not null
      and generated_at is not null and lease_token is null and lease_expires_at is null)
    or status <> 'ready'
  ),
  check (
    (status = 'processing' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'processing' and lease_token is null and lease_expires_at is null)
  )
);

create index receipt_artifacts_recovery_idx
  on public.receipt_artifacts (status, updated_at)
  where status <> 'ready';

alter table public.receipt_artifacts enable row level security;
revoke all on table public.receipt_artifacts from public, anon, authenticated;
grant select on table public.receipt_artifacts to service_role;

create function public.enforce_receipt_artifact_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Receipt artifacts cannot be deleted';
  end if;
  if old.status = 'ready' then
    raise exception 'Ready receipt artifacts are immutable';
  end if;
  if new.receipt_id is distinct from old.receipt_id
    or new.artifact_type is distinct from old.artifact_type
    or new.document_copy is distinct from old.document_copy
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_key is distinct from old.storage_key
    or new.template_version is distinct from old.template_version
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Receipt artifact identity is immutable';
  end if;
  return new;
end;
$$;

create trigger enforce_receipt_artifact_integrity_before_update
  before update on public.receipt_artifacts
  for each row execute function public.enforce_receipt_artifact_integrity();
create trigger enforce_receipt_artifact_integrity_before_delete
  before delete on public.receipt_artifacts
  for each row execute function public.enforce_receipt_artifact_integrity();

create function public.claim_receipt_pdf_artifact(
  target_receipt_id uuid,
  target_document_copy text,
  target_storage_bucket text,
  target_template_version text,
  target_lease_seconds integer default 300
)
returns table (
  result text,
  artifact_id uuid,
  claim_token uuid,
  storage_bucket text,
  storage_key text,
  existing_sha256 text,
  existing_byte_size bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_receipt public.receipts;
  target_artifact public.receipt_artifacts;
  new_artifact_id uuid;
begin
  if target_document_copy not in ('original', 'copy')
    or target_storage_bucket is null or char_length(target_storage_bucket) not between 1 and 100
    or target_template_version is null or char_length(target_template_version) not between 1 and 100
    or target_lease_seconds not between 30 and 900
  then
    raise exception 'Invalid receipt artifact claim parameters';
  end if;

  select * into target_receipt from public.receipts where id = target_receipt_id;
  if not found then
    return query select 'receipt_not_found'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::bigint;
    return;
  end if;

  new_artifact_id := gen_random_uuid();
  insert into public.receipt_artifacts (
    id, receipt_id, document_copy, storage_bucket, storage_key, template_version
  ) values (
    new_artifact_id, target_receipt_id, target_document_copy, target_storage_bucket,
    'receipts/' || target_receipt_id::text || '/' || target_document_copy || '/' || new_artifact_id::text || '.pdf',
    target_template_version
  ) on conflict (receipt_id, artifact_type, document_copy) do nothing;

  select * into target_artifact from public.receipt_artifacts
    where receipt_id = target_receipt_id and artifact_type = 'receipt_pdf' and document_copy = target_document_copy
    for update;

  if target_artifact.status = 'ready' then
    return query select 'ready'::text, target_artifact.id, null::uuid, target_artifact.storage_bucket,
      target_artifact.storage_key, target_artifact.sha256, target_artifact.byte_size;
    return;
  end if;
  if target_artifact.template_version <> target_template_version or target_artifact.storage_bucket <> target_storage_bucket then
    return query select 'configuration_mismatch'::text, target_artifact.id, null::uuid,
      target_artifact.storage_bucket, target_artifact.storage_key, null::text, null::bigint;
    return;
  end if;
  if target_artifact.status = 'processing' and target_artifact.lease_expires_at > timezone('utc', now()) then
    return query select 'processing'::text, target_artifact.id, null::uuid, target_artifact.storage_bucket,
      target_artifact.storage_key, null::text, null::bigint;
    return;
  end if;

  update public.receipt_artifacts set
    status = 'processing', attempt_count = attempt_count + 1,
    lease_token = gen_random_uuid(), lease_expires_at = timezone('utc', now()) + make_interval(secs => target_lease_seconds),
    last_failure_code = null, updated_at = timezone('utc', now())
  where id = target_artifact.id
  returning * into target_artifact;

  return query select 'claimed'::text, target_artifact.id, target_artifact.lease_token,
    target_artifact.storage_bucket, target_artifact.storage_key, target_artifact.sha256, target_artifact.byte_size;
end;
$$;

create function public.stage_receipt_pdf_artifact(
  target_artifact_id uuid,
  target_claim_token uuid,
  target_byte_size bigint,
  target_sha256 text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_byte_size <= 0 or target_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid staged receipt artifact metadata';
  end if;
  update public.receipt_artifacts set
    content_type = 'application/pdf', byte_size = target_byte_size, sha256 = target_sha256,
    updated_at = timezone('utc', now())
  where id = target_artifact_id and status = 'processing' and lease_token = target_claim_token;
  return case when found then 'staged' else 'not_processing' end;
end;
$$;

create function public.complete_receipt_pdf_artifact(
  target_artifact_id uuid,
  target_claim_token uuid,
  target_content_type text,
  target_byte_size bigint,
  target_sha256 text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_content_type <> 'application/pdf' or target_byte_size <= 0 or target_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid receipt artifact metadata';
  end if;
  update public.receipt_artifacts set
    status = 'ready', generated_at = timezone('utc', now()),
    lease_token = null, lease_expires_at = null, last_failure_code = null,
    updated_at = timezone('utc', now())
  where id = target_artifact_id and status = 'processing' and lease_token = target_claim_token
    and content_type = target_content_type and byte_size = target_byte_size and sha256 = target_sha256;
  return case when found then 'ready' else 'not_processing' end;
end;
$$;

create function public.fail_receipt_pdf_artifact(
  target_artifact_id uuid,
  target_claim_token uuid,
  target_failure_code text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_failure_code is null or char_length(target_failure_code) not between 1 and 120 then
    raise exception 'A safe failure code is required';
  end if;
  update public.receipt_artifacts set
    status = 'failed', lease_token = null, lease_expires_at = null,
    last_failure_code = target_failure_code, updated_at = timezone('utc', now())
  where id = target_artifact_id and status = 'processing' and lease_token = target_claim_token;
  return case when found then 'failed' else 'not_processing' end;
end;
$$;

create function public.list_receipt_artifact_recovery_candidates(target_limit integer default 25)
returns table (receipt_id uuid)
language sql
security definer
set search_path = public, pg_temp
as $$
  select receipt.id
  from public.receipts receipt
  where receipt.provider_environment = 'live'
    and exists (select 1 from public.receipt_series series where series.id = receipt.series_id and series.environment = 'live')
    and exists (
      select 1 from (values ('original'::text), ('copy'::text)) required(document_copy)
      left join public.receipt_artifacts artifact
        on artifact.receipt_id = receipt.id and artifact.artifact_type = 'receipt_pdf'
          and artifact.document_copy = required.document_copy
      where artifact.id is null or artifact.status in ('pending', 'failed')
        or (artifact.status = 'processing' and artifact.lease_expires_at <= timezone('utc', now()))
    )
  order by receipt.issued_at asc, receipt.id asc
  limit least(greatest(coalesce(target_limit, 25), 1), 25);
$$;

revoke all on function public.enforce_receipt_artifact_integrity() from public, anon, authenticated, service_role;
revoke all on function public.claim_receipt_pdf_artifact(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.stage_receipt_pdf_artifact(uuid, uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.complete_receipt_pdf_artifact(uuid, uuid, text, bigint, text) from public, anon, authenticated;
revoke all on function public.fail_receipt_pdf_artifact(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.list_receipt_artifact_recovery_candidates(integer) from public, anon, authenticated;
grant execute on function public.claim_receipt_pdf_artifact(uuid, text, text, text, integer) to service_role;
grant execute on function public.stage_receipt_pdf_artifact(uuid, uuid, bigint, text) to service_role;
grant execute on function public.complete_receipt_pdf_artifact(uuid, uuid, text, bigint, text) to service_role;
grant execute on function public.fail_receipt_pdf_artifact(uuid, uuid, text) to service_role;
grant execute on function public.list_receipt_artifact_recovery_candidates(integer) to service_role;
