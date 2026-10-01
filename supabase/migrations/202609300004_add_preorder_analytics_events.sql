alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

-- Keep this list aligned with lib/analytics/events.ts; tests enforce the contract.
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
    'preorder_page_view', 'preorder_submit_attempt', 'preorder_signup_success',
    'preorder_signup_failed'
  ));
