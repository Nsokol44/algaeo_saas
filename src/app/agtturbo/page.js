'use client';
import Navbar from '@/components/layout/Navbar';
import { agturboFormula } from '@/lib/cropConfig';
import { ChartCard, MicrobeLineChart, NutrientRadarChart } from '@/components/charts/Charts';
import { Bar } from 'react-chartjs-2';

const typeColors = {
  macro: '#4ade80', micro: '#60a5fa', organic: '#fbbf24', microbe: '#a78bfa', algae: '#34d399',
};
const typeLabels = {
  macro: 'Macro Nutrient', micro: 'Micro Nutrient', organic: 'Organic / Prebiotic',
  microbe: 'Microbial Inoculant', algae: 'Microalgae Biomass',
};

const WEEKS = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10'];

const tooltipDefaults = {
  backgroundColor: '#111411', borderColor: '#252b25', borderWidth: 1,
  titleColor: '#9aab9a', bodyColor: '#e8f5e9',
  titleFont: { family: 'DM Mono', size: 10 },
  bodyFont: { family: 'DM Mono', size: 12 },
  padding: 10,
};

const crops = [
  { label: 'Corn',       emoji: '🌽', unit: 'bu/acre',       synthetic: 175,  agturbo: 198,  uplift: 13.1, costInput: 'Nitrogen ($/lb)',       profitLever: 'Bushels per Acre',  note: 'Test weight +1.5%, N replacement 20%' },
  { label: 'Soybeans',   emoji: '🫘', unit: 'bu/acre',       synthetic: 52,   agturbo: 57,   uplift: 9.6,  costInput: 'P & K Inputs',           profitLever: 'Pod Retention',     note: 'Pod abortion -8%, P&K reduction 18%' },
  { label: 'Peanuts',    emoji: '🥜', unit: 'tons/acre',     synthetic: 3.5,  agturbo: 3.85, uplift: 10.0, costInput: 'Fungicide / Calcium',    profitLever: 'TSMK % Grade',      note: 'TSMK grade +4%, fungicide savings 15%' },
  { label: 'Tomatoes',   emoji: '🍅', unit: 'tons/acre',     synthetic: 22,   agturbo: 25,   uplift: 13.6, costInput: 'Irrigation / Labor',     profitLever: 'Brix Content',      note: 'Brix +6%, irrigation reduction 22%' },
  { label: 'Berries',    emoji: '🍓', unit: 'flats/acre',    synthetic: 260,  agturbo: 295,  uplift: 13.5, costInput: 'Soil Acidifiers',        profitLever: 'Packable Yield',    note: 'Cull rate -28%, packable yield +5%' },
  { label: 'Pasture',    emoji: '🌿', unit: 'grazing days',  synthetic: 45,   agturbo: 52,   uplift: 15.6, costInput: 'Supplement Hay/Grain',   profitLever: 'Grazing Days',      note: 'Grazing +14 days, urea reduction 25%' },
  { label: 'Miscanthus', emoji: '🌾', unit: 'dry tons/acre', synthetic: 8,    agturbo: 9.1,  uplift: 12.5, costInput: 'Harvest / Baling Fuel',  profitLever: 'Dry Biomass Tons',  note: 'Dry biomass +12%, harvest efficiency +8%' },
];

