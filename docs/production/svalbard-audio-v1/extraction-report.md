# Svalbard Quest narration extraction report

Date: 2026-10-10
Mode: extraction and production handoff only; no audio generation or gameplay integration.

## Scope and source of truth

The source of truth is the existing `quest-1` implementation. The manifest was built from the actual RU/EN/HE application dictionaries and stage-specific text sources. HTML presentation markup is removed in `displayText`; literary wording is otherwise preserved. `spokenText` currently equals `displayText` for every locale. Pronunciation guidance is recorded separately and does not silently rewrite application copy.

Inspected LapLapLa sources:

- `pages/quests/quest-1.tsx`
- `components/Raccoons/quests/quest-1/QuestEngine.tsx`
- `components/Raccoons/quests/quest-1/Quest1MobileEngine.tsx`
- `components/Raccoons/quests/quest-1/QuestTextBlocks.tsx`
- all files under `components/Raccoons/quests/quest-1/pages/`
- all files under `components/Raccoons/quests/quest-1/flight/`, `sail/`, `mobile/` and `logic/`
- `components/Raccoons/quests/quest-1/i18n/ru.ts`
- `components/Raccoons/quests/quest-1/i18n/en.ts`
- `components/Raccoons/quests/quest-1/i18n/he.ts`
- `components/Raccoons/quests/quest-1/i18n/dialogs.ts`
- `components/Raccoons/quests/quest-1/i18n/tests.ts`
- `components/Raccoons/quests/quest-1/i18n/takeoffHints.ts`
- `components/Raccoons/quests/quest-1/logic/lab-game/lab-things.json`
- `lib/publicAssetUrls.ts`
- `next.config.js`

## Classification and inclusion policy

Included:

- story narration and coherent dialogue;
- educational explanations and scientific/contextual passages;
- meaningful instructions that benefit from replayable speech.

Excluded from audio v1:

- buttons, counters, navigation, scores and compact status labels;
- runtime-generated country/sea lists, scores, random results and player-dependent feedback;
- quiz answer options and correctness UI;
- Russian-only lab item labels/comments and dog-sled UI, which must first be localized in application copy;
- audio already embedded in videos, including YouTube IDs `5NhIRwCq428`, `CWf0_sdJOJI` and final cartoon `sE2jxOVG8kU`.

The final cartoon dubbing remains a separate future production task.

## Manifest result

- Blocks: **83**
- Expected audio files: **249** (`83 × RU/EN/HE`)
- Duplicate IDs: **0**
- Duplicate relative audio paths: **0**
- Missing locale texts: **0**

Blocks by stage:

| Stage | Blocks |
|---|---:|
| day01 | 7 |
| day02 | 7 |
| day03 | 25 |
| day04 | 25 |
| day05 | 14 |
| day06 | 4 |
| day07 | 1 |

Blocks by type:

| Type | Blocks |
|---|---:|
| story | 48 |
| educational | 29 |
| game-instruction | 6 |

Estimated spoken-word totals and base duration at ordinary child-friendly narration pace:

| Locale | Words | Approximate clean speech |
|---|---:|---:|
| RU | 1,708 | 12.2 min |
| EN | 2,091 | 14.9 min |
| HE | 1,611 | 13.4 min |

Real exported duration will be longer because of natural pauses. Generation may also create rejected takes. The verified pipelines run locally, so there is no per-character provider bill, but compute time and review effort will exceed the clean-speech duration.

## Desktop/mobile comparison

Both engines consume the same core localized story dictionaries, route dialogues, tests and takeoff hints. Mobile changes presentation, ordering gates and some compact runtime instructions, but does not introduce a separate literary storyline. Therefore the manifest reuses the same recording for both platforms wherever the source text is identical; all current blocks list both `desktop` and `mobile`.

Mobile-only compact prompts such as “Tap the map…” are treated as UI/game microcopy and excluded from narration v1. No duplicate recordings are requested for differently mounted but text-identical content.

## Translation and TTS review findings

The 83 selected blocks have RU/EN/HE source text. No Russian fallback occurs inside these selected manifest entries.

Items requiring human review rather than silent correction:

- English `Spitsbergen`: choose and keep one pronunciation; do not replace the displayed proper name with `Svalbard` without approval.
- Russian `Шпицберген`: confirm consistent stress/pronunciation.
- Hebrew `שפיצברגן`: no niqqud exists in application copy; review pronunciation with a Hebrew speaker and add a manifest-only phonetic `spokenText` override only after approval.
- Scientific terms: orthodrome/ортодромия/אורתודרומיה and Mercator/Меркатор/מרקטור.
- Astronomical names: Merak, Dubhe, Polaris and their RU/HE forms.
- Hebrew gender/register is not fully uniform in the wider game. Example outside the selected linear narration: lab final uses feminine singular wording while much of the quest uses plural or masculine forms.
- Russian-only runtime lab comments and dog-sled result copy are deliberately excluded until application localization is corrected.

No application translation was modified by this task.

## Delivery contract

Manifest relative paths are review/export paths such as:

```text
ru/day01/intro/01.mp3
en/day03/flight-dialogue/intro-1.mp3
he/day05/garage/part-reins/01.mp3
```

Future Cloudflare R2 object keys prepend:

```text
quests/quest-1/audio/v1/
```

Example production key:

```text
quests/quest-1/audio/v1/ru/day01/intro/01.mp3
```

Google Drive is review staging only:

