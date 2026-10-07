do $$
declare
  target_receipt uuid := (select receipt_id from public.receipt_artifact_concurrency_target limit 1);
begin
  assert (select count(*) from public.receipt_artifacts where receipt_id = target_receipt and document_copy = 'original') = 1;
  assert (select count(*) from public.receipt_artifacts where receipt_id = target_receipt and document_copy = 'copy') <= 1;
end;
$$;
select 'receipt artifact concurrency checks passed' as result;
