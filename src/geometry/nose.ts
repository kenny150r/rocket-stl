import type { NoseKind } from './types';

const PI = Math.PI;

export type NoseParams = {
  powerN: number;
  haackC: number;
  ogiveRadius: number;
};

function clamp01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

/** Tangent-ogive circle radius for length L and base radius R. */
export function tangentOgiveRho(length: number, radius: number): number {
  if (radius <= 0) return length;
  return (radius * radius + length * length) / (2 * radius);
}

/**
 * Radius y(x) for a nose of length L and base radius R.
 * x = 0 at the tip, x = L at the base.
 */
export function noseRadius(
  kind: NoseKind,
  x: number,
  length: number,
  radius: number,
  params: NoseParams,
): number {
  if (length <= 0 || radius <= 0) return 0;
  const t = clamp01(x / length);
  const xx = t * length;

  switch (kind) {
    case 'conic':
      return radius * t;
    case 'power': {
      const n = params.powerN > 0 ? params.powerN : 1;
      return radius * t ** n;
    }
    case 'vonKarman':
      return haackRadius(t, radius, 0);
    case 'haack':
      return haackRadius(t, radius, params.haackC);
    case 'tangentOgive':
      return ogiveRadiusAt(xx, length, radius, tangentOgiveRho(length, radius));
    case 'secantOgive': {
      const minRho = 0.5 * Math.hypot(length, radius) + 1e-12;
      const rho = Math.max(params.ogiveRadius, tangentOgiveRho(length, radius) * 1.001, minRho);
      return secantOgiveRadius(xx, length, radius, rho);
    }
    case 'elliptical':
      return radius * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
    case 'parabolic': {
      const k = Math.min(1, Math.max(0, params.haackC));
      const den = 2 - k;
      return den <= 0 ? radius * t : (radius * (2 * t - k * t * t)) / den;
    }
    default:
      return radius * t;
  }
}

/** Haack series: C=0 von Karman (LD-Haack), C=1/3 LV-Haack. */
export function haackRadius(t: number, radius: number, C: number): number {
  const tt = clamp01(t);
  if (tt <= 0) return 0;
  if (tt >= 1) return radius;
  const theta = Math.acos(1 - 2 * tt);
  const inner = theta - 0.5 * Math.sin(2 * theta) + C * Math.sin(theta) ** 2;
  return (radius / Math.sqrt(PI)) * Math.sqrt(Math.max(0, inner));
}

function ogiveRadiusAt(x: number, length: number, radius: number, rho: number): number {
  const dx = length - x;
  const under = rho * rho - dx * dx;
  return Math.sqrt(Math.max(0, under)) + radius - rho;
}

/**
 * Circle of radius rho through the tip (0,0) and base (L,R).
 * Picks the center with negative y so the profile sits above the axis.
 */
export function secantOgiveRadius(x: number, length: number, radius: number, rho: number): number {
  const L = length;
  const R = radius;
  const c = (L * L + R * R) / 2;
  // L*cx + R*cy = c, and cx^2 + cy^2 = rho^2
  // cy = (c - L*cx) / R
  const a = L * L + R * R;
  const b = -2 * c * L;
  const d = c * c - R * R * rho * rho;
  const disc = b * b - 4 * a * d;
  if (disc < 0 || Math.abs(R) < 1e-18) {
    return ogiveRadiusAt(x, length, radius, tangentOgiveRho(length, radius));
  }
  const sqrtD = Math.sqrt(disc);
  const cx1 = (-b + sqrtD) / (2 * a);
  const cx2 = (-b - sqrtD) / (2 * a);
  const cyOf = (cx: number) => (c - L * cx) / R;
  const cand = [
    { cx: cx1, cy: cyOf(cx1) },
    { cx: cx2, cy: cyOf(cx2) },
  ];
  cand.sort((p, q) => p.cy - q.cy);
  const { cx, cy } = cand[0];
  const under = rho * rho - (x - cx) * (x - cx);
  return cy + Math.sqrt(Math.max(0, under));
}

/** Spherical-cap radius for a blunt of radius Rb centered at x=Rb. */
export function sphereCapRadius(x: number, bluntRadius: number): number {
  if (bluntRadius <= 0) return 0;
  const d = x - bluntRadius;
  const under = bluntRadius * bluntRadius - d * d;
  return Math.sqrt(Math.max(0, under));
}

/**
 * Sample a nose: optional spherical blunt, then the parent profile.
 * Returns points from tip to base (inclusive).
 */
export function sampleNose(
  kind: NoseKind,
  length: number,
  radius: number,
  params: NoseParams,
  n: number,
  bluntRadius: number,
  tipMinRadius: number,
): { x: number; r: number }[] {
  const steps = Math.max(8, n);
  const pts: { x: number; r: number }[] = [];
  let joinX = 0;
  if (bluntRadius > 0 && bluntRadius < length) {
    joinX = findBluntJoin(kind, length, radius, params, bluntRadius);
  }

  for (let i = 0; i <= steps; i++) {
    const x = (length * i) / steps;
    let r: number;
    if (joinX > 0 && x <= joinX) r = sphereCapRadius(x, bluntRadius);
    else r = noseRadius(kind, x, length, radius, params);
    r = Math.max(r, tipMinRadius);
    pts.push({ x, r });
  }
  pts[pts.length - 1].r = radius;
  return pts;
}

function findBluntJoin(
  kind: NoseKind,
  length: number,
  radius: number,
  params: NoseParams,
  bluntRadius: number,
): number {
  const xMax = Math.min(length, 2 * bluntRadius);
  let best = 0;
  let bestDiff = Infinity;
  const n = 80;
  for (let i = 1; i < n; i++) {
    const x = (xMax * i) / n;
    const rs = sphereCapRadius(x, bluntRadius);
    const rn = noseRadius(kind, x, length, radius, params);
    const d = Math.abs(rs - rn);
    if (d < bestDiff && rs > 0 && rn > 0) {
      bestDiff = d;
      best = x;
    }
  }
  return bestDiff < 0.05 * radius ? best : Math.min(bluntRadius, length * 0.2);
}
