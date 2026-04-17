'use client';
import Navbar from '@/components/layout/Navbar';
import { agturboFormula } from '@/lib/cropConfig';
import { ChartCard, MultiCropBarChart, MicrobeLineChart, NutrientRadarChart } from '@/components/charts/Charts';

const typeColors = {
  macro: '#4ade80', micro: '#60a5fa', organic: '#fbbf24', microbe: '#a78bfa', algae: '#34d399',
};

const typeLabels = {
  macro: 'Macro Nutrient', micro: 'Micro Nutrient', organic: 'Organic / Prebiotic',
  microbe: 'Microbial Inoculant', algae: 'Microalgae Biomass',
};

const WEEKS = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10'];

export default function AgTurboPage() {
  const cropLabels = ['Corn','Soybeans','Peanuts','Tomatoes','Berries','Pasture','Miscanthus'];
  const synthetic  = [175, 52, 3.5, 22, 260, 45, 8];
  const agturbo    = [198, 57, 3.85, 25, 295, 52, 9.1];

  const microbeDatasets = [
    { label: 'Azospirillum', data: [20,35,55,72,85,90,92,88,82,78], borderColor: '#4ade80', backgroundColor: '#4ade8022', pointBackgroundColor: '#4ade80' },
    { label: 'Azotobacter', data: [18,30,50,65,80,87,89,85,80,75], borderColor: '#34d399', backgroundColor: '#34d39922', pointBackgroundColor: '#34d399' },
    { label: 'Pseudomonas',  data: [15,28,45,60,75,82,85,80,76,72], borderColor: '#60a5fa', backgroundColor: '#60a5fa22', pointBackgroundColor: '#60a5fa' },
    { label: 'Bacillus',     data: [25,40,58,68,78,84,86,83,80,77], borderColor: '#fbbf24', backgroundColor: '#fbbf2422', pointBackgroundColor: '#fbbf24' },
  ];

  const nutrientAlgaeo = [92, 88, 85, 80, 82, 78, 75];
  const nutrientStd    = [75, 60, 70, 50, 55, 45, 40];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div className="section-divider">AgTurbo Formula</div>
        <div style={{
          border: '1px solid var(--green-muted)',
          background: 'linear-gradient(135deg, var(--surface) 0%, rgba(74,222,128,0.04) 100%)',
          padding: 28, marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>AgTurbo™ Bio-Stimulant Formula</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Complete ingredient stack per liter — Algaeo proprietary blend •{' '}
                <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-dim)', textDecoration: 'underline' }}>algaeo.com</a>
              </div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'var(--green)', color: '#0a0c0a', padding: '5px 12px', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
              Proprietary
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                {typeLabels[type]}
              </div>
            ))}
          </div>

          {/* Formula Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
            {agturboFormula.map((item, i) => (
              <div key={i} style={{ background: 'var(--surface2)', padding: '14px 16px', borderLeft: `3px solid ${typeColors[item.type] || 'var(--border)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 3, fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{item.role}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: typeColors[item.type], fontWeight: 600, marginTop: 4 }}>{item.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Charts */}
        <div className="section-divider">AgTurbo vs. Synthetic — Performance Comparison</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
          <ChartCard title="Yield Comparison by Crop" subtitle="AgTurbo vs. synthetic-only approach across all supported crops"
            legend={[{ label: 'AgTurbo', color: '#4ade80' }, { label: 'Synthetic Only', color: '#374237' }]}>
            <div style={{ position: 'relative', height: 260 }}>
              <MultiCropBarChart labels={cropLabels} algaeoData={agturbo} stdData={synthetic} />
            </div>
          </ChartCard>

          <ChartCard title="Microbial Activity Index" subtitle="Key strain activity over 10-week growing season">
            <div style={{ position: 'relative', height: 260 }}>
              <MicrobeLineChart labels={WEEKS} datasets={microbeDatasets} />
            </div>
          </ChartCard>

          <ChartCard title="Nutrient Uptake Efficiency" subtitle="N–P–K and micronutrient availability vs. synthetic fertilizer">
            <div style={{ position: 'relative', height: 260 }}>
              <NutrientRadarChart algaeoData={nutrientAlgaeo} stdData={nutrientStd} />
            </div>
          </ChartCard>

          {/* Summary Table */}
          <div className="card">
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Priority Metrics Summary</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Primary cost and profit lever per crop</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['Crop','Cost Input','Profit Lever'].map(h => (
                    <th key={h} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Corn', 'Nitrogen ($/lb)', 'Bushels per Acre'],
                  ['Soybeans', 'P & K Inputs', 'Pod Retention'],
                  ['Peanuts', 'Fungicide / Calcium', 'TSMK % Grade'],
                  ['Miscanthus', 'Harvest / Baling Fuel', 'Dry Biomass Tons'],
                  ['Pasture', 'Supplement Hay/Grain', 'Grazing Days'],
                  ['Tomatoes', 'Irrigation / Labor', 'Brix Content'],
                  ['Berries', 'Soil Acidifiers', 'Packable Yield'],
                ].map(([crop, cost, lever]) => (
                  <tr key={crop}>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--green)', fontWeight: 500 }}>{crop}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>{cost}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>{lever}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
