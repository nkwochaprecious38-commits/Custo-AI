import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, DB_SCHEMA } from './env';

/** Service role client. Server only: bypasses row level security, so every caller must check authorization first. */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { db: { schema: DB_SCHEMA }, auth: { persistSession: false, autoRefreshToken: false } });
}
