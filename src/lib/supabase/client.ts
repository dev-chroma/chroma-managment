import { createBrowserClient } from '@supabase/ssr';

export const normalizeSupabaseUrl = (url?: string) => {
  if (!url) return '';
  let cleaned = url.replace(/["']/g, '').trim();
  if (!cleaned || cleaned.includes('your-project.supabase.co')) return '';
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}.supabase.co`;
  }
  return cleaned;
};

export const normalizeSupabaseKey = (key?: string) => {
  if (!key) return '';
  return key.replace(/["']/g, '').trim();
};

export const isSupabaseConfigured = () => {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Boolean(url && key && !key.includes('your-anon-key'));
};

export const createClient = () => {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
