# Контракт спрайтов (docs/SPRITE_CONTRACT.md)

Для иллюстратора и авторов модулей. Обязательные symbol ID фиксируются здесь.
Молча «изобретать» новые ID нельзя — только additive-добавления
(новый символ = новая строка ниже + запись в `src/core/sprites/manifest.ts`).

## Общие правила SVG
- Один спрайт-лист = один SVG-файл, состоящий только из `<symbol>` (плюс пустой корневой `<svg>`).
- Корневой `<svg>`: `aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"` (НЕ display:none — Safari ломает `<use>`).
- Никаких `<script>`, `<text>`, `<image>`, `data:`, внешних URL. Весь текст — кривыми (paths).
- Прозрачный фон у предметных спрайтов.
- viewBox: **256×256** персонаж, **128×128** объекты/кубики/буквы/цифры, **64×64** мелкие (petal, icons, math, ui).
- Палитра дизайн-системы: #B39DDB (основной), #7E57C2 (тень/контур), #D1C4E9 (светлый), #A5D6A7 (зелёный), #FFE082 (жёлтый), #263238 (глаза), #FFFFFF (блики), #F5F3FF (фон soft-lilac).
- Стиль: полуплоский, скругления, мягкие тени. Встроенных анимаций нет — анимации делает CSS ядра.
- Временные placeholder-файлы помечены комментарием `<!-- TEMPORARY PLACEHOLDER ... -->` и заменяются иллюстратором 1-в-1 без изменений в коде.

## character/luntic.svg — 26 символов (viewBox 0 0 256 256; в промте Этапа 3 заявлено «25», фактический список ID даёт 26 — зафиксировано как есть, без сокращений)
Точки стыковки: тело — центр масс (128,180); голова — крепление (128,130), верх y≈40; уши — пивоты (95,60) и (161,60); глаза — (108,92) и (148,92); рот — (128,118) (не ниже 118); руки — плечи (72,158) и (184,158).

```
luntic-body
luntic-head
luntic-ear-left-neutral   luntic-ear-left-raised   luntic-ear-left-slight   luntic-ear-left-drooped
luntic-ear-right-neutral  luntic-ear-right-raised  luntic-ear-right-slight  luntic-ear-right-drooped
luntic-eye-open  luntic-eye-happy  luntic-eye-sad  luntic-eye-blink
luntic-brow-neutral  luntic-brow-up  luntic-brow-frown
luntic-mouth-smile  luntic-mouth-open  luntic-mouth-neutral  luntic-mouth-sad
luntic-arm-left  luntic-arm-right  luntic-arm-wave  luntic-arm-reach  luntic-arm-up
```

## cubes/zaytsev.svg (128×128)
cube-gold, cube-blue, cube-green, cube-gray

## letters/cyrillic-upper.svg (128×128)
letter-А, letter-О, letter-У, letter-М, letter-П, letter-С, letter-К, letter-Т
(расширяется additive по мере надобности методики; остальные буквы — позже)

## numbers/digits.svg (128×128)
digit-0 … digit-9, digit-10

## objects/fruits.svg (128×128)
apple-red, apple-green (props: color → variants red/green), pear, cherry-pair

## objects/flowers.svg (64×64)
petal-red, petal-blue (props: color), flower-simple

## objects/dishes.svg (128×128)
bowl, cup, plate

## objects/animals.svg (128×128)
cat, duck, stork, donkey

## objects/shapes.svg (128×128)
circle-red, circle-blue, circle-green, square-red, square-blue, square-green, triangle-red, triangle-blue
(props: color, shape → variants)

## symbols/math.svg (64×64)
plus, minus, equals

## symbols/ui.svg (64×64)
check, cross, chevron-left, chevron-right, missing-placeholder

## icons/materials.svg (64×64)
icon-blocks, icon-bowl, icon-cubes, icon-abacus, icon-sticks, icon-paper

## Формат ссылки в уроке
`<категория>/<файл>#<symbol-id>` — например `objects/fruits#apple-red`.
Валидируется регуляркой `SPRITE_REF_PATTERN` (src/core/schema/scene.ts):
`^[a-z0-9-]+/[A-Za-z0-9._-]+(?:#[\w\u0400-\u04FF.-]+)?$`
Без `../`, без протоколов, без абсолютных путей.

## Порядок разрешения (src/core/sprites/resolver.ts)
overrides модуля → библиотека ядра (SPRITE_MANIFEST) → assets модуля → null (missing-placeholder + warn).

## Статус спрайт-листов (Этап 4.6)

Спрайт-листы восстановлены в Этапах 4.5–4.6 (исходная история утрачена — репозиторий grafted); id и viewBox соответствуют манифесту на момент 4.6.
