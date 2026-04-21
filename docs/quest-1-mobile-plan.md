# Quest 1 Mobile Architecture Plan

Цель: добавить мобильную версию `/quests/quest-1` без изменения desktop-версии и заложить структуру, которую можно повторять для следующих квестов и позже переносить в React Native.

## Текущее состояние

- `pages/quests/quest-1.tsx` сейчас полностью отключает квест на mobile через `MobileDesktopNotice`.
- Desktop-версия собрана в `components/Raccoons/quests/quest-1/QuestEngine.tsx`.
- Desktop-страницы подключаются напрямую через `PAGES`: `Day1`, `Day2`, `Day3Flight`, `Day3Sail`, `Day4Takeoff`, `Day4StarsNav`, `Day5Spitsbergen`, `Day5Heat`, `Day5Lab`, `Day5Garage`, `Day6Expedition`, `Day7TreasureOfTimes`.
- Игровые зоны в текущем дереве находятся в `Day5Heat`, `Day5Lab`, `Day5Garage`, а не в `Day6Expedition.tsx`. Самое сложное место для mobile сейчас: `Day5Garage` -> `DogSledRunStage`.
- Много логики завязано на DOM, CSS-позиционирование, `window`, `document`, клавиатуру, `iframe`, `audio` и абсолютные размеры. Это нельзя напрямую переиспользовать в React Native.

## Главный принцип

Desktop не трогаем. Для mobile создаем отдельную ветку рендера и постепенно выносим общую логику в чистые TypeScript-модули.

Страница должна стать такой:

```tsx
const isMobile = useIsMobile();

return (
  <>
    <SEO ... />
    {isMobile ? <Quest1MobileEngine /> : <QuestEngine />}
  </>
);
```

`QuestEngine` остается desktop-only. `Quest1MobileEngine` не импортирует desktop Day-компоненты напрямую.

## Предлагаемая структура

```text
components/Raccoons/quests/quest-1/
  QuestEngine.tsx                  # текущий desktop engine, не менять
  Quest1MobileEngine.tsx           # новый mobile web engine
  quest1Flow.ts                    # общий порядок страниц, ids, переходы
  quest1Assets.ts                  # описания медиа без DOM
  mobile/
    QuestMobileShell.tsx           # topbar, progress, back, safe-area
    QuestMobilePage.tsx            # общий экран дня
    QuestMobileMedia.tsx           # image/video/youtube placeholder
    QuestMobileTextReveal.tsx      # tap-to-reveal paragraphs
    QuestMobileChoiceGroup.tsx     # большие touch-кнопки
    QuestMobileAudioToggle.tsx     # звук вкл/выкл для Day1 и будущих дней
    pages/
      Day1Mobile.tsx
      Day2Mobile.tsx
      Day3FlightMobile.tsx
      Day3SailMobile.tsx
      Day4TakeoffMobile.tsx
      Day4StarsNavMobile.tsx
      Day5SpitsbergenMobile.tsx
      Day5HeatMobile.tsx
      Day5LabMobile.tsx
      Day5GarageMobile.tsx
      Day6ExpeditionMobile.tsx
      Day7TreasureMobile.tsx
    games/
      dress-up/
      lab/
      dog-sled/
```

Позже для React Native:

```text
components/Raccoons/quests/quest-1/core/
  flow.ts
  textReveal.ts
  audioState.ts
  gameState/
    dressUp.ts
    lab.ts
    dogSled.ts
```

`core` не должен импортировать React DOM, Next router, CSS, `window`, `document`, `HTMLAudioElement`, `HTMLVideoElement`.

## Контракт страницы

Каждая mobile-страница должна принимать один и тот же контракт:

```ts
type QuestMobilePageProps = {
  go: (id: PageId) => void;
  lang: Lang;
  t: Quest1Dictionary;
};
```

Для будущих квестов лучше обобщить:

```ts
type QuestPageId = string;

type QuestRuntime = {
  go: (id: QuestPageId) => void;
  back: () => void;
  exit: () => void;
  setProgress: (patch: Record<string, unknown>) => void;
  getProgress: () => Record<string, unknown>;
};
```

## Mobile UI Shell

`QuestMobileShell` отвечает за:

- `100dvh`, safe-area, scroll-контейнер.
- Верхнюю панель: назад к картам, название дня, прогресс.
- Унифицированные кнопки перехода.
- Запрет layout-сдвигов от медиа.
- Один общий стиль для touch-кнопок.
- Возможность позже заменить web-компонент на React Native screen с тем же runtime-контрактом.

## Текст

Desktop `QuestTextBlocks` не трогаем.

Для mobile нужен новый компонент `QuestMobileTextReveal`:

- На старте виден первый абзац или пустой экран с кнопкой.
- Каждое нажатие показывает следующий абзац.
- Никаких scroll-анимаций и сложного появления абзацев.
- Внутри web можно временно использовать `dangerouslySetInnerHTML`, потому что i18n уже хранит HTML.
- Для React Native надо подготовить отдельный парсер простых тегов `<em>`, `<strong>`, `<br/>` в структуру spans.

Day1:

- Заменить мобильную механику `started -> сразу весь QuestTextBlocks` на `tap-to-reveal`.
- После последнего абзаца показывать кнопку перехода.

## Звук

Нужен `QuestMobileAudioToggle`.

Web-версия:

- Использует `audio` refs, а не `document.getElementById`.
- Имеет состояние `muted`.
- В Day1 управляет `fireplace.ogg` и `furry_friends.ogg`.
- Кнопка видна после старта истории и позволяет выключить песенку. Можно оставить огонь отдельно или выключать оба трека одним toggle, но состояние должно быть явным.

