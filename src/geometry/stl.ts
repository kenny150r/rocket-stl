import type { MeshData, Vec3 } from './types';

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function nrm2(a: Vec3): number {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

function tri(positions: Float32Array, indices: Uint32Array, t: number): [Vec3, Vec3, Vec3] {
  const ia = indices[t * 3] * 3;
  const ib = indices[t * 3 + 1] * 3;
  const ic = indices[t * 3 + 2] * 3;
  return [
    [positions[ia], positions[ia + 1], positions[ia + 2]],
    [positions[ib], positions[ib + 1], positions[ib + 2]],
    [positions[ic], positions[ic + 1], positions[ic + 2]],
  ];
}

export function writeStlBinary(mesh: MeshData, name = 'rocket'): ArrayBuffer {
  const n = Math.floor(mesh.indices.length / 3);
  const buf = new ArrayBuffer(84 + n * 50);
  const view = new DataView(buf);
  const header = `rocket-stl ${name}`.slice(0, 80);
  for (let i = 0; i < 80; i++) view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  view.setUint32(80, n, true);
  let off = 84;
  for (let t = 0; t < n; t++) {
    const [a, b, c] = tri(mesh.positions, mesh.indices, t);
    const cr = cross(sub(b, a), sub(c, a));
    const len = Math.sqrt(nrm2(cr)) || 1;
    const nx = cr[0] / len;
    const ny = cr[1] / len;
    const nz = cr[2] / len;
    view.setFloat32(off, nx, true);
    view.setFloat32(off + 4, ny, true);
    view.setFloat32(off + 8, nz, true);
    off += 12;
    for (const p of [a, b, c]) {
      view.setFloat32(off, p[0], true);
      view.setFloat32(off + 4, p[1], true);
      view.setFloat32(off + 8, p[2], true);
      off += 12;
    }
    view.setUint16(off, 0, true);
    off += 2;
  }
  return buf;
}

export function writeStlAscii(mesh: MeshData, name = 'rocket'): string {
  const n = Math.floor(mesh.indices.length / 3);
  const lines = [`solid ${sanitize(name)}`];
  const fmt = (x: number) => Number(x).toExponential(8);
  for (let t = 0; t < n; t++) {
    const [a, b, c] = tri(mesh.positions, mesh.indices, t);
    const cr = cross(sub(b, a), sub(c, a));
    if (nrm2(cr) === 0) continue;
    const len = Math.sqrt(nrm2(cr));
    lines.push(`  facet normal ${fmt(cr[0] / len)} ${fmt(cr[1] / len)} ${fmt(cr[2] / len)}`);
    lines.push('    outer loop');
    for (const p of [a, b, c]) lines.push(`      vertex ${fmt(p[0])} ${fmt(p[1])} ${fmt(p[2])}`);
    lines.push('    endloop');
    lines.push('  endfacet');
  }
  lines.push(`endsolid ${sanitize(name)}`);
  return lines.join('\n');
}

function sanitize(s: string): string {
  return s.replace(/[^\w.-]+/g, '_') || 'rocket';
}

export function binaryStlTriangleCount(buf: ArrayBuffer): number {
  if (buf.byteLength < 84) return -1;
  return new DataView(buf).getUint32(80, true);
}
