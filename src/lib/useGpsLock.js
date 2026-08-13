'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Watches GPS position continuously (instead of a single getCurrentPosition poll)
 * so the UI can show accuracy tightening live, and auto-locks once it crosses `threshold`.
 */
export function useGpsLock({ threshold = 10, autoCapture = true } = {}) {
  const [position, setPosition] = useState(null); // { lat, lng, accuracy }
  const [locked, setLocked] = useState(false);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState(null);
  const watchId = useRef(null);
  const lockedRef = useRef(false);

  const stop = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    setWatching(false);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation is not supported on this device.'); return; }
    setError(null);
    lockedRef.current = false;
    setLocked(false);
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);
        const next = {
          lat: parseFloat(pos.coords.latitude.toFixed(7)),
          lng: parseFloat(pos.coords.longitude.toFixed(7)),
          accuracy: acc,
        };
        setPosition(next);
        if (autoCapture && acc <= threshold && !lockedRef.current) {
          lockedRef.current = true;
          setLocked(true);
          stop();
        }
      },
      (err) => { setError(err.message || 'Could not get location.'); setWatching(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
    );
  }, [threshold, autoCapture, stop]);

  const reacquire = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
    setPosition(null);
    start();
  }, [start]);

  useEffect(() => () => stop(), [stop]);

  return { position, locked, watching, error, start, stop, reacquire };
}
