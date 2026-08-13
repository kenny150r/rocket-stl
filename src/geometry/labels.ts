import { bodyLength, radiusAt, stations } from './body';
import { writeStlAscii, writeStlBinary } from './stl';
import type { BodySegment, MeshData, RocketSpec, Vec3 } from './types';

export type NamedMesh = {
  name: string;
  mesh: MeshData;
  nTris: number;
  area: number;
};

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function nrm2(a: Vec3): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

function triVerts(mesh: MeshData, t: number): [Vec3, Vec3, Vec3] {
  const ia = mesh.indices[t * 3] * 3;
  const ib = mesh.indices[t * 3 + 1] * 3;
  const ic = mesh.indices[t * 3 + 2] * 3;
  return [
    [mesh.positions[ia], mesh.positions[ia + 1], mesh.positions[ia + 2]],
    [mesh.positions[ib], mesh.positions[ib + 1], mesh.positions[ib + 2]],
    [mesh.positions[ic], mesh.positions[ic + 1], mesh.positions[ic + 2]],
  ];
}

export function triangleArea(a: Vec3, b: Vec3, c: Vec3): number {
  return 0.5 * Math.sqrt(nrm2(cross(sub(b, a), sub(c, a))));
}

export function meshArea(mesh: MeshData): number {
  const n = Math.floor(mesh.indices.length / 3);
  let a = 0;
  for (let t = 0; t < n; t++) a += triangleArea(...triVerts(mesh, t));
  return a;
}

function sanitize(s: string): string {
  return s.replace(/[^\w.-]+/g, '_') || 'part';
}

function segmentName(seg: BodySegment): string {
  if (seg.kind === 'nose') return 'nose';
  if (seg.kind === 'cylinder') return 'cylinder';
  return seg.kind;
}

export function uniqueSegmentNames(segments: BodySegment[]): string[] {
  const seen = new Map<string, number>();
  return segments.map((seg) => {
    const base = segmentName(seg);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}

function finLabel(spec: RocketSpec): string {
  if (spec.finSets.length === 1) return sanitize(spec.finSets[0].name);
  return 'fins';
}

function extractTris(mesh: MeshData, keep: (t: number) => boolean): MeshData {
  const remap = new Map<number, number>();
  const pos: number[] = [];
  const idx: number[] = [];
  const n = Math.floor(mesh.indices.length / 3);
  const vert = (i: number): number => {
    let id = remap.get(i);
    if (id === undefined) {
      id = pos.length / 3;
      remap.set(i, id);
      const o = i * 3;
      pos.push(mesh.positions[o], mesh.positions[o + 1], mesh.positions[o + 2]);
    }
    return id;
  };
  for (let t = 0; t < n; t++) {
    if (!keep(t)) continue;
    idx.push(vert(mesh.indices[t * 3]), vert(mesh.indices[t * 3 + 1]), vert(mesh.indices[t * 3 + 2]));
  }
  return { positions: new Float32Array(pos), indices: Uint32Array.from(idx) };
}

function named(name: string, mesh: MeshData): NamedMesh {
  return { name, mesh, nTris: Math.floor(mesh.indices.length / 3), area: meshArea(mesh) };
}

/**
 * Partition a watertight rocket mesh into labeled shells (same triangles, no overlap).
 * Labels: body segments by station, `base` for the aft disk, and fins when present.
 */
export function labelRocketMesh(spec: RocketSpec, mesh: MeshData): NamedMesh[] {
  const n = Math.floor(mesh.indices.length / 3);
  const L = bodyLength(spec.segments);
  const st = stations(spec.segments);
  const segNames = uniqueSegmentNames(spec.segments);
  const rAft = radiusAt(spec.segments, L);
  const d = Math.max(
    1e-9,
    ...spec.segments.map((s) =>
      Math.max(
        s.kind === 'nose' ? s.baseDiameter : s.kind === 'cylinder' ? s.diameter : Math.max(s.foreDiameter, s.aftDiameter),
        0,
      ),
    ),
  );
  const xTol = Math.max(20 * spec.tessellation.mergeTol, 1e-6 * Math.max(L, 1), 1e-7);
  const hasFins = spec.finSets.length > 0;
  const finClear = hasFins
    ? Math.max(3 * spec.tessellation.mergeTol, 0.25 * Math.max(0, ...spec.finSets.map((f) => f.thickness)), 0.01 * d)
    : Infinity;
  const finsName = finLabel(spec);
  const labels = new Array<string>(n);

  for (let t = 0; t < n; t++) {
    const [a, b, c] = triVerts(mesh, t);
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    const cz = (a[2] + b[2] + c[2]) / 3;
    const r = Math.hypot(cy, cz);
    const xmin = Math.min(a[0], b[0], c[0]);
    if (xmin > L - xTol || (cx > L - 2 * xTol && r <= rAft + 4 * xTol)) {
      labels[t] = 'base';
      continue;
    }
    const rBody = radiusAt(spec.segments, cx);
    if (hasFins && r > rBody + finClear) {
      labels[t] = finsName;
      continue;
    }
    let name = segNames[segNames.length - 1] ?? 'body';
    for (let i = 0; i < st.length; i++) {
      if (cx <= st[i].x1 + xTol) {
        name = segNames[i];
        break;
      }
    }
    labels[t] = name;
  }

  const order = [...segNames, 'base'];
  if (hasFins) order.push(finsName);
  const parts: NamedMesh[] = [];
  for (const name of order) {
    const part = extractTris(mesh, (t) => labels[t] === name);
    if (part.indices.length === 0) continue;
    parts.push(named(name, part));
  }
  return parts;
}

export function writeStlAsciiLabeled(parts: NamedMesh[]): string {
  return parts.map((p) => writeStlAscii(p.mesh, p.name)).join('\n');
}

export function labeledBinaryFiles(parts: NamedMesh[]): { name: string; buffer: ArrayBuffer }[] {
  return parts.map((p) => ({ name: p.name, buffer: writeStlBinary(p.mesh, p.name) }));
}
