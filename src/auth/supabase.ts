import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;

export async function isAllowlisted(email: string | undefined): Promise<boolean> {
  if (!supabase || !email) return false;
  const { data, error } = await supabase
    .from('rocket_stl_allowlist')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
