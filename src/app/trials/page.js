'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useFarm } from '@/lib/FarmContext';
import { createClient } from '@/lib/supabase';

const CROPS = ['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus','hemp','cannabis'];
const CROP_EMOJI = { corn:'🌽', soybeans:'🫘', peanuts:'🥜', tomatoes:'🍅', berries:'🍓', pasture:'🌿', miscanthus:'🌾', hemp:'🌿', cannabis:'🌱' };
const METHODS = ['foliar','soil_drench','fertigation','in_furrow','seed_treatment'];

export default function TrialsPage() {
  const { activeFarm } = useFarm();
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState(null);
  const [trials, setTrials] = useState([]);
  const [publicTrials, setPublicTrials] = useState([]);
  const [view, setView] = useState('my'); // 'my' | 'community'
  const [activeTrial, setActiveTrial] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showNewTrial, setShowNewTrial] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [saving, setSaving] = useState(false);

  const [trialForm, setTrialForm] = useState({
    name: '', cropType: 'corn', fieldName: '', acres: '', startedDate: '', notes: '', isPublic: false,
  });

  const [entryForm, setEntryForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    weekNumber: '', algaeoApplied: true, applicationMethod: 'foliar',
    plantHeightIn: '', canopyWidthIn: '', leafColorScore: '', vigorScore: '',
    stressScore: '', pestPressure: '', estimatedYield: '', yieldUnit: '',
    brixReading: '', standCount: '', soilTempF: '', airTempF: '', rainfallIn: '',
    observations: '',
  });

  const [treatedPhoto, setTreatedPhoto] = useState(null);
  const [controlPhoto, setControlPhoto] = useState(null);
  const [treatedPreview, setTreatedPreview] = useState(null);
  const [controlPreview, setControlPreview] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/auth'); return; }
      setUserId(session.user.id);
      loadTrials(session.user.id);
      loadPublicTrials();
    });
  }, [activeFarm?.id]);

  const loadTrials = async (uid) => {
    let q = supabase.from('field_trials').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
    const { data } = await q;
    setTrials(data || []);
  };

  const loadPublicTrials = async () => {
    const { data } = await supabase.from('field_trials').select('*, trial_entries(count)').eq('is_public', true).order('created_at', { ascending: false }).limit(20);
    setPublicTrials(data || []);
  };

  const loadEntries = async (trialId) => {
    const { data } = await supabase.from('trial_entries').select('*').eq('trial_id', trialId).order('entry_date');
    setEntries(data || []);
  };

  const openTrial = (trial) => {
    setActiveTrial(trial);
    loadEntries(trial.id);
  };

  const createTrial = async () => {
    if (!trialForm.name || !userId) return;
    setSaving(true);
    const { data, error } = await supabase.from('field_trials').insert({
      user_id: userId, farm_id: activeFarm?.id || null,
      name: trialForm.name, crop_type: trialForm.cropType,
      field_name: trialForm.fieldName, acres: trialForm.acres || null,
      started_date: trialForm.startedDate || null,
      notes: trialForm.notes, is_public: trialForm.isPublic,
    }).select().single();
    setSaving(false);
    if (!error) { setShowNewTrial(false); loadTrials(userId); setActiveTrial(data); loadEntries(data.id); }
  };

  const uploadPhoto = async (file, path) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const fullPath = `${path}.${ext}`;
    const { error } = await supabase.storage.from('soil-photos').upload(fullPath, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('soil-photos').getPublicUrl(fullPath);
    return data?.publicUrl || null;
  };

  const addEntry = async () => {
    if (!activeTrial || !userId) return;
    setSaving(true);
    const base = `${userId}/trials/${activeTrial.id}/${Date.now()}`;
    const [treatedUrl, controlUrl] = await Promise.all([
      uploadPhoto(treatedPhoto, `${base}_treated`),
      uploadPhoto(controlPhoto, `${base}_control`),
    ]);
    const numOrNull = (v) => v !== '' ? parseFloat(v) : null;
    await supabase.from('trial_entries').insert({
      trial_id: activeTrial.id, user_id: userId,
      entry_date: entryForm.entryDate,
      week_number: numOrNull(entryForm.weekNumber),
      photo_treated_url: treatedUrl,
      photo_control_url: controlUrl,
      plant_height_in: numOrNull(entryForm.plantHeightIn),
      canopy_width_in: numOrNull(entryForm.canopyWidthIn),
      leaf_color_score: numOrNull(entryForm.leafColorScore),
      vigor_score: numOrNull(entryForm.vigorScore),
      stress_score: numOrNull(entryForm.stressScore),
      pest_pressure: numOrNull(entryForm.pestPressure),
      estimated_yield: numOrNull(entryForm.estimatedYield),
      yield_unit: entryForm.yieldUnit || null,
      brix_reading: numOrNull(entryForm.brixReading),
      stand_count: numOrNull(entryForm.standCount),
      soil_temp_f: numOrNull(entryForm.soilTempF),
      air_temp_f: numOrNull(entryForm.airTempF),
      rainfall_in: numOrNull(entryForm.rainfallIn),
      observations: entryForm.observations || null,
      algaeo_applied: entryForm.algaeoApplied,
      application_method: entryForm.algaeoApplied ? entryForm.applicationMethod : null,
    });
    setSaving(false);
    setShowNewEntry(false);
    setTreatedPhoto(null); setControlPhoto(null);
    setTreatedPreview(null); setControlPreview(null);
    setEntryForm({ ...entryForm, plantHeightIn:'', canopyWidthIn:'', leafColorScore:'', vigorScore:'', stressScore:'', pestPressure:'', estimatedYield:'', brixReading:'', standCount:'', soilTempF:'', airTempF:'', rainfallIn:'', observations:'' });
    loadEntries(activeTrial.id);
  };

  const setF = (k, v) => setEntryForm(p => ({ ...p, [k]: v }));
  const setTF = (k, v) => setTrialForm(p => ({ ...p, [k]: v }));

  const scoreColor = (s) => s >= 8 ? 'var(--green)' : s >= 5 ? 'var(--amber)' : '#f87171';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Field Trials</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Track Algaeo vs. control comparisons across your pilot fields</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setView('my')} style={{ padding: '7px 16px', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${view === 'my' ? 'var(--green)' : 'var(--border2)'}`, background: view === 'my' ? 'var(--green-glow)' : 'var(--surface)', color: view === 'my' ? 'var(--green)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>My Trials</button>
            <button onClick={() => setView('community')} style={{ padding: '7px 16px', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${view === 'community' ? 'var(--green)' : 'var(--border2)'}`, background: view === 'community' ? 'var(--green-glow)' : 'var(--surface)', color: view === 'community' ? 'var(--green)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Community</button>
            {view === 'my' && <button className="btn-primary" onClick={() => setShowNewTrial(true)}>+ New Trial</button>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeTrial ? '320px 1fr' : '1fr', gap: 20 }}>

          {/* Trial list */}
          <div>
            {view === 'my' && (
              <>
                {trials.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '32px 0', textAlign: 'center' }}>No trials yet. Click "+ New Trial" to start tracking.</div>}
                {trials.map(t => (
                  <div key={t.id} onClick={() => openTrial(t)} style={{ background: activeTrial?.id === t.id ? 'var(--green-glow)' : 'var(--surface)', border: `1px solid ${activeTrial?.id === t.id ? 'var(--green-muted)' : 'var(--border)'}`, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{CROP_EMOJI[t.crop_type] || '🌱'}</span>
                        <div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.field_name || '—'}{t.acres ? ` · ${t.acres} ac` : ''}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {t.is_public && <div style={{ fontSize: 9, letterSpacing: '0.06em', background: 'var(--green-muted)', color: 'var(--green)', padding: '2px 6px' }}>PUBLIC</div>}
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {view === 'community' && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Pilot growers who have made their trials public</div>
                {publicTrials.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '32px 0', textAlign: 'center' }}>No public trials yet.</div>}
                {publicTrials.map(t => (
                  <div key={t.id} onClick={() => openTrial(t)} style={{ background: activeTrial?.id === t.id ? 'var(--green-glow)' : 'var(--surface)', border: `1px solid ${activeTrial?.id === t.id ? 'var(--green-muted)' : 'var(--border)'}`, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{CROP_EMOJI[t.crop_type] || '🌱'}</span>
                      <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{t.crop_type} {t.acres ? `· ${t.acres} ac` : ''}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Trial detail */}
          {activeTrial && (
            <div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{activeTrial.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {activeTrial.crop_type} {activeTrial.field_name ? `· ${activeTrial.field_name}` : ''} {activeTrial.acres ? `· ${activeTrial.acres} acres` : ''} {activeTrial.started_date ? `· Started ${new Date(activeTrial.started_date + 'T12:00:00').toLocaleDateString()}` : ''}
                    </div>
                    {activeTrial.notes && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{activeTrial.notes}</div>}
                  </div>
                  {activeTrial.user_id === userId && (
                    <button className="btn-primary" onClick={() => setShowNewEntry(true)}>+ Add Entry</button>
                  )}
                </div>
              </div>

              {/* Entries */}
              {entries.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No entries yet. Click "+ Add Entry" to log your first observation.</div>
              )}

              {entries.map((entry, idx) => (
                <div key={entry.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '18px 20px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {entry.week_number ? `Week ${entry.week_number}` : `Entry ${idx + 1}`} — {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString()}
                      </div>
                      {entry.algaeo_applied && (
                        <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>✓ AgTurbo Applied — {entry.application_method?.replace('_', ' ')}</div>
                      )}
                    </div>
                  </div>

                  {/* Side-by-side photos */}
                  {(entry.photo_treated_url || entry.photo_control_url) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>AgTurbo Treated</div>
                        {entry.photo_treated_url
                          ? <img src={entry.photo_treated_url} style={{ width: '100%', height: 180, objectFit: 'cover', border: '1px solid var(--green-muted)' }} alt="treated" />
                          : <div style={{ height: 180, background: 'var(--surface2)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No photo</div>
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Control (Untreated)</div>
                        {entry.photo_control_url
                          ? <img src={entry.photo_control_url} style={{ width: '100%', height: 180, objectFit: 'cover', border: '1px solid var(--border)' }} alt="control" />
                          : <div style={{ height: 180, background: 'var(--surface2)', border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No photo</div>
                        }
                      </div>
                    </div>
                  )}

                  {/* Measurements grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                    {[
                      { label: 'Plant Height', val: entry.plant_height_in ? `${entry.plant_height_in}"` : null },
                      { label: 'Canopy Width', val: entry.canopy_width_in ? `${entry.canopy_width_in}"` : null },
                      { label: 'Leaf Color', val: entry.leaf_color_score ? `${entry.leaf_color_score}/10` : null, score: entry.leaf_color_score },
                      { label: 'Vigor', val: entry.vigor_score ? `${entry.vigor_score}/10` : null, score: entry.vigor_score },
                      { label: 'Stress', val: entry.stress_score ? `${entry.stress_score}/10` : null, score: entry.stress_score, invert: true },
                      { label: 'Pest Pressure', val: entry.pest_pressure ? `${entry.pest_pressure}/10` : null, score: entry.pest_pressure, invert: true },
                      { label: 'Est. Yield', val: entry.estimated_yield ? `${entry.estimated_yield} ${entry.yield_unit || ''}` : null },
                      { label: 'Brix', val: entry.brix_reading ? `${entry.brix_reading}°Bx` : null },
                      { label: 'Stand Count', val: entry.stand_count || null },
                      { label: 'Soil Temp', val: entry.soil_temp_f ? `${entry.soil_temp_f}°F` : null },
                      { label: 'Air Temp', val: entry.air_temp_f ? `${entry.air_temp_f}°F` : null },
                      { label: 'Rainfall', val: entry.rainfall_in ? `${entry.rainfall_in}"` : null },
                    ].filter(m => m.val).map(m => (
                      <div key={m.label} style={{ background: 'var(--surface2)', padding: '8px 10px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: m.score ? scoreColor(m.invert ? 11 - m.score : m.score) : 'var(--text)' }}>{m.val}</div>
                      </div>
                    ))}
                  </div>

                  {entry.observations && (
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Observations: </span>{entry.observations}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Trial Modal */}
        {showNewTrial && (
          <Modal title="New Field Trial" onClose={() => setShowNewTrial(false)}>
            <Field label="Trial Name *"><input className="input-base" value={trialForm.name} onChange={e => setTF('name', e.target.value)} placeholder="2026 Corn N-Replacement Trial" /></Field>
            <Row>
              <Field label="Crop">
                <select className="input-base" value={trialForm.cropType} onChange={e => setTF('cropType', e.target.value)} style={{ background: 'var(--bg)' }}>
                  {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Field Name"><input className="input-base" value={trialForm.fieldName} onChange={e => setTF('fieldName', e.target.value)} placeholder="North 40" /></Field>
            </Row>
            <Row>
              <Field label="Acres"><input className="input-base" type="number" value={trialForm.acres} onChange={e => setTF('acres', e.target.value)} /></Field>
              <Field label="Start Date"><input className="input-base" type="date" value={trialForm.startedDate} onChange={e => setTF('startedDate', e.target.value)} /></Field>
            </Row>
            <Field label="Notes"><textarea className="input-base" value={trialForm.notes} onChange={e => setTF('notes', e.target.value)} placeholder="Trial objectives, baseline conditions..." style={{ resize: 'vertical', minHeight: 72 }} /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={trialForm.isPublic} onChange={e => setTF('isPublic', e.target.checked)} />
              Make this trial visible to the Algaeo community
            </label>
            <button className="btn-primary" onClick={createTrial} disabled={saving}>{saving ? 'Creating...' : 'Create Trial →'}</button>
          </Modal>
        )}

        {/* New Entry Modal */}
        {showNewEntry && activeTrial && (
          <Modal title={`Add Entry — ${activeTrial.name}`} onClose={() => setShowNewEntry(false)} wide>
            <Row>
              <Field label="Date"><input className="input-base" type="date" value={entryForm.entryDate} onChange={e => setF('entryDate', e.target.value)} /></Field>
              <Field label="Week #"><input className="input-base" type="number" value={entryForm.weekNumber} onChange={e => setF('weekNumber', e.target.value)} placeholder="1" /></Field>
            </Row>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={entryForm.algaeoApplied} onChange={e => setF('algaeoApplied', e.target.checked)} />
              AgTurbo applied this entry
            </label>

            {entryForm.algaeoApplied && (
              <Field label="Application Method">
                <select className="input-base" value={entryForm.applicationMethod} onChange={e => setF('applicationMethod', e.target.value)} style={{ background: 'var(--bg)' }}>
                  {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </Field>
            )}

            {/* Photo uploads */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <PhotoUpload label="AgTurbo Treated Photo" preview={treatedPreview} color="var(--green)"
                onChange={f => { setTreatedPhoto(f); setTreatedPreview(URL.createObjectURL(f)); }} />
              <PhotoUpload label="Control (Untreated) Photo" preview={controlPreview} color="var(--text-muted)"
                onChange={f => { setControlPhoto(f); setControlPreview(URL.createObjectURL(f)); }} />
            </div>

            {/* Measurements */}
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>Plant Measurements</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { key: 'plantHeightIn',   label: 'Plant Height (in)',    type: 'number' },
                { key: 'canopyWidthIn',   label: 'Canopy Width (in)',    type: 'number' },
                { key: 'leafColorScore',  label: 'Leaf Color (1–10)',    type: 'number' },
                { key: 'vigorScore',      label: 'Vigor (1–10)',         type: 'number' },
                { key: 'stressScore',     label: 'Stress Level (1–10)',  type: 'number' },
                { key: 'pestPressure',    label: 'Pest Pressure (1–10)', type: 'number' },
                { key: 'estimatedYield',  label: 'Est. Yield',           type: 'number' },
                { key: 'yieldUnit',       label: 'Yield Unit',           type: 'text'   },
                { key: 'brixReading',     label: 'Brix (°Bx)',           type: 'number' },
                { key: 'standCount',      label: 'Stand Count',          type: 'number' },
                { key: 'soilTempF',       label: 'Soil Temp (°F)',       type: 'number' },
                { key: 'airTempF',        label: 'Air Temp (°F)',        type: 'number' },
                { key: 'rainfallIn',      label: 'Rainfall (in)',        type: 'number' },
              ].map(m => (
                <Field key={m.key} label={m.label}>
                  <input className="input-base" type={m.type} value={entryForm[m.key]} onChange={e => setF(m.key, e.target.value)} />
                </Field>
              ))}
            </div>

            <Field label="Observations / Notes">
              <textarea className="input-base" value={entryForm.observations} onChange={e => setF('observations', e.target.value)} placeholder="Visible differences, weather conditions, anomalies..." style={{ resize: 'vertical', minHeight: 80 }} />
            </Field>

            <button className="btn-primary" onClick={addEntry} disabled={saving}>{saving ? 'Saving...' : 'Save Entry →'}</button>
          </Modal>
        )}

      </div>
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', width: '100%', maxWidth: wide ? 680 : 520, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  );
}

function PhotoUpload({ label, preview, onChange, color }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 6 }}>{label}</div>
      <label style={{ cursor: 'pointer', display: 'block' }}>
        <div style={{ border: `2px dashed ${preview ? color : 'var(--border2)'}`, background: preview ? 'transparent' : 'var(--bg)', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {preview
            ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            : <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>📷 Upload</div>
          }
        </div>
        <input type="file" accept="image/*" onChange={e => e.target.files[0] && onChange(e.target.files[0])} style={{ display: 'none' }} />
      </label>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}
