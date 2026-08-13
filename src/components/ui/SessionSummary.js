'use client';
import { useState, useEffect } from 'react';
import { distanceMeters, metersToFeet } from '@/lib/geo';

function elapsedLabel(startMs, nowMs) {
  const mins = Math.max(0, Math.round((nowMs - startMs) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function SessionSummary({ samples, startedAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!samples || samples.length === 0) return null;

  const scores = samples.map((s) => s.score).filter((s) => s != null);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  const highest = scores.length ? Math.max(...scores) : null;
  const lowest = scores.length ? Math.min(...scores) : null;

  let distanceFt = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (a.lat != null && b.lat != null) distanceFt += metersToFeet(distanceMeters(a.lat, a.lng, b.lat, b.lng));
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--green-muted)', padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
        This Session
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 12 }}>
        <Stat label="Samples" value={samples.length} />
        {avg != null && <Stat label="Avg Score" value={avg} />}
        {highest != null && <Stat label="Highest" value={highest} />}
        {lowest != null && <Stat label="Lowest" value={lowest} />}
        <Stat label="Distance" value={`${Math.round(distanceFt)}ft`} />
        <Stat label="Time In Field" value={elapsedLabel(startedAt, now)} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
    </div>
  );
}
