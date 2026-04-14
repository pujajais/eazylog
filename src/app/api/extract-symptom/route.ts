import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { ExtractionResult, ExtractionField } from '@/lib/types';

const IS_DEMO = !process.env.ANTHROPIC_API_KEY;

// ── Emergency detection (regex, no AI) ────────────────────────────────────────
// These are checked before any AI call. Pattern order = priority.

const EMERGENCY_PATTERNS = [
  {
    regex: /chest\s*(pain|tight(ness)?|pressure|heaviness|discomfort)/i,
    type: 'chest_pain',
    message:
      'Chest pain or tightness can be a sign of a heart attack. Please call 911 immediately.',
  },
  {
    regex:
      /(can'?t|cannot|difficulty|trouble|shortness of|hard to)\s*(breathe|breathing)/i,
    type: 'breathing',
    message: 'Difficulty breathing requires immediate medical attention. Call 911 now.',
  },
  {
    regex:
      /stroke|(face|arm)\s*(droop|weak|numb)|(slurred|sudden loss of)\s*speech|can'?t speak/i,
    type: 'stroke',
    message:
      'These could be signs of a stroke. Act FAST — call 911 immediately. Time is critical.',
  },
  {
    regex:
      /worst\s*(headache|head pain)|sudden\s*(severe|extreme|worst|splitting)\s*headache|thunderclap headache/i,
    type: 'sudden_headache',
    message:
      'A sudden severe headache can signal a brain bleed. Call 911 immediately.',
  },
  {
    regex: /(suicid|self[- ]?harm|hurt\s*myself|end\s*(my life|it all)|kill\s*myself)/i,
    type: 'mental_health',
    message:
      'You are not alone. Please call or text 988 (Suicide & Crisis Lifeline) right now.',
  },
];

function checkEmergency(text: string) {
  for (const { regex, type, message } of EMERGENCY_PATTERNS) {
    if (regex.test(text)) {
      return { is_emergency: true, emergency_type: type, emergency_message: message };
    }
  }
  return { is_emergency: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function missing<T>(val: T): ExtractionField<T> {
  return { value: val, status: 'missing' };
}
function extracted<T>(val: T): ExtractionField<T> {
  return { value: val, status: 'extracted' };
}

function emptyResult(raw_input: string): ExtractionResult {
  return {
    body_region: missing(null),
    specific_location: missing(null),
    symptom_type: missing(null),
    severity: missing(null),
    onset: missing(null),
    pain_quality: missing([]),
    pattern: missing(null),
    duration: missing(null),
    triggers: missing([]),
    accompanying: missing([]),
    raw_input,
    is_emergency: false,
  };
}

// ── Demo/mock extraction (no API key) ─────────────────────────────────────────

function mockExtract(text: string): ExtractionResult {
  const result = emptyResult(text);
  const emergency = checkEmergency(text);
  if (emergency.is_emergency) return { ...result, ...emergency };

  const bodyPairs: [RegExp, string][] = [
    [/\bhead\b|\bheadache\b|\bmigraine\b/i, 'head'],
    [/\bneck\b/i, 'neck'],
    [/\bshoulder\b/i, 'shoulder'],
    [/\bchest\b/i, 'chest'],
    [/\b(lower |upper )?back\b|\bspine\b/i, 'back'],
    [/\bstomach\b|\babdomen\b|\bbelly\b/i, 'abdomen'],
    [/\bhip\b/i, 'hip'],
    [/\bknee\b/i, 'knee'],
    [/\b(leg|thigh|calf)\b/i, 'leg'],
    [/\b(foot|feet)\b|\bankle\b/i, 'foot'],
    [/\b(wrist|hand|finger)\b/i, 'hand'],
    [/\b(arm|elbow)\b/i, 'arm'],
    [/\beye\b|\bvision\b/i, 'eye'],
    [/\bear\b|\bhearing\b/i, 'ear'],
    [/\bthroat\b|\bjaw\b/i, 'throat'],
  ];
  for (const [rx, region] of bodyPairs) {
    if (rx.test(text)) { result.body_region = extracted(region); break; }
  }

  const symptomPairs: [RegExp, string][] = [
    [/\bheadache\b|\bmigraine\b/i, 'headache'],
    [/\bpain\b|\bhurts?\b|\baches?\b|\bsore\b/i, 'pain'],
    [/\bnausea\b|\bnauseous\b|\bsick to my stomach\b/i, 'nausea'],
    [/\bdizzy\b|\bdizziness\b|\bspinning\b/i, 'dizziness'],
    [/\bfatigue\b|\btired\b|\bexhausted\b|\bweak\b/i, 'fatigue'],
    [/\bitch(ing|y)?\b/i, 'itching'],
    [/\bburn(ing)?\b/i, 'burning'],
    [/\btingl(e|ing)\b|\bnumb(ness)?\b/i, 'tingling'],
    [/\bswoll?en\b|\bswelling\b/i, 'swelling'],
    [/\bstiff(ness)?\b/i, 'stiffness'],
    [/\bcramp(ing)?\b/i, 'cramping'],
    [/\bpressure\b/i, 'pressure'],
  ];
  for (const [rx, type] of symptomPairs) {
    if (rx.test(text)) { result.symptom_type = extracted(type); break; }
  }

  // Severity — only explicit numbers or intensity words
  const numMatch = text.match(/(\d+)\s*(?:out\s*of\s*10|\/10)/i);
  if (numMatch) {
    result.severity = extracted(Math.min(10, Math.max(1, parseInt(numMatch[1]))));
  } else if (/\bunbearable\b|\bexcruciating\b/i.test(text)) {
    result.severity = extracted(10);
  } else if (/\bsevere\b|\bterrible\b|\bhorrible\b|\bawful\b/i.test(text)) {
    result.severity = extracted(8);
  } else if (/\bmoderate\b|\bpretty bad\b/i.test(text)) {
    result.severity = extracted(5);
  } else if (/\bmild\b|\bslight\b|\ba little\b|\bminor\b/i.test(text)) {
    result.severity = extracted(3);
  }

  // Onset — try multiple patterns
  const onsetMatch =
    text.match(/(?:since|started|began)\s+(this morning|this afternoon|this evening|last night|yesterday|today)/i) ??
    text.match(/(\d+)\s+(hour|day|week|month)s?\s+ago/i) ??
    text.match(/for\s+(?:the\s+)?(?:last\s+)?(\d+\s+(?:hour|day|week|month)s?)/i);
  if (onsetMatch) result.onset = extracted(onsetMatch[0]);

  // Duration
  const durMatch = text.match(/for\s+(\d+\s+(?:hour|day|week|month|year)s?)/i);
  if (durMatch) result.duration = extracted(durMatch[1]);

  // Pain quality
  const qualityWords = ['sharp', 'dull', 'throbbing', 'pulsing', 'burning',
    'stabbing', 'aching', 'pressure', 'tight', 'cramping', 'shooting'];
  const qualities = qualityWords.filter(q => new RegExp(`\\b${q}\\b`, 'i').test(text));
  if (qualities.length) result.pain_quality = extracted(qualities);

  // Pattern
  if (/\bchronic\b|\balways\b|\bongoing\b|\bconstant\b|\bevery\s*day\b/i.test(text)) {
    result.pattern = extracted('chronic');
  } else if (/\brecurring\b|\bagain\b|\bkeeps coming back\b|\banother episode\b/i.test(text)) {
    result.pattern = extracted('recurring');
  } else if (/\bnew\b|\bfirst time\b|\bnever had\b/i.test(text)) {
    result.pattern = extracted('new');
  }

  // Triggers
  const trigWords = ['stress', 'sleep', 'work', 'exercise', 'eating', 'food',
    'weather', 'sitting', 'standing', 'screen', 'alcohol', 'caffeine', 'movement'];
  const trigs = trigWords.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(text));
  if (trigs.length) result.triggers = extracted(trigs);

  return result;
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a medical symptom extraction system for a health tracking app.

STRICT NON-NEGOTIABLE RULES:
1. Extract ONLY fields the user EXPLICITLY mentioned. If not mentioned → status "missing", value null (or []).
2. NEVER guess severity from vague language. Only extract when user says a number ("7/10", "8 out of 10") or a clear intensity word:
   - mild / slight / a little / minor → 3
   - moderate / pretty bad → 5
   - severe / terrible / horrible / awful → 8
   - unbearable / excruciating → 10
3. NEVER guess pattern (chronic/recurring/new) unless user said it explicitly.
4. NEVER guess duration unless user gave a time reference.
5. NEVER refine body location. "head" stays "head" — never invent "temple" or "forehead".
6. pain_quality, triggers, accompanying → empty array [] if not mentioned.

Return ONLY valid JSON with this exact structure, no markdown, no extra text:
{
  "body_region": { "value": string|null, "status": "extracted"|"missing" },
  "specific_location": { "value": string|null, "status": "extracted"|"missing" },
  "symptom_type": { "value": string|null, "status": "extracted"|"missing" },
  "severity": { "value": number|null, "status": "extracted"|"missing" },
  "onset": { "value": string|null, "status": "extracted"|"missing" },
  "pain_quality": { "value": string[], "status": "extracted"|"missing" },
  "pattern": { "value": "chronic"|"recurring"|"new"|null, "status": "extracted"|"missing" },
  "duration": { "value": string|null, "status": "extracted"|"missing" },
  "triggers": { "value": string[], "status": "extracted"|"missing" },
  "accompanying": { "value": string[], "status": "extracted"|"missing" }
}`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Emergency check always runs first, before any AI call
    const emergency = checkEmergency(text);

    if (IS_DEMO) {
      return NextResponse.json(mockExtract(text));
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Extract symptoms from this input: "${text}"` }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const raw = content.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(raw);

    const result: ExtractionResult = {
      ...parsed,
      raw_input: text,
      ...emergency, // always use our regex-based emergency detection
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[extract-symptom]', err);
    return NextResponse.json(
      { error: 'Failed to extract symptoms. Please try again.' },
      { status: 500 }
    );
  }
}
