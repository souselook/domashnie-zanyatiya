# «Домашние занятия» — Этап 1: продуктовая спецификация и архитектура

Статус: черновик для утверждения. Содержание уроков (методика) на этом этапе не разрабатывается — только ядро и загрузчик модулей.

---

## 1. Продуктовая спецификация

### 1.1. Что это
Локальное веб-приложение (без бэкенда) для проведения домашних занятий родителя с ребёнком 3–6 лет. Ядро — «проигрыватель занятий»: читает реестр модулей, подгружает модуль-пакет (только JSON + ассеты), валидирует его и проводит урок по шагам, сохраняя прогресс локально.

### 1.2. Пользователи и сценарии
| Роль | Сценарий |
|---|---|
| Родитель | выбирает модуль/урок → проверяет чек-лист материалов → ведёт занятие по скрипту (Дальше/Назад/Пауза/Пропустить/Повторить) → отмечает оффлайн-действия → фиксирует наблюдения |
| Ребёнок | взаимодействует с экраном «Режим ребёнка»: крупные картинки, выбор ответа, счёт, сопоставление; минимум текста |
| Разработчик модуля | кладёт папку `/modules/<id>/` с `module.json`, `lessons/*.json`, `assets/*`, добавляет запись в `registry.json` — без изменения кода ядра |

### 1.3. Принципы (ограничения продукта)
- Не «электронный дневник» и не агрессивная геймификация: нет оценок, очков, уровней, рейтингов, стриков. Прогресс = факты («проведено», «наблюдения»), а не достижения.
- Никаких рекламных блоков, соцфункций, аккаунтов.
- Персональные данные ребёнка не хранятся: прогресс привязан только к id модуля/урока/шага; заметки — свободный текст родителя (в README есть предупреждение не писать ФИО).
- Формулировки в UI нейтральные, без обещаний «гарантированного развития».
- Русский язык интерфейса; тексты уроков приходят из модулей.

### 1.4. Функциональные требования MVP (ядро)
1. Экран выбора модуля и урока (список из `registry.json`).
2. Окно предпросмотра урока (требование 8): просмотр структуры урока и шагов **без запуска и без записи прогресса** — родитель может «полистать» урок перед занятием; работает и для всего модуля (список уроков).
3. Чек-лист материалов перед стартом урока.
4. Проигрыватель-конечный автомат: `materials-check → шаг…N → reflection → done`, с таймером, паузой, переходами Назад/Дальше/Пропустить/Повторить инструкцию.
5. Режим родителя: скрипт вслух, подсказки, материалы, кнопки управления.
6. Режим ребёнка: крупное задание, большие кнопки, минимум текста.
7. Озвучивание через `speechSynthesis` (ru-RU); если голос недоступен — только текст; озвучку можно выключить в настройках.
8. Прогресс: пройденные шаги, последний шаг, время, отметки родителя; восстановление после перезагрузки.
9. Экран прогресса: чек-листы и наблюдения, без оценок.
10. Настройки: звук/озвучка, размер шрифта (S/M/L/XL), таймер, сброс прогресса (с подтверждением).
11. Пустое состояние: понятная инструкция «как добавить модуль» со ссылкой на README.
12. Понятные ошибки: модуль повреждён / не прошёл валидацию / несовместим по версии API / урок отсутствует.
13. PWA: после первой загрузки приложение и подключённые модули работают оффлайн.
14. Адаптивность desktop/tablet; доступность: контраст ≥ WCAG AA, управление с клавиатуры, alt-тексты, крупные тач-цели (≥48 px).

Не в MVP (зарегистрировано как будущее): произвольный JS в модулях, кастомные компоненты, облачная синхронизация, несколько профилей, аудиофайлы в уроках (TTS достаточно), аналитика.

---

## 2. Технологические решения (с обоснованием)

