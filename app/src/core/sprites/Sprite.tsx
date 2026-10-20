// <Sprite /> — базовый React-компонент спрайт-системы (Этап 3.1).
// Принимает ref вида "objects/fruits#apple" + props, рендерит <svg><use href="...#symbol"/></svg>.
// Сам лениво подтягивает спрайт-лист через loadSpriteList; при неразрешённой ссылке —
// missing-placeholder + warn (контракт из промта Этапа 2/3).

import { useEffect, useState } from 'react';
import { resolveSprite, resolveVariant, type ResolvedSprite } from './resolver';
import { loadSpriteList } from './loader';
import { MISSING_PLACEHOLDER_REF } from '../scene/legacy';
import { log } from '../log';

export interface SpriteProps {
  /** Ссылка на спрайт: `<категория>/<файл>#<symbol-id>` или ассет модуля.
   *  Названа spriteRef, а не ref: у React-компонентов prop `ref` зарезервирован
   *  под string-refs (падает в тестах с react-test-renderer/строгими рендерами). */
  spriteRef: string;
  /** Параметры символа (например, { color: 'red' }) → выбор варианта. */
  props?: Record<string, string>;
  /** Модуль, для которого резолвим (overrides + assets). */
  moduleId?: string;
  /** URLs ассетов модуля из zip. */
  moduleAssets?: Record<string, string>;
  /** alt-текст (доступность). Обязателен по смыслу картинки; пустой — декоративная. */
  alt?: string;
  /** Ширина в px (или % строкой). Высота масштабируется по viewBox. */
  size?: number | string;
  className?: string;
}

const PLACEHOLDER = resolveSprite(MISSING_PLACEHOLDER_REF);

export function Sprite({ spriteRef, props, moduleId, moduleAssets, alt = '', size = 64, className }: SpriteProps) {
  const variantRef = resolveVariant(spriteRef, props);
  const resolved: ResolvedSprite | null = resolveSprite(variantRef, { moduleId, moduleAssets });
  const [ready, setReady] = useState<boolean>(() => resolved?.source !== 'library');

  useEffect(() => {
    if (!resolved || resolved.source === 'missing') return;
    if (resolved.source !== 'library' || !resolved.category) return;
    let cancelled = false;
    loadSpriteList(resolved.category)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // лист не загрузился — показываем placeholder (warn уже внутри loader)
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  if (!resolved) {
    log.warn(`Спрайт «${spriteRef}» не найден (overrides → библиотека → assets модуля) — показана заглушка`);
    return <PlaceholderSprite alt={alt} size={size} className={className} />;
  }

  const dims = typeof size === 'number' ? { width: size, height: size } : { width: size, height: size };

  if (resolved.source === 'module-asset') {
    // Ассет целиком как <img> — символы из него недоступны через <use> без инлайна.
    return <img src={resolved.url} alt={alt} style={{ ...dims, objectFit: 'contain' }} className={className} data-sprite-ref={spriteRef} />;
  }

  if (!resolved.symbolId || !ready) {
    if (!ready && resolved.source === 'library') {
      // лист ещё грузится / не загрузился — заглушка, чтобы не мелькало
      return <PlaceholderSprite alt={alt} size={size} className={className} />;
    }
    return (
      <svg {...dims} role="img" aria-label={alt} className={className} data-sprite-ref={spriteRef}>
        <image href={resolved.url} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      </svg>
    );
  }

  return (
    <svg {...dims} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={className} data-sprite-ref={spriteRef} data-sprite-source={resolved.source}>
      <use href={`${resolved.url}#${resolved.symbolId}`} />
    </svg>
  );
}

function PlaceholderSprite({ alt, size, className }: { alt: string; size: number | string; className?: string }) {
  const dims = typeof size === 'number' ? { width: size, height: size } : { width: size, height: size };
  if (!PLACEHOLDER) return null;
  return (
    <svg {...dims} role="img" aria-label={alt || 'Изображение недоступно'} className={className} data-testid="sprite-missing">
      <use href={`${PLACEHOLDER.url}#${PLACEHOLDER.symbolId}`} />
    </svg>
  );
}
