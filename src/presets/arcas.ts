import { defaultCylinder, defaultFinSet, defaultNose, defaultTaper, defaultTessellation } from '../geometry/defaults';
import type { RocketSpec } from '../geometry/types';

/**
 * NASA TN D-4013 / D-4014 ½-scale Arcas wind-tunnel model.
 *
 * Stations are in calibers of centerbody diameter d = 2.25 in. Geometry here is
 * the **tunnel model in metres** so Sref = π d²/4 matches the papers with no
 * scale factor.
 *
 * Short: L/D = 18.20 (Arcas Robin). Long: L/D = 23.77 (NASA bioscience stretch).
 * Nose: 4.71-caliber tangent ogive with 0.062 in tip radius (Fig. 1).
 * Boat-tail: 3.65 in to 0.65 d (reflex lip omitted).
 * Fins: four trapezoidal double-wedges; Cr, Ct, span chosen so 4 × planform =
 * 94 in² full-scale (23.5 in² on this ½-scale model).
 *
 * Moment reference in the TNs: 70% of body length.
 */
export const ARCAS_D_IN = 2.25;
export const ARCAS_IN_M = 0.0254;
export const ARCAS_NOSE_CAL = 4.71;
export const ARCAS_SHORT_CAL = 18.2;
export const ARCAS_LONG_CAL = 23.77;
export const ARCAS_BOAT_IN = 3.65;
export const ARCAS_BOAT_AFT_CAL = 0.65;
export const ARCAS_BLUNT_IN = 0.062;
export const ARCAS_FIN_SPAN_CAL = 0.955;
export const ARCAS_FIN_ROOT_CAL = 1.78;
export const ARCAS_FIN_TIP_CAL = 0.65;
export const ARCAS_FIN_SWEEP_LE_DEG = 42.5;
export const ARCAS_FIN_THICK_CAL = 0.04;
/** Root TE sits this many calibers forward of the base. */
export const ARCAS_FIN_TE_FROM_BASE_CAL = 0.15;

export const arcasD = ARCAS_D_IN * ARCAS_IN_M;

export function arcasCal(n: number): number {
  return n * arcasD;
}

export type ArcasKind = 'short' | 'long';

export function arcasLengthCal(kind: ArcasKind): number {
  return kind === 'short' ? ARCAS_SHORT_CAL : ARCAS_LONG_CAL;
}

export function arcasSpec(kind: ArcasKind, fins: boolean): RocketSpec {
  const d = arcasD;
  const totalCal = arcasLengthCal(kind);
  const noseL = arcasCal(ARCAS_NOSE_CAL);
  const boatL = ARCAS_BOAT_IN * ARCAS_IN_M;
  const cylL = arcasCal(totalCal) - noseL - boatL;
  const span = arcasCal(ARCAS_FIN_SPAN_CAL);
  const rootChord = arcasCal(ARCAS_FIN_ROOT_CAL);
  const tipChord = arcasCal(ARCAS_FIN_TIP_CAL);
  const xLe = arcasCal(totalCal) - arcasCal(ARCAS_FIN_TE_FROM_BASE_CAL) - rootChord;

  const nose = defaultNose('tangentOgive');
  nose.length = noseL;
  nose.baseDiameter = d;
  nose.bluntRadius = ARCAS_BLUNT_IN * ARCAS_IN_M;

  const cylinder = defaultCylinder(d);
  cylinder.length = cylL;

  const boat = defaultTaper('boattail', d);
  boat.length = boatL;
  boat.aftDiameter = arcasCal(ARCAS_BOAT_AFT_CAL);

  const tes = defaultTessellation();
  tes.nTheta = 72;
  tes.axialPerSegment = 32;
  tes.finSectionSamples = 20;

  const spec: RocketSpec = {
    name: `arcas-${kind}${fins ? '' : '-body'}`,
    units: 'm',
    segments: [nose, cylinder, boat],
    finSets: [],
    tessellation: tes,
  };

  if (fins) {
    const f = defaultFinSet(xLe, 'Arcas tail');
    f.nFins = 4;
    f.rollDeg = 0;
    f.cantDeg = 0;
    f.planformMode = 'custom';
    f.preset = 'trapezoidal';
    f.span = span;
    f.rootChord = rootChord;
    f.tipChord = tipChord;
    f.sweepLeDeg = ARCAS_FIN_SWEEP_LE_DEG;
    f.thickness = arcasCal(ARCAS_FIN_THICK_CAL);
    f.leRadius = 0;
    f.section = 'doubleWedge';
    spec.finSets = [f];
  }

  return spec;
}

export function arcasReference(kind: ArcasKind): {
  sref: number;
  cref: number;
  bref: number;
  xref: number;
  length: number;
} {
  const length = arcasCal(arcasLengthCal(kind));
  return {
    sref: Math.PI * (arcasD / 2) ** 2,
    cref: arcasD,
    bref: arcasD,
    xref: 0.7 * length,
    length,
  };
}
