import { NextResponse } from 'next/server';

// Server-side only — keeps the Gemini API key off the client.
// Requires GEMINI_API_KEY to be set in the deployment environment.
// Uses the Google-maintained "gemini-flash-latest" alias so this stays on a
// current stable Flash release without needing a code change every time a
// pinned model version is deprecated.
const GEMINI_MODEL = 'gemini-flash-latest';

export async function POST(req) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI photo analysis is not configured on this deployment.' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inline_data: { mime_type: mediaType || 'image/jpeg', data: imageBase64 } },
                {
                  text:
                    "You're looking at a field photo of soil, taken by a farmer logging a soil sample. " +
                    'In under 40 words, give a quick plain-language visual read covering: color/darkness as an organic-matter signal, apparent moisture, and texture/structure (compaction, aggregation, visible residue or roots). ' +
                    'No headers, no markdown, no preamble — just the read. If the photo is not soil, say so in one short sentence instead.',
                },
              ],
            },
          ],
          // Generous token budget so any internal "thinking" tokens the model spends don't
          // eat into the visible answer and cut it off mid-sentence — thinkingConfig support
          // varies by which model "gemini-flash-latest" currently resolves to, so we don't
          // try to force it off; a bigger budget is the safe fix that works regardless.
          generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return NextResponse.json({ error: 'AI analysis failed.', detail }, { status: 502 });
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join(' ').trim();
    if (!text) {
      // MAX_TOKENS with zero text usually means the whole budget went to internal
      // reasoning — surface this distinctly rather than returning an empty/blank read.
      if (candidate?.finishReason === 'MAX_TOKENS') {
        return NextResponse.json({ error: 'AI analysis ran out of room before producing a read — try again.' }, { status: 502 });
      }
      return NextResponse.json({ analysis: 'No analysis returned.' });
    }
    return NextResponse.json({ analysis: text });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error analyzing photo.' }, { status: 500 });
  }
}