```text
/Users/julia_mac/Library/CloudStorage/GoogleDrive-juliamakhlinfiurst@gmail.com/Мой диск/content-media/99_EXPORTS/Other/laplapla-svalbard-quest-audio-v1/
  manifest.json
  ru/
  en/
  he/
  reports/
```

Nothing was written there in this task.

## Content Factory inspection result

Repository inspected at `/Users/julia_mac/AI-Workspace/content-factory`.

Inspected components:

- `AGENTS.md`
- `docs/NARRATION_PIPELINES.md`
- `docs/narration.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `schemas/narration.schema.json`
- `src/narration/pronunciation.ts`
- `src/export/drive-export.ts`
- `src/media-tools.ts`
- `config/media-tools.json`
- `experiments/chatterbox-multilingual/run.py`
- `experiments/chatterbox-multilingual/hebrew_preprocessing.py`
- `experiments/chatterbox-multilingual/README.md`
- `experiments/f5-russian/run.py`
- `experiments/f5-russian/README.md`
- `projects/laplapla-how-cone-snails-hunt-fish-en-001/generate_narration.py`
- `projects/laplapla-cats-sweet-he-001/generate_narration.py`

Verified capabilities:

| Locale | Pipeline | Voice/configuration | Status | Master format |
|---|---|---|---|---|
| RU | `Misha24-10/F5-TTS_RUSSIAN`, F5-TTS v1 Base v2 + RUAccent 1.5.8.3 `turbo3.1` | creator-derived local reference; do not copy or expose it | accepted human baseline, but architecture marks F5 path partially implemented | PCM WAV, 44.1/48 kHz |
| EN | Chatterbox Multilingual V3, `language_id="en"`, `t3_model="v3"` | creator's private cloned voice; cfg 0.5, exaggeration 0.5, temperature 0.8 | implemented and accepted | 24 kHz WAV, production upsample to 48 kHz PCM |
| HE | Dicta ONNX `dicta-1.0.int8.onnx` niqqud + Chatterbox Multilingual V3, `language_id="he"` | same private creator voice; exaggeration 0.55, cfg 0.5, temperature 0.75, repetition penalty 1.2 | implemented and accepted | 24 kHz WAV, production upsample to 48 kHz PCM |

The private biometric voice references must never be copied, uploaded or printed. Narration generation can run independently from video rendering through locale-specific project generators. Current examples synthesize sequential units and record hashes/durations, but there is no generic 249-file quest batch command and no repository-wide automatic retry policy. A failed unit must therefore be recorded and retried explicitly under an approved attempt limit; successful units must not be regenerated.

Content Factory's canonical narration schema uses per-locale `units` with IDs matching `nar_*`, while this application manifest deliberately uses stable cross-locale `svalbard.*` IDs and delivery paths. The production runner must make a deterministic in-memory/per-run adapter (`nar_` + sanitized stable ID) without changing this source manifest or Content Factory core code.

The native generators output lossless WAV, not MP3. Configured FFmpeg/ffprobe binaries are available through `config/media-tools.json`, so the safe contract is: generate WAV masters, validate them, then encode delivery MP3 files to the exact manifest paths. The existing `src/export/drive-export.ts` supports final MP4 review videos only and cannot be reused for audio export without a code change; the handoff therefore requires an explicit atomic file copy into the approved staging directory.

Cost: no external paid TTS provider is used, so direct API cost is **0**. Exact local compute time, electricity and storage cost cannot be determined from the repository. A complete run is 249 final files plus possible reviewed retries; run one pronunciation pilot per locale before the full batch.

Licensing status:

- Russian F5 upstream and fine-tuned model weights are documented as **CC BY-NC 4.0**. Julia has confirmed that the model developer authorized the intended use and generated recordings; this decision is closed for the production handoff unless new concrete evidence appears.
- Dicta model is documented as CC BY 4.0, but the `dicta-onnx` wrapper license remains unverified for commercial clearance.
- Chatterbox code/model is documented as MIT.

## Validation plan

Automated validation must:

1. Resolve one expected output per manifest block and locale.
2. Reject missing and unexpected files.
3. Reject duplicate IDs, duplicate paths and overwritten outputs.
4. Verify non-zero file size and WAV-master plus MP3-delivery decoding with configured `ffprobe`.
5. Record duration, codec, sample rate, channels and size in `reports/audio-inventory.json`.
6. Flag implausibly short/long duration using text length as a warning, not an automatic linguistic failure.
7. Measure or estimate silence and flag mostly silent output.
8. Preserve failed blocks for targeted retry; do not rerun successful files by default.
9. Produce checksums so later Cloudflare upload can be reconciled with Julia-approved files.

Julia's human review checklist:

- RU, EN and HE naturalness;
- child-friendly clarity and pacing;
- Hebrew pronunciation and gender/register;
- `Spitsbergen` / `Шпицберген` / `שפיצברגן`;
- Merak, Dubhe, Polaris and scientific terms;
- no clipped words, excessive pauses, background music or effects;
- audio faithfully matches displayed text;
- voice remains consistent within each locale.

## Approval gates

Before generation Julia must approve:

1. all 83 block boundaries and selected/excluded categories;
2. any `spokenText` pronunciation overrides;
3. use of the verified creator-voice configuration for each locale;
4. Dicta-wrapper licensing disposition for the HE pipeline; RU F5 intended use is already approved by the model developer according to Julia;
5. the one-narrator-per-locale production rule; character dialogue remains in the same approved narrator voice.
