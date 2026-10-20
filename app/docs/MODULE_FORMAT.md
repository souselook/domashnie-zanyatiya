# Формат zip-модуля «Домашних занятий» (apiVersion = 1)

Документ фиксирует контракт модуля. Изменения схемы — только additive и только
с обновлением этого файла (правило согласовано на Этапе 4).

## Структура архива

```
m01-start-3-4.zip
├── module.json          # манифест (обязателен, ровно в корне)
├── lessons/*.json       # ровно 12 файлов уроков
└── assets/cover.svg     # обложка (путь из manifest.cover)
```

- Лишние JSON в `lessons/` и отсутствующие файлы → ошибка загрузки (`ModuleLoadError`).
- Пути внутри zip канонические (`/`, без `..`); защита от zip-slip при чтении.
- Максимальные размеры: 25 МБ архив / 8 МБ файл (константы `zipLoader`).

## module.json (manifestSchema)

| Поле | Тип | Обязательное | Комментарий |
|---|---|---|---|
| manifestVersion | number | да | = 1 |
| apiVersion | number | да | = 1; ядро отвергает неизвестные версии |
| minCoreVersion | semver string | да | совместимость с ядром |
| id | string | да | уникальный id модуля |
| title / shortDescription / author / license | string | да | метаданные |
| ageRange | {from,to} | да | возраст, лет |
| discipline | string | да | предметная область |
| cover | string | да | путь к SVG/PNG внутри zip |
| **requiredSprites** | string[] | **нет** | **по умолчанию `[]`** (нормализация Zod `.default([])`); список sprite-ref, которые должны быть доступны до запуска урока |
| usesOwnAssets | boolean | да | есть ли собственные ассеты в zip |
| lessons | [{file, order}] | да | ровно 12, порядок 1..12 |

Контракт загрузчика: отсутствующий `requiredSprites` нормализуется в пустой массив —
загрузчик никогда не видит `undefined`.

## Ссылка на спрайт (spriteRefSchema)

`<категория>/<файл>#<symbol-id>` или `<категория>/<файл>` (лист целиком / ассет модуля).
Whitelist-регулярка: запрещены `../`, `http(s):`, `data:`, абсолютные пути.
Cyrillic в symbol-id разрешён (`letters/cyrillic-upper#letter-А`).

## Scene (декларативная картинка)

```jsonc
"scene": {
  "background": "soft-lilac",           // токен: soft-lilac | white | transparent
  "layers": [
    {
      "sprite": "objects/fruits#apple-red",
      "at": { "x": 50, "y": 45 },        // проценты от размера сцены (центр элемента)
      "scale": 1.5,                       // опционально, см. ниже
      "repeat": { "count": 3, "layout": "row", "gap": 12 }, // count 1..20, layout row|col|grid, gap 0..100 (%)
      "props": { "color": "red" }         // параметры выбора варианта спрайта
    }
  ],
  "character": { "emotion": "happy", "gesture": "wave", "anchor": { "x": 82, "y": 55 } }
}
```

### scale (additive, Этап 4)

- `layer.scale?: number` — **опциональный множитель к базовому размеру слоя**.
- Диапазон: `0.1 … 5` (positive, bounded). По умолчанию `1.0` (Zod `.optional().default(1)`;
  в TS-типе поле optional — слои без scale валидны и рендерятся с базовым размером).
- Размер элемента в рендере: `BASE_ITEM_PCT * layer.scale` процентов от меньшей стороны
  контейнера (`BASE_ITEM_PCT = 15`, `core/scene/constants.ts`).
- В repeat-раскладке scale масштабирует и размер, и шаг: `step = BASE_ITEM_PCT*scale + gap`
  (`computeRepeatPositions`, `core/scene/layout.ts` — единственный источник раскладки,
  используется компонентом `SceneView`).
- То же поле добавлено в `count.items.scale?` (множитель для предметов задания «сосчитай»).

### Правила раскладки repeat (зафиксированы Этапом 3.5)

- `base = 15%` одинаков для всех слоёв; `count` НЕ влияет на размер элемента.
- 1D (row/col): `pos_i = center − ((n−1)/2)·step + i·step` — блок центрируется по `at`.
- grid: `cols = ceil(sqrt(count))`, `rows = ceil(count/cols)`;
  x считается через **cols**, y — через **rows** (две отдельные формулы), заполнение строками слева направо.

## Урок (lessonSchema)

- `id`, `title`, `week`, `day`, `goals`, `parentScript` — метаданные/подготовка родителя.
- `steps: 5–7` (порядок значим), типы v1: `instruction`, `picture-choice`, `count`,
  `offline-task`, `reflection`. Неизвестный тип → понятная ошибка рендера, не падение.
- Ровно одна `reflection`, она последняя (и в уроке, и в модуле последней идёт рефлексия месяца).
- Каждый шаг: `mode: child|parent`, `parentScript` обязателен.

## Валидация при загрузке (parseModuleZip → loadZipModule)

1. Архив читается с лимитами размеров; имена файлов канонизируются.
2. `module.json` проходит `manifestSchema` (в т.ч. default `requiredSprites=[]`).
3. Каждый `lessons/*.json` проходит `lessonSchema`; scene-слои — `sceneLayerSchema`
   (sprite-ref whitelist, scale 0.1–5, repeat 1–20).
4. Статус модуля: `ready`, если все requiredSprites резолвятся (overrides → библиотека
   ядра → assets модуля); иначе `blocked` со списком недостающих — UI показывает причину,
   а не пустой экран.

## Версионирование

- Нарушение контракта = bump `apiVersion`; обратно совместимые дополнения (как `scale`) — additive,
  старые ядра их игнорируют (strip unknown fields), новые принимают.
- `minCoreVersion` даёт ранний понятный отказ при несовместимости.
