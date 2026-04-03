'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import { Mic, MicOff, Send, Check, Loader2, AlertTriangle } from 'lucide-react';
import type { ParsedSymptom } from '@/lib/types';

export default function LogPage() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedSymptom | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const supabase = createClient();

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = '/';
  }, [supabase.auth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser. Try Chrome or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setParsed(null);

    try {
      const res = await fetch('/api/parse-symptom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');
      setParsed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { data: entry, error: insertError } = await supabase
        .from('symptom_entries')
        .insert({
          user_id: session.user.id,
          raw_text: text,
          body_locations: parsed.body_locations,
          pain_type: parsed.pain_type,
          severity: parsed.severity,
          triggers: parsed.triggers,
          is_chronic: parsed.is_chronic,
          notes: parsed.summary,
          source: 'log',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Save follow-up answers
      const answeredFollowUps = Object.entries(followUpAnswers)
        .filter(([, answer]) => answer.trim())
        .map(([idx, answer]) => ({
          entry_id: entry.id,
          question: parsed.follow_up_questions[parseInt(idx)],
          answer,
        }));

      if (answeredFollowUps.length > 0) {
        await supabase.from('follow_ups').insert(answeredFollowUps);
      }

      setSaved(true);
      setTimeout(() => {
        setText('');
        setParsed(null);
        setFollowUpAnswers({});
        setSaved(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-2xl font-serif text-gray-800 mb-1">How are you feeling?</h1>
        <p className="text-sm text-gray-400 font-sans mb-6">Speak or type — whatever&apos;s easier right now.</p>

        {/* Input Area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell me how you're feeling..."
            rows={5}
            className="w-full p-4 pr-14 rounded-2xl bg-white border border-sage-100
                       focus:outline-none focus:ring-2 focus:ring-sage-300
                       text-gray-700 placeholder-gray-300 font-serif text-lg resize-none"
          />
          <button
            onClick={toggleRecording}
            className={`absolute right-3 top-3 p-3 rounded-full transition-all ${
              isRecording
                ? 'bg-red-100 text-red-500'
                : 'bg-sage-50 text-sage-500 hover:bg-sage-100'
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-200 animate-pulse-ring" />
            )}
            {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        </div>

        {isRecording && (
          <p className="text-sm text-red-400 font-sans mt-2 text-center animate-pulse">
            Listening... speak naturally
          </p>
        )}

        {/* Submit Button */}
        {!parsed && (
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="mt-4 w-full py-3.5 rounded-xl bg-sage-500 text-white font-sans
                       font-medium flex items-center justify-center gap-2
                       hover:bg-sage-600 transition-colors disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Understanding...</>
            ) : (
              <><Send size={18} /> Log This</>
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-sans">
            {error}
          </div>
        )}

        {/* Emergency Warning */}
        {parsed?.is_emergency && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border-2 border-red-300 flex items-start gap-3">
            <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={24} />
            <div>
              <p className="font-serif font-bold text-red-700 text-lg">
                {parsed.emergency_message || 'If you are experiencing a medical emergency, please call 911 immediately.'}
              </p>
              <a href="tel:911" className="mt-2 inline-block px-4 py-2 bg-red-500 text-white rounded-lg font-sans text-sm">
                Call 911
              </a>
            </div>
          </div>
        )}

        {/* Parsed Result */}
        {parsed && !saved && (
          <div className="mt-6 space-y-4">
            <div className="p-5 bg-white rounded-2xl border border-sage-100 space-y-3">
              <h2 className="font-serif text-lg text-gray-800">Here&apos;s what I understood:</h2>

              <div className="space-y-2 text-sm font-sans">
                {parsed.body_locations.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Location:</span>
                    <span className="text-gray-700">{parsed.body_locations.join(', ')}</span>
                  </div>
                )}
                {parsed.pain_type && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Type:</span>
                    <span className="text-gray-700">{parsed.pain_type}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Severity:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-[120px]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(parsed.severity / 10) * 100}%`,
                          backgroundColor: parsed.severity <= 3 ? '#5B8C7B' : parsed.severity <= 6 ? '#D4956A' : '#dc2626',
                        }}
                      />
                    </div>
                    <span className="text-gray-700">{parsed.severity}/10</span>
                  </div>
                </div>
                {parsed.triggers.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">Triggers:</span>
                    <span className="text-gray-700">{parsed.triggers.join(', ')}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 shrink-0">Pattern:</span>
                  <span className="text-gray-700">{parsed.is_chronic ? 'Chronic / recurring' : 'Acute / new'}</span>
                </div>
              </div>

              <p className="text-gray-500 text-sm font-serif italic mt-3">&ldquo;{parsed.summary}&rdquo;</p>
            </div>

            {/* Follow-up Questions */}
            {parsed.follow_up_questions.length > 0 && (
              <div className="p-5 bg-sage-50 rounded-2xl space-y-3">
                <h3 className="font-serif text-gray-700">A couple quick follow-ups:</h3>
                {parsed.follow_up_questions.map((q, i) => (
                  <div key={i}>
                    <p className="text-sm font-sans text-gray-600 mb-1">{q}</p>
                    <input
                      type="text"
                      value={followUpAnswers[i] || ''}
                      onChange={(e) => setFollowUpAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-sage-200
                                 text-sm font-sans text-gray-700 focus:outline-none focus:ring-2 focus:ring-sage-300"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Button */}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-sage-500 text-white font-sans
                         font-medium flex items-center justify-center gap-2
                         hover:bg-sage-600 transition-colors disabled:opacity-40"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Saving...</>
              ) : (
                <><Check size={18} /> That&apos;s right, save it</>
              )}
            </button>
          </div>
        )}

        {/* Saved Confirmation */}
        {saved && (
          <div className="mt-6 p-6 bg-sage-50 rounded-2xl text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sage-100 mb-3">
              <Check className="text-sage-600" size={24} />
            </div>
            <p className="font-serif text-lg text-sage-700">Logged. Take care of yourself.</p>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
