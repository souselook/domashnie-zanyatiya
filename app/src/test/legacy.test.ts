// Unit-тесты легаси-конвертации asset → scene (Этап 2, п.2.2).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { legacyAssetToScene, resolveLegacyAsset, stepScene, MISSING_PLACEHOLDER_REF } from '../core/scene/legacy';

afterEach(() => vi.restoreAllMocks());

describe('legacyAssetToScene — 6 персонажных ассетов Лунтика', () => {
  const cases: Array<[string, string, string]> = [
    ['assets/luntic-hello.svg', 'hello', 'wave'],
    ['assets/luntic-happy.svg', 'happy', 'up'],
    ['assets/luntic-help.svg',  'help',  'reach'],
    ['assets/luntic-ask.svg',   'ask',   'rest'],
    ['assets/luntic-think.svg', 'think', 'rest'],
    ['assets/luntic-sad.svg',   'sad',   'rest'],
  ];
  for (const [asset, emotion, gesture] of cases) {
    it(`${asset} → character { emotion: ${emotion}, gesture: ${gesture} }`, () => {
      const scene = legacyAssetToScene(asset);
      expect(scene.character).toEqual(expect.objectContaining({ emotion, gesture }));
      expect(scene.layers).toHaveLength(0);
    });
  }
});

describe('legacyAssetToScene — неизвестный ассет', () => {
  it('даёт missing-placeholder и console.warn с исходным путём', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scene = legacyAssetToScene('assets/red-block.svg');
    expect(scene.layers[0].sprite).toBe(MISSING_PLACEHOLDER_REF);
    expect(warn).toHaveBeenCalledTimes(1);
    // log.warn добавляет префикс '[core]' первым аргументом — исходный путь во втором.
    const allArgs = warn.mock.calls[0].join(' ');
    expect(allArgs).toContain('assets/red-block.svg');
  });
});

describe('resolveLegacyAsset', () => {
  it('luntic-* → character/luntic; прочее → placeholder', () => {
    expect(resolveLegacyAsset('assets/luntic-hello.svg')).toBe('character/luntic');
    expect(resolveLegacyAsset('assets/whatever.svg')).toBe(MISSING_PLACEHOLDER_REF);
  });
});

describe('stepScene — приоритеты', () => {
  it('собственная scene важнее asset', () => {
    const scene = { layers: [{ sprite: 'objects/fruits#apple', at: { x: 1, y: 2 }, scale: 1 }] };
    expect(stepScene({ scene, asset: 'assets/luntic-hello.svg' })).toBe(scene);
  });
  it('asset без scene конвертируется', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(stepScene({ asset: 'assets/luntic-sad.svg' })?.character?.emotion).toBe('sad');
  });
  it('без обоих полей — null', () => {
    expect(stepScene({})).toBeNull();
  });
});
