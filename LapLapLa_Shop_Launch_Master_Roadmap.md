# LapLapLa Shop — Master Launch Roadmap

> **Purpose:** single source of truth from current state to a properly finished, publishable LapLapLa shop.
>
> **Rule:** every future Codex implementation prompt that changes launch-related work must read this file first and update the relevant status/progress section before finishing. Do not silently reorder or drop unfinished launch work.
>
> **Canonical repos**
> - Customer/public app: `/Users/julia_mac/AI-Workspace/dev/capybara_tales`
> - Canonical admin: `/Users/julia_mac/AI-Workspace/dev/upload-lessons`
>
> **Status vocabulary:** `DONE` · `PARTIAL` · `NOT STARTED` · `BLOCKED / NEEDS DECISION`

---

## 0. Launch objective

Publish the LapLapLa shop with **Sound Case #001** as a real purchasable product, with a trustworthy customer journey and an operable commerce backend.

A successful launch means a genuine customer can:

`shop → product → auth → billing identity → PayPal Live → paid order → entitlement → personalization → preview/result → print/re-download → account → receipt`

and Julia can operate the purchase from the canonical Commerce admin without manually excavating Supabase tables.

**Quality principle:** do not rush unsafe accounting/payment/refund architecture for launch speed. At the same time, do not let infrastructure work make storefront, admin UX, post-purchase UX, legal readiness, or design disappear from the roadmap.

---

## 1. Current executive state

| Track | Status | Current state |
|---|---|---|
| Backend commerce | DONE / near production-ready | Trusted PayPal reconciliation, atomic paid finalization, entitlement, snapshots, receipt ledger, PDF artifacts and recovery exist. |
| Customer purchase flow | PARTIAL | Sound Case #001 is active in the local Shop candidate; a Sandbox purchase and refund have been exercised. Public sales remain closed and the Live flow is unverified. |
| Storefront design | PARTIAL | Sound Case #001 product detail and shop index now have launch-quality merchandising; age/duration are approved provisional facts pending live playtest, while minimum-player and preparation-burden decisions remain. |
| Builder / preview / print | PARTIAL | Canonical 24-page preview, saved-only printing, code-derived print guidance and account Edit/Open & print intents exist; protected-route visual QA and physical printer validation remain. |
| Post-purchase UX | PARTIAL | `/account` provides localized purchase history, re-edit/re-print entry and server-authorized receipt **copy** download after original-email acceptance. The original email/account copy flow is not verified in Production. |
| Commerce Admin | PARTIAL | A local Admin candidate provides full Sandbox refunds and read-only original-email delivery evidence; Preview release and Production verification remain open. |
| Refund lifecycle | PARTIAL / MIGRATION REGISTERED | The full-refund migration is applied and registered in Supabase; a Sandbox refund with entitlement revocation was completed. Live corrective accounting documents, partial refunds and disputes remain open. |
| Legal | BLOCKED FOR LAUNCH | Shop policies and checkout consents are implemented locally but are not yet deployed to Production. Final prepayment verification remains open. |
| Production configuration | BLOCKED | Vercel's latest visible Production deployment is `4922379` from `main` (2026-10-05); newer `staging-updated` builds are Preview. Production env names include Resend, Supabase service role, the receipt bucket and `CRON_SECRET`, but searches found no PayPal variables or `RECEIPT_ORIGINAL_EMAIL_ENABLED`. Values and runtime behavior remain untested. A read-only public check found HTTPS on `/`, while Shop routes returned 404. |

---

## 2. Completed foundation — do not repeatedly re-audit unless code changes

### Customer identity and access — DONE
- Supabase customer auth.
- `customer_profiles`.
- `product_entitlements`.
- Server-trusted entitlement grant.
- Protected builder access.

### Personalization persistence — DONE functionally
- RU / EN / HE.
- Hebrew RTL.
- Lead name.
- Up to 8 participants.
- Save / Saving / Saved / Failed.
- Re-entry loads saved personalization.

### PayPal Sandbox commerce foundation — DONE functionally
- Trusted server-side reconciliation.
- Local order foundation.
- Resume/recovery behavior.
- Webhook verification.
- Atomic paid order + entitlement finalization.
- Receipt failure cannot block product access.

### Billing identity — DONE functionally
- Customer billing name.
- Verified Auth email.
- Immutable order snapshots.
- Environment snapshots.

### Receipt ledger — DONE foundation
- Seller: `אומנצ׳קים`.
- Immutable receipt records.
- `WEB` live series.
- `WEB-000001` still unused until first genuine Live receipt.
- Customer original: `קבלה מקור`.
- Business copy: `קבלה העתק`.
- One receipt number for both representations.
- Production renderer template: `receipt-html-v2`.

### Receipt PDF runtime — DONE
- `puppeteer-core@24.32.1`.
- `@sparticuz/chromium@143.0.0`.
- Bundled Hebrew/Cyrillic fonts.
- Real Vercel Preview Linux smoke-test passed.
- Exact production renderer generated non-empty PDF bytes in Vercel.
- Temporary diagnostic endpoint removed afterward.

### Receipt artifact foundation — DONE, real Live E2E pending
- Private Supabase bucket `receipt-pdfs` exists.
- Original/copy artifact model.
- SHA/size reconciliation.
- Recovery architecture.
- First genuine Live receipt artifact E2E must be validated on a real purchase, not fabricated.

### Purchase Discord notification — DONE foundation
- Durable notification state/recovery exists.
- New Live purchase notification architecture exists.
- Must become visible operationally in Commerce admin.

### Vercel Hobby cron compatibility — DONE
- Recovery crons changed to safe daily schedules.
- Staging Preview deploys successfully again.

---

# 3. MASTER ROADMAP

## PHASE 1 — Commerce operational visibility

**Status: PARTIAL — CURRENT ACTIVE PHASE**

### Goal
Turn canonical Commerce in `upload-lessons` from a read-only order viewer into a safe operational view for real purchases.

### Already exists
- Orders list/detail.
- Payment/order status.
- Provider order/capture IDs.
- Sandbox / Live / Unknown.
- Customer snapshots with explicit legacy Auth fallback.
- Product / quantity / price source / preorder evidence.
- Entitlement/access.
- Provider event summaries without raw payload.
- Personalization existence/locale without participant names.
- Search, filters, pagination, loading/error/empty states.
- Derived review state.

### Required for Phase 1 completion
- [x] Show receipt ledger record and receipt number on order detail.
- [x] Show receipt issuance state/failure.
- [x] Show original PDF (`מקור`) artifact state.
- [x] Show business copy (`העתק`) artifact state.
- [x] Show artifact generation/storage failure safely.
- [x] Show purchase Discord notification delivery state.
- [x] Implement read-only original-email delivery evidence on the authorized Commerce order detail page locally: `pending`, `sending`, `accepted`, `failed`, `uncertain`, and an explicit missing-record state. The admin release is not deployed; operator visual QA remains open.
- [x] Show recovery/operational failure information useful to an operator.
- [x] Add one coherent **Operational problems** summary instead of forcing table archaeology.
- [x] Add safe server-authorized admin download for customer original PDF.
- [x] Add safe server-authorized admin download for business copy PDF.
- [x] Remove stale Takbull receipt placeholder/copy.
- [ ] Perform Commerce list/detail visual UX pass after operational information is present.

### Explicitly NOT part of this first implementation slice
Do not casually add:
- arbitrary `Mark paid`;
- arbitrary receipt issuance;
- receipt editing/deletion;
- receipt number editing;
- arbitrary environment/capture mutation;
- arbitrary entitlement grant/revoke;
- broad manual recovery buttons.

Recovery actions, if needed, come later and must be narrow, idempotent, server-authorized and auditable.

### Phase 1 Definition of Done
Julia can open one genuine order in canonical Commerce and understand, from one detail page:

`Payment → Customer → Product → Entitlement → Receipt → מקור → העתק → Original email delivery → Purchase notification → Operational problems`

without opening Supabase manually.

---

## CONFIRMED ACCOUNTING DECISION — Refunds/corrections

**Status: ACCOUNTANT RULES CONFIRMED / READY FOR TECHNICAL DESIGN**

Confirmed rules and required invariants:
- A full refund requires `חשבונית זיכוי` + `קבלה במינוס` for the amount actually refunded.
- A partial refund uses the same `חשבונית זיכוי` + `קבלה במינוס` model for the amount actually refunded.
- The two parts may be represented as one document.
- `חשבונית זיכוי` has its own sequential numbering, which may begin at integer 1. No technical display prefix has been approved yet.
- The original `קבלה`, its accounting snapshot, amount and PDF remain immutable: they are not rewritten, deleted or regenerated to make the original sale disappear.
- Immutability of the original accounting document does not prevent a derived operational refund state from being shown beside it.
- One original receipt may have zero or more append-only refund/corrective documents, supporting one full refund, one partial refund or multiple partial refunds.
- Every refund/corrective record must explicitly link to the original receipt and original order, and to the refund transaction/provider event where appropriate.
- Linkage must be navigable in both directions in Commerce: original receipt → related corrective documents, and corrective document → original receipt/order.
- The linked history must allow the system to derive original paid amount, total refunded amount, remaining/net amount, and no refund / partially refunded / fully refunded state. A standalone `refunded` boolean must not be the source of truth.
- The corrective/refund document must be delivered to the customer and retained by the business. Delivery method remains a separate implementation decision; receipt email delivery is not implemented by this decision.

This section records accounting facts and system invariants only. Final schema, table/column names, constraints, RPCs, PayPal refund workflow, entitlement behavior and numbering display format require a separate technical audit.

---

## PHASE 2 — Customer post-purchase area + receipt access

**Status: PARTIAL**

### Already exists
- `/account`.
- Billing identity editing.
- Entitlements.
- Links back to product/create.
- Saved personalization can be reopened.

### Required
- [x] Turn account into understandable **My purchases** experience.
- [x] Show Sound Case #001 purchase/order information.
- [x] Show useful purchase status/date/amount where appropriate.
- [x] Clear actions: open/edit, print/re-download.
- [x] Customer can securely access/download only a receipt copy (`העתק`) after the original email is accepted; the original is not offered in the account. Production E2E remains pending.
- [x] Define/display receipt delivery state where useful.
- [x] Owner decided: send the original once by email; make only marked copies available in the account after provider acceptance. Controlled original-delivery E2E remains pending.
- [x] Explain that purchased quest can be edited and printed again.
- [x] Implement responsive RU/EN/HE + RTL account experience; final device-level launch QA remains in the global launch checklist.

### Important distinction
Receipt PDF access and quest result access are different products/artifacts. Do not conflate them.

---

## PHASE 3 — Storefront + merchandising design

**Status: PARTIAL — IMPLEMENTED / PHYSICAL MOBILE QA PENDING**

### `/shop`
- [x] Real product imagery.
- [x] Clear product value proposition.
- [x] Strong launch-ready card design.
- [x] Mobile / RU / EN / HE / RTL pass.
- [x] Show Sound Case and free Svalbard before shop directions, with a compact localized hero and format explanation.
- [ ] Confirm the refreshed storefront and homepage shop discoverability on the owner's physical Android phone.

### Homepage shop showcase
- [x] Replace the mobile Svalbard teaser and generic desktop spotlight with one illustrated, localized RU/EN/HE shop invitation using a local optimized WebP asset.
- [x] Keep the existing mobile/desktop section order and localized `/shop` links; present four shop directions as compact supporting content.
- [ ] Confirm the new showcase and native scrolling on the owner's physical Android phone.

