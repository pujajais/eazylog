'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'auth') {
      setError('The sign-in link was invalid or has expired. Please try again.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Invalid email or password.');
    } else {
      window.location.href = '/log';
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResetLoading(false);
    setResetDone(true);
  };

  if (forgotMode) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
        <div className="max-w-sm w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage-100">
              <Heart className="text-sage-500" size={24} />
            </div>
            <h1 className="text-2xl font-serif text-gray-800">Reset your password</h1>
            <p className="text-sm text-gray-500 font-sans">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {resetDone ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600 font-sans bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                If that email is registered, you&apos;ll receive a reset link shortly.
              </p>
              <button
                onClick={() => { setForgotMode(false); setResetDone(false); setResetEmail(''); }}
                className="text-sm text-sage-600 font-sans underline"
              >
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white border border-sage-200
                           focus:outline-none focus:ring-2 focus:ring-sage-300
                           text-gray-700 placeholder-gray-400 font-sans text-sm"
              />
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 rounded-xl bg-sage-500 text-white font-sans font-medium
                           hover:bg-sage-600 transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-sm text-gray-400 font-sans underline"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={24} />
          </div>
          <h1 className="text-2xl font-serif text-gray-800">Welcome back</h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-white border border-sage-200
                       focus:outline-none focus:ring-2 focus:ring-sage-300
                       text-gray-700 placeholder-gray-400 font-sans text-sm"
          />
          <div className="space-y-1">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-white border border-sage-200
                         focus:outline-none focus:ring-2 focus:ring-sage-300
                         text-gray-700 placeholder-gray-400 font-sans text-sm"
            />
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setError(''); }}
                className="text-xs text-sage-600 font-sans underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

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
            {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 font-sans">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-sage-600 underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