| Слой | Выбор | Обоснование |
|---|---|---|
| Каркас | React 18 + TypeScript + Vite | требование ТЗ; Vite даёт быстрый dev-цикл и простой пресет PWA (`vite-plugin-pwa`) |
| Роутинг | React Router v6 | плоская таблица маршрутов, ленивая загрузка экранов |
| Стили | **Tailwind CSS** | выбран вместо CSS Modules: дизайн-система ядра строится на ограниченной палитре и типографике; глобальный размер шрифта (настройка) меняется одним классом на `<html>`; меньше файлов, единый стиль экранов; изоляция от модулей не нужна, т.к. модули не несут CSS/JS |
| Валидация | **Zod** | схемы и TS-типы из одного источника (`z.infer`), понятные русские сообщения об ошибках, `safeParse` для аккуратного отказа битым модулям; JSON Schema пришлось бы дублировать с типами |
| Хранение | **localStorage** | выбран вместо IndexedDB: объём мал (несколько KB структурированного JSON), синхронный API упрощает код и тесты, нет сложных миграций. Если позже появятся медиа-отметки/многолетняя история — интерфейс хранилища уже абстрагирован (`src/core/storage.ts`), замена будет локальной |
| Тесты | Vitest + React Testing Library; Playwright — один сквозной сценарий занятия | юнит-тесты на валидаторы/автомат, компонентные — на экраны |
| PWA | vite-plugin-pwa (Workbox) | `generateSW`: прекеширование оболочки + runtime-кэш `/**/*.json` и ассетов модулей (cache-first) — оффлайн после первой загрузки |
| Бэкенд | нет | всё статическое; демо-модули лежат в `public/modules/` |

---

## 3. Архитектура

### 3.1. Слои
```
UI-экраны (pages/)            — выбор, плеер, предпросмотр, прогресс, настройки
    ↓ hooks (usePlayer, useSettings, useRegistry…)
Ядро (src/core/)              — без знаний о конкретном содержимом:
  registry.ts   — загрузка и валидация реестра
  loader.ts     — API загрузчика модулей (см. §5)
  player.ts     — конечный автомат занятия
  storage.ts    — прогресс и настройки (абстракция над localStorage)
  tts.ts        — обёртка speechSynthesis
  versioning.ts — проверка совместимости apiVersion/minCoreVersion
  schema/       — Zod-схемы registry/manifest/lesson/task
  types.ts      — TS-типы, выводимые из схем
Модули (public/modules/)      — только данные: JSON + ассеты
```
Ядро никогда не импортирует файлы модулей напрямую; путь строится из записей реестра. Новый модуль = новая папка + строка в реестре.

### 3.2. Дерево файлов проекта
```
domashnie-zanyatiya/
├─ index.html
├─ package.json  vite.config.ts  tailwind.config.ts  tsconfig.json
├─ public/
│  ├─ manifest.webmanifest  icons/
│  └─ modules/
│     ├─ registry.json                  ← реестр модулей
│     └─ demo-core-check/               ← технический demo-модуль-заглушка
│        ├─ module.json                 ← манифест
│        ├─ lessons/
│        │  ├─ demo-count.json          ← покрывает все типы заданий
│        │  └─ demo-short.json          ← короткий урок (тест восстановления)
│        └─ assets/
│           ├─ apple.svg  ball.svg  cat.svg  cube.svg  star.svg …
│           └─ cover.svg
├─ src/
│  ├─ main.tsx  App.tsx  router.tsx
│  ├─ core/
│  │  ├─ schema/{registry,manifest,lesson,task}.ts
│  │  ├─ registry.ts  loader.ts  player.ts  storage.ts  tts.ts
│  │  ├─ versioning.ts
│  │  └─ types.ts
│  ├─ pages/
│  │  ├─ HomePage.tsx                   ← список модулей/уроков + пустое состояние
│  │  ├─ ModulePage.tsx                 ← карточки уроков модуля
│  │  ├─ LessonIntroPage.tsx            ← чек-лист материалов → «Начать»
│  │  ├─ PlayerPage.tsx                 ← режим родителя ⇄ режим ребёнка
│  │  ├─ PreviewPage.tsx                ← окно предпросмотра (без прогресса)
│  │  ├─ ProgressPage.tsx  SettingsPage.tsx
│  ├─ components/
│  │  ├─ tasks/{PictureChoiceTask,MatchTask,CountTask,FeatureChoiceTask,
│  │  │         TraceTask,OfflineConfirmTask,ReflectionTask,InstructionCard,
│  │  │         TaskRenderer}
│  │  ├─ PlayerControls.tsx  StepCounter.tsx  MaterialsChecklist.tsx
│  │  ├─ ModuleCard.tsx  LessonCard.tsx  ErrorPanel.tsx  EmptyState.tsx
│  ├─ hooks/  styles/
└─ tests/
   ├─ unit/ (schema, loader, player, versioning)
   ├─ component/ (HomePage, PlayerPage, PreviewPage)
   └─ e2e/lesson-flow.spec.ts (Playwright)
```

