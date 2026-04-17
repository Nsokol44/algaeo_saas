'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { cropConfig, hempMarketConfig, fmt } from '@/lib/cropConfig';
import { ChartCard, YieldLineChart, CostLineChart, ROILineChart, LeverBarChart } from '@/components/charts/Charts';
import TreatmentRates from '@/components/ui/TreatmentRates';
import { createClient } from '@/lib/supabase';
import { useFarm } from '@/lib/FarmContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EXTRA_CROPS = {
  hemp: {
    label: 'Hemp', emoji: '🌿', bundle: 'specialty',
    // inputs and kpis come from hempMarketConfig[hempMarket]
  },
  cannabis: {
    label: 'Cannabis', emoji: '🌱', bundle: 'specialty',
    inputs: [
      { id: 'plants',    label: 'Plant Count',    unit: 'plants',  val: 500  },
      { id: 'inputCost', label: 'Input Cost',     unit: '$/plant', val: 28   },
      { id: 'yield',     label: 'Current Yield',  unit: 'g/plant', val: 85   },
      { id: 'price',     label: 'Wholesale Price',unit: '$/g',     val: 1.20 },
    ],
    kpis: (v) => {
      const plants = v.plants || 500; const inputCost = v.inputCost || 28;
      const yield_ = v.yield || 85; const price = v.price || 1.20;
      const yieldGain   = plants * yield_ * 0.12 * price;
      const premiumGain = plants * yield_ * price * 0.08;
      const inputSav    = plants * inputCost * 0.20;
      const total       = yieldGain + premiumGain + inputSav;
      return [
        { label: 'Yield Gain (g/plant)', val: fmt(yieldGain),   delta: '+12% grams per plant', green: true, highlight: true },
        { label: 'Quality Premium',       val: fmt(premiumGain), delta: '+8% $/g from terpene & cannabinoid uplift' },
        { label: 'Input Savings',         val: fmt(inputSav),    delta: '20% reduction — Azotobacter N-fix' },
        { label: 'Total ROI',             val: fmt(total),       delta: 'Net Algaeo benefit per cycle', green: true },
      ];
    },
    leverTitle: 'Cannabinoid & Terpene Accumulation',
    leverSub: 'Total cannabinoid % over flower development — AgTurbo vs standard',
    leverLabels: ['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8'],
    leverAlgaeo: [2, 4, 7, 11, 16, 20, 23, 24],
    leverStd:    [2, 3, 6,  9, 13, 16, 19, 20],
    yieldUnit: 'g/plant',
  },
};

const ALL_CROPS = { ...cropConfig, ...EXTRA_CROPS };

