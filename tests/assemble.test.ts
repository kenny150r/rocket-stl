import { describe, expect, it } from 'vitest';
import { assembleRocket } from '../src/geometry/assemble';
import { defaultSpec } from '../src/geometry/defaults';
import { checkWatertight } from '../src/geometry/quality';

describe('assemble', () => {
  it('builds a watertight body with fins', async () => {
    const spec = defaultSpec();
    spec.tessellation.nTheta = 24;
    spec.tessellation.axialPerSegment = 12;
    spec.tessellation.finSectionSamples = 10;
    const result = await assembleRocket(spec);
    expect(result.volume).toBeGreaterThan(0);
    expect(result.mesh.indices.length / 3).toBeGreaterThan(100);
    const wt = checkWatertight(result.mesh, spec.tessellation.mergeTol);
    expect(wt.ok).toBe(true);
  }, 30_000);

  it('builds a watertight body without fins', async () => {
    const spec = defaultSpec();
    spec.finSets = [];
    spec.tessellation.nTheta = 24;
    spec.tessellation.axialPerSegment = 12;
    const result = await assembleRocket(spec);
    const wt = checkWatertight(result.mesh);
    expect(wt.ok).toBe(true);
  }, 30_000);
});
