-- A claim is made before the webhook call. A timed-out call is never retried
-- automatically, because Discord may already have accepted the message.
alter table public.customer_support_requests
  add column discord_created_claimed_at timestamptz,
  add column discord_created_delivery_status text,
  add column discord_review_claimed_at timestamptz,
  add column discord_review_delivery_status text,
  add constraint customer_support_discord_created_status_check
    check (discord_created_delivery_status is null or discord_created_delivery_status in ('claimed', 'sent', 'failed', 'uncertain')),
  add constraint customer_support_discord_review_status_check
    check (discord_review_delivery_status is null or discord_review_delivery_status in ('claimed', 'sent', 'failed', 'uncertain'));
