import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_ANON_KEY, SUPABASE_URL, REMEMBER_COOKIE, applyRemember } from './env';

export async function getServerSupabase() {
  const store = await cookies();
  const remember = store.get(REMEMBER_COOKIE)?.value !== '0';
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, applyRemember(options, remember)));
        } catch {
          // Called from a Server Component: middleware refreshes the session instead.
        }
      },
    },
  });
}
