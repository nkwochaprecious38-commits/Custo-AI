import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, REMEMBER_COOKIE, applyRemember, isSupabaseConfigured } from '@/lib/supabase/env';

const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isApp = path.startsWith('/app');

  if (!isSupabaseConfigured) {
    if (isApp) return NextResponse.redirect(new URL('/login?error=config', request.url));
    return response;
  }

  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0';
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, applyRemember(options, remember)));
      },
    },
  });

  // getUser validates the token with the auth server (do not trust getSession alone on the server)
  const { data: { user } } = await supabase.auth.getUser();

  if (isApp && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (user && AUTH_PAGES.includes(path) && !request.nextUrl.searchParams.get('invite')) {
    return NextResponse.redirect(new URL('/app', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/app/:path*', '/login', '/signup', '/reset-password'],
};
