create extension if not exists "pgcrypto";

create table if not exists public.meme_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_id text not null,
  type text not null,
  preview_url text,
  media_url text not null,
  width int,
  height int,
  duration numeric,
  tags text[],
  nsfw boolean default false,
  source_url text,
  author text,
  popularity numeric default 0,
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz,
  unique(provider, provider_id)
);

create table if not exists public.meme_search_cache (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  lang text not null,
  provider_filter text[],
  type_filter text[],
  result_ids uuid[],
  created_at timestamptz default now(),
  expires_at timestamptz,
  unique(query, lang, provider_filter, type_filter)
);

create table if not exists public.meme_trending (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  media_id uuid references public.meme_cache(id) on delete cascade,
  rank int,
  score numeric,
  created_at timestamptz default now(),
  expires_at timestamptz,
  unique(category, media_id)
);

alter table public.meme_cache enable row level security;
alter table public.meme_search_cache enable row level security;
alter table public.meme_trending enable row level security;

create index if not exists meme_cache_provider_type_idx
  on public.meme_cache(provider, type);

create index if not exists meme_cache_expires_at_idx
  on public.meme_cache(expires_at);

create index if not exists meme_cache_tags_idx
  on public.meme_cache using gin(tags);

create index if not exists meme_search_cache_lookup_idx
  on public.meme_search_cache(query, lang, expires_at);

create index if not exists meme_trending_category_rank_idx
  on public.meme_trending(category, rank);

create index if not exists meme_trending_expires_at_idx
  on public.meme_trending(expires_at);
