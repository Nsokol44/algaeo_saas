'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { cropConfig, hempMarketConfig, fmt } from '@/lib/cropConfig';
import { ChartCard, YieldLineChart, CostLineChart, ROILineChart, LeverBarChart } from '@/components/charts/Charts';
import TreatmentRates from '@/components/ui/TreatmentRates';
import { createClient } from '@/lib/supabase';
import { useFarm } from '@/lib/FarmContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Container dosing data ────────────────────────────────────────────────────
// Source: Algaeo session protocol — commercial cannabis grower (486 plants)
// Apply on lowest-EC day of the week. Never same day as silica.
const POT_SIZES = [
  { label: '1 gal',  gal: 1,  ml: 35  },
  { label: '2 gal',  gal: 2,  ml: 70  },
  { label: '3 gal',  gal: 3,  ml: 105 },
  { label: '5 gal',  gal: 5,  ml: 150 },
  { label: '7 gal',  gal: 7,  ml: 210 },
  { label: '10 gal', gal: 10, ml: 280 },
  { label: '15 gal', gal: 15, ml: 400 },
  { label: '25 gal', gal: 25, ml: 600 },
];

const FREQ_OPTIONS = [
  { id: 'daily',     label: 'Daily',           daysPerWeek: 7  },
  { id: 'eod',       label: 'Every other day', daysPerWeek: 3.5 },
  { id: 'every3',    label: 'Every 3 days',    daysPerWeek: 2.33 },
  { id: 'weekly',    label: 'Weekly',          daysPerWeek: 1  },
];

// Algaeo application frequency: once per week regardless of fertigation frequency
// Apply on the lowest-EC day — biology receptivity is highest when salt load is lowest
const ALGAEO_APPS_PER_WEEK = 1;
const SEASON_WEEKS = 14; // avg veg + flower cycle

function ContainerCalculator() {
  const [potSize,    setPotSize]    = useState('5 gal');
  const [plantCount, setPlantCount] = useState(100);
  const [fertigFreq, setFertigFreq] = useState('eod');

  const pot   = POT_SIZES.find(p => p.label === potSize) || POT_SIZES[3];
  const freq  = FREQ_OPTIONS.find(f => f.id === fertigFreq) || FREQ_OPTIONS[1];

  const mlPerPlantPerApp   = pot.ml;
  const mlPerAppTotal      = mlPerPlantPerApp * plantCount;
  const appsPerWeek        = ALGAEO_APPS_PER_WEEK;
  const mlPerWeek          = mlPerAppTotal * appsPerWeek;
  const litersPerWeek      = mlPerWeek / 1000;
  const litersPerSeason    = litersPerWeek * SEASON_WEEKS;
  const fertigEventsPerWeek = freq.daysPerWeek;
  const algaeoRatio        = (appsPerWeek / fertigEventsPerWeek * 100).toFixed(0);

  const label10 = {
    fontSize: 10, color: 'var(--text-muted)',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
            Container Dosing Calculator
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Apply Algaeo <strong style={{ color: 'var(--green)' }}>once per week</strong> on your lowest-EC fertigation day — never same day as silica.
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border2)', padding: '6px 12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Liquid Format Only
        </div>
      </div>

      {/* Inputs row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Pot size */}
        <div>
          <div style={label10}>Pot Size</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {POT_SIZES.map(p => (
              <button key={p.label} onClick={() => setPotSize(p.label)} style={{
                padding: '6px 10px', fontSize: 10, cursor: 'pointer',
                fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em',
                border: `1px solid ${potSize === p.label ? 'var(--green)' : 'var(--border2)'}`,
                background: potSize === p.label ? 'var(--green-muted)' : 'var(--bg)',
                color: potSize === p.label ? 'var(--green)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plant count */}
        <div>
          <div style={label10}>Plant Count</div>
          <input
            className="input-base"
            type="number"
            value={plantCount}
            onChange={e => setPlantCount(parseInt(e.target.value) || 1)}
            style={{ marginBottom: 4 }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>plants</div>
        </div>

        {/* Fertigation frequency */}
        <div>
          <div style={label10}>Fertigation Frequency</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FREQ_OPTIONS.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="fertigFreq"
                  value={f.id}
                  checked={fertigFreq === f.id}
                  onChange={() => setFertigFreq(f.id)}
                  style={{ accentColor: 'var(--green)' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Per Plant / Application', value: `${mlPerPlantPerApp} mL`,          sub: `${pot.label} pot`,              color: 'var(--green)', highlight: true },
          { label: 'Per Application Total',   value: `${(mlPerAppTotal/1000).toFixed(1)} L`, sub: `${plantCount} plants`,     color: 'var(--text)' },
          { label: 'Per Week',                value: `${litersPerWeek.toFixed(2)} L`,    sub: '1 application/week',            color: 'var(--text)' },
          { label: 'Full Season (14 wks)',     value: `${litersPerSeason.toFixed(1)} L`, sub: 'veg + flower cycle',            color: 'var(--amber)' },
          { label: 'Algaeo / Fertigation %',  value: `${algaeoRatio}%`,                  sub: `of ${freq.label.toLowerCase()} events`, color: 'var(--blue)' },
        ].map(k => (
          <div key={k.label} className={`kpi-card${k.highlight ? ' highlight' : ''}`}>
            <div style={label10}>{k.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Protocol notes */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border2)', padding: '14px 18px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Application Protocol
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { icon: '✓', color: 'var(--green)', text: `Apply on your lowest-EC day — plain water or flush days have highest biology receptivity` },
            { icon: '✓', color: 'var(--green)', text: `Kelp compatible — mix Algaeo directly into kelp solution at 1:15 ratio` },
            { icon: '✓', color: 'var(--green)', text: `Great White mycorrhizal compatible — different ecological layers, no conflict` },
            { icon: '✓', color: 'var(--green)', text: `Dosatron compatible — inject inline at 1:100 on drip lines` },
            { icon: '⚠', color: 'var(--amber)', text: `Silica: apply separately — silica raises pH and conflicts with biology. Do silica day 1, Algaeo day 2` },
            { icon: '⚠', color: 'var(--amber)', text: `Stop applications at flush / late flower (final 1–2 weeks)` },
          ].map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              <span style={{ color: n.color, flexShrink: 0, fontWeight: 700 }}>{n.icon}</span>
              {n.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Extra crops ──────────────────────────────────────────────────────────────
const EXTRA_CROPS = {
  hemp: {
    label: 'Hemp', emoji: '🌿', bundle: 'specialty',
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

// ─── Main dashboard ───────────────────────────────────────────────────────────
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

        {/* ── Container Dosing Calculator — cannabis only ── */}
        {crop === 'cannabis' && (
          <>
            <div className="section-divider">Container Dosing Calculator</div>
            <ContainerCalculator />
          </>
        )}

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
