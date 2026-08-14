'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

/**
 * Invite collectors for either a Farm or a Field Trial — pass exactly one of
 * `farm` / `trial`. Trial-scoped invites don't require a Farm record to exist.
 */
export default function InviteModal({ farm, trial, onClose }) {
  const supabase = createClient();
  const scopeType = trial ? 'trial' : 'farm';
  const scopeId = trial ? trial.id : farm?.id;
  const scopeLabel = trial ? trial.name : (farm?.nickname || farm?.name);

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [role, setRole] = useState('collector'); // 'collector' | 'viewer' — only meaningful for trial-scoped invites
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { loadInvites(); }, [scopeType, scopeId]);

  const loadInvites = async () => {
    if (!scopeId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('guest_invites').select('*').eq(scopeType === 'trial' ? 'trial_id' : 'farm_id', scopeId).order('created_at', { ascending: false });
    setInvites(data || []);
    setLoading(false);
  };

  const createInvite = async () => {
    if (!scopeId) return;
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('guest_invites').insert({
      farm_id: trial ? (trial.farm_id || null) : farm.id,
      trial_id: trial ? trial.id : null,
      created_by: user?.id,
      label: label || (trial && role === 'viewer' ? 'Trial Viewers' : 'Field Collectors'),
      role: trial ? role : 'collector',
    }).select().single();
    setCreating(false);
    if (!error && data) {
      setLabel('');
      setInvites((prev) => [data, ...prev]);
    }
  };

  const toggleActive = async (invite) => {
    const { data } = await supabase.from('guest_invites').update({ active: !invite.active }).eq('id', invite.id).select().single();
    if (data) setInvites((prev) => prev.map((i) => (i.id === data.id ? data : i)));
  };

  const linkFor = (invite) => `${window.location.origin}/collect?token=${invite.token}`;

  const copyLink = async (invite) => {
    const link = linkFor(invite);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // clipboard API can fail without HTTPS/permissions — fall back silently, link is still shown
    }
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const shareLink = (invite) => {
    const link = linkFor(invite);
    if (navigator.share) {
      navigator.share({ title: `Collect soil samples for ${scopeLabel}`, url: link }).catch(() => {});
    } else {
      copyLink(invite);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>👥 {trial ? 'Invite People' : 'Invite Collectors'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 22 }}>
          Share a link so anyone — a scout, agronomist, or family member — can
          {trial ? ' collect samples for, or just see the data on,' : ' drop GPS-tagged soil samples for'}
          {' '}<strong style={{ color: 'var(--text-dim)' }}>{scopeLabel || (trial ? 'this trial' : 'this farm')}</strong>. They don't need an Algaeo account, and it works even with no signal in the field.
        </div>

        {trial && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { key: 'collector', label: '📍 Collector', hint: 'can add samples' },
              { key: 'viewer', label: '👁 Viewer', hint: 'can only view' },
            ].map((r) => (
              <button key={r.key} onClick={() => setRole(r.key)} style={{
                flex: 1, textAlign: 'left', padding: '10px 12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                background: role === r.key ? 'var(--green-glow)' : 'var(--surface2)',
                border: `1px solid ${role === r.key ? 'var(--green-muted)' : 'var(--border)'}`,
                color: role === r.key ? 'var(--green)' : 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{r.hint}</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <input
            className="input-base"
            placeholder="Label — e.g. Field Day April 2026"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createInvite()}
          />
          <button className="btn-primary" onClick={createInvite} disabled={creating} style={{ flexShrink: 0 }}>
            {creating ? 'Creating…' : '+ New Link'}
          </button>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Active Links
        </div>

        {loading && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0' }}>Loading…</div>}
        {!loading && invites.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0' }}>No invite links yet — create one above.</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invites.map((invite) => (
            <div key={invite.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: invite.active ? 'var(--text)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {invite.label || 'Field Collectors'}
                    {invite.role === 'viewer' && (
                      <span style={{ fontSize: 8, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--blue)', border: '1px solid rgba(96,165,250,0.35)', padding: '2px 6px' }}>👁 Viewer</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {invite.use_count}/{invite.max_uses} uses · expires {new Date(invite.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={() => toggleActive(invite)} style={{
                  fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
                  background: invite.active ? 'var(--green-glow)' : 'var(--surface)',
                  color: invite.active ? 'var(--green)' : 'var(--text-muted)',
                  border: `1px solid ${invite.active ? 'var(--green-muted)' : 'var(--border2)'}`,
                  padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                }}>{invite.active ? 'Active' : 'Disabled'}</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => copyLink(invite)} style={{
                  flex: 1, fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text-dim)',
                  padding: '8px 10px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left',
                }}>{copiedId === invite.id ? '✓ Copied' : linkFor(invite)}</button>
                <button onClick={() => shareLink(invite)} style={{
                  fontSize: 11, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)',
                  padding: '8px 12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', flexShrink: 0,
                }}>Share</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
