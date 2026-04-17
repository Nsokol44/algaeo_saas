'use client';
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { ChartCard, SavingsBarChart } from '@/components/charts/Charts';
import { fmt } from '@/lib/cropConfig';

export default function CalculatorPage() {
  const [acres, setAcres] = useState(500);
  const [nCost, setNCost] = useState(0.65);
  const [nLbs, setNLbs] = useState(140);
  const [algCost, setAlgCost] = useState(14);

  const nSavings = acres * nLbs * nCost * 0.20;
  const algTotal = acres * algCost;
  const net = nSavings - algTotal;
  const roi = algTotal > 0 ? (nSavings / algTotal).toFixed(2) + 'x' : '—';

  const years = ['Year 1','Year 2','Year 3','Year 4','Year 5'];
  let cum = 0;
  const cumData = years.map((_, i) => {
    const inflated = nSavings * Math.pow(1.03, i);
    cum += inflated - algTotal;
    return Math.round(cum);
  });

  const InputRow = ({ label, unit, value, setter }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      <input
        className="input-base"
        type="number"
        value={value}
        onChange={e => setter(parseFloat(e.target.value) || 0)}
      />
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{unit}</div>
    </div>
  );

  const kpis = [
    { label: 'Annual N Savings', val: fmt(nSavings), delta: '20% synthetic N replaced', green: true, highlight: true },
    { label: 'Algaeo Investment', val: fmt(algTotal), delta: 'Full-season treatment cost' },
    { label: 'Net Savings', val: fmt(net), delta: 'After Algaeo cost', green: net > 0, red: net < 0, highlight: true },
    { label: 'ROI Multiple', val: roi, delta: 'Return on Algaeo spend', amber: true },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 1000, margin: '0 auto' }}>

        <div className="section-divider">Cost-Savings Calculator</div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 32 }}>
          <InputRow label="Field Size" unit="acres" value={acres} setter={setAcres} />
          <InputRow label="N Cost" unit="$/lb nitrogen" value={nCost} setter={setNCost} />
          <InputRow label="N Applied" unit="lbs/acre (corn avg 140)" value={nLbs} setter={setNLbs} />
          <InputRow label="Algaeo Cost" unit="$/acre (AgTurbo)" value={algCost} setter={setAlgCost} />
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {kpis.map((k, i) => (
            <div key={i} className={`kpi-card${k.highlight ? ' highlight' : ''}`}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: -1, color: k.green ? 'var(--green)' : k.amber ? 'var(--amber)' : k.red ? '#f87171' : 'var(--text)' }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--green-dim)', marginTop: 4 }}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* 5-year chart */}
        <ChartCard title="5-Year Cumulative Savings Projection" subtitle="Assumes 3% annual nitrogen price inflation and consistent Algaeo application">
          <div style={{ position: 'relative', height: 280 }}>
            <SavingsBarChart labels={years} data={cumData} />
          </div>
        </ChartCard>

        {/* Assumptions note */}
        <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Model Assumptions: </span>
          Algaeo AgTurbo replaces 20% of synthetic nitrogen input. Yield uplift from test weight improvement not included in this calculator (see Projections tab). 
          3% annual nitrogen cost inflation applied to years 2–5. Results are estimates based on academic soil benchmarks. 
          Visit <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', textDecoration: 'underline' }}>algaeo.com</a> for product details.
        </div>

      </div>
    </div>
  );
}
