import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../core/loader';
import { stepScene } from '../core/scene/legacy';
import type { Step, Scene } from '../core/schema';
import SceneView from './SceneView';

/* ── Визуальные примитивы (без внешних ассетов — SVG-фигуры) ── */

export function Shape({ kind, color = '#E8A13C', size = 64 }: {
  kind: 'circle' | 'square' | 'triangle' | 'star'; color?: string; size?: number;
}) {
  const s = size;
  switch (kind) {
    case 'circle':
      return <svg width={s} height={s} aria-hidden="true"><circle cx={s / 2} cy={s / 2} r={s / 2 - 4} fill={color} /></svg>;
    case 'square':
      return <svg width={s} height={s} aria-hidden="true"><rect x="4" y="4" width={s - 8} height={s - 8} rx="8" fill={color} /></svg>;
    case 'triangle':
      return <svg width={s} height={s} aria-hidden="true"><polygon points={`${s / 2},6 ${s - 6},${s - 6} 6,${s - 6}`} fill={color} /></svg>;
    case 'star':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.63 1.12 6.57L12 17.27 6.13 20.5l1.12-6.57L2.5 9.3l6.6-1.04z" fill={color} />
        </svg>
      );
  }
}

/** Картинка опции задания: scene > legacy asset (через SceneView с warn) > image-файл > фигура. */
function OptionImage({ moduleId, step, resolveAssetSrc }: {
  moduleId: string;
  step: { image?: string; alt?: string; label: string; scene?: Scene; asset?: string };
  resolveAssetSrc?: (rel: string) => string | undefined;
}) {
  // Новая форма — сцена; легаси-asset конвертируется ядром (требование 1 сверх спеки).
  const scene = stepScene(step);
  if (scene) {
    return (
      <SceneView
        scene={scene}
        height={80}
        moduleId={moduleId}
        resolveAsset={(rel) => resolveAssetSrc?.(rel)}
      />
    );
  }
  const src = resolveAssetSrc?.(step.image ?? '') ?? assetUrl(moduleId, step.image);
  if (!src) return <Shape kind="circle" size={72} />;
  return (
    <img
      src={src}
      alt={step.alt ?? step.label}
      className="w-20 h-20 object-contain rounded-xl bg-sand/40"
      onError={(e) => { (e.currentTarget.style.display = 'none'); }}
    />
  );
}

/** Заглушка типов шагов, которые появятся в следующей версии. */
function NextVersionNotice({ prompt, typeName }: { prompt: string; typeName: string }) {
  return (
    <div className="text-center py-6 space-y-2" data-testid="next-version-notice">
      <p className="text-xl font-extrabold">{prompt}</p>
      <p className="opacity-60">🚧 {typeName}: этот тип шага появится в следующей версии.</p>
      <p className="text-sm opacity-50">Выполните задание руками или пропустите шаг кнопкой «Дальше».</p>
    </div>
  );
}

/* ── Рендереры заданий (read-only = предпросмотр) ────────────── */

export interface TaskViewProps {
  step: Step;
  moduleId: string;
  readOnly?: boolean;
  /** Резолвер относительного пути ассета модуля → URL (для zip-ассетов из IndexedDB). */
  resolveAssetSrc?: (rel: string) => string | undefined;
  // интерактив (Stage 3):
  selectedId?: string | null;
  onSelectOption?: (id: string) => void;
  countAnswer?: number | null;
  onCountAnswer?: (n: number) => void;
}

/** Визуальная часть шага: scene (или legacy asset) над контентом задания. */
function StepVisual({ step, moduleId, resolveAssetSrc }: Pick<TaskViewProps, 'step' | 'moduleId'> & Pick<TaskViewProps, 'resolveAssetSrc'>) {
  const scene = stepScene(step);
  if (!scene) return null;
  return (
    <SceneView
      scene={scene}
      moduleId={moduleId}
      resolveAsset={(ref) => {
        // этап 2: спрайтовой библиотеки нет — sprite-ref вида "objects/fruits#apple"
        // пробуем резолвить как путь файла ассета модуля ("objects/fruits.svg")
        const rel = ref.split('#')[0] + '.svg';
        return resolveAssetSrc?.(rel) ?? resolveAssetSrc?.(ref);
      }}
    />
  );
}

function InstructionView() {
  return <p className="text-cocoa/70 italic">Инструкция для родителя — см. блок скрипта выше.</p>;
}

