// Заглушка сцены для этапа 2 (без спрайт-системы — она на этапе 3).
// Рендерит: фон по токену, персонажа Лунтика — условным «космонавтом»,
// слои — либо dataURL-ассет модуля, либо понятную заглушку missing-placeholder.

import type { Scene, SceneLayer } from '../core/schema';
import { MISSING_PLACEHOLDER_REF } from '../core/scene/legacy';

const BG: Record<string, string> = {
  'soft-lilac': '#F5F3FF',
  white: '#FFFFFF',
};

/** Позиция слоя с учётом repeat: row/col/grid (проценты от размера сцены). */
function layerPositions(layer: SceneLayer): Array<{ x: number; y: number }> {
  const rep = layer.repeat;
  if (!rep || rep.count <= 1) return [{ x: layer.at.x, y: layer.at.y }];
  const out: Array<{ x: number; y: number }> = [];
  const gap = rep.gap ?? 10;
  for (let i = 0; i < rep.count; i++) {
    if (rep.layout === 'row') {
      out.push({ x: layer.at.x + (i - (rep.count - 1) / 2) * gap, y: layer.at.y });
    } else if (rep.layout === 'col') {
      out.push({ x: layer.at.x, y: layer.at.y + (i - (rep.count - 1) / 2) * gap });
    } else {
      const cols = Math.ceil(Math.sqrt(rep.count));
      const r = Math.floor(i / cols), c = i % cols;
      out.push({ x: layer.at.x + (c - (cols - 1) / 2) * gap, y: layer.at.y + r * gap });
    }
  }
  return out;
}

function LayerImage({ layer, assetSrc }: { layer: SceneLayer; assetSrc?: string }) {
  const size = 72 * (layer.scale ?? 1);
  if (assetSrc) {
    return <img src={assetSrc} alt="" className="object-contain" style={{ width: size, height: size }} />;
  }
  // Этап 2: спрайтов ещё нет — рисуем заглушку symbols/ui#missing-placeholder.
  return (
    <div
      role="img"
      aria-label={`Спрайт ${layer.sprite} появится в следующей версии`}
      className="rounded-2xl border-2 border-dashed border-cocoa/30 bg-white/60 grid place-items-center text-cocoa/40"
      style={{ width: size, height: size }}
    >
      <span className="text-2xl" aria-hidden="true">🧩</span>
    </div>
  );
}

export interface SceneViewProps {
  scene: Scene | null | undefined;
  /** Резолвер sprite-ref → dataURL ассета модуля (на этапе 2 — только legacy/image). */
  resolveAsset?: (spriteRef: string) => string | undefined;
  height?: number;
}

export default function SceneView({ scene, resolveAsset, height = 220 }: SceneViewProps) {
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
            <LayerImage layer={layer} assetSrc={resolveAsset?.(layer.sprite === MISSING_PLACEHOLDER_REF ? '' : layer.sprite)} />
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
          {/* Этап 2: временный персонаж-эмодзи; на этапе 3 его заменит <Luntic /> из частей SVG */}
          <span className="text-6xl select-none" role="img" aria-label={`Персонаж, настроение: ${scene.character.emotion}`}>
            {EMOJI_FACE[scene.character.emotion]}
          </span>
        </div>
      )}
    </div>
  );
}

const EMOJI_FACE: Record<string, string> = {
  neutral: '🙂', hello: '👋', ask: '🤔', think: '💭', happy: '😄', sad: '🙁', help: '🙌',
};