### `/shop/[slug]` Sound Case #001
- [x] Hero visual.
- [x] Gallery using real product materials.
- [x] Clear “what you get”.
- [x] Recommended age: provisional `9+` mostly independently / `7+` with an adult host; live playtest validation remains required.
- [x] Group/participant guidance.
- [x] Approximate activity duration: provisional `90–120 minutes`, depending on group size and pace; larger groups may take longer.
- [x] Languages.
- [x] Printable nature clearly explained.
- [x] Personalization explained.
- [x] `Buy → personalize → print → play` explanation.
- [x] Re-edit/re-print promise explained accurately.
- [x] Trust/payment context.
- [x] Seller identity where appropriate.
- [x] CTA hierarchy.
- [ ] Remove prototype/coming-soon SEO/copy only when product is actually ready for activation.

### Product-content decisions still open
- Adult preparation is currently estimated at **60–90 active minutes after printing** for the complete kit (75–84 pieces and five boxes). This remains a provisional setup estimate and product-optimization issue; it is not promoted as a settled storefront/catalog fact until live setup testing determines whether the kit should be simplified.
- An adult is required for preparation, QR/device assistance and the adult-led Stage 7. `9+` therefore means **mostly independently**, not fully autonomous play.
- Minimum-player/solo compatibility remains unresolved: Stage 4 requires passing a rhythm to another player. A child plus adult host may prove to be the minimum viable team, but this is not yet an approved product claim.
- The materials requirements now correctly include glue in RU/EN/HE because the five box-assembly instructions require it.

### Design requirement
“Route exists” is not completion. Storefront must be judged as a product a stranger can understand and trust.

---

## PHASE 4 — Builder / preview / customer result UX

**Status: PARTIAL**

### Already exists
- Protected builder.
- Saved personalization.
- Localized preview.
- 24-page `QuestDocument`.
- Browser print.

### Required functional QA
- [x] 1 participant (technical lead-only document rendering; not a solo-play claim).
- [x] 8 additional participants / maximum supported team (automated document render).
- [x] Long valid names (automated 80-character render; protected visual QA remains).
- [x] RU (automated canonical preview/document render).
- [x] EN (automated canonical preview/document render).
- [x] HE (automated canonical preview/document render).
- [x] Hebrew RTL (automated markup/direction verification; protected visual QA remains).
- [x] Mixed-direction content (automated document render; protected visual QA remains).
- [ ] Desktop.
- [ ] Mobile.
- [x] Save/error/retry states (automated behavior coverage complete; protected-route device QA remains).

### Required UX/design
- [x] Clear `personalize → save → Ready/result → print` progression.
- [ ] Preview visual hierarchy and A4 scaling implemented; protected desktop/mobile visual QA remains before completion.
- [x] Previous/next/direct-page navigation through all 24 canonical pages.
- [x] Customer-facing Ready/result screen.
- [x] Clear re-edit/re-print route within the builder/result flow.

### Decision
- [x] Browser Print / Save as PDF is the launch-v1 delivery. A generated quest PDF artifact remains deferred unless real browser/mobile testing proves browser print inadequate.

`QuestPrintLab` is an internal QA tool unless explicitly redesigned into a customer feature.

---

## PLANNED STOREFRONT/DISCOVERY FOLLOW-UP — Free Svalbard quest

**Status: IMPLEMENTATION CHECKPOINT COMPLETE / DEVICE QA PARTIAL — the free quest is integrated; physical mobile verification and audio production activation remain open**

Product direction:
- The existing Svalbard / Global Seed Vault quest is intended to become a **free interactive discovery product** in LapLapLa Shop.
- It must not be presented as a fake paid product priced at `0 ₪`.
- By default it should remain outside order, payment and entitlement infrastructure unless its future audit finds a concrete need for otherwise.
- Sound Case #001 remains the paid/personalized product; Svalbard is a discovery/onboarding experience.
- [x] Anonymous browser-local progress persists across reloads, browser restarts, locales and desktop/mobile layouts; explicit replay clears only this quest's progress.
- [x] Static mini-game UI, laboratory item copy, dog-sled results/controls and map controls are localized for RU / EN / HE.
- [x] `/shop` includes a localized free Svalbard discovery card with direct anonymous launch and no commerce or entitlement coupling.
- [x] RU uses the existing Supabase star map; EN and HE share the English SVG from the approved R2 object key. The game keeps the original star IDs and coordinates.
- [x] Mobile Quest #1 layout and RU / EN / HE dialogue are prepared; the star-navigation sequence, informational star clicks, Garage and Laboratory repairs, localized final video selection, and Back to Store are integrated. The desktop quest was confirmed by the owner; full physical-device mobile QA is still pending.
- [x] Add a feature-gated contextual narration-player foundation with manifest-derived RU/EN/HE URLs, page/route-scoped availability, isolated preferences and no gameplay coupling.
- [x] Register the approved contextual narration coverage: 80/83 blocks are tied to real reveal points and all 249 catalog paths are validated.
- [ ] Resolve the three flight-dialogue recording/source-state mismatches, finish preview QA, and separately approve production audio activation. The production flag is not confirmed enabled.
- [ ] Complete physical mobile Quest #1 QA, including mini-game replay and the EN/HE final-video image and controls.

Remaining verification and discovery decisions:
- [x] Establish the real routes, components and data flow for anonymous quest progress, localized maps, narration, and free shop entry.
- [ ] Verify the complete quest on physical mobile devices in RU / EN / HE, including Hebrew RTL.
- [ ] Determine real age/audience, duration and device requirements from the existing quest.
- [x] Confirm the free quest launches without auth, entitlement or payment.
- [x] Identify and use the approved Svalbard poster for storefront merchandising.
- [x] Provide a localized `completed quest → /shop` route through Back to Store.
- [ ] Finish device-level start/completion UX and EN/HE final-video playback checks.

This discovery checkpoint does not complete Phase 1, Phase 4, production activation, or PayPal Live.

---

## PHASE 5 — Refund lifecycle + legal readiness

**Status: FULL REFUND CANDIDATE LOCAL / MIGRATION PENDING / LEGAL PARTIAL**

### Refund technical lifecycle
- [ ] Define full refund lifecycle. A local implementation candidate covers full PayPal refunds and entitlement revocation; it requires migration, environment configuration, authorized QA and a controlled Sandbox test before DONE.
- [ ] Define partial refund lifecycle.
- [ ] Define reversal lifecycle.
- [ ] Define dispute/chargeback lifecycle.
- [ ] Define entitlement transition (`active → refunded/revoked/...`). Full-refund candidate uses `active → refunded` in one database transaction after verified PayPal completion; not deployed or tested against the applied schema.
- [x] Confirm accounting model and preserve original receipt as an immutable accounting document.
- [ ] Design and implement linked append-only corrective accounting records without changing the original receipt.
- [ ] Derive no/partial/full refund and net amount from linked refund operations rather than a standalone boolean.
- [ ] Preserve bidirectional traceability between original receipt/order and corrective/refund documents.
- [ ] Deliver the corrective/refund document to the customer and retain the business copy; delivery method remains undecided.
- [ ] Show refund/correction lifecycle in Commerce.
- [ ] Show appropriate state to customer.

### Full-refund Commerce Admin candidate (2026-10-14)
- The authorized Admin order page gains a full-refund review and confirmation action. The Admin server verifies the capture and environment with PayPal before one monetary request; an existing operation prevents another request. Unknown outcomes require provider verification and never trigger automatic refund retries.
- `20261013214846_commerce_full_refund_operations.sql` is **local only, NOT APPLIED**. It adds a private one-operation-per-order record and an atomic service-role completion function that marks the entitlement `refunded` while preserving the paid order and personalization. Sandbox records require no accounting documents. Live records remain `pending_manual` until the accountant-approved correction process is completed separately; the original receipt stays immutable.
- Commerce Admin and public Shop are separate releases. Deploy the schema first after review, then the Admin server/UI with environment-specific PayPal credentials and refund feature flags. Do not enable the action or run the owner's existing test refund until migration and authorized Sandbox QA pass. Public sales remain NO-GO.

### Legal/customer-facing texts
- [ ] Update Privacy: remove false statement that PayPal is not used.
- [ ] Describe billing name processing.
- [ ] Describe PayPal transaction references/payment processing appropriately.
- [ ] Describe receipt/accounting records and private receipt PDF storage.
- [ ] Explain retention of legally required financial records despite account deletion where applicable.
- [ ] Terms of Sale for digital/printable product.
- [ ] Refund/cancellation policy.
- [ ] Printable-product license.
- [ ] Define personal/family/group-use boundaries.
- [ ] Prohibit resale/public redistribution appropriately.
- [ ] Confirm electronic-document consent wording/requirement.
- [ ] Publish seller identity/contact details accurately.

### Customer support contact center
- [x] Implement localized RU/EN/HE request form and private request storage in code, including own-order selection and owner notification integration.
- [x] Apply and verify both support-request and Discord-delivery migrations manually in Supabase; CLI migration history still needs synchronization by Antigravity.
- [x] Confirm local Resend acceptance and receipt in the owner mailbox, plus independent Discord delivery, with a real test request.
- [x] Implement Upstash rate limiting, failed/uncertain review handling and deduplicated notification claims in code.
- [ ] Verify production environment variables after deployment; local configuration does not establish production readiness.
- [ ] Verify production distributed rate limiting and the recovery cron.
- [ ] Monitor failed/uncertain notifications manually and verify the form on a physical mobile device.
- [ ] Review Privacy text for support-message processing and retention before public activation.

### Checkout consent and original-receipt delivery checkpoint (2026-10-13)
- [x] The owner applied `202610130001_create_checkout_consents.sql` manually. Read-only inspection confirmed both tables, columns, indexes, constraints, triggers, functions and RLS in the target Supabase schema.
- [x] The owner registered the already-applied `202610130001` migration with official Supabase migration repair and verified `25/25` local and remote migration versions match. The SQL must not be applied again.
- [ ] Effective `service_role` table privileges still include `TRUNCATE` through the project's default grants; the SQL migration does not revoke them. Review least-privilege hardening separately before Live use of immutable consent/delivery evidence. `anon` and `authenticated` have no direct table privileges.
- [x] Local checkout code now reuses matching immutable consent evidence before attempting an insert. A concurrent insert rejected by the applied `BEFORE INSERT` trigger can recover from the first request's matching row; missing or mismatched evidence fails closed. Local PostgreSQL trigger and checkout regression tests pass.
- [ ] Original-receipt email delivery and account copy access still require activation, a controlled end-to-end check, and operator visibility for failed/uncertain delivery before Live sales.
- **Receipt Delivery status:** CODE READY / ISOLATED TESTS PASS / RESEND PDF TRANSPORT TEST: PASS / ORIGINAL DELIVERY E2E PENDING. The owner confirmed actual Gmail receipt and successful opening of the synthetic PDF after one Resend HTTP 200 acceptance; this was not an original receipt and did not touch the receipt ledger.
- **Next required launch task:** Receipt Original Email Delivery E2E in a controlled environment, including original email acceptance, delivery-state recovery, and customer account copy access. Do not use a real payment or send a real accounting document during automated checks.

Seller identity canonical data:
- Business: `אומנצ׳קים`
- Owner: `יוליה נואה מכלין`
- Status: `עוסק פטור`
- Business/tax number: `337738868`
- Address: restricted to accounting receipts and the private receipt issuer profile; legal disclosure review remains open.
- Contact: `omanchikim@gmail.com`

