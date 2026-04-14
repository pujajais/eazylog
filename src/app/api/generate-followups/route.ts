import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { ExtractionResult, FollowUpQuestion, FollowUpResult, HistoryEntry } from '@/lib/types';

const IS_DEMO = !process.env.ANTHROPIC_API_KEY;

// ── Mock follow-up generator ───────────────────────────────────────────────────

function mockGenerateFollowups(
  extraction: ExtractionResult,
  history: HistoryEntry[]
): FollowUpResult {
  const questions: FollowUpQuestion[] = [];
  const body = extraction.body_region.value;
  const symptom = extraction.symptom_type.value;
  const hasHistory = history.length > 0;

  // History match question — ask first if relevant
  if (hasHistory) {
    const daysAgo = Math.round(
      (Date.now() - new Date(history[0].created_at).getTime()) / 86_400_000
    );
    questions.push({
      field: 'pattern',
      required: false,
      text: `You logged a similar symptom ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago. Is this related?`,
      options: ['Yes, same issue continuing', 'No, this is separate', 'Not sure'],
    });
  }

  // Body region — if missing
  if (extraction.body_region.status === 'missing') {
    questions.push({
      field: 'body_region',
      required: true,
      text: 'Where in your body do you feel this?',
      options: [
        'Head', 'Neck', 'Shoulders', 'Chest', 'Upper back',
        'Lower back', 'Stomach / Abdomen', 'Hips', 'Legs / Knees',
        'Arms', 'Feet / Ankles', 'All over',
      ],
    });
  }

  // Severity — always ask if missing (most clinically important)
  if (extraction.severity.status === 'missing') {
    questions.push({
      field: 'severity',
      required: true,
      text: 'How bad is it right now?',
      options: [
        '1–2  Barely noticeable',
        '3–4  Uncomfortable but manageable',
        '5–6  Hard to ignore',
        '7–8  Very painful',
        '9–10  Unbearable',
      ],
    });
  }

  // Location refinement — context-aware
  if (extraction.specific_location.status === 'missing') {
    if (body === 'head') {
      questions.push({
        field: 'specific_location',
        required: false,
        text: 'Where in your head is it?',
        options: [
          'Left temple', 'Right temple', 'Forehead / front',
          'Back of head', 'Top of head', 'Behind the eyes', 'All over',
        ],
      });
    } else if (body === 'back') {
      questions.push({
        field: 'specific_location',
        required: false,
        text: 'Which part of your back?',
        options: ['Upper back', 'Middle back', 'Lower back', 'Left side', 'Right side', 'Both sides'],
      });
    } else if (body === 'abdomen') {
      questions.push({
        field: 'specific_location',
        required: false,
        text: 'Where in your stomach / abdomen?',
        options: ['Upper abdomen', 'Lower abdomen', 'Left side', 'Right side', 'Around the navel', 'All over'],
      });
    }
  }

  // Onset — if missing
  if (extraction.onset.status === 'missing') {
    questions.push({
      field: 'onset',
      required: false,
      text: 'When did this start?',
      options: [
        'Just now', 'Within the last hour', 'A few hours ago',
        'Earlier today', 'Yesterday', 'A few days ago', 'Over a week ago',
      ],
    });
  }

  // Pain quality — context-aware, only for pain/headache symptoms
  if (
    extraction.pain_quality.status === 'missing' &&
    (symptom === 'pain' || symptom === 'headache' || !symptom)
  ) {
    if (body === 'head' || symptom === 'headache') {
      questions.push({
        field: 'pain_quality',
        required: false,
        text: 'How would you describe it?',
        options: [
          'Throbbing / pulsing', 'Pressure / squeezing', 'Sharp / stabbing',
          'Dull / heavy ache', 'Tight band around head', 'Burning',
        ],
      });
    } else {
      questions.push({
        field: 'pain_quality',
        required: false,
        text: 'How would you describe the feeling?',
        options: [
          'Sharp / stabbing', 'Dull / aching', 'Throbbing / pulsing',
          'Burning', 'Pressure / squeezing', 'Tight / cramping', 'Shooting',
        ],
      });
    }
  }

  const historyNote = hasHistory
    ? `Similar symptom logged ${Math.round(
        (Date.now() - new Date(history[0].created_at).getTime()) / 86_400_000
      )} days ago`
    : undefined;

  return {
    questions: questions.slice(0, 5),
    has_history_match: hasHistory,
    history_note: historyNote,
  };
}

// ── Sonnet prompt ─────────────────────────────────────────────────────────────

function buildPrompt(extraction: ExtractionResult, history: HistoryEntry[]): string {
  const missingFields = Object.entries(extraction)
    .filter(([, val]) => {
      if (typeof val === 'object' && val !== null && 'status' in val) {
        return (val as { status: string }).status === 'missing';
      }
      return false;
    })
    .map(([k]) => k);

  const extractedFields = Object.entries(extraction)
    .filter(([, val]) => {
      if (typeof val === 'object' && val !== null && 'status' in val) {
        return (val as { status: string; value: unknown }).status === 'extracted';
      }
      return false;
    })
    .map(([k, val]) => `${k}: ${JSON.stringify((val as { value: unknown }).value)}`);

  const historyContext =
    history.length > 0
      ? `User has ${history.length} similar symptom log(s) in the last 30 days. Most recent: ${
          Math.round((Date.now() - new Date(history[0].created_at).getTime()) / 86_400_000)
        } days ago.`
      : 'No recent similar symptoms in history.';

  return `
EXTRACTED so far: ${extractedFields.join(', ') || 'nothing yet'}
MISSING fields: ${missingFields.join(', ')}
HISTORY: ${historyContext}
RAW INPUT: "${extraction.raw_input}"

Generate 2–5 follow-up questions for the missing fields. Rules:
- Severity and body_region are required if missing. All others optional.
- Order: history match first (if applicable) → body region → severity → location → onset → quality
- Never ask about fields already extracted
- Never exceed 5 questions total
- Options must be exhaustive enough that users rarely need "Other"
- Tone: warm, natural, not clinical
- For head symptoms: use headache-specific location and quality options
- For back pain: use back-specific location options
- If history exists: ask "Same as before?" as the first question

Return ONLY valid JSON:
{
  "questions": [
    {
      "field": "string",
      "required": boolean,
      "text": "string",
      "options": ["string"]
    }
  ],
  "has_history_match": boolean,
  "history_note": "string or null"
}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { extraction, history } = await request.json() as {
      extraction: ExtractionResult;
      history: HistoryEntry[];
    };

    if (!extraction) {
      return NextResponse.json({ error: 'No extraction provided' }, { status: 400 });
    }

    if (IS_DEMO) {
      return NextResponse.json(mockGenerateFollowups(extraction, history ?? []));
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: `You are a clinical follow-up question generator for a symptom tracking app.
Your job: given an extraction result with missing fields and user history, generate smart
contextual follow-up questions with tappable chip options. Never free-text. Never ask about
fields already extracted. Always check for clinical importance order.
Return ONLY valid JSON, no markdown.`,
      messages: [{ role: 'user', content: buildPrompt(extraction, history ?? []) }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const raw = content.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const result: FollowUpResult = JSON.parse(raw);

    // Safety cap: never more than 5 questions
    result.questions = result.questions.slice(0, 5);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[generate-followups]', err);
    return NextResponse.json(
      { error: 'Failed to generate follow-ups. Please try again.' },
      { status: 500 }
    );
  }
}
