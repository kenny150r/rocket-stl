import { defaultTessellation } from '../geometry/defaults';
import { ensureLabelGroups } from '../geometry/components';
import { newId } from '../geometry/ids';
import type { BodySegment, FinSet, LabelGroup, NoseKind, RocketSpec, Tessellation, Units } from '../geometry/types';

const PREFIX = 's=';
const MAX_HREF = 12_000;

export function coerceSpec(raw: unknown): RocketSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.segments) || o.segments.length === 0) return null;
  const units: Units = o.units === 'mm' || o.units === 'in' || o.units === 'm' ? o.units : 'm';
  const segments: BodySegment[] = [];
  for (const item of o.segments) {
    const seg = coerceSegment(item);
    if (!seg) return null;
    segments.push(seg);
  }
  const finSets: FinSet[] = [];
  if (Array.isArray(o.finSets)) {
    for (const item of o.finSets) {
      const fin = coerceFin(item);
      if (!fin) return null;
      finSets.push(fin);
    }
  }
  const tesIn = o.tessellation && typeof o.tessellation === 'object' ? (o.tessellation as Partial<Tessellation>) : {};
  const labelGroups: LabelGroup[] = [];
  if (Array.isArray(o.labelGroups)) {
    for (const item of o.labelGroups) {
      if (!item || typeof item !== 'object') continue;
      const g = item as Record<string, unknown>;
      const members = Array.isArray(g.members) ? g.members.filter((m): m is string => typeof m === 'string') : [];
      labelGroups.push({
        id: typeof g.id === 'string' && g.id ? g.id : newId(),
        name: typeof g.name === 'string' ? g.name : 'Group',
        members,
      });
    }
  }
  return ensureLabelGroups({
    name: typeof o.name === 'string' && o.name.trim() ? o.name : 'rocket',
    units,
    segments,
    finSets,
    tessellation: { ...defaultTessellation(), ...tesIn },
    labelGroups,
  });
}

function coerceSegment(item: unknown): BodySegment | null {
  if (!item || typeof item !== 'object') return null;
  const s = item as Record<string, unknown>;
  const id = typeof s.id === 'string' && s.id ? s.id : newId();
  const length = num(s.length);
  if (length === null) return null;
  const noses: NoseKind[] = ['conic', 'power', 'vonKarman', 'haack', 'tangentOgive', 'secantOgive', 'elliptical', 'parabolic'];
  if (s.kind === 'nose') {
    const nose = noses.includes(s.nose as NoseKind) ? (s.nose as NoseKind) : 'conic';
    return {
      id,
      kind: 'nose',
      nose,
      length,
      baseDiameter: num(s.baseDiameter) ?? 0.1,
      powerN: num(s.powerN) ?? 0.5,
      haackC: num(s.haackC) ?? 0,
      ogiveRadius: num(s.ogiveRadius) ?? 0,
      bluntRadius: num(s.bluntRadius) ?? 0,
    };
  }
  if (s.kind === 'cylinder') {
    return { id, kind: 'cylinder', length, diameter: num(s.diameter) ?? 0.1 };
  }
  if (s.kind === 'frustum' || s.kind === 'flare' || s.kind === 'boattail') {
    return {
      id,
      kind: s.kind,
      length,
      foreDiameter: num(s.foreDiameter) ?? 0.1,
      aftDiameter: num(s.aftDiameter) ?? 0.1,
    };
  }
  return null;
}

function coerceFin(item: unknown): FinSet | null {
  if (!item || typeof item !== 'object') return null;
  const f = item as Record<string, unknown>;
  return {
    id: typeof f.id === 'string' && f.id ? f.id : newId(),
    name: typeof f.name === 'string' ? f.name : 'Fins',
    xLe: num(f.xLe) ?? 0,
    nFins: num(f.nFins) ?? 4,
    rollDeg: num(f.rollDeg) ?? 0,
    cantDeg: num(f.cantDeg) ?? 0,
    hingeX: num(f.hingeX),
    hingeRef: f.hingeRef === 'rootTip' ? 'rootTip' : 'nose',
    elevatorDeg: num(f.elevatorDeg) ?? 0,
    rudderDeg: num(f.rudderDeg) ?? 0,
    aileronDeg: num(f.aileronDeg) ?? 0,
    planformMode: f.planformMode === 'datcom' || f.planformMode === 'custom' || f.planformMode === 'preset' ? f.planformMode : 'preset',
    preset: f.preset === 'rectangular' || f.preset === 'clippedDelta' || f.preset === 'delta' || f.preset === 'trapezoidal' ? f.preset : 'trapezoidal',
    area: num(f.area) ?? 0,
    aspectRatio: num(f.aspectRatio) ?? 1,
    taperRatio: num(f.taperRatio) ?? 0.5,
    sweepLeDeg: num(f.sweepLeDeg) ?? 0,
    span: num(f.span) ?? 0.08,
    rootChord: num(f.rootChord) ?? 0.12,
    tipChord: num(f.tipChord) ?? 0.06,
    thickness: num(f.thickness) ?? 0.004,
    leRadius: num(f.leRadius) ?? 0,
    section: f.section === 'plate' ? 'plate' : 'doubleWedge',
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function encodeSpec(spec: RocketSpec): string {
  const json = JSON.stringify(spec);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSpec(token: string): RocketSpec | null {
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return coerceSpec(JSON.parse(json));
  } catch {
    return null;
  }
}

export function specFromHash(hash: string): RocketSpec | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h.startsWith(PREFIX)) return null;
  return decodeSpec(h.slice(PREFIX.length));
}

export function hashForSpec(spec: RocketSpec): string {
  return `#${PREFIX}${encodeSpec(spec)}`;
}

export function writeSpecToUrl(spec: RocketSpec): boolean {
  if (typeof window === 'undefined') return false;
  const next = new URL(window.location.href);
  next.hash = hashForSpec(spec).slice(1);
  if (next.href.length > MAX_HREF) return false;
  if (next.href === window.location.href) return true;
  history.replaceState(null, '', next.href);
  return true;
}

export function copyShareUrl(spec: RocketSpec): Promise<boolean> {
  writeSpecToUrl(spec);
  const href = window.location.href;
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(href).then(() => true);
  return Promise.resolve(false);
}
