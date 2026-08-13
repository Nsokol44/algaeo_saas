'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export default function CompassNeedle({ size = 56 }) {
  const [heading, setHeading] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const attached = useRef(false);

  const handleOrientation = useCallback((e) => {
    let h = e.webkitCompassHeading; // iOS Safari — true heading, already 0-360
    if (h == null && typeof e.alpha === 'number') h = 360 - e.alpha; // best-effort for others
    if (h != null && !Number.isNaN(h)) setHeading(h);
  }, []);

  const attach = useCallback(() => {
    if (attached.current) return;
    attached.current = true;
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
  }, [handleOrientation]);

  const requestAccess = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') { setNeedsPermission(false); attach(); }
      } catch {
        // user declined — leave the tap-to-enable state up
      }
    } else {
      attach();
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      setNeedsPermission(true); // iOS 13+ needs an explicit user gesture first
    } else {
      attach();
    }
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      attached.current = false;
    };
  }, [attach, handleOrientation]);

  const rot = heading != null ? -heading : 0;

  return (
    <button
      onClick={needsPermission ? requestAccess : undefined}
      title={needsPermission ? 'Tap to enable compass' : heading != null ? `Facing ${Math.round(heading)}°` : 'Waiting for compass'}
      style={{
        width: size, height: size, borderRadius: '50%', background: 'var(--surface2)',
        border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: needsPermission ? 'pointer' : 'default', position: 'relative', flexShrink: 0, padding: 0,
      }}
    >
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 100 100" style={{ transform: `rotate(${rot}deg)`, transition: 'transform 0.25s ease-out' }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--border2)" strokeWidth="2" />
        <text x="50" y="16" textAnchor="middle" fontSize="11" fill="var(--green)" fontFamily="Syne, sans-serif" fontWeight="800">N</text>
        <polygon points="50,20 44,54 50,48 56,54" fill="var(--green)" />
        <polygon points="50,80 44,54 50,60 56,54" fill="var(--text-muted)" />
      </svg>
      {needsPermission && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,12,10,0.55)', fontSize: 8, color: 'var(--green)', textAlign: 'center', lineHeight: 1.2, padding: 4 }}>
          Tap to<br />enable
        </div>
      )}
    </button>
  );
}
