'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Navigation from '@/components/Navigation';
import { Check, Brain, Frown, ArrowDown, BatteryLow, Bone, Smile, Plus, X, Loader2 } from 'lucide-react';
import type { QuickTapPreset } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  brain: Brain,
  frown: Frown,
  'arrow-down': ArrowDown,
  'battery-low': BatteryLow,
  bone: Bone,
  smile: Smile,
};

export default function QuickTapPage() {
  const [presets, setPresets] = useState<QuickTapPreset[]>([]);
  const [tapped, setTapped] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const supabase = createClient();

  const loadPresets = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = '/'; return; }

    const { data } = await supabase
      .from('quick_tap_presets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('sort_order');

    if (data) setPresets(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const handleTap = async (preset: QuickTapPreset) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const severity = preset.label === 'Feeling OK' ? 1 : 5;
    const isOk = preset.label === 'Feeling OK';

    await supabase.from('symptom_entries').insert({
      user_id: session.user.id,
      raw_text: preset.label,
      body_locations: isOk ? [] : [preset.label.toLowerCase()],
      pain_type: isOk ? null : preset.label.toLowerCase(),
      severity,
      triggers: [],
      is_chronic: false,
      source: 'quick-tap',
    });

    setTapped(preset.id);
    setTimeout(() => setTapped(null), 1500);
  };

  const handleAddPreset = async () => {
    if (!newLabel.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from('quick_tap_presets').insert({
      user_id: session.user.id,
      label: newLabel.trim(),
      icon: 'circle',
      color: '#D4956A',
      sort_order: presets.length,
    });

    setNewLabel('');
    setShowAdd(false);
    loadPresets();
  };

  const handleDeletePreset = async (id: string) => {
    await supabase.from('quick_tap_presets').delete().eq('id', id);
    loadPresets();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-sage-400" size={32} />
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-8">
        <h1 className="text-2xl font-serif text-gray-800 mb-1">Quick Tap</h1>
        <p className="text-sm text-gray-400 font-sans mb-6">One tap. Logged. Done.</p>

        <div className="grid grid-cols-2 gap-4">
          {presets.map((preset) => {
            const IconComp = iconMap[preset.icon];
            const isTapped = tapped === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => handleTap(preset)}
                className={`relative p-6 rounded-2xl text-center transition-all active:scale-95 ${
                  isTapped
                    ? 'bg-sage-500 text-white scale-95'
                    : 'bg-white hover:shadow-md text-gray-700'
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                  className="absolute top-2 right-2 p-1 rounded-full opacity-0 hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
                >
                  <X size={14} />
                </button>

                {isTapped ? (
                  <Check size={32} className="mx-auto mb-2" />
                ) : IconComp ? (
                  <IconComp size={32} className="mx-auto mb-2" />
                ) : (
                  <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ backgroundColor: preset.color }} />
                )}
                <p className="font-serif text-lg">{preset.label}</p>
                {isTapped && (
                  <p className="text-xs mt-1 font-sans opacity-80">Logged!</p>
                )}
              </button>
            );
          })}

          {/* Add Custom */}
          {showAdd ? (
            <div className="p-4 rounded-2xl bg-white border-2 border-dashed border-sage-200 flex flex-col items-center justify-center gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Symptom name"
                autoFocus
                className="w-full px-3 py-2 text-sm font-sans rounded-lg border border-sage-200
                           focus:outline-none focus:ring-2 focus:ring-sage-300 text-center"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()}
              />
              <div className="flex gap-2">
                <button onClick={handleAddPreset} className="px-3 py-1 bg-sage-500 text-white rounded-lg text-sm font-sans">
                  Add
                </button>
                <button onClick={() => { setShowAdd(false); setNewLabel(''); }} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-sans text-gray-500">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="p-6 rounded-2xl border-2 border-dashed border-sage-200
                         text-sage-400 hover:border-sage-400 hover:text-sage-500
                         transition-colors flex flex-col items-center justify-center"
            >
              <Plus size={32} className="mb-2" />
              <p className="font-serif">Add Custom</p>
            </button>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
