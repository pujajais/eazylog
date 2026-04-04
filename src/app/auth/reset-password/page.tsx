'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // null = still checking, true = ready, false = no valid session
  const [ready, setReady] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // In PKCE flow the server already exchanged the code and set the session
    // cookie before redirecting here — so getSession() will return the recovery
    // session immediately. We don't need to wait for PASSWORD_RECOVERY event.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
  }, [supabase.auth]);

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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = '/log'; }, 2000);
    }
  };

  // Still checking session
  if (ready === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-100">
        <div className="animate-pulse text-sage-400">
          <Heart size={40} />
        </div>
      </main>
    );
  }

  // No valid session — link expired or accessed directly
  if (ready === false) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-terra-100">
            <Heart className="text-terra-500" size={28} />
          </div>
          <h2 className="text-2xl font-serif text-gray-800">Link expired</h2>
          <p className="text-sm text-gray-500 font-sans">
            This password reset link is no longer valid.<br />
            Please request a new one.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-sage-500 text-white font-sans text-sm font-medium hover:bg-sage-600 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  // Password updated success
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
              {error}
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
