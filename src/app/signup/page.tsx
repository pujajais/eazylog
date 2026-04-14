'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const supabase = createClient();

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Try logging in instead.');
      } else {
        setError(error.message);
      }
    } else {
      setDone(true);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResendLoading(false);
    if (error) {
      setResendMsg('Could not resend. Please wait a minute and try again.');
    } else {
      setResendMsg('Sent! Check your inbox (and spam folder).');
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={28} />
          </div>
          <h2 className="text-2xl font-serif text-gray-800">Check your email</h2>
          <p className="text-gray-500 font-sans text-sm leading-relaxed">
            We sent a verification link to{' '}
            <strong className="text-gray-700">{email}</strong>.<br />
            Click the link to activate your account.
          </p>

          <div className="bg-white border border-sage-100 rounded-xl px-4 py-4 text-left space-y-2">
            <p className="text-xs font-sans text-gray-500 font-medium">Didn&apos;t get it?</p>
            <ul className="text-xs text-gray-400 font-sans space-y-1 list-disc list-inside">
              <li>Check your <strong>spam / junk</strong> folder</li>
              <li>Make sure <strong>{email}</strong> is correct</li>
              <li>Wait 1–2 minutes — it can be slow</li>
            </ul>
          </div>

          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       border border-sage-300 text-sage-600 font-sans text-sm font-medium
                       hover:bg-sage-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={resendLoading ? 'animate-spin' : ''} />
            {resendLoading ? 'Resending…' : 'Resend verification email'}
          </button>

          {resendMsg && (
            <p className={`text-xs font-sans ${resendMsg.startsWith('Sent') ? 'text-sage-600' : 'text-terra-500'}`}>
              {resendMsg}
            </p>
          )}

          <p className="text-xs text-gray-400 font-sans">
            Wrong email?{' '}
            <Link href="/signup" onClick={() => setDone(false)} className="text-sage-600 underline">
              Start over
            </Link>
          </p>
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
          <h1 className="text-3xl font-serif text-gray-800">Create your account</h1>
          <p className="text-sm text-gray-500 font-sans">Start tracking how you feel, gently.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-xl bg-white border border-sage-200
                         focus:outline-none focus:ring-2 focus:ring-sage-300
                         text-gray-700 placeholder-gray-400 font-sans text-sm"
            />
            <input
              type="password"
              placeholder="Password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3.5 rounded-xl bg-white border border-sage-200
                         focus:outline-none focus:ring-2 focus:ring-sage-300
                         text-gray-700 placeholder-gray-400 font-sans text-sm"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-terra-50 border border-terra-200 text-terra-600 text-sm font-sans">
              {error}
              {error.includes('already exists') && (
                <> <Link href="/login" className="underline font-medium">Log in instead.</Link></>
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
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 font-sans">
          Already have an account?{' '}
          <Link href="/login" className="text-sage-600 underline font-medium">Log in</Link>
        </p>
        <p className="text-center text-xs text-gray-400 font-sans">
          Your data stays yours. We never sell or share your health data.
        </p>
      </div>
    </main>
  );
}
