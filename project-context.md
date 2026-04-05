# Project Context (Codex)

This document tracks the practical state of the Capybara Tales / LapLapLa project and the nearest release priorities.
Current goal: ship a stable, safe public demo with mobile support where feasible and no accidental paid AI usage.

## Current status

### Done recently
- Mobile-first cleanup was completed for the routes where the experience remains usable on phones.
- Complex desktop-only screens now show a clear mobile notice about the future LapLapLa app instead of exposing broken UX.
- The project was aligned to a `Pages Router` setup and the ambiguous `App Router`/`i18n` warning was removed.
- Build hardening is in place:
  - `npm run lint` passes
  - `npm run build` passes
- Server-side env handling was tightened and private keys were checked to make sure they do not leak into the frontend bundle.
- Legacy Gemini-based generation flow was removed from the codebase.
- The old standalone TTS generation script was removed from the repository.
- Raccoons map SVG loading was restored through a server-side API path instead of direct client storage access.
- Dog-sled quest preparation flow is connected end-to-end:
  - `PreparationPopup -> Day5Garage -> DogSledRunStage`
  - `useSledRunConfig` derives run config from the preparation state

### Product decisions already reflected in code
- The project no longer uses Gemini generation in the current shipped flow.
- The old AI coloring backend flow is not part of the active release scope.
- Public demo behavior should rely on safe stored content, fixed assets, database-backed content, or server-controlled APIs.

## Remaining product and gameplay work

### Quest 1 follow-up
- Laboratory mini-game should be reviewed as a complete user flow:
  - player picks expedition items
  - Logan reacts to incorrect choices
- Day 7 should be verified as a complete final sequence:
  - ice cave
  - treasure of time
  - clear ending beat for Quest 1

Acceptance criteria:
- Quest 1 is playable from start to finish without broken steps.
- Narrative transitions are clear on desktop.

## Pre-deploy priorities

### Localization and UX
- Keep RU / EN / HE language support stable across the main user-facing screens.
- Continue checking Hebrew and RTL edge cases on mobile and desktop.

Acceptance criteria:
- Language switch works across the main sections.
- Core marketing and navigation remain readable in Hebrew.

### Safe public demo rules
- No public flow should trigger hidden paid AI generation.
- Desktop-only experiences should stay explicitly marked on mobile until a dedicated mobile version exists.
- Public-facing routes should use server-controlled integrations and safe content sources.

Acceptance criteria:
- No accidental paid generation paths exist in the public demo.
- Unsupported mobile flows are blocked with clear UX copy.

### Deployment readiness
- Validate critical routes manually on real devices and browsers.
- Re-check production environment variables before deployment.
- Keep the repo free of stale helper files and local machine artifacts.

Acceptance criteria:
- Production build is stable.
- Main user journeys work after deploy.

## Future roadmap

### Monetization and access control
- Research real operating costs per feature.
- Decide whether credits, subscriptions, or a hybrid model make sense.
- If monetization is added, enforce it server-side only.

Acceptance criteria:
- Paid usage cannot exceed server-side limits.
- Pricing is tied to real infrastructure cost.

### Creator/editor tooling
- The 9:16 slides/video editor can continue as a separate feature track.
- Prefer safe asset sources, uploads, and licensed media providers.
- Do not reintroduce Gemini-specific generation assumptions into the roadmap unless product requirements change explicitly.

Acceptance criteria:
- Any editor MVP works with approved sources only.
- Export/share flow is reliable.

## Non-goals for now
- No uncontrolled paid AI generation in public mode.
- No rushed payment UX before the demo is stable.
- No unnecessary framework churn if the current `Pages Router` setup remains sufficient.

## Guiding principles
- Safety first: private keys stay server-side and expensive features stay gated.
- Ship pragmatically: prefer small, verifiable steps.
- Demo-first: keep the public experience understandable and stable.
