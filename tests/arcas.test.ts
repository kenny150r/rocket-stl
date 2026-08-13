import { describe, expect, it } from 'vitest';
import { assembleRocket } from '../src/geometry/assemble';
import { bodyLength } from '../src/geometry/body';
import { checkWatertight } from '../src/geometry/quality';
import { hasErrors, validateSpec } from '../src/geometry/validate';
import {
  ARCAS_FIN_ROOT_CAL,
  ARCAS_FIN_SPAN_CAL,
  ARCAS_FIN_TE_FROM_BASE_CAL,
  ARCAS_FIN_TIP_CAL,
  ARCAS_SHORT_CAL,
  arcasCal,
  arcasD,
  arcasReference,
  arcasSpec,
} from '../src/presets/arcas';

describe('Arcas ½-scale WT model', () => {
  it('matches TN D-4014 short-body stations', () => {
    const spec = arcasSpec('short', true);
    const L = bodyLength(spec.segments);
    expect(L).toBeCloseTo(arcasCal(ARCAS_SHORT_CAL), 9);
    expect(spec.segments[0].kind).toBe('nose');
    if (spec.segments[0].kind === 'nose') {
      expect(spec.segments[0].nose).toBe('tangentOgive');
      expect(spec.segments[0].baseDiameter).toBeCloseTo(arcasD, 12);
    }
    const boat = spec.segments[2];
    expect(boat.kind).toBe('boattail');
    if (boat.kind === 'boattail') {
      expect(boat.aftDiameter).toBeCloseTo(arcasCal(0.65), 12);
    }
  });

  it('places the fin root on the cylinder with TE on the boat-tail', () => {
    const spec = arcasSpec('short', true);
    const L = bodyLength(spec.segments);
    const fin = spec.finSets[0];
    const xTe = fin.xLe + fin.rootChord;
    expect(xTe).toBeCloseTo(L - arcasCal(ARCAS_FIN_TE_FROM_BASE_CAL), 9);
    const boat = spec.segments[2];
    const xBoat = L - boat.length;
    expect(fin.xLe).toBeLessThan(xBoat);
    expect(xTe).toBeGreaterThan(xBoat);
    expect(validateSpec(spec).filter((i) => i.level === 'error')).toHaveLength(0);
  });

  it('recovers ~94 in² full-scale fin area from the ½-scale planform', () => {
    const b = arcasCal(ARCAS_FIN_SPAN_CAL);
    const cr = arcasCal(ARCAS_FIN_ROOT_CAL);
    const ct = arcasCal(ARCAS_FIN_TIP_CAL);
    const oneFinIn2 = (0.5 * (cr + ct) * b) / (0.0254 * 0.0254);
    expect(4 * oneFinIn2).toBeCloseTo(23.5, 1);
    expect(4 * 4 * oneFinIn2).toBeCloseTo(94, 0);
  });

  it('uses 70% body length as the moment station', () => {
    const ref = arcasReference('short');
    expect(ref.xref).toBeCloseTo(0.7 * ref.length, 12);
    expect(ref.cref).toBeCloseTo(arcasD, 12);
    expect(ref.sref).toBeCloseTo(Math.PI * (arcasD / 2) ** 2, 12);
  });

  it.each([
    ['short', true],
    ['short', false],
    ['long', true],
  ] as const)('assembles a watertight %s mesh (fins=%s)', async (kind, fins) => {
    const spec = arcasSpec(kind, fins);
    spec.tessellation.nTheta = 24;
    spec.tessellation.axialPerSegment = 10;
    spec.tessellation.finSectionSamples = 8;
    expect(hasErrors(validateSpec(spec))).toBe(false);
    const result = await assembleRocket(spec);
    expect(result.volume).toBeGreaterThan(0);
    const wt = checkWatertight(result.mesh, spec.tessellation.mergeTol);
    expect(wt.ok).toBe(true);
  }, 60_000);
});
