import { describe, expect, it } from 'vitest';
import { aftDiameter, foreDiameter, lathePolygon, sampleBodyProfile, syncDiameters } from '../src/geometry/body';
import { defaultCylinder, defaultNose, defaultSpec, defaultTaper } from '../src/geometry/defaults';

describe('body stack', () => {
  it('syncs diameters from the previous aft face', () => {
    const nose = defaultNose();
    nose.baseDiameter = 0.1;
    const tube = defaultCylinder(0.2);
    const flare = defaultTaper('flare', 0.5);
    const synced = syncDiameters([nose, tube, flare]);
    expect(aftDiameter(synced[0])).toBe(0.1);
    expect(foreDiameter(synced[1])).toBe(0.1);
    expect(foreDiameter(synced[2])).toBe(aftDiameter(synced[1]));
  });

  it('samples a monotonic axial profile', () => {
    const pts = sampleBodyProfile(defaultSpec());
    expect(pts.length).toBeGreaterThan(10);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThanOrEqual(pts[i - 1].x - 1e-12);
      expect(pts[i].r).toBeGreaterThanOrEqual(0);
    }
  });

  it('closes a lathe polygon on the axis', () => {
    const poly = lathePolygon(defaultSpec());
    expect(poly[0][0]).toBe(0);
    expect(poly[poly.length - 1][0]).toBe(0);
    expect(poly.length).toBeGreaterThan(6);
  });
});
