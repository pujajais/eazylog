'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';
import Link from 'next/link';

// ── States ────────────────────────────────────────────────────────────────────
// null  = still verifying the reset link
// true  = valid recovery session confirmed, show form
// false = link expired / invalid, show error

type ReadyState = null | true | false;

export default function ResetPasswordPage() {
  const [ready, setReady] = useState<ReadyState>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    console.log('[reset-password] page mounted');

    // ── Subscribe to auth state changes FIRST (hash-fragment flow backup) ──
    // Some email clients strip URL params but preserve hash fragments.
    // Supabase implicit flow fires PASSWORD_RECOVERY via this listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[reset-password] onAuthStateChange event:', event, 'session:', session ? 'present' : 'null');
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[reset-password] PASSWORD_RECOVERY event — showing form');
        setReady(true);
      }
    });

    // ── PKCE code exchange (primary path) ─────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const tokenHash = params.get('token_hash');

    console.log('[reset-password] code:', code ? 'present' : 'absent', '| token_hash:', tokenHash ? 'present' : 'absent');

    if (code) {
      console.log('[reset-password] exchanging PKCE code…');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchError }) => {
        console.log('[reset-password] exchangeCodeForSession result — error:', exchError?.message ?? 'none', '| session:', data.session ? 'present' : 'null');
        if (exchError || !data.session) {
          setReady(false);
        } else {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }

    if (tokenHash) {
      console.log('[reset-password] verifying token_hash…');
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error: otpError }) => {
        console.log('[reset-password] verifyOtp result — error:', otpError?.message ?? 'none');
        if (otpError) {
          setReady(false);
        } else {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }

    // ── No code or token_hash — check for an existing session ─────────────
    // (handles the edge case where the user already has a valid recovery session)
    console.log('[reset-password] no code/token — checking existing session…');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[reset-password] getSession result — session:', session ? 'present' : 'null');
      // Only count it if it hasn't resolved via onAuthStateChange already
      setReady((prev) => {
        if (prev !== null) return prev; // already resolved via PASSWORD_RECOVERY
        return !!session ? true : false;
      });
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Password update ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    console.log('[reset-password] calling updateUser…');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    console.log('[reset-password] updateUser result — error:', updateError?.message ?? 'none');

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      // "reauthentication" or weak password → expired session, ask to restart
      if (msg.includes('reauthentication') || msg.includes('weak') || msg.includes('same password')) {
        setError('This reset link has expired. Please request a new one.');
      } else {
        setError('Could not update your password. Please request a new reset link.');
      }
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = '/log'; }, 2000);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────

  // Verifying link
  if (ready === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse text-sage-400">
            <Heart size={40} />
          </div>
          <p className="text-sm text-gray-400 font-sans">Verifying your reset link…</p>
        </div>
      </main>
    );
  }

  // Expired / invalid link
  if (ready === false) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terra-100">
            <Heart className="text-terra-500" size={28} />
          </div>
          <h2 className="text-2xl font-serif text-gray-800">Reset link expired</h2>
          <p className="text-sm text-gray-500 font-sans leading-relaxed">
            This link is no longer valid — reset links expire after 1 hour
            and can only be used once.<br /><br />
            Request a new one and try again.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-4 rounded-2xl bg-sage-500 text-white
                       font-serif text-center hover:bg-sage-600 transition-all"
          >
            Request new reset link
          </Link>
        </div>
      </main>
    );
  }

  // Success
  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={28} />
          </div>
          <h2 className="text-2xl font-serif text-gray-800">Password updated</h2>
          <p className="text-sm text-gray-500 font-sans">Taking you to the app…</p>
        </div>
      </main>
    );
  }

  // Form
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={28} />
          </div>
          <h1 className="text-3xl font-serif text-gray-800">Set a new password</h1>
          <p className="text-sm text-gray-500 font-sans">Choose something you&apos;ll remember.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-sage-200
                       focus:outline-none focus:ring-2 focus:ring-sage-300
                       text-gray-700 placeholder-gray-400 font-sans text-sm"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-sage-200
                       focus:outline-none focus:ring-2 focus:ring-sage-300
                       text-gray-700 placeholder-gray-400 font-sans text-sm"
          />

          {error && (
            <div className="px-4 py-3 rounded-xl bg-terra-50 border border-terra-200 text-terra-600 text-sm font-sans">
              {error}{' '}
              {error.includes('expired') && (
                <Link href="/login" className="underline font-medium">
                  Go back to request one.
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-sage-500 text-white text-lg
                       font-serif hover:bg-sage-600 transition-all shadow-lg
                       shadow-sage-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
