import { describe, expect, it } from 'vitest';
import { checkWatertight, unitCubeMesh } from '../src/geometry/quality';
import { binaryStlTriangleCount, writeStlBinary } from '../src/geometry/stl';
import type { MeshData } from '../src/geometry/types';

describe('watertight check', () => {
  it('accepts a closed cube', () => {
    const r = checkWatertight(unitCubeMesh());
    expect(r.ok).toBe(true);
    expect(r.nOpenEdges).toBe(0);
    expect(r.nNonmanifold).toBe(0);
    expect(r.nDegenerate).toBe(0);
    expect(r.nTris).toBe(12);
  });

  it('flags a missing triangle as open edges', () => {
    const cube = unitCubeMesh();
    const mesh: MeshData = {
      positions: cube.positions,
      indices: cube.indices.slice(0, cube.indices.length - 3),
    };
    const r = checkWatertight(mesh);
    expect(r.ok).toBe(false);
    expect(r.nOpenEdges).toBeGreaterThan(0);
  });
});

describe('STL binary', () => {
  it('writes header + 50 bytes per triangle', () => {
    const mesh = unitCubeMesh();
    const buf = writeStlBinary(mesh, 'cube');
    expect(buf.byteLength).toBe(84 + 12 * 50);
    expect(binaryStlTriangleCount(buf)).toBe(12);
  });
});
