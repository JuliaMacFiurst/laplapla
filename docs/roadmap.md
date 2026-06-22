# LapLapLa Roadmap

## Current Project Phase

Phase:
User Ownership & Monetization Foundation

Current Goal:
Transform LapLapLa from a content platform into a platform where users can create, save, return to and eventually pay for projects.

Next Major Milestone:
User Project Ownership System

Why This Phase:
The media ecosystem, content tools and analytics foundation are now largely in place.

The biggest remaining gap between LapLapLa and revenue is not another content feature.

The gap is:

Guest
↓
Creates Project
↓
Leaves Site
↓
Returns Later
↓
Project Still Exists

Before monetization, users must first have ownership.

Users rarely pay for tools that do not preserve their work.

## Long-Term Business Goal

Primary Goal:

Generate sustainable revenue from LapLapLa while continuing to improve the platform.

Core Principle:

Do not monetize first.

First create:

1. User value
2. Project ownership
3. Return behavior
4. Usage analytics

Only then:

5. Monetization
6. Subscription plans
7. Usage limits

Success looks like:

A user creates something valuable inside LapLapLa and wants to come back tomorrow because their work is waiting for them.

Этот файл является единым источником правды по задачам LapLapLa.
Codex должен обновлять его после выполнения задач или добавления новых задач.

## Как обновлять этот roadmap

Правила для Codex:

- новые задачи добавлять в `Planned` или `Backlog`
- задачи в работе переносить в `Current Focus`
- завершенные задачи переносить в `Done`
- не удалять выполненные задачи, а оставлять их в `Done`
- если задача стала неактуальной, переносить в `Paused / Removed`
- при изменениях добавлять короткую дату обновления
- не плодить отдельные roadmap-файлы
- не хранить здесь секреты, ключи, webhook URLs, env values
- после выполнения любой задачи обновить этот файл, перенести задачу в `Done`, обновить `Current Focus`, добавить дату и кратко описать что сделано
- если пользователь просит "что дальше по списку", читать этот файл и отвечать по нему
- если пользователь просит "добавь задачу в список", добавлять ее в этот файл

## Current Focus

Здесь должны быть только 1-3 задачи, которыми реально занимаемся сейчас.

### Browser-Based Sticker Animation System

Статус: следующий фокус
Приоритет: высокий
Impact: Growth + Content Production
Дата добавления: 2026-06-22
Дата обновления: 2026-06-22

Контекст:
В LapLapLa Studio уже есть sticker overlays, meme search и AI sticker extraction.
Why Now:
Unified Meme Search, AI Sticker Extraction and Bedtime Stories are already implemented. Sticker animation is the next logical layer that turns static assets into reusable storytelling components.
Сейчас в коде уже есть:

- стикеры на слайдах Studio
- позиционирование, размер, rotation, opacity, z-index
- поддержка GIF/WebP/video stickers
- preview/render layer для стикеров
- media picker и LapLapLa/GIPHY sticker sources

Что нужно сделать:

- добавить animation preset selector
- добавить realtime preview выбранного preset
- сохранять serialized animation data в `StudioSticker`
- добавить lightweight motion layer для preview и export playback
- поддержать presets:
  - `cuteFloat`
  - `memeShake`
  - `dramaticZoom`
  - `sleepyDrift`
  - `kawaiiBounce`
  - `suspensePulse`
  - `chaoticSpin`
  - `softHover`
  - `stickerPop`
  - `reactionExplosion`
- использовать GPU-friendly transforms:
  - `translate`
  - `scale`
  - `rotate`
  - `opacity`
- подготовить совместимость с export pipeline

Definition of Done:

- у каждого sticker overlay можно выбрать animation preset
- анимация видна в realtime preview
- animation data сохраняется в проекте
- анимация воспроизводится в Studio preview/export playback
- fallback для старых проектов без animation data не ломается

Связанные файлы:

- `types/studio.ts`
- `lib/`
- `components/studio/StudioRoot.tsx`
- `components/studio/SlideCanvas9x16.tsx`
- `components/studio/StudioPreviewPlayer.tsx`
- `components/studio/StudioSettingsPanel.tsx`

Заметки:
Это отдельный прикладной слой над существующими animated sticker assets. Он не должен зависеть от AI-видеогенерации.
This task remains important because it increases the value of user-created projects and improves future monetization potential.

