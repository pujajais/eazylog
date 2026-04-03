import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const IS_DEMO = !process.env.ANTHROPIC_API_KEY;

function mockParse(text: string) {
  const lower = text.toLowerCase();

  const emergencyKeywords = ['chest pain', 'can\'t breathe', 'difficulty breathing', 'stroke', 'heart attack'];
  const isEmergency = emergencyKeywords.some(k => lower.includes(k));

  const bodyMap: Record<string, string[]> = {
    head: ['head', 'headache', 'migraine', 'temple', 'forehead'],
    neck: ['neck'],
    back: ['back', 'spine', 'lower back', 'upper back'],
    chest: ['chest'],
    stomach: ['stomach', 'abdomen', 'belly', 'nausea'],
    knee: ['knee'],
    shoulder: ['shoulder'],
    hip: ['hip'],
    eyes: ['eye', 'eyes'],
    hand: ['hand', 'wrist', 'finger'],
    foot: ['foot', 'feet', 'ankle'],
  };

  const locations: string[] = [];
  for (const [loc, keywords] of Object.entries(bodyMap)) {
    if (keywords.some(k => lower.includes(k))) locations.push(loc);
  }

  const painTypes: Record<string, string> = {
    sharp: 'sharp', throbbing: 'throbbing', dull: 'dull', burning: 'burning',
    aching: 'aching', cramping: 'cramping', tingling: 'tingling', pressure: 'pressure',
    stiff: 'stiffness', sore: 'soreness',
  };
  let painType = 'aching';
  for (const [keyword, type] of Object.entries(painTypes)) {
    if (lower.includes(keyword)) { painType = type; break; }
  }

  const triggerKeywords = ['stress', 'sleep', 'work', 'exercise', 'food', 'weather', 'sitting', 'standing', 'screen', 'stairs'];
  const triggers = triggerKeywords.filter(t => lower.includes(t));

  const severeWords = ['terrible', 'worst', 'unbearable', 'excruciating', 'agony', 'extreme', 'horrible'];
  const moderateWords = ['bad', 'painful', 'uncomfortable', 'bothering', 'annoying'];
  let severity = 5;
  if (severeWords.some(w => lower.includes(w))) severity = 8;
  else if (moderateWords.some(w => lower.includes(w))) severity = 6;
  else if (lower.includes('mild') || lower.includes('slight') || lower.includes('little')) severity = 3;

  const isChronic = ['chronic', 'recurring', 'always', 'ongoing', 'every day', 'again', 'keeps coming'].some(k => lower.includes(k));

  return {
    body_locations: locations.length ? locations : ['general'],
    pain_type: painType,
    severity,
    triggers,
    is_chronic: isChronic,
    summary: `I hear you — you're dealing with ${painType} discomfort${locations.length ? ` in your ${locations.join(' and ')}` : ''}. That sounds tough.`,
    is_emergency: isEmergency,
    emergency_message: isEmergency ? 'This sounds serious. If you are experiencing a medical emergency, please call 911 immediately.' : null,
    follow_up_questions: [
      'When did this start or how long have you been feeling this way?',
      'Does anything make it better or worse?',
    ],
  };
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (IS_DEMO) {
      return NextResponse.json(mockParse(text));
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a symptom parsing assistant for a health tracking app called EazyLog. Your ONLY job is to structure the user's description of how they feel into organized data.

CRITICAL RULES:
- NEVER diagnose any condition
- NEVER give medical advice or treatment suggestions
- NEVER suggest what the symptoms might mean
- ONLY structure and reflect what the user described
- If the user describes chest pain, difficulty breathing, sudden severe headache, signs of stroke, or any potentially life-threatening symptom, set is_emergency to true

Respond with ONLY valid JSON in this exact format:
{
  "body_locations": ["list of body parts mentioned"],
  "pain_type": "type of pain/sensation described (e.g., sharp, dull, throbbing, burning, aching, cramping, tingling, pressure)",
  "severity": <number 1-10 based on language intensity>,
  "triggers": ["any mentioned triggers or activities that caused/worsened it"],
  "is_chronic": <true if described as recurring/ongoing/chronic, false if new/acute>,
  "summary": "A brief, empathetic 1-sentence reflection of what they described - like a kind friend confirming they heard you",
  "is_emergency": <true if potentially life-threatening symptoms>,
  "emergency_message": "If is_emergency is true, a clear message to call 911. Otherwise null.",
  "follow_up_questions": ["1-2 brief, specific follow-up questions to better understand the symptom, like 'When did this start?' or 'Does anything make it better or worse?'"]
}`,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    const raw = content.text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Parse symptom error:', err);
    return NextResponse.json(
      { error: 'Failed to parse symptom. Please try again.' },
      { status: 500 }
    );
  }
}
