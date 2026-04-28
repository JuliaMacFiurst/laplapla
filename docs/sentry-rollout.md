# Sentry rollout for `capybara_tales`

Этот документ описывает безопасный rollout `Sentry` для текущего проекта на `Next.js Pages Router` так, чтобы:

- не менять поведение сайта до явного включения через env;
- не потерять текущее логирование;
- быстро получить прозрачную картину ошибок и деградаций;
- не превратить мониторинг в шум.

## 1. Что есть в проекте сейчас

По состоянию на `2026-04-28`:

- проект работает на `Next.js` с `Pages Router`;
- клиентская точка входа: [pages/_app.tsx](/Users/julia_mac/AI-Workspace/dev/capybara_tales/pages/_app.tsx);
- CSP задается в [next.config.js](/Users/julia_mac/AI-Workspace/dev/capybara_tales/next.config.js);
- часть API routes уже обернута общим хелпером [utils/apiHandler.ts](/Users/julia_mac/AI-Workspace/dev/capybara_tales/utils/apiHandler.ts);
- в кодовой базе много локальных `console.error`, но нет централизованного error monitoring.

Это означает, что для первого этапа Sentry лучше всего подключать в три слоя:

1. browser errors;
2. server/API errors;
3. performance tracing с очень умеренным sampling.

## 2. Принцип безопасного rollout

Подключение должно быть `fail-safe`:

- если `SENTRY_DSN` или `NEXT_PUBLIC_SENTRY_DSN` не заданы, приложение должно вести себя как сейчас;
- сначала включать только `error monitoring`;
- `tracing`, `replay`, `profiling` включать только после того, как поток ошибок станет понятным;
- существующие `console.error` не удалять до тех пор, пока не станет ясно, что Sentry стабильно покрывает нужные сценарии.

## 3. Минимальный набор env

Для первого этапа достаточно:

```env
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

Практика для этого проекта:

- `SENTRY_DSN` использовать для server/runtime событий;
- `NEXT_PUBLIC_SENTRY_DSN` использовать для browser событий;
- `SENTRY_ENVIRONMENT` держать как минимум в значениях `development`, `staging`, `production`;
- `SENTRY_RELEASE` задавать в CI, а не руками локально;
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` нужны только если вы загружаете sourcemaps.

## 4. Рекомендуемый порядок внедрения

### Этап A. Безопасная установка SDK

Установить `@sentry/nextjs`.

После установки добавить стандартные конфигурационные файлы Sentry для `Next.js`, но инициализировать SDK только если есть DSN.

Цель этапа:

- код готов к мониторингу;
- без DSN ничего не отправляется;
- production-поведение не меняется.

### Этап B. Клиентский мониторинг

Точка входа в этом проекте: [pages/_app.tsx](/Users/julia_mac/AI-Workspace/dev/capybara_tales/pages/_app.tsx).

Что включать первым:

- unhandled exceptions;
- unhandled promise rejections;
- route-level errors;
- breadcrumbs по навигации и XHR/fetch.

Что не включать сразу:

- session replay для всех пользователей;
- aggressive tracing;
- отправку PII по умолчанию.

Рекомендация по стартовым rate:

- `sampleRate: 1.0` для ошибок;
- `tracesSampleRate: 0.05` или ниже;
- `replaysSessionSampleRate: 0`;
- `replaysOnErrorSampleRate: 0` на первом этапе.

### Этап C. Серверный мониторинг

Главная безопасная точка расширения: [utils/apiHandler.ts](/Users/julia_mac/AI-Workspace/dev/capybara_tales/utils/apiHandler.ts).

Что дает эта точка:

- единый capture исключений для уже унифицированных API routes;
- единые теги по `req.url`, `req.method`, status и category;
- минимальное количество точечных правок по файлам.

Нужно учесть:

- не все API routes в проекте используют `withApiHandler`;
- после базового rollout надо отдельно пройти routes с `export default async function handler(...)` без общего wrapper.

При capture на сервере стоит добавлять:

- `route`;
- `method`;
- `query` без чувствительных значений;
- feature tag, например `books`, `cats`, `raccoons`, `stories`, `dog-lessons`.

### Этап D. CSP и сеть

