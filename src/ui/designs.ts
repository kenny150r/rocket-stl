import { supabase } from '../auth/supabase';
import type { RocketSpec } from '../geometry/types';
import { coerceSpec } from './shareUrl';

export type SavedDesign = {
  id: string;
  name: string;
  spec: RocketSpec;
  updatedAt: string;
};

const LOCAL_KEY = 'rocket-stl-library-v1';

export function designsAreCloud(): boolean {
  return Boolean(supabase);
}

function designName(spec: RocketSpec): string {
  const n = spec.name.trim();
  return n || 'untitled';
}

function fromRow(row: { id: string; name: string; spec: unknown; updated_at: string }): SavedDesign | null {
  const spec = coerceSpec(row.spec);
  if (!spec) return null;
  return { id: row.id, name: row.name, spec, updatedAt: row.updated_at };
}

function readLocal(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDesign[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d) => d && d.id && d.spec);
  } catch {
    return [];
  }
}

function writeLocal(rows: SavedDesign[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

export async function listDesigns(): Promise<SavedDesign[]> {
  if (!supabase) {
    return readLocal().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const { data, error } = await supabase
    .from('rocket_stl_designs')
    .select('id, name, spec, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow).filter((d): d is SavedDesign => Boolean(d));
}

export async function saveDesign(spec: RocketSpec): Promise<SavedDesign> {
  const name = designName(spec);
  const named = { ...spec, name };
  if (!supabase) {
    const rows = readLocal();
    const existing = rows.find((d) => d.name === name);
    const row: SavedDesign = {
      id: existing?.id ?? crypto.randomUUID(),
      name,
      spec: named,
      updatedAt: new Date().toISOString(),
    };
    writeLocal([row, ...rows.filter((d) => d.id !== row.id && d.name !== name)]);
    return row;
  }
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!auth.user) throw new Error('Sign in to save designs.');
  const { data, error } = await supabase
    .from('rocket_stl_designs')
    .upsert({ user_id: auth.user.id, name, spec: named }, { onConflict: 'user_id,name' })
    .select('id, name, spec, updated_at')
    .single();
  if (error) throw error;
  const row = fromRow(data);
  if (!row) throw new Error('Saved design could not be read back.');
  return row;
}

export async function deleteDesign(id: string): Promise<void> {
  if (!supabase) {
    writeLocal(readLocal().filter((d) => d.id !== id));
    return;
  }
  const { error } = await supabase.from('rocket_stl_designs').delete().eq('id', id);
  if (error) throw error;
}
