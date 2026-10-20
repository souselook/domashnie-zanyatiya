// Ленивая загрузка спрайт-листов (Этап 3.1).
// Каждый лист — один SVG с <symbol>-ами; браузер инлайнит его в DOM,
// после чего <use href="/sprites/...svg#id"> работает без повторных fetch.
// Кеш — в памяти (Map), успешная загрузка листа не повторяется никогда.

import { SPRITE_MANIFEST } from './manifest';
import { log } from '../log';

const loaded = new Map<string, Promise<void>>();

/** URL спрайт-листа по категории (`objects/fruits`). */
export function spriteListUrl(category: string): string {
  const meta = SPRITE_MANIFEST[category];
  if (!meta) throw new Error(`Неизвестная категория спрайтов: ${category}`);
  return `/sprites/${meta.file}`;
}

/** true, если лист уже загружен/загружается. */
export function isSpriteListLoaded(category: string): boolean {
  return loaded.has(category);
}

/**
 * Загрузить спрайт-лист и вставить его <symbol>-ы в скрытый инлайн-SVG в body.
 * Идемпотентна: повторные вызовы для той же категории возвращают тот же промис.
 */
export function loadSpriteList(category: string): Promise<void> {
  const existing = loaded.get(category);
  if (existing) return existing;

  const p = doLoad(category).catch((err) => {
    // при ошибке убираем из кеша — чтобы была возможность ретрая
    loaded.delete(category);
    log.error(`Не удалось загрузить спрайт-лист «${category}»:`, err);
    throw err;
  });

  loaded.set(category, p);
  return p;
}

async function doLoad(category: string): Promise<void> {
  const url = spriteListUrl(category);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  const text = await res.text();

  // Парсим через DOMParser, вытаскиваем только <symbol>, игнорируем всё остальное.
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new Error(`Битый SVG: ${url}`);
  }
  // Защита контракта безопасности: никакого JS/внешних ссылок в спрайтах быть не должно.
  if (doc.querySelector('script')) {
    throw new Error(`Спрайт-лист содержит <script> (запрещено контрактом): ${url}`);
  }

  const holderId = 'hl-sprite-holder';
  let holder = document.getElementById(holderId) as unknown as SVGSVGElement | null;
  if (!holder) {
    const created = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as unknown as SVGSVGElement;
    created.id = holderId;
    created.setAttribute('aria-hidden', 'true');
    created.style.position = 'absolute';
    created.style.width = '0';
    created.style.height = '0';
    created.style.overflow = 'hidden';
    document.body.appendChild(created);
    holder = created;
  }

  const symbols = doc.querySelectorAll('symbol');
  symbols.forEach((sym) => {
    const imported = document.importNode(sym, true);
    // защита от коллизий id между листами: id обязан быть уникальным по контракту;
    // если такой id уже есть — пропускаем (первый победитель), warn в консоль
    if (holder!.querySelector(`symbol#${CSS.escape(imported.id)}`)) {
      log.warn(`Дубликат symbol id «${imported.id}» — лист «${category}» пропущен для него`);
      return;
    }
    holder!.appendChild(imported);
  });

  log.info(`Спрайт-лист «${category}» загружен (${symbols.length} символов)`);
}

/** Только для тестов: сброс кеша загруженных листов. */
export function __resetSpriteCache(): void {
  loaded.clear();
}
