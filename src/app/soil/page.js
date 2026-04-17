'use client';
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useFarm } from '@/lib/FarmContext';
import { calcSoilHealthScore } from '@/lib/soilScore';
import { createClient } from '@/lib/supabase';

const SOIL_TYPES = ['clay','loam','sandy_loam','silt','silt_loam','sandy','peat','chalk'];
const IRRIGATION = ['drip','pivot','flood','rain_fed','furrow','overhead'];
const CROPS = ['corn','soybeans','peanuts','tomatoes','berries','pasture','miscanthus'];
const CROP_LABELS = { corn:'Corn', soybeans:'Soybeans', peanuts:'Peanuts', tomatoes:'Tomatoes', berries:'Berries', pasture:'Pasture', miscanthus:'Miscanthus' };

export default function SoilPage() {
  const { activeFarm } = useFarm();
  const supabase = createClient();

  const [form, setForm] = useState({
    cropType: activeFarm?.primary_crops?.[0]?.toLowerCase() || 'corn',
    soilType: activeFarm?.soil_type || 'loam',
    irrigationType: activeFarm?.irrigation_type || 'rain_fed',
    avgRainfallIn: activeFarm?.avg_rainfall_in || 36,
    usdaZone: activeFarm?.usda_zone || '6a',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pastScans, setPastScans] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const calculate = () => {
    const score = calcSoilHealthScore({
      soilType: form.soilType,
      irrigationType: form.irrigationType,
      avgRainfallIn: form.avgRainfallIn,
      usdaZone: form.usdaZone,
      cropType: form.cropType,
    });
    setResult(score);
  };

  const submitScan = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    let photoUrl = null;

    if (photo) {
      const ext = photo.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data: upload } = await supabase.storage.from('soil-photos').upload(path, photo);
      if (upload) {
        const { data: urlData } = supabase.storage.from('soil-photos').getPublicUrl(path);
        photoUrl = urlData?.publicUrl;
      }
    }

    const score = result || calcSoilHealthScore({ soilType: form.soilType, irrigationType: form.irrigationType, avgRainfallIn: form.avgRainfallIn, usdaZone: form.usdaZone, cropType: form.cropType });

    await supabase.from('soil_scans').insert({
      user_id: user.id,
      farm_id: activeFarm?.id || null,
      crop_type: form.cropType,
      photo_url: photoUrl,
      soil_type: form.soilType,
      irrigation_type: form.irrigationType,
      avg_rainfall_in: form.avgRainfallIn,
      usda_zone: form.usdaZone,
      health_score: score.score,
      score_breakdown: score.breakdown,
    });

    setSaving(false);
    setSubmitted(true);
  };

  const loadPastScans = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('soil_scans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
    setPastScans(data || []);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>

        <div className="section-divider">Soil Health Score</div>

        {/* Conditions form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Farm Conditions</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Your score is calculated from these conditions. Upload a soil photo below for manual Algaeo review.</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <F label="Crop Type">
              <select className="input-base" value={form.cropType} onChange={e => set('cropType', e.target.value)} style={{ background: 'var(--bg)' }}>
                {CROPS.map(c => <option key={c} value={c}>{CROP_LABELS[c]}</option>)}
              </select>
            </F>
            <F label="Soil Type">
              <select className="input-base" value={form.soilType} onChange={e => set('soilType', e.target.value)} style={{ background: 'var(--bg)' }}>
                {SOIL_TYPES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </F>
            <F label="Irrigation">
              <select className="input-base" value={form.irrigationType} onChange={e => set('irrigationType', e.target.value)} style={{ background: 'var(--bg)' }}>
                {IRRIGATION.map(i => <option key={i} value={i}>{i.replace('_', ' ')}</option>)}
              </select>
            </F>
            <F label="Avg Rainfall (in/yr)">
              <input className="input-base" type="number" value={form.avgRainfallIn} onChange={e => set('avgRainfallIn', e.target.value)} />
            </F>
            <F label="USDA Zone">
              <input className="input-base" type="text" value={form.usdaZone} onChange={e => set('usdaZone', e.target.value)} placeholder="6a" />
            </F>
          </div>

          <button className="btn-primary" onClick={calculate} style={{ marginTop: 20 }}>Calculate Score →</button>
        </div>

        {/* Score result */}
        {result && (
          <div style={{ background: 'var(--surface)', border: `1px solid ${result.color}44`, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              {/* Big score */}
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 56, fontWeight: 800, color: result.color, lineHeight: 1 }}>{result.score}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>out of 10</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: result.color, marginTop: 6 }}>{result.label}</div>
              </div>

              {/* Breakdown bars */}
              <div style={{ flex: 1, minWidth: 240 }}>
                {Object.entries(result.breakdown).map(([label, { score, max }]) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      <span>{label}</span>
                      <span style={{ color: result.color }}>{score.toFixed(1)} / {max}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border2)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${(score / max) * 100}%`, background: result.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div style={{ marginTop: 16, padding: '12px 16px', background: `${result.color}11`, border: `1px solid ${result.color}33`, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              <span style={{ color: result.color, fontWeight: 600 }}>Algaeo Recommendation: </span>{result.recommendation}
            </div>
          </div>
        )}

        {/* Photo upload */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Soil Photo Upload</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
            Upload a photo of your soil and our team will review it manually. You'll receive an email once feedback is ready.
          </div>

          <label style={{ display: 'block', cursor: 'pointer' }}>
            <div style={{
              border: `2px dashed ${photoPreview ? 'var(--green-muted)' : 'var(--border2)'}`,
              padding: 24, textAlign: 'center',
              background: photoPreview ? 'var(--green-glow)' : 'var(--bg)',
              transition: 'all 0.2s',
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Soil preview" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload soil photo</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG or HEIC — take from ~1ft above soil surface</div>
                </>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          </label>

          {submitted ? (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid var(--green-muted)', fontSize: 12, color: 'var(--green)' }}>
              ✓ Scan submitted. You'll receive an email when Algaeo has reviewed your soil photo.
            </div>
          ) : (
            <button className="btn-primary" onClick={submitScan} disabled={saving} style={{ marginTop: 16 }}>
              {saving ? 'Submitting...' : 'Submit for Review →'}
            </button>
          )}
        </div>

        {/* Past scans */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Past Scans</div>
            <button onClick={loadPastScans} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Load History</button>
          </div>

          {pastScans === null && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click "Load History" to view previous scans.</div>}
          {pastScans?.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No past scans found.</div>}
          {pastScans?.map(scan => (
            <div key={scan.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {scan.photo_url && <img src={scan.photo_url} style={{ width: 48, height: 48, objectFit: 'cover' }} alt="soil" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{CROP_LABELS[scan.crop_type]} — {scan.soil_type?.replace('_',' ')}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(scan.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: scan.health_score >= 8 ? 'var(--green)' : scan.health_score >= 6 ? 'var(--amber)' : '#f87171' }}>{scan.health_score}/10</div>
                {scan.reviewed ? (
                  <div style={{ fontSize: 10, color: 'var(--green)' }}>✓ Reviewed</div>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pending review</div>
                )}
              </div>
              {scan.reviewer_notes && (
                <div style={{ width: '100%', padding: '10px 12px', background: 'rgba(74,222,128,0.06)', border: '1px solid var(--green-muted)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--green)' }}>Algaeo Feedback: </span>{scan.reviewer_notes}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function F({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}
