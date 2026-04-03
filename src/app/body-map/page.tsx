'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import { Check, Loader2 } from 'lucide-react';

const bodyParts = [
  { id: 'head', label: 'Head', x: 50, y: 6, w: 14, h: 8 },
  { id: 'neck', label: 'Neck', x: 50, y: 14, w: 8, h: 4 },
  { id: 'left-shoulder', label: 'Left Shoulder', x: 32, y: 18, w: 12, h: 6 },
  { id: 'right-shoulder', label: 'Right Shoulder', x: 68, y: 18, w: 12, h: 6 },
  { id: 'chest', label: 'Chest', x: 50, y: 24, w: 20, h: 8 },
  { id: 'upper-back', label: 'Upper Back', x: 50, y: 22, w: 16, h: 6 },
  { id: 'left-arm', label: 'Left Arm', x: 24, y: 30, w: 8, h: 16 },
  { id: 'right-arm', label: 'Right Arm', x: 76, y: 30, w: 8, h: 16 },
  { id: 'abdomen', label: 'Abdomen', x: 50, y: 34, w: 18, h: 8 },
  { id: 'lower-back', label: 'Lower Back', x: 50, y: 40, w: 16, h: 6 },
  { id: 'left-hip', label: 'Left Hip', x: 38, y: 46, w: 10, h: 6 },
  { id: 'right-hip', label: 'Right Hip', x: 62, y: 46, w: 10, h: 6 },
  { id: 'left-hand', label: 'Left Hand', x: 20, y: 48, w: 8, h: 6 },
  { id: 'right-hand', label: 'Right Hand', x: 80, y: 48, w: 8, h: 6 },
  { id: 'left-thigh', label: 'Left Thigh', x: 40, y: 54, w: 10, h: 12 },
  { id: 'right-thigh', label: 'Right Thigh', x: 60, y: 54, w: 10, h: 12 },
  { id: 'left-knee', label: 'Left Knee', x: 40, y: 66, w: 8, h: 6 },
  { id: 'right-knee', label: 'Right Knee', x: 60, y: 66, w: 8, h: 6 },
  { id: 'left-shin', label: 'Left Shin', x: 40, y: 74, w: 8, h: 10 },
  { id: 'right-shin', label: 'Right Shin', x: 60, y: 74, w: 8, h: 10 },
  { id: 'left-foot', label: 'Left Foot', x: 40, y: 88, w: 10, h: 6 },
  { id: 'right-foot', label: 'Right Foot', x: 60, y: 88, w: 10, h: 6 },
];

const painTypes = [
  'Sharp', 'Dull', 'Throbbing', 'Burning', 'Aching',
  'Cramping', 'Tingling', 'Pressure', 'Stiffness',
];

export default function BodyMapPage() {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [painType, setPainType] = useState('');
  const [severity, setSeverity] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = '/';
  }, [supabase.auth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const togglePart = (partId: string) => {
    setSelectedParts(prev =>
      prev.includes(partId) ? prev.filter(p => p !== partId) : [...prev, partId]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    if (selectedParts.length === 0) return;
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const labels = selectedParts.map(id => bodyParts.find(p => p.id === id)?.label || id);

    await supabase.from('symptom_entries').insert({
      user_id: session.user.id,
      raw_text: `Body map: ${labels.join(', ')} - ${painType || 'unspecified'} pain at ${severity}/10`,
      body_locations: labels,
      pain_type: painType.toLowerCase() || null,
      severity,
      triggers: [],
      is_chronic: false,
      source: 'body-map',
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSelectedParts([]);
      setPainType('');
      setSeverity(5);
      setSaved(false);
    }, 2000);
  };

  const severityColor = severity <= 3 ? '#5B8C7B' : severity <= 6 ? '#D4956A' : '#dc2626';

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-2xl font-serif text-gray-800 mb-1">Body Map</h1>
        <p className="text-sm text-gray-400 font-sans mb-4">Tap where it hurts.</p>

        {/* SVG Body */}
        <div className="bg-white rounded-2xl p-4 mb-4">
          <svg viewBox="0 0 100 96" className="w-full max-w-xs mx-auto">
            {/* Body outline */}
            <ellipse cx="50" cy="8" rx="7" ry="8" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.5" />
            <rect x="44" y="15" width="12" height="4" rx="2" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.5" />
            <path d="M36 19 Q32 20 28 30 L24 46 Q22 50 26 50 L32 44 L36 44 Z" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.5" />
            <path d="M64 19 Q68 20 72 30 L76 46 Q78 50 74 50 L68 44 L64 44 Z" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.5" />
            <path d="M36 19 L36 48 Q36 52 40 52 L44 52 Q44 54 44 56 L36 66 L34 74 Q33 84 36 90 L44 90 Q46 84 42 74 L44 68 L48 58 Q50 56 52 58 L56 68 L58 74 Q54 84 56 90 L64 90 Q67 84 66 74 L64 66 L56 56 Q56 54 56 52 L60 52 Q64 52 64 48 L64 19 Z" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="0.5" />

            {/* Clickable hotspots */}
            {bodyParts.map((part) => {
              const isSelected = selectedParts.includes(part.id);
              return (
                <g key={part.id} onClick={() => togglePart(part.id)} className="cursor-pointer">
                  <ellipse
                    cx={part.x}
                    cy={part.y}
                    rx={part.w / 2}
                    ry={part.h / 2}
                    fill={isSelected ? 'rgba(212, 149, 106, 0.6)' : 'transparent'}
                    stroke={isSelected ? '#D4956A' : 'transparent'}
                    strokeWidth="0.8"
                    className="transition-all hover:fill-[rgba(91,140,123,0.2)]"
                  />
                  {isSelected && (
                    <circle cx={part.x} cy={part.y} r="1.5" fill="#D4956A" />
                  )}
                </g>
              );
            })}
          </svg>

          {selectedParts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {selectedParts.map(id => {
                const part = bodyParts.find(p => p.id === id);
                return (
                  <span
                    key={id}
                    className="px-2 py-0.5 bg-terra-50 text-terra-600 rounded-full text-xs font-sans"
                  >
                    {part?.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Pain Type & Severity (show when parts selected) */}
        {selectedParts.length > 0 && !saved && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5">
              <h3 className="font-serif text-gray-700 mb-3">What kind of pain?</h3>
              <div className="flex flex-wrap gap-2">
                {painTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setPainType(painType === type ? '' : type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-sans transition-colors ${
                      painType === type
                        ? 'bg-sage-500 text-white'
                        : 'bg-sage-50 text-sage-600 hover:bg-sage-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5">
              <h3 className="font-serif text-gray-700 mb-3">
                How bad? <span className="text-lg" style={{ color: severityColor }}>{severity}/10</span>
              </h3>
              <input
                type="range"
                min="1"
                max="10"
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sage-500"
              />
              <div className="flex justify-between text-xs text-gray-400 font-sans mt-1">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-sage-500 text-white font-sans
                         font-medium flex items-center justify-center gap-2
                         hover:bg-sage-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 size={18} className="animate-spin" /> Saving...</>
              ) : (
                <><Check size={18} /> Save Entry</>
              )}
            </button>
          </div>
        )}

        {saved && (
          <div className="mt-4 p-6 bg-sage-50 rounded-2xl text-center">
            <Check className="mx-auto text-sage-600 mb-2" size={28} />
            <p className="font-serif text-sage-700">Logged. Take care.</p>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}
