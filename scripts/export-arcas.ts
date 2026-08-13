/**
 * Build Arcas STLs (metres) for ext-aero-3d.
 *
 *   npm run export:arcas
 *
 * Writes rocket-stl/export/ and, if present, the sibling solver case folder.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleRocket } from '../src/geometry/assemble';
import { checkWatertight } from '../src/geometry/quality';
import { writeStlBinary } from '../src/geometry/stl';
import { hasErrors, validateSpec } from '../src/geometry/validate';
import { arcasReference, arcasSpec, type ArcasKind } from '../src/presets/arcas';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const localOut = resolve(root, 'export');
const solverOut = resolve(root, '..', 'ext-aero-3d', 'cases', 'arcas-short');

async function exportOne(kind: ArcasKind, fins: boolean, fileStem: string, dests: string[]) {
  const spec = arcasSpec(kind, fins);
  const issues = validateSpec(spec);
  if (hasErrors(issues)) {
    throw new Error(issues.map((i) => i.message).join('; '));
  }
  console.log(`assembling ${spec.name}…`);
  const result = await assembleRocket(spec);
  const wt = checkWatertight(result.mesh, spec.tessellation.mergeTol);
  if (!wt.ok) {
    throw new Error(`${spec.name} is not watertight: ${wt.message}`);
  }
  const buf = writeStlBinary(result.mesh, spec.name);
  const bytes = Buffer.from(buf);
  for (const dir of dests) {
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `${fileStem}.stl`);
    writeFileSync(path, bytes);
    console.log(`  wrote ${path}  (${wt.nTris} tris, V=${result.volume.toExponential(4)} m³)`);
  }
}

const dests = [localOut, solverOut];
const ref = arcasReference('short');
console.log(
  `Arcas short: L=${ref.length.toFixed(5)} m  d=${(ref.cref).toFixed(5)} m  ` +
    `Sref=${ref.sref.toExponential(6)}  xref=${ref.xref.toFixed(5)} m`,
);

await exportOne('short', false, 'arcas_short_body', dests);
await exportOne('short', true, 'arcas_short', dests);
