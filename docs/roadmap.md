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

  - [ ] AI Content Production Pipeline
  - Приоритет: очень высокий
  - Impact: Content Production + Scale
  - Дата добавления: 2026-08-05
  - Статус: ближайшая реализация

  - Контекст:
    После успешного создания и пилотирования Map Content Writer следующая стратегическая задача — превратить отдельные AI-навыки в автономную систему наполнения базы.

    Пользователь должен задавать только тип и объём работы, например:

    - «Заполни сегодня 50 карт»
    - «Переведи всё непереведённое»
    - «Добавь 20 книг»
    - «Подбери изображения для новых слайдов»
    - «Создай озвучку для 100 объектов»

    IDE-агент должен самостоятельно находить незаполненные записи, запускать подходящий Workspace Skill, выполнять проверку качества и после получения отдельного Mutation Grant сохранять готовые результаты через утверждённые Admin API.

  - Критическое требование Agent UX:
    - система не должна зависеть от истории одного чата Antigravity
    - любой новый чат должен понимать короткие производственные команды без повторного объяснения архитектуры проекта
    - весь необходимый контекст должен храниться в репозитории
    - создать общий маршрутизатор задач проекта: `AGENTS.md` или эквивалентный канонический документ
    - маршрутизатор должен связывать пользовательские команды с соответствующими Workspace Skills
    - текущий статус, разрешённые действия и Mutation Grant каждого навыка всегда читать из его канонических документов
    - новый чат не должен изобретать собственный workflow или использовать внешние платные LLM API

  - Направления реализации:

    1. Автономное заполнение карт
       - короткая команда: «Заполни сегодня N карт»
       - автоматический поиск объектов `map_targets` без RU-истории
       - сохранение `target_id` без каких-либо преобразований
       - генерация контента через Map Content Writer
       - фактчекинг и Quality Gate
       - формирование Candidate for Review
       - на раннем этапе ручная проверка
       - после отдельного Mutation Grant запись через разрешённый Admin API
       - итоговый отчёт: создано, пропущено, остановлено, требует внимания

    2. Multi-language Translator
       - поиск всего непереведённого контента во всех поддерживаемых таблицах
       - перевод на английский и иврит
       - естественный язык вместо буквального перевода
       - смысловая адаптация непереводимых выражений
       - сохранение структуры исходного контента
       - контроль `source_hash`
       - обнаружение и обновление устаревших переводов
       - пакетная обработка с продолжением после остановки

    3. Book Database Builder
       - автоматическое создание и заполнение карточек книг
       - проверка существующих записей и защита от дублей
       - название, автор, год, возрастная группа и описание
       - категории
       - режимы разбора
       - тесты и викторины
       - переводы
       - проверка полноты и качества перед записью

    4. Map Slide Image Curator
       - первый этап: слайды интерактивных карт Енотиков
       - анализ текста каждого слайда
       - выделение главного объекта, животного, места или события
       - формирование точных поисковых запросов
       - подбор релевантных кандидатов из Wikimedia, Pexels и других разрешённых источников
       - проверка лицензии, автора, атрибуции, формата, разрешения и ориентации
       - защита от изображения неправильного животного, страны или объекта
       - сначала режим рекомендаций и ручного выбора
       - затем ограниченная автоматизация после отдельной валидации

    5. Artist Image Curator
       - второй этап системы подбора изображений
       - применение к разделу художников и урокам Пёсиков
       - подбор произведений и иллюстраций по содержанию слайда
       - корректная атрибуция автора и источника
       - устранение текущего fallback-поведения, при котором могут повторно использоваться нерелевантные изображения из базы

    6. Map Voice Generation Pipeline
       - генерация озвучки для слайдов карт
       - выбор подходящего голоса и языка
       - подготовка текста к произношению
       - корректное чтение географических названий
       - генерация аудио
       - проверка длительности, тишины, обрезания и ошибок произношения
       - сохранение файлов и связей с нужными слайдами
       - пакетное создание недостающей озвучки

  - Общая архитектура всех AI-конвейеров:
    - отдельный Workspace Skill для каждой предметной задачи
    - Skill Contract
    - Responsibility Pipeline
    - Quality Gates
    - независимая проверка перед пилотом
    - статусы:
      `RESEARCH → SPECIFICATION → IMPLEMENTED → VALIDATION → PILOT → LIMITED → PRODUCTION_READY`
    - отдельный Mutation Grant для любых записывающих действий
    - чтение production-базы только через точные read-only запросы до получения Mutation Grant
    - запись только через утверждённые Admin API
    - никаких прямых SQL `INSERT`, `UPDATE`, `DELETE` или DDL
    - пакетная обработка больших объёмов
    - continuation cursor для безопасного продолжения работы
    - остановка отдельного проблемного объекта без потери всей партии
    - итоговая статистика и список исключений
    - исполнение через IDE-агента в рамках существующей подписки
    - запрет зависимости от Gemini API, OpenAI API, OpenRouter API и других отдельно оплачиваемых LLM API

  - Короткие пользовательские команды, которые должна поддерживать система:
    - «Заполни сегодня 50 карт»
    - «Продолжи заполнять реки»
    - «Заполни 100 объектов разных типов»
    - «Переведи всё новое на английский и иврит»
    - «Добавь 20 книг»
    - «Подбери картинки для всех новых слайдов карт»
    - «Подбери изображения для художников»
    - «Создай недостающую озвучку карт»
    - «Покажи, что сегодня не удалось обработать»

  - Definition of Success:
    - новый чат Antigravity понимает короткую производственную команду без контекста предыдущей переписки
    - пользователь указывает только задачу и объём
    - система самостоятельно выбирает правильный Workspace Skill
    - находит незаполненные записи
    - выполняет исследование, генерацию и проверку
    - после получения Mutation Grant сохраняет готовые строки через разрешённый API
    - пользователь получает готовый результат в базе и короткий итоговый отчёт
    - проблемные объекты не останавливают всю партию
    - одна архитектура переиспользуется для карт, переводов, книг, изображений и озвучки

  - Почему важно:
    Ручное наполнение базы больше не масштабируется. Эта система должна превратить LapLapLa из проекта с отдельными AI-инструментами в автономную контент-фабрику, где знания и правила хранятся в репозитории, а не в одном бесконечном чате.

    - LapLapLa AI Show Studio / Agentic Creative Workspace
  - Дата добавления: 2026-08-07
  - Статус: Idea Captured / Future Product Direction
  - Контекст: Исследование InVideo AI показало сильный агентный UX для создания повторяемых серий контента: пользователь общается с AI как с творческим сотрудником, а система превращает разговор не только в отдельный ролик, но и в долговременную структуру проекта с персонажами, стилем, знаниями, версиями и правилами серии. Для LapLapLa эту идею нужно развивать не как копию InVideo, а как собственную AI Show Factory, тесно связанную с существующими Studio, Browser Animation Engine, reusable characters и Content Production Pipeline.

  - Главная продуктовая идея:
    Пользователь создаёт не отдельное видео, а `Show` / серию, у которой есть постоянное творческое ДНК. AI ведёт пользователя в разговорном режиме, извлекает уже известные параметры из свободного текста и задаёт только недостающие уточняющие вопросы. Пользователь должен ощущать работу с режиссёром/продюсером, а не заполнение длинной формы.

  - Базовая иерархия проекта:
    - `Show`
      - Show Bible / концепция серии
      - Audience
      - Episode Template
      - Teaching / Narration Method
      - Visual Style
      - Lighting
      - Camera Language
      - Music / Voice rules
      - Characters
      - Episodes
    - `Character`
      - Character Master Sheet
      - appearance / proportions / costume
      - personality
      - voice
      - reusable poses / expressions / motion presets
      - character-specific rules
    - `Episode`
      - brief
      - script versions
      - scenes
      - visual actions
      - voice-over
      - assets
      - render/export state

  - Ключевой UX-паттерн:
    - начать с естественного вопроса вроде `What would you like to create?`
    - пользователь описывает идею свободным текстом
    - AI извлекает известные поля автоматически, например `character`, `audience`, `format`, `subject`, `tone`, `duration`
    - AI спрашивает только то, чего реально не хватает
    - после нескольких ответов показывает компактный `What I understood` / Show DNA summary
    - пользователь может изменить любое правило разговорной командой
    - важные изменения классифицируются по уровню: episode-only, character-level, show-level

  - Видимая проектная память:
    - знания не должны жить только в истории чата
    - постоянные правила хранить как отдельные канонические артефакты проекта
    - пользователь должен видеть, когда агент обновляет конкретный knowledge/style document, а не получать абстрактное обещание «я запомню»
    - возможные сущности: `character.md`, `show-bible.md`, `teaching-method.md`, `visual-style.md`, `episode-template.md`
    - архитектурно это должно напоминать творческий репозиторий: чат является интерфейсом к проекту, а не единственным источником правды

  - Locks / Quality Gates перед масштабированием:
    - Character Lock
    - Visual Style Lock
    - Lighting Lock
    - Voice Lock
    - Episode Format Lock
    - Motion Prototype approval
    - только после успешных lock/preview этапов разрешать пакетное производство следующих выпусков
    - цель: предотвращать character drift, style drift и распространение ошибки на десятки будущих эпизодов

  - Human-in-the-loop:
    - `Approve`
    - `Edit`
    - `Regenerate`
    - `Reject`
    - возможность заменить только одну сцену/реплику/asset без регенерации всего проекта
    - версии сценариев и visual artifacts должны сохраняться, чтобы можно было сравнивать варианты и возвращаться назад

  - Внутренний агентный UX:
    - показывать полезные этапы работы, например `Reading show bible`, `Updating character style`, `Writing episode script`, `Checking continuity`, `Building motion prototype`
    - не имитировать бессмысленную активность: каждая видимая стадия должна соответствовать реальному изменению состояния или артефакта проекта
    - пользователь должен понимать, что именно агент сейчас делает и почему

  - LapLapLa-specific отличие от InVideo:
    - InVideo в основном ведёт к дорогой AI-video generation; LapLapLa должна по возможности превращать утверждённый сценарий в структурированный Scene JSON и собирать повторяемые сцены программно
    - максимально использовать Browser-Based Cutout Animation Engine, sticker/motion presets, reusable characters, SVG/Canvas/WebGL/Rive/Lottie и существующий Studio export pipeline
    - AI-video generation использовать как optional premium/fallback для сцен, которые невозможно или невыгодно собрать программно
    - сценарий должен быть не просто текстом, а production specification с полями вроде `scene_id`, `duration`, `visual_action`, `character_action`, `drawing_action`, `voiceover`, `camera`, `assets`, `locked_elements`, `generated_elements`

  - Экономическая архитектура:
    - обычная детерминированная логика должна отвечать за inheritance, locks, versioning, project graph и validation там, где LLM не нужна
    - повторяющиеся знания не пересылать модели заново без необходимости; использовать компактные structured references / retrieval из канонических документов
    - локальная или on-device LLM в будущем должна иметь возможность выполнять дешёвые задачи: intent parsing, parameter extraction, JSON filling, простые изменения сценария и routing
    - облачные LLM оставить для сложного planning, сильной сценарной работы, исследования и трудных творческих решений
    - предусмотреть возможность BYOK / user-connected provider как один из будущих способов не переносить все LLM-расходы на LapLapLa
    - самые дорогие операции монетизировать отдельно: AI video generation, heavy render, mass generation/export

  - Связь с существующими направлениями LapLapLa:
    - `AI Content Production Pipeline` становится backend/agent foundation для маршрутизации задач и канонических знаний
    - `Browser-Based Cutout Animation Engine` становится дешёвым execution/render layer для повторяемых шоу
    - `Browser-Based Sticker Animation System` становится базовым motion vocabulary
    - существующие персонажи LapLapLa могут стать первыми reusable characters / hosts для Show Studio
    - Cats, Dogs, Parrots, Raccoons и Capybaras могут использовать одну общую архитектуру Show/Character/Episode вместо отдельных несвязанных генераторов

  - Первый экспериментальный формат:
    - `Dogs Draw`
    - Host: Yorkshire Terrier Frank
    - формат: короткие пошаговые уроки рисования
    - постоянный teaching method
    - Character Master Sheet
    - канонический visual style / lighting
    - Episode Template
    - предмет конкретного выпуска является переменной, например parrot / fox / capybara
    - этот формат удобен для проверки continuity, reusable character assets, Scene JSON и дешёвого browser-rendering

  - Definition of Success для будущего прототипа:
    - пользователь одной фразой описывает новое шоу
    - AI извлекает большинство параметров и задаёт только необходимые вопросы
    - создаются Show Bible, Character и Episode Template как отдельные сохраняемые сущности
    - пользователь утверждает character/style locks
    - второй выпуск можно создать короткой командой вроде `Now make lesson 2 about a fox`
    - персонаж, стиль, голос, структура и правила серии автоматически наследуются без повторного объяснения
    - пользователь может изменить одно правило и явно выбрать область действия: только этот эпизод / персонаж / всё шоу
    - большая часть повторяемой анимации может быть собрана без платной AI-video generation

  - Почему важно:
    Это потенциальный переход LapLapLa от набора отдельных контент-инструментов к платформе для создания и масштабирования собственных AI-шоу. Главное конкурентное преимущество должно быть не в очередной модели генерации видео, а в долговременной структуре творческого проекта, reusable assets, управляемой памяти, continuity и более дешёвом production pipeline.

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

  - [ ] Dogs Artist Image Search API 429 Fix
  - Приоритет: средний
  - Статус: отложено на будущее
  - Дата добавления: 2026-08-04
  - Контекст: В разделе «Пёсики» изображения художников в основном загружаются из базы. Для слайдов, у которых подходящей картинки в базе нет, запускается поиск через Meme Search API. Сейчас этот запрос отвечает ошибкой `429 Too Many Requests`, после чего интерфейс снова подставляет изображения из базы вместо действительно подходящих найденных картинок.
  - Что нужно сделать:
    - найти точный API endpoint и код, который запускает fallback-поиск для слайдов «Пёсиков»
    - определить источник `429`: превышение rate limit внешнего API, слишком частые запросы, отсутствие кеширования, параллельные запросы или неверная конфигурация лимитов
    - добавить кеширование и дедупликацию одинаковых запросов
    - ограничить параллелизм и при необходимости добавить очередь запросов
    - реализовать корректный retry с exponential backoff и учетом `Retry-After`
    - проверить, можно ли сначала искать в собственном кеше или медиабазе, а внешний API вызывать только при реальном отсутствии подходящего результата
    - сохранить существующий fallback на изображения из базы только как последний безопасный вариант
    - добавить понятное логирование причин, по которым внешний поиск не сработал
    - проверить, что для слайдов без готовой картинки действительно подбирается релевантное изображение, а не повторяется случайная картинка из базы
  - Definition of Done:
    - Meme Search API не получает лишние повторные запросы
    - ошибка `429` обрабатывается без лавины повторов
    - для отсутствующих в базе изображений выполняется реальный внешний подбор
    - найденные результаты кешируются и повторно используются
    - fallback на базу срабатывает только после исчерпания корректных попыток поиска
    - существующие слайды с изображениями из базы не ломаются
  - Почему важно: Сейчас пользователь визуально не замечает явной ошибки, но подбор изображений работает не по задуманной логике. Это снижает качество уроков и маскирует техническую проблему повторным использованием картинок из базы.

