'use client';
import { useEffect, useRef } from 'react';

const scoreColor = (s) => s >= 8 ? '#4ade80' : s >= 6 ? '#fbbf24' : s >= 4 ? '#fb923c' : '#f87171';

/** Renders every sample with GPS coordinates as a pin on a shared map. Click a pin to view that sample. */
export default function TrialSamplesMap({ samples, onSelectSample, height = 320 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const located = (samples || []).filter((s) => s.lat != null && s.lng != null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!mapRef.current || located.length === 0) return;

      const maplibregl = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled) return;

      // Clean up any previous instance before re-rendering (e.g. samples list changed).
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

      const centerLat = located.reduce((a, s) => a + s.lat, 0) / located.length;
      const centerLng = located.reduce((a, s) => a + s.lng, 0) / located.length;

      const map = new maplibregl.Map({
        container: mapRef.current,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [centerLng, centerLat],
        zoom: located.length > 1 ? 14 : 15,
      });
      mapInstanceRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        const bounds = new maplibregl.LngLatBounds();
        located.forEach((sample) => {
          const color = scoreColor(sample.health_score || 5);
          const el = document.createElement('div');
          el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #0a0c0a;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#0a0c0a;font-family:Syne,sans-serif;`;
          el.textContent = (sample.health_score || '?').toString();
          el.title = `Score: ${sample.health_score || '?'}/10`;
          if (onSelectSample) el.addEventListener('click', () => onSelectSample(sample));

          const marker = new maplibregl.Marker({ element: el }).setLngLat([sample.lng, sample.lat]).addTo(map);
          markersRef.current.push(marker);
          bounds.extend([sample.lng, sample.lat]);
        });
        if (located.length > 1) map.fitBounds(bounds, { padding: 50, maxZoom: 17 });
      });
    };

    init();
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located.map((s) => `${s.id}:${s.health_score}`).join(',')]);

  if (located.length === 0) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        No GPS-located samples to map yet.
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height, border: '1px solid var(--border)' }} />;
}