Core для RN:

```ts
type QuestAudioTrack = {
  id: string;
  src: string;
  loop: boolean;
  defaultVolume: number;
};

type QuestAudioState = {
  enabled: boolean;
  activeTrackIds: string[];
};
```

RN потом подключит `expo-av` или другой audio adapter к этому состоянию.

## Медиа

Для mobile не вставлять произвольные desktop `ice-window` блоки как есть.

Нужен `QuestMobileMedia`:

- Принимает `{ type: "image" | "video" | "youtube"; src; poster?; aspectRatio?; fit? }`.
- Резервирует стабильный размер через `aspect-ratio`.
- Для autoplay video использует muted/playsInline только в web adapter.
- Для YouTube на mobile лучше показывать tap-to-play блок или обычный iframe ниже текста, без автоскролла.

iPad/webm с белым фоном не решаем в этом этапе. Но схема должна позволять заменить конкретный asset на `poster`, `png-sequence`, `mp4-alpha-fallback` или статичную картинку через `quest1Assets.ts`, не меняя страницу.

## Переходы и прогресс

Сейчас `QuestEngine` хранит только `pageId`. Для mobile нужно сразу сделать состояние:

```ts
type Quest1Progress = {
  pageId: PageId;
  completedPages: PageId[];
  day5?: {
    heatDone?: boolean;
    labDone?: boolean;
    garageDone?: boolean;
  };
  choices?: {
    route?: "flight" | "sail";
  };
};
```

На первом этапе можно хранить в React state. Позже добавить `localStorage` для web и AsyncStorage для RN через storage adapter.

## Игры

### Day5Heat Dress Up

Текущий desktop: drag/drop одежды на персонажа, таймер 15 секунд, conveyor.

Mobile-подход:

- Не пытаться переносить desktop drag/drop один к одному.
- Сначала сделать touch-first режим: выбрать предмет -> нажать на персонажа или кнопку "надеть".
- Логику score, dressedItems, переход между персонажами вынести в `core/gameState/dressUp.ts`.
- Web mobile UI и RN UI используют одинаковые actions: `startCharacter`, `selectItem`, `applyItem`, `finishCharacter`, `restartCharacter`.

### Day5Lab

Текущий desktop: клавиатура ArrowLeft/ArrowRight, lanes, falling items, backpack drag.

Mobile-подход:

- Управление: две большие нижние кнопки left/right плюс drag backpack как дополнительный способ.
- `useLabGameState` разделить на чистую state-machine и web hook.
- Не хранить движение только через keydown.
- RN потом сможет дергать те же actions через touch controls.

### Day5Garage / Dog Sled

Текущий desktop: inspect SVG parts, popup подготовки, затем `DogSledRunStage` с keyboard input, RAF loop, абсолютные размеры и широкая сцена.

Mobile-подход:

- Разделить на два режима:
  - `InspectMobile`: список частей саней + схема/картинка, без точного SVG-hit-testing.
  - `RunMobile`: портретная игра с крупными кнопками вверх/вниз/ускорение/стоп.
- Вынести расчет `prep -> sledConfig`, столкновения, звезды, фазы заезда в core.
- Web mobile может сначала использовать упрощенный vertical lane runner. Desktop `DogSledRunStage` остается как есть.
- Это самый рискованный участок, делать после запуска простых текстовых дней.

## Порядок внедрения

1. Включить mobile route: вместо `MobileDesktopNotice` рендерить пустой `Quest1MobileEngine` с Day1 only.
2. Добавить `QuestMobileShell`, `QuestMobileTextReveal`, `QuestMobileMedia`, `QuestMobileAudioToggle`.
3. Реализовать `Day1Mobile`: tap-to-reveal, звук, mute, переход на Day2.
4. Реализовать простые narrative days: Day2, Day6, Day7.
5. Реализовать route choice pages:
   - Day3FlightMobile сначала как упрощенный выбор маршрута + мини-тест.
   - Day3SailMobile сначала как упрощенный выбор/объяснение маршрута + мини-тест.
6. Реализовать Day4TakeoffMobile как упрощенный cockpit: не SVG-панель, а список систем/кнопок с подсказками и видео.
7. Реализовать Day4StarsNavMobile как touch-карту/список звезд без desktop absolute map.
8. Реализовать Day5SpitsbergenMobile как hub с тремя карточками отделов и прогрессом выполнения.
9. Перевести Day5HeatMobile, Day5LabMobile, Day5GarageMobile по отдельности.
10. Только после этого делать адаптацию сложных игр и React Native adapter.

## Правило для следующих квестов

Каждый новый квест должен иметь:

- `flow.ts`: ids страниц, порядок, ветвления.
- `content` или `i18n`: весь текст отдельно от UI.
- `assets.ts`: все медиа отдельно от UI.
- `desktop/` или текущие desktop pages.
- `mobile/`: web mobile UI.
- `core/`: чистая логика для повторного использования в RN.

Desktop UI не должен быть источником правды для mobile. Источником правды должны быть flow/content/core.

## Минимальный первый PR по mobile quest

Самый безопасный первый шаг:

- Не трогать desktop `QuestEngine`.
- Создать `Quest1MobileEngine`.
- Подключить его только в `pages/quests/quest-1.tsx` при `isMobile`.
- Реализовать только `Day1Mobile` и `Day2Mobile`.
- Игры оставить заблокированными mobile-placeholder экранами с нормальной навигацией, пока не будет готов game core.

Так production не ломается: desktop остается прежним, mobile получает новую ветку, которую можно расширять постепенно.
