# Antigravity task — LapLapLa Svalbard narration audio v1

## Authorization gate

Do not begin TTS generation merely because this prompt exists. Start generation only after Julia explicitly approves the narration manifest, verified voice/model configuration and licensing gates. Before that approval, perform read-only preflight only.

Do not change LapLapLa gameplay, localization, shop, roadmap, Supabase, Cloudflare or Content Factory source code. Do not upload to Cloudflare. Do not dub or extract any YouTube/cartoon dialogue.

## Inputs

LapLapLa repository:

```text
/Users/julia_mac/AI-Workspace/dev/capybara_tales
```

Authoritative narration manifest:

```text
/Users/julia_mac/AI-Workspace/dev/capybara_tales/docs/production/svalbard-audio-v1/manifest.json
```

Extraction rationale and review notes:

```text
/Users/julia_mac/AI-Workspace/dev/capybara_tales/docs/production/svalbard-audio-v1/extraction-report.md
```

Expected Content Factory repository:

```text
/Users/julia_mac/AI-Workspace/content-factory
```

## Required output location

Google Drive staging/review directory:

```text
/Users/julia_mac/Library/CloudStorage/GoogleDrive-juliamakhlinfiurst@gmail.com/Мой диск/content-media/99_EXPORTS/Other/laplapla-svalbard-quest-audio-v1
```

Required structure:

```text
laplapla-svalbard-quest-audio-v1/
  manifest.json
  ru/
  en/
  he/
  reports/
    generation-summary.json
    audio-inventory.json
    failures.json
    human-review-checklist.md
```

Copy the approved manifest unchanged to the output root. For every `blocks[*].audio[locale]`, write exactly one file at that relative path. Do not rename files manually and do not infer filenames from translated text.

Expected total after a complete successful run:

- 83 manifest blocks;
- locales `ru`, `en`, `he`;
- 249 delivery MP3 files, generated from validated lossless WAV masters;
- no duplicate paths or overwrites.

## Mandatory read-only Content Factory preflight

Before generation:

1. Record Content Factory Git status, branch and HEAD; preserve existing changes.
2. Read its `AGENTS.md` and repository instructions.
3. Reconfirm the documented local pipelines: RU F5-TTS Russian + RUAccent; EN Chatterbox Multilingual V3; HE Dicta ONNX + Chatterbox Multilingual V3.
4. Confirm the private creator-voice references exist, but never print, copy, hash into the public report, upload or expose them.
5. Use the configured FFmpeg/ffprobe from `config/media-tools.json`. Generate lossless WAV masters first, then encode delivery MP3 files. Do not claim native MP3 synthesis.
6. Do not print secrets, tokens, complete environment files or provider credentials.
7. Record that direct API cost is zero because synthesis is local; estimate runtime/storage only after the three-locale pilot.
8. Treat RU F5 intended use as approved: Julia confirmed authorization from the model developer. Do not reopen that decision without new concrete evidence. Stop the HE run if the remaining Dicta-wrapper licensing question has not been resolved.

Narration-only generation is supported by project-specific generators, but no generic quest batch runner currently exists. Do not modify Content Factory core code. Use a task-local production script/config only if Julia's generation approval explicitly authorizes creation of production artifacts; otherwise stop after preflight.

## Voice and rendering requirements

After explicit approval of the provider/model/voices/cost cap:

- Use exactly one approved, consistent narrator voice per locale. Character dialogue must remain in that locale's same narrator voice.
- Generate from `texts[locale].spokenText` only.
- Keep `displayText` as the fidelity reference.
- Respect `pronunciationNotes`; if a phonetic override is needed, propose it and receive approval before changing `spokenText` in any production copy.
- Use natural, child-friendly pacing.
- No music, ambience, sound effects, spoken IDs or technical metadata.
- Avoid unnecessary leading/trailing silence.
- Do not normalize literary wording beyond what is required by the approved `spokenText`.
- Do not include YouTube audio or the final cartoon `sE2jxOVG8kU`.

