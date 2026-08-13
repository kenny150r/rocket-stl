import type { CylinderSegment, FinSet, NoseKind, NoseSegment, TaperKind, TaperSegment, Tessellation, RocketSpec } from './types';
import { newId } from './ids';

export const defaultTessellation = (): Tessellation => ({
  nTheta: 64,
  axialPerSegment: 24,
  finSectionSamples: 16,
  maxEdge: 0,
  mergeTol: 1e-9,
  tipMinRadiusFrac: 1e-4,
  finRootInsetFrac: 0.03,
});

export function defaultNose(kind: NoseKind = 'vonKarman'): NoseSegment {
  return {
    id: newId(),
    kind: 'nose',
    nose: kind,
    length: 0.4,
    baseDiameter: 0.1,
    powerN: 0.5,
    haackC: kind === 'haack' ? 1 / 3 : 0,
    ogiveRadius: 0,
    bluntRadius: 0.002,
  };
}

export function defaultCylinder(diameter = 0.1): CylinderSegment {
  return { id: newId(), kind: 'cylinder', length: 1.2, diameter };
}

export function defaultTaper(kind: TaperKind, foreDiameter: number): TaperSegment {
  const aft =
    kind === 'flare' ? foreDiameter * 1.4 : kind === 'boattail' ? foreDiameter * 0.7 : foreDiameter * 0.85;
  return { id: newId(), kind, length: 0.15, foreDiameter, aftDiameter: aft };
}

export function defaultFinSet(xLe = 1.35, name = 'Aft fins'): FinSet {
  return {
    id: newId(),
    name,
    xLe,
    nFins: 4,
    rollDeg: 0,
    cantDeg: 0,
    hingeX: null,
    elevatorDeg: 0,
    rudderDeg: 0,
    aileronDeg: 0,
    planformMode: 'preset',
    preset: 'trapezoidal',
    area: 0.0072,
    aspectRatio: 1.78,
    taperRatio: 0.5,
    sweepLeDeg: 20,
    span: 0.08,
    rootChord: 0.12,
    tipChord: 0.06,
    thickness: 0.004,
    leRadius: 0.0008,
    section: 'doubleWedge',
  };
}

export function defaultSpec(): RocketSpec {
  const nose = defaultNose('vonKarman');
  const tube = defaultCylinder(nose.baseDiameter);
  return {
    name: 'sounding-rocket', // editable top-bar title (RocketSpec.name)
    units: 'm',
    segments: [nose, tube],
    finSets: [defaultFinSet(nose.length + tube.length - 0.25)],
    tessellation: defaultTessellation(),
  };
}
