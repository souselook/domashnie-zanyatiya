// Константы рендера сцен. Зафиксированный контракт (Этап 3.5, отчёт пользователю):
//   BASE_ITEM_PCT — базовый размер слоя в % от МЕНЬШЕЙ стороны контейнера.
//   ОДИН для всех слоёв независимо от repeat.count: «1 яблоко» и «3 яблока» —
//   одного размера; count влияет только на позиции, не на масштаб.
//   Финальный размер элемента = BASE_ITEM_PCT * layer.scale.
//   CHARACTER_SIZE_PCT — базовый размер персонажа <Luntic /> в % от меньшей стороны.

export const BASE_ITEM_PCT = 15;
export const CHARACTER_SIZE_PCT = 30;

// Токены фонов сцены → CSS-значения.
export const BACKGROUND_TOKENS_CSS: Record<string, string> = {
  'soft-lilac': '#F5F3FF',
  white: '#FFFFFF',
  transparent: 'transparent',
};
