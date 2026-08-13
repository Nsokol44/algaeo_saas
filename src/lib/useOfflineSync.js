'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingCount, syncPending, isOnline } from './offlineQueue';

/** Tracks online/offline state and the pending-queue count, and auto-syncs on reconnect. */
export function useOfflineSync(supabase) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef(null);

  const refreshCount = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  const runSync = useCallback(async () => {
    if (!isOnline() || syncing) return;
    setSyncing(true);
    try {
      await syncPending(supabase);
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [supabase, syncing, refreshCount]);

  useEffect(() => {
    setOnline(isOnline());
    refreshCount();

    const goOnline = () => { setOnline(true); runSync(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Periodic retry in case the 'online' event doesn't fire reliably (some mobile browsers).
    intervalRef.current = setInterval(() => { if (isOnline()) runSync(); }, 30000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { online, pendingCount, syncing, runSync, refreshCount };
}
