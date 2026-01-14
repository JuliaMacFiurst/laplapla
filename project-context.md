# Project Context (Codex)

This document is the single source of truth for near-term TODOs and high-level roadmap for the Capybara Tales / LapLapLa project.
Goal: ship a safe, free demo that cannot burn paid API money, then gradually enable auth + credits.

## Current status (as of now)
- Dog-sled quest: Preparation system is connected end-to-end:
  - PreparationPopup -> Day5Garage (prep state) -> DogSledRunStage (prep prop)
  - useSledRunConfig derives run config (speed/runStyle/obstacle rate/risk boost) from prep
  - Debug logs and temporary hit-zones were used during development; must be removed before release.

---



## Priority 2: Next gameplay blocks in Quest 1

### 3) Laboratory mini-game (packing backpack)
- New mini-game: pack a backpack for polar expedition.
- Player must choose only necessary items.
- If unnecessary item is added: Logan (raccoon) makes a funny comment.

Acceptance criteria:
- Clear list of items; feedback is immediate.
- Incorrect choices trigger Logan comments (funny, kid-friendly).

### 4) Day7 page (Ice cave + "treasure of time")
- Scene: dogs + raccoon in an ice cave find a "treasure of time".
- To get it: solve a puzzle (TBD).
- Reward: artifact explains:
  - deep freeze can preserve DNA chains
  - how scientists might revive a mammoth
  - why it’s not done yet (framed as fantasy)

Acceptance criteria:
- Day7 exists and is playable end-to-end.
- Puzzle can be simple placeholder at first; narrative is clear.

### 5) Quest 1 complete
- After Day7, Quest 1 is complete with a satisfying ending.

---

## Priority 3: Pre-deploy hardening (safety + i18n)

### 6) Hebrew translation + language switch
- Add RU/HE language toggle.
- Translate essential UI before deploy (at least marketing + key navigation).
- Use a simple dictionary-based approach (avoid over-engineering).

Acceptance criteria:
- User can switch language from UI.
- Main marketing text + core screens are readable in Hebrew.

### 7) Disable automatic AI generation (replace with safe stubs)
Goal: public demo must NOT trigger paid AI costs.

- "Котики расскажут":
  - show pre-generated example answers
  - if user asks custom question without credits:
    - show pre-generated slides explaining paid access requirement
- "Капибары":
  - pre-written short summaries for ~100 kids books
  - ~30 pre-generated "capybara-made" stories
- "Попугаи":
  - pre-made stories about music styles
  - completely disable generator (page remains free)
- "Енотики (map)":
  - use existing saved DB stories for free
  - if no DB answer exists: show message "available by subscription"

Quest:
- Quest 1 is fully free (no AI generation needed)
- Future quests become subscription-only.

Acceptance criteria:
- No public path triggers paid AI calls without explicit paid access flag.
- Clear UX copy for "subscription required".

---

## Priority 4: Coloring feature risk control (expensive backend)

### 8) Coloring (Google Cloud) cost protection
Problem:
- Each coloring operation costs money; children love it.
Goal:
- Allow each child to try once in free demo WITHOUT runaway costs, even before auth/credits.

Plan (minimal viable protection):
- Add server-side gate + rate limit + one-time demo token per device/session.
- Must not rely only on client-side checks.
- Optimize backend calls (reduce frequency, batch where possible).

Acceptance criteria:
- A new user can do 1 free coloring try.
- Abuse is limited (rate limit + hard cap).
- Costs are predictable and bounded.

---

## Priority 5: Public demo deploy

### 9) Burger menu presentation text + free demo deploy
- Add a presentation/about text:
  - fully author-driven project
  - educational + safe
- Deploy a fully free trial version (no auth yet).
- Validate on real devices/browsers.

Acceptance criteria:
- Deployed demo is stable.
- Paid/expensive endpoints are disabled or gated.
- Clear "about" narrative exists.

---

## Priority 6: Monetization (after demo stability)

### 10) Subscription/credits system
- Research costs (Google & others) per feature:
  - cats / capybaras / parrots / raccoons map / coloring
- Decide pricing + credit packs (3 options).
- Implement auth + purchase flow + credit deduction.

Acceptance criteria:
- No user can exceed paid balance.
- Credits are enforced server-side.

### 11) Content-creator tool (slides/video, shareable)
- Online editor for funny animals slides (9:16), share to social.
- Uses: Gemini, Giphy, Pexels (check licensing for paid editor).
- If any API is not allowed for paid usage:
  - replace with permitted sources
  - add doodle drawing tool
  - allow upload or free image APIs

Acceptance criteria:
- MVP editor works with safe asset sources.
- Share/export flow is reliable.

---

## Non-goals (for now)
- No "perfect" payment UX before demo.
- No unbounded AI generation in public mode.
- No complex i18n framework unless needed.

## Guiding principles
- Safety first: no paid API calls without server-side gating.
- Ship: prefer simple, testable steps.
- Demo-first: show value before scaling automation.