function PictureChoiceView({ step, moduleId, readOnly, selectedId, onSelectOption, resolveAssetSrc }: Required<Pick<TaskViewProps, 'step' | 'moduleId' | 'readOnly'>> & Pick<TaskViewProps, 'selectedId' | 'onSelectOption' | 'resolveAssetSrc'> & { step: Extract<Step, { type: 'picture-choice' }> }) {
  const isDrag = step.interaction === 'drag' && !readOnly;
  // v1.1.1 drag-режим: pointerdown на варианте → «намерение»; pointerup внутри drop-зоны → выбор.
  // Tap-to-select работает всегда (a11y/fallback): клик по варианту выделяет, клик/Enter по drop-зоне размещает.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragIntent = useRef<string | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDrag) return;
    const up = () => { dragIntent.current = null; setDraggingId(null); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [isDrag]);

  const inZone = (x: number, y: number) => {
    const el = zoneRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const handleZonePointerUp = (e: React.PointerEvent) => {
    if (!isDrag || !dragIntent.current) return;
    e.preventDefault();
    if (inZone(e.clientX, e.clientY)) onSelectOption?.(dragIntent.current);
    dragIntent.current = null;
    setDraggingId(null);
  };

  // Клавигатура на самом варианте: Enter/Space = tap-to-select (работает и в drag-режиме).
  const keySelect = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectOption?.(id); }
  };

  // v1.1.1 фикс: клик по варианту в drag-режиме не должен «приземляться» на
  // drop-зону, если вариант лежит под ней (иначе тап-тап срабатывал дважды и
  // тесты проходили мимо реального пути). Останавливаем всплытие pointer-событий.
  const stopBubble = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div>
      <p className="text-2xl font-extrabold mb-4">{step.prompt}</p>
      {isDrag && (
        <div
          ref={zoneRef}
          data-testid="drop-zone"
          role="button"
          tabIndex={0}
          aria-label="Зона размещения выбранной картинки"
          className="card border-4 border-dashed border-amber1/50 min-h-[96px] flex items-center justify-center mb-4 text-cocoa/60 select-none touch-none"
          onPointerUp={handleZonePointerUp}
          onClick={() => { if (selectedId) onSelectOption?.(selectedId); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (selectedId) onSelectOption?.(selectedId); } }}
        >
          {selectedId
            ? `Выбрано: ${step.options.find((o) => o.id === selectedId)?.label ?? selectedId}`
            : (draggingId ? 'Отпустите здесь' : 'Перетащите картинку сюда или выберите и нажмите')}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" role={readOnly ? undefined : 'group'} aria-label="Варианты ответа">
        {step.options.map((o) => (
          <button key={o.id} type="button" disabled={readOnly}
            data-testid={isDrag ? `drag-source-${o.id}` : undefined}
            className={`task-option ${draggingId === o.id ? 'opacity-70' : ''}`}
            aria-pressed={selectedId === o.id}
            style={{ minHeight: 44, touchAction: isDrag ? 'none' : undefined }}
            onPointerDown={isDrag ? (e) => {
              stopBubble(e);
              dragIntent.current = o.id;
              setDraggingId(o.id);
            } : undefined}
            onKeyDown={keySelect(o.id)}
            onClick={() => onSelectOption?.(o.id)}>
            <OptionImage moduleId={moduleId} step={o} resolveAssetSrc={resolveAssetSrc} />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      {isDrag && draggingId && <div data-testid="drag-active" className="sr-only" aria-live="polite">Перетаскивание: {draggingId}</div>}
    </div>
  );
}

/* match / feature-choice / trace-point — зарегистрированы в реестре шагов (schema),
   но интерактив появится в следующей версии (согласованное решение v1). */
function MatchView({ step }: { step: Extract<Step, { type: 'match' }> }) {
  return <NextVersionNotice prompt={step.prompt} typeName="Сопоставление" />;
}

function CountView({ step, readOnly, countAnswer, onCountAnswer }: { step: Extract<Step, { type: 'count' }>; readOnly: boolean } & Pick<TaskViewProps, 'countAnswer' | 'onCountAnswer'>) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-4">{step.prompt}</p>
      <div className="card flex flex-wrap gap-3 justify-center p-6 mb-4" aria-label={`Предметы для счёта: ${step.items.count} шт.`}>
        {Array.from({ length: step.items.count }, (_, i) => (
          <Shape key={i} kind={step.items.kind ?? "circle"} color={step.items.color} size={56} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 justify-center" role={readOnly ? undefined : 'group'} aria-label="Выбор числа">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" disabled={readOnly}
            className={`btn-secondary !min-h-[48px] !px-4 ${countAnswer === n ? '!bg-amber1 !text-white' : ''}`}
            aria-pressed={countAnswer === n}
            onClick={() => onCountAnswer?.(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function FeatureChoiceView({ step }: { step: Extract<Step, { type: 'feature-choice' }> }) {
  return <NextVersionNotice prompt={step.prompt} typeName="Выбор по признаку" />;
}

function TracePointView({ step }: { step: Extract<Step, { type: 'trace-point' }> }) {
  return <NextVersionNotice prompt={step.prompt} typeName="Обводка и показ" />;
}

/** Офлайн-задание: чек-лист выполняется руками; состояние галочек — локальное. */
function OfflineTaskView({ step, confirmed, onToggleCheck }: {
  step: Extract<Step, { type: 'offline-task' }>;
  confirmed?: boolean;
  onToggleCheck?: (i: number) => void;
}) {
  const [localChecks, setLocalChecks] = useState<boolean[]>(() => new Array(step.checklist?.length ?? 0).fill(false));
  return (
    <div>
      {/* prompt (optional): если задан — заголовок; иначе «Шаг: sid» (без undefined) */}
      <p className="text-2xl font-extrabold mb-3">🖐 {step.prompt ?? `Задание руками (${step.id})`}</p>
      <p className="card bg-sand/30 text-lg mb-4">{step.actionText}</p>
      {step.checklist && (
        <ul className="space-y-2 mb-4 list-none p-0">
          {step.checklist.map((c, i) => (
            <li key={i}>
              <label className="flex items-center gap-3 card py-3 cursor-pointer">
                <input type="checkbox" className="w-6 h-6 accent-amber1"
                  checked={confirmed || localChecks[i]}
                  onChange={() => { setLocalChecks((cs) => cs.map((v, j) => (j === i ? !v : v))); onToggleCheck?.(i); }}
                  disabled={confirmed || !onToggleCheck} />
                <span>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Рефлексия: вопросы + заметки родителя (сохраняются локально). */
function ReflectionView({ step, notes, onNotes }: {
  step: Extract<Step, { type: 'reflection' }>;
  notes?: string;
  onNotes?: (v: string) => void;
}) {
  return (
    <div>
      {/* prompt (optional): если задан — заголовок; иначе «Как прошло? (sid)» (без undefined) */}
      <p className="text-2xl font-extrabold mb-3">💬 {step.prompt ?? `Как прошло? (${step.id})`}</p>
      <ul className="list-none p-0 space-y-2 mb-4">
        {step.questions.map((q, i) => <li key={i} className="card bg-sand/30">{q}</li>)}
      </ul>
      <label className="block font-bold mb-1" htmlFor="refl-notes">Заметки родителя (сохраняются локально)</label>
      <textarea id="refl-notes" rows={4} value={notes ?? ''} onChange={(e) => onNotes?.(e.target.value)}
        disabled={!onNotes}
        className="w-full card !p-3 text-base resize-y" placeholder="Например: сегодня ребёнок сам досчитал до трёх 👍" />
    </div>
  );
}

export default function TaskRenderer(props: TaskViewProps & {
  confirmed?: boolean; onToggleCheck?: (i: number) => void;
  notes?: string; onNotes?: (v: string) => void;
}) {
  const { step } = props;
  const visual = <StepVisual step={step} moduleId={props.moduleId} resolveAssetSrc={props.resolveAssetSrc} />;
  switch (step.type) {
    case 'instruction': return <>{visual}<InstructionView /></>;
    case 'picture-choice': return <>{visual}<PictureChoiceView {...props} step={step} readOnly={!!props.readOnly} resolveAssetSrc={props.resolveAssetSrc} /></>;
    case 'match': return <>{visual}<MatchView step={step} /></>;
    case 'count': return <>{visual}<CountView step={step} readOnly={!!props.readOnly} /></>;
    case 'feature-choice': return <>{visual}<FeatureChoiceView step={step} /></>;
    case 'trace-point': return <>{visual}<TracePointView step={step} /></>;
    case 'offline-task': return <>{visual}<OfflineTaskView step={step} confirmed={props.confirmed} onToggleCheck={props.onToggleCheck} /></>;
    case 'reflection': return <>{visual}<ReflectionView step={step} notes={props.notes} onNotes={props.onNotes} /></>;
    default: {
      const unknown = step as { type: string };
      return <p className="text-red-700">Ядро не знает тип задания «{String(unknown.type)}».</p>;
    }
  }
}
