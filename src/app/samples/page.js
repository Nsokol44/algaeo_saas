'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import InviteModal from '@/components/ui/InviteModal';
import AccuracyRing from '@/components/ui/AccuracyRing';
import SessionSummary from '@/components/ui/SessionSummary';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { useFarm } from '@/lib/FarmContext';
import { createClient } from '@/lib/supabase';
import { calcSoilHealthScore } from '@/lib/soilScore';
import { useGpsLock } from '@/lib/useGpsLock';
import { useOfflineSync } from '@/lib/useOfflineSync';
import { queueSample, isOnline } from '@/lib/offlineQueue';
import { compressImage, dataUrlToBlob } from '@/lib/imageUtils';
import { analyzeSoilPhoto } from '@/lib/soilVision';
import { nearestSample } from '@/lib/geo';

const CROPS = ['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus','hemp','cannabis'];
const CROP_LABELS = { corn:'Corn', soybeans:'Soybeans', peanuts:'Peanuts', tomatoes:'Tomatoes', berries:'Berries', pasture:'Pasture', miscanthus:'Miscanthus', hemp:'Hemp', cannabis:'Cannabis' };

const scoreColor = (s) => s >= 8 ? '#4ade80' : s >= 6 ? '#fbbf24' : s >= 4 ? '#fb923c' : '#f87171';
const scoreLabel = (s) => s >= 8 ? 'Excellent' : s >= 6 ? 'Good' : s >= 4 ? 'Fair' : 'Poor';
const GPS_THRESHOLD = 10; // meters — ring turns green / auto-captures at this accuracy

const emptyForm = (activeFarm) => ({
  fieldName: '', cropType: 'corn',
  depthTopIn: 0, depthBottomIn: 6,
  notes: '', sampleDate: new Date().toISOString().split('T')[0],
  soilType: activeFarm?.soil_type || 'loam',
  irrigationType: activeFarm?.irrigation_type || 'rain_fed',
  avgRainfallIn: activeFarm?.avg_rainfall_in || 36,
  usdaZone: activeFarm?.usda_zone || '6a',
});

export default function SoilSamplesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>Loading...</div></div>}>
      <SoilSamplesInner />
    </Suspense>
  );
}