export default function Dashboard() {
  const [crop, setCrop] = useState('corn');
  const [hempMarket, setHempMarket] = useState('cbd_flower');
  const [inputs, setInputs] = useState({});
  const [saved, setSaved] = useState(false);
  const { activeFarm } = useFarm();
  const supabase = createClient();

  const cfg = crop === 'hemp'
    ? { ...EXTRA_CROPS.hemp, ...hempMarketConfig[hempMarket], inputs: hempMarketConfig[hempMarket].inputOverrides }
    : ALL_CROPS[crop];

  useEffect(() => {
    const init = {};
    (cfg.inputs || []).forEach(inp => { init[inp.id] = inp.val; });
    setInputs(init);
    setSaved(false);
  }, [crop, hempMarket]);

  const v = { ...inputs };
  (cfg.inputs || []).forEach(inp => { if (!v[inp.id]) v[inp.id] = inp.val; });

  const kpis = cfg.kpis ? cfg.kpis(v) : [];
  const baseVal = v.yield || v.plants || 50;
  const stdYield = MONTHS.map(() => Math.round(baseVal * (0.85 + Math.random() * 0.05)));
  const algYield = stdYield.map(n => Math.round(n * 1.115));
  const baseCost = (v.inputCost || v.nCost || v.pkCost || v.fungCost || v.waterCost || v.hayPrice || v.harvestCost || 60) * (v.acres || v.plants || 200);
  const stdCost  = MONTHS.map((_, i) => Math.round(baseCost * (1 - i * 0.002)));
  const algCost  = stdCost.map((n, i) => Math.round(n * (0.78 - i * 0.003)));
  let cumRoi = 0;
  const roiData = MONTHS.map(() => { cumRoi += Math.round(Math.random() * 900 + 400); return cumRoi; });

  const saveProjection = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from('crop_projections').insert({
      user_id: session.user.id,
      farm_id: activeFarm?.id || null,
      crop_type: crop === 'hemp' ? `hemp_${hempMarket}` : crop,
      inputs: v,
      outputs: kpis,
      created_at: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Active farm banner */}
        {activeFarm && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--green)' }}>▶ {activeFarm.nickname || activeFarm.name}</span>
            {activeFarm.state && <span>{activeFarm.state}{activeFarm.county ? ` · ${activeFarm.county}` : ''}</span>}
            {activeFarm.soil_type && <span>Soil: {activeFarm.soil_type.replace('_',' ')}</span>}
            {activeFarm.usda_zone && <span>Zone {activeFarm.usda_zone}</span>}
            {activeFarm.irrigation_type && <span>Irrigation: {activeFarm.irrigation_type.replace('_',' ')}</span>}
          </div>
        )}

        {/* Crop selector */}
        <div className="section-divider">Crop Selection</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {Object.entries(ALL_CROPS).map(([key, c]) => (
            <button key={key} onClick={() => setCrop(key)} style={{
              padding: '7px 16px',
              border: `1px solid ${crop === key ? 'var(--green)' : 'var(--border2)'}`,
              background: crop === key ? 'var(--green-glow)' : 'var(--surface)',
              color: crop === key ? 'var(--green)' : 'var(--text-muted)',
              fontFamily: 'DM Mono, monospace', fontSize: 11,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Hemp sub-market switcher */}
        {crop === 'hemp' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--green-muted)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Hemp Market</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(hempMarketConfig).map(([key, mc]) => (
                <button key={key} onClick={() => setHempMarket(key)} style={{
                  padding: '6px 16px', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
                  border: `1px solid ${hempMarket === key ? 'var(--green)' : 'var(--border2)'}`,
                  background: hempMarket === key ? 'var(--green-glow)' : 'var(--bg)',
                  color: hempMarket === key ? 'var(--green)' : 'var(--text-muted)',
                  transition: 'all 0.18s',
                }}>
                  {mc.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {hempMarketConfig[hempMarket].label} inputs & projections shown below
            </div>
          </div>
        )}

        {/* Cannabis regulatory note */}
        {crop === 'cannabis' && (
          <div style={{ marginBottom: 24, padding: '10px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)', fontSize: 11, color: 'var(--amber)', lineHeight: 1.6 }}>
            ⚠ Cannabis projections are for licensed operators only. Verify compliance with your state regulations before applying any inputs.
          </div>
        )}

        {/* Inputs */}
        <div className="section-divider">Field Inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 32 }}>
          {(cfg.inputs || []).map(inp => (
            <div key={inp.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{inp.label}</div>
              <input className="input-base" type="number" value={inputs[inp.id] ?? inp.val}
                onChange={e => setInputs(prev => ({ ...prev, [inp.id]: parseFloat(e.target.value) || 0 }))} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inp.unit}</div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-primary" onClick={saveProjection}>
              {saved ? '✓ Saved' : 'Save Projection'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="section-divider">Projection Output</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {kpis.map((k, i) => (
            <div key={i} className={`kpi-card${k.highlight ? ' highlight' : ''}`}>
              {k.tag && <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'var(--green-muted)', color: 'var(--green)', padding: '3px 8px' }}>{k.tag}</div>}
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: -1, color: k.green ? 'var(--green)' : k.amber ? 'var(--amber)' : 'var(--text)' }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--green-dim)', marginTop: 4 }}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* Treatment Rates */}
        <div className="section-divider">AgTurbo Application Guide</div>
        <TreatmentRates cropType={crop === 'hemp' ? 'hemp' : crop} />

        {/* Charts */}
        <div className="section-divider">Forecast Charts</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
          <ChartCard title="Yield Projection" subtitle="Standard vs. Algaeo — 12 Months"
            legend={[{ label: 'Algaeo', color: '#4ade80' }, { label: 'Standard', color: '#374237' }]}>
            <YieldLineChart labels={MONTHS} algaeoData={algYield} stdData={stdYield} />
          </ChartCard>
          <ChartCard title="Input Cost Reduction" subtitle="Spend over time with Algaeo protocol"
            legend={[{ label: 'Without Algaeo', color: '#f87171' }, { label: 'With Algaeo', color: '#60a5fa' }]}>
            <CostLineChart labels={MONTHS} withData={algCost} withoutData={stdCost} />
          </ChartCard>
          <ChartCard title="ROI Accumulation" subtitle="Cumulative net return from Algaeo investment">
            <ROILineChart labels={MONTHS} data={roiData} />
          </ChartCard>
          {cfg.leverLabels && (
            <ChartCard title={cfg.leverTitle} subtitle={cfg.leverSub}
              legend={[{ label: 'With Algaeo', color: '#4ade80' }, { label: 'Without Algaeo', color: '#374237' }]}>
              <LeverBarChart labels={cfg.leverLabels} algaeoData={cfg.leverAlgaeo} stdData={cfg.leverStd} />
            </ChartCard>
          )}
        </div>

      </div>
    </div>
  );
}
