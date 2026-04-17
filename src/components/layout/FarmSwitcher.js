'use client';
import { useState } from 'react';
import { useFarm } from '@/lib/FarmContext';

const SOIL_TYPES = ['clay','loam','sandy_loam','silt','silt_loam','sandy','peat','chalk'];
const IRRIGATION = ['drip','pivot','flood','rain_fed','furrow','overhead'];
const CROPS = ['Corn','Soybeans','Peanuts','Tomatoes','Berries','Pasture','Miscanthus','Wheat'];
const ZONES = ['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'];

export default function FarmSwitcher() {
  const { farms, activeFarm, setActiveFarm, addFarm, deleteFarm } = useFarm();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', nickname: '', state: '', county: '', usda_zone: '',
    soil_type: 'loam', avg_rainfall_in: '', irrigation_type: 'rain_fed',
    primary_crops: [], notes: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleCrop = (c) => {
    set('primary_crops', form.primary_crops.includes(c)
      ? form.primary_crops.filter(x => x !== c)
      : [...form.primary_crops, c]);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    await addFarm(form);
    setSaving(false);
    setShowModal(false);
    setForm({ name:'',nickname:'',state:'',county:'',usda_zone:'',soil_type:'loam',avg_rainfall_in:'',irrigation_type:'rain_fed',primary_crops:[],notes:'' });
  };

  return (
    <>
      {/* Switcher pill */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowDropdown(p => !p)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace',
          fontSize: 11, padding: '6px 12px', cursor: 'pointer',
        }}>
          <span style={{ color: 'var(--green)', fontSize: 10 }}>▶</span>
          {activeFarm ? (activeFarm.nickname || activeFarm.name) : 'No Farm'}
          {activeFarm?.state && <span style={{ color: 'var(--text-muted)' }}>— {activeFarm.state}</span>}
          <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>▾</span>
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            minWidth: 220, zIndex: 100,
          }}>
            {farms.map(f => (
              <div key={f.id} onClick={() => { setActiveFarm(f); setShowDropdown(false); }}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 12,
                  color: f.id === activeFarm?.id ? 'var(--green)' : 'var(--text-dim)',
                  background: f.id === activeFarm?.id ? 'var(--green-glow)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <span>{f.nickname || f.name}{f.state ? ` — ${f.state}` : ''}</span>
                {farms.length > 1 && (
                  <span onClick={e => { e.stopPropagation(); deleteFarm(f.id); }}
                    style={{ color: '#f87171', fontSize: 10, marginLeft: 8, cursor: 'pointer' }}>✕</span>
                )}
              </div>
            ))}
            <div onClick={() => { setShowDropdown(false); setShowModal(true); }}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 11, color: 'var(--green)', letterSpacing: '0.06em' }}>
              + Add Farm
            </div>
          </div>
        )}
      </div>

      {/* Add Farm Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Add New Farm</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Row>
                <F label="Farm Name *"><input className="input-base" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sunrise Acres" /></F>
                <F label="Nickname"><input className="input-base" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Home Farm" /></F>
              </Row>
              <Row>
                <F label="State"><input className="input-base" value={form.state} onChange={e => set('state', e.target.value)} placeholder="Iowa" /></F>
                <F label="County"><input className="input-base" value={form.county} onChange={e => set('county', e.target.value)} placeholder="Story County" /></F>
              </Row>
              <Row>
                <F label="USDA Zone">
                  <select className="input-base" value={form.usda_zone} onChange={e => set('usda_zone', e.target.value)} style={{ background: 'var(--bg)' }}>
                    <option value="">Select zone</option>
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </F>
                <F label="Soil Type">
                  <select className="input-base" value={form.soil_type} onChange={e => set('soil_type', e.target.value)} style={{ background: 'var(--bg)' }}>
                    {SOIL_TYPES.map(s => <option key={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </F>
              </Row>
              <Row>
                <F label="Avg Rainfall (in/yr)"><input className="input-base" type="number" value={form.avg_rainfall_in} onChange={e => set('avg_rainfall_in', e.target.value)} placeholder="36" /></F>
                <F label="Irrigation Type">
                  <select className="input-base" value={form.irrigation_type} onChange={e => set('irrigation_type', e.target.value)} style={{ background: 'var(--bg)' }}>
                    {IRRIGATION.map(i => <option key={i}>{i.replace('_', ' ')}</option>)}
                  </select>
                </F>
              </Row>

              <F label="Primary Crops">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {CROPS.map(c => (
                    <button key={c} onClick={() => toggleCrop(c)} style={{
                      padding: '5px 12px', fontSize: 11,
                      border: `1px solid ${form.primary_crops.includes(c) ? 'var(--green)' : 'var(--border2)'}`,
                      background: form.primary_crops.includes(c) ? 'var(--green-glow)' : 'var(--bg)',
                      color: form.primary_crops.includes(c) ? 'var(--green)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                    }}>{c}</button>
                  ))}
                </div>
              </F>

              <F label="Notes"><textarea className="input-base" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Tile drained, no-till 3 years, history of soybean cyst nematode..." style={{ resize: 'vertical', minHeight: 72 }} /></F>

              <button className="btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
                {saving ? 'Saving...' : 'Save Farm →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}
function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}
