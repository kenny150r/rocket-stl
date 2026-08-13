import type { BlockingIssue, RocketSpec, Tessellation } from '../geometry/types';
import { hasTarget } from '../geometry/validate';
import { NumberField, Section } from './fields';

type Props = {
  spec: RocketSpec;
  setSpec: (s: RocketSpec) => void;
  issues: BlockingIssue[];
};

export function TessellationPanel({ spec, setSpec, issues }: Props) {
  const tes = spec.tessellation;
  const tesErr = hasTarget(issues, 'tessellation');
  function patch(update: Partial<Tessellation>) {
    setSpec({ ...spec, tessellation: { ...tes, ...update } });
  }
  return (
    <Section
      title="Tessellation"
      collapsible
      defaultOpen={tesErr}
      badge={tesErr ? <span className="pill bad">Error</span> : undefined}
    >
      <NumberField
        label="Circumferential nθ"
        value={tes.nTheta}
        step={4}
        min={12}
        invalid={hasTarget(issues, 'tessellation', undefined, 'nTheta')}
        onChange={(nTheta) => patch({ nTheta })}
      />
      <NumberField
        label="Axial samples / segment"
        value={tes.axialPerSegment}
        step={2}
        min={4}
        invalid={hasTarget(issues, 'tessellation', undefined, 'axialPerSegment')}
        onChange={(axialPerSegment) => patch({ axialPerSegment })}
      />
      <NumberField
        label="Fin section samples"
        value={tes.finSectionSamples}
        step={2}
        min={8}
        onChange={(finSectionSamples) => patch({ finSectionSamples })}
      />
      <NumberField
        label="Refine max edge (0=off)"
        value={tes.maxEdge}
        unit={spec.units}
        min={0}
        onChange={(maxEdge) => patch({ maxEdge })}
      />
      <NumberField
        label="Merge / watertight tol"
        value={tes.mergeTol}
        step={1e-9}
        onChange={(mergeTol) => patch({ mergeTol })}
      />
      <NumberField
        label="Tip min radius fraction"
        value={tes.tipMinRadiusFrac}
        step={1e-5}
        min={0}
        onChange={(tipMinRadiusFrac) => patch({ tipMinRadiusFrac })}
      />
      <p className="muted tiny">A geometric floor is also applied so the nose-cap triangles stay non-degenerate at the current nθ.</p>
      <NumberField
        label="Fin root inset fraction"
        value={tes.finRootInsetFrac}
        step={0.005}
        min={0.001}
        max={0.2}
        onChange={(finRootInsetFrac) => patch({ finRootInsetFrac })}
      />
    </Section>
  );
}
