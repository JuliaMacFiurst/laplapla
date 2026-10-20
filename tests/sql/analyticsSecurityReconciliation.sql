\set ON_ERROR_STOP on

do $$
declare
  function_signature regprocedure;
begin
  foreach function_signature in array array[
    'public.cleanup_analytics_events(interval)'::regprocedure,
    'public.cleanup_meme_engine_cache(interval,integer)'::regprocedure,
    'public.refresh_analytics_daily_summary(date,date)'::regprocedure,
    'public.analytics_report_v2(timestamp with time zone,timestamp with time zone)'::regprocedure
  ]
  loop
    assert not has_function_privilege('anon', function_signature, 'EXECUTE'),
      format('anon unexpectedly has EXECUTE on %s', function_signature);
    assert not has_function_privilege('authenticated', function_signature, 'EXECUTE'),
      format('authenticated unexpectedly has EXECUTE on %s', function_signature);
    assert has_function_privilege('service_role', function_signature, 'EXECUTE'),
      format('service_role is missing EXECUTE on %s', function_signature);
  end loop;
end;
$$;
