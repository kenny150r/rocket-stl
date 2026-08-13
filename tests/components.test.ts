import { describe, expect, it } from 'vitest';
import { assembleRocket } from '../src/geometry/assemble';
import {
  atomicComponents,
  classifyComponents,
  componentsSidecar,
  defaultLabelGroups,
  ensureLabelGroups,
} from '../src/geometry/components';
import { defaultSpec } from '../src/geometry/defaults';
import { readStlBinaryAttributes, writeStlBinary } from '../src/geometry/stl';
import { arcasSpec } from '../src/presets/arcas';

describe('label groups', () => {
  it('assigns atomic keys and default groups for Arcas', () => {
    const spec = arcasSpec('short', true);
    const atoms = atomicComponents(spec);
    const keys = atoms.map((a) => a.key);
    expect(atoms.every((a) => a.id >= 1)).toBe(true);
    expect(keys.filter((k) => k.startsWith('seg.'))).toHaveLength(3);
    expect(keys).toContain('base');
    expect(keys.filter((k) => k.startsWith('fin.'))).toHaveLength(4);

    const groups = defaultLabelGroups(spec);
    const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
    expect(byId.base.members).toEqual(['base']);
    expect(byId.fins.members).toEqual(keys.filter((k) => k.startsWith('fin.')));
    expect(byId.body.members).toEqual(keys.filter((k) => k.startsWith('seg.')));
    expect(byId.forebody.members.sort()).toEqual(keys.filter((k) => k !== 'base').sort());

    const json = JSON.parse(componentsSidecar(spec)) as {
      components: { id: number; key: string }[];
      groups: { key: string; members: string[] }[];
    };
    expect(json.components.map((c) => c.key)).toEqual(keys);
    expect(json.groups.find((g) => g.key === 'forebody')?.members).not.toContain('base');
  });

  it('keeps custom groups when the stack changes', () => {
    const spec = ensureLabelGroups({
      ...defaultSpec(),
      labelGroups: [{ id: 'custom', name: 'Nose+base', members: ['base'] }],
    });
    const noseKey = `seg.${spec.segments[0].id}`;
    spec.labelGroups = spec.labelGroups?.map((g) =>
      g.id === 'custom' ? { ...g, members: ['base', noseKey] } : g,
    );
    const next = ensureLabelGroups({
      ...spec,
      segments: spec.segments.slice(0, 1),
      finSets: [],
    });
    const custom = next.labelGroups?.find((g) => g.id === 'custom');
    expect(custom?.members.sort()).toEqual(['base', noseKey].sort());
    expect(next.labelGroups?.find((g) => g.id === 'fins')?.members).toEqual([]);
  });
});

describe('classifyComponents', () => {
  it('tags every Arcas-short triangle and partitions base vs forebody', async () => {
    const spec = arcasSpec('short', true);
    spec.tessellation.nTheta = 24;
    spec.tessellation.axialPerSegment = 10;
    spec.tessellation.finSectionSamples = 8;
    const mesh = (await assembleRocket(spec)).mesh;
    const ids = classifyComponents(mesh, spec);
    const n = mesh.indices.length / 3;
    expect(ids.length).toBe(n);
    expect(Array.from(ids).every((id) => id > 0)).toBe(true);

    const atoms = atomicComponents(spec);
    const byKey = Object.fromEntries(atoms.map((a) => [a.key, a.id]));
    const used = new Set(Array.from(ids));
    const finIds = atoms.filter((a) => a.key.startsWith('fin.')).map((a) => a.id);
    expect(finIds).toHaveLength(4);
    for (const id of finIds) expect(used.has(id)).toBe(true);
    expect(used.has(byKey.base)).toBe(true);

    const buf = writeStlBinary(mesh, 'arcas', ids);
    expect(Array.from(readStlBinaryAttributes(buf))).toEqual(Array.from(ids));

    const sidecar = JSON.parse(componentsSidecar(spec)) as {
      groups: { key: string; members: string[] }[];
    };
    const fore = new Set(sidecar.groups.find((g) => g.key === 'forebody')?.members ?? []);
    const base = new Set(sidecar.groups.find((g) => g.key === 'base')?.members ?? []);
    const keyOf = new Map(atoms.map((a) => [a.id, a.key]));
    for (const id of ids) {
      const key = keyOf.get(id);
      expect(key).toBeTruthy();
      expect(fore.has(key!) !== base.has(key!)).toBe(true);
    }
  }, 60_000);
});
