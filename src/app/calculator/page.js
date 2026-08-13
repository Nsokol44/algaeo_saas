'use client';
import{useState}from'react';
import Navbar from'@/components/layout/Navbar';
import{ChartCard,SavingsBarChart}from'@/components/charts/Charts';
import{fmt}from'@/lib/cropConfig';
export default function CalculatorPage(){
  const[acres,setAcres]=useState(500);
  const[nCost,setNCost]=useState(0.65);
  const[nLbs,setNLbs]=useState(140);
  const[algCost,setAlgCost]=useState(14);
  const nSavings=acres*nLbs*nCost*0.20,algTotal=acres*algCost,net=nSavings-algTotal,roi=algTotal>0?(nSavings/algTotal).toFixed(2)+'x':'—';
  const years=['Year 1','Year 2','Year 3','Year 4','Year 5'];
  let cum=0;const cumData=years.map((_,i)=>{cum+=(nSavings*Math.pow(1.03,i))-algTotal;return Math.round(cum);});
  const kpis=[{label:'Annual N Savings',val:fmt(nSavings),delta:'20% synthetic N replaced',green:true,highlight:true},{label:'Algaeo Investment',val:fmt(algTotal),delta:'Full-season treatment cost'},{label:'Net Savings',val:fmt(net),delta:'After Algaeo cost',green:net>0,highlight:true},{label:'ROI Multiple',val:roi,delta:'Return on Algaeo spend',amber:true}];
  return(<div style={{minHeight:'100vh',background:'var(--bg)'}}><Navbar/><div style={{padding:'32px',maxWidth:1000,margin:'0 auto'}}>
    <div className="section-divider">Cost-Savings Calculator</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,padding:24,background:'var(--surface)',border:'1px solid var(--border)',marginBottom:32}}>
      {[['Field Size','acres',acres,setAcres],['N Cost','$/lb',nCost,setNCost],['N Applied','lbs/acre',nLbs,setNLbs],['Algaeo Cost','$/acre (AgTurbo)',algCost,setAlgCost]].map(([l,u,v,s])=><div key={l} style={{display:'flex',flexDirection:'column',gap:6}}><div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)'}}>{l}</div><input className="input-base" type="number" value={v} onChange={e=>s(parseFloat(e.target.value)||0)}/><div style={{fontSize:10,color:'var(--text-muted)'}}>{u}</div></div>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:32}}>
      {kpis.map((k,i)=><div key={i} className={`kpi-card${k.highlight?' highlight':''}`}><div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8}}>{k.label}</div><div style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:700,letterSpacing:-1,color:k.green?'var(--green)':k.amber?'var(--amber)':'var(--text)'}}>{k.val}</div><div style={{fontSize:11,color:'var(--green-dim)',marginTop:4}}>{k.delta}</div></div>)}
    </div>
    <ChartCard title="5-Year Cumulative Savings Projection" subtitle="Assumes 3% annual nitrogen price inflation"><div style={{position:'relative',height:280}}><SavingsBarChart labels={years} data={cumData}/></div></ChartCard>
    <div style={{marginTop:20,padding:'16px 20px',background:'var(--surface)',border:'1px solid var(--border)',fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>
      <span style={{color:'var(--text-dim)',fontWeight:500}}>Model Assumptions: </span>AgTurbo replaces 20% of synthetic nitrogen. Application rate ~1.4L/acre at $10/L = $14/acre. 3% annual N cost inflation applied to years 2–5. Visit <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{color:'var(--green)',textDecoration:'underline'}}>algaeo.com</a> for product details.
    </div>
  </div></div>);
}