---

## PHASE 6 — Operator playbook

**Status: PARTIAL — local runbook draft prepared, operator acceptance pending**

Create a short operational guide, not a giant manual.

It must cover:
- [ ] New purchase: expected healthy state.
- [ ] “I paid but got nothing”.
- [ ] Paid but entitlement missing.
- [ ] Entitlement exists but receipt missing.
- [ ] Receipt exists but original/copy artifact missing.
- [ ] Discord notification missing.
- [ ] Pending/capture_pending.
- [ ] Needs review.
- [ ] Legacy Unknown environment.
- [ ] Refund request.
- [ ] Dispute/chargeback.
- [ ] What must NEVER be edited manually in Supabase.

The local Commerce Admin runbook draft now covers the healthy paid order, missing entitlement/PDF, failed or uncertain original email delivery, webhook replay and refund escalation. It explicitly forbids blind resend and changing immutable evidence. Review and approve it with the operator and accountant before the first sale; the draft does not complete this phase.

This playbook should reference Commerce UI wherever possible rather than direct DB inspection.

---

## PHASE 7 — Production activation

**Status: NOT STARTED**

Only after preceding launch blockers are resolved.

- [ ] Create/configure PayPal Live app credentials.
- [ ] Configure Live webhook.
- [ ] Configure/verify required Production env.
- [ ] Remove Sandbox-only checkout gate.
- [ ] Remove Sandbox customer-facing copy.
- [ ] Activate Sound Case #001 from `coming-soon` at the correct moment.
- [ ] Verify production seller/payment copy.
- [ ] Controlled Production deploy.
- [ ] No casual staging→main merge: audit exact release delta first.

### Production readiness audit checkpoint (2026-10-13)
- [x] Current uncommitted Shop/receipt tree passes 1,297 Vitest tests, TypeScript, ESLint and local production build. Build success is not a deployed purchase test.
- [x] Read-only Supabase inspection confirmed 25 migration history entries, including `202610130001`, and a private `receipt-pdfs` bucket limited to PDF and 2 MiB. Production application service-role access and actual Storage upload remain unverified.
- [x] Inspect Vercel deployment metadata, domains and env names/scopes without opening secret values: latest visible Production deployment is `4922379` from `main` (2026-10-05); newer `staging-updated` builds are Preview. `www.laplapla.com` is marked Valid Configuration / Production, with apex redirected to www. `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RECEIPT_PDF_STORAGE_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and Upstash variables are listed for Production. This confirms presence only, not values, connectivity or use by the currently deployed revision.
- [ ] Add and verify Production PayPal Live configuration and `RECEIPT_ORIGINAL_EMAIL_ENABLED` in a controlled activation step. Vercel project and shared-variable searches found no `PAYPAL_*` variables or receipt-original flag on 2026-10-13; verify PayPal app/webhook in the provider dashboard as well. This checkout has no `.vercel/project.json` link, and local `.env.local` is not Production evidence.
- [ ] Resolve public Shop routes: a read-only HTTPS check of `www.laplapla.com` returned 200 for `/`, but 404 for `/shop`, `/en/shop`, `/he/shop`, the product route and `/api/shop/paypal/config`. Determine deployed revision/routing before activation.
- [ ] Remove the explicit Sandbox-only checkout page gate and Sandbox customer copy in a reviewed release; keep Sound Case #001 `coming-soon` until the controlled activation window. Verify the Live checkout API's receipt-delivery prerequisites and both consent records before PayPal order creation.
- [ ] Before the first real payment, establish operator access to original-delivery `pending/sending/accepted/failed/uncertain` evidence and a documented no-blind-retry procedure. The canonical Commerce Admin currently does not display `receipt_original_deliveries`.
- [ ] Verify a safe manual refund/correction route with the accountant for the first sale; automated refund lifecycle is still unimplemented. Public rollout requires its separate readiness decision.
- [ ] Do not treat the confirmed synthetic Resend PDF transport as original-receipt E2E or provider acceptance as mailbox delivery. Confirm Production cron scheduling, protected access and monitoring after deployment, without running recovery against existing orders during the audit.
- [x] Safe Release Candidate inventory (2026-10-13): 44 pre-existing modified/untracked public-repo paths reviewed. The proposed public release contains 42 Shop implementation/dependency paths plus this Roadmap and `docs/shop-release-candidate-inventory.md`; the one-shot synthetic Resend transport script is related test tooling and excluded. The canonical admin candidate contains six isolated Commerce files; three pre-existing analytics edits remain excluded. No file has been staged or committed.
- [ ] Finish release validation and operator acceptance. Public Shop: 1,297/1,297 Vitest, TypeScript, ESLint and local production build pass. Commerce Admin: 27/27 focused tests, scoped TypeScript, changed-file ESLint and an isolated HEAD-plus-six-file webpack production build pass. Its normal checkout build/typecheck are blocked by pre-existing ignored `scripts/tmp` imports; the full admin suite has six unrelated Content Factory failures. Resolve the local build hygiene and perform authorized admin visual QA before declaring the candidate release-ready.
- [x] Independent manifest isolation check (2026-10-13): all 45 current public changed paths are classified as 44 candidate files and one excluded Resend diagnostic script; all nine admin changed paths are classified as six candidate files and three excluded analytics edits. Clean HEAD-plus-manifest copies reproduce the public 1,297/1,297 Vitest pass, TypeScript, ESLint and production Turbopack build with synthetic public Supabase build parameters. The clean admin candidate passes TypeScript, 19 Commerce-focused tests and a webpack production build with synthetic public build parameters. No service-role secret or original-email code was found in public static bundles.
- [ ] Independent operator acceptance remains open: the clean admin candidate and clean base have the same full-suite result (339/348 versus 332/341 passing; nine baseline failures, including Content Factory suites) and the same repository-wide ESLint findings (95 errors, three warnings). The ignored `scripts/tmp` files are absent from clean checkouts; both clean admin checkouts pass TypeScript and webpack build. An unauthenticated browser request correctly redirects to Google login, but authorized order-detail visual QA across delivery states, mobile and Hebrew RTL is NOT VERIFIED without a synthetic authorized fixture/session. Do not advance to Preview signoff or public sales on this evidence alone.
- [x] Commerce Admin component-level visual QA (2026-10-13): a test-only route in a temporary checkout rendered the actual order-detail JSX with fictional fixtures for missing, pending, sending, accepted, failed and uncertain delivery. Desktop 1440px, tablet 768px, and emulated mobile 390px/320px showed readable receipt/order IDs, status, attempts, provider reference and error code without document horizontal overflow; failed/uncertain warnings were visible. Technical dates and identifiers in the delivery panel were isolated left-to-right after a forced-RTL rendering exposed date-order reversal. This is not a real authorized browser session or a new Hebrew Admin locale.
- [ ] Full authorized Commerce operator browser verification remains open. Use an isolated operator session with synthetic data to confirm the existing auth/allowlist/API path, then perform Preview QA. The component fixture bypassed data fetching only in a temporary test harness; Production authentication and middleware were not changed. Public sales remain NO-GO.
- [ ] Authenticated Commerce integration / Preview signoff (2026-10-13): no safe authorized synthetic operator session or isolated order fixture was available. In a clean local Admin build, unauthenticated order-detail and receipt-original API requests returned 401; the delivery lookup and six UI states remain verified only by focused tests and component-level visual QA. The owner confirmed that authorized Commerce Admin operators may download the original PDF; customers may download only a copy. The existing Admin and customer routes match this rule. Preview environment scopes, live Supabase connectivity and the real authorized API/UI round trip are NOT VERIFIED. Public sales remain NO-GO.
- [ ] **SECRET ROTATION: P0 BEFORE PREVIEW.** A diagnostic command exposed five server-side values from the ignored local `.env.local` in the task tool output: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PAYPAL_CLIENT_SECRET`, `RESEND_API_KEY`, and `UPSTASH_REDIS_REST_TOKEN`. Rotate affected credentials across every consuming local/Preview/Production environment; use provider-specific containment where old and new values cannot overlap. Prioritize immediate containment of the Supabase service-role key and cron secret if either is active beyond local development. The same Supabase service-role value is present in both local repositories. Exact values were not found in tracked/untracked source files, staged or unstaged diffs, or the checked shell history. Vercel scopes, CI/CD logs and provider usage remain NOT VERIFIED. No secret values belong in the release manifest or Roadmap.

### SHOP PREVIEW READINESS — 2026-10-13

**Status: BLOCKED / PUBLIC SALES NO-GO.** This is a local preparation checkpoint, not a Preview deployment or authorization to enable checkout.

- **Git scope:** `staging-updated` at `71b9cb6`. Use the reviewed public Shop manifest in `docs/shop-release-candidate-inventory.md`, plus the mobile-only checkout width fix in its already included `styles/Shop.css`. Exclude `scripts/sendResendPdfTransportTest.ts`. The six-file Commerce Admin candidate in `upload-lessons` is a separate release with three unrelated analytics edits excluded. No files are staged or committed.
- **Build and tests:** local TypeScript, repository ESLint, 1,297/1,297 Vitest tests, production build and `git diff --check` passed. Unauthenticated local browser checks reached RU/EN/HE Shop, product, Sandbox checkout and protected-builder sign-in states; a mobile checkout horizontal overflow was traced to content-box width plus padding and corrected only at `max-width: 520px`. The final production build has no checkout document overflow at emulated 320px or 390px in RU/EN/HE; Hebrew remains RTL. Authorized Google sign-in, Sandbox payment, entitlement, save/print and physical-device behavior remain NOT VERIFIED in this checkpoint.
- **Environment readiness:** Preview Vercel project link, variable names/scopes/values, Sandbox webhook registration and Preview-to-Production Supabase separation are NOT VERIFIED. Local `.env.local` is not Preview evidence: it points to the known Supabase project, has `PAYPAL_ENVIRONMENT=sandbox`, has no `PAYPAL_WEBHOOK_ID`, and has `RECEIPT_ORIGINAL_EMAIL_ENABLED=true`. Never copy that local flag or exposed credentials into Preview. Configure Preview-only Sandbox credentials and a separate compatible Supabase project/private `receipt-pdfs` bucket before state-changing QA. Leave `RECEIPT_ORIGINAL_EMAIL_ENABLED` unset or false and do not configure `CRON_SECRET` for Preview until recovery behavior is separately approved.
- **Security blockers:** exact-value comparison confirms all five current local server secrets still occur in Codex session history; the service-role key is also shared by the local Admin checkout. No exact secret values were found among the 1,121 tracked and untracked public-repo files or 237 generated `.next/static` files checked. Rotation/revocation and scope verification across local, Preview and Production remain P0; server-only secrets must stay out of client bundles.
- **Deployment blockers / owner actions:** confirm rotation and revoke exposed credentials, inspect Vercel Preview and branch-specific scopes without displaying values, establish isolated Supabase and Sandbox webhook configuration, review the exact candidate commits in both repositories, obtain separate Preview deployment approval, then perform Preview smoke tests. Vercel scheduled cron invocations target Production; nevertheless protected Preview cron endpoints must remain inaccessible without a configured secret. Do not use this checkpoint to activate Live payments, original receipt email or public product sales.

### FIRST SALE CRITICAL PATH — 2026-10-14

**Status: local Shop candidate validated; Sandbox purchase not yet exercised; Live/public sales NO-GO.** This checkpoint supersedes the 2026-10-13 Preview planning assumptions where the owner has since made a different decision. The existing Supabase project will be used for controlled Sandbox QA; the owner has accepted deferring credential rotation until testing is complete. Neither decision changes the server-only handling of credentials.

