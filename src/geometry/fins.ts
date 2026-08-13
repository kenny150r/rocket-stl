import { radiusAt } from './body';
import { resolvePlanform } from './planform';
import type { FinSet, FinSection, RocketSpec, Vec3 } from './types';

const TAU = Math.PI * 2;

function rotateX(p: Vec3, phi: number): Vec3 {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}

/** Incidence about a spanwise (radial) hinge through `origin`. */
function cantAboutSpan(p: Vec3, origin: Vec3, cant: number): Vec3 {
  const x = p[0] - origin[0];
  const z = p[2] - origin[2];
  const c = Math.cos(cant);
  const s = Math.sin(cant);
  return [origin[0] + x * c - z * s, p[1], origin[2] + x * s + z * c];
}

/** Default hinge: mid-chord of the root, on the body. */
export function autoHingeX(fin: FinSet): number {
  const pf = resolvePlanform(fin);
  return fin.xLe + 0.5 * Math.max(pf.rootChord, 0);
}

export function resolvedHingeX(fin: FinSet): number {
  return typeof fin.hingeX === 'number' && Number.isFinite(fin.hingeX) ? fin.hingeX : autoHingeX(fin);
}

/** Root trailing-edge station (the root tip). */
export function rootTipX(fin: FinSet): number {
  const pf = resolvePlanform(fin);
  return fin.xLe + Math.max(pf.rootChord, 0);
}

export function hingeFromRootTip(fin: FinSet): number {
  return rootTipX(fin) - resolvedHingeX(fin);
}

export function hingeXFromRef(fin: FinSet, value: number, ref: FinSet['hingeRef']): number {
  return ref === 'rootTip' ? rootTipX(fin) - value : value;
}

export function hingeDisplayValue(fin: FinSet): number {
  return fin.hingeRef === 'rootTip' ? hingeFromRootTip(fin) : resolvedHingeX(fin);
}

export function copyRollRad(fin: FinSet, index: number): number {
  const n = Math.max(1, Math.round(fin.nFins));
  return ((fin.rollDeg * Math.PI) / 180) + (TAU * index) / n;
}

/**
 * Local spanwise hinge angle for copy `index`.
 * +elevator: horizontal-pair trailing tips toward +Y.
 * +rudder: vertical-pair trailing tips toward +Z (yaw about +Y).
 * +aileron: clockwise when viewed from aft looking forward.
 */
export function localHingeDeg(fin: FinSet, index: number): number {
  const φ = copyRollRad(fin, index);
  const e = fin.elevatorDeg ?? 0;
  const r = fin.rudderDeg ?? 0;
  const a = fin.aileronDeg ?? 0;
  return (fin.cantDeg ?? 0) - a - e * Math.sin(φ) + r * Math.cos(φ);
}

/**
 * Closed-ish airfoil in (chord, thickness) coordinates.
 * LE at s=0, TE at s=chord. Forward semicircle + sides; not self-intersecting.
 */
export function airfoilSection(
  chord: number,
  thickness: number,
  leRadius: number,
  section: FinSection,
  n: number,
): { s: number; t: number }[] {
  const c = Math.max(chord, 1e-9);
  const th = Math.max(thickness, 1e-9);
  const r = Math.min(Math.max(0, leRadius), th / 2);
  const nArc = Math.max(6, Math.round(n / 2));
  const pts: { s: number; t: number }[] = [];

  if (r > 1e-12) {
    for (let i = 0; i <= nArc; i++) {
      const ang = Math.PI / 2 + (Math.PI * i) / nArc;
      pts.push({ s: r + r * Math.cos(ang), t: r * Math.sin(ang) });
    }
  } else {
    pts.push({ s: 0, t: th / 2 });
    pts.push({ s: 0, t: -th / 2 });
  }

  const teHalf = section === 'plate' ? th / 2 : Math.max(th * 0.04, 1e-6);
  if (th / 2 > r + 1e-12) pts.push({ s: r, t: -th / 2 });
  pts.push({ s: c, t: -teHalf });
  pts.push({ s: c, t: teHalf });
  if (th / 2 > r + 1e-12) pts.push({ s: r, t: th / 2 });
  return pts;
}

export function finHullPoints(spec: RocketSpec, fin: FinSet, localDeg?: number): Vec3[] {
  const pf = resolvePlanform(fin);
  const tes = spec.tessellation;
  const n = tes.finSectionSamples;
  const inset = tes.finRootInsetFrac;
  const sweep = (pf.sweepLeDeg * Math.PI) / 180;
  const tanS = Math.tan(sweep);
  const hinge = (localDeg ?? fin.cantDeg ?? 0) * (Math.PI / 180);
  const xH = resolvedHingeX(fin);
  const origin: Vec3 = [xH, radiusAt(spec.segments, xH), 0];

  const rootAf = airfoilSection(pf.rootChord, fin.thickness, fin.leRadius, fin.section, n);
  const tipChord = Math.max(pf.tipChord, 1e-6 * Math.max(pf.rootChord, 1e-6));
  const tipTh =
    pf.tipChord <= 1e-12
      ? fin.thickness * 0.2
      : fin.thickness * Math.max(0.3, pf.tipChord / Math.max(pf.rootChord, 1e-9));
  const tipAf = airfoilSection(tipChord, tipTh, Math.min(fin.leRadius, tipTh / 2), fin.section, n);

  const rBodyLe = radiusAt(spec.segments, fin.xLe);

  const pts: Vec3[] = [];
  const emit = (af: { s: number; t: number }[], xLe: number, radial: (x: number) => number) => {
    for (const q of af) {
      const x = xLe + q.s;
      let p: Vec3 = [x, radial(x), q.t];
      if (hinge !== 0) p = cantAboutSpan(p, origin, hinge);
      pts.push(p);
    }
  };

  const rootRadial = (x: number) => {
    const rb = radiusAt(spec.segments, x);
    return Math.max(1e-9, rb * (1 - inset));
  };
  emit(rootAf, fin.xLe, rootRadial);
  const xTipLe = fin.xLe + pf.span * tanS;
  emit(tipAf, xTipLe, () => rBodyLe + pf.span);
  return pts;
}

export function allFinCopies(spec: RocketSpec, fin: FinSet): Vec3[][] {
  const n = Math.max(1, Math.round(fin.nFins));
  const copies: Vec3[][] = [];
  for (let i = 0; i < n; i++) {
    const base = finHullPoints(spec, fin, localHingeDeg(fin, i));
    const phi = copyRollRad(fin, i);
    copies.push(base.map((p) => rotateX(p, phi)));
  }
  return copies;
}
