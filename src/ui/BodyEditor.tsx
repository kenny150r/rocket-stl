import { aftDiameter, syncDiameters } from '../geometry/body';
import { defaultCylinder, defaultNose, defaultTaper } from '../geometry/defaults';
import type { BodySegment, NoseKind, RocketSpec, TaperKind } from '../geometry/types';
import { NumberField, Section, SelectField } from './fields';

const NOSE_KINDS: { id: NoseKind; label: string }[] = [
  { id: 'conic', label: 'Conic' },
  { id: 'power', label: 'Power series' },
  { id: 'vonKarman', label: 'Von Karman (LD-Haack)' },
  { id: 'haack', label: 'Haack series' },
  { id: 'tangentOgive', label: 'Tangent ogive' },
  { id: 'secantOgive', label: 'Secant ogive' },
  { id: 'elliptical', label: 'Elliptical' },
  { id: 'parabolic', label: 'Parabolic' },
];

type Props = {
  spec: RocketSpec;
  setSpec: (s: RocketSpec) => void;
};

export function BodyEditor({ spec, setSpec }: Props) {
  const unit = spec.units;

  function commit(segments: BodySegment[]) {
    setSpec({ ...spec, segments: syncDiameters(segments) });
  }

  function patch(id: string, update: Partial<BodySegment> & Record<string, unknown>) {
    commit(spec.segments.map((s) => (s.id === id ? ({ ...s, ...update } as BodySegment) : s)));
  }

  function add(kind: BodySegment['kind']) {
    const lastD = spec.segments.length ? aftDiameter(spec.segments[spec.segments.length - 1]) : 0.1;
    let next: BodySegment;
    if (kind === 'nose') next = defaultNose();
    else if (kind === 'cylinder') next = defaultCylinder(lastD);
    else next = defaultTaper(kind, lastD);
    const segments = kind === 'nose' ? [next, ...spec.segments] : [...spec.segments, next];
    commit(segments);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= spec.segments.length) return;
    const segments = spec.segments.slice();
    [segments[i], segments[j]] = [segments[j], segments[i]];
    commit(segments);
  }

  return (
    <Section
      title="Body"
      actions={
        <div className="btn-row wrap">
          <button type="button" className="btn" onClick={() => add('nose')}>
            Nose
          </button>
          <button type="button" className="btn" onClick={() => add('cylinder')}>
            Cylinder
          </button>
          <button type="button" className="btn" onClick={() => add('frustum')}>
            Frustum
          </button>
          <button type="button" className="btn" onClick={() => add('flare')}>
            Flare
          </button>
          <button type="button" className="btn" onClick={() => add('boattail')}>
            Boat-tail
          </button>
        </div>
      }
    >
      <ul className="stack">
        {spec.segments.map((seg, i) => (
          <li key={seg.id} className="card">
            <div className="card-head">
              <strong>
                {i + 1}. {labelOf(seg)}
              </strong>
              <div className="btn-row">
                <button type="button" className="btn icon" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn icon"
                  onClick={() => move(i, 1)}
                  disabled={i === spec.segments.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn icon danger"
                  onClick={() => commit(spec.segments.filter((s) => s.id !== seg.id))}
                  disabled={spec.segments.length <= 1}
                >
                  ×
                </button>
              </div>
            </div>
            {seg.kind === 'nose' && (
              <>
                <SelectField
                  label="Nose type"
                  value={seg.nose}
                  onChange={(v) =>
                    patch(seg.id, {
                      nose: v as NoseKind,
                      haackC: v === 'haack' ? 1 / 3 : v === 'parabolic' ? 0.5 : 0,
                    })
                  }
                >
                  {NOSE_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </SelectField>
                <NumberField label="Length" value={seg.length} unit={unit} onChange={(length) => patch(seg.id, { length })} />
                <NumberField
                  label="Base diameter"
                  value={seg.baseDiameter}
                  unit={unit}
                  onChange={(baseDiameter) => patch(seg.id, { baseDiameter })}
                />
                {seg.nose === 'power' && (
                  <NumberField label="Exponent n" value={seg.powerN} step={0.05} onChange={(powerN) => patch(seg.id, { powerN })} />
                )}
                {seg.nose === 'haack' && (
                  <NumberField
                    label="Haack C"
                    value={seg.haackC}
                    step={0.05}
                    min={0}
                    onChange={(haackC) => patch(seg.id, { haackC })}
                  />
                )}
                {seg.nose === 'parabolic' && (
                  <NumberField
                    label="Parabolic K"
                    value={seg.haackC}
                    step={0.05}
                    min={0}
                    max={1}
                    onChange={(haackC) => patch(seg.id, { haackC })}
                  />
                )}
                {seg.nose === 'secantOgive' && (
                  <NumberField
                    label="Ogive radius"
                    value={seg.ogiveRadius}
                    unit={unit}
                    onChange={(ogiveRadius) => patch(seg.id, { ogiveRadius })}
                  />
                )}
                <NumberField
                  label="Blunt radius"
                  value={seg.bluntRadius}
                  unit={unit}
                  min={0}
                  onChange={(bluntRadius) => patch(seg.id, { bluntRadius })}
                />
              </>
            )}
            {seg.kind === 'cylinder' && (
              <>
                <NumberField label="Length" value={seg.length} unit={unit} onChange={(length) => patch(seg.id, { length })} />
                <NumberField
                  label="Diameter"
                  value={seg.diameter}
                  unit={unit}
                  onChange={(diameter) => patch(seg.id, { diameter })}
                />
              </>
            )}
            {(seg.kind === 'frustum' || seg.kind === 'flare' || seg.kind === 'boattail') && (
              <>
                {seg.kind === 'frustum' && (
                  <SelectField
                    label="Type"
                    value={seg.kind}
                    onChange={(v) => patch(seg.id, { kind: v as TaperKind })}
                  >
                    <option value="frustum">Frustum</option>
                    <option value="flare">Flare</option>
                    <option value="boattail">Boat-tail</option>
                  </SelectField>
                )}
                <NumberField label="Length" value={seg.length} unit={unit} onChange={(length) => patch(seg.id, { length })} />
                <NumberField label="Fore diameter" value={seg.foreDiameter} unit={unit} disabled onChange={() => undefined} />
                <NumberField
                  label="Aft diameter"
                  value={seg.aftDiameter}
                  unit={unit}
                  onChange={(aftDiameter) => patch(seg.id, { aftDiameter })}
                />
              </>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function labelOf(seg: BodySegment): string {
  if (seg.kind === 'nose') return `Nose · ${NOSE_KINDS.find((k) => k.id === seg.nose)?.label ?? seg.nose}`;
  if (seg.kind === 'boattail') return 'Boat-tail';
  return seg.kind[0].toUpperCase() + seg.kind.slice(1);
}