function CropCard({ crop }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '18px 18px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{crop.emoji}</span>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{crop.label}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{crop.unit}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>+{crop.uplift}%</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>vs synthetic</div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 130 }}>
        <Bar
          data={{
            labels: ['Synthetic Only', 'AgTurbo™'],
            datasets: [{
              data: [crop.synthetic, crop.agturbo],
              backgroundColor: ['rgba(55,66,55,0.7)', 'rgba(74,222,128,0.75)'],
              borderColor: ['#374237', '#4ade80'],
              borderWidth: 1,
              borderRadius: 2,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                ...tooltipDefaults,
                callbacks: { label: ctx => ` ${ctx.raw} ${crop.unit}` },
              },
            },
            scales: {
              x: { grid: { color: '#1e231e' }, ticks: { color: '#6b7c6b', font: { family: 'DM Mono', size: 9 } } },
              y: { grid: { color: '#1e231e' }, ticks: { color: '#6b7c6b', font: { family: 'DM Mono', size: 9 }, maxTicksLimit: 4 }, min: Math.floor(crop.synthetic * 0.92) },
            },
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Synthetic</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-dim)' }}>{crop.synthetic}</div>
        </div>
        <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(74,222,128,0.06)', border: '1px solid var(--green-muted)' }}>
          <div style={{ fontSize: 9, color: 'var(--green-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>AgTurbo™</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{crop.agturbo}</div>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.6 }}>{crop.note}</div>
    </div>
  );
}

export default function AgTurboPage() {
  const microbeDatasets = [
    { label: 'Azospirillum', data: [20,35,55,72,85,90,92,88,82,78], borderColor: '#4ade80', backgroundColor: '#4ade8022', pointBackgroundColor: '#4ade80' },
    { label: 'Azotobacter',  data: [18,30,50,65,80,87,89,85,80,75], borderColor: '#34d399', backgroundColor: '#34d39922', pointBackgroundColor: '#34d399' },
    { label: 'Pseudomonas',  data: [15,28,45,60,75,82,85,80,76,72], borderColor: '#60a5fa', backgroundColor: '#60a5fa22', pointBackgroundColor: '#60a5fa' },
    { label: 'Bacillus',     data: [25,40,58,68,78,84,86,83,80,77], borderColor: '#fbbf24', backgroundColor: '#fbbf2422', pointBackgroundColor: '#fbbf24' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>

        <div className="section-divider">AgTurbo Formula</div>
        <div style={{ border: '1px solid var(--green-muted)', background: 'linear-gradient(135deg, var(--surface) 0%, rgba(74,222,128,0.04) 100%)', padding: 28, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>AgTurbo™ Bio-Stimulant Formula</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                19-component stack per liter — Algaeo proprietary blend •{' '}
                <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-dim)', textDecoration: 'underline' }}>algaeo.com</a>
              </div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'var(--green)', color: '#0a0c0a', padding: '5px 12px', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Proprietary</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                {typeLabels[type]}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
            {agturboFormula.map((item, i) => (
              <div key={i} style={{ background: 'var(--surface2)', padding: '14px 16px', borderLeft: `3px solid ${typeColors[item.type] || 'var(--border)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 3, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.role}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: typeColors[item.type], fontWeight: 600, marginTop: 4 }}>{item.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Small multiples */}
        <div className="section-divider">AgTurbo vs. Synthetic — By Crop</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
          Each crop uses its own scale — Peanuts and Miscanthus are just as readable as Corn and Berries.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
          {crops.map(crop => <CropCard key={crop.label} crop={crop} />)}
        </div>

        {/* Summary table */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Priority Metrics Summary</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Primary cost and profit lever per crop</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Crop','Cost Input','Profit Lever','Uplift'].map(h => (
                  <th key={h} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crops.map(c => (
                <tr key={c.label}>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--green)', fontWeight: 500 }}>{c.emoji} {c.label}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>{c.costInput}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>{c.profitLever}</td>
                  <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--green)', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>+{c.uplift}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-divider">Microbial Performance</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
          <ChartCard title="Microbial Activity Index" subtitle="Key strain activity over 10-week growing season">
            <div style={{ position: 'relative', height: 260 }}>
              <MicrobeLineChart labels={WEEKS} datasets={microbeDatasets} />
            </div>
          </ChartCard>
          <ChartCard title="Nutrient Uptake Efficiency" subtitle="N–P–K and micronutrient availability vs. synthetic fertilizer">
            <div style={{ position: 'relative', height: 260 }}>
              <NutrientRadarChart algaeoData={[92,88,85,80,82,78,75]} stdData={[75,60,70,50,55,45,40]} />
            </div>
          </ChartCard>
        </div>

      </div>
    </div>
  );
}
