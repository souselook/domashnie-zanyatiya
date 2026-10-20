// Сцены (решение 1 сверх спецификации): декларативное описание картинки из спрайтов.
// Координаты и gap — в процентах от размера сцены.

import { z } from 'zod';

/**
 * Ссылка на спрайт: `<категория>/<файл>#<symbol-id>` или без #symbol (лист целиком / ассет модуля).
 * Запрещены ../, http(s):, data:, абсолютные пути — whitelist-регулярка.
 * Cyrillic в symbol-id разрешён (letter-А и т.п.).
 */
export const SPRITE_REF_PATTERN = /^[a-z0-9-]+\/[A-Za-z0-9._-]+(?:#[\w\u0400-\u04FF.-]+)?$/;

export const spriteRefSchema = z.string().regex(SPRITE_REF_PATTERN, { message: 'Недопустимая ссылка на спрайт' });

export const BACKGROUND_TOKENS = ['soft-lilac', 'white', 'transparent'] as const;

export const sceneRepeatSchema = z.object({
  count: z.number().int().min(1).max(20),
  layout: z.enum(['row', 'col', 'grid']).default('row'),
  gap: z.number().min(0).max(100).default(10), // проценты
});

export const sceneLayerSchema = z.object({
  sprite: spriteRefSchema,
  at: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  scale: z.number().min(0.1).max(5).default(1),
  repeat: sceneRepeatSchema.optional(),
  props: z.record(z.string()).optional(),
});

export const EMOTION_VALUES = ['hello', 'ask', 'think', 'happy', 'sad', 'help', 'neutral'] as const;
export const GESTURE_VALUES = ['rest', 'wave', 'reach', 'up'] as const;

export const sceneCharacterSchema = z.object({
  emotion: z.enum(EMOTION_VALUES),
  gesture: z.enum(GESTURE_VALUES).default('rest'),
  anchor: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
});

export const sceneSchema = z.object({
  background: z.enum(BACKGROUND_TOKENS).optional(),
  layers: z.array(sceneLayerSchema).min(0).default([]),
  character: sceneCharacterSchema.optional(),
});

export type SceneRepeat = z.infer<typeof sceneRepeatSchema>;
export type SceneLayer = z.infer<typeof sceneLayerSchema>;
export type SceneCharacter = z.infer<typeof sceneCharacterSchema>;
export type Scene = z.infer<typeof sceneSchema>;
