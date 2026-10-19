alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

-- Keep this list aligned with lib/analytics/events.ts; regression tests enforce the contract.
alter table public.analytics_events
  add constraint analytics_events_event_name_check check (event_name in (
    'page_view', 'session_start',
    'content_open', 'content_start', 'content_progress', 'content_complete', 'content_exit',
    'language_changed', 'share_clicked', 'external_link_clicked', 'error_seen',
    'studio_open', 'studio_cta_clicked', 'studio_project_created', 'studio_media_added',
    'studio_sticker_added', 'studio_export_started', 'studio_export_completed',
    'studio_export_failed', 'studio_recording_started', 'studio_recording_completed',
    'studio_recording_failed', 'cat_question_opened', 'cat_question_completed',
    'raccoon_map_opened', 'country_opened', 'recipe_opened', 'recipe_steps_viewed',
    'dog_lesson_opened', 'dog_lesson_completed', 'parrot_music_opened',
    'parrot_audio_created', 'bedtime_story_opened', 'bedtime_story_completed',
    'page_viewed', 'story_opened', 'story_completed', 'map_opened', 'video_exported',
    'project_created', 'short_opened', 'story_downloaded', 'shop_view', 'product_view',
    'product_interest', 'preorder_page_view', 'preorder_submit_attempt',
    'preorder_signup_success', 'preorder_signup_failed'
  ));

create index orders_environment_created_at_idx
  on public.orders(provider_environment, created_at desc);

create index commerce_refunds_completed_environment_idx
  on public.commerce_refund_operations(provider_environment, access_revoked_at desc)
  where status = 'completed';

