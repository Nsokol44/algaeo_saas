'use client';

/** Sends a compressed photo (data URL) to the server route for an instant AI soil read. */
export async function analyzeSoilPhoto(dataUrl) {
  const match = /^data:(.*);base64,(.*)$/.exec(dataUrl || '');
  if (!match) throw new Error('Invalid image data.');
  const [, mediaType, base64] = match;

  const res = await fetch('/api/analyze-soil', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mediaType }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'AI analysis failed.');
  return data.analysis;
}