- The reviewed public Shop manifest is `docs/shop-release-candidate-inventory.md`: include its 25 Shop paths, 17 dependencies/tests, this Roadmap and the inventory itself; exclude the one-shot Resend transport script. The separate Commerce Admin candidate remains outside this public-repo commit. No commit or deployment has been made.
- The direct `/shop/sound-case-001/checkout` route is available only when `PAYPAL_ENVIRONMENT=sandbox`; the catalog remains `coming-soon`, so the ordinary product CTA still leads to preorder. A controlled Sandbox buyer may use the direct checkout route after authentication and billing identity setup. Sandbox orders and entitlements will persist in the shared Supabase project, identified by `provider_environment=sandbox`; do not delete or misclassify them as Live sales.
- Sandbox payment cannot create an official receipt: `issue_receipt_for_paid_order` returns `sandbox_order` before issuance, and `receipts_environment_check` permits only `live`. Therefore Sandbox QA cannot verify original-email delivery or customer receipt-copy access; these remain for the first controlled Live purchase. No new migration or accounting change is required for Sandbox safety.
- Local TypeScript, repository ESLint, full Vitest (1,297/1,297), production build and `git diff --check` passed on 2026-10-14. These checks do not verify a real authenticated Sandbox payment or target Vercel environment. Local PayPal is set to Sandbox and original-email delivery is disabled; the local `PAYPAL_WEBHOOK_ID` is missing. Preview PayPal Sandbox credentials, webhook ID, Supabase scopes and feature flags still require owner verification before payment QA. Live checkout remains gated by the Sandbox-only page, `coming-soon` catalog status and server receipt-delivery prerequisites.
- **Next release action:** review and explicitly approve the isolated public Shop commit from the manifest. After a separately approved Preview deployment, verify Sandbox-only configuration, then conduct one controlled Sandbox purchase. Do not enable Live payments, issue a real receipt, or open public sales at this checkpoint.

---

## PHASE 8 — Controlled first genuine Live purchase

**Status: NOT STARTED**

Use real payment. Do not fabricate financial history.

Validate:

`Live PayPal payment`
→ `paid order`
→ `entitlement`
→ `receipt WEB-000001`
→ `original + business copy render`
→ `private receipt-pdfs upload`
→ `receipt_artifacts ready metadata`
→ `SHA/size reconciliation`
→ `purchase Discord notification`
→ `Commerce visibility`
→ `customer account receipt access`
→ `builder access`
→ `personalize/reprint`

For the controlled first purchase, also verify one original email to the purchaser, `receipt_original_deliveries` evidence, and copy-only account download. If provider outcome is `failed` or `uncertain`, stop further sales and perform manual review; never blindly resend the original.

- [ ] Verify customer original visually.
- [ ] Verify business copy visually.
- [ ] Verify first receipt number exactly once.
- [ ] Verify private storage/access boundaries.
- [ ] Verify account/admin behavior.
- [ ] Verify no recovery anomalies.

If a receipt/PDF side effect fails, product access must remain available and recovery should repair the side effect.

---

## PHASE 9 — Public launch

**Status: NOT STARTED**

- [ ] Product publicly purchasable.
- [ ] Purchase CTA open.
- [ ] Approved policies live.
- [ ] Operator playbook ready.
- [ ] Monitoring/recovery confirmed.
- [ ] Storefront/product UX launch-ready.
- [ ] Account/post-purchase UX launch-ready.
- [ ] Commerce operational view launch-ready.

Then begin measuring real customer behavior instead of extending launch infrastructure speculatively.

---

# 4. Design/UX launch track

This is a first-class launch requirement, not “later polish”.

| Surface | Current assessment | Completion |
|---|---|---|
| Shop index | READY — implementation and RU/EN/HE desktop/mobile visual QA complete | [x] |
| Product detail | IMPLEMENTED — provisional age/duration require live playtest validation | [x] |
| Auth transition | NEEDS PASS | [ ] |
| Billing identity | NEEDS PASS | [ ] |
| Checkout | NEEDS PASS | [ ] |
| Purchase success | NEEDS PASS | [ ] |
| Quest builder | PHASE 4A IMPLEMENTED / NEEDS PROTECTED-ROUTE VISUAL QA | [ ] |
| Quest preview | CANONICAL 24-PAGE VIEWER IMPLEMENTED / NEEDS PROTECTED VISUAL QA | [ ] |
| Customer result/print | IMPLEMENTED / NEEDS PHYSICAL PRINTER VALIDATION | [ ] |
| Account | EDIT / OPEN & PRINT INTENTS IMPLEMENTED / NEEDS PROTECTED VISUAL QA | [ ] |
| Commerce list | NEEDS PASS | [ ] |
| Commerce order detail | Operational visibility complete / NEEDS PASS visually | [ ] |

---

# 5. Launch Definition of Done

Do not declare the shop launch-ready until all applicable items are checked.

- [ ] Sound Case #001 is intentionally activated from `coming-soon`.
- [ ] Product page clearly explains and visually demonstrates the product.
- [ ] Price, age/audience, group guidance, languages, format and contents are clear.
- [ ] Production checkout uses PayPal Live and contains no Sandbox messaging.
- [ ] Live PayPal credentials/webhook verified.
- [ ] RU/EN/HE and Hebrew RTL verified across customer purchase journey.
- [ ] Mobile verified across shop, checkout, builder, preview/result and account.
- [ ] Long names and participant boundary cases verified.
- [ ] Loading/error/retry/empty/success states are understandable.
- [x] Account provides a real My purchases experience.
- [x] Customer can return, edit and re-print the purchased quest.
- [ ] Original receipt is delivered once by email and the customer can securely obtain only a marked copy from the account; controlled Production E2E is pending.
- [x] Commerce admin exposes payment, entitlement, receipt, both artifacts, notification and operational problems.
- [x] Admin can securely download original and business copy.
- [x] Stale Takbull placeholder removed.
- [ ] Refund/cancellation policy approved.
- [x] Accounting handling of full and partial refund/correction approved by accountant.
- [ ] Refund lifecycle implemented to required launch scope.
- [ ] Privacy updated for real commerce.
- [ ] Terms of Sale published.
- [ ] Printable-product license published.
- [ ] Seller identity/contact information available to customer.
- [ ] Operator playbook exists.
- [ ] Controlled first genuine Live purchase passed end-to-end.
- [ ] First genuine receipt + both private PDF artifacts verified.
- [ ] Production monitoring/recovery confirmed.
- [ ] Public purchase CTA opened only after launch blockers are closed.

---

# 6. Progress log

Codex must append a concise entry here after every roadmap implementation task.

Use this format:

```text
## YYYY-MM-DD — <task name>
Phase: <phase>
Status: DONE / PARTIAL / BLOCKED
Commits:
- <repo>: <sha> <message>
Completed:
- ...
Remaining in this phase:
- ...
Decisions/blockers:
- ...
Validation:
- ...
```

Do not delete old entries. Do not rewrite history. Update the phase checkboxes/status above when work genuinely changes their state.

### Baseline — 2026-10-08

- Master roadmap created after full launch-readiness audit.
- Current active implementation phase: **Phase 1 — Commerce operational visibility**.
- Receipt renderer Vercel Preview smoke-test: passed.
- Vercel Hobby cron blocker: resolved.
- First genuine Live receipt/artifact E2E: intentionally pending until first real Live purchase.
- `WEB-000001`: unused.
- `main` / Production have not been moved as part of the latest staging diagnostics.

## 2026-10-08 — Commerce operational visibility
Phase: Phase 1
Status: PARTIAL
Commits:
- upload-lessons: `130cd538f474de94e15e279d466da2ecc321c962` `feat: complete commerce order visibility`
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Added sanitized receipt, original/copy artifact, purchase notification and operational-problem visibility to canonical Commerce order detail.
- Added authenticated server-side downloads for existing ready original and business-copy PDFs without exposing private Storage identity to the browser.
- Removed the stale Takbull placeholder.
Remaining in this phase:
- Commerce list/detail visual UX pass.
- Any future recovery actions remain explicitly deferred and must be narrow, idempotent and auditable.
Decisions/blockers:
- No schema change was needed; legacy Sandbox/Unknown orders remain truthful and do not trigger receipt assumptions.
Validation:
- 20 focused Commerce/admin-auth/download tests passed; changed-file ESLint, diff check and secret scan passed.
- Next production build and repository-wide TypeScript remain blocked by pre-existing broken imports in unrelated `scripts/tmp/*`; no Commerce type/build error remained before that blocker.

## 2026-10-08 — Customer purchase history and receipt access
Phase: Phase 2
Status: PARTIAL
Commits:
- capybara_tales: `0fab3787f4a49d6ac5d4a31a3aa577dc0e83ecca` `feat: add customer purchase history`
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Reworked `/account` into a localized RU/EN/HE My purchases experience with truthful payment, access and receipt states.
- Added server-owned purchase aggregation without inventing orders for promo/gift entitlements.
- Added secure authenticated download of the customer `original` receipt PDF; the business `copy` remains inaccessible to customers.
- Added clear return/edit/re-print guidance and responsive RTL-aware account presentation.
Remaining in this phase:
- Decide whether receipt email delivery is required for launch v1 or remains an optional later enhancement.
- Complete final device/browser visual QA together with the launch-wide mobile and RTL pass.
Decisions/blockers:
- Receipt PDF access and quest editing/printing remain separate customer artifacts and flows.
- Legacy, Sandbox and Unknown orders do not gain fabricated receipt availability.
Validation:
- 33 focused customer account, receipt download, access-security, commerce-foundation and billing-identity tests passed.
- TypeScript, changed-file ESLint, production build, diff check and secret scan passed.

## 2026-10-08 — Accountant-confirmed refund accounting model
Phase: Phase 5
Status: READY FOR TECHNICAL DESIGN
Commits:
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Recorded `חשבונית זיכוי + קבלה במינוס` for both full and partial refunds, with the actual refunded amount; the two parts may be represented as one document.
- Recorded separate sequential numbering for `חשבונית זיכוי`, starting at 1, without inventing a display prefix.
- Recorded immutable original receipt/accounting snapshot and append-only linked corrective-document history.
- Recorded bidirectional original/corrective traceability, derived refund totals/net state, and customer delivery plus business retention requirements.
Remaining in this phase:
- Audit existing schema and PayPal event model, then design the technical refund, entitlement, delivery and operational lifecycle.
Decisions/blockers:
- Accounting rules are confirmed; implementation details and entitlement/access behavior remain undecided and unimplemented.
Validation:
- Documentation-only diff reviewed; no database or production behavior was changed.

## 2026-10-08 — Sound Case #001 product merchandising/detail
Phase: Phase 3
Status: PARTIAL
Commits:
- capybara_tales: `0f36db579ec78628e6a3ffce7e5179440afa3873` `feat: redesign Sound Case product page`
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Rebuilt `/shop/sound-case-001` as a product-led page with a clear hero, canonical price, coming-soon preorder CTA, included-materials summary, four-step purchase model, personalization/reprint guidance, practical details and trust/seller context.
- Added an accessible gallery using existing Sound Case banner art and real quest card, vibration-code, singing-dunes and collectible-card assets.
- Completed localized RU/EN/HE copy, Hebrew RTL behavior and responsive desktop/mobile presentation without changing commerce availability.
Remaining in this phase:
- Decide and approve recommended age and approximate activity duration before presenting either as product facts.
- Redesign `/shop` index and complete the wider storefront/mobile launch pass.
- Remove coming-soon/prototype activation copy only in the later Production Activation phase.
Decisions/blockers:
- Existing code/content does not provide an approved recommended age or catalog duration; neither was invented.
- Customer delivery remains browser print; the page does not promise a generated quest download artifact.
Validation:
- 60 focused product, promo and quest-foundation tests passed; TypeScript and changed-file ESLint passed.
- Production build, diff check and secret scan passed.
- Visual QA passed on RU desktop/mobile, HE desktop/mobile and EN desktop: no horizontal overflow, RTL/CTA/gallery correct, and hero/gallery image aspect ratios preserved.

