create table public.customer_support_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  customer_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  locale text not null,
  category text not null,
  message text not null,
  order_reference text,
  order_id uuid references public.orders(id) on delete set null,
  product_title text,
  status text not null default 'new',
  notification_status text not null default 'pending',
  notification_attempts integer not null default 0,
  notification_claimed_at timestamptz,
  notification_accepted_at timestamptz,
  notification_provider_id text,
  notification_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_support_email_check check (char_length(email) between 3 and 320),
  constraint customer_support_locale_check check (locale in ('ru', 'en', 'he')),
  constraint customer_support_category_check check (category in ('refund', 'payment', 'technical', 'question', 'other')),
  constraint customer_support_message_check check (char_length(message) between 10 and 4000),
  constraint customer_support_order_reference_check check (order_reference is null or char_length(order_reference) between 1 and 80),
  constraint customer_support_status_check check (status in ('new', 'in_progress', 'resolved')),
  constraint customer_support_notification_status_check check (notification_status in ('pending', 'sending', 'accepted', 'failed', 'uncertain')),
  constraint customer_support_attempts_check check (notification_attempts >= 0)
);

create index customer_support_status_created_idx on public.customer_support_requests(status, created_at desc);
create index customer_support_notification_recovery_idx on public.customer_support_requests(notification_status, created_at)
  where notification_status in ('pending', 'failed', 'sending');

alter table public.customer_support_requests enable row level security;
revoke all on public.customer_support_requests from public, anon, authenticated;
grant select, insert, update on public.customer_support_requests to service_role;

create trigger customer_support_requests_set_updated_at
  before update on public.customer_support_requests
  for each row execute function public.set_customer_record_updated_at();
