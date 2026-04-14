import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ExtractionResult } from '@/lib/types';

// Parse severity from a follow-up chip option like "7–8  Very painful" → 7
function parseSeverityOption(option: string): number | null {
  const match = option.match(/^(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export async function POST(request: Request) {
  try {
    const { extraction, answers } = await request.json() as {
      extraction: ExtractionResult;
      answers: Record<string, string>;
    };

    if (!extraction) {
      return NextResponse.json({ error: 'No extraction data' }, { status: 400 });
    }

    // Authenticate via server-side Supabase (reads session from cookie)
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // ── Merge extraction + follow-up answers ─────────────────────────────────

    const bodyRegion =
      answers['body_region'] || extraction.body_region.value || null;
    const specificLocation =
      answers['specific_location'] || extraction.specific_location.value || null;
    const symptomType =
      answers['symptom_type'] || extraction.symptom_type.value || null;
    const pattern =
      answers['pattern'] || extraction.pattern.value || null;

    // Severity: prefer explicit extraction, then parse from chip option
    let severity = extraction.severity.value;
    if (severity === null && answers['severity']) {
      severity = parseSeverityOption(answers['severity']);
    }

    // Pain quality: extraction array OR single chip answer
    const painQuality: string[] =
      extraction.pain_quality.value.length > 0
        ? extraction.pain_quality.value
        : answers['pain_quality']
        ? [answers['pain_quality']]
        : [];

    // Triggers
    const triggers: string[] =
      extraction.triggers.value.length > 0
        ? extraction.triggers.value
        : answers['triggers']
        ? [answers['triggers']]
        : [];

    // Accompanying symptoms
    const accompanying: string[] =
      extraction.accompanying.value.length > 0
        ? extraction.accompanying.value
        : answers['accompanying']
        ? [answers['accompanying']]
        : [];

    const onset = answers['onset'] || extraction.onset.value || null;
    const duration = answers['duration'] || extraction.duration.value || null;

    // is_chronic for existing schema
    const is_chronic = pattern === 'chronic' || pattern === 'recurring';

    // body_locations for existing schema (keep backward compat)
    const body_locations = [bodyRegion, specificLocation]
      .filter(Boolean) as string[];

    // Extra structured data stored in notes as JSON
    // (until a schema migration adds dedicated columns)
    const notesPayload = {
      body_region: bodyRegion,
      specific_location: specificLocation,
      onset,
      duration,
      pain_quality: painQuality,
      pattern,
      accompanying,
    };

    // ── Write to Supabase ────────────────────────────────────────────────────

    const { data: entry, error } = await supabase
      .from('symptom_entries')
      .insert({
        user_id: session.user.id,
        raw_text: extraction.raw_input,
        body_locations: body_locations.length > 0 ? body_locations : ['unspecified'],
        pain_type: symptomType,
        severity,
        triggers,
        is_chronic,
        notes: JSON.stringify(notesPayload),
        source: 'log',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ id: entry.id, success: true });
  } catch (err) {
    console.error('[save-symptom]', err);
    return NextResponse.json(
      { error: 'Failed to save symptom. Please try again.' },
      { status: 500 }
    );
  }
}
