import { defaultSpec } from '../geometry/defaults';
import type { RocketSpec } from '../geometry/types';
import { coerceSpec, specFromHash } from './shareUrl';

const KEY = 'rocket-stl-spec-v1';

export function loadSpec(): RocketSpec {
  if (typeof window !== 'undefined') {
    const fromUrl = specFromHash(window.location.hash);
    if (fromUrl) return fromUrl;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSpec();
    return coerceSpec(JSON.parse(raw)) ?? defaultSpec();
  } catch {
    return defaultSpec();
  }
}

export function saveSpec(spec: RocketSpec) {
  try {
    localStorage.setItem(KEY, JSON.stringify(spec));
  } catch {
    /* quota */
  }
}
