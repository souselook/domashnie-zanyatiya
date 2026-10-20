import { describe, expect, it } from 'vitest';
import { manifestSchema, lessonSchema, registrySchema } from '../core/schema';

const goodManifest = {
  manifestVersion: 1,
  apiVersion: 1,
  minCoreVersion: '1.0.0',
  id: 'demo-core-check',
  title: 'Демо',
  shortDescription: 'Тестовый модуль',
  author: 'Ядро',
  license: 'MIT',
  ageRange: { from: 3, to: 6 },
  discipline: 'demo',
  lessons: [{ file: 'lessons/a.json', order: 1 }],
};

describe('registrySchema', () => {
  it('валидирует корректный реестр и включает enabled по умолчанию', () => {
    const r = registrySchema.safeParse({
      apiVersion: 1,
      modules: [{ id: 'x', path: 'x/' }],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.modules[0].enabled).toBe(true);
  });

  it('отклоняет неизвестную версию API реестра', () => {
    expect(registrySchema.safeParse({ apiVersion: 2, modules: [] }).success).toBe(false);
  });

  it('отклоняет путь с ".." (защита от выхода за пакет)', () => {
    expect(registrySchema.safeParse({
      apiVersion: 1,
      modules: [{ id: 'x', path: '../secret/' }],
    }).success).toBe(false);
  });
});

describe('manifestSchema', () => {
  it('валидирует корректный манифест', () => {
    expect(manifestSchema.safeParse(goodManifest).success).toBe(true);
  });

  it('отклоняет неизвестное поле (strict — ловим опечатки)', () => {
    expect(manifestSchema.safeParse({ ...goodManifest, lessons: [] }).success).toBe(false);
  });

  it('отклоняет пустой список уроков', () => {
    expect(manifestSchema.safeParse({ ...goodManifest, lessons: [] }).success).toBe(false);
  });

  it('отклоняет перевёрнутый возрастной диапазон', () => {
    expect(manifestSchema.safeParse({ ...goodManifest, ageRange: { from: 6, to: 3 } }).success).toBe(false);
  });
});

const baseStep = (over: Record<string, unknown>) => ({
  id: 's1', type: 'instruction', mode: 'parent',
  parentScript: 'Текст', ...over,
});

describe('lessonSchema', () => {
  const goodLesson = {
    lessonVersion: 1, id: 'l1', moduleId: 'm', title: 'Урок',
    steps: [baseStep({}), baseStep({ id: 's2', type: 'reflection', questions: ['Как прошло?'] })],
  };

  it('валидирует корректный урок', () => {
    expect(lessonSchema.safeParse(goodLesson).success).toBe(true);
  });

  it('отклоняет неизвестный тип шага', () => {
    const r = lessonSchema.safeParse({
      ...goodLesson,
      steps: [baseStep({ type: 'laser-tag' })],
    });
    expect(r.success).toBe(false);
  });

  it('требует рефлексию последним шагом', () => {
    expect(lessonSchema.safeParse({
      ...goodLesson,
      steps: [baseStep({ id: 's2', type: 'reflection', questions: ['?'] }), baseStep({})],
    }).success).toBe(false);
  });

  it('не допускает двух рефлексий', () => {
    expect(lessonSchema.safeParse({
      ...goodLesson,
      steps: [
        baseStep({ id: 'r1', type: 'reflection', questions: ['?'] }),
        baseStep({ id: 's2', type: 'reflection', questions: ['?'] }),
      ],
    }).success).toBe(false);
  });

  it('ловит дубликаты id шагов', () => {
    expect(lessonSchema.safeParse({
      ...goodLesson, steps: [baseStep({}), baseStep({})],
    }).success).toBe(false);
  });

  it('требует минимум 2 варианта в picture-choice', () => {
    expect(lessonSchema.safeParse({
      ...goodLesson,
      steps: [baseStep({ type: 'picture-choice', prompt: 'Где?', options: [{ id: 'a', label: 'А' }] })],
    }).success).toBe(false);
  });
});
