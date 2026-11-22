import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase/server';

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/app';
}

/** Handles email verification, password recovery and invite links. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const fail = () => NextResponse.redirect(new URL('/login?error=link', request.url));

  if (url.searchParams.get('error')) return fail();
  const supabase = await getServerSupabase();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // The email may still have been verified (for example when the link is opened in another browser).
      return next === '/reset-password' ? fail() : NextResponse.redirect(new URL('/login?notice=verified', request.url));
    }
    return NextResponse.redirect(new URL(next, request.url));
  }
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail();
    return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : next, request.url));
  }
  return fail();
}
