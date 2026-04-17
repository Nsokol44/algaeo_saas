'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const METHOD_LABELS = {
  foliar: 'Foliar Spray',
  soil_drench: 'Soil Drench',
  seed_treatment: 'Seed Treatment',
  fertigation: 'Fertigation',
  in_furrow: 'In-Furrow',
};

const METHOD_COLORS = {
  foliar: '#4ade80',
  soil_drench: '#60a5fa',
  seed_treatment: '#fbbf24',
  fertigation: '#a78bfa',
  in_furrow: '#34d399',
};

export default function TreatmentRates({ cropType }) {
  const [rates, setRates] = useState([]);
  const [activeMethod, setActiveMethod] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    if (!cropType) return;
    const key = cropType === 'soy' ? 'soybeans' : cropType;
    supabase
      .from('treatment_rates')
      .select('*')
      .eq('crop_type', key)
      .then(({ data }) => {
        setRates(data || []);
        if (data?.length) setActiveMethod(data[0].method);
      });
  }, [cropType]);

  const methods = [...new Set(rates.map(r => r.method))];
  const active = rates.filter(r => r.method === activeMethod);

  if (!rates.length) return null;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>AgTurbo Treatment Rates</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Application method, dilution, and timing guide</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {methods.map(m => (
            <button key={m} onClick={() => setActiveMethod(m)} style={{
              padding: '5px 12px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
              border: `1px solid ${activeMethod === m ? METHOD_COLORS[m] : 'var(--border2)'}`,
              background: activeMethod === m ? `${METHOD_COLORS[m]}18` : 'var(--bg)',
              color: activeMethod === m ? METHOD_COLORS[m] : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'DM Mono, monospace',
            }}>
              {METHOD_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {active.map((r, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 1, background: 'var(--border)', border: '1px solid var(--border)',
          marginBottom: i < active.length - 1 ? 12 : 0,
        }}>
          {[
            { label: 'Growth Stage', val: r.growth_stage || '—' },
            { label: 'Dilution Ratio', val: r.dilution_ratio || '—' },
            { label: 'Rate (oz/acre)', val: r.rate_oz_per_acre ? `${r.rate_oz_per_acre} oz` : '—' },
            { label: 'Rate (mL/acre)', val: r.rate_ml_per_acre ? `${r.rate_ml_per_acre} mL` : '—' },
            { label: 'Frequency', val: r.frequency || '—' },
            { label: 'Cost/Acre', val: r.cost_per_acre_usd ? `$${r.cost_per_acre_usd}` : '—', green: true },
          ].map(cell => (
            <div key={cell.label} style={{ background: 'var(--surface2)', padding: '12px 14px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{cell.label}</div>
              <div style={{ fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 600, color: cell.green ? 'var(--green)' : 'var(--text)' }}>{cell.val}</div>
            </div>
          ))}
          <div style={{ background: 'var(--surface2)', padding: '12px 14px', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Application Notes</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>{r.timing_notes}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
