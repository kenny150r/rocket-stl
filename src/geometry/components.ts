import { aftDiameter, bodyLength, radiusAt, stations } from './body';
import { newId } from './ids';
import type { AtomicComponent, LabelGroup, MeshData, RocketSpec, Vec3 } from './types';

export const BASE_KEY = 'base';

export function segmentKey(id: string): string {
  return `seg.${id}`;
}

export function finKey(setId: string, copy: number): string {
  return `fin.${setId}.${copy}`;
}

function segmentName(kind: string, index: number): string {
  if (kind === 'nose') return `Nose ${index + 1}`;
  if (kind === 'boattail') return 'Boat-tail';
  if (kind === 'cylinder') return 'Cylinder';
  if (kind === 'flare') return 'Flare';
  if (kind === 'frustum') return 'Frustum';
  return kind;
}

export function atomicComponents(spec: RocketSpec): AtomicComponent[] {
  const out: AtomicComponent[] = [];
  let id = 1;
  spec.segments.forEach((seg, i) => {
    out.push({ id: id++, key: segmentKey(seg.id), name: segmentName(seg.kind, i) });
  });
  out.push({ id: id++, key: BASE_KEY, name: 'Base' });
  for (const fin of spec.finSets) {
    const n = Math.max(1, Math.round(fin.nFins));
    for (let k = 0; k < n; k++) {
      const label = fin.name?.trim() || 'Fin';
      out.push({ id: id++, key: finKey(fin.id, k), name: `${label} ${k + 1}` });
    }
  }
  return out;
}

export function defaultLabelGroups(spec: RocketSpec): LabelGroup[] {
  const atoms = atomicComponents(spec);
  const segs = atoms.filter((a) => a.key.startsWith('seg.')).map((a) => a.key);
  const fins = atoms.filter((a) => a.key.startsWith('fin.')).map((a) => a.key);
  const all = atoms.map((a) => a.key);
  return [
    { id: 'base', name: 'Base', members: [BASE_KEY] },
    { id: 'fins', name: 'Fins', members: fins },
    { id: 'body', name: 'Body', members: segs },
    { id: 'forebody', name: 'Forebody', members: all.filter((k) => k !== BASE_KEY) },
  ];
}

export const DEFAULT_GROUP_IDS = new Set(['base', 'fins', 'body', 'forebody']);

export function ensureLabelGroups(spec: RocketSpec): RocketSpec {
  const defaults = defaultLabelGroups(spec);
  const keys = new Set(atomicComponents(spec).map((a) => a.key));
  const existing = spec.labelGroups ?? [];
  const groups: LabelGroup[] = defaults.map((d) => {
    const prev = existing.find((g) => g.id === d.id);
    return { id: d.id, name: prev?.name?.trim() ? prev.name : d.name, members: d.members };
  });
  for (const g of existing) {
    if (DEFAULT_GROUP_IDS.has(g.id)) continue;
    groups.push({
      id: g.id,
      name: g.name,
      members: g.members.filter((k) => keys.has(k)),
    });
  }
  return { ...spec, labelGroups: groups };
}

export function componentsSidecar(spec: RocketSpec): string {
  const synced = ensureLabelGroups(spec);
  const components = atomicComponents(synced);
  return `${JSON.stringify(
    {
      components,
      groups: (synced.labelGroups ?? []).map((g) => ({
        key: g.id,
        name: g.name,
        members: g.members,
      })),
    },
    null,
    2,
  )}\n`;
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

function centroid(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

function hypot2(y: number, z: number): number {
  return Math.sqrt(y * y + z * z);
}

function angAbsDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function segmentIdAt(spec: RocketSpec, x: number): string {
  const st = stations(spec.segments);
  if (st.length === 0) return spec.segments[0]?.id ?? '';
  if (x <= st[0].x0) return st[0].seg.id;
  for (const s of st) {
    if (x <= s.x1 + 1e-12) return s.seg.id;
  }
  return st[st.length - 1].seg.id;
}

function nearestFinKey(spec: RocketSpec, y: number, z: number): string | null {
  const az = Math.atan2(z, y);
  let best: { key: string; d: number } | null = null;
  for (const fin of spec.finSets) {
    const n = Math.max(1, Math.round(fin.nFins));
    const roll = (fin.rollDeg * Math.PI) / 180;
    for (let k = 0; k < n; k++) {
      const a0 = roll + (Math.PI * 2 * k) / n;
      const d = angAbsDiff(az, a0);
      const key = finKey(fin.id, k);
      if (!best || d < best.d) best = { key, d };
    }
  }
  return best?.key ?? null;
}

export function classifyComponents(mesh: MeshData, spec: RocketSpec): Uint16Array {
  const atoms = atomicComponents(spec);
  const idOf = new Map(atoms.map((a) => [a.key, a.id]));
  const n = Math.floor(mesh.indices.length / 3);
  const out = new Uint16Array(n);
  const L = bodyLength(spec.segments);
  const last = spec.segments[spec.segments.length - 1];
  const rAft = last ? aftDiameter(last) / 2 : 0;
  const maxTh = spec.finSets.reduce((m, f) => Math.max(m, f.thickness), 0);
  const hasFins = spec.finSets.some((f) => f.nFins > 0);
  const xBase = L - Math.max(1e-9, 1e-4 * Math.max(L, 1e-3), 2 * spec.tessellation.mergeTol);

  for (let t = 0; t < n; t++) {
    const [a, b, c] = triVerts(mesh, t);
    const p = centroid(a, b, c);
    const r = hypot2(p[1], p[2]);
    const rb = radiusAt(spec.segments, p[0]);
    const eps = Math.max(1e-8, 0.02 * Math.max(rb, 1e-6), 0.3 * maxTh);
    let key: string;
    if (hasFins && r > rb + eps) {
      key = nearestFinKey(spec, p[1], p[2]) ?? segmentKey(segmentIdAt(spec, p[0]));
    } else if (p[0] >= xBase && r < 0.92 * Math.max(rAft, 1e-12)) {
      key = BASE_KEY;
    } else {
      key = segmentKey(segmentIdAt(spec, p[0]));
    }
    const id = idOf.get(key) ?? atoms[0]?.id ?? 0;
    out[t] = id;
  }
  return out;
}

export function addLabelGroup(spec: RocketSpec, name = 'Group'): RocketSpec {
  const synced = ensureLabelGroups(spec);
  return {
    ...synced,
    labelGroups: [...(synced.labelGroups ?? []), { id: newId(), name, members: [] }],
  };
}
