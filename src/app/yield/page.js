'use client';
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFarm } from '@/lib/FarmContext';
import { createClient } from '@/lib/supabase';

const PLATFORMS = [
  {
    id: 'fieldview',
    label: 'Climate FieldView',
    logo: '🌤',
    description: 'Export from FieldView app: Fields → select field → Export → CSV',
    expectedCols: ['Latitude','Longitude','Dry Yield','Date Time'],
    latKey: 'Latitude', lngKey: 'Longitude', yieldKey: 'Dry Yield',
  },
  {
    id: 'johndeere',
    label: 'John Deere Operations Center',
    logo: '🚜',
    description: 'Export from MyJohnDeere: Work Planner → Harvest → Export to File → CSV',
    expectedCols: ['lat','lng','yld_vol_dry','start_date'],
    latKey: 'lat', lngKey: 'lng', yieldKey: 'yld_vol_dry',
  },
  {
    id: 'generic',
    label: 'Other / Generic CSV',
    logo: '📊',
    description: 'Any CSV with yield data. You\'ll map your column names after upload.',
    expectedCols: null,
    latKey: null, lngKey: null, yieldKey: null,
  },
];

export default function YieldUploadPage() {
  const { activeFarm } = useFarm();
  const supabase = createClient();

  const [platform, setPlatform] = useState(null);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [colMapping, setColMapping] = useState({ lat: '', lng: '', yield: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [cropType, setCropType] = useState('corn');

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 6).map(l => {
        const vals = l.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i]);
        return obj;
      });
      setParsed({ headers, preview: rows, totalRows: lines.length - 1 });

      // Auto-map if known platform
      const p = PLATFORMS.find(pl => pl.id === platform);
      if (p?.latKey) {
        setColMapping({ lat: p.latKey, lng: p.lngKey, yield: p.yieldKey, date: headers.find(h => h.toLowerCase().includes('date')) || '' });
      }
    };
    reader.readAsText(f);
  };

  const save = async () => {
    if (!file || !parsed) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Upload file to storage
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { data: upload } = await supabase.storage.from('yield-files').upload(path, file);

    // Calculate basic stats from preview (full parse would happen server-side)
    const avgYield = parsed.preview
      .map(r => parseFloat(r[colMapping.yield]) || 0)
      .filter(v => v > 0)
      .reduce((a, b, _, arr) => a + b / arr.length, 0);

    await supabase.from('yield_uploads').insert({
      user_id: user.id,
      farm_id: activeFarm?.id || null,
      platform,
      season,
      crop_type: cropType,
      file_url: upload ? path : null,
      parsed_data: { headers: parsed.headers, rowCount: parsed.totalRows },
      avg_yield: avgYield || null,
      total_acres: null,
      column_mapping: colMapping,
    });

    setSaving(false);
    setSaved(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>

        <div className="section-divider">Yield Monitor Upload</div>

        {/* Step 1 — Platform */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Step 1 — Select Your Platform</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {PLATFORMS.map(p => (
              <div key={p.id} onClick={() => { setPlatform(p.id); setFile(null); setParsed(null); setSaved(false); }}
                style={{
                  padding: '18px 20px', cursor: 'pointer',
                  background: platform === p.id ? 'var(--green-glow)' : 'var(--surface)',
                  border: `1px solid ${platform === p.id ? 'var(--green)' : 'var(--border2)'}`,
                  transition: 'all 0.18s',
                }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{p.logo}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: platform === p.id ? 'var(--green)' : 'var(--text)', marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>{p.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2 — Details + Upload */}
        {platform && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Step 2 — Details & File</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
              <F label="Season / Year">
                <input className="input-base" type="text" value={season} onChange={e => setSeason(e.target.value)} placeholder="2025" />
              </F>
              <F label="Crop">
                <select className="input-base" value={cropType} onChange={e => setCropType(e.target.value)} style={{ background: 'var(--bg)' }}>
                  {['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </F>
            </div>

            <label style={{ display: 'block', cursor: 'pointer' }}>
              <div style={{
                border: `2px dashed ${file ? 'var(--green-muted)' : 'var(--border2)'}`,
                padding: '24px', textAlign: 'center',
                background: file ? 'var(--green-glow)' : 'var(--bg)',
              }}>
                {file ? (
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>📄</div>
                    <div style={{ fontSize: 12, color: 'var(--green)' }}>{file.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{parsed?.totalRows?.toLocaleString()} data rows detected</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload your yield CSV</div>
                  </>
                )}
              </div>
              <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {/* Step 3 — Column mapping (generic or auto-map preview) */}
        {parsed && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Step 3 — {platform === 'generic' ? 'Map Your Columns' : 'Confirm Column Mapping'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
              {[
                { key: 'lat', label: 'Latitude Column' },
                { key: 'lng', label: 'Longitude Column' },
                { key: 'yield', label: 'Yield Column' },
                { key: 'date', label: 'Date Column (optional)' },
              ].map(({ key, label }) => (
                <F key={key} label={label}>
                  <select className="input-base" value={colMapping[key]} onChange={e => setColMapping(p => ({ ...p, [key]: e.target.value }))} style={{ background: 'var(--bg)' }}>
                    <option value="">— Select —</option>
                    {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </F>
              ))}
            </div>

            {/* Preview table */}
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Data Preview (first 5 rows)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>
                    {parsed.headers.slice(0, 8).map(h => (
                      <th key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.preview.map((row, i) => (
                    <tr key={i}>
                      {parsed.headers.slice(0, 8).map(h => (
                        <td key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>{row[h] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save */}
        {parsed && (
          saved ? (
            <div style={{ padding: '14px 20px', background: 'rgba(74,222,128,0.1)', border: '1px solid var(--green-muted)', fontSize: 12, color: 'var(--green)' }}>
              ✓ Yield data uploaded successfully. View it in your Projection Archive to compare against AgTurbo projections.
            </div>
          ) : (
            <button className="btn-primary" onClick={save} disabled={saving || !colMapping.yield}>
              {saving ? 'Uploading...' : '↑ Upload Yield Data →'}
            </button>
          )
        )}

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
