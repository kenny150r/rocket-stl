import type { RocketSpec } from '../geometry/types';
import { defaultSpec } from '../geometry/defaults';

const KEY = 'rocket-stl-spec-v1';

export function loadSpec(): RocketSpec {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSpec();
    const parsed = JSON.parse(raw) as RocketSpec;
    if (!parsed?.segments?.length) return defaultSpec();
    return parsed;
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
