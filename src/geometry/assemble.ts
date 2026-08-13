import { lathePolygon } from './body';
import { allFinCopies } from './fins';
import { loadManifold } from './manifoldWasm';
import type { MeshData, RocketSpec, Vec3 } from './types';

export type AssembleResult = {
  mesh: MeshData;
  volume: number;
  area: number;
};

type Deletable = { delete: () => void };

type RawMesh = {
  numProp: number;
  vertProperties: Float32Array;
  triVerts: Uint32Array;
  mergeFromVert?: Uint32Array;
  mergeToVert?: Uint32Array;
  merge?: () => void;
};

/** Weld GL verts using Manifold merge maps, then by position so the STL is manifold. */
export function weldManifoldMesh(raw: RawMesh, posTol: number): MeshData {
  const numProp = raw.numProp || 3;
  const vp = raw.vertProperties;
  const nVert = Math.floor(vp.length / numProp);
  const parent = new Uint32Array(nVert);
  for (let i = 0; i < nVert; i++) parent[i] = i;
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    let x = i;
    while (parent[x] !== r) {
      const n = parent[x];
      parent[x] = r;
      x = n;
    }
    return r;
  };
  const unite = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const from = raw.mergeFromVert;
  const to = raw.mergeToVert;
  if (from && to) {
    const n = Math.min(from.length, to.length);
    for (let i = 0; i < n; i++) unite(from[i], to[i]);
  }

  const inv = 1 / Math.max(posTol, 1e-12);
  const buckets = new Map<string, number>();
  for (let i = 0; i < nVert; i++) {
    const o = i * numProp;
    const key = `${Math.round(vp[o] * inv)},${Math.round(vp[o + 1] * inv)},${Math.round(vp[o + 2] * inv)}`;
    const prev = buckets.get(key);
    if (prev === undefined) buckets.set(key, i);
    else unite(i, prev);
  }

  const compact = new Map<number, number>();
  const positions: number[] = [];
  const indexOf = (i: number) => {
    const r = find(i);
    let id = compact.get(r);
    if (id === undefined) {
      id = positions.length / 3;
      compact.set(r, id);
      const o = r * numProp;
      positions.push(vp[o], vp[o + 1], vp[o + 2]);
    }
    return id;
  };

  const triOut: number[] = [];
  for (let t = 0; t < raw.triVerts.length; t += 3) {
    const a = indexOf(raw.triVerts[t]);
    const b = indexOf(raw.triVerts[t + 1]);
    const c = indexOf(raw.triVerts[t + 2]);
    if (a === b || b === c || c === a) continue;
    triOut.push(a, b, c);
  }
  return { positions: new Float32Array(positions), indices: Uint32Array.from(triOut) };
}

export async function assembleRocket(spec: RocketSpec): Promise<AssembleResult> {
  const wasm = await loadManifold();
  const { Manifold } = wasm;
  const poly = lathePolygon(spec);
  if (poly.length < 4) throw new Error('Body profile is empty.');

  const temps: Deletable[] = [];
  const track = <T extends Deletable>(m: T): T => {
    temps.push(m);
    return m;
  };

  try {
    let solid = track(Manifold.revolve([poly], spec.tessellation.nTheta));
    solid = track(solid.rotate(0, 90, 0));

    for (const fin of spec.finSets) {
      for (const copy of allFinCopies(spec, fin)) {
        const pts = copy.map((p: Vec3) => [p[0], p[1], p[2]] as [number, number, number]);
        const hull = track(Manifold.hull(pts));
        if (hull.isEmpty()) throw new Error(`Fin "${fin.name}" hull is empty. Check span, chords, and thickness.`);
        solid = track(Manifold.union(solid, hull));
      }
    }

    if (solid.isEmpty()) throw new Error('Boolean union produced an empty solid.');
    if (spec.tessellation.maxEdge > 0) {
      solid = track(solid.refineToLength(spec.tessellation.maxEdge));
    }

    const volume = solid.volume();
    const area = solid.surfaceArea();
    const raw = solid.getMesh() as RawMesh;
    if (typeof raw.merge === 'function') raw.merge();
    const mesh = weldManifoldMesh(raw, Math.max(spec.tessellation.mergeTol, 1e-7));
    return { mesh, volume, area };
  } finally {
    for (let i = temps.length - 1; i >= 0; i--) {
      try {
        temps[i].delete();
      } catch {
        /* already freed */
      }
    }
  }
}
