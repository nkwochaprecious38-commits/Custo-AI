import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/supabase/env";

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedRoute = path.startsWith("/dashboard");
  if (!isSupabaseConfigured) {
    if (protectedRoute) {
      const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  // "Remember me" unchecked: keep auth cookies as browser session cookies.
  const sessionOnly = request.cookies.get("custo_session_only")?.value === "1";
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => {
          const o = { ...options };
          if (sessionOnly && value) { delete o.maxAge; delete o.expires; }
          response.cookies.set(name, value, o);
        });
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (protectedRoute && !user) {
    const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  if (user && AUTH_PAGES.includes(path)) {
    const url = request.nextUrl.clone(); url.pathname = "/dashboard"; url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"] };
