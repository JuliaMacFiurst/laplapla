# LapLapLa security release checklist

This checklist records external controls that cannot be proven from the repository.
Do not paste secret values into this file, issues, logs, or screenshots.

## Supabase

- Confirm RLS is enabled for every table exposed through the Data API.
- Confirm `anon` and `authenticated` have no insert, update, or delete access to:
  `map_stories`, `map_story_slides`, `cat_presets`, `cat_preset_slides`,
  `content_translations`, `meme_cache`, `meme_search_cache`,
  `meme_trending`, `analytics_events`, and `analytics_daily_summary`.
- Apply `202607290001_lock_analytics_writes_to_server.sql` after reviewing the
  production policy diff. The web client writes analytics through
  `/api/analytics/event`.
- Inventory all Storage buckets. Public asset buckets may remain public-read,
  but anonymous upload, update, and delete must be disabled.
- Verify `map-data`, `lessons`, `quests`, and `flags-svg` policies explicitly.
- Confirm the service-role key exists only in server-side Vercel environments.

## Vercel and distributed rate limiting

- Create or select an Upstash Redis database.
- Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as
  server-only Production and Preview variables.
- Do not expose either value with a `NEXT_PUBLIC_` prefix.
- Redeploy and verify `X-RateLimit-*`, `Retry-After`, and HTTP 429 on an
  intentionally low-limit test endpoint or preview deployment.
- Keep Vercel Firewall rules for volumetric abuse in front of the application.

## Secrets

- Rotate any secret that was ever committed, shared in logs, or copied into a
  client-visible environment variable.
- Review Supabase service role, OpenAI, Gemini, Pexels, Giphy, Pixabay, Discord,
  cron, Sentry webhook, Sentry auth, and R2 credentials in Vercel.
- Confirm Preview deployments do not inherit production write credentials
  unless that access is intentional.

## Sentry

- Keep `sendDefaultPii` disabled.
- Verify server and browser events do not contain Authorization, cookies,
  OAuth fragments, request bodies, email addresses, or secret query params.
- Configure Sentry server-side data scrubbing as a second line of defense.
