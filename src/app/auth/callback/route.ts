import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/log';

  // Determine the correct base URL — prefer the forwarded host (Vercel/proxy)
  // so redirects work on both localhost and production.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  const supabase = createServerSupabaseClient();

  // PKCE code flow (email confirmation + OAuth + password reset)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${baseUrl}/auth/reset-password`);
      }
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Token hash flow (older email OTP links)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email' | 'recovery' | 'magiclink' | 'email_change',
    });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${baseUrl}/auth/reset-password`);
      }
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // All failed — send back to login with error flag
  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
