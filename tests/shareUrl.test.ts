import { describe, expect, it } from 'vitest';
import { defaultSpec } from '../src/geometry/defaults';
import { arcasSpec } from '../src/presets/arcas';
import { decodeSpec, encodeSpec, hashForSpec, specFromHash } from '../src/ui/shareUrl';

describe('share URL', () => {
  it('round-trips a default spec through the hash token', () => {
    const spec = defaultSpec();
    const again = decodeSpec(encodeSpec(spec));
    expect(again).toEqual(spec);
  });

  it('parses #s= hashes', () => {
    const spec = arcasSpec('short', true);
    const hash = hashForSpec(spec);
    expect(hash.startsWith('#s=')).toBe(true);
    expect(specFromHash(hash)?.name).toBe(spec.name);
    expect(specFromHash(hash)?.segments).toHaveLength(3);
  });

  it('rejects junk', () => {
    expect(decodeSpec('%%%')).toBeNull();
    expect(specFromHash('#other')).toBeNull();
    expect(specFromHash('')).toBeNull();
  });
});