Большие идеи и будущие улучшения добавлять сюда, если они еще не готовы к планированию.

## Paused / Removed

Задачи, которые временно убраны или больше не актуальны, переносить сюда с коротким пояснением и датой.

## LapLapLa Google Play v1.0 Scope

Дата фиксации: 2026-07-29

### Входит в 1.0

- главная страница и AppLab как каталог работающих и исследуемых приложений
- «Котики объяснят», мобильная и desktop Cats Studio, preview и встроенный мобильный export/share
- библиотека капибар, чтение книг, режимы книги и создание визуальной истории
- рисовалка пёсиков, опубликованные уроки, раскрашивание, puzzle и replay
- попугаи, музыкальные истории, микшер и Parrot Studio
- карты енотов: страны, флаги, культура, еда, животные, погода, реки, моря и рельеф
- опубликованный квест «К северным берегам», кухня енотов и страницы рецептов
- опубликованные страницы объектов карты и качественное состояние отсутствующей истории
- библиотека вечерних историй, install page, About, Author, Privacy, Terms и Licenses

### Не входит в 1.0

- неопубликованные карточки будущих квестов
- незавершённые эффекты уроков «Поток краски» и «Смешать краски»
- production-visible auto-colorize/debug controls и скрытый admin logout
- отдельный legacy `/cats/export` как мобильный экран: мобильный export остаётся внутри Cats Studio
- будущие AppLab-проекты без статуса «Доступно» не имеют кнопки запуска
- admin login, studio routes, export routes и story composer остаются служебными/noindex и не входят в обычную навигацию

