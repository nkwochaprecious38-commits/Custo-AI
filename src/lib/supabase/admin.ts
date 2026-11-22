import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

/** Service role client. Server only: bypasses row level security, so every caller must check authorization first. */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
