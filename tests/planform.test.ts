import { describe, expect, it } from 'vitest';
import { datcomFromArea, metricsFromChords, resolvePlanform } from '../src/geometry/planform';
import { defaultFinSet } from '../src/geometry/defaults';

describe('planform', () => {
  it('round-trips DATCOM area / AR / taper to chords', () => {
    const S = 0.008;
    const AR = 2;
    const lam = 0.5;
    const r = datcomFromArea(S, AR, lam, 25);
    expect(r.area).toBeCloseTo(S, 12);
    expect(r.aspectRatio).toBeCloseTo(AR, 12);
    expect(r.taperRatio).toBeCloseTo(lam, 12);
    const back = metricsFromChords(r.span, r.rootChord, r.tipChord, 25);
    expect(back.area).toBeCloseTo(S, 10);
    expect(back.aspectRatio).toBeCloseTo(AR, 10);
  });

  it('applies trapezoidal preset taper', () => {
    const fin = defaultFinSet();
    fin.planformMode = 'preset';
    fin.preset = 'trapezoidal';
    fin.span = 0.1;
    fin.rootChord = 0.2;
    const r = resolvePlanform(fin);
    expect(r.tipChord).toBeCloseTo(0.1, 12);
    expect(r.sweepLeDeg).toBe(20);
  });

  it('makes a true delta with zero tip chord', () => {
    const fin = defaultFinSet();
    fin.planformMode = 'preset';
    fin.preset = 'delta';
    fin.span = 0.1;
    fin.rootChord = 0.2;
    const r = resolvePlanform(fin);
    expect(r.tipChord).toBe(0);
    expect(r.sweepLeDeg).toBeGreaterThan(0);
  });
});
