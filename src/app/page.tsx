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

        {/* Feature Cards */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
            <span className="text-2xl">🎙️</span>
            <div>
              <p className="font-serif text-gray-700 font-medium">Speak, don&apos;t type</p>
              <p className="text-sm text-gray-500 font-sans">Voice-to-text when typing hurts too much.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-serif text-gray-700 font-medium">One-tap logging</p>
              <p className="text-sm text-gray-500 font-sans">Log common symptoms with a single tap.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-serif text-gray-700 font-medium">Doctor-ready reports</p>
              <p className="text-sm text-gray-500 font-sans">AI summarizes your history into clean reports.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/signup"
          className="block w-full py-4 rounded-2xl bg-sage-500 text-white text-lg
                     font-serif text-center hover:bg-sage-600 transition-all shadow-lg
                     shadow-sage-200 active:scale-[0.98]"
        >
          Get Started
        </Link>

        <p className="text-xs text-gray-400 font-sans text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-sage-600 underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
