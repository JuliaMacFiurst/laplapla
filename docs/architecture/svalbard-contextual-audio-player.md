# Svalbard contextual narration player

## Purpose and safety state

The quest uses one compact player per active engine, not one control per paragraph. Desktop and mobile are mutually exclusive at `pages/quests/quest-1.tsx`, so only one `QuestNarrationPlayer` is mounted.

The production UI is off unless both public build variables are configured:

```text
NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED=true
NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL=https://<approved-public-media-origin>
```

With either value absent, no player or broken audio controls are rendered. Google Drive review paths are never accepted as delivery URLs.

## Manifest and URL contract

`narration/catalog.ts` reads `docs/production/svalbard-audio-v1/manifest.json` without modifying it. A stable block ID and locale resolve through the manifest's `audio` map and `delivery.productionObjectPrefix`:

```text
<NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL>/quests/quest-1/audio/v1/<manifest-relative-path>
```

There is no cross-language fallback. A missing locale path or disabled CDN returns `null`.

## Context and branching

The current semantic `Quest1PageId` is the player context. `narration/context.ts` declares only blocks that are already visible or immediately available on that page. Flight and sail have separate lists. Audio Previous/Next moves only within that list and never calls `go`, changes progress, selects a route, opens a station room or completes a game.

Interactive dialogue, takeoff hints, garage-part explanations, quiz explanations and the post-challenge arrival are intentionally not pre-unlocked. Their manifest IDs exist, but exposing them before the related action would reveal future content. When those recordings are approved, each relevant game-state component must add its newly revealed IDs to the typed available-block list at the same transition that reveals the corresponding text. It must not derive IDs from DOM order or displayed text.

The initial mapping is shared by desktop and mobile because both engines use the same semantic page IDs. Changing viewport therefore selects the nearest identical page context without changing game progress.

## Playback lifecycle

One native `<audio>` element owns playback. The player:

- never starts on first page load;
- starts only after explicit Play;
- can continue to the next already available block after `ended`;
- stops and unloads audio on page change, locale change and unmount;
- preserves the semantic block ID when the locale changes, but never auto-starts its translation;
- leaves browser autoplay rejection in a quiet, playable state;
- reports loading failure inline without a modal.

The player stores only `enabled` and `collapsed` under `laplapla:quest-1:narration:v1`. It never reads or writes `laplapla:quest-1:progress:v1`.

## Layout and accessibility

The control is a scoped fixed pill at the bottom of the quest, with safe-area spacing and extra quest-content bottom padding. The collapsed form is one 48 px sound button. Controls have localized RU/EN/HE labels, disabled states, keyboard focus rings and touch-sized targets. Hebrew changes control text direction only; time remains LTR and game geometry is untouched.

## Activation checklist after audio approval

1. Upload only Julia-approved MP3 files with the exact manifest object keys.
2. Verify all 249 public objects and their MIME/cache headers.
3. Configure the approved public media origin and enable flag in a preview environment.
4. Wire dynamic game-state unlocks for all remaining manifest blocks before production activation.
5. Test RU/EN/HE playback, language switches, both branches, optional rooms and failure handling with real files.
6. Recheck 1440×900, 768×1024 and 390×844, including iPhone safe area and Hebrew RTL.
7. Enable production only after the preview check passes; do not use Google Drive or localhost URLs.
