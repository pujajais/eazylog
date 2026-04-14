import { NextResponse } from 'next/server';

// Whisper API — requires OPENAI_API_KEY in .env.local
// Falls back gracefully: client uses Web Speech API when this returns 503.

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Whisper not configured. Use device voice instead.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as Blob | null;

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Forward to OpenAI Whisper
    const whisperForm = new FormData();
    whisperForm.append('file', audio, 'audio.webm');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperForm,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[transcribe] Whisper error:', err);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const { text } = await response.json();
    return NextResponse.json({ transcript: text });
  } catch (err) {
    console.error('[transcribe]', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