create or replace function public.commerce_analytics_report_v1(
  p_from timestamptz,
  p_to timestamptz,
  p_environment text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_report jsonb;
begin
  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'A valid half-open report period is required'
      using errcode = '22023';
  end if;
  if p_environment is null or p_environment not in ('live', 'sandbox') then
    raise exception 'Unsupported commerce environment'
      using errcode = '22023';
  end if;

  with
  all_events as (
    select
      case
        when event.anonymous_user_id is not null then event.anonymous_user_id
        else event.visitor_id
      end as visitor_key,
      (
        event.anonymous_user_id is not null
        and event.visitor_id is not null
        and event.anonymous_user_id <> event.visitor_id
      ) as has_visitor_identity_conflict,
      (event.anonymous_user_id is null and event.visitor_id is not null) as uses_legacy_visitor_fallback,
      event.session_id,
      event.event_name,
      event.created_at
    from public.analytics_events event
    where event.created_at >= p_from and event.created_at < p_to
  ),
  funnel_events as (
    select
      case
        when event.anonymous_user_id is not null then event.anonymous_user_id
        else event.visitor_id
      end as visitor_key,
      event.session_id,
      event.event_name,
      coalesce(
        nullif(event.content_id, ''),
        nullif(event.properties ->> 'product_id', ''),
        nullif(event.content_slug, ''),
        nullif(event.properties ->> 'content_slug', '')
      ) as product_id,
      event.entry_point,
      event.created_at
    from public.analytics_events event
    where event.created_at >= p_from and event.created_at < p_to
      and event.event_name in ('shop_view', 'product_view', 'product_interest')
  ),
  audience as (
    select
      count(distinct event.visitor_key) filter (where event.visitor_key is not null)::integer as visitors,
      count(distinct event.session_id) filter (where event.session_id is not null)::integer as sessions
    from all_events event
  ),
  funnel_counts as (
    select
      count(distinct event.visitor_key) filter (
        where event.event_name = 'shop_view' and event.visitor_key is not null
      )::integer as shop_visitors,
      count(distinct event.visitor_key) filter (
        where event.event_name = 'product_view' and event.visitor_key is not null
      )::integer as product_viewers,
      count(*) filter (where event.event_name = 'product_view')::integer as product_views,
      count(distinct event.visitor_key) filter (
        where event.event_name = 'product_interest' and event.visitor_key is not null
      )::integer as interested_visitors,
      count(*) filter (where event.event_name = 'product_interest')::integer as interest_events,
      count(*) filter (
        where event.event_name = 'product_interest' and event.entry_point = 'product_hero'
      )::integer as product_hero_interest_events,
      count(*) filter (
        where event.event_name = 'product_interest' and event.entry_point = 'product_final'
      )::integer as product_final_interest_events,
      count(*) filter (
        where event.event_name = 'product_interest' and event.entry_point = 'home_promo'
      )::integer as home_promo_interest_events
    from funnel_events event
  ),
  checkout_orders as (
    select commerce_order.*,
      (
        commerce_order.attribution_snapshot is not null
        and jsonb_typeof(commerce_order.attribution_snapshot) = 'object'
        and commerce_order.attribution_snapshot @> '{"version": 1}'::jsonb
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'visitor_id') = 'string'
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'session_id') = 'string'
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'first_touch') = 'object'
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'session_touch') = 'object'
        and jsonb_typeof(commerce_order.attribution_snapshot #> '{first_touch,source}') = 'string'
        and jsonb_typeof(commerce_order.attribution_snapshot #> '{session_touch,source}') = 'string'
      ) as has_valid_attribution
    from public.orders commerce_order
    where commerce_order.provider_environment = p_environment
      and commerce_order.created_at >= p_from and commerce_order.created_at < p_to
  ),
  paid_orders as (
    select commerce_order.*,
      (
        commerce_order.attribution_snapshot is not null
        and jsonb_typeof(commerce_order.attribution_snapshot) = 'object'
        and commerce_order.attribution_snapshot @> '{"version": 1}'::jsonb
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'visitor_id') = 'string'
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'session_id') = 'string'
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'first_touch') = 'object'
        and jsonb_typeof(commerce_order.attribution_snapshot -> 'session_touch') = 'object'
        and jsonb_typeof(commerce_order.attribution_snapshot #> '{first_touch,source}') = 'string'
        and jsonb_typeof(commerce_order.attribution_snapshot #> '{session_touch,source}') = 'string'
      ) as has_valid_attribution
    from public.orders commerce_order
    where commerce_order.provider_environment = p_environment
      and commerce_order.status = 'paid'
      and commerce_order.paid_at >= p_from and commerce_order.paid_at < p_to
  ),
  completed_refunds as (
    select refund.*
    from public.commerce_refund_operations refund
    where refund.provider_environment = p_environment
      and refund.status = 'completed'
      and refund.access_revoked_at >= p_from and refund.access_revoked_at < p_to
  ),
  unknown_environment_checkout_orders as (
    select commerce_order.id
    from public.orders commerce_order
    where commerce_order.provider_environment is null
      and commerce_order.created_at >= p_from and commerce_order.created_at < p_to
  ),
  unknown_environment_paid_orders as (
    select commerce_order.id, commerce_order.currency, commerce_order.total_minor
    from public.orders commerce_order
    where commerce_order.provider_environment is null
      and commerce_order.status = 'paid'
      and commerce_order.paid_at >= p_from and commerce_order.paid_at < p_to
  ),
  unknown_environment_paid_by_currency as (
    select paid.currency, sum(paid.total_minor)::bigint as paid_minor
    from unknown_environment_paid_orders paid
    group by paid.currency
  ),
  environment_quality as (
    select
      (select count(*)::integer from unknown_environment_checkout_orders) as unknown_environment_orders,
      (select count(*)::integer from unknown_environment_paid_orders) as unknown_environment_paid_orders,
      (
        select count(*)::integer
        from completed_refunds refund
        join public.orders commerce_order on commerce_order.id = refund.order_id
        where commerce_order.provider_environment is distinct from refund.provider_environment
      ) as refund_order_environment_mismatch_count
  ),
  checkout_counts as (
    select
      count(*)::integer as checkout_starts,
      count(*) filter (where checkout.has_valid_attribution)::integer as attributed_orders,
      count(*) filter (where not checkout.has_valid_attribution)::integer as unattributed_orders,
      count(*) filter (where checkout.attribution_snapshot is null)::integer as legacy_null_attribution_orders,
      count(*) filter (
        where checkout.attribution_snapshot is not null and not checkout.has_valid_attribution
      )::integer as invalid_attribution_orders
    from checkout_orders checkout
  ),
  order_status_rows as (
    select checkout.status, count(*)::integer as orders
    from checkout_orders checkout
    group by checkout.status
  ),
  commerce_counts as (
    select
      (select count(*)::integer from paid_orders) as paid_orders,
      (select count(distinct refund.order_id)::integer from completed_refunds refund) as refunded_orders
  ),
  gross_by_currency as (
    select paid.currency, sum(paid.total_minor)::bigint as gross_minor
    from paid_orders paid
    group by paid.currency
  ),
  refunds_by_currency as (
    select refund.currency, sum(refund.amount_minor)::bigint as refunded_minor
    from completed_refunds refund
    group by refund.currency
  ),
  revenue_by_currency as (
    select
      coalesce(gross.currency, refunded.currency) as currency,
      coalesce(gross.gross_minor, 0)::bigint as gross_minor,
      coalesce(refunded.refunded_minor, 0)::bigint as refunded_minor,
      (coalesce(gross.gross_minor, 0) - coalesce(refunded.refunded_minor, 0))::bigint as net_minor
    from gross_by_currency gross
    full join refunds_by_currency refunded using (currency)
  ),
  paid_attribution as (
    select
      paid.id,
      paid.currency,
      paid.total_minor,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{first_touch,source}', '')
        else null
      end as first_source,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{session_touch,source}', '')
        else null
      end as session_source,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{first_touch,utm_source}', '')
        else null
      end as first_utm_source,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{first_touch,utm_medium}', '')
        else null
      end as first_utm_medium,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{first_touch,utm_campaign}', '')
        else null
      end as first_utm_campaign,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{session_touch,utm_source}', '')
        else null
      end as session_utm_source,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{session_touch,utm_medium}', '')
        else null
      end as session_utm_medium,
      case when paid.has_valid_attribution
        then nullif(paid.attribution_snapshot #>> '{session_touch,utm_campaign}', '')
        else null
      end as session_utm_campaign
    from paid_orders paid
  ),
  first_touch_sources as (
    select
      coalesce(attribution.first_source, 'Unknown') as source,
      attribution.first_utm_source as utm_source,
      attribution.first_utm_medium as utm_medium,
      attribution.first_utm_campaign as utm_campaign,
      attribution.currency,
      count(distinct attribution.id)::integer as paid_orders,
      sum(attribution.total_minor)::bigint as gross_minor
    from paid_attribution attribution
    group by 1, 2, 3, 4, 5
  ),
  session_touch_sources as (
    select
      coalesce(attribution.session_source, 'Unknown') as source,
      attribution.session_utm_source as utm_source,
      attribution.session_utm_medium as utm_medium,
      attribution.session_utm_campaign as utm_campaign,
      attribution.currency,
      count(distinct attribution.id)::integer as paid_orders,
      sum(attribution.total_minor)::bigint as gross_minor
    from paid_attribution attribution
    group by 1, 2, 3, 4, 5
  ),
  product_traffic as (
    select
      event.product_id,
      count(*) filter (where event.event_name = 'product_view')::integer as product_views,
      count(distinct event.visitor_key) filter (
        where event.event_name = 'product_view' and event.visitor_key is not null
      )::integer as product_viewers,
      count(*) filter (where event.event_name = 'product_interest')::integer as interest_events,
      count(distinct event.visitor_key) filter (
        where event.event_name = 'product_interest' and event.visitor_key is not null
      )::integer as interested_visitors
    from funnel_events event
    where event.product_id is not null
      and event.event_name in ('product_view', 'product_interest')
    group by event.product_id
  ),
  product_checkouts as (
    select item.product_id, count(distinct checkout.id)::integer as checkout_starts
    from checkout_orders checkout
    join public.order_items item on item.order_id = checkout.id
    group by item.product_id
  ),
  product_paid as (
    select
      item.product_id,
      item.currency,
      count(distinct paid.id)::integer as paid_orders,
      sum(item.unit_price_minor::bigint * item.quantity::bigint)::bigint as gross_minor
    from paid_orders paid
    join public.order_items item on item.order_id = paid.id
    group by item.product_id, item.currency
  ),
  paid_order_item_rollup as (
    select
      paid.id,
      paid.total_minor,
      paid.currency,
      count(item.id)::integer as item_count,
      coalesce(sum(item.unit_price_minor::bigint * item.quantity::bigint), 0)::bigint as item_total_minor,
      coalesce(bool_and(item.currency = paid.currency) filter (where item.id is not null), false) as currencies_match
    from paid_orders paid
    left join public.order_items item on item.order_id = paid.id
    group by paid.id, paid.total_minor, paid.currency
  ),
  paid_item_quality as (
    select
      count(*) filter (where rollup.item_count = 0)::integer as paid_orders_without_items,
      count(*) filter (
        where rollup.item_count > 0 and rollup.item_total_minor <> rollup.total_minor
      )::integer as paid_orders_with_item_total_mismatch,
      count(*) filter (
        where rollup.item_count > 0 and not rollup.currencies_match
      )::integer as paid_orders_with_item_currency_mismatch
    from paid_order_item_rollup rollup
  ),
  product_keys as (
    select product_id from product_traffic
    union
    select product_id from product_checkouts
    union
    select product_id from product_paid
  ),
  product_rows as (
    select
      product.product_id,
      coalesce(traffic.product_views, 0)::integer as product_views,
      coalesce(traffic.product_viewers, 0)::integer as product_viewers,
      coalesce(traffic.interest_events, 0)::integer as interest_events,
      coalesce(traffic.interested_visitors, 0)::integer as interested_visitors,
      coalesce(checkout.checkout_starts, 0)::integer as checkout_starts,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'currency', paid.currency,
          'paid_orders', paid.paid_orders,
          'gross_minor', paid.gross_minor
        ) order by paid.currency)
        from product_paid paid
        where paid.product_id = product.product_id
      ), '[]'::jsonb) as paid
    from product_keys product
    left join product_traffic traffic using (product_id)
    left join product_checkouts checkout using (product_id)
  ),
  quality as (
    select
      count(*) filter (where event.visitor_key is null)::integer as events_without_visitor_id,
      count(*) filter (where event.session_id is null)::integer as events_without_session_id,
      count(*) filter (where event.has_visitor_identity_conflict)::integer as visitor_identity_conflict_events,
      count(*) filter (where event.uses_legacy_visitor_fallback)::integer as legacy_visitor_fallback_events
    from all_events event
  )
  select jsonb_build_object(
    'version', 1,
    'period', jsonb_build_object(
      'from', to_char(p_from at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'to', to_char(p_to at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'timezone', 'UTC',
      'interval', '[from,to)'
    ),
    'environment', p_environment,
    'traffic_scope', 'all_production',
    'audience', jsonb_build_object(
      'visitors', audience.visitors,
      'sessions', audience.sessions,
      'shop_visitors', funnel.shop_visitors,
      'product_viewers', funnel.product_viewers,
      'product_views', funnel.product_views,
      'interested_visitors', funnel.interested_visitors,
      'interest_events', funnel.interest_events
    ),
    'commerce', jsonb_build_object(
      'checkout_starts', checkout.checkout_starts,
      'paid_orders', commerce.paid_orders,
      'refunded_orders', commerce.refunded_orders,
      'status_counts', coalesce((
        select jsonb_object_agg(status_row.status, status_row.orders order by status_row.status)
        from order_status_rows status_row
      ), '{}'::jsonb),
      'revenue', coalesce((
        select jsonb_agg(jsonb_build_object(
          'currency', revenue.currency,
          'gross_minor', revenue.gross_minor,
          'refunded_minor', revenue.refunded_minor,
          'net_minor', revenue.net_minor
        ) order by revenue.currency)
        from revenue_by_currency revenue
      ), '[]'::jsonb)
    ),
    'attribution', jsonb_build_object(
      'order_cohort_timestamp', 'orders.created_at',
      'paid_source_timestamp', 'orders.paid_at',
      'checkout_orders', checkout.checkout_starts,
      'attributed_orders', checkout.attributed_orders,
      'unattributed_orders', checkout.unattributed_orders,
      'coverage_percent', case when checkout.checkout_starts = 0 then null else
        round(checkout.attributed_orders::numeric * 100 / checkout.checkout_starts, 1)
      end,
      'causality_note', 'Attribution is a captured marketing signal, not proof of causality.'
    ),
    'sources', jsonb_build_object(
      'first_touch', coalesce((
        select jsonb_agg(jsonb_build_object(
          'source', source_row.source,
          'utm_source', source_row.utm_source,
          'utm_medium', source_row.utm_medium,
          'utm_campaign', source_row.utm_campaign,
          'currency', source_row.currency,
          'paid_orders', source_row.paid_orders,
          'gross_minor', source_row.gross_minor
        ) order by source_row.paid_orders desc, source_row.source, source_row.currency)
        from first_touch_sources source_row
      ), '[]'::jsonb),
      'session_touch', coalesce((
        select jsonb_agg(jsonb_build_object(
          'source', source_row.source,
          'utm_source', source_row.utm_source,
          'utm_medium', source_row.utm_medium,
          'utm_campaign', source_row.utm_campaign,
          'currency', source_row.currency,
          'paid_orders', source_row.paid_orders,
          'gross_minor', source_row.gross_minor
        ) order by source_row.paid_orders desc, source_row.source, source_row.currency)
        from session_touch_sources source_row
      ), '[]'::jsonb)
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', product.product_id,
        'product_views', product.product_views,
        'product_viewers', product.product_viewers,
        'interest_events', product.interest_events,
        'interested_visitors', product.interested_visitors,
        'checkout_starts', product.checkout_starts,
        'paid', product.paid
      ) order by product.product_id)
      from product_rows product
    ), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'mode', 'independent_counts',
      'conversion_percentages_available', false,
      'note', 'Traffic events and orders are not represented as one strict linked cohort.',
      'entry_points', jsonb_build_object(
        'product_hero', funnel.product_hero_interest_events,
        'product_final', funnel.product_final_interest_events,
        'home_promo', funnel.home_promo_interest_events
      )
    ),
    'data_quality', jsonb_build_object(
      'status', case
        when p_from < current_timestamp - interval '15 days'
          or quality.events_without_visitor_id > 0
          or quality.events_without_session_id > 0
          or quality.visitor_identity_conflict_events > 0
          or item_quality.paid_orders_without_items > 0
          or item_quality.paid_orders_with_item_total_mismatch > 0
          or item_quality.paid_orders_with_item_currency_mismatch > 0
          or environment_quality.unknown_environment_paid_orders > 0
          or environment_quality.refund_order_environment_mismatch_count > 0
        then 'data incomplete'
        else 'data ok'
      end,
      'raw_traffic_retention_days', 15,
      'traffic_may_be_truncated', p_from < current_timestamp - interval '15 days',
      'traffic_environment_segmented', false,
      'events_without_visitor_id', quality.events_without_visitor_id,
      'events_without_session_id', quality.events_without_session_id,
      'visitor_identity_conflict_events', quality.visitor_identity_conflict_events,
      'legacy_visitor_fallback_events', quality.legacy_visitor_fallback_events,
      'paid_orders_without_items', item_quality.paid_orders_without_items,
      'paid_orders_with_item_total_mismatch', item_quality.paid_orders_with_item_total_mismatch,
      'paid_orders_with_item_currency_mismatch', item_quality.paid_orders_with_item_currency_mismatch,
      'unknown_environment_orders', environment_quality.unknown_environment_orders,
      'unknown_environment_paid_orders', environment_quality.unknown_environment_paid_orders,
      'unknown_environment_paid_minor', coalesce((
        select jsonb_agg(jsonb_build_object(
          'currency', unknown_paid.currency,
          'paid_minor', unknown_paid.paid_minor
        ) order by unknown_paid.currency)
        from unknown_environment_paid_by_currency unknown_paid
      ), '[]'::jsonb),
      'refund_order_environment_mismatch_count', environment_quality.refund_order_environment_mismatch_count,
      'legacy_null_attribution_orders', checkout.legacy_null_attribution_orders,
      'invalid_attribution_orders', checkout.invalid_attribution_orders,
      'attribution_is_causal', false
    )
  ) into v_report
  from audience
  cross join funnel_counts funnel
  cross join checkout_counts checkout
  cross join commerce_counts commerce
  cross join quality
  cross join paid_item_quality item_quality
  cross join environment_quality;

  return v_report;
end;
$$;

revoke execute on function public.commerce_analytics_report_v1(timestamptz, timestamptz, text)
  from public;
revoke execute on function public.commerce_analytics_report_v1(timestamptz, timestamptz, text)
  from anon;
revoke execute on function public.commerce_analytics_report_v1(timestamptz, timestamptz, text)
  from authenticated;
grant execute on function public.commerce_analytics_report_v1(timestamptz, timestamptz, text)
  to service_role;

comment on function public.commerce_analytics_report_v1(timestamptz, timestamptz, text) is
  'Server-only aggregate Commerce Analytics v1. Traffic uses analytics_events.created_at across all production traffic; checkout uses orders.created_at; purchases use orders.paid_at; completed refunds use commerce_refund_operations.access_revoked_at. Revenue is grouped by currency. The funnel contains independent counts and intentionally returns no cross-cohort conversion percentages.';
