export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Custo AI tables live in their own Postgres schema so this project can be shared with other apps. */
export const DB_SCHEMA = 'custo';
export const REMEMBER_COOKIE = 'custo_remember';

type CookieOpts = { maxAge?: number; expires?: Date | string; [k: string]: unknown };

/** When the user chose not to be remembered, auth cookies become browser session cookies. */
export function applyRemember<T extends CookieOpts | undefined>(options: T, remember: boolean): T {
  if (remember || !options) return options;
  const isDeletion = options.maxAge === 0 || (options.expires && new Date(options.expires).getTime() <= Date.now());
  if (isDeletion) return options;
  const { maxAge: _m, expires: _e, ...rest } = options;
  return rest as T;
}
