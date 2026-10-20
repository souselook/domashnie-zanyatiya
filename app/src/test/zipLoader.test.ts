// Unit-тесты zip-загрузчика (Этап 2, требование C): каждый код ошибки —
// отдельным человекочитаемым текстом, без стектрейсов.
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { parseModuleZip } from '../core/zipLoader';
import lessonFixture from '../../demo/w1d1-sort-by-color.json';

const MODULE_ID = 'legacy-demo-module';

function manifest(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    manifestVersion: 1,
    apiVersion: 1,
    minCoreVersion: '1.0.0',
    id: MODULE_ID,
    title: 'Легаси-демо',
    shortDescription: 'Технический модуль для проверки загрузчика.',
    author: 'core',
    license: 'MIT',
    ageRange: { from: 3, to: 4 },
    discipline: 'demo',
    lessons: Array.from({ length: 12 }, (_, i) => ({ file: `lessons/l${i + 1}.json`, order: i + 1 })),
    ...over,
  });
}

function lessonJson(i: number) {
  const l = JSON.parse(JSON.stringify(lessonFixture));
  l.id = `l${i + 1}`;
  return JSON.stringify(l);
}

/** Валидный архив: 1 module.json + ровно 12 уроков. */
function goodZip(root = '') {
  const files: Record<string, Uint8Array> = { [`${root}module.json`]: strToU8(manifest()) };
  for (let i = 0; i < 12; i++) files[`${root}lessons/l${i + 1}.json`] = strToU8(lessonJson(i));
  return zipSync(files).buffer as ArrayBuffer;
}

describe('parseModuleZip — happy path', () => {
  it('валидный zip из 12 уроков парсится', () => {
    const r = parseModuleZip(goodZip());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.manifest.id).toBe(MODULE_ID);
      expect(Object.keys(r.data.lessons)).toHaveLength(12);
    }
  });
  it('zip с единственной корневой папкой тоже валиден', () => {
    expect(parseModuleZip(goodZip('my-module/')).ok).toBe(true);
  });
});

describe('parseModuleZip — человекочитаемые ошибки (требование C)', () => {
  it('нет module.json', () => {
    const buf = zipSync({ 'lessons/a.json': strToU8('{}') }).buffer as ArrayBuffer;
    const r = parseModuleZip(buf);
    expect(!r.ok && r.error.message).toBe('В архиве нет module.json');
  });

  it('больше одного module.json', () => {
    const buf = zipSync({
      'module.json': strToU8(manifest()),
      'extra/module.json': strToU8(manifest()),
    }).buffer as ArrayBuffer;
    const r = parseModuleZip(buf);
    expect(!r.ok && r.error.message).toBe('В архиве больше одного module.json');
  });

  it('уроков должно быть ровно 12, найдено N', () => {
    const files: Record<string, Uint8Array> = { 'module.json': strToU8(manifest()) };
    for (let i = 0; i < 11; i++) files[`lessons/l${i + 1}.json`] = strToU8(lessonJson(i));
    const r = parseModuleZip(zipSync(files).buffer as ArrayBuffer);
    expect(!r.ok && r.error.message).toBe('Уроков должно быть ровно 12, найдено 11.');
  });

  it('в уроке нет reflection или она не последняя', () => {
    const bad = JSON.parse(lessonJson(0));
    bad.steps = bad.steps.filter((s: { type: string }) => s.type !== 'reflection'); // рефлексии нет
    const files: Record<string, Uint8Array> = { 'module.json': strToU8(manifest()) };
    for (let i = 0; i < 12; i++) {
      files[`lessons/l${i + 1}.json`] = strToU8(i === 5 ? JSON.stringify(bad) : lessonJson(i));
    }
    const r = parseModuleZip(zipSync(files).buffer as ArrayBuffer);
    // Битый урок отсекается на Zod-инварианте (ровно одна reflection) до спец-проверки —
    // текст ошибки должен называть урок и суть проблемы.
    expect(!r.ok && /рефлекс|reflection/i.test(r.error.message + (r.error.detail ?? ''))).toBe(true);
  });

  it('lesson.moduleId не совпадает с manifest.id', () => {
    const files: Record<string, Uint8Array> = { 'module.json': strToU8(manifest()) };
    for (let i = 0; i < 12; i++) {
      const l = JSON.parse(lessonJson(i));
      if (i === 0) l.moduleId = 'other-module';
      files[`lessons/l${i + 1}.json`] = strToU8(JSON.stringify(l));
    }
    const r = parseModuleZip(zipSync(files).buffer as ArrayBuffer);
    expect(!r.ok && r.error.message).toContain('не совпадает с manifest.id');
  });

  it('модуль для более новой версии ядра → INCOMPATIBLE', () => {
    const files: Record<string, Uint8Array> = { 'module.json': strToU8(manifest({ apiVersion: 2 })) };
    for (let i = 0; i < 12; i++) files[`lessons/l${i + 1}.json`] = strToU8(lessonJson(i));
    const r = parseModuleZip(zipSync(files).buffer as ArrayBuffer);
    expect(!r.ok && r.error.code).toBe('INCOMPATIBLE');
  });

  it('битый JSON манифеста → INVALID_JSON, без стектрейса', () => {
    const files: Record<string, Uint8Array> = { 'module.json': strToU8('{oops') };
    for (let i = 0; i < 12; i++) files[`lessons/l${i + 1}.json`] = strToU8(lessonJson(i));
    const r = parseModuleZip(zipSync(files).buffer as ArrayBuffer);
    expect(!r.ok && r.error.code).toBe('INVALID_JSON');
  });

  it('не-ZIP файл → ZIP_INVALID', () => {
    const buf = new TextEncoder().encode('this is not a zip').buffer as ArrayBuffer;
    const r = parseModuleZip(buf);
    expect(!r.ok && r.error.code).toBe('ZIP_INVALID');
  });
});
