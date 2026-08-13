'use client';

export default function OfflineBanner({ online, pendingCount, syncing, onSyncNow }) {
  if (online && pendingCount === 0) return null;

  const offline = !online;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      padding: '10px 14px', marginBottom: 16, fontSize: 11, lineHeight: 1.6,
      background: offline ? 'rgba(251,191,36,0.07)' : 'rgba(74,222,128,0.07)',
      border: `1px solid ${offline ? 'rgba(251,191,36,0.3)' : 'var(--green-muted)'}`,
      color: offline ? 'var(--amber)' : 'var(--green)',
    }}>
      <div>
        {offline
          ? `⚠ No signal — samples are saving on this device${pendingCount ? ` (${pendingCount} queued)` : ''} and will sync automatically once you're back in range.`
          : syncing
            ? `⏳ Syncing ${pendingCount} queued sample${pendingCount === 1 ? '' : 's'}…`
            : `✓ Back online — ${pendingCount} sample${pendingCount === 1 ? '' : 's'} waiting to sync.`}
      </div>
      {!offline && !syncing && pendingCount > 0 && (
        <button onClick={onSyncNow} style={{
          fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'none',
          border: '1px solid var(--green-muted)', color: 'var(--green)', padding: '5px 12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
        }}>Sync Now</button>
      )}
    </div>
  );
}
