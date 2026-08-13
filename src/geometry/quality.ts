import type { MeshData, Vec3, WatertightReport } from './types';

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function nrm2(a: Vec3): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}
function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt(nrm2(sub(a, b)));
}

function vert(positions: Float32Array, i: number): Vec3 {
  const o = i * 3;
  return [positions[o], positions[o + 1], positions[o + 2]];
}

function qkey(p: Vec3, inv: number): string {
  const q = (x: number) => Math.round(x * inv);
  return `${q(p[0])},${q(p[1])},${q(p[2])}`;
}

export function checkWatertight(mesh: MeshData, tol = 1e-9): WatertightReport {
  const { positions, indices } = mesh;
  const nTris = Math.floor(indices.length / 3);
  const warnings: string[] = [];
  let nDegenerate = 0;
  let nOpenEdges = 0;
  let nNonmanifold = 0;
  let minEdge = Infinity;
  let maxEdge = 0;
  let worstAspect = 1;
  let lo: Vec3 | null = null;
  let hi: Vec3 | null = null;

  const inv = 1 / Math.max(tol, 1e-12);
  const edges = new Map<string, number>();

  const bump = (ka: string, kb: string) => {
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  };

  for (let t = 0; t < nTris; t++) {
    const ia = indices[t * 3];
    const ib = indices[t * 3 + 1];
    const ic = indices[t * 3 + 2];
    const a = vert(positions, ia);
    const b = vert(positions, ib);
    const c = vert(positions, ic);
    for (const p of [a, b, c]) {
      if (!lo || !hi) {
        lo = [...p];
        hi = [...p];
      } else {
        lo[0] = Math.min(lo[0], p[0]);
        lo[1] = Math.min(lo[1], p[1]);
        lo[2] = Math.min(lo[2], p[2]);
        hi[0] = Math.max(hi[0], p[0]);
        hi[1] = Math.max(hi[1], p[1]);
        hi[2] = Math.max(hi[2], p[2]);
      }
    }
    const cr = cross(sub(b, a), sub(c, a));
    if (nrm2(cr) < tol * tol) {
      nDegenerate += 1;
      continue;
    }
    const eab = dist(a, b);
    const ebc = dist(b, c);
    const eca = dist(c, a);
    minEdge = Math.min(minEdge, eab, ebc, eca);
    maxEdge = Math.max(maxEdge, eab, ebc, eca);
    const emin = Math.min(eab, ebc, eca);
    const emax = Math.max(eab, ebc, eca);
    if (emin > 0) worstAspect = Math.max(worstAspect, emax / emin);
    bump(qkey(a, inv), qkey(b, inv));
    bump(qkey(b, inv), qkey(c, inv));
    bump(qkey(c, inv), qkey(a, inv));
  }

  for (const count of edges.values()) {
    if (count === 1) nOpenEdges += 1;
    else if (count !== 2) nNonmanifold += 1;
  }

  if (!Number.isFinite(minEdge)) minEdge = 0;
  if (worstAspect > 50) warnings.push(`Worst triangle aspect ratio is ${worstAspect.toFixed(1)} (> 50).`);

  const ok = nOpenEdges === 0 && nNonmanifold === 0 && nDegenerate === 0 && nTris > 0;
  const message = `tris=${nTris} open_edges=${nOpenEdges} nonmanifold=${nNonmanifold} degenerate=${nDegenerate}`;
  return {
    ok,
    nTris,
    nOpenEdges,
    nNonmanifold,
    nDegenerate,
    minEdge,
    maxEdge,
    worstAspect,
    bbox: lo && hi ? { lo, hi } : null,
    message,
    warnings,
  };
}

/** Indexed cube, for tests. */
export function unitCubeMesh(): MeshData {
  const p = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ]);
  const faces = [
    [0, 3, 2],
    [0, 2, 1],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [2, 3, 7],
    [2, 7, 6],
    [0, 4, 7],
    [0, 7, 3],
    [1, 2, 6],
    [1, 6, 5],
  ];
  const indices = new Uint32Array(faces.flat());
  return { positions: p, indices };
}
