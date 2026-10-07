create table public.receipt_artifact_concurrency_target as
select id as receipt_id from public.receipts order by issued_at desc limit 1;
