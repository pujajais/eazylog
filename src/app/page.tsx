'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const timeout = setTimeout(() => setChecking(false), 3000);
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      if (session) {
        window.location.href = '/log';
      } else {
        setChecking(false);
      }
    });
  }, [supabase.auth]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <div className="animate-pulse text-sage-400">
          <Heart size={40} />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream-100">
      <div className="max-w-sm w-full text-center space-y-10">
        {/* Logo & Tagline */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={36} />
          </div>
          <h1 className="text-4xl font-serif text-gray-800">EazyLog</h1>
          <p className="text-lg text-gray-500 font-serif">
            A gentle way to track how you feel.
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full py-4 rounded-2xl bg-sage-500 text-white text-lg
                       font-serif text-center hover:bg-sage-600 transition-all shadow-lg
                       shadow-sage-200 active:scale-[0.98]"
          >
            Sign Up
          </Link>
          <Link
            href="/login"
            className="block w-full py-4 rounded-2xl border-2 border-sage-500 text-sage-600 text-lg
                       font-serif text-center hover:bg-sage-50 transition-all active:scale-[0.98]"
          >
            Log In
          </Link>
        </div>

        {/* Privacy */}
        <p className="text-xs text-gray-400 font-sans">
          Your data stays yours. We never sell or share your health data.
        </p>
      </div>
    </main>
  );
}
