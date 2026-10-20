import { z } from 'zod';
import { sceneSchema } from './scene';

export { sceneSchema, spriteRefSchema } from './scene';
export type { Scene, SceneLayer, SceneCharacter } from './scene';

/* ── Общие примитивы ─────────────────────────────────────────── */

// Путь внутри пакета модуля: только относительный, без .. и внешних схем.
// Допускается завершающий слэш ("demo-core-check/").
export const relPath = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*\/?$/, 'Недопустимый путь (только относительный, без "..")');

const semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'Ожидается semver, например 1.0.0');

export const ageRangeSchema = z.object({
  from: z.number().int().min(0).max(18),
  to: z.number().int().min(0).max(18),
}).refine((r) => r.from <= r.to, { message: 'Возрастной диапазон: from > to' });

/* ── Реестр модулей (registry.json) ──────────────────────────── */
// Неизвестные поля игнорируем (forward-compat), поэтому НЕ strict().

export const registryEntrySchema = z.object({
  id: z.string().min(1),
  path: relPath,
  enabled: z.boolean().default(true),
});

export const registrySchema = z.object({
  apiVersion: z.literal(1),
  modules: z.array(registryEntrySchema).min(0),
});

/* ── Манифест модуля (module.json) ───────────────────────────── */
// Строгая схема: ловим опечатки в новых полях на этапе загрузки.

export const manifestSchema = z.object({
  manifestVersion: z.literal(1),
  apiVersion: z.number().int().min(1),
  minCoreVersion: semver,
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  ageRange: ageRangeSchema,
  discipline: z.enum(['demo', 'reading', 'math', 'logic', 'world', 'speech', 'art', 'other']),
  cover: relPath.optional(),
  // Новое (решение 4 сверх спеки): плоский список спрайт-ссылок, нужных модулю.
  // Контракт загрузчика: по умолчанию — пустой массив (не undefined).
  requiredSprites: z.array(z.string()).optional().default([]),
  usesOwnAssets: z.boolean().optional(),
  lessons: z.array(z.object({
    file: relPath,
    order: z.number().int().min(1),
  })).min(1),
}).strict();

/* ── Шаг урока (union по type) ───────────────────────────────── */

const baseStep = {
  id: z.string().min(1),
  parentScript: z.string().min(1),
  mode: z.enum(['parent', 'child']).default('parent'),
  durationSec: z.number().int().positive().optional(),
  // v2-задел: озвучивание зарезервировано, в v1 не используется.
  voice: z.enum(['ru-female', 'ru-male', 'none']).optional(),
};

/**
 * Поле визуала шага. В новой форме — `scene` (декларативная сцена из спрайтов).
 * Легаси-форма `asset` (одиночный файл) принята как опциональная и конвертируется
 * ядром через legacyAssetToScene() — см. src/core/scene/legacy.ts.
 */
const visualFields = {
  scene: sceneSchema.optional(),
  asset: relPath.optional(), // УСТАРЕЛО, поддерживается обратно совместимо
};

const optionBase = {
  id: z.string().min(1),
  label: z.string().min(1),
  image: relPath.optional(),
  alt: z.string().min(1).optional(),
  scene: sceneSchema.optional(), // новая форма вместо image
  asset: relPath.optional(),     // легаси-форма
};

export const pictureChoiceSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('picture-choice'),
  prompt: z.string().min(1),
  options: z.array(z.object({
    ...optionBase,
    correct: z.boolean().default(false),
  })).min(2).max(6),
});

export const matchSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('match'),
  prompt: z.string().min(1),
  pairs: z.array(z.object({
    left: z.object(optionBase),
    right: z.object(optionBase),
  })).min(2).max(6),
});

export const countSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('count'),
  prompt: z.string().min(1),
  items: z.object({
    kind: z.enum(['circle', 'square', 'triangle', 'star']).optional(),
    color: z.string().optional(),
    count: z.number().int().min(1).max(10),
    // новая форма: спрайт предметов + repeat (предпочтительна)
    sprite: z.string().optional(),
    props: z.record(z.string()).optional(),
    // опциональный множитель размера предмета (как layer.scale); по умолчанию 1.0
    scale: z.number().positive().min(0.1).max(5).optional(),
  }),
  answer: z.number().int().min(1).max(10),
});

export const featureChoiceSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('feature-choice'),
  prompt: z.string().min(1),
  feature: z.string().min(1),
  options: z.array(z.object({
    ...optionBase,
    hasFeature: z.boolean(),
  })).min(2).max(8),
});

export const tracePointSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('trace-point'),
  prompt: z.string().min(1),
  image: relPath.optional(),
  alt: z.string().min(1).default(''),
  offlineAction: z.string().min(1),
});

export const offlineTaskSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('offline-task'),
  // prompt (optional) — короткий заголовок шага; если не задан, рендерер использует parentScript или sid
  prompt: z.string().min(1).max(120).optional(),
  actionText: z.string().min(1),
  checklist: z.array(z.string().min(1)).max(5).optional(),
});

export const reflectionSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('reflection'),
  // prompt (optional) — короткий заголовок шага; если не задан, рендерер использует parentScript или sid
  prompt: z.string().min(1).max(120).optional(),
  questions: z.array(z.string().min(1)).min(1).max(3),
});

export const instructionSchema = z.object({
  ...baseStep,
  ...visualFields,
  type: z.literal('instruction'),
});

export const stepSchema = z.discriminatedUnion('type', [
  instructionSchema,
  pictureChoiceSchema,
  matchSchema,
  countSchema,
  featureChoiceSchema,
  tracePointSchema,
  offlineTaskSchema,
  reflectionSchema,
]);

/* ── Урок (lessons/*.json) ───────────────────────────────────── */

export const lessonSchema = z.object({
  lessonVersion: z.literal(1),
  id: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().min(1),
  ageRange: ageRangeSchema.optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  tips: z.array(z.string()).default([]),
  materials: z.array(z.object({
    name: z.string().min(1),
    icon: z.enum(['blocks', 'cards', 'sticks', 'paper', 'pen', 'ball', 'toy']).optional(),
  })).default([]),
  steps: z.array(stepSchema).min(1),
}).superRefine((lesson, ctx) => {
  // Инварианты структуры урока.
  const ids = lesson.steps.map((s) => s.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Дублируются id шагов' });
  }
  const refl = lesson.steps.filter((s) => s.type === 'reflection');
  // Усилено решением сверх спеки: ровно одна reflection, всегда последняя.
  if (refl.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'В уроке должна быть ровно одна рефлексия' });
  } else if (lesson.steps[lesson.steps.length - 1]?.type !== 'reflection') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Рефлексия должна быть последним шагом' });
  }
});

/* ── Итоговые типы ───────────────────────────────────────────── */

export type RegistryEntry = z.infer<typeof registryEntrySchema>;
export type Registry = z.infer<typeof registrySchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Step = z.infer<typeof stepSchema>;
export type AgeRange = z.infer<typeof ageRangeSchema>;