## 2026-10-08 — Sound Case #001 product-content audit
Phase: Phase 3
Status: PARTIAL
Commits:
- capybara_tales: `74a0b5f` `feat: complete shop merchandising` (approved product facts and materials correction)
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Audited the real eight-stage quest, printable kit, QR/audio/device flow and adult-host responsibilities before setting product guidance.
- Approved provisional age guidance: `9+` mostly independently; `7+` with an adult host.
- Approved provisional typical duration: `90–120 minutes`, dependent on group size and pace; larger groups may take longer.
- Added glue to the RU/EN/HE materials requirements because the physical boxes require it.
Remaining in this phase:
- Validate age and duration in a live playtest.
- Measure the provisional `60–90 minute` adult setup estimate and decide whether to simplify the 75–84-piece, five-box kit.
- Decide and validate the minimum player count; solo compatibility is not claimed.
Decisions/blockers:
- An adult remains required for preparation, QR/device support and adult-led Stage 7; `9+` is not described as fully autonomous.
Validation:
- Catalog/detail/storefront tests cover all three localized product facts, glue requirements, absence of solo claims and preservation of coming-soon behavior.

## 2026-10-08 — Shop index merchandising redesign
Phase: Phase 3
Status: PARTIAL
Commits:
- capybara_tales: `74a0b5f` `feat: complete shop merchandising`
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Replaced the generic prototype catalog with a focused one-product storefront hero and launch-quality featured Sound Case section.
- Added real Sound Case banner imagery, canonical catalog price, localized provisional age/duration, languages, printable-interactive format and a truthful product-detail CTA.
- Preserved `coming-soon`, preorder routing, catalog pricing and all payment/activation safeguards.
- Completed RU/EN/HE and RTL responsive presentation without fake future products or image distortion.
Remaining in this phase:
- Live-playtest age/duration, setup burden and minimum-player decisions remain.
- Coming-soon/activation cleanup remains intentionally deferred to Phase 7.
Decisions/blockers:
- The storefront links to product detail rather than bypassing availability, authentication or commerce flow.
Validation:
- 60 focused shop/product/quest tests passed; TypeScript, changed-file ESLint, production build, diff check and secret scan passed.
- Visual QA passed at RU 1440/390, EN 1280, and HE 1440/390: no horizontal overflow or console errors; RTL, CTA hierarchy and responsive image proportions were correct.

## 2026-10-09 — Plan free Svalbard discovery quest
Phase: Planned storefront/discovery follow-up
Status: NOT STARTED
Commits:
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Recorded the product direction for the existing Svalbard / Global Seed Vault quest as a free discovery/onboarding experience rather than a `0 ₪` paid product.
- Scheduled a separate read-only audit and implementation checkpoint after current Phase 4 work and before public launch.
Remaining in this phase:
- Audit routes/data flow, localization, mobile/RTL, product facts, public access, storefront assets and start/completion UX.
- Decide the completion path around the existing approximately two-minute YouTube cartoon and only then add Svalbard to `/shop`.
Decisions/blockers:
- No Svalbard implementation or catalog/storefront change belongs to Phase 4A.
Validation:
- Planning entry only; no Svalbard code was inspected or changed.

## 2026-10-09 — Phase 4A safe builder progression
Phase: Phase 4
Status: PARTIAL
Commits:
- capybara_tales: `9f5be6a` `feat: improve quest builder progression`
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Fixed the edit-during-save race by separating the current draft from the last server-saved snapshot; a stale response cannot overwrite newer typing or unlock Ready for unsaved work.
- Added explicit Saved / Unsaved changes / Saving / Save failed states, retry without draft loss, dirty-page unload protection and a confirmation on the in-surface account link.
- Added localized `Personalize → Ready → Print` progression and a customer-facing Ready result shell; restored valid personalization opens Ready with an explicit Edit action.
- Enforced saved-only printing while preserving image load/decode checks and localized print retry behavior.
- Replaced stale `60–90 minute` play and `20–30 minute` preparation claims: Ready now shows the approved provisional `90–120 minute` play duration, while preparation remains untimed in customer UI.
- Distinguished temporary personalization/access loading failures from sign-in-required and no-entitlement states.
- Confirmed browser Print / Save as PDF as launch-v1 quest delivery; no generated quest artifact pipeline was added.
Remaining in this phase:
- Slice 4B: real 24-page preview hierarchy/scaling/navigation, detailed physically validated print guidance, responsive RU/EN/HE/RTL visual QA with legitimate protected access, long-name and participant-boundary visual QA, and account `Edit` versus `Open & print` refinement.
- Live product playtest still owns solo/minimum-player and preparation-burden decisions.
Decisions/blockers:
- `QuestPrintLab` remains development-only and is not exposed to customers.
- Protected builder/result visual QA was not fabricated because no legitimate local/test authenticated entitlement was available in this checkpoint.
Validation:
- 132 focused builder, personalization, printable-asset, auth, account and shop-foundation tests passed.
- TypeScript, changed-file ESLint, production build, diff check and added-line secret scan passed.

## 2026-10-09 — Phase 4B preview and print UX
Phase: Phase 4
Status: PARTIAL
Commits:
- capybara_tales: `dbb1b3c` `feat: add quest preview and print UX`
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Added a customer-facing real-page preview that selects from the same canonical 24-page definitions and uses the same page renderer as `QuestDocument`; only the selected A4 page is mounted in the visible viewer.
- Added Previous / Next, direct page selection, page indicator, responsive A4-preserving scaling and accessible navigation without exposing `QuestPrintLab`.
- Derived the print plan from canonical side/pair/duplex metadata: single-sided pages `1, 6, 9, 20–22`; long-edge duplex pages `2–5, 7–8, 10–19, 23–24`.
- Added localized concise A4/100%, color/background, duplex, cutting and glue guidance with an explicit physical-printer test warning.
- Preserved saved-snapshot-only printing, asset load/decode blocking, localized failure/retry and added an immediate repeated-print guard.
- Split purchased-product account actions into `Edit personalization` and `Open & print`; query intent cannot bypass auth, entitlement or the requirement for saved personalization.
- Automated lead-only, maximum-team, 80-character and mixed Hebrew/Latin/Cyrillic document rendering across RU/EN/HE; no solo-play claim was introduced.
- Fixed only the approved `/shop` hero regression by widening its text measure and reducing responsive headline scale without changing wording, imagery, CTA, price or availability.
Remaining in this phase:
- Perform protected-route RU/EN/HE desktop/mobile visual QA using a legitimate authenticated entitlement; inspect page readability, long names, mixed direction, touch navigation and account intents.
- Physically test one complete kit: A4 Actual Size, background graphics, every single/duplex range, long-edge orientation, cutting and all five glued boxes.
- Complete any layout corrections revealed by those two real-world checks; only then mark preview scaling, desktop/mobile and Phase 4 design surfaces complete.
Decisions/blockers:
- No safe existing local authenticated entitlement/session fixture was available, so protected visual QA was not fabricated and access controls were not weakened.
- Browser Print / Save as PDF remains launch v1; no generated quest PDF or quest artifact infrastructure was added.
Validation:
- 206 focused preview, document, stage, print-asset, persistence, auth/account and storefront tests passed.
- TypeScript, changed-file ESLint, production build, diff check and added-line secret scan passed.
- Public `/shop` hero QA passed in local Chrome at RU/EN/HE 1440, 1280/820 and 390 px with no horizontal overflow, preserved RTL and unchanged product-detail CTA.

## 2026-10-10 — Svalbard browser-local progress
Phase: Planned storefront/discovery follow-up
Status: IN PROGRESS
Commits:
- capybara_tales: roadmap checkpoint (this commit)
Completed:
- Added one validated, versioned `localStorage` progress contract shared by desktop and mobile quest engines, with migration from the former mobile-only `sessionStorage` page key.
- Persisted semantic page and flight/sail route state across reloads, browser restarts, locale changes and desktop/mobile layout transitions.
- Restored optional Heat, Lab and Garage rooms at their safe entry screens without persisting minigame internals or introducing completion gates.
- Preserved Day 7 as the predictable completed resume screen and added an explicit localized replay control that clears only Svalbard progress.
Remaining in this phase:
- Complete the previously listed discovery audit and the separately approved `/shop` card/details integration.
- Narration production and later audio integration remain separate work.
Decisions/blockers:
- Progress is anonymous and browser-local; no account, cookie, API, Supabase, entitlement or commerce dependency was introduced.
Validation:
- Persistence unit coverage includes first visit, desktop/mobile restore, both routes, all station rooms, invalid/unknown/unavailable storage, locale/layout transitions, restart, completion and hydration overwrite protection.
- Local Chrome QA confirmed EN desktop/mobile Polaris restoration, HE RTL locale continuity, station-room restoration, Day 7 retention and restart to Day 1.

## 2026-10-10 — Svalbard mini-game UI localization
Phase: Planned storefront/discovery follow-up
Status: IN PROGRESS
Completed:
- Localized laboratory item names and Logan feedback, dog-sled run/results controls, dress-up controls, Svalbard labels and mobile map accessibility controls for RU / EN / HE.
- Removed Russian fallback from EN/HE country and sea labels while preserving semantic IDs, progress state and game geometry.
- Kept narration production files and story copy unchanged.
Remaining in this phase:
- Russian labels embedded in the externally loaded star-map SVG still require a separately approved localized asset or safe SVG-label strategy; narration/audio integration remains separate.
Validation:
- 1,115 Vitest tests, TypeScript, changed-file ESLint and production build passed; dedicated localization coverage verifies dictionary parity, laboratory data, dog-sled controls, map labels, geometry invariance and the unchanged narration manifest.

## 2026-10-10 — Free Svalbard shop discovery card
Phase: Planned storefront/discovery follow-up
Status: IN PROGRESS
Completed:
- Added a compact RU/EN/HE free-experience card to `/shop` in the existing `games` category, linking directly to the locale-aware anonymous quest route.
- Kept the experience outside `ShopProduct`, pricing, checkout, PayPal, orders, authentication and entitlements; reused the existing Svalbard station asset.
- Preserved the existing Sound Case catalog entry and commerce behavior unchanged.
Remaining in this phase:
- Star-map SVG localization and narration/audio integration remain separate unfinished tasks.
Validation:
- 1,123 Vitest tests, TypeScript, changed-file ESLint and production build passed.
- Local production-browser QA passed for RU/EN/HE at 1440×900 and 390×844: correct RTL, no horizontal overflow, 48 px mobile CTA, and direct locale-correct quest navigation with no console errors.

