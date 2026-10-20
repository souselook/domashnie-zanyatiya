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
});
