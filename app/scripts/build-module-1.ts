// Сборка модуля 1 (m01-start-3-4) в zip для загрузки через UI.
// Запуск: npx tsx scripts/build-module-1.ts   (или node --experimental-strip-types после компиляции)
// Результат: dist/m01-start-3-4.zip — module.json + lessons/*.json + assets/cover.svg.
// Все уроки проходят Zod-валидацию на этапе сборки; requiredSprites собирается из фактических сцен.

import { writeFileSync, mkdirSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import { manifestSchema, lessonSchema } from '../src/core/schema';
import type { Scene } from '../src/core/schema/scene';
import { LESSONS } from '../src/modules/m01/lessons';

const COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 288">
  <rect width="512" height="288" fill="#F5F3FF"/>
  <circle cx="256" cy="120" r="56" fill="#FFE9A8" stroke="#C9A227" stroke-width="4"/>
  <circle cx="238" cy="110" r="6" fill="#4B3B2A"/><circle cx="274" cy="110" r="6" fill="#4B3B2A"/>
  <path d="M240 138 q16 14 32 0" stroke="#4B3B2A" stroke-width="4" fill="none" stroke-linecap="round"/>
  <text x="256" y="230" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#6D28D9">Старт 3–4</text>
</svg>`;

/** Рекурсивно собирает все sprite-ссылки из сцены. */
function collectSceneRefs(scene: Scene | undefined, out: Set<string>) {
  if (!scene) return;
  for (const l of scene.layers ?? []) out.add(l.sprite);
}

function main() {
  // 1. requiredSprites — из фактических сцен уроков (шаги + options).
  const refs = new Set<string>();
  for (const lesson of LESSONS) {
    for (const step of lesson.steps as Record<string, unknown>[]) {
      collectSceneRefs(step.scene as Scene | undefined, refs);
      const options = step.options as { scene?: Scene }[] | undefined;
      for (const opt of options ?? []) collectSceneRefs(opt.scene, refs);
      const items = step.items as { sprite?: string } | undefined;
      if (items?.sprite) refs.add(items.sprite);
    }
  }

  const manifest = {
    manifestVersion: 1 as const,
    apiVersion: 1,
    minCoreVersion: '1.0.0',
    id: 'm01-start-3-4',
    title: 'Лунтик: Старт 3–4',
    shortDescription: 'Двенадцать коротких занятий для детей 3–4 лет: цвет, счёт до пяти, гласные и первые слоги.',
    author: 'Home Lessons',
    license: 'CC-BY-NC 4.0',
    ageRange: { from: 3, to: 4 },
    discipline: 'demo' as const,
    cover: 'assets/cover.svg',
    requiredSprites: [...refs].sort(),
    usesOwnAssets: false,
    lessons: LESSONS.map((l, i) => ({ file: `lessons/${l.id}.json`, order: i + 1 })),
  };

  // 2. Строгая валидация всего, что попадёт в zip.
  manifestSchema.parse(manifest);
  for (const l of LESSONS) lessonSchema.parse(l);
  if (LESSONS.length !== 12) throw new Error(`Ожидалось 12 уроков, получено ${LESSONS.length}`);

  // 3. Zip.
  const files: Record<string, Uint8Array> = {
    'module.json': strToU8(JSON.stringify(manifest, null, 2)),
    'assets/cover.svg': strToU8(COVER_SVG),
  };
  for (const l of LESSONS) {
    files[`lessons/${l.id}.json`] = strToU8(JSON.stringify(l, null, 2));
  }
  const zipped = zipSync(files);

  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/m01-start-3-4.zip', zipped);

  console.log(`OK: dist/m01-start-3-4.zip (${zipped.length} bytes)`);
  console.log(`Уроков: ${LESSONS.length}; requiredSprites: ${manifest.requiredSprites.length}`);
}

main();
