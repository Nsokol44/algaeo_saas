'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { calcSoilHealthScore } from '@/lib/soilScore';

const CROPS = ['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus','hemp','cannabis'];
const CROP_LABELS = { corn:'Corn', soybeans:'Soybeans', peanuts:'Peanuts', tomatoes:'Tomatoes', berries:'Berries', pasture:'Pasture', miscanthus:'Miscanthus', hemp:'Hemp', cannabis:'Cannabis' };

function CollectInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClient();

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('landing'); // landing | signin | collect | done
  const [session, setSession] = useState(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const [form, setForm] = useState({
    lat: null, lng: null, accuracy: null,
    fieldName: '', cropType: 'corn',
    depthTopIn: 0, depthBottomIn: 6,
    notes: '', sampleDate: new Date().toISOString().split('T')[0],
    soilType: 'loam', irrigationType: 'rain_fed',
    avgRainfallIn: 36, usdaZone: '6a',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (!token) { setError('Invalid invite link.'); return; }
    validateToken();
    // Check if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setSession(session); setStep('collect'); }
    });
    supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setSession(session); setStep('collect'); }
    });
  }, [token]);

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

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(p => ({ ...p, lat: parseFloat(pos.coords.latitude.toFixed(7)), lng: parseFloat(pos.coords.longitude.toFixed(7)), accuracy: Math.round(pos.coords.accuracy) }));
        setLocating(false);
      },
      (err) => { alert(`Location error: ${err.message}`); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const saveSample = async () => {
    if (!form.lat || !form.lng) { alert('Capture GPS location first.'); return; }
    if (!invite) return;
    setSaving(true);

    // Ensure user exists (anonymous or signed in)
    let userId = session?.user?.id;
    if (!userId) {
      // Sign in anonymously
      const { data } = await supabase.auth.signInAnonymously();
      userId = data?.user?.id;
    }
    if (!userId) { alert('Could not establish session. Please try again.'); setSaving(false); return; }

    let photoUrl = null;
    if (photo) {
      const ext = photo.name.split('.').pop();
      const path = `guests/${userId}/${Date.now()}.${ext}`;
      const { data: upload } = await supabase.storage.from('soil-photos').upload(path, photo);
      if (upload) {
        const { data: urlData } = supabase.storage.from('soil-photos').getPublicUrl(path);
        photoUrl = urlData?.publicUrl;
      }
    }

    const score = calcSoilHealthScore({ soilType: form.soilType, irrigationType: form.irrigationType, avgRainfallIn: form.avgRainfallIn, usdaZone: form.usdaZone, cropType: form.cropType });

    await supabase.from('soil_samples').insert({
      user_id: userId,
      farm_id: invite.farm_id,
      field_name: form.fieldName || null,
      sample_date: form.sampleDate,
      lat: form.lat, lng: form.lng,
      depth_top_in: form.depthTopIn,
      depth_bottom_in: form.depthBottomIn,
      crop_type: form.cropType,
      photo_url: photoUrl,
      health_score: score.score,
      score_label: score.label,
      notes: form.notes || null,
    });

    // Increment invite use count
    await supabase.from('guest_invites').update({ use_count: invite.use_count + 1 }).eq('id', invite.id);

    // Grant guest access if signed in
    if (session?.user?.id) {
      await supabase.from('guest_farm_access').upsert({ guest_user_id: session.user.id, farm_id: invite.farm_id, invite_id: invite.id });
    }

    setSaving(false);
    setStep('done');
  };

  const farmName = invite?.farms?.nickname || invite?.farms?.name || 'the farm';
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/algaeo-logo.png" alt="Algaeo" style={{ width: 52, height: 52, borderRadius: '50%', marginBottom: 10 }} />
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>Algaeo.io</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Field Sample Collection</div>
        </div>

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 13, padding: '14px 18px', textAlign: 'center', borderRadius: 2 }}>
            {error}
          </div>
        )}

        {/* LANDING */}
        {step === 'landing' && invite && !error && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', padding: 32 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              You've been invited to collect soil samples
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 24 }}>
              <strong style={{ color: 'var(--text-dim)' }}>{invite.label}</strong> — collecting for <strong style={{ color: 'var(--text-dim)' }}>{farmName}</strong>
            </div>

            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 24, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              You can collect samples right now without signing in. If you'd like to track your own results and come back to see feedback, create a free guest account with just your email.
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

            <button onClick={getLocation} disabled={locating} style={{
              width: '100%', padding: 16, fontSize: 14, fontFamily: 'Syne, sans-serif', fontWeight: 700,
              background: form.lat ? 'rgba(74,222,128,0.1)' : 'var(--green)',
              color: form.lat ? 'var(--green)' : '#0a0c0a',
              border: form.lat ? '1px solid var(--green-muted)' : 'none',
              cursor: locating ? 'wait' : 'pointer', marginBottom: 8,
            }}>
              {locating ? '📡 Getting location...' : form.lat ? `📍 ${form.lat.toFixed(5)}, ${form.lng.toFixed(5)} (±${form.accuracy}m)` : '📍 Capture GPS Location'}
            </button>
            {form.accuracy && <div style={{ fontSize: 10, color: form.accuracy <= 20 ? 'var(--green)' : 'var(--amber)', marginBottom: 16 }}>{form.accuracy <= 20 ? `✓ Good — ${form.accuracy}m` : `⚠ ${form.accuracy}m — move to open sky`}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Field Name"><input className="input-base" value={form.fieldName} onChange={e => setF('fieldName', e.target.value)} placeholder="North 40" /></F>
                <F label="Sample Date"><input className="input-base" type="date" value={form.sampleDate} onChange={e => setF('sampleDate', e.target.value)} /></F>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Depth Top (in)"><input className="input-base" type="number" value={form.depthTopIn} onChange={e => setF('depthTopIn', e.target.value)} /></F>
                <F label="Depth Bottom (in)"><input className="input-base" type="number" value={form.depthBottomIn} onChange={e => setF('depthBottomIn', e.target.value)} /></F>
              </div>
              <F label="Crop Type">
                <select className="input-base" value={form.cropType} onChange={e => setF('cropType', e.target.value)} style={{ background: 'var(--bg)' }}>
                  {CROPS.map(c => <option key={c} value={c}>{CROP_LABELS[c]}</option>)}
                </select>
              </F>
              <F label="Soil Photo">
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ border: `2px dashed ${photoPreview ? 'var(--green-muted)' : 'var(--border2)'}`, background: photoPreview ? 'var(--green-glow)' : 'var(--bg)', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {photoPreview ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>📷 Tap to take photo</div>}
                  </div>
                  <input type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files[0]; if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); } }} style={{ display: 'none' }} />
                </label>
              </F>
              <F label="Notes"><textarea className="input-base" value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Color, texture, smell..." style={{ resize: 'vertical', minHeight: 64 }} /></F>
              <button className="btn-primary" onClick={saveSample} disabled={saving || !form.lat} style={{ padding: 14, fontSize: 13 }}>
                {saving ? 'Saving...' : !form.lat ? 'Capture GPS First' : 'Submit Sample →'}
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 10 }}>Sample Submitted!</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 24 }}>
              Your soil sample has been saved to <strong style={{ color: 'var(--text-dim)' }}>{farmName}</strong>. {session ? 'You can log in to algaeo.io to see your results and any Algaeo feedback.' : 'Create a free guest account to track your results and receive Algaeo feedback.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" onClick={() => { setStep('collect'); setForm(p => ({ ...p, lat: null, lng: null, accuracy: null, fieldName: '', notes: '' })); setPhoto(null); setPhotoPreview(null); }}>
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
