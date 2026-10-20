do $$
declare
  target_receipt uuid;
  target_order uuid;
  issued record;
  claim_original record;
  claim_copy record;
  replay record;
  complete_result text;
begin
  select id into target_receipt from public.receipts order by issued_at asc limit 1;
  if target_receipt is null then
    select id into target_order from public.orders
      where status = 'paid' and provider_environment = 'live'
      order by paid_at asc limit 1;
    select * into issued from public.issue_receipt_for_paid_order(target_order);
    target_receipt := issued.issued_receipt_id;
  end if;
  assert target_receipt is not null;

  set local role anon;
  begin
    perform * from public.claim_receipt_pdf_artifact(target_receipt, 'original', 'receipt-pdfs', 'receipt-html-v2', 300);
    assert false, 'anon artifact claim unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role authenticated;
  begin
    insert into public.receipt_artifacts (receipt_id, document_copy, storage_bucket, storage_key, template_version)
    values (target_receipt, 'original', 'receipt-pdfs', 'forbidden.pdf', 'receipt-html-v2');
    assert false, 'authenticated artifact insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role service_role;
  select * into claim_original from public.claim_receipt_pdf_artifact(target_receipt, 'original', 'receipt-pdfs', 'receipt-html-v2', 300);
  assert claim_original.result = 'claimed';
  assert claim_original.storage_key = 'receipts/' || target_receipt::text || '/original/' || claim_original.artifact_id::text || '.pdf';
  assert public.stage_receipt_pdf_artifact(claim_original.artifact_id, claim_original.claim_token, 123, repeat('a', 64)) = 'staged';
  assert public.complete_receipt_pdf_artifact(claim_original.artifact_id, claim_original.claim_token, 'application/pdf', 124, repeat('a', 64)) = 'not_processing';
  select public.complete_receipt_pdf_artifact(claim_original.artifact_id, claim_original.claim_token, 'application/pdf', 123, repeat('a', 64)) into complete_result;
  assert complete_result = 'ready';

  select * into replay from public.claim_receipt_pdf_artifact(target_receipt, 'original', 'receipt-pdfs', 'receipt-html-v2', 300);
  assert replay.result = 'ready';
  assert replay.artifact_id = claim_original.artifact_id;
  assert replay.existing_sha256 = repeat('a', 64);

  select * into claim_copy from public.claim_receipt_pdf_artifact(target_receipt, 'copy', 'receipt-pdfs', 'receipt-html-v2', 300);
  assert claim_copy.result = 'claimed';
  assert claim_copy.artifact_id <> claim_original.artifact_id;
  reset role;
  assert (select count(*) from public.receipt_artifacts where receipt_id = target_receipt) = 2;

  begin
    update public.receipt_artifacts set sha256 = repeat('b', 64) where id = claim_original.artifact_id;
    assert false, 'ready artifact update unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Ready receipt artifacts are immutable';
  end;
  begin
    delete from public.receipt_artifacts where id = claim_original.artifact_id;
    assert false, 'artifact delete unexpectedly succeeded';
  exception when others then
    assert sqlerrm = 'Receipt artifacts cannot be deleted';
  end;
  assert not has_function_privilege('anon', 'public.claim_receipt_pdf_artifact(uuid,text,text,text,integer)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.claim_receipt_pdf_artifact(uuid,text,text,text,integer)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.claim_receipt_pdf_artifact(uuid,text,text,text,integer)', 'EXECUTE');
end;
$$;

select 'receipt PDF artifact SQL checks passed' as result;
