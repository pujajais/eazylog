'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically;
    // we just need to wait for the auth state to settle.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
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

  if (!ready) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
        <div className="animate-pulse text-sage-400">
          <Heart size={40} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={24} />
          </div>
          <h1 className="text-2xl font-serif text-gray-800">Set a new password</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="New password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-xl bg-white border border-sage-200
                       focus:outline-none focus:ring-2 focus:ring-sage-300
                       text-gray-700 placeholder-gray-400 font-sans text-sm"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white border border-sage-200
                       focus:outline-none focus:ring-2 focus:ring-sage-300
                       text-gray-700 placeholder-gray-400 font-sans text-sm"
          />

          {error && (
            <p className="text-sm text-terra-600 font-sans bg-terra-50 border border-terra-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-sage-500 text-white font-sans font-medium
                       hover:bg-sage-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
