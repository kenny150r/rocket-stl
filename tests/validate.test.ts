import { describe, expect, it } from 'vitest';
import { defaultSpec } from '../src/geometry/defaults';
import { hasTarget, validateSpec } from '../src/geometry/validate';

describe('validateSpec', () => {
  it('tags a non-positive segment length', () => {
    const spec = defaultSpec();
    spec.segments[1] = { ...spec.segments[1], length: 0 };
    const issues = validateSpec(spec);
    expect(issues.some((i) => i.target?.field === 'length' && i.target.id === spec.segments[1].id)).toBe(true);
    expect(hasTarget(issues, 'segment', spec.segments[1].id, 'length')).toBe(true);
  });

  it('tags tessellation nθ', () => {
    const spec = defaultSpec();
    spec.tessellation.nTheta = 8;
    const issues = validateSpec(spec);
    expect(hasTarget(issues, 'tessellation', undefined, 'nTheta')).toBe(true);
  });

  it('tags a fin chord that leaves the body', () => {
    const spec = defaultSpec();
    spec.finSets[0] = { ...spec.finSets[0], xLe: 10 };
    const issues = validateSpec(spec);
    expect(hasTarget(issues, 'fin', spec.finSets[0].id, 'xLe')).toBe(true);
  });
});
