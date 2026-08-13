'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { calcSoilHealthScore } from '@/lib/soilScore';
import { useGpsLock } from '@/lib/useGpsLock';
import { useOfflineSync } from '@/lib/useOfflineSync';
import { queueSample, isOnline } from '@/lib/offlineQueue';
import { compressImage, dataUrlToBlob } from '@/lib/imageUtils';
import { analyzeSoilPhoto } from '@/lib/soilVision';
import { nearestSample } from '@/lib/geo';
import CompassNeedle from '@/components/ui/CompassNeedle';
import AccuracyRing from '@/components/ui/AccuracyRing';
import SessionSummary from '@/components/ui/SessionSummary';
import OfflineBanner from '@/components/ui/OfflineBanner';

const CROPS = ['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus','hemp','cannabis'];
const CROP_LABELS = { corn:'Corn', soybeans:'Soybeans', peanuts:'Peanuts', tomatoes:'Tomatoes', berries:'Berries', pasture:'Pasture', miscanthus:'Miscanthus', hemp:'Hemp', cannabis:'Cannabis' };
const scoreColor = (s) => s >= 8 ? '#4ade80' : s >= 6 ? '#fbbf24' : s >= 4 ? '#fb923c' : '#f87171';
const GPS_THRESHOLD = 10;

function CollectInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClient();

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('landing'); // landing | signin | collect | saved
  const [session, setSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    fieldName: '', cropType: 'corn',
    depthTopIn: 0, depthBottomIn: 6,
    notes: '', sampleDate: new Date().toISOString().split('T')[0],
    soilType: 'loam', irrigationType: 'rain_fed',
    avgRainfallIn: 36, usdaZone: '6a',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiNote, setAiNote] = useState(null);

  const gps = useGpsLock({ threshold: GPS_THRESHOLD, autoCapture: true });
  const offlineSync = useOfflineSync(supabase);

  const [sessionSamples, setSessionSamples] = useState([]);
  const [sessionStart] = useState(() => Date.now());
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (!token) { setError('Invalid invite link.'); return; }
    validateToken();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSession(session);
    });
    supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setSession(session);
    });
  }, [token]);

  useEffect(() => {
    if (step === 'collect') gps.start(); else gps.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const validateToken = async () => {
    const { data } = await supabase.from('guest_invites').select('*, farms(name, nickname)').eq('token', token).eq('active', true).single();
    if (!data) { setError('This invite link is invalid or has expired.'); return; }
    if (new Date(data.expires_at) < new Date()) { setError('This invite link has expired.'); return; }
    if (data.use_count >= data.max_uses) { setError('This invite link has reached its maximum uses.'); return; }
    setInvite(data);
  };

  const sendMagicLink = async () => {
    if (!guestEmail) return;
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: guestEmail,
      options: { emailRedirectTo: `${window.location.origin}/collect?token=${token}` },
    });
    setSigningIn(false);
    if (error) { setError(error.message); return; }
    setMagicSent(true);
  };

  const continueAsGuest = () => setStep('collect');

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
        } catch {
          setAiNote('AI read unavailable right now — the photo is still saved with your sample.');
        } finally {
          setAnalyzing(false);
        }
      } else {
        setAiNote('No signal — AI photo read will run once you\u2019re back online.');
      }
    } catch {
      alert('Could not process that photo. Please try again.');
    }
  };

  const resetFormForNext = () => {
    setForm(p => ({ ...p, fieldName: '', notes: '' }));
    setPhotoPreview(null);
    setAiAnalysis(null);
    setAiNote(null);
  };

  const saveSample = async () => {
    if (!gps.position) { alert('Waiting on GPS — hold on a moment.'); return; }
    if (!invite) return;
    setSaving(true);

    const score = calcSoilHealthScore({ soilType: form.soilType, irrigationType: form.irrigationType, avgRainfallIn: form.avgRainfallIn, usdaZone: form.usdaZone, cropType: form.cropType });
    const delta = nearestSample({ id: null, lat: gps.position.lat, lng: gps.position.lng }, sessionSamples.map((s, i) => ({ ...s, id: i })));

    const rowBase = {
      farm_id: invite.farm_id,
      field_name: form.fieldName || null,
      sample_date: form.sampleDate,
      lat: gps.position.lat, lng: gps.position.lng,
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
      let userId = session?.user?.id;
      if (!userId) {
        const { data } = await supabase.auth.signInAnonymously();
        userId = data?.user?.id;
      }
      if (!userId) { alert('Could not establish session. Please try again.'); setSaving(false); return; }

      let photoUrl = null;
      if (photoPreview) {
        const blob = dataUrlToBlob(photoPreview);
        const path = `guests/${userId}/${Date.now()}.jpg`;
        const { data: upload } = await supabase.storage.from('soil-photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (upload) {
          const { data: urlData } = supabase.storage.from('soil-photos').getPublicUrl(path);
          photoUrl = urlData?.publicUrl;
        }
      }

      await supabase.from('soil_samples').insert({ ...rowBase, user_id: userId, photo_url: photoUrl });
      await supabase.rpc('increment_invite_use', { invite_id: invite.id }).catch(async () => {
        await supabase.from('guest_invites').update({ use_count: invite.use_count + 1 }).eq('id', invite.id);
      });
      if (session?.user?.id) {
        await supabase.from('guest_farm_access').upsert({ guest_user_id: session.user.id, farm_id: invite.farm_id, invite_id: invite.id });
      }
    } else {
      await queueSample({
        row: { ...rowBase, user_id: session?.user?.id || null },
        photoDataUrl: photoPreview,
        storagePathPrefix: `guests/${session?.user?.id || 'pending'}`,
        needsAnonAuth: !session?.user?.id,
        inviteId: invite.id,
        farmIdForGuestAccess: invite.farm_id,
      });
      offlineSync.refreshCount();
    }

    setSessionSamples((prev) => [...prev, { score: score.score, lat: gps.position.lat, lng: gps.position.lng, timestamp: Date.now() }]);
    setLastResult({ score: score.score, label: score.label, delta, offline: !isOnline() });

    setSaving(false);
    resetFormForNext();
    gps.stop();
    setStep('saved');
  };

  const farmName = invite?.farms?.nickname || invite?.farms?.name || 'the farm';
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', padding: 32, maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Invite Link Issue</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>

        {step !== 'landing' && (
          <OfflineBanner online={offlineSync.online} pendingCount={offlineSync.pendingCount} syncing={offlineSync.syncing} onSyncNow={offlineSync.runSync} />
        )}

        {/* LANDING */}
        {step === 'landing' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                You've been invited to collect soil samples
              </div>
              <CompassNeedle size={52} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 24 }}>
              <strong style={{ color: 'var(--text-dim)' }}>{invite.label}</strong> — collecting for <strong style={{ color: 'var(--text-dim)' }}>{farmName}</strong>
            </div>

            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 24, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              You can collect samples right now without signing in — even out of signal, your samples save on this device and sync automatically once you're back in range. If you'd like to track your own results and get feedback, create a free guest account with just your email.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" onClick={continueAsGuest} style={{ padding: 14, fontSize: 13 }}>
                📍 Start Collecting Now →
              </button>
              <button onClick={() => setStep('signin')} style={{ padding: 14, fontSize: 12, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Mono, monospace', letterSpacing: '0.04em' }}>
                Create free account to track my results
              </button>
            </div>
          </div>
        )}

        {/* SIGN IN (magic link) */}
        {step === 'signin' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', padding: 32 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Create a guest account</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
              Enter your email and we'll send you a magic link. No password needed. You'll be able to see the samples you collect and any feedback from Algaeo.
            </div>
            {magicSent ? (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid var(--green-muted)', color: 'var(--green)', fontSize: 12, padding: '14px 16px', lineHeight: 1.7, marginBottom: 16 }}>
                ✓ Check your email for the magic link. Click it and you'll be brought right back here to start collecting.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email</div>
                  <input className="input-base" type="email" placeholder="you@email.com" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMagicLink()} />
                </div>
                <button className="btn-primary" onClick={sendMagicLink} disabled={signingIn} style={{ width: '100%', marginBottom: 10 }}>
                  {signingIn ? 'Sending...' : 'Send Magic Link →'}
                </button>
              </>
            )}
            <button onClick={continueAsGuest} style={{ width: '100%', padding: 11, fontSize: 11, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
              Skip — collect without account
            </button>
          </div>
        )}

        {/* COLLECT */}
        {step === 'collect' && invite && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', padding: 24 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Collect Soil Sample</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Collecting for: <span style={{ color: 'var(--green)' }}>{farmName}</span>{session ? ` · Signed in as ${session.user.email}` : ' · Guest'}</div>

            {sessionSamples.length > 0 && <SessionSummary samples={sessionSamples} startedAt={sessionStart} />}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20, padding: '18px 0', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <AccuracyRing accuracy={gps.position?.accuracy ?? null} locked={gps.locked} threshold={GPS_THRESHOLD} size={112} />
              {gps.locked ? (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                  {gps.position.lat.toFixed(5)}, {gps.position.lng.toFixed(5)}
                  <button onClick={() => gps.reacquire()} style={{ marginLeft: 10, fontSize: 10, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Reacquire</button>
                </div>
              ) : gps.error ? (
                <div style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>{gps.error}</div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Move to open sky for a faster lock</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <F label="Soil Photo">
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ border: `2px dashed ${photoPreview ? 'var(--green-muted)' : 'var(--border2)'}`, background: photoPreview ? 'var(--green-glow)' : 'var(--bg)', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {photoPreview ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>📷 Tap to take photo</div>}
                  </div>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
                </label>
                {analyzing && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 8 }}>Reading soil from photo…</div>}
                {aiAnalysis && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                    <span style={{ color: 'var(--blue)' }}>🔎 AI Read: </span>{aiAnalysis}
                  </div>
                )}
                {aiNote && <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 8 }}>{aiNote}</div>}
              </F>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Field Name"><input className="input-base" value={form.fieldName} onChange={e => setF('fieldName', e.target.value)} placeholder="North 40" /></F>
                <F label="Crop Type">
                  <select className="input-base" value={form.cropType} onChange={e => setF('cropType', e.target.value)} style={{ background: 'var(--bg)' }}>
                    {CROPS.map(c => <option key={c} value={c}>{CROP_LABELS[c]}</option>)}
                  </select>
                </F>
              </div>
              <F label="Notes"><textarea className="input-base" value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Color, texture, smell..." style={{ resize: 'vertical', minHeight: 64 }} /></F>

              <button onClick={() => setShowAdvanced(p => !p)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)',
                padding: '10px 14px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 11,
              }}>
                <span>⚙ Advanced (depth, sample date)</span><span>{showAdvanced ? '▲' : '▼'}</span>
              </button>
              {showAdvanced && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <F label="Depth Top (in)"><input className="input-base" type="number" value={form.depthTopIn} onChange={e => setF('depthTopIn', e.target.value)} /></F>
                  <F label="Depth Bottom (in)"><input className="input-base" type="number" value={form.depthBottomIn} onChange={e => setF('depthBottomIn', e.target.value)} /></F>
                  <F label="Sample Date"><input className="input-base" type="date" value={form.sampleDate} onChange={e => setF('sampleDate', e.target.value)} /></F>
                </div>
              )}

              <button className="btn-primary" onClick={saveSample} disabled={saving || !gps.position} style={{ padding: 14, fontSize: 13 }}>
                {saving ? 'Saving...' : !gps.position ? 'Waiting on GPS...' : !offlineSync.online ? 'Save Offline →' : 'Submit Sample →'}
              </button>
            </div>
          </div>
        )}

        {/* SAVED */}
        {step === 'saved' && lastResult && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--green-muted)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>{lastResult.offline ? '📥' : '✅'}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: scoreColor(lastResult.score) }}>{lastResult.score}</div>
            <div style={{ fontSize: 11, color: scoreColor(lastResult.score), fontWeight: 600, marginBottom: 10 }}>{lastResult.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: lastResult.offline ? 'var(--amber)' : 'var(--green)', marginBottom: 10 }}>
              {lastResult.offline ? 'Sample Queued' : 'Sample Submitted!'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 20 }}>
              {lastResult.offline
                ? 'No signal right now — this sample is stored on your device and will sync automatically once you\u2019re back in range.'
                : <>Saved to <strong style={{ color: 'var(--text-dim)' }}>{farmName}</strong>. {session ? 'You can log in to algaeo.io to see your results.' : 'Create a free guest account to track your results and receive Algaeo feedback.'}</>}
            </div>

            {lastResult.delta && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 20, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7, textAlign: 'left' }}>
                📐 This spot is{' '}
                <strong style={{ color: lastResult.score >= lastResult.delta.sample.score ? 'var(--green)' : 'var(--amber)' }}>
                  {Math.abs(lastResult.score - lastResult.delta.sample.score).toFixed(1)} points {lastResult.score >= lastResult.delta.sample.score ? 'healthier' : 'lower'}
                </strong>
                {' '}than your last sample {Math.round(lastResult.delta.distanceFt)}ft {lastResult.delta.dir} of here.
              </div>
            )}

            <SessionSummary samples={sessionSamples} startedAt={sessionStart} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={() => setStep('collect')}>
                + Collect Another Sample
              </button>
              {!session && (
                <button onClick={() => setStep('signin')} style={{ padding: 11, fontSize: 11, background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
                  Create account to track results
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>algaeo.com ↗</a>
        </div>
      </div>
    </div>
  );
}

export default function CollectPage(){ return <Suspense fallback={<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'var(--green)',fontFamily:'Syne,sans-serif'}}>Loading...</div></div>}><CollectInner/></Suspense>; }

function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}
