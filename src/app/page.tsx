'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AuthForm from '@/components/AuthForm';
import { Heart } from 'lucide-react';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [checking, setChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sage-100">
            <Heart className="text-sage-500" size={36} />
          </div>
          <h1 className="text-4xl font-serif text-gray-800">EazyLog</h1>
          <p className="text-lg text-gray-500 font-serif">
            A gentle way to track how you feel.
          </p>
        </div>

        {!showAuth && (
          <div className="space-y-4 text-left">
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
        )}

        {showAuth ? (
          <div className="space-y-4">
            <AuthForm />
            <button
              onClick={() => setShowAuth(false)}
              className="text-sm text-gray-400 font-sans underline"
            >
              Back
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="w-full py-4 rounded-2xl bg-sage-500 text-white text-lg
                       font-serif hover:bg-sage-600 transition-all shadow-lg
                       shadow-sage-200 active:scale-[0.98]"
          >
            Get Started
          </button>
        )}

        <p className="text-xs text-gray-400 font-sans">
          EazyLog never diagnoses or gives medical advice.<br />
          Your data is private and encrypted.
        </p>
      </div>
    </main>
  );
}
