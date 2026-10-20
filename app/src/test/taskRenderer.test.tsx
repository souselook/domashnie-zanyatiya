import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskRenderer from '../components/TaskRenderer';
import type { Step } from '../core/schema';

const step = (o: Record<string, unknown>) => o as unknown as Step;

describe('TaskRenderer', () => {
  it('рендерит picture-choice с вариантами и alt-текстами', () => {
    render(<TaskRenderer moduleId="m" readOnly
      step={step({ id: 's', type: 'picture-choice', mode: 'child', parentScript: 'х', prompt: 'Где круг?',
        options: [{ id: 'a', label: 'Круг', correct: true }, { id: 'b', label: 'Квадрат' }] })} />);
    expect(screen.getByText('Где круг?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Круг/ })).toBeDisabled(); // read-only = предпросмотр
  });

  it('в режиме ре play кнопки заданий активны', () => {
    render(<TaskRenderer moduleId="m"
      step={step({ id: 's', type: 'count', mode: 'child', parentScript: 'х', prompt: 'Сколько?',
        items: { kind: 'star', count: 3 }, answer: 3 })} />);
    expect(screen.getByRole('button', { name: '3' })).toBeEnabled();
  });

  it('неизвестный тип шага даёт понятное сообщение, а не падение', () => {
    render(<TaskRenderer moduleId="m" readOnly
      step={step({ id: 's', type: 'laser-tag', mode: 'child', parentScript: 'х' })} />);
    expect(screen.getByText(/Ядро не знает тип задания/)).toBeInTheDocument();
  });

  it('offline-task показывает чек-лист', () => {
    render(<TaskRenderer moduleId="m" readOnly
      step={step({ id: 's', type: 'offline-task', mode: 'parent', parentScript: 'х',
        actionText: 'Построй башню', checklist: ['Башня стоит'] })} />);
    expect(screen.getByText('Построй башню')).toBeInTheDocument();
    expect(screen.getByText('Башня стоит')).toBeInTheDocument();
  });

  // ─── v1.1.1: drag-режим picture-choice ───
  const pc = (over: Record<string, unknown>) => step({
    id: 's', type: 'picture-choice', mode: 'child', parentScript: 'х', prompt: 'Что лишнее?',
    options: [{ id: 'a', label: 'Круг' }, { id: 'b', label: 'Звезда' }], ...over,
  });

  it('tap-режим (default): drop-зоны нет — backward compat v1.0', () => {
    render(<TaskRenderer moduleId="m" step={pc({})} selectedId={null} onSelectOption={() => {}} />);
    expect(screen.queryByTestId('drop-zone')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Круг/ })).toBeEnabled();
  });

  it('drag-режим: рендерится drop-зона и drag-source-кнопки', () => {
    render(<TaskRenderer moduleId="m" step={pc({ interaction: 'drag' })} selectedId={null} onSelectOption={() => {}} />);
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('drag-source-a')).toBeInTheDocument();
    expect(screen.getByTestId('drag-source-b')).toBeInTheDocument();
  });

  it('drag-режим: tap-tap fallback — выбор варианта затем клик по зоне вызывает onSelectOption', () => {
    const calls: string[] = [];
    render(<TaskRenderer moduleId="m" step={pc({ interaction: 'drag' })}
      selectedId="a" onSelectOption={(id) => calls.push(id)} />);
    screen.getByTestId('drop-zone').click();
    expect(calls).toEqual(['a']);
  });
});
