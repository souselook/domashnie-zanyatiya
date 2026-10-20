// Метаданные библиотеки спрайтов (Этап 3.1).
// Живёт в src (не в /public) — даёт типизацию и питает экран «Настройки спрайтов модуля».
// Версий у спрайтов нет (решение зафиксировано): контракт ID символов фиксирован,
// список обязательных ID — docs/SPRITE_CONTRACT.md.

export interface SpriteSymbolMeta {
  /** Дополнительные параметры символа (например, цвет). */
  props: string[];
  /** Значения props по умолчанию. */
  defaults: Record<string, string>;
  /**
   * Варианты: значение prop → конкретный symbol-id внутри листа.
   * Например для objects/fruits: color "red" → apple-red.
   */
  variants?: Record<string, Record<string, string>>;
}

export interface SpriteListMeta {
  /** Путь файла относительно /sprites/. */
  file: string;
  /** Базовый viewBox листа (для превью и отладки). */
  viewBox: string;
  symbols: Record<string, SpriteSymbolMeta>;
}

export type SpriteManifest = Record<string, SpriteListMeta>;

export const SPRITE_MANIFEST: SpriteManifest = {
  'character/luntic': {
    file: 'character/luntic.svg',
    viewBox: '0 0 256 256',
    symbols: {
      'luntic-body': { props: [], defaults: {} },
      'luntic-head': { props: [], defaults: {} },
      'luntic-ear-left-neutral': { props: [], defaults: {} },
      'luntic-ear-left-raised': { props: [], defaults: {} },
      'luntic-ear-left-slight': { props: [], defaults: {} },
      'luntic-ear-left-drooped': { props: [], defaults: {} },
      'luntic-ear-right-neutral': { props: [], defaults: {} },
      'luntic-ear-right-raised': { props: [], defaults: {} },
      'luntic-ear-right-slight': { props: [], defaults: {} },
      'luntic-ear-right-drooped': { props: [], defaults: {} },
      'luntic-eye-open': { props: [], defaults: {} },
      'luntic-eye-happy': { props: [], defaults: {} },
      'luntic-eye-sad': { props: [], defaults: {} },
      'luntic-eye-blink': { props: [], defaults: {} },
      'luntic-brow-neutral': { props: [], defaults: {} },
      'luntic-brow-up': { props: [], defaults: {} },
      'luntic-brow-frown': { props: [], defaults: {} },
      'luntic-mouth-smile': { props: [], defaults: {} },
      'luntic-mouth-open': { props: [], defaults: {} },
      'luntic-mouth-neutral': { props: [], defaults: {} },
      'luntic-mouth-sad': { props: [], defaults: {} },
      'luntic-arm-left': { props: [], defaults: {} },
      'luntic-arm-right': { props: [], defaults: {} },
      'luntic-arm-wave': { props: [], defaults: {} },
      'luntic-arm-reach': { props: [], defaults: {} },
      'luntic-arm-up': { props: [], defaults: {} },
    },
  },

  'cubes/zaytsev': {
    file: 'cubes/zaytsev.svg',
    viewBox: '0 0 128 128',
    symbols: {
      'cube-gold': { props: [], defaults: {} },
      'cube-blue': { props: [], defaults: {} },
      'cube-green': { props: [], defaults: {} },
      'cube-gray': { props: [], defaults: {} },
    },
  },

  'letters/cyrillic-upper': {
    file: 'letters/cyrillic-upper.svg',
    viewBox: '0 0 128 128',
    symbols: {
      // Только буквы модуля 1 (Этап 3). Остальные — позже, additive.
      'letter-А': { props: [], defaults: {} },
      'letter-О': { props: [], defaults: {} },
      'letter-У': { props: [], defaults: {} },
      'letter-М': { props: [], defaults: {} },
      'letter-П': { props: [], defaults: {} },
      'letter-С': { props: [], defaults: {} },
      'letter-К': { props: [], defaults: {} },
      'letter-Т': { props: [], defaults: {} },
    },
  },

  'numbers/digits': {
    file: 'numbers/digits.svg',
    viewBox: '0 0 128 128',
    symbols: {
      'digit-0': { props: [], defaults: {} },
      'digit-1': { props: [], defaults: {} },
      'digit-2': { props: [], defaults: {} },
      'digit-3': { props: [], defaults: {} },
      'digit-4': { props: [], defaults: {} },
      'digit-5': { props: [], defaults: {} },
      'digit-6': { props: [], defaults: {} },
      'digit-7': { props: [], defaults: {} },
      'digit-8': { props: [], defaults: {} },
      'digit-9': { props: [], defaults: {} },
      'digit-10': { props: [], defaults: {} },
    },
  },

  'objects/fruits': {
    file: 'objects/fruits.svg',
    viewBox: '0 0 128 128',
    symbols: {
      'apple-red': { props: ['color'], defaults: { color: 'red' }, variants: { color: { red: 'apple-red', green: 'apple-green' } } },
      'apple-green': { props: ['color'], defaults: { color: 'green' }, variants: { color: { red: 'apple-red', green: 'apple-green' } } },
      pear: { props: [], defaults: {} },
      'cherry-pair': { props: [], defaults: {} },
    },
  },

  'objects/flowers': {
    file: 'objects/flowers.svg',
    viewBox: '0 0 64 64',
    symbols: {
      'petal-red': { props: ['color'], defaults: { color: 'red' }, variants: { color: { red: 'petal-red', blue: 'petal-blue' } } },
      'petal-blue': { props: ['color'], defaults: { color: 'blue' }, variants: { color: { red: 'petal-red', blue: 'petal-blue' } } },
      'flower-simple': { props: [], defaults: {} },
    },
  },

  'objects/dishes': {
    file: 'objects/dishes.svg',
    viewBox: '0 0 128 128',
    symbols: {
      bowl: { props: [], defaults: {} },
      cup: { props: [], defaults: {} },
      plate: { props: [], defaults: {} },
    },
  },

  'objects/animals': {
    file: 'objects/animals.svg',
    viewBox: '0 0 128 128',
    symbols: {
      cat: { props: [], defaults: {} },
      duck: { props: [], defaults: {} },
      stork: { props: [], defaults: {} },
      donkey: { props: [], defaults: {} },
    },
  },

  'objects/shapes': {
    file: 'objects/shapes.svg',
    viewBox: '0 0 128 128',
    symbols: {
      'circle-red': { props: ['color', 'shape'], defaults: { color: 'red', shape: 'circle' }, variants: { color: { red: 'circle-red', blue: 'circle-blue', green: 'circle-green' } } },
      'circle-blue': { props: ['color', 'shape'], defaults: { color: 'blue', shape: 'circle' }, variants: { color: { red: 'circle-red', blue: 'circle-blue', green: 'circle-green' } } },
      'circle-green': { props: ['color', 'shape'], defaults: { color: 'green', shape: 'circle' }, variants: { color: { red: 'circle-red', blue: 'circle-blue', green: 'circle-green' } } },
      'square-red': { props: ['color', 'shape'], defaults: { color: 'red', shape: 'square' }, variants: { color: { red: 'square-red', blue: 'square-blue', green: 'square-green' } } },
      'square-blue': { props: ['color', 'shape'], defaults: { color: 'blue', shape: 'square' }, variants: { color: { red: 'square-red', blue: 'square-blue', green: 'square-green' } } },
      'square-green': { props: ['color', 'shape'], defaults: { color: 'green', shape: 'square' }, variants: { color: { red: 'square-red', blue: 'square-blue', green: 'square-green' } } },
      'triangle-red': { props: ['color', 'shape'], defaults: { color: 'red', shape: 'triangle' }, variants: { color: { red: 'triangle-red', blue: 'triangle-blue' } } },
      'triangle-blue': { props: ['color', 'shape'], defaults: { color: 'blue', shape: 'triangle' }, variants: { color: { red: 'triangle-red', blue: 'triangle-blue' } } },
    },
  },

  'symbols/math': {
    file: 'symbols/math.svg',
    viewBox: '0 0 64 64',
    symbols: {
      plus: { props: [], defaults: {} },
      minus: { props: [], defaults: {} },
      equals: { props: [], defaults: {} },
    },
  },

  'symbols/ui': {
    file: 'symbols/ui.svg',
    viewBox: '0 0 64 64',
    symbols: {
      check: { props: [], defaults: {} },
      cross: { props: [], defaults: {} },
      'chevron-left': { props: [], defaults: {} },
      'chevron-right': { props: [], defaults: {} },
      'missing-placeholder': { props: [], defaults: {} },
    },
  },

  'icons/materials': {
    file: 'icons/materials.svg',
    viewBox: '0 0 64 64',
    symbols: {
      'icon-blocks': { props: [], defaults: {} },
      'icon-bowl': { props: [], defaults: {} },
      'icon-cubes': { props: [], defaults: {} },
      'icon-abacus': { props: [], defaults: {} },
      'icon-sticks': { props: [], defaults: {} },
      'icon-paper': { props: [], defaults: {} },
    },
  },
};

/** Категория спрайт-листа из ссылки `<категория>/<файл>#<symbol>`. */
export function categoryFromRef(ref: string): string | null {
  const hash = ref.indexOf('#');
  const base = hash === -1 ? ref : ref.slice(0, hash);
  return SPRITE_MANIFEST[base] ? base : null;
}

/** Проверка: существует ли лист+символ в манифесте ядра. */
export function hasSprite(ref: string): boolean {
  const cat = categoryFromRef(ref);
  if (!cat) return false;
  const meta = SPRITE_MANIFEST[cat];
  const hash = ref.indexOf('#');
  if (hash === -1) return true; // ссылка на лист целиком
  return ref.slice(hash + 1) in meta.symbols;
}
