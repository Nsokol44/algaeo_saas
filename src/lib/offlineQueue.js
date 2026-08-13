'use client';
// Offline-first queue for soil sample submissions.
// If the collector is in a dead zone, samples are written to IndexedDB immediately
// and synced to Supabase automatically once connectivity returns (or on demand).

import { dataUrlToBlob } from './imageUtils';

const DB_NAME = 'algaeo-offline';
const DB_VERSION = 1;
const STORE = 'pending_samples';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'clientId' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Queue a sample for later sync. `photoDataUrl` (if any) is stored inline as base64. */
export async function queueSample(payload) {
  const db = await openDB();
  const clientId = uuid();
  const record = { clientId, createdAt: Date.now(), attempts: 0, ...payload };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

export async function getPending() {
  try {
    const db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function getPendingCount() {
  const all = await getPending();
  return all.length;
}

export async function removePending(clientId) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(clientId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function updatePending(clientId, updates) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(clientId);
    getReq.onsuccess = () => {
      if (getReq.result) store.put({ ...getReq.result, ...updates });
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
  db.close();
}

/**
 * Sync every pending sample to Supabase. Stops (but doesn't throw) on the first
 * network-looking failure so the rest stay queued for the next attempt.
 * onProgress(clientId, status) is called for each item: 'uploading' | 'done' | 'error'.
 */
export async function syncPending(supabase, { onProgress } = {}) {
  const pending = await getPending();
  let synced = 0;
  for (const item of pending) {
    onProgress?.(item.clientId, 'uploading');
    try {
      // Guest submissions may have been queued before we ever had a Supabase session
      // (no network = no anonymous sign-in). Establish one now that we're online.
      let userId = item.row.user_id;
      if (!userId && item.needsAnonAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
        if (!userId) {
          const { data: anon, error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) throw anonErr;
          userId = anon?.user?.id || null;
        }
        if (!userId) throw new Error('Could not establish a session to sync this sample.');
        if (item.farmIdForGuestAccess) {
          await supabase.from('guest_farm_access').upsert({ guest_user_id: userId, farm_id: item.farmIdForGuestAccess, invite_id: item.inviteId || null }).catch(() => {});
        }
      }

      let photoUrl = null;
      if (item.photoDataUrl) {
        const blob = dataUrlToBlob(item.photoDataUrl);
        const path = `${item.storagePathPrefix || 'offline'}/${item.clientId}.jpg`;
        const { data: upload, error: upErr } = await supabase.storage.from('soil-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        if (upload) {
          const { data: urlData } = supabase.storage.from('soil-photos').getPublicUrl(path);
          photoUrl = urlData?.publicUrl || null;
        }
      }

      const row = { ...item.row, user_id: userId, photo_url: photoUrl, client_id: item.clientId, collected_offline: true };
      const { error: insertErr } = await supabase.from('soil_samples').upsert(row, { onConflict: 'client_id' });
      if (insertErr) throw insertErr;

      if (item.inviteId != null) {
        await supabase.rpc('increment_invite_use', { invite_id: item.inviteId }).catch(() => {});
      }

      await removePending(item.clientId);
      synced++;
      onProgress?.(item.clientId, 'done');
    } catch (err) {
      onProgress?.(item.clientId, 'error');
      // Likely still offline or a transient error — stop this pass, keep the rest queued.
      break;
    }
  }
  return { synced, remaining: (await getPending()).length };
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