## Generation procedure

1. Parse and schema-check `manifest.json`.
2. Assert unique block IDs and unique locale output paths.
3. Create only the required scene directories under the staging root.
4. First generate one pronunciation pilot block per locale and wait for Julia's approval; only then generate locale-by-locale so failures and runtime remain attributable.
5. Generate a WAV master per block in a private project-local working area, validate it, encode MP3 with configured FFmpeg, then atomically copy the MP3 to its exact staging relative path.
6. Never overwrite an existing approved file automatically. Compare checksum/configuration and move conflicting attempts to a clearly named review/failure area supported by Content Factory.
7. There is no generic existing automatic retry policy. Default to one initial attempt plus at most two targeted retries for a failed block, only after recording the failure; never regenerate successful blocks.
8. Stop the run on repeated model failure, validation error, missing local dependency or licensing/configuration mismatch.
9. Preserve a failure record containing block ID, locale, relative path, attempt count and sanitized provider error. Never include secrets.

## Automated validation

Validate every expected output:

- exists at the manifest path;
- non-empty;
- decodes as audio;
- both WAV master and MP3 delivery file decode successfully and have the expected codecs;
- duration is non-zero and plausible for its spoken text;
- is not mostly silent;
- was not overwritten by another block;
- maps deterministically to exactly one block ID and locale.

Generate SHA-256 checksums and an inventory containing block ID, locale, relative path, bytes, duration, codec, sample rate, channels and checksum.

Treat duration heuristics and silence detection as warnings requiring review; they cannot prove linguistic correctness.

## Human review package

Create `reports/human-review-checklist.md` with one row per block/locale and fields for approve, regenerate and notes. Highlight:

- Russian naturalness;
- English naturalness;
- Hebrew pronunciation and grammatical register;
- Spitsbergen/Шпицберген/שפיצברגן;
- orthodrome and Mercator terminology;
- Merak, Dubhe and Polaris;
- pacing and child-friendly clarity;
- fidelity to displayed text;
- clipping, noise, silence or inconsistent voice.

Do not upload any result to Cloudflare. Julia must review and approve the staging files first.

## Future production key contract

After a separate approval/upload task, each reviewed relative path will be prefixed with:

```text
quests/quest-1/audio/v1/
```

Example:

```text
quests/quest-1/audio/v1/ru/day01/intro/01.mp3
```

The Google Drive path is staging only and must never be placed in application URLs.

## Failure handling

- Missing Content Factory checkout or model cache: stop; report the missing dependency without downloading or substituting a provider unless separately authorized.
- Unsupported locale/model: stop that locale; do not substitute another language or provider silently.
- Local model/dependency failure: stop safely and preserve completed files plus sanitized failure report.
- Single-block failure: allow at most two targeted retries after the first attempt; record failure if exhausted.
- Validation mismatch or duplicate path: stop before further generation.
- Linguistic uncertainty: flag for Julia; do not guess a phonetic rewrite.

## Final report format

Report in Russian:

1. Content Factory Git state and exact files/configuration inspected.
2. Actual local model and private creator-voice configuration used for each locale, without exposing biometric source paths in exported public metadata.
3. Confirmation that Julia approved generation, the RU authorization was preserved, and the remaining HE Dicta-wrapper question was resolved.
4. Generated/succeeded/failed/skipped counts by locale.
5. Runtime, storage and confirmation of zero direct API cost.
6. Total duration and bytes by locale.
7. Validation results and warnings.
8. Pronunciation uncertainties requiring Julia's review.
9. Exact staging directory and report paths.
10. Confirmation that no Cloudflare upload occurred.
11. Confirmation that no gameplay, localization, shop or Content Factory code was changed.
12. Final Git status of every inspected repository.

Stop after preparing the review package. Wait for Julia's approval before any Cloudflare upload or LapLapLa integration.
