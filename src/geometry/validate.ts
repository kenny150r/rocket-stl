import { aftDiameter, bodyLength, foreDiameter, radiusAt } from './body';
import { resolvePlanform } from './planform';
import type { BlockingIssue, RocketSpec } from './types';

export function validateSpec(spec: RocketSpec): BlockingIssue[] {
  const issues: BlockingIssue[] = [];
  if (!spec.segments.length) issues.push({ level: 'error', message: 'Add at least one body segment.' });

  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i];
    if (seg.length <= 0) issues.push({ level: 'error', message: `Segment ${i + 1} (${seg.kind}) has non-positive length.` });
    if (seg.kind === 'nose') {
      if (seg.baseDiameter <= 0) issues.push({ level: 'error', message: 'Nose base diameter must be positive.' });
      if (seg.nose === 'power' && seg.powerN <= 0) issues.push({ level: 'error', message: 'Power-series exponent n must be > 0.' });
    }
    if (seg.kind === 'cylinder' && seg.diameter <= 0) {
      issues.push({ level: 'error', message: `Cylinder ${i + 1} diameter must be positive.` });
    }
    if (seg.kind === 'frustum' || seg.kind === 'flare' || seg.kind === 'boattail') {
      if (seg.foreDiameter <= 0 || seg.aftDiameter <= 0) {
        issues.push({ level: 'error', message: `${seg.kind} ${i + 1} diameters must be positive.` });
      }
      if (seg.kind === 'flare' && seg.aftDiameter < seg.foreDiameter) {
        issues.push({ level: 'error', message: `Flare ${i + 1} must expand (aft diameter ≥ fore).` });
      }
      if (seg.kind === 'boattail' && seg.aftDiameter > seg.foreDiameter) {
        issues.push({ level: 'error', message: `Boat-tail ${i + 1} must contract (aft diameter ≤ fore).` });
      }
    }
    if (i > 0) {
      const dPrev = aftDiameter(spec.segments[i - 1]);
      const dFore = foreDiameter(seg);
      if (Math.abs(dPrev - dFore) > 1e-9 * Math.max(1, dPrev)) {
        issues.push({
          level: 'error',
          message: `Diameter jump at joint ${i}: aft ${dPrev} vs next fore ${dFore}.`,
        });
      }
    }
  }

  const L = bodyLength(spec.segments);
  const tes = spec.tessellation;
  if (tes.nTheta < 12) issues.push({ level: 'error', message: 'Circumferential segments (nθ) must be at least 12.' });
  if (tes.axialPerSegment < 4) issues.push({ level: 'error', message: 'Axial samples per segment must be at least 4.' });

  for (const fin of spec.finSets) {
    const pf = resolvePlanform(fin);
    if (fin.nFins < 1) issues.push({ level: 'error', message: `${fin.name}: need at least one fin.` });
    if (pf.span <= 0) issues.push({ level: 'error', message: `${fin.name}: span must be positive.` });
    if (pf.rootChord <= 0) issues.push({ level: 'error', message: `${fin.name}: root chord must be positive.` });
    if (fin.thickness <= 0) issues.push({ level: 'error', message: `${fin.name}: thickness must be positive.` });
    if (fin.leRadius > fin.thickness / 2 + 1e-12) {
      issues.push({ level: 'error', message: `${fin.name}: LE radius cannot exceed half the thickness.` });
    }
    const xTe = fin.xLe + pf.rootChord;
    if (fin.xLe < -1e-9 || xTe > L + 1e-6) {
      issues.push({
        level: 'error',
        message: `${fin.name}: root chord [${fin.xLe}, ${xTe}] is outside the body [0, ${L}].`,
      });
    } else {
      const rMid = radiusAt(spec.segments, fin.xLe + 0.5 * pf.rootChord);
      if (rMid <= 1e-12) issues.push({ level: 'error', message: `${fin.name}: root does not sit on the body.` });
    }
  }

  return issues;
}

export function hasErrors(issues: BlockingIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
