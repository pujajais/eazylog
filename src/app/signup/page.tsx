'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  };

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
      setError(error.message);
    } else {
      setDone(true);
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
            We sent a verification link to <strong>{email}</strong>.<br />
            Click the link to activate your account and start logging.
          </p>
          <p className="text-xs text-gray-400 font-sans">
            Didn&apos;t receive it? Check your spam folder.
          </p>
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
          <h1 className="text-2xl font-serif text-gray-800">Create your account</h1>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                       bg-white border border-gray-200 text-gray-700 font-sans text-sm font-medium
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <button
            onClick={() => handleOAuth('apple')}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                       bg-black text-white font-sans text-sm font-medium
                       hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
              <path d="M13.543 9.564c-.02-2.105 1.722-3.12 1.8-3.172-0.983-1.436-2.51-1.633-3.055-1.655-1.3-.132-2.545.767-3.204.767-.66 0-1.675-.75-2.757-.729-1.413.021-2.72.824-3.446 2.093-1.474 2.553-.378 6.333 1.054 8.404.7 1.013 1.534 2.148 2.624 2.108 1.055-.042 1.455-.679 2.731-.679 1.275 0 1.632.679 2.745.656 1.135-.019 1.85-1.03 2.543-2.049.803-1.17 1.133-2.307 1.15-2.366-.025-.011-2.203-.844-2.226-3.378z" fill="white"/>
              <path d="M11.366 3.19C11.934 2.496 12.32 1.54 12.213.567c-.826.054-1.83.55-2.42 1.244-.531.616-.997 1.605-.872 2.551.921.07 1.863-.468 2.445-1.172z" fill="white"/>
            </svg>
            {oauthLoading === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-sans">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email+Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
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
          <input
            type="password"
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
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
            disabled={loading || !!oauthLoading}
            className="w-full py-3 rounded-xl bg-sage-500 text-white font-sans font-medium
                       hover:bg-sage-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 font-sans">
          Already have an account?{' '}
          <Link href="/login" className="text-sage-600 underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
