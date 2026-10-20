# First controlled PayPal Live purchase

Public sales remain closed: `SHOP_LIVE_CHECKOUT_ENABLED=false` and
`RECEIPT_ORIGINAL_EMAIL_ENABLED=false`. Do not change those flags for this test.

## Before enabling the private test

1. Confirm that Storefront and Commerce Admin are deployed, that the Live PayPal webhook is configured, and that the Admin operator can inspect orders and receipt delivery.
2. Read-only verify the chosen Supabase Auth user has a confirmed email and no active `sound-case-001` entitlement. Record the immutable user ID in the Production-only server setting `SHOP_PRIVATE_LIVE_TEST_USER_ID`; never place it in source or a public variable.
3. Confirm the active issuer profile, Live receipt series, private `receipt-pdfs` bucket, Resend sender, and that old receipt delivery candidates will not be selected for this test. The accounting PDF format has already been approved.
4. Set `SHOP_PRIVATE_LIVE_TEST_NOT_BEFORE` to the current UTC timestamp (ISO 8601 with `Z`). The private checkout closes automatically 24 hours after this timestamp. Set `SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED=true`, then `SHOP_PRIVATE_LIVE_TEST_ENABLED=true`, Production scope only. Redeploy if Vercel requires new environment values to reach the runtime.
5. Recheck the public product page: it must still show Coming soon and no public purchase link. A different signed-in customer must be unable to create a PayPal order.

## Owner-run purchase

Use the authorized LapLapLa account and an independent PayPal buyer account. Do not pay with the merchant account. After signing in, open `/shop/sound-case-001/private-access` and press Continue to checkout. This grants a six-hour, signed, HTTP-only page pass so the PayPal return page still loads if the creation gate closes. The payment APIs independently verify the same Supabase user, and the disabled gate prevents new orders. Confirm the displayed and PayPal amounts are **39.00 ILS**, accept the existing checkout consents, and make one purchase. Codex must not initiate payment.

Verify the PayPal capture, one paid Supabase order, one active entitlement, `/library`, protected builder and saved personalization. Then verify one receipt, ready original and copy artifacts, and one `receipt_original_deliveries` row with `accepted`, `attempt_count=1`, and a provider email ID. Confirm the original email and PDF in the buyer mailbox; Resend `accepted` alone does not prove inbox delivery. Commerce Admin should show the same order and evidence.

If payment succeeds but receipt or delivery does not, keep the order and entitlement intact. Inspect Admin, Supabase evidence and provider outcome before any resend. Do not repeat payment or blindly retry an uncertain delivery. The existing receipt/artifact recovery cron can recover missing work, and the private email scope stays restricted to the chosen user and orders created after the configured timestamp.

After receipt delivery is verified, disable `SHOP_PRIVATE_LIVE_TEST_ENABLED` and `SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED`. Leave both public flags false. An existing signed page pass and authenticated quote/resume can read the immutable in-flight order after the private creation gate closes; capture of that server-verified order and signed webhook reconciliation remain available. New order creation stays blocked.