## Planned

- [ ] User Accounts & Project Ownership Foundation
  - Приоритет: очень высокий
  - Impact: Revenue + Retention
  - Контекст: Сейчас пользователь может создавать контент внутри студий LapLapLa, но у него нет полноценного чувства владения своими проектами. Это главный барьер между текущим состоянием платформы и будущей монетизацией.
  - Что нужно сделать:
    - Этап 1:
      - исследовать текущую систему сохранения проектов
      - определить что хранится локально
      - определить что должно принадлежать пользователю
    - Этап 2:
      - спроектировать user ownership architecture
    - Этап 3:
      - подготовить авторизацию:
        - Google
        - Magic Link
    - Этап 4:
      - связать проекты с пользователями
    - Этап 5:
      - подготовить usage tracking
  - Почему важно: Монетизация без ownership приводит к плохой конверсии. Пользователь должен сначала захотеть сохранить результаты своей работы.
  - Definition of Success:
    - пользователь может создать проект
    - пользователь может сохранить проект
    - пользователь может войти в аккаунт
    - пользователь может увидеть свои проекты позже
    - пользователь может продолжить работу
    - после этого появляется фундамент для тарифов и подписок

- [ ] Analytics event taxonomy cleanup
  - Приоритет: высокий
  - Impact: Product Intelligence
  - Контекст: Product analytics infrastructure уже добавлена, но часть фактических событий в коде называется иначе, чем исходные продуктовые метрики для daily report. Например, Studio пишет `studio_project_created` / `studio_export_completed`, а отчет отдельно ожидает `project_created` / `video_exported`.
  - Что нужно сделать: решить, оставляем ли canonical события `project_created`, `video_exported`, `map_opened` или маппим существующие `studio_*` / `raccoon_map_opened` в отчетах; проверить, что daily report показывает проекты, видеоэкспорты и карты в ожидаемых строках.
  - Почему важно: Инфраструктура аналитики уже работает, но отчет должен совпадать с продуктовыми вопросами пользователя.

- [ ] Story Publishing Ecosystem
  - Приоритет: высокий
  - Impact: Growth + SEO
  - Контекст: Bedtime Story Editor и страница сказок уже сделаны. Сейчас есть базовая библиотека `/bedtime-stories`, reader modal, загрузка exported stories из Supabase и базовые analytics events. Нужно развивать систему коллекций и публикации.
  - Что нужно сделать: коллекции сказок, stamps/markers как навигация по эмоциональным мирам, SEO вокруг сказок, Instagram -> сайт flow, teaser/social strategy, bedtime story archive / ночная библиотека, улучшение discoverability.
  - Почему важно: Это помогает превращать отдельные сказки в полноценную систему публикации и органического роста.

- [ ] Cloudflare R2 Sticker / Media Infrastructure Cleanup
  - Приоритет: средний
  - Impact: Platform Stability
  - Контекст: Есть media/sticker ecosystem, R2 и разные источники. Нужно постепенно привести хранение sticker/media assets к единой архитектуре.
  - Что нужно сделать: проверить где еще есть зависимость от GIPHY, убедиться что production stickers/media идут через R2 где нужно, нормализовать storage paths, проверить Supabase metadata consistency, убрать хаотические media URLs.
  - Почему важно: Единая media-архитектура снижает поломки экспорта, поиска, кеширования и публикации.

- [ ] Pinterest / Recipes Automation
  - Приоритет: средний
  - Impact: Traffic Acquisition
  - Контекст: Recipes foundation уже сделан. Pinterest automation отложена.
  - Что нужно сделать: Pinterest-ready export, auto pin publishing или Make/Zapier, recipe traffic tracking, scheduled recipe pins.
  - Почему важно: Это может дать рецептам отдельный канал трафика и повторяемый publishing flow.

## Blocked

Задачи, которые временно отложены из-за текущих приоритетов или зависят от других систем.

- [ ] YouTube Shorts Auto Import System
  - Статус: Paused
  - Причина: Временно снято с активного roadmap. Сначала развиваем user ownership, retention и фундамент будущей монетизации.
  - Вернуть после появления понятной системы сохранения проектов и пользовательских аккаунтов.