### После 1.0

- самостоятельные Android/PWA-приложения из AppLab
- следующие квесты енотов
- завершённые paint-flow и paint-mixing эффекты
- отдельный универсальный mobile media-export pipeline, если встроенного Studio export станет недостаточно
- расширение библиотеки историй, рецептов, книг и уроков без демонстрации пустых будущих карточек

## Done

- [x] Cats Categories Responsive Layout + Question Discovery UX
  - Дата завершения: 2026-08-04
  - Исправлены переносы названий категорий и подкатегорий: слова остаются целыми в русской, английской и ивритской локалях.
  - Раздел категорий адаптирован для mobile, tablet и desktop без горизонтального overflow и обрезания подписей.
  - После выбора подкатегории категории плавно сворачиваются, выбранные значения остаются в компактной сводке, а заметная локализованная кнопка позволяет вернуться к выбору.
  - Пользователь автоматически попадает к заголовку вопросов; учтены fixed header, RTL и `prefers-reduced-motion`.
  - Логика данных, фильтрация, API и Supabase не менялись.
  - Проверки: typecheck, ESLint, 162 unit tests, production build и browser matrix из 13 размеров для RU/EN/HE прошли.

- [x] LapLapLa Google Play v1.0 User Scope + AppLab
  - Дата завершения: 2026-07-29
  - Зафиксирован пользовательский состав бесплатной версии 1.0 и отдельно перечислены скрытые и отложенные функции.
  - Главная заглушка заменена локализованным AppLab с шестью типизированными карточками; кнопка открытия появляется только у уже работающих проектов.
  - Неопубликованные квесты, незавершённые drawing alerts и production debug controls скрыты без удаления их внутреннего кода.
  - Legacy mobile `/cats/export` возвращает пользователя в Cats Studio со встроенным export/share; прямой desktop route без проекта показывает понятное состояние вместо белого экрана.
  - Исправлен узкий горизонтальный overflow в Cats, Dogs и fallback desktop Studio layout.
  - Проверки: typecheck, ESLint, 67 unit tests, production build и browser smoke RU/EN/HE на desktop/mobile прошли.

