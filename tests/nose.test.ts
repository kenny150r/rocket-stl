import { describe, expect, it } from 'vitest';
import { haackRadius, noseRadius, tangentOgiveRho } from '../src/geometry/nose';

const params = { powerN: 0.5, haackC: 0, ogiveRadius: 0 };

describe('nose profiles', () => {
  it('meets the tip and base for every kind', () => {
    const L = 1;
    const R = 0.2;
    const kinds = [
      'conic',
      'power',
      'vonKarman',
      'haack',
      'tangentOgive',
      'elliptical',
      'parabolic',
    ] as const;
    for (const kind of kinds) {
      expect(noseRadius(kind, 0, L, R, params)).toBeCloseTo(0, 8);
      expect(noseRadius(kind, L, L, R, { ...params, haackC: kind === 'parabolic' ? 0.5 : 0 })).toBeCloseTo(R, 6);
    }
  });

  it('matches von Karman to Haack C=0', () => {
    for (const t of [0.1, 0.4, 0.85]) {
      const a = noseRadius('vonKarman', t, 1, 0.25, params);
      const b = haackRadius(t, 0.25, 0);
      expect(a).toBeCloseTo(b, 12);
    }
  });

  it('has a finite tangent-ogive rho', () => {
    const rho = tangentOgiveRho(0.4, 0.05);
    expect(rho).toBeGreaterThan(0.4);
    expect(Number.isFinite(rho)).toBe(true);
  });
});
