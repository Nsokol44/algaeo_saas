'use client';

// Maps accuracy (meters) to a ring radius: worse accuracy = bigger, looser ring.
function radiusFor(accuracy) {
  if (accuracy == null) return 46;
  return Math.max(14, Math.min(46, accuracy * 2));
}

export default function AccuracyRing({ accuracy, locked, threshold = 10, size = 132 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = radiusFor(accuracy);
  const color = locked ? 'var(--green)' : accuracy == null ? 'var(--text-muted)' : accuracy > threshold * 2.5 ? '#f87171' : accuracy > threshold ? 'var(--amber)' : 'var(--green)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={size / 2 - 2} fill="none" stroke="var(--border)" strokeWidth="1" />
          {!locked && accuracy != null && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="2" opacity="0.55" className="accuracy-ring-pulse" />
          )}
          <circle cx={cx} cy={cy} r={r} fill={color} opacity={locked ? 0.16 : 0.12} stroke={color} strokeWidth="1.5" style={{ transition: 'r 0.6s ease, stroke 0.4s ease' }} />
          <circle cx={cx} cy={cy} r="4" fill={color} style={{ transition: 'fill 0.4s ease' }} />
        </svg>
        {locked && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--green)', fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>LOCKED</span>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color }}>
        {accuracy == null ? 'Acquiring signal…' : `±${accuracy}m accuracy`}
      </div>
      <style>{`
        .accuracy-ring-pulse { animation: accRingPulse 1.6s ease-out infinite; transform-origin: center; }
        @keyframes accRingPulse {
          0% { transform: scale(0.7); opacity: 0.6; }
          80% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
