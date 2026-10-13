\set ON_ERROR_STOP on

do $$
declare
  target_receipt uuid;
  delivery record;
begin
  select receipt_id into target_receipt from public.receipt_original_delivery_concurrency_target;
  assert target_receipt is not null, 'No synthetic receipt was available for the concurrency fixture';
  select * into delivery from public.receipt_original_deliveries where receipt_id = target_receipt;
  assert delivery.status = 'sending' and delivery.attempt_count = 1, 'Exactly one sending claim is required';
  assert delivery.claim_token is not null and delivery.claimed_at is not null, 'The winning claim must have a token and timestamp';

  update public.receipt_original_deliveries
  set status = 'uncertain', error_code = 'provider_response_unknown', updated_at = now()
  where receipt_id = target_receipt and status = 'sending' and claim_token = delivery.claim_token;

  begin
    update public.receipt_original_deliveries set status = 'sending'
    where receipt_id = target_receipt;
    assert false, 'An uncertain original must never be automatically retried';
  exception when others then
    assert sqlerrm = 'Invalid receipt original delivery transition';
  end;
  assert (select status from public.receipt_original_deliveries where receipt_id = target_receipt) = 'uncertain';
  assert (select attempt_count from public.receipt_original_deliveries where receipt_id = target_receipt) = 1;
end;
$$;

select 'receipt original delivery concurrency SQL checks passed' as result;
