import { describe, expect, it } from 'vitest';
import { assembleRocket } from '../src/geometry/assemble';
import { bodyLength, radiusAt } from '../src/geometry/body';
import { labelRocketMesh, meshArea } from '../src/geometry/labels';
import { arcasSpec } from '../src/presets/arcas';

describe('labeled STL partition', () => {
  it('splits the Arcas short body into nose, cylinder, boattail, and base', async () => {
    const spec = arcasSpec('short', false);
    spec.tessellation.nTheta = 24;
    spec.tessellation.axialPerSegment = 10;
    const { mesh } = await assembleRocket(spec);
    const parts = labelRocketMesh(spec, mesh);
    expect(parts.map((p) => p.name)).toEqual(['nose', 'cylinder', 'boattail', 'base']);
    const nAll = Math.floor(mesh.indices.length / 3);
    expect(parts.reduce((s, p) => s + p.nTris, 0)).toBe(nAll);
    const L = bodyLength(spec.segments);
    const rAft = radiusAt(spec.segments, L);
    const base = parts.find((p) => p.name === 'base')!;
    expect(base.area).toBeCloseTo(Math.PI * rAft * rAft, 3);
    expect(meshArea(mesh)).toBeCloseTo(parts.reduce((s, p) => s + p.area, 0), 9);
  }, 60_000);

  it('labels fins separately when they are present', async () => {
    const spec = arcasSpec('short', true);
    spec.tessellation.nTheta = 24;
    spec.tessellation.axialPerSegment = 10;
    spec.tessellation.finSectionSamples = 8;
    const { mesh } = await assembleRocket(spec);
    const parts = labelRocketMesh(spec, mesh);
    expect(parts.map((p) => p.name)).toContain('base');
    expect(parts.map((p) => p.name)).toContain('Arcas_tail');
    expect(parts.find((p) => p.name === 'Arcas_tail')!.nTris).toBeGreaterThan(20);
    expect(parts.reduce((s, p) => s + p.nTris, 0)).toBe(Math.floor(mesh.indices.length / 3));
  }, 60_000);
});
