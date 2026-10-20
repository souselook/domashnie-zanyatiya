import { assetUrl } from '../core/loader';
import type { Step } from '../core/schema';

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

/** Простая заглушка картинки модуля: если image задан и не загрузился — фигура+label. */
function OptionImage({ moduleId, step }: { moduleId: string; step: { image?: string; alt?: string; label: string } }) {
  const src = assetUrl(moduleId, step.image);
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

/* ── Рендереры заданий (read-only = предпросмотр) ────────────── */

export interface TaskViewProps {
  step: Step;
  moduleId: string;
  readOnly?: boolean;
  // интерактив (Stage 3):
  selectedId?: string | null;
  onSelectOption?: (id: string) => void;
  countAnswer?: number | null;
  onCountAnswer?: (n: number) => void;
}

function InstructionView() {
  return <p className="text-cocoa/70 italic">Инструкция для родителя — см. блок скрипта выше.</p>;
}

function PictureChoiceView({ step, moduleId, readOnly, selectedId, onSelectOption }: Required<Pick<TaskViewProps, 'step' | 'moduleId' | 'readOnly'>> & Pick<TaskViewProps, 'selectedId' | 'onSelectOption'> & { step: Extract<Step, { type: 'picture-choice' }> }) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-4">{step.prompt}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" role={readOnly ? undefined : 'group'} aria-label="Варианты ответа">
        {step.options.map((o) => (
          <button key={o.id} type="button" disabled={readOnly}
            className="task-option" aria-pressed={selectedId === o.id}
            onClick={() => onSelectOption?.(o.id)}>
            <OptionImage moduleId={moduleId} step={o} />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchView({ step, readOnly }: { step: Extract<Step, { type: 'match' }>; readOnly: boolean }) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-4">{step.prompt}</p>
      <div className="grid grid-cols-2 gap-4">
        <ul className="space-y-3 list-none p-0">
          {step.pairs.map((p) => (
            <li key={`l-${p.left.id}`}><span className={`card block text-center font-bold ${readOnly ? '' : 'cursor-pointer'}`}>{p.left.label}</span></li>
          ))}
        </ul>
        <ul className="space-y-3 list-none p-0">
          {[...step.pairs].reverse().map((p) => (
            <li key={`r-${p.right.id}`}><span className={`card block text-center font-bold ${readOnly ? '' : 'cursor-pointer'}`}>{p.right.label}</span></li>
          ))}
        </ul>
      </div>
      {!readOnly && <p className="text-sm text-cocoa/60 mt-3">Нажмите пару: элемент слева, затем элемент справа.</p>}
    </div>
  );
}

function CountView({ step, readOnly, countAnswer, onCountAnswer }: { step: Extract<Step, { type: 'count' }>; readOnly: boolean } & Pick<TaskViewProps, 'countAnswer' | 'onCountAnswer'>) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-4">{step.prompt}</p>
      <div className="card flex flex-wrap gap-3 justify-center p-6 mb-4" aria-label={`Предметы для счёта: ${step.items.count} шт.`}>
        {Array.from({ length: step.items.count }, (_, i) => (
          <Shape key={i} kind={step.items.kind} color={step.items.color} size={56} />
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

function FeatureChoiceView({ step, moduleId, readOnly, selectedId, onSelectOption }: { step: Extract<Step, { type: 'feature-choice' }>; moduleId: string } & Pick<TaskViewProps, 'readOnly' | 'selectedId' | 'onSelectOption'>) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-1">{step.prompt}</p>
      <p className="mb-4 text-cocoa/70">Признак: <b>{step.feature}</b></p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {step.options.map((o) => (
          <button key={o.id} type="button" disabled={readOnly}
            className="task-option" aria-pressed={selectedId === o.id}
            onClick={() => onSelectOption?.(o.id)}>
            <OptionImage moduleId={moduleId} step={o} />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TracePointView({ step, moduleId }: { step: Extract<Step, { type: 'trace-point' }>; moduleId: string }) {
  const src = assetUrl(moduleId, step.image);
  return (
    <div className="text-center">
      {src
        ? <img src={src} alt={step.alt} className="max-w-full mx-auto rounded-2xl border border-sand bg-white p-2" />
        : <div className="mx-auto w-48 h-48 rounded-2xl bg-sand/50 grid place-items-center text-5xl" aria-hidden="true">✏️</div>}
      <p className="text-xl font-bold mt-4">{step.prompt}</p>
      <p className="card inline-block mt-3 bg-sand/40">🖐 {step.offlineAction}</p>
    </div>
  );
}

function OfflineTaskView({ step, confirmed, onToggleCheck }: {
  step: Extract<Step, { type: 'offline-task' }>;
  confirmed?: boolean;
  checks?: boolean[];
  onToggleCheck?: (i: number) => void;
}) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-3">🖐 Задание руками</p>
      <p className="card bg-sand/30 text-lg mb-4">{step.actionText}</p>
      {step.checklist && (
        <ul className="space-y-2 mb-4 list-none p-0">
          {step.checklist.map((c, i) => (
            <li key={i}>
              <label className="flex items-center gap-3 card py-3 cursor-pointer">
                <input type="checkbox" className="w-6 h-6 accent-amber1" checked={confirmed ? true : false}
                  onChange={() => onToggleCheck?.(i)} disabled={!onToggleCheck} />
                <span>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReflectionView({ step, notes, onNotes }: {
  step: Extract<Step, { type: 'reflection' }>;
  notes?: string;
  onNotes?: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-2xl font-extrabold mb-3">💬 Как прошло?</p>
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

/* ── Диспетчер ───────────────────────────────────────────────── */

export default function TaskRenderer(props: TaskViewProps & {
  confirmed?: boolean; onToggleCheck?: (i: number) => void;
  notes?: string; onNotes?: (v: string) => void;
}) {
  const { step } = props;
  switch (step.type) {
    case 'instruction': return <InstructionView />;
    case 'picture-choice': return <PictureChoiceView {...props} step={step} readOnly={!!props.readOnly} />;
    case 'match': return <MatchView step={step} readOnly={!!props.readOnly} />;
    case 'count': return <CountView step={step} readOnly={!!props.readOnly} />;
    case 'feature-choice': return <FeatureChoiceView step={step} moduleId={props.moduleId} readOnly={!!props.readOnly} />;
    case 'trace-point': return <TracePointView step={step} moduleId={props.moduleId} />;
    case 'offline-task': return <OfflineTaskView step={step} confirmed={props.confirmed} onToggleCheck={props.onToggleCheck} />;
    case 'reflection': return <ReflectionView step={step} notes={props.notes} onNotes={props.onNotes} />;
    default: {
      const unknown = step as { type: string };
      return <p className="text-red-700">Ядро не знает тип задания «{String(unknown.type)}».</p>;
    }
  }
}
