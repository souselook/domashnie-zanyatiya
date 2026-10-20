import { describe, expect, it } from 'vitest';
import { parseSemver, semverGte, validateCompatibility } from '../core/loader';
import { manifestSchema } from '../core/schema';

const manifestOf = (over: Record<string, unknown> = {}) => {
  const base = {
    manifestVersion: 1, apiVersion: 1, minCoreVersion: '1.0.0',
    id: 'm', title: 'T', shortDescription: 'D', author: 'A', license: 'MIT',
    ageRange: { from: 3, to: 6 }, discipline: 'demo',
    lessons: [{ file: 'lessons/a.json', order: 1 }], ...over,
  };
  return manifestSchema.parse(base);
};

describe('semver', () => {
  it('парсит и сравнивает версии', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(semverGte('1.0.0', '1.0.0')).toBe(true);
    expect(semverGte('1.1.0', '1.0.9')).toBe(true);
    expect(semverGte('1.0.0', '1.0.1')).toBe(false);
    expect(semverGte('2.0.0', '1.9.9')).toBe(true);
  });
});

describe('validateCompatibility', () => {
  it('принимает модуль с поддерживаемым API', () => {
    expect(validateCompatibility(manifestOf()).ok).toBe(true);
  });

  it('отклоняет модуль с новым мажором API (INCOMPATIBLE)', () => {
    const r = validateCompatibility(manifestOf({ apiVersion: 2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INCOMPATIBLE');
  });

  it('отклоняет модуль, требующий более новое ядро', () => {
    const r = validateCompatibility(manifestOf({ minCoreVersion: '9.9.9' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INCOMPATIBLE');
  });
});