## Ideas Captured

Идеи, которые важно не потерять, но которые пока не готовы к планированию.

- Emotional Geography Graph
  - Связи между сказками, книгами, картами, рецептами и персонажами.

- AI Recommendation Engine
  - Автоматические рекомендации между stories, maps, books, recipes и shorts.

- LapLapLa Night Library
  - Единая эмоциональная библиотека сказок, коллекций и атмосферных миров.

## Backlog

- [ ] Browser-Based Cutout Animation Engine (South Park Style)
  - Приоритет: высокий после базовой монетизации и роста аудитории
  - Статус: Future Platform Direction
  - Дата добавления: 2026-06-22
  - Контекст: Текущий AI-видеопайплайн требует генерации большого количества видеофрагментов через внешние сервисы, что делает производство контента медленным, дорогим и плохо предсказуемым.
  - Основная идея: вместо генерации видеороликов создавать сцены из заранее подготовленных персонажей, объектов и эффектов. LapLapLa должна научиться собирать мультфильмы из JSON-описания сцены и браузерных анимаций.
  - Пример JSON-сцены: `{ "character": "raccoon", "pose": "spy", "expression": "shocked", "animation": "softHover" }`
  - Что исследовать: Character Puppet System, Emotion Packs, Browser Animation Layer, Lip Sync Engine, Scene Builder, Reusable Asset Library.
  - Definition of Success: полноценный ролик собирается за минуты из JSON-сцен без необходимости генерировать большинство видеофрагментов через AI-сервисы.
  - Почему важно: снижает стоимость производства, уменьшает зависимость от AI-видеогенерации, ускоряет создание контента и формирует фирменный визуальный стиль LapLapLa.

Большие идеи и будущие улучшения добавлять сюда, если они еще не готовы к планированию.

## Paused / Removed

Задачи, которые временно убраны или больше не актуальны, переносить сюда с коротким пояснением и датой.

## Done

- [x] Product Analytics + Daily Discord Reports
  - Дата завершения: 2026-06-22
  - Кратко что сделано: добавлены Supabase `analytics_events`, tracking helper, `/api/analytics/event`, daily/weekly analytics reports, cleanup cron, отдельный `DISCORD_ANALYTICS_WEBHOOK_URL`, Vercel Cron и privacy-friendly фильтрация payload без IP/email/fingerprinting. В коде также есть тесты Discord analytics report.

- [x] PWA / Tablet stabilization
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: стабилизирован PWA/tablet опыт.

- [x] Cats Studio tablet stabilization
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: стабилизирована работа Cats Studio на планшетах.

- [x] Books feed optimization
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: оптимизирован feed книг.

- [x] Maps media fixes
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: исправлены media-проблемы в картах.

- [x] Dynamic subtitles + safe zones
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: добавлены динамические субтитры и safe zones.

- [x] Mobile/tablet export isolation
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: изолирован export flow для mobile/tablet.

- [x] Animated sticker editor
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: создан редактор анимированных стикеров.

- [x] Unified Meme / Media Search System
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: объединен поиск meme/media.

- [x] AI Meme Sticker Extraction with rembg
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: добавлена AI-экстракция meme stickers через rembg.

- [x] Bedtime Story Editor
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: создан редактор bedtime stories.

- [x] Bedtime Stories Website
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: создана website-часть для bedtime stories.

- [x] Layered PNG export for Procreate Dreams
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: добавлен layered PNG export для Procreate Dreams.

- [x] Recipes Foundation
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: создана основа recipes-системы.

- [x] Retention Homepage System
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: создана retention-система на homepage.

- [x] SEO homepage primary entity fixes
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: исправлены primary entity SEO-сигналы на homepage.

- [x] Search Console redirect/indexing fixes
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: исправлены redirect/indexing проблемы для Search Console.

- [x] favicon/logo fixes
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: исправлены favicon и logo.

- [x] Author schema / identity architecture
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: добавлена author schema и identity architecture.

- [x] Admin login fix
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: исправлен admin login.

- [x] Parrots DB icons fix
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: исправлены icons в Parrots DB.

- [x] Audio loops auto-refresh
  - Дата завершения: до 2026-06-22
  - Кратко что сделано: добавлен auto-refresh для audio loops.
