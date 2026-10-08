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
| Customer purchase flow | PARTIAL | Sandbox flow is developed, but product remains `coming-soon` and checkout is Sandbox-only. |
| Storefront design | PARTIAL | Sound Case #001 product detail and shop index now have launch-quality merchandising; age/duration are approved provisional facts pending live playtest, while minimum-player and preparation-burden decisions remain. |
| Builder / preview / print | PARTIAL | Personalization, persistence and printable document exist; customer result UX needs work. |
| Post-purchase UX | PARTIAL | `/account` now provides localized purchase history, truthful access/payment/receipt states, re-edit/re-print entry and secure original-receipt download; email delivery remains optional/not started. |
| Commerce Admin | PARTIAL | Strong read-only foundation; receipt/artifact/notification/recovery visibility is missing. |
| Refund lifecycle | READY FOR TECHNICAL DESIGN | Accountant rules for full/partial refunds and corrective documents are confirmed; technical lifecycle, entitlement behavior and delivery remain unimplemented. |
| Legal | BLOCKED FOR LAUNCH | Privacy/Terms are not yet suitable for real PayPal digital-product sales. |
| Production configuration | NOT STARTED | Live PayPal, product activation and controlled real purchase remain. |

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

`Payment → Customer → Product → Entitlement → Receipt → מקור → העתק → Purchase notification → Operational problems`

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
- [x] Customer can securely access/download receipt original (`מקור`).
- [x] Define/display receipt delivery state where useful.
- [ ] Decide whether launch v1 also sends receipt by email or whether secure account download is the initial delivery channel.
- [x] Explain that purchased quest can be edited and printed again.
- [x] Implement responsive RU/EN/HE + RTL account experience; final device-level launch QA remains in the global launch checklist.

### Important distinction
Receipt PDF access and quest result access are different products/artifacts. Do not conflate them.

---

## PHASE 3 — Storefront + merchandising design

**Status: PARTIAL**

### `/shop`
- [x] Real product imagery.
- [x] Clear product value proposition.
- [x] Strong launch-ready card design.
- [x] Mobile / RU / EN / HE / RTL pass.

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
- [ ] 1 participant.
- [ ] 8 participants.
- [ ] Long names.
- [ ] RU.
- [ ] EN.
- [ ] HE.
- [ ] Hebrew RTL.
- [ ] Mixed-direction content.
- [ ] Desktop.
- [ ] Mobile.
- [ ] Save/error/retry states.

### Required UX/design
- [ ] Clear `personalize → save → preview → get/print result` progression.
- [ ] Preview visual hierarchy and scaling pass.
- [ ] Navigation through preview/result.
- [ ] Customer-facing result screen.
- [ ] Clear re-edit/re-print route.

### Decision
- [ ] Decide whether browser print is sufficient for launch v1 or whether customer quest PDF/download artifact is required.

`QuestPrintLab` is an internal QA tool unless explicitly redesigned into a customer feature.

---

## PHASE 5 — Refund lifecycle + legal readiness

**Status: REFUND READY FOR TECHNICAL DESIGN / LEGAL PARTIAL**

### Refund technical lifecycle
- [ ] Define full refund lifecycle.
- [ ] Define partial refund lifecycle.
- [ ] Define reversal lifecycle.
- [ ] Define dispute/chargeback lifecycle.
- [ ] Define entitlement transition (`active → refunded/revoked/...`).
- [x] Confirm accounting model and preserve original receipt as an immutable accounting document.
- [ ] Design and implement linked append-only corrective accounting records without changing the original receipt.
- [ ] Derive no/partial/full refund and net amount from linked refund operations rather than a standalone boolean.
- [ ] Preserve bidirectional traceability between original receipt/order and corrective/refund documents.
- [ ] Deliver the corrective/refund document to the customer and retain the business copy; delivery method remains undecided.
- [ ] Show refund/correction lifecycle in Commerce.
- [ ] Show appropriate state to customer.

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

Seller identity canonical data:
- Business: `אומנצ׳קים`
- Owner: `יוליה נואה מכלין`
- Status: `עוסק פטור`
- Business/tax number: `337738868`
- Address: `אחדות 18, חריש`
- Contact: `omanchikim@gmail.com`

---

## PHASE 6 — Operator playbook

**Status: NOT STARTED**

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
| Quest builder | NEEDS PASS | [ ] |
| Quest preview | NEEDS PASS | [ ] |
| Customer result/print | MAJORLY UNFINISHED | [ ] |
| Account | NEEDS PASS | [ ] |
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
- [x] Customer can securely obtain receipt original.
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