### 3.3. Маршруты
```
/                      список модулей и уроков (+ пустое состояние)
/module/:moduleId      карточки уроков модуля
/module/:m/preview/:l  ПРЕДПРОСМОТР урока (не пишет прогресс)
/lesson/:m/:l/start    чек-лист материалов → старт
/lesson/:m/:l          проигрыватель (родитель/ребёнок)
/progress              экран прогресса
/settings              настройки
```

---

## 4. Форматы данных (схемы)

### 4.1. Реестр модулей — `/modules/registry.json`
```json
{
  "apiVersion": 1,
  "modules": [
    { "id": "demo-core-check", "path": "demo-core-check/", "enabled": true }
  ]
}
```
Правила: `id` записи совпадает с `id` манифеста (несовпадение = ошибка загрузки модуля); `path` — относительно `/modules/`; `enabled:false` скрывает модуль (можно выключать без удаления записи); неизвестные поля игнорируются (forward-compat). Реестр — единственная точка подключения модулей.

### 4.2. Манифест модуля — `module.json`
```json
{
  "manifestVersion": 1,
  "apiVersion": 1,
  "minCoreVersion": "0.1.0",
  "id": "demo-core-check",
  "title": "Технический демо-модуль",
  "shortDescription": "Заглушка для проверки загрузчика ядра. Не содержит методики.",
  "author": "Ядро проекта",
  "license": "CC0-1.0",
  "ageRange": { "from": 3, "to": 6 },
  "discipline": "demo",
  "cover": "assets/cover.svg",
  "lessons": [
    { "file": "lessons/demo-count.json", "order": 1 },
    { "file": "lessons/demo-short.json", "order": 2 }
  ]
}
```
Zod-схема (сокращённо):
```ts
export const ManifestSchema = z.object({
  manifestVersion: z.literal(1),
  apiVersion: z.number().int().min(1),
  minCoreVersion: semverSchema,
  id: moduleIdSchema,                 // /^[a-z0-9][a-z0-9-]{1,40}$/
  title: z.string().min(1).max(80),
  shortDescription: z.string().max(280).optional(),
  author: z.string().min(1).max(100),
  license: z.string().min(1).max(60),
  ageRange: z.object({ from: intIn(2,10), to: intIn(2,10) })
             .refine(r => r.from <= r.to),
  discipline: z.enum(["demo","reading","math","logic","world","speech","art","other"]),
  cover: assetPath.optional(),        // внутри папки модуля; без ../ и http(s)
  lessons: z.array(z.object({ file: jsonPath, order: z.number().int().min(1) })).min(1),
}).strict();                          // unknown-поля в манифесте = ошибка
```
Уроки грузятся лениво (при открытии модуля/предпросмотре), манифест — сразу при загрузке списка.

### 4.3. Урок — `lessons/*.json`
```json
{
  "lessonVersion": 1,
  "id": "demo-count",
  "moduleId": "demo-core-check",
  "title": "Демо: все типы заданий",
  "ageRange": { "from": 3, "to": 5 },
  "estimatedMinutes": 8,
  "tips": ["Хвалите за попытку, а не только за верный ответ."],
  "materials": [
    { "name": "Кубики (5 шт.)", "icon": "assets/cube.svg" },
    { "name": "Листок и карандаш" }
  ],
  "steps": [ /* см. 4.4 */ ]
}
```

### 4.4. Шаг урока (discriminated union по `type`)
Обязательные поля каждого шага: `id`, `type`, `mode: "parent" | "child"`, `parentScript` (что читать вслух); опционально `durationSec`.