Так как в проекте уже настроен CSP через [next.config.js](/Users/julia_mac/AI-Workspace/dev/capybara_tales/next.config.js), после включения browser SDK нужно:

- добавить Sentry ingest endpoint в `connect-src`;
- если будет использоваться `tunnel`, разрешить и его endpoint.

Без этого клиентские события могут молча блокироваться браузером.

### Этап E. Source maps

Source maps стоит включать только после того, как:

- базовые ошибки уже приходят;
- environment и release проставляются стабильно;
- есть понятный build pipeline.

Без `release` source maps быстро теряют ценность.

## 5. Что именно менять в этом репозитории

Когда SDK будет установлен, безопасный минимальный набор файлов обычно такой:

- `next.config.js`
- `pages/_app.tsx`
- `utils/apiHandler.ts`
- новые `sentry.*.config.*` файлы в корне
- при необходимости отдельный helper в `lib/monitoring/`

Рекомендуемая логика по файлам:

- `next.config.js`: обернуть конфиг через Sentry helper и обновить CSP;
- `pages/_app.tsx`: не писать ручной `captureException` повсюду, а полагаться на SDK init и только в особых местах использовать manual capture;
- `utils/apiHandler.ts`: добавить единый server-side capture внутри `catch`;
- `lib/monitoring/`: держать локальные helpers вроде `captureApiException`, `setMonitoringUser`, `setMonitoringTag`.

## 6. Что считать успехом

После rollout мониторинг считается настроенным правильно, если выполняются все пункты:

- browser error появляется в Sentry с читаемым stack trace;
- server/API error появляется в Sentry с `route` и `method`;
- dev и production события разделены по `environment`;
- issues не дублируются без причины;
- payload не содержит секреты, access token или service keys;
- приложение продолжает работать даже при недоступности Sentry.

## 7. Проверка после включения

Минимальный smoke-test:

1. Локально включить DSN только в dev.
2. Открыть сайт и проверить, что загрузка страниц не изменилась.
3. Сгенерировать тестовую client-side ошибку.
4. Сгенерировать тестовую server-side ошибку через одну из API routes.
5. Проверить arrival в Sentry:
   - `environment`
   - `release`
   - stack trace
   - tags
6. Проверить, что CSP ничего не режет в консоли браузера.
7. Проверить, что при пустом DSN сайт работает как до интеграции.

## 8. Privacy и шум

Для этого проекта лучше сразу принять жесткие правила:

- не отправлять в Sentry `SUPABASE_SERVICE_ROLE_KEY`, bearer tokens, cookies, raw auth headers;
- не отправлять полные user-generated payload без необходимости;
- не включать `sendDefaultPii`, пока нет явного решения по privacy;
- фильтровать ожидаемые 4xx и noisy network cases, чтобы не засорять issues.

Полезно заранее составить deny-list:

- ошибки отмененных запросов;
- ожидаемые валидационные 400/404;
- noise от расширений браузера;
- dev-only ошибки локального окружения.

## 9. Практический rollout по фазам

Рекомендуемый порядок для этого репозитория:

1. Установить SDK и добавить init с выключением при пустом DSN.
2. Подключить capture в `withApiHandler`.
3. Обновить CSP.
4. Проверить dev.
5. Включить production только для errors.
6. Через несколько дней включить tracing с low sample rate.
7. Только после этого решать, нужен ли replay.

## 10. Что не стоит делать сразу

- не подключать replay на 100% трафика;
- не ставить `tracesSampleRate: 1.0` для production;
- не переписывать все `console.error` в один проход;
- не смешивать rollout Sentry и большой рефакторинг API routes в одной задаче;
- не включать source maps без стабильного `release`.

## 11. Следующее безопасное действие

Следующий практический шаг для этого репозитория:

1. установить `@sentry/nextjs`;
2. добавить конфиг с conditional init;
3. завести capture в `utils/apiHandler.ts`;
4. обновить `README.md` короткой ссылкой на этот runbook;
5. прогнать `npm run lint` и `npm run build`.

Пока SDK не установлен, это лучший способ зафиксировать прозрачный и безопасный план интеграции без изменения runtime-поведения проекта.
