\set ON_ERROR_STOP on

-- Runs only in the temporary PostgreSQL instance created by testCommerceOrderMigration.sh.
-- Provider acceptance and PDF object bytes are mocked by the separate Vitest tests.
do $$
declare
  target_receipt public.receipts;
  copy_artifact public.receipt_artifacts;
  original_artifact public.receipt_artifacts;
  delivery public.receipt_original_deliveries;
  replay record;
  original_claim record;
  copy_claim record;
begin
  select r.* into target_receipt
  from public.receipts r
  join public.receipt_artifacts a on a.receipt_id = r.id
    and a.document_copy = 'original' and a.status = 'ready'
  join public.receipt_artifacts c on c.receipt_id = r.id
    and c.document_copy = 'copy' and c.status = 'processing'
  limit 1;
  assert target_receipt.id is not null, 'Synthetic receipt and both artifact claims are required';

  select * into copy_artifact from public.receipt_artifacts
  where receipt_id = target_receipt.id and document_copy = 'copy';
  assert public.stage_receipt_pdf_artifact(copy_artifact.id, copy_artifact.lease_token, 234, repeat('b', 64)) = 'staged';
  assert public.complete_receipt_pdf_artifact(copy_artifact.id, copy_artifact.lease_token, 'application/pdf', 234, repeat('b', 64)) = 'ready';

  insert into public.receipt_original_deliveries (receipt_id) values (target_receipt.id);
  update public.receipt_original_deliveries
  set status = 'sending', attempt_count = 1, claim_token = gen_random_uuid(), claimed_at = now()
  where receipt_id = target_receipt.id and status = 'pending' and attempt_count = 0;
  assert found, 'Only one provider attempt may be claimed';
  update public.receipt_original_deliveries
  set status = 'accepted', provider_email_id = 'mock-resend-accepted', accepted_at = now()
  where receipt_id = target_receipt.id and status = 'sending';
  assert found, 'Mock provider acceptance must be recorded';

  select * into replay from public.issue_receipt_for_paid_order(target_receipt.order_id);
  assert replay.result = 'already_issued' and replay.issued_receipt_id = target_receipt.id;
  select * into original_claim from public.claim_receipt_pdf_artifact(target_receipt.id, 'original', 'receipt-pdfs', 'receipt-html-v2', 300);
  select * into copy_claim from public.claim_receipt_pdf_artifact(target_receipt.id, 'copy', 'receipt-pdfs', 'receipt-html-v2', 300);
  assert original_claim.result = 'ready' and copy_claim.result = 'ready';
  assert original_claim.artifact_id <> copy_claim.artifact_id;
  assert original_claim.storage_key <> copy_claim.storage_key;
  assert (select count(*) from public.receipts where order_id = target_receipt.order_id) = 1;
  assert (select count(*) from public.receipt_artifacts where receipt_id = target_receipt.id) = 2;
  assert (select count(*) from public.receipt_original_deliveries where receipt_id = target_receipt.id) = 1;

  select * into delivery from public.receipt_original_deliveries where receipt_id = target_receipt.id;
  assert delivery.status = 'accepted' and delivery.attempt_count = 1;
  assert delivery.provider_email_id = 'mock-resend-accepted' and delivery.accepted_at is not null;
  assert not exists (
    select 1 from public.receipt_original_deliveries
    where receipt_id = target_receipt.id and status = 'pending' and attempt_count = 0
  ), 'An accepted original must not be selected for another provider attempt';

  begin
    update public.receipt_original_deliveries set status = 'sending'
    where receipt_id = target_receipt.id;
    assert false, 'Accepted original must not return to sending';
  exception when others then
    assert sqlerrm = 'Invalid receipt original delivery transition';
  end;
end;
$$;

select 'receipt delivery lifecycle SQL checks passed' as result;
