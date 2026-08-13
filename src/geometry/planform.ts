import type { FinPreset, FinSet } from './types';

export type ResolvedPlanform = {
  span: number;
  rootChord: number;
  tipChord: number;
  sweepLeDeg: number;
  area: number;
  aspectRatio: number;
  taperRatio: number;
};

export const PRESET_SHAPE: Record<FinPreset, { taper: number; sweepDeg: number | null }> = {
  rectangular: { taper: 1, sweepDeg: 0 },
  trapezoidal: { taper: 0.5, sweepDeg: 20 },
  clippedDelta: { taper: 0.25, sweepDeg: 45 },
  delta: { taper: 0, sweepDeg: null },
};

export function datcomFromArea(area: number, aspectRatio: number, taperRatio: number, sweepLeDeg: number): ResolvedPlanform {
  const S = Math.max(0, area);
  const AR = Math.max(1e-9, aspectRatio);
  const lam = Math.min(1, Math.max(0, taperRatio));
  const span = Math.sqrt(AR * S);
  const rootChord = span > 0 ? (2 * S) / (span * (1 + lam)) : 0;
  const tipChord = lam * rootChord;
  return {
    span,
    rootChord,
    tipChord,
    sweepLeDeg,
    area: S,
    aspectRatio: AR,
    taperRatio: lam,
  };
}

export function metricsFromChords(span: number, rootChord: number, tipChord: number, sweepLeDeg: number): ResolvedPlanform {
  const b = Math.max(0, span);
  const cr = Math.max(0, rootChord);
  const ct = Math.max(0, tipChord);
  const area = 0.5 * (cr + ct) * b;
  const aspectRatio = area > 0 ? (b * b) / area : 0;
  const taperRatio = cr > 0 ? ct / cr : 0;
  return { span: b, rootChord: cr, tipChord: ct, sweepLeDeg, area, aspectRatio, taperRatio };
}

export function resolvePlanform(fin: FinSet): ResolvedPlanform {
  if (fin.planformMode === 'datcom') {
    return datcomFromArea(fin.area, fin.aspectRatio, fin.taperRatio, fin.sweepLeDeg);
  }
  if (fin.planformMode === 'preset') {
    const shape = PRESET_SHAPE[fin.preset];
    const span = Math.max(0, fin.span);
    const rootChord = Math.max(0, fin.rootChord);
    const taper = shape.taper;
    const tipChord = taper * rootChord;
    const sweepLeDeg =
      shape.sweepDeg === null
        ? span > 0
          ? (Math.atan2(rootChord - tipChord, span) * 180) / Math.PI
          : 0
        : shape.sweepDeg;
    return metricsFromChords(span, rootChord, tipChord, sweepLeDeg);
  }
  return metricsFromChords(fin.span, fin.rootChord, fin.tipChord, fin.sweepLeDeg);
}
