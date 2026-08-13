'use client';
import{useState,useEffect}from'react';
import Navbar from'@/components/layout/Navbar';
import{useFarm}from'@/lib/FarmContext';
import{createClient}from'@/lib/supabase';
import{generateFieldReport}from'@/lib/pdfReport';
import{cropConfig}from'@/lib/cropConfig';
const CROP_EMOJI={corn:'🌽',soybeans:'🫘',peanuts:'🥜',tomatoes:'🍅',berries:'🍓',pasture:'🌿',miscanthus:'🌾',hemp:'🌿',cannabis:'🌱'};
export default function ArchivePage(){
  const{activeFarm,farms}=useFarm();const supabase=createClient();
  const[projections,setProjections]=useState([]);const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState('all');const[expandedId,setExpandedId]=useState(null);
  const[generatingPdf,setGeneratingPdf]=useState(null);const[preparedFor,setPreparedFor]=useState('');const[showPdfModal,setShowPdfModal]=useState(null);
  useEffect(()=>{load();},[activeFarm]);
  const load=async()=>{setLoading(true);const{data:{user}}=await supabase.auth.getUser();if(!user)return;let q=supabase.from('crop_projections').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(activeFarm)q=q.eq('farm_id',activeFarm.id);const{data}=await q;setProjections(data||[]);setLoading(false);};
  const crops=['all',...new Set(projections.map(p=>p.crop_type))];
  const filtered=filter==='all'?projections:projections.filter(p=>p.crop_type===filter);
  const grouped=filtered.reduce((g,p)=>{const y=new Date(p.created_at).getFullYear();if(!g[y])g[y]=[];g[y].push(p);return g;},{});
  const downloadPdf=async(proj)=>{
    setGeneratingPdf(proj.id);const cfg=cropConfig[proj.crop_type];const farm=farms.find(f=>f.id===proj.farm_id)||activeFarm;const{data:{user}}=await supabase.auth.getUser();
    await generateFieldReport({farmName:farm?.name||'My Farm',farmerName:user?.user_metadata?.first_name?`${user.user_metadata.first_name} ${user.user_metadata.last_name||''}`.trim():'',state:farm?.state||'',county:farm?.county||'',soilType:farm?.soil_type||'',usdaZone:farm?.usda_zone||'',cropLabel:cfg?.label||proj.crop_type,acres:proj.inputs?.acres||'—',plantedDate:null,kpis:Array.isArray(proj.outputs)?proj.outputs:[],treatmentSchedule:[],soilScore:null,preparedFor:preparedFor||''});
    setGeneratingPdf(null);setShowPdfModal(null);
  };
  return(<div style={{minHeight:'100vh',background:'var(--bg)'}}><Navbar/><div style={{padding:'32px',maxWidth:1000,margin:'0 auto'}}>
    <div className="section-divider">Projection Archive</div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>
      {crops.map(c=><button key={c} onClick={()=>setFilter(c)} style={{padding:'5px 14px',fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',border:`1px solid ${filter===c?'var(--green)':'var(--border2)'}`,background:filter===c?'var(--green-glow)':'var(--surface)',color:filter===c?'var(--green)':'var(--text-muted)',cursor:'pointer',fontFamily:'DM Mono,monospace'}}>{c==='all'?'All Crops':`${CROP_EMOJI[c]||''} ${c}`}</button>)}
    </div>
    {loading&&<div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',padding:40}}>Loading archive...</div>}
    {!loading&&filtered.length===0&&<div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',padding:40}}>No saved projections yet. Run a projection on the dashboard and click "Save Projection."</div>}
    {Object.entries(grouped).sort(([a],[b])=>b-a).map(([year,projs])=><div key={year}>
      <div style={{fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>{year} Season — {projs.length} projection{projs.length!==1?'s':''}<div style={{flex:1,height:1,background:'var(--border)'}}/></div>
      {projs.map(proj=>{const cfg=cropConfig[proj.crop_type];const isExpanded=expandedId===proj.id;const kpis=Array.isArray(proj.outputs)?proj.outputs:[];const hk=kpis.find(k=>k.highlight);return(
        <div key={proj.id} style={{background:'var(--surface)',border:'1px solid var(--border)',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',cursor:'pointer',flexWrap:'wrap',gap:8}} onClick={()=>setExpandedId(isExpanded?null:proj.id)}>
            <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:20}}>{CROP_EMOJI[proj.crop_type]}</span><div><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,color:'var(--text)'}}>{cfg?.label||proj.crop_type} — {proj.inputs?.acres||'—'} acres</div><div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{new Date(proj.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div></div>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              {hk&&<div style={{textAlign:'right'}}><div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'var(--green)'}}>{hk.val}</div><div style={{fontSize:10,color:'var(--text-muted)'}}>{hk.label}</div></div>}
              <button onClick={e=>{e.stopPropagation();setShowPdfModal(proj);}} style={{fontSize:10,letterSpacing:'0.06em',textTransform:'uppercase',background:'none',border:'1px solid var(--border2)',color:'var(--text-muted)',padding:'5px 12px',cursor:'pointer',fontFamily:'DM Mono,monospace'}}>↓ PDF</button>
              <span style={{color:'var(--text-muted)',fontSize:12}}>{isExpanded?'▲':'▼'}</span>
            </div>
          </div>
          {isExpanded&&<div style={{borderTop:'1px solid var(--border)',padding:'16px 20px'}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>{kpis.map((k,i)=><div key={i} style={{padding:'12px 14px',background:'var(--surface2)',border:`1px solid ${k.highlight?'var(--green-muted)':'var(--border)'}`}}><div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{k.label}</div><div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:k.green?'var(--green)':k.amber?'var(--amber)':'var(--text)'}}>{k.val}</div></div>)}</div></div>}
        </div>
      );})}
    </div>)}
    {showPdfModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{background:'var(--surface)',border:'1px solid var(--border2)',padding:32,width:'100%',maxWidth:400}}><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:6}}>Generate PDF Report</div><div style={{fontSize:11,color:'var(--text-muted)',marginBottom:20}}>Optionally add a lender or co-op name.</div><div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}><div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)'}}>Prepared For (optional)</div><input className="input-base" type="text" value={preparedFor} onChange={e=>setPreparedFor(e.target.value)} placeholder="Farm Credit Services..."/></div><div style={{display:'flex',gap:10}}><button className="btn-primary" onClick={()=>downloadPdf(showPdfModal)} disabled={generatingPdf===showPdfModal?.id}>{generatingPdf===showPdfModal?.id?'Generating...':'↓ Download PDF'}</button><button onClick={()=>setShowPdfModal(null)} style={{fontSize:11,color:'var(--text-muted)',background:'none',border:'1px solid var(--border2)',padding:'8px 16px',cursor:'pointer',fontFamily:'DM Mono,monospace'}}>Cancel</button></div></div></div>}
  </div></div>);
}
