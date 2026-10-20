// Рендер сцены: позиции repeat-слоёв считаются ЕДИНСТВЕННЫМ источником раскладки —
// core/scene/layout.ts (computeRepeatPositions) + core/scene/constants.ts (BASE_ITEM_PCT).
// Контракт Этапа 3.5: размер элемента = BASE_ITEM_PCT * layer.scale (% от меньшей стороны
// контейнера, поэтому width в % + aspect-square; height авто по viewBox спрайта).

import type { Scene, SceneLayer } from '../core/schema';
import { MISSING_PLACEHOLDER_REF } from '../core/scene/legacy';
import { computeRepeatPositions } from '../core/scene/layout';
import { BASE_ITEM_PCT, BACKGROUND_TOKENS_CSS } from '../core/scene/constants';
import { Sprite } from '../core/sprites/Sprite';

const BG = BACKGROUND_TOKENS_CSS;

/** Позиция слоя с учётом repeat: row/col/grid (проценты от размера сцены). */
function layerPositions(layer: SceneLayer): Array<{ x: number; y: number }> {
  const rep = layer.repeat;
  if (!rep || rep.count <= 1) return [{ x: layer.at.x, y: layer.at.y }];
  return computeRepeatPositions(layer.at, { count: rep.count, layout: rep.layout, gap: rep.gap ?? 10 }, layer.scale ?? 1);
}

function LayerImage({ layer, assetSrc, moduleId }: { layer: SceneLayer; assetSrc?: string; moduleId?: string }) {
  // Размер из контракта layout/constants: BASE_ITEM_PCT * scale, в % от меньшей стороны.
  const sizePct = BASE_ITEM_PCT * (layer.scale ?? 1);
  const style = { width: `${sizePct}%`, height: 'auto', aspectRatio: '1 / 1' } as const;
  if (assetSrc) {
    return <img src={assetSrc} alt="" className="object-contain" style={style} />;
  }
  // Ассета модуля нет — спрайт библиотеки ядра через <Sprite /> (Этап 3.1).
  return (
    <div style={style}>
      <Sprite spriteRef={layer.sprite} props={layer.props} moduleId={moduleId} alt={`Слой ${layer.sprite}`} size="100%" />
    </div>
  );
}

export interface SceneViewProps {
  scene: Scene | null | undefined;
  /** Резолвер sprite-ref → dataURL ассета модуля (ассеты из zip приоритетнее библиотеки). */
  resolveAsset?: (spriteRef: string) => string | undefined;
  /** Модуль — для overrides и assets в спрайт-резолвере. */
  moduleId?: string;
  height?: number;
}

// Эмоция+жест Лунтика → набор <symbol>-ов из character/luntic.svg (часть-за-частью).
const FACE: Record<string, { eye: string; brow: string; mouth: string }> = {
  neutral: { eye: 'luntic-eye-open', brow: 'luntic-brow-neutral', mouth: 'luntic-mouth-neutral' },
  hello: { eye: 'luntic-eye-happy', brow: 'luntic-brow-neutral', mouth: 'luntic-mouth-smile' },
  ask: { eye: 'luntic-eye-open', brow: 'luntic-brow-up', mouth: 'luntic-mouth-open' },
  think: { eye: 'luntic-eye-open', brow: 'luntic-brow-up', mouth: 'luntic-mouth-neutral' },
  happy: { eye: 'luntic-eye-happy', brow: 'luntic-brow-neutral', mouth: 'luntic-mouth-smile' },
  sad: { eye: 'luntic-eye-sad', brow: 'luntic-brow-frown', mouth: 'luntic-mouth-sad' },
  help: { eye: 'luntic-eye-open', brow: 'luntic-brow-up', mouth: 'luntic-mouth-open' },
};
const ARM: Record<string, string> = { rest: 'luntic-arm-rest', wave: 'luntic-arm-wave', reach: 'luntic-arm-reach', up: 'luntic-arm-up' };

function Luntic({ emotion, gesture }: { emotion: string; gesture: string }) {
  const face = FACE[emotion] ?? FACE.neutral;
  // Персонаж собирается из частей спрайт-листа ядра; недостающие symbol дадут
  // пустой <use> — фон-заглушка не нужна, тело/голова всегда нарисованы.
  return (
    <svg viewBox="0 0 256 256" width={96} height={96} role="img" aria-label={`Персонаж, настроение: ${emotion}`} className="mx-auto">
      <use href={`/sprites/character/luntic.svg#luntic-body`} />
      <use href={`/sprites/character/luntic.svg#luntic-head`} />
      <use href={`/sprites/character/luntic.svg#${face.eye}`} />
      <use href={`/sprites/character/luntic.svg#${face.brow}`} />
      <use href={`/sprites/character/luntic.svg#${face.mouth}`} />
      <use href={`/sprites/character/luntic.svg#${ARM[gesture] ?? ARM.rest}`} />
    </svg>
  );
}

export default function SceneView({ scene, resolveAsset, moduleId, height = 220 }: SceneViewProps) {
  if (!scene) return null;
  const bg = scene.background ? BG[scene.background] : 'transparent';
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden mb-3"
      style={{ background: bg ?? 'transparent', minHeight: height }}
      data-testid="scene"
      data-sprite-count={scene.layers.length}
    >
      {scene.layers.map((layer, i) =>
        layerPositions(layer).map((pos, j) => (
          <div
            key={`${i}-${j}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${Math.min(98, Math.max(2, pos.x))}%`, top: `${Math.min(96, Math.max(4, pos.y))}%` }}
          >
            <LayerImage layer={layer} assetSrc={resolveAsset?.(layer.sprite === MISSING_PLACEHOLDER_REF ? '' : layer.sprite)} moduleId={moduleId} />
          </div>
        )),
      )}
      {scene.character && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center animate-[fadeIn_300ms_ease-out]"
          style={{
            left: `${scene.character.anchor?.x ?? 82}%`,
            top: `${scene.character.anchor?.y ?? 55}%`,
          }}
          data-testid="scene-character"
          data-emotion={scene.character.emotion}
          data-gesture={scene.character.gesture}
          title={`Лунтик: ${scene.character.emotion}`}
        >
          {/* Персонаж из частей SVG спрайт-листа ядра (character/luntic.svg) */}
          <Luntic emotion={scene.character.emotion} gesture={scene.character.gesture} />
        </div>
      )}
    </div>
  );
}