```jsonc
// 1) Инструкция для родителя
{ "id":"s1","type":"instruction","mode":"parent",
  "parentScript":"Достань кубики и покажи ребёнку. Посчитаем вместе до пяти.",
  "durationSec": 60 }

// 2) Выбор картинки (один правильный вариант)
{ "id":"s2","type":"picture-choice","mode":"child",
  "parentScript":"Спроси: «Где мячик?» и дай ребёнку выбрать.",
  "prompt":"Где мячик?",
  "options":[{"image":"assets/ball.svg","alt":"Мяч","correct":true},
             {"image":"assets/apple.svg","alt":"Яблоко"}] }

// 3) Сопоставление (пары «слева ↔ справа»)
{ "id":"s3","type":"match","mode":"child",
  "parentScript":"Помоги соединить слово и картинку.",
  "pairs":[{"left":{"text":"Кошка"},"right":{"image":"assets/cat.svg","alt":"Кошка"}}] }

// 4) Счёт предметов (ответ — число)
{ "id":"s4","type":"count","mode":"child",
  "parentScript":"Посчитайте кубики вместе, затем ребёнок выбирает число.",
  "items":[{"image":"assets/cube.svg","alt":"Кубик"},{"image":"assets/cube.svg","alt":"Кубик"},
           {"image":"assets/cube.svg","alt":"Кубик"},{"image":"assets/cube.svg","alt":"Кубик"}],
  "answer": 4, "maxAnswer": 6 }

// 5) Выбор по признаку
{ "id":"s5","type":"feature-choice","mode":"child",
  "parentScript":"Покажи, что красное.",
  "feature":"красный",
  "options":[{"image":"assets/apple.svg","alt":"Яблоко","hasFeature":true},
             {"image":"assets/ball.svg","alt":"Мяч","hasFeature":false}] }

// 6) Обводка/показ — экран-подсказка + оффлайн-действие руками
{ "id":"s6","type":"trace-point","mode":"child",
  "parentScript":"Положи листок перед ребёнком. Пусть обведёт контур пальцем, потом карандашом.",
  "image":"assets/outline.svg","alt":"Контур для обводки","offline":true }

// 7) Оффлайн-задание с подтверждением родителя
{ "id":"s7","type":"offline-task","mode":"parent",
  "parentScript":"Постройте башню из 3 кубиков. Когда закончите — нажмите «Готово».",
  "checklist":["Поставили основание","Насыпали ещё 2 кубика"],
  "confirmLabel":"Мы справились" }

// 8) Рефлексия (всегда последняя)
{ "id":"s8","type":"reflection","mode":"parent",
  "parentScript":"Спроси: что было интересно? Отметь наблюдение — без оценок.",
  "questions":["Что понравилось больше всего?","Что было трудным?"],
  "freeText": true }
```

Правила сверх Zod: ровно один шаг `reflection`, и он последний; `id` шагов уникальны; у child-шагов есть хотя бы один визуальный элемент; пути ассетов — только внутри папки модуля.

### 4.5. Типы заданий ядра v1
`instruction`, `picture-choice`, `match`, `count`, `feature-choice`, `trace-point`, `offline-task`, `reflection`. Неизвестный `type` → урок помечается несовместимым с человекочитаемой ошибкой («Ядро не знает тип „xxx“ — обновите ядро или модуль»), а не падает молча.

---

## 5. API загрузчика модулей (`src/core/loader.ts`)

```ts
loadRegistry(): Promise<LoadResult<RegistryEntry[]>>
loadManifest(entry: RegistryEntry): Promise<LoadResult<ModuleManifest>>
loadLessonIndex(manifest): Promise<LessonSummary[]>          // лёгкие метаданные
loadLesson(manifest, lessonFile): Promise<LoadResult<Lesson>>
assetUrl(manifest, relPath): string                           // /modules/<path>/<relPath>
validateCompatibility(manifest, coreInfo): CompatResult       // см. §6
```
`LoadResult<T> = { ok:true; data:T } | { ok:false; error:CoreError }`, где `CoreError.code ∈ {NETWORK, NOT_FOUND, INVALID_JSON, INVALID_SCHEMA, INCOMPATIBLE, DUPLICATE_ID}` — каждый код рендерится в `ErrorPanel` с текстом и рекомендацией (критерий приёмки 6). Ошибка одного модуля не блокирует остальные: в списке показывается «карточка с ошибкой».

