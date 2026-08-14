'use client';
// Client-side export of soil sample points — no server round-trip needed.
// KML and JSON are hand-built (no library needed); Shapefile goes through
// @mapbox/shp-write, which zips up .shp/.shx/.dbf/.prj in the browser.

function triggerDownload(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function located(samples) {
  return (samples || []).filter((s) => s.lat != null && s.lng != null);
}

function escapeXml(str) {
  return String(str ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

const CROP_LABELS = { corn: 'Corn', soybeans: 'Soybeans', peanuts: 'Peanuts', tomatoes: 'Tomatoes', berries: 'Berries', pasture: 'Pasture', miscanthus: 'Miscanthus', hemp: 'Hemp', cannabis: 'Cannabis' };

/** Full, uncompressed record per sample — used for the JSON export. */
function toRecord(s) {
  return {
    id: s.id,
    field_name: s.field_name || null,
    trial_id: s.trial_id || null,
    sample_date: s.sample_date || null,
    collected_at: s.created_at || null,
    lat: s.lat,
    lng: s.lng,
    gps_accuracy_m: s.gps_accuracy_m ?? null,
    depth_top_in: s.depth_top_in ?? null,
    depth_bottom_in: s.depth_bottom_in ?? null,
    crop_type: s.crop_type || null,
    health_score: s.health_score ?? null,
    score_label: s.score_label || null,
    ai_photo_analysis: s.ai_photo_analysis || null,
    photo_url: s.photo_url || null,
    notes: s.notes || null,
    lab_ph: s.lab_ph ?? null,
    lab_om_pct: s.lab_om_pct ?? null,
    lab_cec: s.lab_cec ?? null,
    lab_nitrogen_ppm: s.lab_nitrogen_ppm ?? null,
    lab_phosphorus_ppm: s.lab_phosphorus_ppm ?? null,
    lab_potassium_ppm: s.lab_potassium_ppm ?? null,
    collected_offline: !!s.collected_offline,
  };
}

export function exportJSON(samples, filename = 'soil-samples') {
  const records = located(samples).map(toRecord);
  triggerDownload(JSON.stringify(records, null, 2), `${filename}.json`, 'application/json');
}

export function exportKML(samples, filename = 'soil-samples') {
  const points = located(samples);
  const placemarks = points.map((s) => {
    const name = escapeXml(s.field_name || 'Soil Sample');
    const desc = [
      s.sample_date ? `Date: ${s.sample_date}` : null,
      s.crop_type ? `Crop: ${CROP_LABELS[s.crop_type] || s.crop_type}` : null,
      s.health_score != null ? `Score: ${s.health_score}/10 (${s.score_label || ''})` : null,
      (s.depth_top_in != null || s.depth_bottom_in != null) ? `Depth: ${s.depth_top_in}"-${s.depth_bottom_in}"` : null,
      s.notes ? `Notes: ${s.notes}` : null,
    ].filter(Boolean).join('\n');

    const extendedData = Object.entries(toRecord(s))
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `<Data name="${escapeXml(k)}"><value>${escapeXml(v)}</value></Data>`)
      .join('');

    return `<Placemark>
<name>${name}</name>
<description><![CDATA[${desc}]]></description>
<ExtendedData>${extendedData}</ExtendedData>
<Point><coordinates>${s.lng},${s.lat},0</coordinates></Point>
</Placemark>`;
  }).join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${escapeXml(filename)}</name>
${placemarks}
</Document>
</kml>`;

  triggerDownload(kml, `${filename}.kml`, 'application/vnd.google-earth.kml+xml');
}

export async function exportShapefile(samples, filename = 'soil-samples') {
  const points = located(samples);
  if (points.length === 0) return;

  const shpwrite = (await import('@mapbox/shp-write')).default;

  // Shapefile (.dbf) field names are limited to 10 characters — keep these short
  // and distinct from the richer JSON/KML exports.
  const geojson = {
    type: 'FeatureCollection',
    features: points.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        field: (s.field_name || '').slice(0, 40),
        date: s.sample_date || '',
        crop: (s.crop_type || '').slice(0, 10),
        score: s.health_score ?? '',
        label: (s.score_label || '').slice(0, 10),
        depth_top: s.depth_top_in ?? '',
        depth_btm: s.depth_bottom_in ?? '',
        accuracy_m: s.gps_accuracy_m ?? '',
        notes: (s.notes || '').slice(0, 250),
        photo_url: s.photo_url || '',
      },
    })),
  };

  shpwrite.download(geojson, {
    folder: filename,
    filename,
    outputType: 'blob',
    compression: 'STORE',
    types: { point: filename },
  });
}