## 2026-10-10 — Shop local route recovery after Svalbard catalog update
Phase: Planned storefront/discovery follow-up
Status: RECOVERED — no application routing regression confirmed
Completed:
- Reproduced the local failure on the existing long-running `next dev` process and traced it to a corrupted Turbopack task database in `.next/dev`; its development pages manifest was empty.
- Preserved the Svalbard discovery card and all Sound Case route, authentication and entitlement behavior; no routing or commerce source code required a change.
- Recovered the development server from a fresh generated cache and added focused coverage for RU / EN / HE shop, Sound Case product and protected create route resolution.
Validation:
- Fresh development routing returns `200` for the shop index, Sound Case product and Sound Case create route in RU / EN / HE; the saved-language redirect `/shop → /en/shop` terminates at `200` as designed.
- The existing production build served the same route matrix with `200`, confirming that the failure was limited to the stale development process/cache.

## 2026-10-10 — Shop format positioning and Svalbard playtime
Phase: Planned storefront/discovery follow-up
Status: IN PROGRESS
Completed:
- Updated the RU / EN / HE shop hero so the storefront represents both fully online quests and adventures with printable activities, rather than implying that every quest begins on paper.
- Brought the Svalbard discovery card onto the shared storefront card structure with its approved poster, four localized facts and an explicit no-commerce free status.
- Set the owner-approved Svalbard playtime to `25 minutes or more`, with localized guidance that mini-games and retries affect the total duration.
- Preserved all Sound Case #001 product facts, price, CTA and commerce behavior unchanged.
Validation:
- RU / EN / HE browser QA passed at 1440×900, 768×1024 and 390×844 with no horizontal overflow, fact overlap or RTL regression; mobile CTA remains at least 48 px high.
- Focused storefront tests, TypeScript, changed-file ESLint and the full Vitest suite passed.

## 2026-10-10 — Svalbard contextual narration player foundation
Phase: Planned storefront/discovery follow-up
Status: IN PROGRESS
Completed:
- Added one compact, collapsible RU / EN / HE narration player shared by the mutually exclusive desktop and mobile engines.
- Resolved stable semantic block IDs through the read-only 83-block narration manifest and a centralized feature-gated public-media URL contract; no MP3, upload or cross-language fallback was added.
- Kept audio navigation inside the current semantic page and chosen flight/sail branch, with stop/unload behavior for page, locale and unmount transitions.
- Isolated the two narration preferences from browser-local quest progress and added localized accessible controls, RTL handling and safe-area-aware scoped layout.
Remaining in this phase:
- Keep production playback disabled until Julia-approved MP3 files exist at all 249 manifest paths.
- Register interaction-dependent dialogues, hints, explanations and station details only when their existing game states reveal them; then complete real-file preview QA before enabling the public flag.
- Narration production/review, final-cartoon dubbing and Cloudflare upload remain separate tasks.
Validation:
- Context/catalog/runtime/settings coverage uses a mocked audio element and verifies branch isolation, locale mapping, disabled-CDN behavior, cleanup and progress independence.

## 2026-10-10 — Svalbard narration gameplay integration
Phase: Planned storefront/discovery follow-up
Status: IN PROGRESS — 80/83 blocks integrated; production flag remains disabled
Completed:
- Replaced broad page-level availability with state-driven registrations tied to actually visible desktop/mobile paragraphs, route dialogues, checked quiz explanations, active takeoff hints, star-navigation states and optional station-room overlays.
- Added a compact 83-entry runtime path catalog for the confirmed `https://media.laplapla.com/quests/quest-1/audio/v1/` delivery contract without bundling literary text, production metadata or secrets.
- Classified every manifest ID in an explicit coverage matrix: 80 are integrated, and all 83 retain unique RU / EN / HE paths.
- Verified representative RU / EN / HE objects return HTTP 200 `audio/mpeg` and byte-range requests return HTTP 206.
Remaining in this phase:
- Resolve three flight-dialogue source mismatches before claiming full integration: `straight-5` combines mutually exclusive route text, `zigzag-3` includes a non-rendered line, and `afterCorrect-2` has no current game trigger.
- Complete real-browser preview QA after those source decisions, then obtain separate approval before enabling the production feature flag.
- Final-cartoon dubbing remains a separate task.
Validation:
- Focused narration tests (24), full Vitest (1,159), TypeScript, changed-file ESLint, production build and `git diff --check` passed.
- Local real-file preview confirmed HE playback, HE → EN stop/remap behavior, RU / EN / HE layout at 1440×900, 768×1024 and 390×844, correct RTL and no user-route control overlap or horizontal overflow.

## 2026-10-12 — Mobile home shop access and Svalbard checkpoint
Phase: Planned storefront/discovery follow-up
Status: PARTIAL — Svalbard implementation checkpoint complete; physical mobile and protected editor QA remain open
Commits:
- capybara_tales: `434fdfc` `fix(quests): correct Hebrew video translation notice`
- capybara_tales: this commit — `fix(mobile): prioritize shop on homepage and close Svalbard checkpoint`
Completed:
- Moved the single mobile homepage shop section directly after the animal cards and Sound Case preorder banner, ahead of Novinki; desktop section order and styles remain unchanged.
- Replaced the homepage-only mobile nested mandatory snap scrolling with normal document scrolling so the shop and footer can be reached; kept the mobile header account action compact.
- Recorded the existing Svalbard free-shop entry, RU/EN/HE localization, saved progress, repaired star-navigation and station mini-games, Back to Store, locale-specific final-video configuration, and 80/83 contextual narration coverage.
Remaining in this phase:
- Verify the complete Svalbard mobile quest on physical devices, including game replay and EN/HE final-video playback controls; the owner has confirmed the desktop quest.
- Resolve the three blocked flight narration sources and separately approve production audio activation. Do not infer that the production flag is enabled.
- Mobile protected Sound Case #001 editor QA is **PARTIAL / NOT VERIFIED** on the owner's physical phone: local dev-server sign-in is unavailable there. Protected builder, preview, RTL, save/retry and access boundaries have automated coverage, but authorized device-level visual and print checks remain open. Auth and entitlement were not changed.
- Commerce Phase 1 visual UX, Phase 4 protected device/physical print QA, production activation and PayPal Live remain separate roadmap work.
Decisions/blockers:
- Chrome responsive viewport checks are browser emulation, not physical-device or installed-PWA proof. No credential, auth, audio manifest, R2, Supabase or commerce configuration changed.
Validation:
- Local Chrome checked the homepage at 390×844, 375×812 and 360×800 in RU/EN/HE: section order, one shop section, RTL, normal scroll to footer, no horizontal overflow and localized /shop links. The shop CTA was opened in all three locales.
- Desktop homepage checks at 1440×900 and 1280×800 in RU/EN/HE preserved banner, animal cards, Novinki and shop order, with no horizontal overflow; the change is scoped to mobile rendering and CSS breakpoints.
- 154 focused tests and 1,208 full Vitest tests passed; TypeScript, changed-file ESLint, production build and `git diff --check` passed.

## 2026-10-12 — Homepage shop discoverability and adventure storefront
Phase: Phase 3 — Storefront + merchandising design
Status: PARTIAL — IMPLEMENTED / PHYSICAL MOBILE QA PENDING
Commits:
- capybara_tales: `e03af64` `fix(mobile): improve homepage shop discoverability`
- capybara_tales: this commit — `feat(shop): redesign adventure storefront`
Completed:
- Made the mobile homepage shop entrance recognizable with the existing Svalbard poster and an earlier shop link; kept its position after the Sound Case preorder banner and native document scrolling.
- Shortened the `/shop` hero, kept the real Sound Case and free Svalbard cards first, and placed compact localized directions and format guidance after the products.
- Reused the existing R2 Sound Case banner and Supabase-proxied Svalbard poster; changed no catalog price, status, checkout, storage object or production configuration.
Remaining in this phase:
- Owner to verify mobile scrolling and storefront presentation on a physical Android phone, including fast touch momentum; browser viewport checks are not device proof.
- Product age/duration live playtest, minimum-player decision and preparation-burden decision remain open.
Decisions/blockers:
- Native momentum can still carry an unusually strong gesture past a section; no mandatory snap, gesture interception or artificial delay was added.
- Commerce, PayPal Live, protected editor QA and Svalbard device QA retain their existing statuses.
Validation:
- Local browser checked mobile home at 360×800, 375×812 and 390×844 in RU/EN/HE; `/shop` at 360×800, 375×812, 390×844, 430×932, 1280×800 and 1440×900. RTL, image loading, localized routes and zero horizontal overflow were confirmed. The home shop CTA, Sound Case coming-soon detail, anonymous Svalbard launch and Back to Store were opened in RU.
- 29 focused tests and 1,212 full Vitest tests passed; TypeScript, changed-file ESLint, production build and `git diff --check` passed. Physical Android touch scrolling remains unverified.

## 2026-10-12 — Illustrated homepage shop showcase
Phase: Phase 3 — Storefront + merchandising design
Status: PARTIAL — IMPLEMENTED / PHYSICAL MOBILE QA PENDING
Commit: capybara_tales — `feat(home): redesign shop showcase` (this commit)
Completed:
- Replaced the homepage shop section's old mobile Svalbard poster with the new LapLapLa adventure illustration, optimized as a local WebP; desktop and mobile now share the same visual identity.
- Added a real gradient heading, brief RU/EN/HE copy, accessible localized shop CTA and compact four-direction layout while keeping the homepage section order and `/shop` page unchanged.
Remaining:
- Owner to verify visual presentation and native scrolling on a physical Android phone; browser viewport emulation is not device proof.
Validation:
- Local browser screenshots covered RU/EN/HE at 390×844 and 1440×900; responsive checks also covered 360×800, 375×812, 430×932 and 1280×800 in all three locales. Image proportions, localized CTA links, RTL and no horizontal overflow were confirmed.
- Targeted and full automated checks are recorded in the implementation report.

## 2026-10-12 — Customer support contact center
Phase: Phase 5 — Refund lifecycle + legal readiness
Status: PARTIAL — IMPLEMENTED IN CODE / EXTERNAL CONFIGURATION AND DELIVERY QA PENDING
Commits: none (requested working-tree delivery)
Completed:
- Added RU/EN/HE support form, links from footer/account/checkout, server-side validation, own-order verification, private support-request table migration, and Resend notification with separate acceptance status.
- Added guarded recovery for provider failures; ambiguous send outcomes require review instead of blind retry. Refund approval and payment/refund lifecycles were not changed.
Remaining in this phase:
- Owner confirmed `laplapla.com` is Verified in Resend and created the `LapLapLa Support` API key. Apply the migration; configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL=LapLapLa Support <support@laplapla.com>` and `SUPPORT_NOTIFICATION_EMAIL=juliamakhlinfiurst@gmail.com` as server-only environment variables in the target environment. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` before production use (the support API fails closed without them); verify the protected cron and test a real message through to the owner mailbox. The sender address is outgoing-only and needs no separate mailbox; customer email is used as Reply-To.
- Review support-data wording and retention in Privacy. Legal policy and refund lifecycle remain open.
Validation:
- Automated tests and local browser rendering were checked; no live Supabase migration or Resend email was sent during this task.