Конвейер: `fetch` (кэш — через Service Worker) → `JSON.parse` в try/catch → `safeParse` Zod → проверка версий → ленивые уроки при открытии.

## 6. Версионирование API модулей
- `apiVersion` — целое число контракта (manifest/lesson/task v1). Ядро поддерживает `[1..CORE_SUPPORTED_API]`.
- `apiVersion` выше поддерживаемого → «Модуль создан для новой версии ядра»; `minCoreVersion` (semver) выше ядра → аналогично.
- Внутри мажорной версии — только additive-изменения: новые необязательные поля не ломают старые модули (unknown-поля в lesson/steps игнорируются, в manifest — strict, чтобы ловить опечатки раньше). Ломающее изменение = новый `apiVersion`.
- Правила зафиксируем в `docs/MODULE_API.md` (переносится в README этапа 4).

## 7. Безопасность
- Модули v1 — **только JSON + статические ассеты**, никакого JS/CSS/HTML из модулей.
- Пути проходят whitelist-регулярку: без `..`, без абсолютных, без схем `http/https/data:` (защита от path traversal и инъекций URL); ассеты отдаются исключительно с `/modules/<id>/`.
- Все тексты уроков рендерятся как обычный React-текст (автоэкранирование), `dangerouslySetInnerHTML` запрещён.
- Sandbox/allowlist для кастомных компонентов осознанно отложен; место расширения зарезервировано (поле `extensions` сейчас отвергается strict-валидацией, чтобы модули не использовали его раньше времени).

## 8. Прогресс и настройки (localStorage)
```
hl.settings.v1   { sound:true, tts:true, fontScale:"M", timerEnabled:true }
hl.progress.v1   { byLesson: { "<m>/<l>": { completedSteps:string[], lastStepId,
                     startedAt, finishedAt?, totalMs, stepMs:{stepId:ms},
                     reflections:[{q,a,ts}], offlineChecks:{stepId:string[]} } },
                   inProgress: { "<m>/<l>": { stepId, updatedAt } } }
```
Состояние плеера живёт в памяти и сериализуется на каждом переходе шага. Ключ со схемной версией; миграция — чистая функция `migrate(raw)`. Персональных данных нет.

## 9. Конечный автомат занятия
```
states: intro(materials) → running(step_i) → paused → done | aborted
events: NEXT PREV SKIP PAUSE RESUME REPEAT_INSTRUCTION CONFIRM_OFFLINE QUIT TIMER_TICK
инварианты: активен ровно один шаг; все переходы через dispatch(event);
таймер шага (durationSec) по истечении даёт мягкое напоминание, НЕ автопереход;
прогресс пишется на каждом переходе; reflection — всегда последний шаг.
```
Экраны: `parent` (скрипт крупно + панель управления) / `child` (задание во весь экран; панель управления скрыта за иконкой 🔒 / долгим нажатиem). Переключатель режима всегда виден.

## 10. Предпросмотр (требование 8)
Маршрут `/module/:m/preview/:l` + кнопка 👁 на карточке урока: метаданные, состав материалов, пошаговая лента (скрипт родителя + мини-визуализация задания тем же `TaskRenderer` в read-only, без состояний и кнопок ответов). **Не создаёт записей прогресса, не запускает таймер.** Кнопка «Начать занятие» ведёт на чек-лист материалов. Тем же окном автор модуля проверяет загруженный пакет.

## 11. Открытые вопросы (разумные дефолты — если не возразите, приму их)
1. Демо-модуль: достаточно ли двух уроков в одном `demo-core-check`? (дефолт: да)
2. Таймер шага: напоминание или автопереход? (дефолт: только мягкое напоминание)
3. «Повторить инструкцию» = повтор TTS или прокрутка текста? (дефолт: и то, и другое)
4. Экспорт прогресса (JSON-файл) нужен уже в MVP? (дефолт: нет, этап 5+)
5. Тема: светлая тёплая палитра, тёмная тема вне MVP? (дефолт: да)

---

**Подтвердите, пожалуйста, Этап 1 (и пункты §11) — после этого перейду к Этапу 2: каркас приложения, роутинг, Zod-схемы, реестр и demo-модуль.**
