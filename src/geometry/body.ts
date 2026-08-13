import { sampleNose } from './nose';
import type { BodySegment, ProfilePoint, RocketSpec } from './types';

export function aftDiameter(seg: BodySegment): number {
  if (seg.kind === 'nose') return seg.baseDiameter;
  if (seg.kind === 'cylinder') return seg.diameter;
  return seg.aftDiameter;
}

export function foreDiameter(seg: BodySegment): number {
  if (seg.kind === 'nose') return 0;
  if (seg.kind === 'cylinder') return seg.diameter;
  return seg.foreDiameter;
}

export function syncDiameters(segments: BodySegment[]): BodySegment[] {
  const out: BodySegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = { ...segments[i] };
    if (i > 0) {
      const d = aftDiameter(out[i - 1]);
      if (seg.kind === 'cylinder') seg.diameter = d;
      else if (seg.kind === 'nose') seg.baseDiameter = d;
      else {
        seg.foreDiameter = d;
        if (seg.kind === 'flare' && seg.aftDiameter < d) seg.aftDiameter = d;
        if (seg.kind === 'boattail' && seg.aftDiameter > d) seg.aftDiameter = Math.max(0.1 * d, d * 0.5);
      }
    }
    out.push(seg);
  }
  return out;
}

export function bodyLength(segments: BodySegment[]): number {
  return segments.reduce((s, seg) => s + Math.max(0, seg.length), 0);
}

export type Station = { x0: number; x1: number; r0: number; r1: number; seg: BodySegment };

export function stations(segments: BodySegment[]): Station[] {
  const st: Station[] = [];
  let x = 0;
  for (const seg of segments) {
    const L = Math.max(0, seg.length);
    const r0 = foreDiameter(seg) / 2;
    const r1 = aftDiameter(seg) / 2;
    st.push({ x0: x, x1: x + L, r0, r1, seg });
    x += L;
  }
  return st;
}

export function radiusAt(segments: BodySegment[], x: number): number {
  const st = stations(segments);
  if (st.length === 0) return 0;
  if (x <= st[0].x0) return st[0].r0;
  for (const s of st) {
    if (x < s.x1 - 1e-15 || x <= s.x1) {
      if (s.seg.kind === 'nose') {
        const local = x - s.x0;
        const pts = sampleNose(
          s.seg.nose,
          s.seg.length,
          s.r1,
          { powerN: s.seg.powerN, haackC: s.seg.haackC, ogiveRadius: s.seg.ogiveRadius },
          48,
          s.seg.bluntRadius,
          0,
        );
        if (pts.length === 0) return s.r1;
        if (local <= pts[0].x) return pts[0].r;
        for (let i = 1; i < pts.length; i++) {
          if (local <= pts[i].x) {
            const a = pts[i - 1];
            const b = pts[i];
            const u = (local - a.x) / Math.max(1e-15, b.x - a.x);
            return a.r + u * (b.r - a.r);
          }
        }
        return pts[pts.length - 1].r;
      }
      const u = s.x1 === s.x0 ? 1 : (x - s.x0) / (s.x1 - s.x0);
      return s.r0 + Math.min(1, Math.max(0, u)) * (s.r1 - s.r0);
    }
  }
  return st[st.length - 1].r1;
}

export function sampleBodyProfile(spec: RocketSpec): ProfilePoint[] {
  const { tessellation: tes } = spec;
  const pts: ProfilePoint[] = [];
  let x0 = 0;
  const tipMin = tipMinRadius(spec);

  for (const seg of spec.segments) {
    const n = Math.max(8, tes.axialPerSegment);
    if (seg.kind === 'nose') {
      const sampled = sampleNose(
        seg.nose,
        seg.length,
        seg.baseDiameter / 2,
        { powerN: seg.powerN, haackC: seg.haackC, ogiveRadius: seg.ogiveRadius },
        n,
        seg.bluntRadius,
        tipMin,
      );
      for (const p of sampled) {
        pushPoint(pts, { x: x0 + p.x, r: p.r });
      }
    } else {
      const r0 = foreDiameter(seg) / 2;
      const r1 = aftDiameter(seg) / 2;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        pushPoint(pts, { x: x0 + u * seg.length, r: r0 + u * (r1 - r0) });
      }
    }
    x0 += Math.max(0, seg.length);
  }
  return pts;
}

function pushPoint(pts: ProfilePoint[], p: ProfilePoint) {
  const last = pts[pts.length - 1];
  if (last && Math.abs(last.x - p.x) < 1e-15 && Math.abs(last.r - p.r) < 1e-15) return;
  pts.push(p);
}

export function tipMinRadius(spec: RocketSpec): number {
  const first = spec.segments[0];
  const R = first ? Math.max(aftDiameter(first) / 2, foreDiameter(first) / 2, 1e-9) : 1;
  const frac = Math.max(0, spec.tessellation.tipMinRadiusFrac) * R;
  const n = Math.max(3, spec.tessellation.nTheta);
  const tol = Math.max(spec.tessellation.mergeTol, 1e-9);
  const sinA = Math.sin((2 * Math.PI) / n);
  const fromTol = Math.sqrt((40 * tol) / Math.max(sinA, 1e-6));
  return Math.max(frac, fromTol);
}

/**
 * Closed lathe polygon in Manifold revolve frame: [radius, axial] = [x, y].
 * CCW: tip on axis → outer skin toward the base → back to the axis.
 */
export function lathePolygon(spec: RocketSpec): [number, number][] {
  const outer = sampleBodyProfile(spec);
  if (outer.length < 2) return [];
  const poly: [number, number][] = [];
  const rTip = Math.max(outer[0].r, tipMinRadius(spec));
  poly.push([0, outer[0].x]);
  poly.push([rTip, outer[0].x]);
  for (let i = 1; i < outer.length; i++) poly.push([Math.max(0, outer[i].r), outer[i].x]);
  const last = outer[outer.length - 1];
  poly.push([0, last.x]);
  return poly;
}

