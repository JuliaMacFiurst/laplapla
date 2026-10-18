# Refund confirmation email delivery

Commerce Admin remains responsible for the PayPal refund and access revocation. The
`complete_commerce_full_refund` transaction changes an operation to `completed`;
`20261017195749_refund_email_deliveries.sql` then creates one private pending email
record for that operation. It does not backfill earlier completed refunds.

LapLapLa sends the notification through its existing Resend configuration. The
protected `/api/cron/recover-purchase-notifications` job checks pending and eligible
failed records on its existing schedule. The email is asynchronous; its failure
never changes the completed refund or receipt ledger. Delivery can therefore be
delayed until the next scheduled run.

Deployment order:

1. Apply and verify the migration manually before deploying the sender code.
2. Verify server-only `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` in the
   LapLapLa environment. Keep `REFUND_EMAIL_ENABLED` unset during deployment.
3. Verify the protected cron and the new table's RLS and service-role grants.
4. Enable `REFUND_EMAIL_ENABLED=true` only in the intended LapLapLa environment.

Inspect `commerce_refund_email_deliveries` by `operation_id`. `accepted` means
Resend accepted the message; it does not prove inbox delivery. `failed` may be
retried by the existing job once, with the same Resend idempotency key. `sending`
older than 15 minutes becomes `uncertain`; `uncertain` is never retried
automatically. For an uncertain result, inspect Resend using the operation ID and
preserve the evidence before deciding any further action. Do not repeat a PayPal
refund to recover an email.

Sandbox messages contain `TEST REFUND` and no accounting attachment. Live messages
are ordinary confirmations and are not accounting documents. Original Live receipt
delivery remains a separate, immutable receipt workflow.
