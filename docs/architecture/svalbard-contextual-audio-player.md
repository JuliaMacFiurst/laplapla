# Svalbard contextual narration player

## Runtime architecture

The quest mounts one `QuestNarrationScope` around the active semantic page in either `QuestEngine` or `Quest1MobileEngine`. Page and game components register only narration block IDs whose source text is currently visible. The scope combines those registrations in manifest order and gives the resulting list to the single compact `QuestNarrationPlayer`.

```text
quest page/game state
  -> mounted visible-text component
  -> useAvailableNarrationBlocks(registrationKey, blockIds)
  -> QuestNarrationScope
  -> ordered active block IDs
  -> compact audio catalog
  -> CDN URL
  -> QuestNarrationPlayer
```

Registration is state-driven React context, not DOM inspection, timers or CSS visibility. `QuestNarrationScope` is keyed by `pageId`, so leaving a page synchronously removes its registrations and unloads the old audio source. Audio controls never call quest navigation or mutate game state.

## Catalog and delivery contract

The authoritative production source remains `docs/production/svalbard-audio-v1/manifest.json`. Runtime code uses the generated, compact `narration/audioPaths.ts` map containing only stable block ID, manifest order and locale-independent relative path. It deliberately excludes displayed text, hashes, WAV/TTS metadata and production reports from the client bundle.

Confirmed public delivery configuration:

```text
origin: https://media.laplapla.com
prefix: quests/quest-1/audio/v1
URL:    <origin>/<prefix>/<locale>/<relative-path>
```

Example:

```text
https://media.laplapla.com/quests/quest-1/audio/v1/he/day05/station/intro/04.mp3
```

`NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL` overrides the origin only; it should not contain the quest prefix. The resolver normalizes trailing slashes and also tolerates an older local value that already ends in the prefix, appending the prefix exactly once. There is no API proxy, Supabase dependency, secret or cross-language fallback.

## Feature flag and local testing

The player remains absent unless the public feature flag is explicitly enabled:

```text
NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED=true
NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL=https://media.laplapla.com
```

The default is disabled. Do not enable the flag in production configuration as part of repository integration. For an isolated local run, pass these variables only to the local dev/build process or add them to an uncommitted `.env.local` without replacing existing values.

## Availability and branching rules

- Static story blocks register while their text component is mounted. Mobile progressive text registers only the revealed slice.
- Flight and sail dialogue IDs are mapped from the active dialogue key; choosing one route never registers the other route.
- Quiz explanations register only after the corresponding checked/answered state makes the explanation visible.
- Takeoff hints register only while the selected switch hint is open.
- Star-dialogue and arrival blocks follow the visible dialogue/video state.
- Garage equipment narration follows the currently opened part popup. Lab instructions exist only while the instruction overlay is visible.
- Optional station rooms have independent page scopes; leaving a room removes all of its blocks.

Previous/Next operates only inside the current ordered active list. It cannot choose a route, answer a quiz, open a room, advance a day or reveal a future block. The full 83-block matrix is documented in `svalbard-audio-coverage.md`.

## Playback lifecycle

One native `<audio>` element owns playback. The player:

- starts only after explicit Play;
- may continue after `ended` only to the next already-available block in the same active context;
- stops and clears its source when the selected block disappears, on page change, locale change and unmount;
- preserves the semantic block ID across locale changes when it remains available, but never auto-starts the translated file;
- ignores stale asynchronous `play()` completions after a context or language change;
- surfaces loading/playback failure inline without blocking the quest and allows a later retry.

Settings store only `enabled` and `collapsed` under `laplapla:quest-1:narration:v1`. Narration never reads or writes `laplapla:quest-1:progress:v1`.

## RTL and layout

The existing compact control and safe-area spacing remain unchanged. Hebrew applies text direction to the panel while media controls and game geometry are not mirrored. The elapsed/duration display remains LTR. No per-paragraph controls or playlist are rendered.

## Known limitations

Three manifest recordings cannot be exposed faithfully without changing source content or dialogue behavior:

- `svalbard.day03.flight-dialogue.straight-5` combines the visible `straight_5` reply with `arc_1`, which belongs to a mutually exclusive route choice.
- `svalbard.day03.flight-dialogue.zigzag-3` combines visible `zigzag_3` with `afterCorrect_1`, which the current game never renders.
- `svalbard.day03.flight-dialogue.afterCorrect-2` points to an `afterCorrect` dialogue state that the current game never queues.

These IDs remain catalogued but unavailable, preventing premature or inaccurate narration. They require corrected source recordings/manifest segmentation or a separately approved story/gameplay change. Desktop garage intro narration is integrated; the current mobile garage UI does not render that subtitle, so it is intentionally unavailable there.

## Activation checklist

1. Resolve and approve the three blocked dialogue recordings above.
2. Run the manifest/catalog consistency tests after any approved manifest update.
3. Enable the flag only in a preview environment and play through RU/EN/HE, both routes and all optional rooms.
4. Recheck 1440x900, 768x1024 and 390x844, including iPhone safe area and Hebrew RTL.
5. Enable production only after product approval; production activation is not part of this implementation.