function SoilSamplesInner() {
  const { activeFarm } = useFarm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // A collector can land here from a specific Field Trial (via /samples?view=add&trialId=...)
  // so this sample gets tagged to that trial's field instead of being untethered.
  const trialId = searchParams.get('trialId');
  const trialName = searchParams.get('trialName');
  const prefillFieldName = searchParams.get('fieldName') || '';
  const prefillCropType = searchParams.get('cropType');
  const startInAdd = searchParams.get('view') === 'add';


  const [userId, setUserId] = useState(null);
  const [samples, setSamples] = useState([]);
  const [view, setView] = useState(startInAdd ? 'add' : 'map'); // 'map' | 'list' | 'add' | 'saved'
  const [saving, setSaving] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [showLabEntry, setShowLabEntry] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [form, setForm] = useState({ ...emptyForm(activeFarm), fieldName: prefillFieldName, cropType: prefillCropType || 'corn' });
  const [photoPreview, setPhotoPreview] = useState(null); // compressed data URL
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiNote, setAiNote] = useState(null);

  const [labForm, setLabForm] = useState({ ph: '', om: '', cec: '', n: '', p: '', k: '', ca: '', mg: '', notes: '' });

  // GPS: watches continuously and auto-locks once accuracy is tight enough.
  const gps = useGpsLock({ threshold: GPS_THRESHOLD, autoCapture: true });
  // Offline queue: tracks connectivity + syncs queued samples automatically.
  const offlineSync = useOfflineSync(supabase);

  // Session tracking — resets each time the page loads, not persisted.
  const [sessionSamples, setSessionSamples] = useState([]);
  const [sessionStart] = useState(() => Date.now());
  const [lastResult, setLastResult] = useState(null); // { score, delta } shown on the 'saved' screen

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/auth'); return; }
      setUserId(session.user.id);
      loadSamples(session.user.id);
    });
  }, [activeFarm?.id]);

  useEffect(() => {
    if (view === 'map' && samples.length > 0) initMap();
  }, [view, samples]);

  useEffect(() => {
    setForm({ ...emptyForm(activeFarm), fieldName: prefillFieldName, cropType: prefillCropType || 'corn' });
  }, [activeFarm?.id]);

  // Auto-start GPS the moment the collect form opens — no extra tap needed.
  useEffect(() => {
    if (view === 'add') {
      gps.start();
    } else {
      gps.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const loadSamples = async (uid) => {
    let q = supabase.from('soil_samples').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (activeFarm?.id) q = q.eq('farm_id', activeFarm.id);
    const { data } = await q;
    setSamples(data || []);
  };

  const initMap = async () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (samples.length === 0) return;

    const maplibregl = (await import('maplibre-gl')).default;
    await import('maplibre-gl/dist/maplibre-gl.css');

    const centerLat = samples.reduce((a, s) => a + s.lat, 0) / samples.length;
    const centerLng = samples.reduce((a, s) => a + s.lng, 0) / samples.length;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [centerLng, centerLat],
      zoom: 14,
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      samples.forEach(sample => {
        const color = scoreColor(sample.health_score || 5);
        const el = document.createElement('div');
        el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #0a0c0a;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0a0c0a;font-family:Syne,sans-serif;`;
        el.textContent = (sample.health_score || '?').toString();
        el.title = `${sample.field_name || 'Sample'} — Score: ${sample.health_score || '?'}/10`;
        el.addEventListener('click', () => setSelectedSample(sample));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([sample.lng, sample.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    });
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiAnalysis(null);
    setAiNote(null);
    try {
      const dataUrl = await compressImage(file);
      setPhotoPreview(dataUrl);
      if (isOnline()) {
        setAnalyzing(true);
        try {
          const analysis = await analyzeSoilPhoto(dataUrl);
          setAiAnalysis(analysis);
        } catch (err) {
          setAiNote('AI read unavailable right now — the photo is still saved with your sample.');
        } finally {
          setAnalyzing(false);
        }
      } else {
        setAiNote('No signal — AI photo read will run automatically once you\u2019re back online.');
      }
    } catch (err) {
      alert('Could not process that photo. Please try again.');
    }
  };

  const resetFormForNext = () => {
    setForm({ ...emptyForm(activeFarm), fieldName: prefillFieldName, cropType: prefillCropType || 'corn' });
    setPhotoPreview(null);
    setAiAnalysis(null);
    setAiNote(null);
    setShowAdvanced(false);
  };

  const saveSample = async () => {
    if (!gps.position) { alert('Waiting on GPS — hold on a moment or tap Reacquire.'); return; }
    if (!userId) return;
    setSaving(true);

    const score = calcSoilHealthScore({
      soilType: form.soilType,
      irrigationType: form.irrigationType,
      avgRainfallIn: form.avgRainfallIn,
      usdaZone: form.usdaZone,
      cropType: form.cropType,
    });

    const delta = nearestSample({ id: null, lat: gps.position.lat, lng: gps.position.lng }, samples);

    const rowBase = {
      user_id: userId,
      farm_id: activeFarm?.id || null,
      trial_id: trialId || null,
      field_name: form.fieldName || null,
      sample_date: form.sampleDate,
      lat: gps.position.lat,
      lng: gps.position.lng,
      gps_accuracy_m: gps.position.accuracy,
      depth_top_in: form.depthTopIn,
      depth_bottom_in: form.depthBottomIn,
      crop_type: form.cropType,
      health_score: score.score,
      score_label: score.label,
      notes: form.notes || null,
      ai_photo_analysis: aiAnalysis || null,
    };

    if (isOnline()) {
      let photoUrl = null;
      if (photoPreview) {
        const blob = dataUrlToBlob(photoPreview);
        const path = `${userId}/samples/${Date.now()}.jpg`;
        const { data: upload } = await supabase.storage.from('soil-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (upload) {
          const { data: urlData } = supabase.storage.from('soil-photos').getPublicUrl(path);
          photoUrl = urlData?.publicUrl;
        }
      }
      await supabase.from('soil_samples').insert({ ...rowBase, photo_url: photoUrl });
      await loadSamples(userId);
    } else {
      await queueSample({
        row: rowBase,
        photoDataUrl: photoPreview,
        storagePathPrefix: `${userId}/samples`,
      });
      offlineSync.refreshCount();
    }

    setSessionSamples((prev) => [...prev, { score: score.score, lat: gps.position.lat, lng: gps.position.lng, timestamp: Date.now() }]);
    setLastResult({ score: score.score, label: score.label, delta, offline: !isOnline() });

    setSaving(false);
    resetFormForNext();
    gps.stop();
    setView('saved');
  };

  const saveLabResults = async () => {
    if (!selectedSample) return;
    await supabase.from('soil_samples').update({
      lab_ph: labForm.ph || null,
      lab_om_pct: labForm.om || null,
      lab_cec: labForm.cec || null,
      lab_nitrogen_ppm: labForm.n || null,
      lab_phosphorus_ppm: labForm.p || null,
      lab_potassium_ppm: labForm.k || null,
      lab_calcium_ppm: labForm.ca || null,
      lab_magnesium_ppm: labForm.mg || null,
      lab_notes: labForm.notes || null,
    }).eq('id', selectedSample.id);
    setShowLabEntry(false);
    loadSamples(userId);
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setL = (k, v) => setLabForm(p => ({ ...p, [k]: v }));

  const goCollectAnother = () => {
    setLastResult(null);
    gps.start();
    setView('add');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>

        <OfflineBanner online={offlineSync.online} pendingCount={offlineSync.pendingCount} syncing={offlineSync.syncing} onSyncNow={offlineSync.runSync} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Soil Samples</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{samples.length} sample{samples.length !== 1 ? 's' : ''} collected{activeFarm ? ` — ${activeFarm.nickname || activeFarm.name}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['map','list'].map(v => (
              <button key={v} onClick={() => { setView(v); if (v === 'map') { mapInstanceRef.current = null; markersRef.current = []; } }} style={{
                padding: '7px 14px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
                border: `1px solid ${view === v ? 'var(--green)' : 'var(--border2)'}`,
                background: view === v ? 'var(--green-glow)' : 'var(--surface)',
                color: view === v ? 'var(--green)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'DM Mono, monospace',
              }}>{v === 'map' ? '🗺 Map' : '📋 List'}</button>
            ))}
            {(activeFarm || trialId) && (
              <button onClick={() => setShowInvite(true)} style={{
                padding: '7px 14px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
                border: '1px solid var(--green-muted)', background: 'var(--green-glow)', color: 'var(--green)',
                cursor: 'pointer', fontFamily: 'DM Mono, monospace',
              }}>👥 Invite</button>
            )}
            <button className="btn-primary" onClick={() => setView('add')}>+ Collect Sample</button>
          </div>
        </div>

        {sessionSamples.length > 0 && view !== 'add' && (
          <SessionSummary samples={sessionSamples} startedAt={sessionStart} />
        )}

        {/* MAP VIEW */}
        {view === 'map' && (
          <div>
            {samples.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>No samples yet</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Go to a field and tap "+ Collect Sample" to drop your first GPS pin.</div>
                <button className="btn-primary" onClick={() => setView('add')}>+ Collect First Sample</button>
              </div>
            ) : (
              <>
                <div ref={mapRef} style={{ width: '100%', height: 420, border: '1px solid var(--border)', marginBottom: 16, background: 'var(--surface2)' }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[['#4ade80','Excellent (8–10)'],['#fbbf24','Good (6–7)'],['#fb923c','Fair (4–5)'],['#f87171','Poor (1–3)']].map(([c,l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Selected sample detail */}
            {selectedSample && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {selectedSample.field_name || 'Soil Sample'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {new Date(selectedSample.sample_date + 'T12:00:00').toLocaleDateString()} · {selectedSample.lat.toFixed(5)}, {selectedSample.lng.toFixed(5)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Depth: {selectedSample.depth_top_in}"–{selectedSample.depth_bottom_in}" · {CROP_LABELS[selectedSample.crop_type] || selectedSample.crop_type}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: scoreColor(selectedSample.health_score || 5), lineHeight: 1 }}>{selectedSample.health_score || '?'}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>/ 10</div>
                      <div style={{ fontSize: 10, color: scoreColor(selectedSample.health_score || 5), fontWeight: 600 }}>{selectedSample.score_label || '—'}</div>
                    </div>
                    <button onClick={() => setSelectedSample(null)} style={{ fontSize: 14, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>

                {selectedSample.photo_url && (
                  <img src={selectedSample.photo_url} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', marginBottom: 12, border: '1px solid var(--border)' }} alt="soil sample" />
                )}

                {selectedSample.ai_photo_analysis && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--blue)' }}>🔎 AI Photo Read: </span>{selectedSample.ai_photo_analysis}
                  </div>
                )}

                {/* Lab results */}
                {(selectedSample.lab_ph || selectedSample.lab_om_pct || selectedSample.lab_nitrogen_ppm) ? (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Lab Results</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                      {[
                        { label: 'pH',          val: selectedSample.lab_ph },
                        { label: 'OM %',         val: selectedSample.lab_om_pct },
                        { label: 'CEC',          val: selectedSample.lab_cec },
                        { label: 'N (ppm)',      val: selectedSample.lab_nitrogen_ppm },
                        { label: 'P (ppm)',      val: selectedSample.lab_phosphorus_ppm },
                        { label: 'K (ppm)',      val: selectedSample.lab_potassium_ppm },
                        { label: 'Ca (ppm)',     val: selectedSample.lab_calcium_ppm },
                        { label: 'Mg (ppm)',     val: selectedSample.lab_magnesium_ppm },
                      ].filter(m => m.val).map(m => (
                        <div key={m.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '8px 10px' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{m.label}</div>
                          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m.val}</div>
                        </div>
                      ))}
                    </div>
                    {selectedSample.lab_notes && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>{selectedSample.lab_notes}</div>}
                  </div>
                ) : (
                  <button onClick={() => { setShowLabEntry(true); setLabForm({ ph:'',om:'',cec:'',n:'',p:'',k:'',ca:'',mg:'',notes:'' }); }} style={{
                    fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)',
                    padding: '8px 16px', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                  }}>+ Enter Lab Results</button>
                )}

                {selectedSample.notes && <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>{selectedSample.notes}</div>}
                {selectedSample.reviewed && selectedSample.reviewer_notes && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid var(--green-muted)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--green)' }}>Algaeo Feedback: </span>{selectedSample.reviewer_notes}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div>
            {samples.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No samples yet.</div>}
            {samples.map(s => (
              <div key={s.id} onClick={() => { setSelectedSample(s); setView('map'); setTimeout(() => { mapInstanceRef.current = null; markersRef.current = []; }, 50); }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                {s.photo_url && <img src={s.photo_url} style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} alt="" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.field_name || 'Soil Sample'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(s.sample_date + 'T12:00:00').toLocaleDateString()} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)} · {s.depth_top_in}"–{s.depth_bottom_in}"
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{CROP_LABELS[s.crop_type] || s.crop_type}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: scoreColor(s.health_score || 5) }}>{s.health_score || '?'}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.score_label || '—'}</div>
                  {s.lab_ph && <div style={{ fontSize: 9, color: 'var(--green)', marginTop: 2 }}>Lab ✓</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD SAMPLE VIEW — reordered for field use: GPS auto-starts, photo comes right after, technical fields collapse */}
        {view === 'add' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Collect Soil Sample</div>
            {trialId && trialName && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.04em', color: 'var(--green)', background: 'var(--green-glow)', border: '1px solid var(--green-muted)', padding: '4px 10px', marginBottom: 12 }}>
                🔬 For trial: {trialName}
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>Standing at your sample spot, the GPS lock happens automatically below.</div>

            {/* GPS — auto-starts, ring tightens as it locks */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24, padding: '20px 0', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <AccuracyRing accuracy={gps.position?.accuracy ?? null} locked={gps.locked} threshold={GPS_THRESHOLD} />
              {gps.locked ? (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                  {gps.position.lat.toFixed(5)}, {gps.position.lng.toFixed(5)}
                  <button onClick={() => gps.reacquire()} style={{ marginLeft: 10, fontSize: 10, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Reacquire</button>
                </div>
              ) : gps.error ? (
                <div style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>{gps.error}<button onClick={() => gps.start()} style={{ marginLeft: 10, fontSize: 10, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Retry</button></div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Move to open sky for a faster lock</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Photo — right after GPS, most important field for a collector */}
              <F label="Soil Photo">
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ border: `2px dashed ${photoPreview ? 'var(--green-muted)' : 'var(--border2)'}`, background: photoPreview ? 'var(--green-glow)' : 'var(--bg)', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {photoPreview
                      ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>📷 Tap to take photo</div>
                    }
                  </div>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
                </label>
                {analyzing && (
                  <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="spin-dot" /> Reading soil from photo…
                  </div>
                )}
                {aiAnalysis && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--blue)' }}>🔎 AI Read: </span>{aiAnalysis}
                  </div>
                )}
                {aiNote && <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 8 }}>{aiNote}</div>}
              </F>

              <Row>
                <F label="Field Name"><input className="input-base" value={form.fieldName} onChange={e => setF('fieldName', e.target.value)} placeholder="North 40" /></F>
                <F label="Crop Type">
                  <select className="input-base" value={form.cropType} onChange={e => setF('cropType', e.target.value)} style={{ background: 'var(--bg)' }}>
                    {CROPS.map(c => <option key={c} value={c}>{CROP_LABELS[c]}</option>)}
                  </select>
                </F>
              </Row>

              <F label="Notes"><textarea className="input-base" value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Sample conditions, color, texture, smell..." style={{ resize: 'vertical', minHeight: 64 }} /></F>

              {/* Technical fields — collapsed by default, collectors rarely need these */}
              <button onClick={() => setShowAdvanced(p => !p)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)',
                padding: '10px 14px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.04em',
              }}>
                <span>⚙ Advanced (depth, soil type, irrigation)</span>
                <span>{showAdvanced ? '▲' : '▼'}</span>
              </button>

              {showAdvanced && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <Row>
                    <F label="Sample Date"><input className="input-base" type="date" value={form.sampleDate} onChange={e => setF('sampleDate', e.target.value)} /></F>
                    <F label="USDA Zone"><input className="input-base" type="text" value={form.usdaZone} onChange={e => setF('usdaZone', e.target.value)} placeholder="6a" /></F>
                  </Row>
                  <Row>
                    <F label="Depth Top (in)"><input className="input-base" type="number" value={form.depthTopIn} onChange={e => setF('depthTopIn', e.target.value)} /></F>
                    <F label="Depth Bottom (in)"><input className="input-base" type="number" value={form.depthBottomIn} onChange={e => setF('depthBottomIn', e.target.value)} /></F>
                  </Row>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <F label="Soil Type">
                      <select className="input-base" value={form.soilType} onChange={e => setF('soilType', e.target.value)} style={{ background: 'var(--bg)' }}>
                        {['clay','loam','sandy_loam','silt','silt_loam','sandy','peat','chalk'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </F>
                    <F label="Irrigation">
                      <select className="input-base" value={form.irrigationType} onChange={e => setF('irrigationType', e.target.value)} style={{ background: 'var(--bg)' }}>
                        {['drip','pivot','flood','rain_fed','furrow','overhead'].map(i => <option key={i} value={i}>{i.replace('_',' ')}</option>)}
                      </select>
                    </F>
                    <F label="Avg Rainfall (in)"><input className="input-base" type="number" value={form.avgRainfallIn} onChange={e => setF('avgRainfallIn', e.target.value)} /></F>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn-primary" onClick={saveSample} disabled={saving || !gps.position} style={{ flex: 1 }}>
                  {saving ? 'Saving...' : !gps.position ? 'Waiting on GPS...' : !offlineSync.online ? 'Save Offline →' : 'Save Sample →'}
                </button>
                <button onClick={() => (trialId ? router.push('/trials') : setView('map'))} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border2)', padding: '10px 16px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>{trialId ? '← Back to Trial' : 'Cancel'}</button>
              </div>
            </div>
          </div>
        )}

        {/* SAVED — confirmation with spatial delta + session context */}
        {view === 'saved' && lastResult && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--green-muted)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{lastResult.offline ? '📥' : '✅'}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: scoreColor(lastResult.score) }}>{lastResult.score}</div>
            <div style={{ fontSize: 11, color: scoreColor(lastResult.score), fontWeight: 600, marginBottom: 4 }}>{lastResult.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {lastResult.offline ? 'Sample Queued' : 'Sample Saved'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 20, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
              {lastResult.offline
                ? 'No signal right now — this sample is stored on your device and will sync automatically once you\u2019re back in range.'
                : 'Your GPS-tagged sample has been saved to the farm map.'}
            </div>

            {lastResult.delta && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 20, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                📐 This spot is{' '}
                <strong style={{ color: lastResult.score >= lastResult.delta.sample.health_score ? 'var(--green)' : 'var(--amber)' }}>
                  {Math.abs(lastResult.score - (lastResult.delta.sample.health_score || 0)).toFixed(1)} points {lastResult.score >= lastResult.delta.sample.health_score ? 'healthier' : 'lower'}
                </strong>
                {' '}than your sample {Math.round(lastResult.delta.distanceFt)}ft {lastResult.delta.dir} of here ({lastResult.delta.sample.field_name || 'unnamed'}).
              </div>
            )}

            <SessionSummary samples={sessionSamples} startedAt={sessionStart} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto', marginTop: 16 }}>
              <button className="btn-primary" onClick={goCollectAnother}>+ Collect Another Sample</button>
              {trialId ? (
                <button onClick={() => router.push('/trials')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border2)', padding: '10px 16px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>← Back to Trial</button>
              ) : (
                <button onClick={() => { setView('map'); mapInstanceRef.current = null; markersRef.current = []; }} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border2)', padding: '10px 16px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>View Map</button>
              )}
            </div>
          </div>
        )}

        {/* Lab Results Modal */}
        {showLabEntry && selectedSample && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Enter Lab Results</div>
                <button onClick={() => setShowLabEntry(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--amber)', padding: '8px 12px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 20, lineHeight: 1.6 }}>
                ⚠ Lab results from a certified soil test or 16S rRNA sequencing kit. Color-based scores are estimates only.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[
                  { key:'ph',  label:'pH' },
                  { key:'om',  label:'Organic Matter %' },
                  { key:'cec', label:'CEC (meq/100g)' },
                  { key:'n',   label:'Nitrogen (ppm)' },
                  { key:'p',   label:'Phosphorus (ppm)' },
                  { key:'k',   label:'Potassium (ppm)' },
                  { key:'ca',  label:'Calcium (ppm)' },
                  { key:'mg',  label:'Magnesium (ppm)' },
                ].map(f => (
                  <F key={f.key} label={f.label}>
                    <input className="input-base" type="number" value={labForm[f.key]} onChange={e => setL(f.key, e.target.value)} />
                  </F>
                ))}
              </div>
              <F label="Lab Notes">
                <textarea className="input-base" value={labForm.notes} onChange={e => setL('notes', e.target.value)} placeholder="Lab name, test date, method..." style={{ resize: 'vertical', minHeight: 60 }} />
              </F>
              <button className="btn-primary" onClick={saveLabResults} style={{ marginTop: 16, width: '100%' }}>Save Lab Results →</button>
            </div>
          </div>
        )}

        {showInvite && (activeFarm || trialId) && (
          <InviteModal
            farm={trialId ? null : activeFarm}
            trial={trialId ? { id: trialId, name: trialName || 'this trial', farm_id: activeFarm?.id || null } : null}
            onClose={() => setShowInvite(false)}
          />
        )}

      </div>
      <style>{`
        .spin-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); display: inline-block; animation: spinDotPulse 1s ease-in-out infinite; }
        @keyframes spinDotPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}
function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}
