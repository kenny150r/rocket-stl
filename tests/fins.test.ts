import { describe, expect, it } from 'vitest';
import { defaultSpec } from '../src/geometry/defaults';
import { allFinCopies, autoHingeX, localHingeDeg } from '../src/geometry/fins';
import type { Vec3 } from '../src/geometry/types';

function teCentroid(pts: Vec3[]): Vec3 {
  const xm = Math.max(...pts.map((p) => p[0]));
  const te = pts.filter((p) => p[0] > xm - 1e-6);
  const n = te.length;
  return [
    te.reduce((s, p) => s + p[0], 0) / n,
    te.reduce((s, p) => s + p[1], 0) / n,
    te.reduce((s, p) => s + p[2], 0) / n,
  ];
}

describe('fin hinge mix', () => {
  it('defaults the hinge to quarter-chord', () => {
    const spec = defaultSpec();
    const fin = spec.finSets[0];
    expect(autoHingeX(fin)).toBeCloseTo(fin.xLe + 0.25 * fin.rootChord, 12);
  });

  it('moves the horizontal-pair trailing edge up for +elevator', () => {
    const spec = defaultSpec();
    const fin = spec.finSets[0];
    fin.nFins = 4;
    fin.rollDeg = 0;
    fin.elevatorDeg = 0;
    const undef = allFinCopies(spec, fin);
    fin.elevatorDeg = 10;
    const defl = allFinCopies(spec, fin);
    // copy 1 is 90° — span +Z, a horizontal fin
    expect(teCentroid(defl[1])[1]).toBeGreaterThan(teCentroid(undef[1])[1]);
    expect(localHingeDeg(fin, 1)).toBeCloseTo(-10, 12);
  });

  it('moves the upper-fin trailing edge toward +Z for +rudder', () => {
    const spec = defaultSpec();
    const fin = spec.finSets[0];
    fin.nFins = 4;
    fin.rollDeg = 0;
    fin.rudderDeg = 0;
    const undef = allFinCopies(spec, fin);
    fin.rudderDeg = 10;
    const defl = allFinCopies(spec, fin);
    expect(teCentroid(defl[0])[2]).toBeGreaterThan(teCentroid(undef[0])[2]);
    expect(localHingeDeg(fin, 0)).toBeCloseTo(10, 12);
  });

  it('deflects the upper fin toward −Z for +aileron (clockwise from aft looking forward)', () => {
    const spec = defaultSpec();
    const fin = spec.finSets[0];
    fin.nFins = 4;
    fin.rollDeg = 0;
    fin.aileronDeg = 0;
    const undef = allFinCopies(spec, fin);
    fin.aileronDeg = 8;
    const defl = allFinCopies(spec, fin);
    expect(teCentroid(defl[0])[2]).toBeLessThan(teCentroid(undef[0])[2]);
    expect(localHingeDeg(fin, 0)).toBeCloseTo(-8, 12);
  });
});