## 2026-10-13 — Customer support local delivery checkpoint
Phase: Phase 5 — Refund lifecycle + legal readiness
Status: PARTIAL — LOCAL END-TO-END VERIFIED / PRODUCTION ACTIVATION PENDING
Completed:
- The owner manually applied and verified both support migrations (`20261012171428` and `20261012215203`); Supabase CLI migration-history synchronization is assigned to Antigravity and remains open.
- RU/EN/HE support form, private persistence, Upstash rate limiting, Resend and independent Discord notifications, guarded recovery, failed/uncertain review and submission/notification deduplication are implemented.
- The owner submitted one local test request (`b0e6e2b4-c692-412f-b760-60ce5d075c7d`): the browser confirmed it, Supabase stored it, Gmail received the Resend message and Discord received the alert with the same request ID. The stored statuses were `new`, email `accepted`, Discord created `sent`, Discord review `null`. `accepted` records provider acceptance, not guaranteed delivery for every future message.
Remaining:
- Antigravity must synchronize Supabase CLI migration history without reapplying the SQL. Verify production Vercel variables and the deployed form, then test the protected cron in its target environment.
- Continue manual review of failed/uncertain notification states; complete physical mobile QA and Privacy wording/retention review. Customer Support Center is not yet launched in production.

## 2026-10-13 — Checkout consent schema and recovery checkpoint
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: SCHEMA VERIFIED / MIGRATION HISTORY PENDING / CHECKOUT RECOVERY FIXED LOCALLY
Completed:
- The owner manually applied `202610130001_create_checkout_consents.sql`. Read-only inspection verified the expected schema objects and RLS; the migration version remains absent from the remote registry.
- Fixed the local retry path for an existing `capture_pending` order without changing the applied SQL. Verified the actual `BEFORE INSERT` trigger in isolated PostgreSQL and the application recovery path in automated tests.
Remaining:
- Synchronize migration history without applying SQL again; review inherited `service_role` `TRUNCATE` privileges. Complete receipt-email activation and controlled delivery/copy QA before enabling Live checkout. No real payment or receipt email was sent during this checkpoint.

## 2026-10-13 — Checkout consent migration-history synchronization attempt
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: SCHEMA RECONFIRMED / MIGRATION HISTORY PENDING
Completed:
- Read-only verification confirmed the two tables, migration indexes, functions, triggers and RLS still exist; the registry still contains 24 versions and lacks `202610130001`. Both new tables contained zero rows at this check.
- Confirmed the local Supabase CLI is available, but this checkout is not linked to a project and the CLI has no access token. No repair command or migration SQL was run.
Remaining:
- Authenticate and link the CLI to `wazoncnmsxbjzvbjenpw`, verify the project ref, then use official migration repair to mark `202610130001` applied. Verify 25 versions afterward; original-receipt email delivery and customer copy access remain the next controlled QA task.

## 2026-10-13 — Checkout consent migration history synchronized
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: MIGRATION HISTORY SYNCED (OWNER-VERIFIED 25/25) / RECEIPT ORIGINAL EMAIL DELIVERY E2E NEXT
Completed:
- The owner ran official `supabase migration repair --status applied 202610130001` after manually applying the SQL and verified `supabase migration list` shows 25/25 matching local and remote versions. The existing `checkout_consents` and `receipt_original_deliveries` tables were verified in the prior read-only schema audit.
- The repeat-checkout recovery fix remains implemented and locally tested; no migration SQL was reapplied.
Remaining:
- Complete controlled Receipt Original Email Delivery E2E and customer copy verification, then separately verify target-environment configuration before Live checkout. The inherited `service_role` `TRUNCATE` privilege review remains open.

## 2026-10-13 — Receipt original email delivery readiness check
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: CODE AND ISOLATED TESTS PASS / REAL DELIVERY E2E PENDING
Completed:
- Independently confirmed the remote migration registry contains `202610130001` as its 25th version. Reviewed paid-order finalization, receipt issuance, private PDF artifacts, original Resend delivery, recovery cron, and owner-only account copy download.
- Added local isolated PostgreSQL coverage for concurrent original-delivery claims and no retry after an uncertain result, plus mocked provider coverage for timeout, 429 and 5xx. Hardened the Live checkout configuration gate so a missing PDF Storage bucket blocks order creation before PayPal.
- Generated synthetic original and copy PDFs locally with Chrome; both are single-page A4, and extracted copy text includes `קבלה העתק` and the unchanged receipt number. Full Vitest, TypeScript, ESLint of changed TypeScript files, isolated SQL checks and `git diff --check` passed.
Remaining:
- Local configuration lacks `RECEIPT_ORIGINAL_EMAIL_ENABLED` and `RECEIPT_PDF_STORAGE_BUCKET`; production configuration has not been verified. Verify private bucket configuration and target-environment secrets, then perform a controlled original-email and customer-copy E2E with approved accounting procedure. No real payment or accounting document was created or sent in this check.

