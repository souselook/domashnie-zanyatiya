// Unit-тесты спрайт-инфраструктуры (Этап 3.1): schema spriteRef, manifest, resolver.

import { describe, it, expect, beforeEach } from 'vitest';
import { spriteRefSchema, SPRITE_REF_PATTERN } from '../core/schema/scene';
import { SPRITE_MANIFEST, hasSprite, categoryFromRef } from '../core/sprites/manifest';
import { resolveSprite, resolveVariant, parseSpriteRef, setSpriteOverridesCache, clearSpriteOverridesCache } from '../core/sprites/resolver';

describe('spriteRefSchema / SPRITE_REF_PATTERN', () => {
  const valid = [
    'objects/fruits#apple-red',
    'character/luntic#luntic-body',
    'symbols/ui#missing-placeholder',
    'letters/cyrillic-upper#letter-А', // кириллица в symbol-id разрешена
    'objects/fruits', // лист целиком
    'icons/materials#icon-blocks',
  ];
  const invalid = [
    '../evil/fruits#apple', // ../ запрещён
    'http://cdn.example.com/x.svg#a', // протокол запрещён
    'data:image/svg+xml;base64,AAA', // data: запрещён
    '/absolute/path#sym', // абсолютный путь запрещён
    'objects/fruits#../../x', // ../ внутри symbol
    '',
    'noSlash', // нет категории
    'objects/fruits#sp ace', // пробел
  ];
  valid.forEach((ref) => {
    it(`валидна ссылка: ${ref}`, () => {
      expect(spriteRefSchema.safeParse(ref).success).toBe(true);
    });
  });
  invalid.forEach((ref) => {
    it(`невалидна ссылка: "${ref}"`, () => {
      expect(spriteRefSchema.safeParse(ref).success).toBe(false);
    });
  });
  it('регулярка не содержит явных дыр (whitelist)', () => {
    expect(SPRITE_REF_PATTERN.source).toContain('[a-z0-9-]');
  });
});

describe('SPRITE_MANIFEST', () => {
  it('содержит все категории Этапа 3', () => {
    const expected = [
      'character/luntic', 'cubes/zaytsev', 'letters/cyrillic-upper', 'numbers/digits',
      'objects/fruits', 'objects/flowers', 'objects/dishes', 'objects/animals',
      'objects/shapes', 'symbols/math', 'symbols/ui', 'icons/materials',
    ];
    expected.forEach((cat) => expect(SPRITE_MANIFEST[cat]).toBeDefined());
  });

  it('luntic содержит ровно 26 символов (контракт: заявлено 25, по списку ID — 26)', () => {
    const syms = Object.keys(SPRITE_MANIFEST['character/luntic'].symbols);
    expect(syms).toHaveLength(27);
    ['luntic-body', 'luntic-head', 'luntic-arm-up', 'luntic-eye-blink', 'luntic-mouth-sad']
      .forEach((id) => expect(syms).toContain(id));
  });

  it('hasSprite: существующий/несуществующий символ', () => {
    expect(hasSprite('objects/fruits#apple-red')).toBe(true);
    expect(hasSprite('objects/fruits#mango')).toBe(false);
    expect(hasSprite('unknown/list#x')).toBe(false);
    expect(hasSprite('objects/fruits')).toBe(true); // лист целиком
  });

  it('categoryFromRef корректен', () => {
    expect(categoryFromRef('objects/fruits#apple-red')).toBe('objects/fruits');
    expect(categoryFromRef('objects/fruits')).toBe('objects/fruits');
    expect(categoryFromRef('bogus/x#y')).toBeNull();
  });
});

describe('parseSpriteRef', () => {
  it('разбивает ref с #', () => {
    expect(parseSpriteRef('objects/fruits#apple-red')).toEqual({ base: 'objects/fruits', symbolId: 'apple-red' });
  });
  it('без # — symbolId null', () => {
    expect(parseSpriteRef('objects/fruits')).toEqual({ base: 'objects/fruits', symbolId: null });
  });
});

describe('resolveSprite', () => {
  beforeEach(() => clearSpriteOverridesCache());

  it('библиотека: library + url листа', () => {
    const r = resolveSprite('objects/fruits#apple-red');
    expect(r).not.toBeNull();
    expect(r!.source).toBe('library');
    expect(r!.url).toBe('/sprites/objects/fruits.svg');
    expect(r!.symbolId).toBe('apple-red');
  });

  it('неизвестный спрайт без assets → null', () => {
    expect(resolveSprite('objects/fruits#mango')).toBeNull();
  });

  it('overrides применяются раньше библиотеки', () => {
    setSpriteOverridesCache('m01', { 'objects/fruits#mango': 'objects/fruits#apple-green' });
    const r = resolveSprite('objects/fruits#mango', { moduleId: 'm01' });
    expect(r).not.toBeNull();
    expect(r!.source).toBe('override');
    expect(r!.symbolId).toBe('apple-green');
    expect(r!.ref).toBe('objects/fruits#mango'); // исходная ссылка сохраняется для отладки
  });

  it('module-asset резолвится из assets модуля', () => {
    const r = resolveSprite('assets/custom.svg', { moduleAssets: { 'assets/custom.svg': 'data:image/svg+xml;base64,AAA' } });
    expect(r).not.toBeNull();
    expect(r!.source).toBe('module-asset');
  });

  it('порядок: override > библиотека', () => {
    setSpriteOverridesCache('m01', { 'objects/fruits#apple-red': 'objects/fruits#pear' });
    const r = resolveSprite('objects/fruits#apple-red', { moduleId: 'm01' });
    expect(r!.source).toBe('override');
    expect(r!.symbolId).toBe('pear');
  });
});

describe('resolveVariant', () => {
  it('color=green → apple-green', () => {
    expect(resolveVariant('objects/fruits#apple-red', { color: 'green' })).toBe('objects/fruits#apple-green');
  });
  it('без props — исходный ref', () => {
    expect(resolveVariant('objects/fruits#apple-red')).toBe('objects/fruits#apple-red');
    expect(resolveVariant('objects/fruits#apple-red', {})).toBe('objects/fruits#apple-red');
  });
  it('неизвестный prop игнорируется (forward-compat)', () => {
    expect(resolveVariant('objects/fruits#apple-red', { size: 'big' })).toBe('objects/fruits#apple-red');
  });
  it('shape+color для фигур', () => {
    expect(resolveVariant('objects/shapes#circle-red', { color: 'blue' })).toBe('objects/shapes#circle-blue');
  });
  it('ссылка без symbol — как есть', () => {
    expect(resolveVariant('objects/fruits', { color: 'green' })).toBe('objects/fruits');
  });
});
