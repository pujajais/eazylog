import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/log';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  // ── Recovery links: NEVER exchange server-side. ───────────────────────────
  // Pass the code straight to the reset-password page so the *client* can
  // call exchangeCodeForSession — that's what sets the in-memory auth state
  // that updateUser({ password }) requires. Exchanging server-side sets a
  // cookie but the client auth state stays empty → "reauthentication required".
  if (code && type === 'recovery') {
    return NextResponse.redirect(
      `${baseUrl}/auth/reset-password?code=${encodeURIComponent(code)}`
    );
  }

  const supabase = createServerSupabaseClient();

  // ── Normal PKCE code flow (email confirmation, OAuth) ─────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // ── Token hash flow (older OTP email links) ───────────────────────────────
  if (tokenHash && type) {
    if (type === 'recovery') {
      // Same principle — pass through to reset page
      return NextResponse.redirect(
        `${baseUrl}/auth/reset-password?token_hash=${encodeURIComponent(tokenHash)}`
      );
    }
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'email' | 'magiclink' | 'email_change',
    });
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
