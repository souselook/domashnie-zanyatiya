// Сборка демо-модуля demo-drag (v1.1.1) в zip для загрузки через UI.
// Запуск: npx tsx scripts/build-demo-drag.ts
// Результат: examples/demo-drag.zip — 1 модуль, 2 урока с picture-choice interaction:"drag".
// Уроки m01 не трогает; опции рисуются встроенными фигурами (без спрайт-зависимостей).

import { writeFileSync, mkdirSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import { manifestSchema, lessonSchema } from '../src/core/schema';

const COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 288">
  <rect width="512" height="288" fill="#F5F3FF"/>
  <circle cx="200" cy="120" r="40" fill="#E8A13C"/>
  <polygon points="320,80 360,160 280,160" fill="#7CB342"/>
  <rect x="380" y="90" width="60" height="60" rx="10" fill="#6D28D9"/>
  <text x="256" y="240" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#6D28D9">Drag Demo</text>
</svg>`;

const base = { mode: 'child' as const, parentScript: 'Покажите ребёнку зону и предложите перетащить картинку.' };

const L1 = {
  lessonVersion: 1, id: 'd1', moduleId: 'demo-drag', title: 'Drag урок 1', week: 1, day: 1,
  goals: ['Знакомство с перетаскиванием'],
  parentScript: 'Ребёнок перетаскивает (или тап-тап) выбранную форму в пунктирную зону.',
  steps: [
    { ...base, id: 's1', type: 'instruction', parentScript: 'Ознакомьтесь с зонами вместе.', promptNote: undefined },
    {
      ...base, id: 's2', type: 'picture-choice', interaction: 'drag',
      prompt: 'Перетащите круг в зону',
      options: [
        { id: 'circle', label: 'Круг' },
        { id: 'square', label: 'Квадрат' },
        { id: 'star', label: 'Звезда' },
      ],
    },
    {
      ...base, id: 's3', type: 'picture-choice', interaction: 'drag',
      prompt: 'Что живёт в небе?',
      options: [
        { id: 'sun', label: 'Солнце' },
        { id: 'ball', label: 'Мяч' },
      ],
    },
    { id: 's4', type: 'reflection', mode: 'parent' as const, parentScript: 'Обсудите итог.', questions: ['Получилось перетащить?'] },
  ],
};

const L2 = {
  lessonVersion: 1, id: 'd2', moduleId: 'demo-drag', title: 'Tap урок 2', week: 1, day: 2,
  goals: ['Закрепление: drag и tap-tap оба работают'],
  parentScript: 'Попробуйте сначала перетаскивание, затем способ «тап-тап».',
  steps: [
    {
      ...base, id: 's1', type: 'picture-choice', interaction: 'drag',
      prompt: 'Перетащите треугольник в зону',
      options: [
        { id: 'triangle', label: 'Треугольник' },
        { id: 'circle2', label: 'Круг' },
      ],
    },
    {
      // обычный tap-урок рядом — проверка совместимости двух режимов в одном уроке
      ...base, id: 's2', type: 'picture-choice',
      prompt: 'Найди лишний (обычный выбор)',
      options: [
        { id: 'cat', label: 'Кот' },
        { id: 'car', label: 'Машина' },
      ],
    },
    { id: 's3', type: 'reflection', mode: 'parent' as const, parentScript: 'Обсудите итог.', questions: ['Какой способ был удобнее?'] },
  ],
};


// Заполнители до REQUIRED_LESSON_COUNT=12 (жёсткое ядро требует ровно 12 уроков).
const EXTRA: Array<{ id: string; title: string }> = [];
for (let i = 3; i <= 12; i++) {
  EXTRA.push({ id: `d${i}`, title: `Урок ${i}` });
}
const fillLesson = (id: string, title: string) => ({
  lessonVersion: 1, id, moduleId: 'demo-drag', title, week: 1, day: i_of(id),
  goals: ['Заполнитель'], parentScript: 'Заполняющий урок.',
  steps: [
    { ...base, id: 's1', type: 'instruction', parentScript: 'Короткая инструкция.', promptNote: undefined },
    { id: 's2', type: 'reflection', mode: 'parent' as const, parentScript: 'Обсудите итог.', questions: ['Готово?'] },
  ],
});
function i_of(id: string) { return parseInt(id.slice(1), 10); }

function main() {
  const manifest = {
    manifestVersion: 1 as const,
    apiVersion: 1,
    minCoreVersion: '1.0.0',
    id: 'demo-drag',
    title: 'Drag-демо (v1.1.1)',
    shortDescription: 'Два урока с перетаскиванием картинок; tap-tap работает всегда.',
    author: 'Home Lessons',
    license: 'CC-BY-NC 4.0',
    ageRange: { from: 3, to: 4 },
    discipline: 'demo' as const,
    cover: 'assets/cover.svg',
    requiredSprites: [],
    usesOwnAssets: false,
    lessons: [
      { file: 'lessons/d1.json', order: 1 },
      { file: 'lessons/d2.json', order: 2 },
      ...EXTRA.map((e, idx) => ({ file: `lessons/${e.id}.json`, order: idx + 3 })),
    ],
  };

  manifestSchema.parse(manifest);
  lessonSchema.parse(L1);
  lessonSchema.parse(L2);

  const files: Record<string, Uint8Array> = {
    'module.json': strToU8(JSON.stringify(manifest, null, 2)),
    'assets/cover.svg': strToU8(COVER_SVG),
    'lessons/d1.json': strToU8(JSON.stringify(L1, null, 2)),
    'lessons/d2.json': strToU8(JSON.stringify(L2, null, 2)),
    ...Object.fromEntries(EXTRA.map((e) => [`lessons/${e.id}.json`, strToU8(JSON.stringify(fillLesson(e.id, e.title), null, 2))])),
  };
  const zipped = zipSync(files);
  mkdirSync('examples', { recursive: true });
  writeFileSync('examples/demo-drag.zip', zipped);
  console.log(`OK: examples/demo-drag.zip (${zipped.length} bytes)`);
}

main();
