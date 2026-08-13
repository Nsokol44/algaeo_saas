'use client';
import{useState,useEffect}from'react';
import{useRouter}from'next/navigation';
import Link from'next/link';
import Navbar from'@/components/layout/Navbar';
import InviteModal from'@/components/ui/InviteModal';
import{useFarm}from'@/lib/FarmContext';
import{createClient}from'@/lib/supabase';
const CROPS=['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus','hemp','cannabis'];
const CROP_EMOJI={corn:'🌽',soybeans:'🫘',peanuts:'🥜',tomatoes:'🍅',berries:'🍓',pasture:'🌿',miscanthus:'🌾',hemp:'🌿',cannabis:'🌱'};
const METHODS=['foliar','soil_drench','fertigation','in_furrow','seed_treatment'];
const scoreColor=s=>s>=8?'var(--green)':s>=5?'var(--amber)':'#f87171';
const sampleScoreColor=s=>s>=8?'#4ade80':s>=6?'#fbbf24':s>=4?'#fb923c':'#f87171';
export default function TrialsPage(){
  const{activeFarm}=useFarm();const router=useRouter();const supabase=createClient();
  const[userId,setUserId]=useState(null);const[trials,setTrials]=useState([]);const[publicTrials,setPublicTrials]=useState([]);const[view,setView]=useState('my');const[activeTrial,setActiveTrial]=useState(null);const[entries,setEntries]=useState([]);const[showNewTrial,setShowNewTrial]=useState(false);const[showNewEntry,setShowNewEntry]=useState(false);const[saving,setSaving]=useState(false);
  const[trialSamples,setTrialSamples]=useState([]);const[loadingSamples,setLoadingSamples]=useState(false);const[showTrialInvite,setShowTrialInvite]=useState(false);
  const[trialForm,setTrialForm]=useState({name:'',cropType:'corn',fieldName:'',acres:'',startedDate:'',notes:'',isPublic:false});
  const[entryForm,setEntryForm]=useState({entryDate:new Date().toISOString().split('T')[0],weekNumber:'',algaeoApplied:true,applicationMethod:'foliar',plantHeightIn:'',canopyWidthIn:'',leafColorScore:'',vigorScore:'',stressScore:'',pestPressure:'',estimatedYield:'',yieldUnit:'',brixReading:'',standCount:'',soilTempF:'',airTempF:'',rainfallIn:'',observations:''});
  const[treatedPhoto,setTreatedPhoto]=useState(null);const[controlPhoto,setControlPhoto]=useState(null);const[treatedPreview,setTreatedPreview]=useState(null);const[controlPreview,setControlPreview]=useState(null);
  useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{if(!session?.user){router.push('/auth');return;}setUserId(session.user.id);loadTrials(session.user.id);loadPublicTrials();});},[activeFarm?.id]);
  const loadTrials=async(uid)=>{let q=supabase.from('field_trials').select('*').eq('user_id',uid).order('created_at',{ascending:false});if(activeFarm?.id)q=q.eq('farm_id',activeFarm.id);const{data}=await q;setTrials(data||[]);};
  const loadPublicTrials=async()=>{const{data}=await supabase.from('field_trials').select('*').eq('is_public',true).order('created_at',{ascending:false}).limit(20);setPublicTrials(data||[]);};
  const loadEntries=async(trialId)=>{const{data}=await supabase.from('trial_entries').select('*').eq('trial_id',trialId).order('entry_date');setEntries(data||[]);};
  const loadTrialSamples=async(trialId)=>{setLoadingSamples(true);const{data}=await supabase.from('soil_samples').select('*').eq('trial_id',trialId).order('created_at',{ascending:false});setTrialSamples(data||[]);setLoadingSamples(false);};
  const openTrial=t=>{setActiveTrial(t);loadEntries(t.id);loadTrialSamples(t.id);};
  const createTrial=async()=>{if(!trialForm.name||!userId)return;setSaving(true);const{data,error}=await supabase.from('field_trials').insert({user_id:userId,farm_id:activeFarm?.id||null,name:trialForm.name,crop_type:trialForm.cropType,field_name:trialForm.fieldName,acres:trialForm.acres||null,started_date:trialForm.startedDate||null,notes:trialForm.notes,is_public:trialForm.isPublic}).select().single();setSaving(false);if(!error){setShowNewTrial(false);loadTrials(userId);setActiveTrial(data);loadEntries(data.id);loadTrialSamples(data.id);}};
  const uploadPhoto=async(file,path)=>{if(!file)return null;const ext=file.name.split('.').pop();const fp=`${path}.${ext}`;const{error}=await supabase.storage.from('soil-photos').upload(fp,file,{upsert:true});if(error)return null;const{data}=supabase.storage.from('soil-photos').getPublicUrl(fp);return data?.publicUrl||null;};
  const addEntry=async()=>{if(!activeTrial||!userId)return;setSaving(true);const base=`${userId}/trials/${activeTrial.id}/${Date.now()}`;const[tu,cu]=await Promise.all([uploadPhoto(treatedPhoto,`${base}_treated`),uploadPhoto(controlPhoto,`${base}_control`)]);const n=v=>v!==''?parseFloat(v):null;await supabase.from('trial_entries').insert({trial_id:activeTrial.id,user_id:userId,entry_date:entryForm.entryDate,week_number:n(entryForm.weekNumber),photo_treated_url:tu,photo_control_url:cu,plant_height_in:n(entryForm.plantHeightIn),canopy_width_in:n(entryForm.canopyWidthIn),leaf_color_score:n(entryForm.leafColorScore),vigor_score:n(entryForm.vigorScore),stress_score:n(entryForm.stressScore),pest_pressure:n(entryForm.pestPressure),estimated_yield:n(entryForm.estimatedYield),yield_unit:entryForm.yieldUnit||null,brix_reading:n(entryForm.brixReading),stand_count:n(entryForm.standCount),soil_temp_f:n(entryForm.soilTempF),air_temp_f:n(entryForm.airTempF),rainfall_in:n(entryForm.rainfallIn),observations:entryForm.observations||null,algaeo_applied:entryForm.algaeoApplied,application_method:entryForm.algaeoApplied?entryForm.applicationMethod:null});setSaving(false);setShowNewEntry(false);setTreatedPhoto(null);setControlPhoto(null);setTreatedPreview(null);setControlPreview(null);loadEntries(activeTrial.id);};
  const setF=(k,v)=>setEntryForm(p=>({...p,[k]:v}));const setTF=(k,v)=>setTrialForm(p=>({...p,[k]:v}));
  const currentTrials=view==='my'?trials:publicTrials;
  return(<div style={{minHeight:'100vh',background:'var(--bg)'}}><Navbar/><div style={{padding:'24px',maxWidth:1400,margin:'0 auto'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:24}}>
      <div><div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:'var(--text)'}}>Field Trials</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>Track Algaeo vs. control comparisons across your pilot fields</div></div>
      <div style={{display:'flex',gap:8}}>
        {['my','community'].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:'7px 16px',fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',border:`1px solid ${view===v?'var(--green)':'var(--border2)'}`,background:view===v?'var(--green-glow)':'var(--surface)',color:view===v?'var(--green)':'var(--text-muted)',cursor:'pointer',fontFamily:'DM Mono,monospace'}}>{v==='my'?'My Trials':'Community'}</button>)}
        {view==='my'&&<button className="btn-primary" onClick={()=>setShowNewTrial(true)}>+ New Trial</button>}
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:activeTrial?'300px 1fr':'1fr',gap:20}}>
      <div>
        {currentTrials.length===0&&<div style={{fontSize:12,color:'var(--text-muted)',padding:'32px 0',textAlign:'center'}}>{view==='my'?'No trials yet. Click "+ New Trial" to start.':'No public trials yet.'}</div>}
        {currentTrials.map(t=><div key={t.id} onClick={()=>openTrial(t)} style={{background:activeTrial?.id===t.id?'var(--green-glow)':'var(--surface)',border:`1px solid ${activeTrial?.id===t.id?'var(--green-muted)':'var(--border)'}`,padding:'14px 16px',marginBottom:10,cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><span>{CROP_EMOJI[t.crop_type]||'🌱'}</span><div><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,color:'var(--text)'}}>{t.name}</div><div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{t.field_name||'—'}{t.acres?` · ${t.acres} ac`:''}</div></div></div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>{t.is_public&&<div style={{fontSize:9,letterSpacing:'0.06em',background:'var(--green-muted)',color:'var(--green)',padding:'2px 6px'}}>PUBLIC</div>}<div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{t.status}</div></div>
          </div>
        </div>)}
      </div>
      {activeTrial&&<div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'18px 20px',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
            <div><div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text)'}}>{activeTrial.name}</div><div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{activeTrial.crop_type}{activeTrial.field_name?` · ${activeTrial.field_name}`:''}{activeTrial.acres?` · ${activeTrial.acres} acres`:''}</div>{activeTrial.notes&&<div style={{fontSize:11,color:'var(--text-dim)',marginTop:6}}>{activeTrial.notes}</div>}</div>
            {activeTrial.user_id===userId&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={()=>setShowTrialInvite(true)} style={{padding:'9px 14px',fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',border:'1px solid var(--green-muted)',background:'var(--green-glow)',color:'var(--green)',cursor:'pointer',fontFamily:'DM Mono,monospace'}}>👥 Invite</button>
              <Link href={`/samples?view=add&trialId=${activeTrial.id}&trialName=${encodeURIComponent(activeTrial.name)}&fieldName=${encodeURIComponent(activeTrial.field_name||'')}&cropType=${activeTrial.crop_type}`} style={{padding:'9px 14px',fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',border:'1px solid var(--border2)',background:'var(--surface2)',color:'var(--text-dim)',cursor:'pointer',fontFamily:'DM Mono,monospace',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>📍 Collect Sample</Link>
              <button className="btn-primary" onClick={()=>setShowNewEntry(true)}>+ Add Entry</button>
            </div>}
          </div>
        </div>

        {/* Soil Samples for this trial's field — nested right under the trial, not a separate top-level list */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'16px 20px',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)'}}>📍 Soil Samples{trialSamples.length>0?` (${trialSamples.length})`:''}</div>
            {activeTrial.user_id===userId&&trialSamples.length===0&&!loadingSamples&&(
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setShowTrialInvite(true)} style={{fontSize:10,letterSpacing:'0.05em',textTransform:'uppercase',background:'none',border:'1px solid var(--border2)',color:'var(--text-muted)',padding:'5px 10px',cursor:'pointer',fontFamily:'DM Mono,monospace'}}>👥 Invite Collectors</button>
                <Link href={`/samples?view=add&trialId=${activeTrial.id}&trialName=${encodeURIComponent(activeTrial.name)}&fieldName=${encodeURIComponent(activeTrial.field_name||'')}&cropType=${activeTrial.crop_type}`} style={{fontSize:10,letterSpacing:'0.05em',textTransform:'uppercase',background:'none',border:'1px solid var(--border2)',color:'var(--text-muted)',padding:'5px 10px',cursor:'pointer',fontFamily:'DM Mono,monospace',textDecoration:'none'}}>+ Collect First Sample</Link>
              </div>
            )}
          </div>
          {loadingSamples&&<div style={{fontSize:11,color:'var(--text-muted)',padding:'12px 0'}}>Loading…</div>}
          {!loadingSamples&&trialSamples.length===0&&(
            <div style={{fontSize:11,color:'var(--text-muted)',lineHeight:1.7}}>No soil samples logged for this field yet. Invite a collector or drop a GPS pin yourself.</div>
          )}
          {!loadingSamples&&trialSamples.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {trialSamples.map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,background:'var(--surface2)',border:'1px solid var(--border)',padding:'10px 12px'}}>
                  {s.photo_url&&<img src={s.photo_url} style={{width:36,height:36,objectFit:'cover',flexShrink:0}} alt=""/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:'var(--text-dim)'}}>{s.field_name||'Soil Sample'} · {new Date(s.sample_date+'T12:00:00').toLocaleDateString()}</div>
                    {s.notes&&<div style={{fontSize:10,color:'var(--text-muted)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.notes}</div>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:800,color:sampleScoreColor(s.health_score||5)}}>{s.health_score||'?'}</div>
                    <div style={{fontSize:8,color:'var(--text-muted)'}}>{s.score_label||'—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {entries.length===0&&<div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',padding:40}}>No entries yet.</div>}
        {entries.map((entry,idx)=><div key={entry.id} style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'18px 20px',marginBottom:14}}>
          <div style={{marginBottom:14}}><div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:600,color:'var(--text)'}}>{entry.week_number?`Week ${entry.week_number}`:`Entry ${idx+1}`} — {new Date(entry.entry_date+'T12:00:00').toLocaleDateString()}</div>{entry.algaeo_applied&&<div style={{fontSize:10,color:'var(--green)',marginTop:2}}>✓ AgTurbo Applied — {entry.application_method?.replace('_',' ')}</div>}</div>
          {(entry.photo_treated_url||entry.photo_control_url)&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            <div><div style={{fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--green)',marginBottom:6}}>AgTurbo Treated</div>{entry.photo_treated_url?<img src={entry.photo_treated_url} style={{width:'100%',height:180,objectFit:'cover',border:'1px solid var(--green-muted)'}} alt="treated"/>:<div style={{height:180,background:'var(--surface2)',border:'1px dashed var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-muted)'}}>No photo</div>}</div>
            <div><div style={{fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:6}}>Control (Untreated)</div>{entry.photo_control_url?<img src={entry.photo_control_url} style={{width:'100%',height:180,objectFit:'cover',border:'1px solid var(--border)'}} alt="control"/>:<div style={{height:180,background:'var(--surface2)',border:'1px dashed var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--text-muted)'}}>No photo</div>}</div>
          </div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8}}>
            {[{l:'Plant Height',v:entry.plant_height_in?`${entry.plant_height_in}"`:'',s:null},{l:'Canopy Width',v:entry.canopy_width_in?`${entry.canopy_width_in}"`:'',s:null},{l:'Leaf Color',v:entry.leaf_color_score?`${entry.leaf_color_score}/10`:'',s:entry.leaf_color_score},{l:'Vigor',v:entry.vigor_score?`${entry.vigor_score}/10`:'',s:entry.vigor_score},{l:'Stress',v:entry.stress_score?`${entry.stress_score}/10`:'',s:entry.stress_score,inv:true},{l:'Pest Pressure',v:entry.pest_pressure?`${entry.pest_pressure}/10`:'',s:entry.pest_pressure,inv:true},{l:'Est. Yield',v:entry.estimated_yield?`${entry.estimated_yield} ${entry.yield_unit||''}`:'',s:null},{l:'Brix',v:entry.brix_reading?`${entry.brix_reading}°Bx`:'',s:null},{l:'Soil Temp',v:entry.soil_temp_f?`${entry.soil_temp_f}°F`:'',s:null},{l:'Air Temp',v:entry.air_temp_f?`${entry.air_temp_f}°F`:'',s:null}].filter(m=>m.v).map(m=><div key={m.l} style={{background:'var(--surface2)',padding:'8px 10px',border:'1px solid var(--border)'}}><div style={{fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{m.l}</div><div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:m.s?scoreColor(m.inv?11-m.s:m.s):'var(--text)'}}>{m.v}</div></div>)}
          </div>
          {entry.observations&&<div style={{marginTop:12,padding:'10px 12px',background:'var(--surface2)',border:'1px solid var(--border)',fontSize:11,color:'var(--text-dim)',lineHeight:1.7}}><span style={{color:'var(--text-muted)'}}>Observations: </span>{entry.observations}</div>}
        </div>)}
      </div>}
    </div>
    {showNewTrial&&<Modal title="New Field Trial" onClose={()=>setShowNewTrial(false)}>
      <F label="Trial Name *"><input className="input-base" value={trialForm.name} onChange={e=>setTF('name',e.target.value)} placeholder="2026 Corn N-Replacement Trial"/></F>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <F label="Crop"><select className="input-base" value={trialForm.cropType} onChange={e=>setTF('cropType',e.target.value)} style={{background:'var(--bg)'}}>{CROPS.map(c=><option key={c} value={c}>{c}</option>)}</select></F>
        <F label="Field Name"><input className="input-base" value={trialForm.fieldName} onChange={e=>setTF('fieldName',e.target.value)} placeholder="North 40"/></F>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <F label="Acres"><input className="input-base" type="number" value={trialForm.acres} onChange={e=>setTF('acres',e.target.value)}/></F>
        <F label="Start Date"><input className="input-base" type="date" value={trialForm.startedDate} onChange={e=>setTF('startedDate',e.target.value)}/></F>
      </div>
      <F label="Notes"><textarea className="input-base" value={trialForm.notes} onChange={e=>setTF('notes',e.target.value)} placeholder="Trial objectives..." style={{resize:'vertical',minHeight:72}}/></F>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:12,color:'var(--text-muted)'}}><input type="checkbox" checked={trialForm.isPublic} onChange={e=>setTF('isPublic',e.target.checked)}/>Make visible to Algaeo community</label>
      <button className="btn-primary" onClick={createTrial} disabled={saving}>{saving?'Creating...':'Create Trial →'}</button>
    </Modal>}
    {showNewEntry&&activeTrial&&<Modal title={`Add Entry — ${activeTrial.name}`} onClose={()=>setShowNewEntry(false)} wide>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <F label="Date"><input className="input-base" type="date" value={entryForm.entryDate} onChange={e=>setF('entryDate',e.target.value)}/></F>
        <F label="Week #"><input className="input-base" type="number" value={entryForm.weekNumber} onChange={e=>setF('weekNumber',e.target.value)}/></F>
      </div>
      <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:12,color:'var(--text-muted)'}}><input type="checkbox" checked={entryForm.algaeoApplied} onChange={e=>setF('algaeoApplied',e.target.checked)}/>AgTurbo applied this entry</label>
      {entryForm.algaeoApplied&&<F label="Application Method"><select className="input-base" value={entryForm.applicationMethod} onChange={e=>setF('applicationMethod',e.target.value)} style={{background:'var(--bg)'}}>{METHODS.map(m=><option key={m} value={m}>{m.replace('_',' ')}</option>)}</select></F>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Photo label="AgTurbo Treated Photo" preview={treatedPreview} color="var(--green)" onChange={f=>{setTreatedPhoto(f);setTreatedPreview(URL.createObjectURL(f));}}/>
        <Photo label="Control (Untreated) Photo" preview={controlPreview} color="var(--text-muted)" onChange={f=>{setControlPhoto(f);setControlPreview(URL.createObjectURL(f));}}/>
      </div>
      <div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)'}}>Plant Measurements</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
        {[['plantHeightIn','Plant Height (in)'],['canopyWidthIn','Canopy Width (in)'],['leafColorScore','Leaf Color (1–10)'],['vigorScore','Vigor (1–10)'],['stressScore','Stress (1–10)'],['pestPressure','Pest Pressure (1–10)'],['estimatedYield','Est. Yield'],['yieldUnit','Yield Unit','text'],['brixReading','Brix (°Bx)'],['standCount','Stand Count'],['soilTempF','Soil Temp (°F)'],['airTempF','Air Temp (°F)'],['rainfallIn','Rainfall (in)']].map(([k,l,t])=><F key={k} label={l}><input className="input-base" type={t||'number'} value={entryForm[k]} onChange={e=>setF(k,e.target.value)}/></F>)}
      </div>
      <F label="Observations"><textarea className="input-base" value={entryForm.observations} onChange={e=>setF('observations',e.target.value)} placeholder="Visible differences, conditions..." style={{resize:'vertical',minHeight:80}}/></F>
      <button className="btn-primary" onClick={addEntry} disabled={saving}>{saving?'Saving...':'Save Entry →'}</button>
    </Modal>}
    {showTrialInvite&&activeTrial&&<InviteModal trial={activeTrial} onClose={()=>setShowTrialInvite(false)}/>}
  </div></div>);
}
function Modal({title,onClose,children,wide}){return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{background:'var(--surface)',border:'1px solid var(--border2)',width:'100%',maxWidth:wide?680:520,maxHeight:'90vh',overflowY:'auto',padding:32}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:24}}><div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--text)'}}>{title}</div><button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:16}}>✕</button></div><div style={{display:'flex',flexDirection:'column',gap:14}}>{children}</div></div></div>);}
function Photo({label,preview,onChange,color}){return(<div><div style={{fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color,marginBottom:6}}>{label}</div><label style={{cursor:'pointer',display:'block'}}><div style={{border:`2px dashed ${preview?color:'var(--border2)'}`,background:preview?'transparent':'var(--bg)',height:130,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{preview?<img src={preview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<div style={{textAlign:'center',fontSize:11,color:'var(--text-muted)'}}>📷 Upload</div>}</div><input type="file" accept="image/*" onChange={e=>e.target.files[0]&&onChange(e.target.files[0])} style={{display:'none'}}/></label></div>);}
function F({label,children}){return<div style={{display:'flex',flexDirection:'column',gap:6}}><div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text-muted)'}}>{label}</div>{children}</div>;}