- [x] Raccoon Maps Popup Performance + Responsive Layout
  - Дата завершения: 2026-07-29
  - Подтверждённая причина: popup ждал последовательный подбор медиа для каждого из 8 слайдов и preload всей галереи; общий SVG viewport разрешал вертикальный visual overflow трансформированной карты.
  - Что ускорено: popup shell открывается сразу, данные кешируются на 5 минут с дедупликацией in-flight запросов, hover/focus/pointerdown запускают безопасный prefetch, текущий слайд получает высокий приоритет, а следующий подготавливается после текущего; остальные тяжёлые медиа остаются ленивыми.
  - Layout: поиск и карта объединены общим grid-layout, SVG обрезается внутри общего viewport, mobile safe-area и стабильный gap учтены для flags, cultures и food.
  - Viewport tests: проверены 320×568, 360×640, 375×667, 390×844, 412×915, 430×932, 568×320, 844×390, 768×1024, 1024×768, 1280×720, 1366×768, 1440×900, 1920×1080 и 2560×1440; добавлены точные DOM-селекторы и тест общего layout-контракта.
  - Проверки: typecheck, ESLint, 48 unit tests и production build прошли; production-like замер сократил первый визуальный media с десятков секунд до ~0.6 с, а фоновые media-search запросы — с 8 до 2 для текущего и следующего слайда.

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
