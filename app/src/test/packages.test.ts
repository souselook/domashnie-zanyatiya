import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lessonSchema, manifestSchema, registrySchema } from '../core/schema';

/**
 * Регрессионный тест «пакетов» ядра: реальные файлы public/modules/*
 * должны проходить схемы ядра. Если схема ужесточится и demo-модуль
 * сломается — тест упадёт до релиза.
 */
const MODULES_DIR = resolve(__dirname, '../../public/modules');

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8'));

describe('реальные пакеты в public/modules', () => {
  it('registry.json валиден', () => {
    expect(registrySchema.safeParse(readJson(resolve(MODULES_DIR, 'registry.json'))).success).toBe(true);
  });

  it('demo-core-check: манифест и оба урока валидны', () => {
    const man = manifestSchema.safeParse(readJson(resolve(MODULES_DIR, 'demo-core-check/module.json')));
    expect(man.success).toBe(true);
    if (!man.success) return;
    for (const l of man.data.lessons) {
      const les = lessonSchema.safeParse(readJson(resolve(MODULES_DIR, 'demo-core-check', l.file)));
      expect(les.success, `урок ${l.file}`).toBe(true);
    }
  });

  it('broken-demo: урок с неизвестным типом шага ОТКЛОНЯЕТСЯ ядром', () => {
    // Модуль выключен в реестре (enabled:false) — он существует ровно для того,
    // чтобы демонстрировать понятную ошибку формата.
    const bad = lessonSchema.safeParse(readJson(resolve(MODULES_DIR, 'broken-demo/lessons/bad.json')));
    expect(bad.success).toBe(false);
  });
});
