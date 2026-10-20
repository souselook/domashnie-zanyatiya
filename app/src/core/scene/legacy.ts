// Легаси-конвертация одиночного `asset` в декларативную сцену (решение 1 сверх спеки).
// Ядро НЕ падает на старых модулях: asset → минимальная сцена.
// Персонажевые ассеты Лунтика маппятся на emotion/gesture; прочие → placeholder + warn.

import type { Scene } from '../schema';
import { log } from '../log';

const LUNTIC_MAP: Record<string, { emotion: 'hello' | 'happy' | 'help' | 'ask' | 'think' | 'sad' | 'neutral'; gesture: 'rest' | 'wave' | 'reach' | 'up' }> = {
  'assets/luntic-hello.svg': { emotion: 'hello', gesture: 'wave' },
  'assets/luntic-happy.svg': { emotion: 'happy', gesture: 'up' },
  'assets/luntic-help.svg':  { emotion: 'help',  gesture: 'reach' },
  'assets/luntic-ask.svg':   { emotion: 'ask',   gesture: 'rest' },
  'assets/luntic-think.svg': { emotion: 'think', gesture: 'rest' },
  'assets/luntic-sad.svg':   { emotion: 'sad',   gesture: 'rest' },
};

export const MISSING_PLACEHOLDER_REF = 'symbols/ui#missing-placeholder';

/** Маппинг legacy-asset → sprite-ref (для не-персонажных файлов). */
export function resolveLegacyAsset(assetPath: string): string {
  const mapped = LUNTIC_MAP[assetPath];
  if (mapped) return 'character/luntic'; // сам персонаж собирается по emotion/gesture
  return MISSING_PLACEHOLDER_REF;
}

/**
 * Конвертирует легаси-поле `asset` шага в минимальную сцену.
 * - luntic-* → сцена только с персонажем (без layers);
 * - прочие → слой symbols/ui#missing-placeholder + console.warn с исходным путём.
 */
export function legacyAssetToScene(assetPath: string): Scene {
  const mapped = LUNTIC_MAP[assetPath];
  if (mapped) {
    return {
      layers: [],
      character: { emotion: mapped.emotion, gesture: mapped.gesture },
    };
  }
  log.warn(
    `[legacy] Ассет «${assetPath}» не имеет спрайта в библиотеке ядра — показана заглушка. ` +
    `Обновите модуль до формата scene.`,
  );
  return {
    layers: [{ sprite: MISSING_PLACEHOLDER_REF, at: { x: 50, y: 50 }, scale: 1 }],
  };
}

/** Возвращает сцену шага: собственная scene или конвертированный legacy-asset. */
export function stepScene(step: { scene?: Scene; asset?: string }): Scene | null {
  if (step.scene) return step.scene;
  if (step.asset) return legacyAssetToScene(step.asset);
  return null;
}

/**
 * Сцена для опции/элемента задания: scene > legacy asset > null.
 * Используется в OptionImage, чтобы старые модули с options[].asset
 * не падали, а показывали заглушку с warn (требование A).
 */
export function optionScene(o: { scene?: Scene; asset?: string }): Scene | null {
  return stepScene(o);
}
