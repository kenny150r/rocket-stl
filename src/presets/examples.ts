import { arcasSpec } from './arcas';
import { ensureLabelGroups } from '../geometry/components';
import { defaultCylinder, defaultFinSet, defaultNose, defaultSpec, defaultTaper, defaultTessellation } from '../geometry/defaults';
import { newId } from '../geometry/ids';
import type { RocketSpec } from '../geometry/types';

export const PRESETS: { id: string; label: string; spec: () => RocketSpec }[] = [
  {
    id: 'vk-4fin',
    label: 'Von Karman · 4 fins',
    spec: defaultSpec,
  },
  {
    id: 'ogive-boat',
    label: 'Tangent ogive · boat-tail',
    spec: () => {
      const nose = defaultNose('tangentOgive');
      nose.length = 0.45;
      nose.baseDiameter = 0.12;
      const tube = defaultCylinder(0.12);
      tube.length = 1.0;
      const tail = defaultTaper('boattail', 0.12);
      tail.length = 0.18;
      tail.aftDiameter = 0.08;
      const fins = defaultFinSet(nose.length + tube.length - 0.22, 'Aft fins');
      fins.span = 0.1;
      fins.rootChord = 0.14;
      fins.preset = 'trapezoidal';
      return {
        name: 'ogive-boattail',
        units: 'm',
        segments: [nose, tube, tail],
        finSets: [fins],
        tessellation: defaultTessellation(),
      };
    },
  },
  {
    id: 'flare-delta',
    label: 'Power nose · flare · clipped delta',
    spec: () => {
      const nose = defaultNose('power');
      nose.powerN = 0.5;
      nose.length = 0.35;
      nose.baseDiameter = 0.09;
      const tube = defaultCylinder(0.09);
      tube.length = 0.9;
      const flare = defaultTaper('flare', 0.09);
      flare.length = 0.2;
      flare.aftDiameter = 0.14;
      const fins = defaultFinSet(nose.length + tube.length + 0.02, 'Flare fins');
      fins.planformMode = 'preset';
      fins.preset = 'clippedDelta';
      fins.span = 0.07;
      fins.rootChord = 0.16;
      fins.nFins = 4;
      fins.section = 'plate';
      fins.thickness = 0.0035;
      fins.leRadius = 0.0006;
      return {
        name: 'flare-clipped-delta',
        units: 'm',
        segments: [nose, tube, flare],
        finSets: [fins],
        tessellation: defaultTessellation(),
      };
    },
  },
  {
    id: 'arcas-short',
    label: 'Arcas short · fins (TN D-4013)',
    spec: () => arcasSpec('short', true),
  },
  {
    id: 'arcas-short-body',
    label: 'Arcas short · body only',
    spec: () => arcasSpec('short', false),
  },
  {
    id: 'arcas-long',
    label: 'Arcas long · fins (TN D-4014)',
    spec: () => arcasSpec('long', true),
  },
  {
    id: 'arcas-long-body',
    label: 'Arcas long · body only',
    spec: () => arcasSpec('long', false),
  },
];

export function clonePreset(id: string): RocketSpec {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
  const spec = p.spec();
  spec.segments = spec.segments.map((s) => ({ ...s, id: newId() }));
  spec.finSets = spec.finSets.map((f) => ({ ...f, id: newId() }));
  return ensureLabelGroups(spec);
}
