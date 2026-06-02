create or replace function public.cleanup_meme_engine_cache(
  p_max_age interval default interval '6 hours',
  p_keep_per_provider integer default 200
)
returns table (
  deleted_search_cache integer,
  deleted_trending integer,
  deleted_media_expired integer,
  deleted_media_overflow integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search_count integer := 0;
  v_trending_count integer := 0;
  v_expired_count integer := 0;
  v_overflow_count integer := 0;
begin
  delete from public.meme_search_cache
  where (expires_at is not null and expires_at < now())
    or created_at < now() - p_max_age;
  get diagnostics v_search_count = row_count;

  delete from public.meme_trending
  where (expires_at is not null and expires_at < now())
    or created_at < now() - p_max_age;
  get diagnostics v_trending_count = row_count;

  delete from public.meme_cache
  where (expires_at is not null and expires_at < now())
    or coalesce(updated_at, created_at) < now() - p_max_age;
  get diagnostics v_expired_count = row_count;

  if p_keep_per_provider is not null and p_keep_per_provider > 0 then
    with ranked_media as (
      select
        id,
        row_number() over (
          partition by provider
          order by updated_at desc nulls last, created_at desc nulls last, id desc
        ) as provider_rank
      from public.meme_cache
    )
    delete from public.meme_cache
    using ranked_media
    where public.meme_cache.id = ranked_media.id
      and ranked_media.provider_rank > p_keep_per_provider;
    get diagnostics v_overflow_count = row_count;
  end if;

  return query select
    v_search_count,
    v_trending_count,
    v_expired_count,
    v_overflow_count;
end;
$$;

revoke all on function public.cleanup_meme_engine_cache(interval, integer) from public;
grant execute on function public.cleanup_meme_engine_cache(interval, integer) to service_role;
