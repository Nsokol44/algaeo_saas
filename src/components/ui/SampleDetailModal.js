'use client';
import { sampleLabel } from '@/lib/sampleLabel';

const scoreColor = (s) => s >= 8 ? '#4ade80' : s >= 6 ? '#fbbf24' : s >= 4 ? '#fb923c' : '#f87171';
const CROP_LABELS = { corn: 'Corn', soybeans: 'Soybeans', peanuts: 'Peanuts', tomatoes: 'Tomatoes', berries: 'Berries', pasture: 'Pasture', miscanthus: 'Miscanthus', hemp: 'Hemp', cannabis: 'Cannabis' };

export default function SampleDetailModal({ sample, onClose }) {
  if (!sample) return null;
  const mapsUrl = `https://www.google.com/maps?q=${sample.lat},${sample.lng}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {sample.photo_url ? (
          <img src={sample.photo_url} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} alt="soil sample" />
        ) : (
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', fontSize: 11, color: 'var(--text-muted)' }}>No photo attached</div>
        )}

        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{sampleLabel(sample)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {sample.sample_date && new Date(sample.sample_date + 'T12:00:00').toLocaleDateString()}
                {sample.created_at && ` · ${new Date(sample.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                {' · '}{CROP_LABELS[sample.crop_type] || sample.crop_type || '—'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: scoreColor(sample.health_score || 5), lineHeight: 1 }}>{sample.health_score || '?'}</div>
                <div style={{ fontSize: 9, color: scoreColor(sample.health_score || 5), fontWeight: 600 }}>{sample.score_label || '—'}</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          </div>

          {sample.lat != null && sample.lng != null && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)', padding: '10px 14px', marginBottom: 14,
              fontSize: 11, color: 'var(--text-dim)', textDecoration: 'none', fontFamily: 'DM Mono, monospace',
            }}>
              <span>📍 {sample.lat.toFixed(5)}, {sample.lng.toFixed(5)}{sample.gps_accuracy_m ? ` (±${Math.round(sample.gps_accuracy_m)}m)` : ''}</span>
              <span style={{ color: 'var(--green)' }}>Open in Maps ↗</span>
            </a>
          )}

          {(sample.depth_top_in != null || sample.depth_bottom_in != null) && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Depth: {sample.depth_top_in}"–{sample.depth_bottom_in}"</div>
          )}

          {sample.ai_photo_analysis && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--blue)' }}>🔎 AI Photo Read: </span>{sample.ai_photo_analysis}
            </div>
          )}

          {sample.notes && <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 14 }}>{sample.notes}</div>}

          {sample.collected_offline && (
            <div style={{ fontSize: 10, color: 'var(--amber)' }}>📥 Collected offline, synced later</div>
          )}
        </div>
      </div>
    </div>
  );
}
