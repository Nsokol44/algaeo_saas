'use client';
import { useState, useRef, useEffect } from 'react';
import { exportJSON, exportKML, exportShapefile } from '@/lib/exportSamples';

export default function ExportMenu({ samples, filename = 'soil-samples', label = '⬇ Export' }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const ref = useRef(null);

  const located = (samples || []).filter((s) => s.lat != null && s.lng != null);
  const disabled = located.length === 0;

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const run = async (format, fn) => {
    setExporting(format);
    try {
      await fn(samples, filename);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        title={disabled ? 'No GPS-located samples to export yet' : undefined}
        style={{
          padding: '7px 14px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
          border: '1px solid var(--border2)', background: 'var(--surface)',
          color: disabled ? 'var(--text-muted)' : 'var(--text-dim)',
          cursor: disabled ? 'default' : 'pointer', fontFamily: 'DM Mono, monospace',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {label}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--surface)', border: '1px solid var(--border2)', minWidth: 170, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 60 }}>
          {[
            { key: 'kml', label: 'KML', hint: 'Google Earth / Maps', fn: exportKML },
            { key: 'shp', label: 'Shapefile', hint: 'GIS / ArcGIS / QGIS', fn: exportShapefile },
            { key: 'json', label: 'JSON', hint: 'Raw data', fn: exportJSON },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => run(opt.key, opt.fn)}
              disabled={exporting != null}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%', textAlign: 'left',
                padding: '10px 14px', fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: exporting != null ? 'default' : 'pointer', fontFamily: 'DM Mono, monospace',
              }}
            >
              <span>{exporting === opt.key ? 'Exporting…' : opt.label}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{opt.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
