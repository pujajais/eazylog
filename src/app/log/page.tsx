'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import {
  Mic, MicOff, AlertTriangle, Check, ChevronLeft,
  Pencil, Loader2, Heart, Phone,
} from 'lucide-react';
import type {
  ExtractionResult, FollowUpQuestion, LogSession, HistoryEntry,
} from '@/lib/types';

// ── State machine ─────────────────────────────────────────────────────────────

type LogState = 'input' | 'loading' | 'emergency' | 'followup' | 'summary' | 'saving' | 'success';

const LOADING_MESSAGES = [
  'Listening to what you said…',
  'Checking your history…',
  'Preparing your questions…',
];

// ── Field label mapping for the summary screen ────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  body_region: 'Location',
  specific_location: 'Specific area',
  symptom_type: 'Symptom',
  severity: 'Severity',
  onset: 'When it started',
  pain_quality: 'How it feels',
  pattern: 'Pattern',
  duration: 'Duration',
  triggers: 'Triggers',
  accompanying: 'Other symptoms',
};

// ── Severity display helper ───────────────────────────────────────────────────

function severityColor(n: number) {
  if (n <= 3) return '#5B8C7B';
  if (n <= 6) return '#D4956A';
  return '#dc2626';
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LogPage() {
  const [logState, setLogState] = useState<LogState>('input');
  const [rawInput, setRawInput] = useState('');
  const [session, setSession] = useState<LogSession | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isWhisper, setIsWhisper] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const supabase = createClient();

  // Auth gate
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) window.location.href = '/';
    });
  }, [supabase.auth]);

  // ── Voice input ─────────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (isWhisper) {
      mediaRecorderRef.current?.stop();
    } else {
      recognitionRef.current?.stop();
    }
    setIsRecording(false);
  }, [isWhisper]);

  const startWhisper = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob);
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          if (res.ok) {
            const { transcript } = await res.json();
            if (transcript) setRawInput((prev) => (prev + ' ' + transcript).trim());
          }
        } catch {
          // silence — fall back gracefully
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsWhisper(true);
    } catch {
      startWebSpeech();
    }
  };

  const startWebSpeech = () => {
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { setError('Voice input not supported. Please type instead.'); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let t = '';
      for (let i = 0; i < event.results.length; i++) t += event.results[i][0].transcript;
      setRawInput(t);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setIsWhisper(false);
  };

  const toggleRecording = () => {
    if (isRecording) { stopRecording(); return; }
    startWhisper(); // tries Whisper first, falls back to Web Speech
  };

  // ── Pipeline ────────────────────────────────────────────────────────────────

  const runPipeline = async () => {
    if (!rawInput.trim()) return;
    setLogState('loading');
    setError('');
    setLoadingStep(0);
    setLoadingMsg(LOADING_MESSAGES[0]);

    try {
      // Step 1 — Extract (Haiku)
      const extractRes = await fetch('/api/extract-symptom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawInput }),
      });
      if (!extractRes.ok) throw new Error('Extraction failed');
      const extraction: ExtractionResult = await extractRes.json();

      // Emergency short-circuit
      if (extraction.is_emergency) {
        setSession({ rawInput, extraction, history: [], followUps: [], historyNote: undefined });
        setLogState('emergency');
        return;
      }

      // Step 2 — History check (Supabase, no AI)
      setLoadingStep(1);
      setLoadingMsg(LOADING_MESSAGES[1]);

      const { data: { session: authSession } } = await supabase.auth.getSession();
      let history: HistoryEntry[] = [];

      if (authSession && extraction.body_region.value) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('symptom_entries')
          .select('id, created_at, body_locations, pain_type, severity')
          .eq('user_id', authSession.user.id)
          .contains('body_locations', [extraction.body_region.value])
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(5);
        history = (data as HistoryEntry[] | null) ?? [];
      }

      // Step 3 — Generate follow-ups (Sonnet)
      setLoadingStep(2);
      setLoadingMsg(LOADING_MESSAGES[2]);

      const followRes = await fetch('/api/generate-followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction, history }),
      });
      if (!followRes.ok) throw new Error('Follow-up generation failed');
      const { questions, history_note } = await followRes.json();

      const newSession: LogSession = {
        rawInput,
        extraction,
        history,
        followUps: questions,
        historyNote: history_note,
      };

      setSession(newSession);
      setAnswers({});
      setCurrentQIdx(0);
      setSelectedOption('');

      setLogState(questions.length > 0 ? 'followup' : 'summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLogState('input');
    }
  };

  // ── Follow-up navigation ─────────────────────────────────────────────────────

  const commitAnswer = (option: string) => {
    if (!session) return;
    const question = session.followUps[currentQIdx];
    const newAnswers = { ...answers, [question.field]: option };
    setAnswers(newAnswers);
    setSelectedOption('');

    // If we're editing a specific field, return to summary after answering
    if (editingField) {
      setEditingField(null);
      setLogState('summary');
      return;
    }

    // Advance to next question or summary
    if (currentQIdx < session.followUps.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      setLogState('summary');
    }
  };

  const skipQuestion = () => {
    if (!session) return;
    setSelectedOption('');

    if (editingField) {
      setEditingField(null);
      setLogState('summary');
      return;
    }

    if (currentQIdx < session.followUps.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      setLogState('summary');
    }
  };

  const goBack = () => {
    if (currentQIdx > 0) {
      setCurrentQIdx((i) => i - 1);
      setSelectedOption('');
    } else {
      setLogState('input');
    }
  };

  // ── Edit a field from summary ────────────────────────────────────────────────

  const editField = (field: string) => {
    if (!session) return;
    const idx = session.followUps.findIndex((q) => q.field === field);
    if (idx === -1) return; // can't edit extracted fields this way
    setCurrentQIdx(idx);
    setSelectedOption(answers[field] ?? '');
    setEditingField(field);
    setLogState('followup');
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!session) return;
    setLogState('saving');

    try {
      const res = await fetch('/api/save-symptom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction: session.extraction, answers }),
      });
      if (!res.ok) throw new Error('Save failed');
      setLogState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setLogState('summary');
    }
  };

  const handleReset = () => {
    setLogState('input');
    setRawInput('');
    setSession(null);
    setAnswers({});
    setCurrentQIdx(0);
    setSelectedOption('');
    setEditingField(null);
    setError('');
  };

  // ── Build summary fields ──────────────────────────────────────────────────────

  function buildSummaryFields() {
    if (!session) return [];
    const { extraction } = session;
    const fields: { field: string; label: string; value: string; canEdit: boolean }[] = [];

    const add = (field: string, rawValue: unknown) => {
      if (!rawValue || (Array.isArray(rawValue) && rawValue.length === 0)) return;
      const value = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue);
      const canEdit = session.followUps.some((q) => q.field === field);
      fields.push({ field, label: FIELD_LABELS[field] ?? field, value, canEdit });
    };

    // Extraction values
    if (extraction.body_region.status === 'extracted') add('body_region', extraction.body_region.value);
    if (extraction.specific_location.status === 'extracted') add('specific_location', extraction.specific_location.value);
    if (extraction.symptom_type.status === 'extracted') add('symptom_type', extraction.symptom_type.value);
    if (extraction.severity.status === 'extracted') add('severity', `${extraction.severity.value}/10`);
    if (extraction.onset.status === 'extracted') add('onset', extraction.onset.value);
    if (extraction.pain_quality.status === 'extracted') add('pain_quality', extraction.pain_quality.value);
    if (extraction.pattern.status === 'extracted') add('pattern', extraction.pattern.value);
    if (extraction.duration.status === 'extracted') add('duration', extraction.duration.value);
    if (extraction.triggers.status === 'extracted') add('triggers', extraction.triggers.value);

    // Follow-up answers (override or add)
    for (const [field, answer] of Object.entries(answers)) {
      const existing = fields.findIndex((f) => f.field === field);
      const formatted = field === 'severity' ? answer.replace(/^(\d+).*$/, '$1/10') : answer;
      if (existing >= 0) {
        fields[existing].value = formatted;
      } else {
        fields.push({ field, label: FIELD_LABELS[field] ?? field, value: formatted, canEdit: true });
      }
    }

    return fields;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      <div className="max-w-lg mx-auto px-4">

        {/* ── INPUT SCREEN ── */}
        {logState === 'input' && (
          <div className="pt-10 space-y-5">
            <div>
              <h1 className="text-2xl font-serif text-gray-800">How are you feeling?</h1>
              <p className="text-sm text-gray-400 font-sans mt-1">
                Speak or type — whatever&apos;s easier right now.
              </p>
            </div>

            {/* Textarea + mic */}
            <div className="relative">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Tell me how you're feeling…"
                rows={5}
                className="w-full p-4 pr-14 rounded-2xl bg-white border border-sage-100
                           focus:outline-none focus:ring-2 focus:ring-sage-300
                           text-gray-700 placeholder-gray-300 font-serif text-lg resize-none"
              />
              <button
                onClick={toggleRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
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
              <p className="text-sm text-red-400 font-sans text-center animate-pulse">
                {isWhisper ? 'Recording… tap mic to stop' : 'Listening… speak naturally'}
              </p>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-terra-50 border border-terra-200 text-terra-600 text-sm font-sans">
                {error}
              </div>
            )}

            <button
              onClick={runPipeline}
              disabled={!rawInput.trim()}
              className="w-full py-4 rounded-2xl bg-sage-500 text-white text-lg
                         font-serif hover:bg-sage-600 transition-all shadow-lg shadow-sage-200
                         active:scale-[0.98] disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {/* ── LOADING SCREEN ── */}
        {logState === 'loading' && (
          <div className="pt-32 flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center">
                <Heart className="text-sage-400" size={28} />
              </div>
              <Loader2
                className="absolute -inset-1 text-sage-300 animate-spin"
                size={72}
                strokeWidth={1}
              />
            </div>
            <p className="text-gray-500 font-sans text-sm">{loadingMsg}</p>
            {/* Subtle step dots */}
            <div className="flex gap-2">
              {LOADING_MESSAGES.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i <= loadingStep ? 'bg-sage-400' : 'bg-sage-100'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── EMERGENCY SCREEN ── */}
        {logState === 'emergency' && session && (
          <div className="pt-10 space-y-6">
            <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-300 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={28} />
                <div>
                  <p className="font-serif font-bold text-red-700 text-xl leading-snug">
                    {session.extraction.emergency_type === 'mental_health'
                      ? 'You are not alone'
                      : 'This may be a medical emergency'}
                  </p>
                  <p className="text-red-600 font-sans text-sm mt-2 leading-relaxed">
                    {session.extraction.emergency_message}
                  </p>
                </div>
              </div>

              <a
                href={
                  session.extraction.emergency_type === 'mental_health'
                    ? 'tel:988'
                    : 'tel:911'
                }
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl
                           bg-red-500 text-white font-sans font-medium text-lg
                           hover:bg-red-600 transition-colors"
              >
                <Phone size={20} />
                {session.extraction.emergency_type === 'mental_health'
                  ? 'Call / Text 988'
                  : 'Call 911'}
              </a>
            </div>

            <button
              onClick={() => setLogState('summary')}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-500
                         font-sans text-sm hover:bg-gray-50 transition-colors"
            >
              I understand — continue logging anyway
            </button>
          </div>
        )}

        {/* ── FOLLOW-UP SCREEN ── */}
        {logState === 'followup' && session && session.followUps[currentQIdx] && (() => {
          const question: FollowUpQuestion = session.followUps[currentQIdx];
          const progress = ((currentQIdx + 1) / session.followUps.length) * 100;

          return (
            <div className="pt-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={goBack}
                  className="p-2 rounded-full hover:bg-sage-50 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-400 font-sans mb-1">
                    <span>{editingField ? 'Edit answer' : `Question ${currentQIdx + 1} of ${session.followUps.length}`}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-sage-100 rounded-full">
                    <div
                      className="h-full bg-sage-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-1">
                <h2 className="text-xl font-serif text-gray-800">{question.text}</h2>
                {session.historyNote && currentQIdx === 0 && (
                  <p className="text-xs text-sage-600 font-sans bg-sage-50 px-3 py-1.5 rounded-lg inline-block">
                    {session.historyNote}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const isSelected =
                    selectedOption === option || answers[question.field] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        setSelectedOption(option);
                        // Auto-advance after brief selection flash
                        setTimeout(() => commitAnswer(option), 220);
                      }}
                      className={`px-4 py-3 rounded-xl text-sm font-sans transition-all
                        active:scale-95 ${
                          isSelected
                            ? 'bg-sage-500 text-white shadow-md shadow-sage-200'
                            : 'bg-white border border-sage-200 text-gray-700 hover:border-sage-400 hover:bg-sage-50'
                        }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Skip for optional */}
              {!question.required && (
                <button
                  onClick={skipQuestion}
                  className="w-full text-sm text-gray-400 font-sans py-2 hover:text-gray-600 transition-colors"
                >
                  Skip this question
                </button>
              )}
            </div>
          );
        })()}

        {/* ── SUMMARY SCREEN ── */}
        {logState === 'summary' && session && (() => {
          const fields = buildSummaryFields();
          const severityAnswer = answers['severity'] || (
            session.extraction.severity.status === 'extracted'
              ? `${session.extraction.severity.value}/10`
              : null
          );
          const severityNum = severityAnswer
            ? parseInt(String(severityAnswer).match(/^(\d+)/)?.[1] ?? '0')
            : null;

          return (
            <div className="pt-8 space-y-5">
              <div>
                <h2 className="text-2xl font-serif text-gray-800">Here&apos;s what I captured</h2>
                {session.historyNote && (
                  <p className="text-xs text-sage-600 font-sans mt-1">{session.historyNote}</p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-terra-50 border border-terra-200 text-terra-600 text-sm font-sans">
                  {error}
                </div>
              )}

              {/* Fields list */}
              <div className="space-y-2">
                {fields.map(({ field, label, value, canEdit }) => (
                  <div
                    key={field}
                    className="flex items-center justify-between p-4 bg-white rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-sans">{label}</p>
                      {field === 'severity' && severityNum ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-2 w-28 bg-gray-100 rounded-full">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(severityNum / 10) * 100}%`,
                                backgroundColor: severityColor(severityNum),
                              }}
                            />
                          </div>
                          <span className="text-sm font-sans text-gray-700">{severityNum}/10</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 font-sans mt-0.5 truncate">{value}</p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => editField(field)}
                        className="ml-3 p-1.5 text-gray-300 hover:text-sage-500 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="p-4 bg-white rounded-xl text-sm text-gray-400 font-sans text-center">
                    Only the raw text was captured. Tap Save to log it.
                  </div>
                )}
              </div>

              {/* Unanswered required fields warning */}
              {session.followUps.some(
                (q) => q.required && !answers[q.field] &&
                  session.extraction[q.field as keyof ExtractionResult] &&
                  (session.extraction[q.field as keyof ExtractionResult] as { status: string }).status === 'missing'
              ) && (
                <p className="text-xs text-terra-500 font-sans text-center">
                  Some important fields are still missing — you can save anyway or go back to answer them.
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full py-4 rounded-2xl bg-sage-500 text-white text-lg
                             font-serif hover:bg-sage-600 transition-all shadow-lg shadow-sage-200
                             active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Check size={20} /> Save
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-400
                             font-sans text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── SAVING SCREEN ── */}
        {logState === 'saving' && (
          <div className="pt-32 flex flex-col items-center gap-4">
            <Loader2 className="text-sage-400 animate-spin" size={40} />
            <p className="text-gray-400 font-sans text-sm">Saving…</p>
          </div>
        )}

        {/* ── SUCCESS SCREEN ── */}
        {logState === 'success' && (
          <div className="pt-24 flex flex-col items-center gap-6 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-sage-100 flex items-center justify-center">
              <Check className="text-sage-500" size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-serif text-gray-800">Logged.</h2>
              <p className="text-gray-400 font-sans text-sm mt-1">Take care of yourself.</p>
            </div>
            <div className="space-y-3 w-full max-w-xs">
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-xl bg-sage-500 text-white font-sans
                           font-medium hover:bg-sage-600 transition-colors"
              >
                Log another
              </button>
              <button
                onClick={() => { window.location.href = '/dashboard'; }}
                className="w-full py-3.5 rounded-xl border border-sage-200 text-sage-600
                           font-sans font-medium hover:bg-sage-50 transition-colors"
              >
                View my timeline
              </button>
            </div>
          </div>
        )}

      </div>
      <Navigation />
    </div>
  );
}