## 2026-10-13 — Synthetic Resend PDF transport check prepared
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: CODE READY / ISOLATED TESTS PASS / REAL RESEND TEST PENDING
Completed:
- Prepared and visually inspected a standalone synthetic PDF prominently marked `TEST DOCUMENT — NOT A RECEIPT`, with no purchase, customer, receipt number, or accounting data. A guarded one-shot transport script uses the existing Resend sender and API, without importing commerce modules or accessing Supabase.
- Local `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are present; the configured From matches the previously confirmed sender. An independent read-only Resend domain-list request returned HTTP 401, so sender permission remains technically NOT VERIFIED until an authorized transport test or provider-side check succeeds.
Remaining:
- Obtain explicit owner permission before sending one synthetic PDF email to the owner mailbox. Verify both Resend acceptance and actual mailbox receipt separately. Do not mark original-receipt delivery or Production readiness complete from this transport check.

## 2026-10-13 — Synthetic Resend PDF transport accepted
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: RESEND ACCEPTED / OWNER MAILBOX CONFIRMATION PENDING / ORIGINAL DELIVERY E2E PENDING
Completed:
- With explicit owner permission, sent exactly one synthetic PDF marked `TEST DOCUMENT — NOT A RECEIPT` from the configured sender to the owner mailbox. Resend returned HTTP 200 and an email ID. The one-attempt local guard remains in place; no automatic retry occurred.
- No PayPal call, Supabase write, receipt ledger access, accounting document, recovery cron, or original-delivery feature-flag change occurred.
Remaining:
- Owner to confirm actual receipt and attachment in the mailbox. This transport test does not verify the original receipt workflow or Production configuration.

## 2026-10-13 — Synthetic Resend PDF transport verified in Gmail
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: RESEND PDF TRANSPORT TEST: PASS / ORIGINAL DELIVERY E2E PENDING
Completed:
- The owner confirmed that the one authorized synthetic PDF email arrived in Gmail, its attachment opened, and the PDF contents rendered correctly. Resend returned HTTP 200 with email ID `01a13548-dd1c-7e51-9e97-b77265bdbdb2`; no repeat send occurred.
- This verifies transport of a test PDF only. It does not verify generation, storage, or delivery of an original accounting receipt, customer copy access, or Production configuration.
Remaining:
- Run the receipt issuance, original and copy artifact, mocked email delivery, and account copy flow against an isolated test database. Keep real payments and accounting documents out of the test.

## 2026-10-13 — Isolated receipt delivery lifecycle regression check
Phase: Phase 5 — Legal readiness / Phase 7 dependency
Status: ISOLATED SQL AND MOCKED SERVICE TESTS PASS / ORIGINAL DELIVERY E2E PENDING
Completed:
- Extended the temporary PostgreSQL regression suite to assert that one synthetic paid order retains exactly one receipt, one ready original artifact, one ready copy artifact, and one accepted delivery record after replay. A second delivery claim and a transition from accepted back to sending are rejected. The mock provider ID is test data only.
- Reused existing Vitest coverage for artifact upload and replay, one mocked Resend request with accepted status, and server-side customer ownership and copy-only download. These checks use no production database, real payment, real receipt email, or accounting document.
Remaining:
- The SQL fixture models artifact metadata and mock provider acceptance; Vitest mocks Storage and Resend. A single deployment-level flow with actual private Storage, the target environment, and an approved accounting original has not been performed. Keep original email delivery disabled until that controlled verification and operator readiness are complete.

## 2026-10-13 — Production readiness audit before first controlled sale
Phase: Phase 7 / Phase 8 planning
Status: NO-GO FOR LIVE PURCHASE; AUDIT AND PLAN ONLY
Confirmed:
- The uncommitted Shop/receipt implementation builds locally; 1,297 Vitest tests, TypeScript and ESLint passed. Remote migration history has 25 entries and the PDF Storage bucket is private. The owner verified Gmail delivery and opening of one synthetic PDF; no original accounting receipt was sent.
- The checkout page is explicitly Sandbox-only and Sound Case #001 remains `coming-soon`. During the read-only public check, the HTTPS site root loaded but Shop routes returned 404. The latest visible Vercel Production deployment is `4922379` from `main` (2026-10-05); newer `staging-updated` builds are Preview. Production env names for Resend, Supabase service role, receipt bucket, `CRON_SECRET` and Upstash are present; Vercel searches found no PayPal variables or receipt-original email flag. Commerce Admin has receipt and artifact views but does not expose original-email delivery status.
Not verified:
- Whether configured Production env values are correct and active in the deployed revision, service-role connectivity, PayPal Live app/webhook, PDF upload and original-email/account-copy E2E, cron execution, and any real payment. No Production setting was changed.
Next:
- Review and isolate the uncommitted release delta; restore Shop routes, verify Production configuration and operator response to failed/uncertain delivery, then activate Live checkout only for a monitored controlled purchase. A manual accountant-approved correction route must exist before taking a genuine payment.

## 2026-10-13 — Safe Shop Release Candidate preparation
Phase: Phase 1 / Phase 6 / Phase 7
Status: ISOLATED CANDIDATE IDENTIFIED / PUBLIC SALES NO-GO
Completed:
- Reviewed and classified all 44 pre-existing public-repo changed paths in `docs/shop-release-candidate-inventory.md` and separated the one-shot Resend transport test script from the proposed release. The runtime/legal/checkout/receipt changes remain uncommitted and unstaged. No Live payment or product activation was enabled.
- Added only read-only original-email delivery status to the canonical Commerce Admin order detail through its existing authorized GET API. The page shows five persisted statuses, missing evidence, attempt and provider references, with no resend or edit control. Added seven behavior tests and a concise operator runbook; unrelated analytics edits in the admin checkout were preserved.
- Public Shop: 1,297 Vitest tests, TypeScript, ESLint and production build passed. Admin Commerce: 27 focused tests, scoped TypeScript, changed-file ESLint and an isolated clean HEAD-plus-candidate webpack production build passed. The normal admin checkout typecheck/build fail on pre-existing ignored `scripts/tmp` files, and six full-suite failures belong to Content Factory tests outside Commerce.
Remaining:
- Review the exact candidate manifest, perform admin operator/visual QA, address the admin checkout build hygiene without bundling unrelated scripts, and obtain explicit release approval. Production PayPal, routes, delivery configuration and controlled Live purchase remain blocked/unverified. No commit, deployment or database mutation occurred.

## 2026-10-13 — Independent Shop Release Candidate verification
Phase: Phase 7 release validation
Status: CLEAN CHECKOUT TECHNICAL CHECKS PASS / OPERATOR VISUAL QA NOT VERIFIED / PUBLIC SALES NO-GO
Verified:
- Constructed temporary copies from public `71b9cb6ae0469dc26cc8576dbe100aef8d6fbb95` and admin `130cd538f474de94e15e279d466da2ecc321c962`, overlaying only the 44 public and six admin manifest files. Original source files remained untouched; only this Roadmap was updated. Unrelated analytics edits and the one-shot Resend test script were not included.
- Public candidate: 1,297/1,297 Vitest, TypeScript, ESLint and standard Turbopack production build passed. Admin candidate: TypeScript, 19 Commerce-focused tests and webpack production build passed. Builds used synthetic public Supabase values only, with no live service credentials.
- Full admin tests failed identically on clean base and candidate: nine baseline failures in analytics documentation and Content Factory/remediation suites; the seven candidate Commerce tests passed. Repository-wide Admin ESLint also reports the same 95 errors and three warnings on base and candidate. Ignored `scripts/tmp` files are absent from both clean checkouts, whose TypeScript and webpack builds pass.
- The unauthenticated order-detail route redirected to Google login in an isolated browser context. Server-side authorization and read-only delivery lookup remain covered by focused tests. Authenticated visual state, mobile layout and Hebrew RTL have not been observed in a browser.
Remaining:
- Obtain an authorized synthetic operator fixture/session and complete order-detail visual QA for missing/pending/sending/accepted/failed/uncertain, mobile and RTL. Review the existing Admin baseline lint/test failures separately; do not import Content Factory or analytics changes into this Shop candidate. Then validate Preview deployment and environment configuration under separate approval. Live payment, receipt and public sales remain blocked. No commit, push, merge, migration, email or deployment was performed.

## 2026-10-13 — Commerce Admin synthetic visual QA
Phase: Phase 7 operator validation
Status: COMPONENT VISUAL QA PASS / AUTHENTICATED BROWSER QA PENDING / PUBLIC SALES NO-GO
Verified:
- Rendered the Commerce order-detail component in an isolated test-only local route with six fictional original-delivery states and no Production data. Confirmed status labels, missing evidence, warnings for failed/uncertain, IDs, timestamps, attempts, provider ID and error code. No resend or editable-evidence control appeared.
- Checked 1440px desktop, 768px tablet and 390px/320px mobile emulation. The document had no horizontal overflow; the existing Admin tab strip remains independently horizontally scrollable. Forced RTL exposed date-order reversal in the delivery panel; a minimal display-only bidi isolation was added to dates and technical identifiers, then visually verified at 390px/320px. No general Hebrew Admin localization was introduced.
- After the UI fix, a clean HEAD-plus-six-file Admin checkout passed 19 Commerce-targeted tests, TypeScript, scoped ESLint and webpack production build with synthetic public Supabase build values. QA screenshots contain only fictional data and are stored outside both repositories.
Remaining:
- No real authenticated operator session or live API/Supabase response was used; full authorized browser verification remains NOT VERIFIED. Preview deployment, Production configuration, real payment and receipt delivery remain separate blocked steps. No commit, push, merge, migration, real order, receipt or email was performed.

## 2026-10-13 — Commerce Admin authenticated integration and Preview readiness audit
Phase: Phase 7 operator validation
Status: AUTHENTICATED QA NOT VERIFIED / PREVIEW BLOCKED / PUBLIC SALES NO-GO
Verified:
- Inspected the existing Google OAuth session, `ADMIN_EMAILS` allowlist, server-only service-role client, authorized Commerce order API and read-only original-delivery lookup. A clean local Admin production build with synthetic public configuration returned 401 for unauthenticated order and original-PDF API requests. Focused Commerce tests passed 19/19; clean Admin TypeScript, scoped ESLint and webpack build passed. The prior RTL `<bdi dir="ltr">` display fix remains in the isolated candidate.
- The public Shop candidate passed 63 focused commerce tests, TypeScript, scoped ESLint and a clean standard Turbopack production build with synthetic public configuration. Product status remains `coming-soon`; the checkout page remains Sandbox-only. The candidate includes the applied 25/25 migration source without reapplying it.
- Inspected repository deployment settings and cross-repository contract. Admin Preview requires its own `ADMIN_EMAILS`, public Supabase URL/anon key and server-only Supabase URL/service-role key. Shop Preview needs a compatible schema, private receipt Storage, Sandbox PayPal configuration, and server-only receipt/Resend/cron settings; their current Preview scopes and connectivity were not accessible in this audit. No deployment or environment change was made.
Remaining:
- Establish a safe authorized operator session against synthetic isolated orders and verify the real API-to-UI response for all delivery states. The owner confirmed that authorized Admin access to the original PDF is permitted, while the customer receipt API must remain copy-only; no route change is needed. Review and rotate local credentials exposed in task tool output before Preview.
- Obtain explicit approval for a later Preview-only deployment and scope-by-scope environment review. Do not enable Live checkout, original-email sending, public product availability or public sales. No commit, push, merge, migration, payment, receipt, email or deployment occurred in this audit.

## 2026-10-13 — Receipt PDF access decision
Phase: Phase 7 operator validation
Status: ACCESS RULE CONFIRMED / AUTHENTICATED QA STILL PENDING / PUBLIC SALES NO-GO
- The owner confirmed that an authorized Commerce Admin operator may download the original receipt PDF. Customers may download only a copy. The existing protected Admin route and copy-only customer API follow this distinction; no receipt route was changed.
- The original-download interpretation is no longer a Preview decision blocker. Authorized operator integration QA, Preview environment verification and credential rotation remain open.

## 2026-10-13 — Security recovery before Preview
Phase: Phase 7 release security
Status: SECRET ROTATION P0 BEFORE PREVIEW / PUBLIC SALES NO-GO
- Confirmed that a prior diagnostic command printed five local server secrets into the task tool response. The local `.env.local` is ignored by Git; a value-only scan found no copies in repository source, staged/unstaged diffs or checked shell history. This does not prove that external logs, backups, CI/CD history or provider dashboards contain no copies; those locations were not accessible for verification.
- The one-shot synthetic Resend PDF script prints only reviewed sender/recipient/attachment metadata, HTTP status, provider email ID and sanitized errors; the isolated Commerce SQL test script does not print environment variables. The exposure came from an ad hoc environment-file search, not from either script. Future diagnostics must output variable names or presence booleans only.
- Owner action: identify every local, Preview and Production consumer; create replacement credentials or a replacement Upstash database as applicable; update/redeploy all consumers; verify safe health checks; then revoke old credentials. For high-privilege Supabase and cron access, assess immediate containment even if dependent features must pause. Do not advance to Preview before rotation and scope verification. No credentials or deployment were changed in this audit.

## 2026-10-13 — Shop Preview release preparation
Phase: Phase 7 release validation
Status: LOCAL BUILD PASS / PREVIEW ENV NOT VERIFIED / SECRET ROTATION P0 / PUBLIC SALES NO-GO
- Rechecked the existing 44-file public release scope and separate six-file Admin scope; the one-shot Resend diagnostic and unrelated Admin analytics edits remain excluded. The existing Shop candidate passes TypeScript, ESLint, 1,297 Vitest tests and production build. A local unauthenticated RU/EN/HE mobile browser check exposed checkout horizontal overflow; a scoped CSS box-sizing correction was added without changing payment logic and verified at emulated 320px/390px.
- Local values for all five previously exposed server secrets still match Codex session records; no matching values were found in 1,121 checked public-repo files. Vercel Preview scopes and isolated Supabase connectivity were not accessible. Local `PAYPAL_WEBHOOK_ID` is absent and the local original-email flag is enabled, so `.env.local` is unsuitable as Preview configuration.
- Next owner actions: rotate and verify all exposed credentials, establish isolated Preview Supabase and Sandbox PayPal settings, review candidate boundaries, then explicitly approve a Preview-only deployment. No commit, push, merge, deploy, migration, payment, receipt or email was performed.

---

## 2026-10-14 — Full-refund Commerce Admin candidate
Phase: Phase 5
Status: LOCAL IMPLEMENTATION / MIGRATION NOT APPLIED / SANDBOX REFUND NOT RUN
- Prepared a separate private refund-operation migration in the public repository and an authenticated full-refund action in the canonical Commerce Admin. The flow verifies PayPal environment/capture/amount, records one operation before the provider call, and revokes access only after provider confirmation. Uncertain outcomes need read-only PayPal reconciliation; no automatic second monetary request is made.
- Sandbox creates no accounting document. Live is explicitly `pending_manual` for the accountant-approved correction workflow. The original order, receipt and personalization remain unchanged. The current owner purchase and entitlement have not been modified.
- Local checks: public Vitest 1,299/1,299, TypeScript, scoped ESLint and production build passed. Admin Commerce-focused tests, scoped TypeScript, scoped ESLint and an isolated production build passed. The ordinary Admin typecheck is blocked by pre-existing ignored `scripts/tmp` imports; its full suite still has six unrelated Content Factory failures. No real PayPal refund or authorized operator browser test occurred.
- The Admin implementation needs the new migration, environment-specific PayPal credentials, explicit refund flags, authorized UI/API QA, and one controlled Sandbox refund before it can be called ready for manual operation. Partial refunds, disputes, and automatic corrective documents remain outside this candidate. Public sales remain NO-GO.

## 2026-10-18 — Production release readiness audit
Phase: Phase 7 release validation
Status: LOCAL SHOP CHECKS PASS / MIGRATION HISTORY 25 OF 28 / PRODUCTION NO-GO
- Read-only Supabase inspection found 25 registered versions and 28 local SQL files. The three unregistered versions are `20261013214846`, `20261014231224`, and `20261017195749`. Their tables, columns, constraints, indexes, triggers, RLS and grants match the local files; all eight function bodies match the local SQL. Prepare official linked-project migration-history repair in ascending order only after separate owner approval. Do not rerun the SQL.
- Public Shop: TypeScript, ESLint, 1,368 Vitest tests, isolated PostgreSQL commerce SQL regression tests, production build and `git diff --check` passed. Commerce Admin: 31 focused Commerce tests, scoped ESLint and an isolated clean webpack production build passed. Its ordinary typecheck/build are blocked by pre-existing ignored `scripts/tmp` imports; its full suite has six unrelated Content Factory failures, and repository-wide ESLint reports unrelated errors.
- Both local branches are two commits ahead of their verified remote heads; release changes remain uncommitted. Keep Admin analytics edits, generated `next-env.d.ts` and the one-shot Resend diagnostic script outside release commits. Public `/shop` returned 404 on both HTTPS domains at audit time. Production Vercel environment scopes, PayPal Live credentials/webhook, original receipt delivery and the first real payment remain unverified. No migration history, Production setting, payment, email, Git commit or deployment was changed.
- Next: obtain approval for migration-history repair, review isolated Shop/Admin commit manifests, verify Production environment variables and operator procedures, then perform one monitored Live purchase under separate approval. Public sales remain NO-GO.

## 2026-10-18 — Migration history repair completed
Phase: Phase 7 release validation
Status: 28/28 LOCAL AND REMOTE VERSIONS MATCH / PRODUCTION NO-GO
- The owner authorized official linked-project history repair for `20261013214846`, `20261014231224` and `20261017195749`. All three commands succeeded. The previous 25 versions were preserved; public schema and data fingerprints matched before and after. No SQL migration was rerun.

---

# 7. Instructions for every future Codex prompt

Every launch-related implementation prompt should begin with these requirements:

1. Read this roadmap first.
2. Identify the active phase and exact checklist items being worked on.
3. Inspect actual code before proposing/changing implementation.
4. Do not silently expand scope into later phases.
5. Do not mark a design surface DONE merely because it functions technically.
6. Preserve accounting/payment immutability and server-trust boundaries.
7. Preserve the confirmed refund accounting invariants and do not invent unapproved implementation or legal details.
8. At task end, update this roadmap:
   - relevant phase status/checklist;
   - Progress log entry;
   - remaining work/blockers.
9. Commit the roadmap update together with the implementation in the repository where this roadmap is stored, unless the prompt explicitly says otherwise.
10. Report exactly what roadmap items changed status.
