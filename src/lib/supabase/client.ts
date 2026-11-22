'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, REMEMBER_COOKIE, applyRemember } from './env';

let client: SupabaseClient | null = null;

function readCookies() {
  if (typeof document === 'undefined') return [];
  return document.cookie.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
    const i = c.indexOf('=');
    return { name: decodeURIComponent(c.slice(0, i)), value: decodeURIComponent(c.slice(i + 1)) };
  });
}

function serialize(name: string, value: string, o: Record<string, unknown> = {}) {
  let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${(o.path as string) ?? '/'}`;
  if (typeof o.maxAge === 'number') s += `; Max-Age=${o.maxAge}`;
  if (o.expires) s += `; Expires=${new Date(o.expires as string).toUTCString()}`;
  s += `; SameSite=${(o.sameSite as string) ?? 'Lax'}`;
  if (location.protocol === 'https:') s += '; Secure';
  return s;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => readCookies(),
      setAll: (list) => {
        const remember = readCookies().find((c) => c.name === REMEMBER_COOKIE)?.value !== '0';
        list.forEach(({ name, value, options }) => {
          document.cookie = serialize(name, value, applyRemember(options as Record<string, unknown>, remember));
        });
      },
    },
  });
  return client;
}

export function setRememberPreference(remember: boolean) {
  document.cookie = serialize(REMEMBER_COOKIE, remember ? '1' : '0', remember ? { maxAge: 60 * 60 * 24 * 400 } : {});
}
