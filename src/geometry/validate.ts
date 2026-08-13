import { aftDiameter, bodyLength, foreDiameter, radiusAt } from './body';
import { resolvePlanform } from './planform';
import type { BlockingIssue, IssueTarget, RocketSpec } from './types';

export function validateSpec(spec: RocketSpec): BlockingIssue[] {
  const issues: BlockingIssue[] = [];
  if (!spec.segments.length) {
    issues.push({ level: 'error', message: 'Add at least one body segment.', target: { kind: 'body' } });
  }

  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i];
    const t = (field?: string): IssueTarget => ({ kind: 'segment', id: seg.id, field });
    if (seg.length <= 0) {
      issues.push({
        level: 'error',
        message: `Segment ${i + 1} (${seg.kind}) has non-positive length.`,
        target: t('length'),
      });
    }
    if (seg.kind === 'nose') {
      if (seg.baseDiameter <= 0) {
        issues.push({ level: 'error', message: 'Nose base diameter must be positive.', target: t('baseDiameter') });
      }
      if (seg.nose === 'power' && seg.powerN <= 0) {
        issues.push({ level: 'error', message: 'Power-series exponent n must be > 0.', target: t('powerN') });
      }
    }
    if (seg.kind === 'cylinder' && seg.diameter <= 0) {
      issues.push({
        level: 'error',
        message: `Cylinder ${i + 1} diameter must be positive.`,
        target: t('diameter'),
      });
    }
    if (seg.kind === 'frustum' || seg.kind === 'flare' || seg.kind === 'boattail') {
      if (seg.foreDiameter <= 0 || seg.aftDiameter <= 0) {
        issues.push({
          level: 'error',
          message: `${seg.kind} ${i + 1} diameters must be positive.`,
          target: t('aftDiameter'),
        });
      }
      if (seg.kind === 'flare' && seg.aftDiameter < seg.foreDiameter) {
        issues.push({
          level: 'error',
          message: `Flare ${i + 1} must expand (aft diameter ≥ fore).`,
          target: t('aftDiameter'),
        });
      }
      if (seg.kind === 'boattail' && seg.aftDiameter > seg.foreDiameter) {
        issues.push({
          level: 'error',
          message: `Boat-tail ${i + 1} must contract (aft diameter ≤ fore).`,
          target: t('aftDiameter'),
        });
      }
    }
    if (i > 0) {
      const dPrev = aftDiameter(spec.segments[i - 1]);
      const dFore = foreDiameter(seg);
      if (Math.abs(dPrev - dFore) > 1e-9 * Math.max(1, dPrev)) {
        issues.push({
          level: 'error',
          message: `Diameter jump at joint ${i}: aft ${dPrev} vs next fore ${dFore}.`,
          target: t(),
        });
      }
    }
  }

  const L = bodyLength(spec.segments);
  const tes = spec.tessellation;
  if (tes.nTheta < 12) {
    issues.push({
      level: 'error',
      message: 'Circumferential segments (nθ) must be at least 12.',
      target: { kind: 'tessellation', field: 'nTheta' },
    });
  }
  if (tes.axialPerSegment < 4) {
    issues.push({
      level: 'error',
      message: 'Axial samples per segment must be at least 4.',
      target: { kind: 'tessellation', field: 'axialPerSegment' },
    });
  }

  for (const fin of spec.finSets) {
    const pf = resolvePlanform(fin);
    const t = (field?: string): IssueTarget => ({ kind: 'fin', id: fin.id, field });
    if (fin.nFins < 1) {
      issues.push({ level: 'error', message: `${fin.name}: need at least one fin.`, target: t('nFins') });
    }
    if (pf.span <= 0) {
      issues.push({
        level: 'error',
        message: `${fin.name}: span must be positive.`,
        target: t(fin.planformMode === 'datcom' ? 'area' : 'span'),
      });
    }
    if (pf.rootChord <= 0) {
      issues.push({
        level: 'error',
        message: `${fin.name}: root chord must be positive.`,
        target: t(fin.planformMode === 'datcom' ? 'area' : 'rootChord'),
      });
    }
    if (fin.thickness <= 0) {
      issues.push({ level: 'error', message: `${fin.name}: thickness must be positive.`, target: t('thickness') });
    }
    if (fin.leRadius > fin.thickness / 2 + 1e-12) {
      issues.push({
        level: 'error',
        message: `${fin.name}: LE radius cannot exceed half the thickness.`,
        target: t('leRadius'),
      });
    }
    const xTe = fin.xLe + pf.rootChord;
    if (fin.xLe < -1e-9 || xTe > L + 1e-6) {
      issues.push({
        level: 'error',
        message: `${fin.name}: root chord [${fin.xLe}, ${xTe}] is outside the body [0, ${L}].`,
        target: t('xLe'),
      });
    } else {
      const rMid = radiusAt(spec.segments, fin.xLe + 0.5 * pf.rootChord);
      if (rMid <= 1e-12) {
        issues.push({ level: 'error', message: `${fin.name}: root does not sit on the body.`, target: t('xLe') });
      }
    }
    const xH =
      typeof fin.hingeX === 'number' && Number.isFinite(fin.hingeX)
        ? fin.hingeX
        : fin.xLe + 0.25 * Math.max(pf.rootChord, 0);
    if (xH < -1e-9 || xH > L + 1e-6) {
      issues.push({
        level: 'error',
        message: `${fin.name}: hinge station ${xH} is outside the body [0, ${L}].`,
        target: t('hingeX'),
      });
    } else if (radiusAt(spec.segments, xH) <= 1e-12) {
      issues.push({
        level: 'error',
        message: `${fin.name}: hinge does not sit on the body.`,
        target: t('hingeX'),
      });
    }
  }

  return issues;
}

export function hasErrors(issues: BlockingIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}

export function hasTarget(
  issues: BlockingIssue[],
  kind: IssueTarget['kind'],
  id?: string,
  field?: string,
): boolean {
  return issues.some((i) => {
    if (!i.target || i.target.kind !== kind) return false;
    if (id !== undefined && i.target.id !== id) return false;
    if (field !== undefined && i.target.field !== field) return false;
    return true;
  });
}
