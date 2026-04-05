# LapLapLa / capybara_tales

Интерактивный детский проект на `Next.js` с несколькими разделами: книги с капибарами, уроки рисования с собаками, музыкальный микшер с попугаями, карты с енотами, stories-конструктор и cat studio для сборки слайдов.

Проект сейчас использует `Pages Router`. Основной стек: `Next.js`, `React`, `TypeScript`, `CSS`, `Supabase`.

## Актуальное состояние

- `/capybara` и `/books/*` — библиотека книг и режимы объяснений.
- `/caps/stories/create` — конструктор пользовательских историй.
- `/cats`, `/cats/studio`, `/cats/export` — редактор и экспорт слайдов.
- `/parrots` — музыкальный микшер на лупах.
- `/dog`, `/dog/lessons`, `/dog/lessons/[slug]` — уроки рисования и интерактивный lesson player.
- `/raccoons`, `/quests/quest-1` — карта и квесты.

## Mobile status

- Часть страниц адаптирована под мобильные экраны.
- Сложные desktop-only сценарии на мобильных скрываются заглушкой с сообщением о будущем приложении `LapLapLa`.
- Это касается прежде всего сложных редакторов, квестов и canvas-heavy экранов.


## Локальный запуск

1. Установить зависимости:

```bash
npm install
```

2. Создать `.env.local` и заполнить нужные переменные.

3. Запустить dev-сервер:

```bash
npm run dev
```

4. Проверить типы:

```bash
npm run lint
```

5. Собрать production build:

```bash
npm run build
```

## Переменные окружения

Проект использует серверные интеграции с `Supabase`, `GIPHY`, `Pexels` и `Google TTS`.

Минимальный набор зависит от того, какой раздел вы тестируете, но обычно нужны:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GIPHY_API_KEY`
- `PEXELS_API_KEY`
- `GOOGLE_TTS_API_KEY`

Важно:

- Секретные ключи должны использоваться только на сервере и через API routes.
- Клиентские страницы не должны читать приватные env напрямую.
- `NEXT_PUBLIC_*` переменные не входят в обязательный production-набор и считаются legacy fallback, если где-то ещё остаются в локальной конфигурации.

## Проверка перед деплоем

- `npm run lint`
- `npm run build`
- проверка локалей `ru`, `en`, `he`
- ручной smoke-test desktop и mobile
- проверка server-side интеграций: `Supabase`, `GIPHY`, `Pexels`, `Google TTS`
- проверка env: приватные ключи не должны попадать в клиентский bundle

## Лицензии и ассеты

В проекте используются собственные ассеты и внешние медиа-источники. Некоторые изображения, гифки и видео подгружаются из `Supabase Storage`, `GIPHY` и `Pexels`. Перед публичным релизом нужно отдельно проверить права на каждый внешний asset и правила атрибуции.

## English

`LapLapLa / capybara_tales` is a multi-section children’s interactive site built with `Next.js Pages Router`, `React`, `TypeScript`, `CSS`, and `Supabase`.

Current sections include:

- capybara books and explanation modes
- custom story builder
- cat slide editor and export flow
- parrot loop mixer
- dog drawing lessons
- raccoon maps and quest content

Important project notes:

- the project is only partially mobile-ready
- several complex screens are desktop-only for now
- AI-based coloring is not a current product feature and should not be documented as such
- the project does not use Tailwind as its main styling system

Before deployment, run:

```bash
npm run lint
npm run build
```
