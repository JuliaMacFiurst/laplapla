# Shop Release Candidate inventory — 2026-10-13

This is a review manifest, not a staged commit or deployment. `staging-updated` remains at `71b9cb6`. The 44 paths below were modified or untracked before this release-preparation task; this document and the Commerce Admin changes were added during the task.

Classification: **A** required Shop implementation; **B** required dependency, migration or regression verification; **C** related but not required for runtime release; **D** unrelated work; **E** unresolved classification. All paths in the public list are relative to `capybara_tales`; Commerce Admin paths are relative to `upload-lessons`.

## Public Shop: A — include (25)

| Path | Release role |
|---|---|
| `components/shop/PayPalCheckout.tsx` | Two customer consents before PayPal |
| `components/shop/ShopProductDetail.tsx` | Prepayment legal disclosure |
| `i18n/en.ts` | Browser-print product wording |
| `i18n/he.ts` | Browser-print product wording |
| `i18n/ru.ts` | Browser-print product wording |
| `lib/customer/copy.ts` | Account copy-only wording |
| `lib/server/commerce/receipts/issuance.ts` | Original delivery after ready PDF artifacts |
| `lib/server/customerPurchases.ts` | Account copy availability after provider acceptance |
| `pages/_app.tsx` | Legal navigation links |
| `pages/account/index.tsx` | Copy-only customer action |
| `pages/api/cron/recover-receipt-artifacts.ts` | Receipt delivery recovery coordination |
| `pages/api/customer/checkout/paypal/create.ts` | Server consent and Live delivery prerequisites |
| `pages/api/customer/purchases/[orderId]/receipt.ts` | Server-authorized copy-only PDF response |
| `pages/privacy.tsx` | Commerce data disclosures |
| `pages/terms.tsx` | Terms alignment |
| `styles/Shop.css` | Checkout/legal responsive presentation |
| `components/legal/ShopLegalDisclosure.tsx` | Shared disclosure and localized policy links |
| `components/legal/ShopPolicyPage.tsx` | Localized policy renderer |
| `lib/legal/checkoutConsent.ts` | Consent text and versions |
| `lib/legal/shopPolicies.ts` | RU/EN/HE shop policies |
| `lib/server/commerce/checkoutConsents.ts` | Immutable order consent evidence |
| `lib/server/commerce/receipts/originalDelivery.ts` | Resend original-once state machine |
| `pages/printable-license.tsx` | License route |
| `pages/refund-policy.tsx` | Refund route |
| `pages/terms-of-sale.tsx` | Sale terms route |

## Public Shop: B — include (17)

| Path | Release role |
|---|---|
| `lib/server/commerce/receipts/syntheticFixtures.ts` | Synthetic receipt fixture avoids private address in tests |
| `scripts/testCommerceOrderMigration.sh` | Isolated migration/receipt regression harness |
| `supabase/migrations/202610130001_create_checkout_consents.sql` | Locally required SQL source; already applied and registered remotely (25/25), never reapply |
| `tests/customerPurchaseHistory.test.ts` | Account receipt state regression |
| `tests/customerReceiptDownload.test.ts` | Copy-only and ownership regression |
| `tests/paypalCheckoutApi.test.ts` | Consent and Live gate regression |
| `tests/paypalCheckoutUi.test.tsx` | Accessible localized consent UI |
| `tests/receiptArtifactPipeline.test.ts` | Original/copy artifact replay |
| `tests/receiptDocumentTemplate.test.ts` | Synthetic receipt output |
| `tests/sql/receiptLedgerFoundation.sql` | Receipt ledger test assertion |
| `tests/checkoutConsents.test.ts` | Consent recording and recovery |
| `tests/receiptOriginalDelivery.test.ts` | Resend accepted/failed/uncertain behavior |
| `tests/shopLegalPolicies.test.tsx` | Policy routes/localization |
| `tests/sql/checkoutConsentRecovery.sql` | Real SQL trigger recovery behavior |
| `tests/sql/receiptDeliveryLifecycleAssert.sql` | One receipt and delivery evidence |
| `tests/sql/receiptOriginalDeliveryConcurrencyAssert.sql` | Concurrent claim protection |
| `tests/sql/receiptOriginalDeliveryConcurrencySetup.sql` | Concurrent test setup |

## Public Shop: C — document or exclude (2)

| Path | Decision |
|---|---|
| `LapLapLa_Shop_Launch_Master_Roadmap.md` | Include with release documentation; preserve history |
| `scripts/sendResendPdfTransportTest.ts` | Exclude from deployment candidate; one-shot synthetic email diagnostic, already used |

No public paths were classified D or E. This inventory document itself is release documentation and should be reviewed alongside the Roadmap.

## Commerce Admin: isolated candidate (6)

| Class | Path | Release role |
|---|---|---|
| A | `lib/commerce-admin.ts` | Delivery status contract |
| A | `lib/server/commerce-admin.ts` | Authorized read-only delivery lookup and operational warning |
| A | `pages/admin/commerce/orders/[orderId].tsx` | Receipt/order delivery evidence UI |
| B | `styles/admin-commerce.css` | Compact responsive evidence panel |
| B | `tests/commerce-original-delivery.test.ts` | Five states, missing record and auth-bound query tests |
| C | `docs/commerce-operator-runbook.md` | Operator procedure; include for release review |

The existing admin API `GET /api/admin/commerce/orders/[orderId]` and `requireAdminSession` are unchanged. No service-role key reaches the browser. No delivery mutation, resend action, new route, public table grant or schema change was added.

## Commerce Admin: D — exclude and preserve (3)

- `lib/server/admin-analytics.ts`
- `pages/admin/analytics.tsx`
- `tests/admin-analytics.test.ts`

These three edits predated this task and are not dependencies of the Commerce delivery view.

## Boundaries and blockers

- Existing committed code supplies auth, PayPal reconciliation, paid-order/entitlement finalization, receipt ledger and PDF artifacts. The public candidate depends on the already-applied `202610130001` migration and on verified target-environment Resend, private Storage and cron configuration.
- The product remains `coming-soon`, the checkout page remains Sandbox-only, and the Live API still requires original-email configuration. This candidate does not open public sales.
- Independent clean checkout verification: public candidate passes 1,297 Vitest tests, TypeScript, ESLint and the standard Turbopack production build. Admin candidate passes TypeScript, 19 Commerce-focused tests, changed-file ESLint and a webpack production build. The clean admin base and candidate have identical full-suite failures (nine failed tests, including Content Factory/remediation and an analytics documentation check) and identical repository-wide ESLint findings (95 errors, three warnings). Ignored `scripts/tmp` files are absent from clean checkouts, where typecheck and webpack builds pass; those files obstruct the ordinary dirty Admin checkout. Authorized operator visual QA and release signoff remain pending.
- No files have been staged or committed. Review explicit file lists in both repos before any future commit; do not use broad `git add`.
