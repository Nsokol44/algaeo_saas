// Field collectors moving fast often skip the "Field Name" box entirely — if we
// fall back to a generic string like "Soil Sample" for all of them, every entry
// in a list looks identical and unclickable-feeling. Fall back to a timestamp
// instead so every sample is at least visually distinct.
export function sampleLabel(sample) {
  if (sample?.field_name) return sample.field_name;
  const when = sample?.sample_date ? `${sample.sample_date}T12:00:00` : sample?.created_at;
  if (!when) return 'Soil Sample';
  try {
    return new Date(when).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'Soil Sample';
  }
}

/** Used at save time so a blank Field Name still results in a distinguishable label, not null. */
export function defaultFieldName(contextLabel) {
  const stamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return contextLabel ? `${contextLabel} — ${stamp}` : stamp;
}
