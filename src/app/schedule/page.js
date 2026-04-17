'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFarm } from '@/lib/FarmContext';
import { getUpcomingWindows, getMethodLabel } from '@/lib/growthStages';
import { createClient } from '@/lib/supabase';

const CROPS = ['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus'];
const CROP_LABELS = { corn:'Corn', soybeans:'Soybeans', peanuts:'Peanuts', tomatoes:'Tomatoes', berries:'Berries', pasture:'Pasture', miscanthus:'Miscanthus' };
const CROP_EMOJI = { corn:'🌽', soybeans:'🫘', peanuts:'🥜', tomatoes:'🍅', berries:'🍓', pasture:'🌿', miscanthus:'🌾' };

export default function SchedulePage() {
  const { activeFarm } = useFarm();
  const supabase = createClient();
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ cropType: 'corn', fieldName: '', plantedDate: '', acres: '', variety: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadEntries(); }, [activeFarm]);

  const loadEntries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const q = supabase.from('planting_schedule').select('*').eq('user_id', user.id).order('planted_date', { ascending: false });
    if (activeFarm) q.eq('farm_id', activeFarm.id);
    const { data } = await q;
    setEntries(data || []);
  };

  const addEntry = async () => {
    if (!form.plantedDate || !form.cropType) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('planting_schedule').insert({
      user_id: user.id,
      farm_id: activeFarm?.id || null,
      crop_type: form.cropType,
      field_name: form.fieldName,
      planted_date: form.plantedDate,
      acres: form.acres || null,
      variety: form.variety,
    });
    setSaving(false);
    setForm({ cropType: 'corn', fieldName: '', plantedDate: '', acres: '', variety: '' });
    loadEntries();
  };

  const deleteEntry = async (id) => {
    await supabase.from('planting_schedule').delete().eq('id', id);
    loadEntries();
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>

        <div className="section-divider">Application Reminders</div>

        {/* Add planting */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 28 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Add Planting Date</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
            Enter your planting date and the app will tell you exactly when each AgTurbo application window opens.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            <F label="Crop">
              <select className="input-base" value={form.cropType} onChange={e => set('cropType', e.target.value)} style={{ background: 'var(--bg)' }}>
                {CROPS.map(c => <option key={c} value={c}>{CROP_LABELS[c]}</option>)}
              </select>
            </F>
            <F label="Planted Date">
              <input className="input-base" type="date" value={form.plantedDate} onChange={e => set('plantedDate', e.target.value)} />
            </F>
            <F label="Field Name">
              <input className="input-base" type="text" value={form.fieldName} placeholder="North 40" onChange={e => set('fieldName', e.target.value)} />
            </F>
            <F label="Acres">
              <input className="input-base" type="number" value={form.acres} placeholder="320" onChange={e => set('acres', e.target.value)} />
            </F>
            <F label="Variety (optional)">
              <input className="input-base" type="text" value={form.variety} placeholder="P1197AM" onChange={e => set('variety', e.target.value)} />
            </F>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn-primary" onClick={addEntry} disabled={saving}>
                {saving ? 'Saving...' : '+ Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Entries + windows */}
        {entries.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            No plantings added yet. Add a planting date above to see your application windows.
          </div>
        )}

        {entries.map(entry => {
          const windows = getUpcomingWindows(entry.crop_type, entry.planted_date);
          const active = windows.filter(w => w.status === 'active');
          const upcoming = windows.filter(w => w.status === 'future');
          const isExpanded = expandedId === entry.id;

          return (
            <div key={entry.id} style={{ background: 'var(--surface)', border: `1px solid ${active.length ? 'var(--green-muted)' : 'var(--border)'}`, marginBottom: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{CROP_EMOJI[entry.crop_type]}</span>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {CROP_LABELS[entry.crop_type]}{entry.field_name ? ` — ${entry.field_name}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Planted {new Date(entry.planted_date).toLocaleDateString()}{entry.acres ? ` · ${entry.acres} acres` : ''}{entry.variety ? ` · ${entry.variety}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {active.length > 0 && (
                    <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--green)', color: '#0a0c0a', padding: '4px 10px', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                      {active.length} Window{active.length > 1 ? 's' : ''} Open
                    </div>
                  )}
                  {upcoming.length > 0 && !active.length && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Next: {upcoming[0].daysUntilStart}d</div>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  <button onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }} style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Remove</button>
                </div>
              </div>

              {/* Windows */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                  {windows.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All application windows completed for this season.</div>}
                  {windows.map((w, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 0',
                      borderBottom: i < windows.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      {/* Status indicator */}
                      <div style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 3, flexShrink: 0,
                        background: w.status === 'active' ? 'var(--green)' : w.status === 'past' ? 'var(--border2)' : 'var(--text-muted)',
                        boxShadow: w.status === 'active' ? '0 0 8px var(--green)' : 'none',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: w.status === 'active' ? 'var(--green)' : 'var(--text)' }}>{w.stage}</span>
                          <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border2)', padding: '2px 8px' }}>{getMethodLabel(w.method)}</span>
                          {w.status === 'active' && <span style={{ fontSize: 10, color: 'var(--green)' }}>● APPLY NOW — closes in {w.daysUntilEnd}d</span>}
                          {w.status === 'future' && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Opens in {w.daysUntilStart} days · {w.windowStart.toLocaleDateString()}</span>}
                          {w.status === 'past' && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Completed</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{w.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}

function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}
