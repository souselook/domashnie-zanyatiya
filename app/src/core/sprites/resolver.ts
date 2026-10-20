// Резолвер спрайтов (Этап 3.1).
// Порядок разрешения ссылки: overrides[moduleId] → библиотека ядра → assets модуля → null.
// null → рендерится symbols/ui#missing-placeholder + warn (см. Sprite.tsx / Scene, Этап 3.3).

import { SPRITE_MANIFEST, hasSprite } from './manifest';
import { getSpriteOverrides } from '../db';
import { log } from '../log';

export type SpriteSource = 'override' | 'library' | 'module-asset' | 'missing';

export interface ResolvedSprite {
  /** Исходная ссылка из урока. */
  ref: string;
  /** Категория листа (`objects/fruits`) или null для module-asset. */
  category: string | null;
  /** Symbol id внутри листа (null — лист целиком / asset). */
  symbolId: string | null;
  source: SpriteSource;
  /** Для library: URL листа; для module-asset: URL ассета модуля. */
  url: string;
}

/** Разбить ссылку `<категория>/<файл>#<symbol>` на части. */
export function parseSpriteRef(ref: string): { base: string; symbolId: string | null } | null {
  const hash = ref.indexOf('#');
  if (hash === -1) return { base: ref, symbolId: null };
  return { base: ref.slice(0, hash), symbolId: ref.slice(hash + 1) };
}

/** Кэш overrides по модулям (инвалидируется при сохранении настроек спрайтов). */
const overridesCache = new Map<string, Record<string, string>>();

/** Загрузить overrides модуля в кэш резолвера (вызывается при открытии занятия/настроек). */
export async function preloadSpriteOverrides(moduleId: string): Promise<void> {
  const map = await getSpriteOverrides(moduleId);
  overridesCache.set(moduleId, map);
}

/** Принудительно обновить кэш overrides (после сохранения замены на экране настроек). */
export function setSpriteOverridesCache(moduleId: string, map: Record<string, string>): void {
  overridesCache.set(moduleId, map);
}

export function clearSpriteOverridesCache(): void {
  overridesCache.clear();
}

interface ResolveOptions {
  moduleId?: string;
  /** URLs ассетов модуля из zip (assets/<path> → dataURL/URL). Передаётся страницей. */
  moduleAssets?: Record<string, string>;
}

/**
 * Разреференснуть спрайт. Возвращает null, если ничего не найдено —
 * вызывающий код обязан отрендерить missing-placeholder и предупредить.
 */
export function resolveSprite(ref: string, opts: ResolveOptions = {}): ResolvedSprite | null {
  const { moduleId, moduleAssets } = opts;

  // 1. overrides пользователя (экран «Настройки спрайтов модуля», Этап 3.5)
  if (moduleId) {
    const ov = overridesCache.get(moduleId);
    if (ov && ov[ref]) {
      const replacement = ov[ref];
      if (replacement !== ref) {
        const resolved = resolveInLibrary(replacement);
        if (resolved) return { ...resolved, ref /* исходная ссылка остаётся для отладки */, source: 'override' };
      }
    }
  }

  // 2. библиотека ядра
  const lib = resolveInLibrary(ref);
  if (lib) return lib;

  // 3. assets модуля (usesOwnAssets: true) — ref вида "assets/foo.svg" без #
  if (moduleAssets && !ref.includes('#')) {
    const url = lookupModuleAsset(ref, moduleAssets);
    if (url) {
      return { ref, category: null, symbolId: null, source: 'module-asset', url };
    }
  }

  return null;
}

function resolveInLibrary(ref: string): ResolvedSprite | null {
  if (!hasSprite(ref)) return null;
  const parsed = parseSpriteRef(ref);
  if (!parsed) return null;
  const meta = SPRITE_MANIFEST[parsed.base];
  if (!meta) return null;
  return {
    ref,
    category: parsed.base,
    symbolId: parsed.symbolId,
    source: 'library',
    url: `/sprites/${meta.file}`,
  };
}

function lookupModuleAsset(ref: string, assets: Record<string, string>): string | null {
  // нормализуем: "assets/x.svg", "./assets/x.svg", "x.svg"
  const clean = ref.replace(/^\.\//, '');
  if (assets[clean]) return assets[clean];
  const key = Object.keys(assets).find((k) => k.endsWith(`/${clean}`) || k === clean);
  return key ? assets[key] : null;
}

/**
 * Подстановка варианта по props: apple + {color:"green"} → objects/fruits#apple-green.
 * Если проп неизвестен или вариант не найден — возвращается исходный ref (или базовый символ с defaults).
 */
export function resolveVariant(ref: string, props?: Record<string, string>): string {
  if (!props || Object.keys(props).length === 0) return ref;
  const parsed = parseSpriteRef(ref);
  if (!parsed?.symbolId) return ref;
  const meta = SPRITE_MANIFEST[parsed.base];
  const sym = meta?.symbols[parsed.symbolId];
  if (!sym?.variants) return ref;

  let currentId = parsed.symbolId;
  for (const [propName, value] of Object.entries(props)) {
    if (!sym.props.includes(propName)) continue; // неизвестный prop — игнорируем (forward-compat)
    const table = sym.variants[propName];
    if (table && value in table) currentId = table[value];
  }
  if (currentId !== parsed.symbolId && !hasSprite(`${parsed.base}#${currentId}`)) {
    log.warn(`Вариант «${parsed.base}#${currentId}» отсутствует в манифесте — используем исходный ref`);
    return ref;
  }
  return `${parsed.base}#${currentId}`;
}
