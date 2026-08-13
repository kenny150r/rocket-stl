import { bodyLength } from '../geometry/body';
import { defaultFinSet } from '../geometry/defaults';
import { resolvePlanform, type ResolvedPlanform } from '../geometry/planform';
import type { BlockingIssue, FinPlanformMode, FinPreset, FinSection, FinSet, RocketSpec } from '../geometry/types';
import { hasTarget } from '../geometry/validate';
import { NumberField, Section, SelectField } from './fields';

type Props = {
  spec: RocketSpec;
  setSpec: (s: RocketSpec) => void;
  issues: BlockingIssue[];
};

export function FinEditor({ spec, setSpec, issues }: Props) {
  const unit = spec.units;

  function commit(finSets: FinSet[]) {
    setSpec({ ...spec, finSets });
  }

  function patch(id: string, update: Partial<FinSet>) {
    commit(spec.finSets.map((f) => (f.id === id ? { ...f, ...update } : f)));
  }

  const inv = (id: string, field: string) => hasTarget(issues, 'fin', id, field);

  return (
    <Section
      title="Fins"
      actions={
        <button
          type="button"
          className="btn"
          onClick={() =>
            commit([
              ...spec.finSets,
              defaultFinSet(Math.max(0, bodyLength(spec.segments) - 0.2), `Fin set ${spec.finSets.length + 1}`),
            ])
          }
        >
          Add set
        </button>
      }
    >
      {spec.finSets.length === 0 && <p className="muted">No fins — body only.</p>}
      <ul className="stack">
        {spec.finSets.map((fin) => {
          const pf = resolvePlanform(fin);
          return (
            <li key={fin.id} className={`card${hasTarget(issues, 'fin', fin.id) ? ' invalid' : ''}`}>
              <div className="card-head">
                <input
                  className="inline-name"
                  value={fin.name}
                  aria-label="Fin set name"
                  onChange={(e) => patch(fin.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="btn icon danger"
                  aria-label="Delete fin set"
                  onClick={() => commit(spec.finSets.filter((f) => f.id !== fin.id))}
                >
                  ×
                </button>
              </div>
              <div className="field-group">
                <h3>Placement</h3>
                <NumberField
                  label="LE from nose"
                  value={fin.xLe}
                  unit={unit}
                  invalid={inv(fin.id, 'xLe')}
                  onChange={(xLe) => patch(fin.id, { xLe })}
                />
                <NumberField
                  label="Count"
                  value={fin.nFins}
                  step={1}
                  min={1}
                  invalid={inv(fin.id, 'nFins')}
                  onChange={(nFins) => patch(fin.id, { nFins: Math.max(1, Math.round(nFins)) })}
                />
                <NumberField label="Roll offset" value={fin.rollDeg} unit="deg" step={1} onChange={(rollDeg) => patch(fin.id, { rollDeg })} />
                <NumberField label="Cant" value={fin.cantDeg} unit="deg" step={0.1} onChange={(cantDeg) => patch(fin.id, { cantDeg })} />
              </div>
              <div className="field-group">
                <h3>Shape</h3>
                <PlanformSketch pf={pf} />
                <SelectField
                  label="Planform"
                  value={fin.planformMode}
                  onChange={(v) => patch(fin.id, { planformMode: v as FinPlanformMode })}
                >
                  <option value="preset">Preset shape</option>
                  <option value="datcom">Area / AR / taper</option>
                  <option value="custom">Custom chords</option>
                </SelectField>
                {fin.planformMode === 'preset' && (
                  <>
                    <SelectField label="Shape" value={fin.preset} onChange={(v) => patch(fin.id, { preset: v as FinPreset })}>
                      <option value="rectangular">Rectangular</option>
                      <option value="trapezoidal">Trapezoidal</option>
                      <option value="clippedDelta">Clipped delta</option>
                      <option value="delta">Delta</option>
                    </SelectField>
                    <NumberField
                      label="Exposed span"
                      value={fin.span}
                      unit={unit}
                      invalid={inv(fin.id, 'span')}
                      onChange={(span) => patch(fin.id, { span })}
                    />
                    <NumberField
                      label="Root chord"
                      value={fin.rootChord}
                      unit={unit}
                      invalid={inv(fin.id, 'rootChord')}
                      onChange={(rootChord) => patch(fin.id, { rootChord })}
                    />
                  </>
                )}
                {fin.planformMode === 'datcom' && (
                  <>
                    <NumberField
                      label="Planform area S"
                      value={fin.area}
                      unit={`${unit}²`}
                      invalid={inv(fin.id, 'area')}
                      onChange={(area) => patch(fin.id, { area })}
                    />
                    <NumberField label="Aspect ratio" value={fin.aspectRatio} step={0.05} onChange={(aspectRatio) => patch(fin.id, { aspectRatio })} />
                    <NumberField
                      label="Taper ratio"
                      value={fin.taperRatio}
                      step={0.05}
                      min={0}
                      max={1}
                      onChange={(taperRatio) => patch(fin.id, { taperRatio })}
                    />
                    <NumberField label="LE sweep" value={fin.sweepLeDeg} unit="deg" step={1} onChange={(sweepLeDeg) => patch(fin.id, { sweepLeDeg })} />
                  </>
                )}
                {fin.planformMode === 'custom' && (
                  <>
                    <NumberField
                      label="Exposed span"
                      value={fin.span}
                      unit={unit}
                      invalid={inv(fin.id, 'span')}
                      onChange={(span) => patch(fin.id, { span })}
                    />
                    <NumberField
                      label="Root chord"
                      value={fin.rootChord}
                      unit={unit}
                      invalid={inv(fin.id, 'rootChord')}
                      onChange={(rootChord) => patch(fin.id, { rootChord })}
                    />
                    <NumberField label="Tip chord" value={fin.tipChord} unit={unit} onChange={(tipChord) => patch(fin.id, { tipChord })} />
                    <NumberField label="LE sweep" value={fin.sweepLeDeg} unit="deg" step={1} onChange={(sweepLeDeg) => patch(fin.id, { sweepLeDeg })} />
                  </>
                )}
                <p className="muted tiny">
                  Span {fmt(pf.span)} · root chord {fmt(pf.rootChord)} · tip chord {fmt(pf.tipChord)} · LE sweep {fmt(pf.sweepLeDeg)}° ·
                  area {fmt(pf.area)} · AR {fmt(pf.aspectRatio)}
                </p>
              </div>
              <div className="field-group">
                <h3>Section</h3>
                <SelectField label="Section" value={fin.section} onChange={(v) => patch(fin.id, { section: v as FinSection })}>
                  <option value="doubleWedge">Modified double-wedge</option>
                  <option value="plate">Constant-thickness plate</option>
                </SelectField>
                <NumberField
                  label="Thickness"
                  value={fin.thickness}
                  unit={unit}
                  step={0.0005}
                  invalid={inv(fin.id, 'thickness')}
                  onChange={(thickness) => patch(fin.id, { thickness })}
                />
                <NumberField
                  label="LE radius"
                  value={fin.leRadius}
                  unit={unit}
                  step={0.0001}
                  min={0}
                  invalid={inv(fin.id, 'leRadius')}
                  onChange={(leRadius) => patch(fin.id, { leRadius })}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function PlanformSketch({ pf }: { pf: ResolvedPlanform }) {
  const { span, rootChord, tipChord, sweepLeDeg } = pf;
  const b = Math.max(span, 1e-6);
  const sweep = Math.tan((sweepLeDeg * Math.PI) / 180) * b;
  const xs = [0, rootChord, sweep + tipChord, sweep];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const w = Math.max(maxX - minX, 1e-6);
  const pad = 0.08 * Math.max(w, b);
  const pts = [
    [0, 0],
    [rootChord, 0],
    [sweep + tipChord, b],
    [sweep, b],
  ]
    .map(([x, y]) => `${x},${b - y}`)
    .join(' ');
  return (
    <svg
      className="planform-sketch"
      viewBox={`${minX - pad} ${-pad} ${w + 2 * pad} ${b + 2 * pad}`}
      aria-hidden
    >
      <polygon points={pts} />
    </svg>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 100) return n.toFixed(1);
  if (a >= 1) return n.toFixed(3);
  return n.toPrecision(3);
}
