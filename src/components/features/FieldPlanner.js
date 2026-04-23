'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const CROPS = {
  corn:       { label: 'Corn',             icon: '🌽', baseRate: 300, nReductPct: 0.25, typicalN: 160, note: 'Embrapa 30-trial series: 25% N reduction holds yield with Azospirillum brasilense.', timings: [{ id: 'pre_plant', label: 'Pre-plant broadcast + incorporate', mult: 1.00 }, { id: 'at_plant', label: 'At-plant in-furrow', mult: 0.85 }, { id: 'v4_v6', label: 'V4–V6 side-dress', mult: 0.90 }, { id: 'split', label: 'Split: pre-plant + V4 (recommended)', mult: 1.10 }] },
  soybeans:   { label: 'Soybeans',         icon: '🫘', baseRate: 250, nReductPct: 0.15, typicalN: 0,   note: 'P-solubilization and root growth promotion primary mechanism for soybeans.',           timings: [{ id: 'pre_plant', label: 'Pre-plant broadcast + incorporate', mult: 1.00 }, { id: 'at_plant', label: 'At-plant in-furrow', mult: 0.85 }, { id: 'v2_v3', label: 'V2–V3 foliar spray', mult: 0.80 }] },
  miscanthus: { label: 'Miscanthus',       icon: '🌾', baseRate: 350, nReductPct: 0.20, typicalN: 0,   note: 'Strains GM41 and Sp7 naturally occur in Miscanthus rhizosphere (Li, Voigt & Kent 2016).', timings: [{ id: 'pre_plant', label: 'Pre-plant broadcast + incorporate', mult: 1.00 }, { id: 'spring', label: 'Spring green-up drench', mult: 0.90 }, { id: 'post_harvest', label: 'Post-harvest drench', mult: 0.85 }] },
  wheat:      { label: 'Wheat',            icon: '🌾', baseRate: 280, nReductPct: 0.20, typicalN: 120, note: 'NDSU 2021 — 15% yield increase observed with Azospirillum inoculation.',               timings: [{ id: 'pre_plant', label: 'Pre-plant broadcast', mult: 1.00 }, { id: 'tillering', label: 'Tillering topdress', mult: 0.90 }] },
  tomatoes:   { label: 'Tomatoes',         icon: '🍅', baseRate: 400, nReductPct: 0.15, typicalN: 0,   note: 'Frontiers meta-analysis (2024): tomato shows highest bio-effector response.',           timings: [{ id: 'transplant', label: 'Transplant root drench', mult: 1.00 }, { id: 'fruit_set', label: 'First fruit set drench', mult: 0.85 }] },
  pasture:    { label: 'Pasture / Forage', icon: '🌿', baseRate: 220, nReductPct: 0.20, typicalN: 0,   note: 'Variovorax CF313 ACC deaminase reduces drought stress ethylene in forages.',             timings: [{ id: 'spring', label: 'Spring green-up broadcast', mult: 1.00 }, { id: 'fall', label: 'Fall overseeding', mult: 0.90 }] },
};

const SOILS = {
  degraded:  { label: 'Degraded / compacted',      mult: 1.20, color: '#f87171', note: '+20% — stressed soil needs higher inoculant load' },
  low_om:    { label: 'Low OM (<2%)',              mult: 1.10, color: '#fbbf24', note: '+10% — limited native biology' },
  average:   { label: 'Average OM (2–3.5%)',       mult: 1.00, color: '#4ade80', note: 'Standard rate' },
  high_om:   { label: 'High OM (>3.5%)',           mult: 0.95, color: '#60a5fa', note: '−5% — established biology assists colonization' },
  retreated: { label: 'Previously Algaeo-treated', mult: 0.85, color: '#a78bfa', note: '−15% — maintenance dose only' },
};

const BAG_KG = 25;
const PRICE_PER_KG = 5.0;

// ─────────────────────────────────────────────────────────────────────────────
// Area calculation — Shoelace + spherical earth correction
// ─────────────────────────────────────────────────────────────────────────────
function polygonAreaAcres(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const R = 6378137;
  const pts = latlngs.map(ll => ({ lat: (ll.lat * Math.PI) / 180, lng: (ll.lng * Math.PI) / 180 }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].lng * pts[j].lat;
    area -= pts[j].lng * pts[i].lat;
  }
  return Math.abs((area * R * R) / 2) * 0.000247105;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pellet calculation
// ─────────────────────────────────────────────────────────────────────────────
function calcPellets({ cropKey, timingId, soilKey, areaAcres }) {
  const crop = CROPS[cropKey];
  const soil = SOILS[soilKey];
  if (!crop || !soil || !areaAcres) return null;
  const timing = crop.timings.find(t => t.id === timingId) || crop.timings[0];
  const rateGPerAcre = Math.round(crop.baseRate * timing.mult * soil.mult);
  const totalG = rateGPerAcre * areaAcres;
  const totalKg = totalG / 1000;
  const bags = Math.ceil(totalKg / BAG_KG);
  const cost = totalKg * PRICE_PER_KG;
  let nSavedLbs = 0, nSavedDollars = 0;
  if (crop.typicalN > 0) {
    nSavedLbs = crop.typicalN * crop.nReductPct * areaAcres;
    nSavedDollars = nSavedLbs * 0.55;
  }
  const netRoiPerAcre = areaAcres > 0 ? (nSavedDollars - cost) / areaAcres : 0;
  return {
    rateGPerAcre,
    totalG: Math.round(totalG),
    totalKg: Math.round(totalKg * 10) / 10,
    bags,
    cost: Math.round(cost * 100) / 100,
    nSavedLbs: Math.round(nSavedLbs),
    nSavedDollars: Math.round(nSavedDollars),
    netRoiPerAcre: Math.round(netRoiPerAcre * 100) / 100,
    timingLabel: timing.label,
    soilLabel: soil.label,
    cropNote: crop.note,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function FieldPlanner({ supabase }) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawLayerRef   = useRef(null);
  const polygonRef     = useRef(null);
  const pointsRef      = useRef([]);
  const drawModeRef    = useRef(false);

  const [leafletReady, setLeafletReady] = useState(false);
  const [mapReady,     setMapReady]     = useState(false);
  const [drawMode,     setDrawMode]     = useState(false);
  const [areaAcres,    setAreaAcres]    = useState(0);
  const [geojson,      setGeojson]      = useState(null);

  const [crop,      setCrop]      = useState('corn');
  const [timing,    setTiming]    = useState('pre_plant');
  const [soil,      setSoil]      = useState('average');
  const [farmName,  setFarmName]  = useState('');
  const [fieldName, setFieldName] = useState('');
  const [notes,     setNotes]     = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [searching, setSearching] = useState(false);

  const [result,     setResult]     = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [saveErr,    setSaveErr]    = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [showPlans,  setShowPlans]  = useState(false);

  // Reset timing when crop changes
  useEffect(() => { setTiming(CROPS[crop].timings[0].id); }, [crop]);

  // Recalculate when inputs or area change
  useEffect(() => {
    if (!areaAcres) { setResult(null); return; }
    setResult(calcPellets({ cropKey: crop, timingId: timing, soilKey: soil, areaAcres }));
  }, [crop, timing, soil, areaAcres]);

  // Load Leaflet CSS
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);

  // Init map
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (mapRef.current._leaflet_id) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [36.0, -84.0],
      zoom: 13,
      zoomControl: false,
    });

    // Zoom control bottom-right to avoid overlap with draw button
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20, attribution: '© Esri',
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20, opacity: 0.8,
    }).addTo(map);

    const drawLayer = L.layerGroup().addTo(map);
    drawLayerRef.current = drawLayer;
    mapInstanceRef.current = map;

    map.on('click', (e) => {
      if (!drawModeRef.current) return;
      pointsRef.current.push(e.latlng);

      L.circleMarker(e.latlng, {
        radius: 5, color: '#4ade80', fillColor: '#4ade80', fillOpacity: 1, weight: 2,
      }).addTo(drawLayer);

      if (polygonRef.current) drawLayer.removeLayer(polygonRef.current);
      if (pointsRef.current.length >= 2) {
        polygonRef.current = L.polygon(pointsRef.current, {
          color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.12, weight: 2, dashArray: '6 4',
        }).addTo(drawLayer);
      }
    });

    map.on('dblclick', (e) => {
      if (!drawModeRef.current) return;
      e.originalEvent.preventDefault();
      map.doubleClickZoom.disable();
      setTimeout(() => map.doubleClickZoom.enable(), 300);

      const pts = pointsRef.current;
      if (pts.length < 3) return;

      drawModeRef.current = false;
      setDrawMode(false);
      drawLayer.clearLayers();

      const poly = L.polygon(pts, {
        color: '#4ade80', fillColor: '#4ade80', fillOpacity: 0.18, weight: 2,
      }).addTo(drawLayer);
      polygonRef.current = poly;

      const acres = Math.round(polygonAreaAcres(pts) * 100) / 100;
      const gj = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [pts.map(p => [p.lng, p.lat])] },
        properties: { acres },
      };

      setAreaAcres(acres);
      setGeojson(gj);
      setSaved(false);
      map.fitBounds(poly.getBounds(), { padding: [40, 40] });
    });

    setMapReady(true);
  }, []);

  useEffect(() => { if (leafletReady) initMap(); }, [leafletReady, initMap]);

  // Geocode search — actually pans the map
  const doSearch = async () => {
    if (!searchVal.trim() || !mapInstanceRef.current) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchVal)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        mapInstanceRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 16);
      }
    } catch (e) { /* silent */ }
    setSearching(false);
  };

  const startDraw = () => {
    if (!mapReady) return;
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    pointsRef.current = [];
    polygonRef.current = null;
    drawModeRef.current = true;
    setDrawMode(true);
    setAreaAcres(0);
    setGeojson(null);
    setResult(null);
    setSaved(false);
  };

  const clearField = () => {
    if (drawLayerRef.current) drawLayerRef.current.clearLayers();
    pointsRef.current = [];
    polygonRef.current = null;
    drawModeRef.current = false;
    setDrawMode(false);
    setAreaAcres(0);
    setGeojson(null);
    setResult(null);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!result || !geojson || !supabase) return;
    setSaving(true);
    setSaveErr('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('field_plans').insert({
        user_id: user.id,
        farm_name: farmName,
        field_name: fieldName,
        crop,
        application_timing: timing,
        soil_condition: soil,
        geojson,
        area_acres: areaAcres,
        pellet_rate_g_per_acre: result.rateGPerAcre,
        total_pellets_g: result.totalG,
        total_pellets_kg: result.totalKg,
        bags_needed: result.bags,
        n_reduction_lbs: result.nSavedLbs,
        notes,
      });
      if (error) throw error;
      setSaved(true);
    } catch (e) {
      setSaveErr(e.message || 'Save failed');
    }
    setSaving(false);
  };

  const loadPlans = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('field_plans').select('*').order('created_at', { ascending: false }).limit(20);
    setSavedPlans(data || []);
    setShowPlans(true);
  };

  const hasField = areaAcres > 0;
  const canSave  = hasField && result && (farmName.trim() || fieldName.trim());
  const cropData = CROPS[crop];

  // ── Styles ──────────────────────────────────────────────────────────────────
  const label10 = { fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 };
  const divider = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 };

  return (
    <>
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="lazyOnload" onLoad={() => setLeafletReady(true)} />

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: '-0.02em' }}>Field Planner</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Draw field → get pellet requirements → save to your trial record
          </div>
        </div>
        {supabase && (
          <button onClick={loadPlans} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '8px 14px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Saved Plans ({savedPlans.length || '…'})
          </button>
        )}
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* LEFT: map */}
        <div>
          {/* Search */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              className="input-base"
              placeholder="Search address or farm location…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              style={{ flex: 1 }}
            />
            <button
              onClick={doSearch}
              disabled={searching}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '0 18px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
            >
              {searching ? '…' : 'Go'}
            </button>
          </div>

          {/* Map */}
          <div style={{ position: 'relative', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div ref={mapRef} style={{ width: '100%', height: 440, background: '#0a0c0a' }} />

            {/* Draw controls — top LEFT, zoom is bottom RIGHT */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', gap: 8 }}>
              {!drawMode ? (
                <button
                  onClick={startDraw}
                  disabled={!mapReady}
                  style={{ background: 'var(--green)', color: '#0a0c0a', border: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, padding: '9px 16px', cursor: mapReady ? 'pointer' : 'not-allowed', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 2px 12px rgba(0,0,0,0.6)', opacity: mapReady ? 1 : 0.5 }}
                >
                  {!mapReady ? 'Loading…' : hasField ? '↩ Redraw' : '+ Draw Field'}
                </button>
              ) : (
                <div style={{ background: 'rgba(10,12,10,0.92)', border: '1px solid var(--green)', padding: '9px 14px', fontSize: 11, color: 'var(--green)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                  Click corners → <strong>double-click</strong> to close
                </div>
              )}
              {hasField && !drawMode && (
                <button onClick={clearField} style={{ background: 'rgba(10,12,10,0.9)', border: '1px solid var(--border2)', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 11, padding: '9px 14px', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                  Clear
                </button>
              )}
            </div>

            {/* Area badge */}
            {hasField && (
              <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(10,12,10,0.92)', border: '1px solid var(--green-muted)', padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Area </span>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>{areaAcres.toFixed(2)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>acres</span>
              </div>
            )}

            {!mapReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,12,10,0.7)', zIndex: 999, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Loading satellite imagery…
              </div>
            )}
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, letterSpacing: '0.04em' }}>
            Satellite © Esri, DigitalGlobe · Area: Shoelace formula with spherical earth correction (WGS84)
          </div>

          {/* ── Results — shown after field is drawn ── */}
          {hasField && result && (
            <div style={{ marginTop: 24 }}>

              <div style={{ ...divider }}>
                <span>Pellet Requirements — {areaAcres.toFixed(2)} ac of {cropData.label}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'Application Rate', value: result.rateGPerAcre, unit: 'g / acre',      color: 'var(--green)', highlight: true },
                  { label: 'Total Pellets',     value: result.totalKg,     unit: `kg (${result.totalG.toLocaleString()} g)`, color: 'var(--text)' },
                  { label: 'Bags Needed',       value: result.bags,        unit: '× 25 kg bags',  color: 'var(--amber)' },
                  { label: 'Product Cost',      value: `$${result.cost.toFixed(0)}`, unit: `$${(result.cost / areaAcres).toFixed(2)}/ac`, color: 'var(--text)' },
                ].map(k => (
                  <div key={k.label} className={`kpi-card${k.highlight ? ' highlight' : ''}`}>
                    <div style={label10}>{k.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 500, color: k.color, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.unit}</div>
                  </div>
                ))}
              </div>

              {/* N savings row — corn / wheat only */}
              {result.nSavedLbs > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                  <div className="kpi-card" style={{ borderColor: 'var(--green-muted)' }}>
                    <div style={label10}>N Reduction (25%)</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>{result.nSavedLbs.toLocaleString()} lbs N</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Hungria et al. 2021 — 25% reduction holds yield</div>
                  </div>
                  <div className="kpi-card" style={{ borderColor: 'var(--green-muted)' }}>
                    <div style={label10}>N Cost Savings</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>${result.nSavedDollars.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>@ $0.55/lb N anhydrous benchmark</div>
                  </div>
                  <div className="kpi-card" style={{ borderColor: result.netRoiPerAcre >= 0 ? 'var(--green-muted)' : 'var(--border)' }}>
                    <div style={label10}>Net Economic Advantage</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: result.netRoiPerAcre >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'Syne, sans-serif' }}>{result.netRoiPerAcre >= 0 ? '+' : ''}{result.netRoiPerAcre}/ac</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>N savings minus pellet cost per acre</div>
                  </div>
                </div>
              )}

              {/* Methodology */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 20 }}>
                <div style={label10}>Calculation Basis</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7, fontFamily: 'DM Mono, monospace' }}>
                  <div>{result.rateGPerAcre} g/ac = {CROPS[crop].baseRate} base × timing ({result.timingLabel}) × soil ({result.soilLabel})</div>
                  <div style={{ marginTop: 4 }}>CFU delivery: ≥{(result.rateGPerAcre * 1e7).toExponential(1)} CFU/ac at ≥10⁷ CFU/g pellet floor</div>
                  <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{result.cropNote}</div>
                </div>
              </div>

              {/* ── Save form ── */}
              <div style={{ ...divider }}>
                <span>Save to Trial Record</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={label10}>Farm Name</div>
                  <input className="input-base" value={farmName} onChange={e => setFarmName(e.target.value)} placeholder="Ridgeline Family Farm" />
                </div>
                <div>
                  <div style={label10}>Field Name / ID</div>
                  <input className="input-base" value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="North Bottoms — Field 4" />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={label10}>Notes</div>
                <textarea className="input-base" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Trial design notes, planned application date, soil test results…" rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving || saved || !canSave}
                  style={{ opacity: !canSave || saving ? 0.5 : 1, cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: saved ? 'var(--green-muted)' : 'var(--green)' }}
                >
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Field Plan'}
                </button>
                {!canSave && !saved && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {!hasField ? 'Draw a field first' : 'Enter a farm or field name to save'}
                  </div>
                )}
                {saveErr && <div style={{ fontSize: 11, color: 'var(--red)' }}>{saveErr}</div>}
                {saved && <div style={{ fontSize: 11, color: 'var(--green)' }}>✓ Saved to field_plans</div>}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasField && !drawMode && mapReady && (
            <div style={{ marginTop: 16, border: '1px dashed var(--border2)', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                Search for your farm above, then click <strong style={{ color: 'var(--green)' }}>+ Draw Field</strong>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Click each corner of your field → double-click the final point to close and calculate
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Crop */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 16 }}>
            <div style={label10}>Crop</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {Object.entries(CROPS).map(([key, c]) => (
                <button key={key} onClick={() => setCrop(key)} style={{ background: crop === key ? 'var(--green-muted)' : 'var(--bg)', border: `1px solid ${crop === key ? 'var(--green)' : 'var(--border2)'}`, color: crop === key ? 'var(--green)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 10, padding: '8px 4px', cursor: 'pointer', textAlign: 'center', letterSpacing: '0.02em', lineHeight: 1.3, transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 15, marginBottom: 3 }}>{c.icon}</div>
                  {c.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 16 }}>
            <div style={label10}>Application Timing</div>
            {cropData.timings.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <input type="radio" name="timing" value={t.id} checked={timing === t.id} onChange={() => setTiming(t.id)} style={{ marginTop: 2, accentColor: 'var(--green)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    {t.mult === 1 ? 'Standard rate' : t.mult > 1 ? `+${Math.round((t.mult - 1) * 100)}% rate` : `${Math.round((t.mult - 1) * 100)}% rate`}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Soil */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 16 }}>
            <div style={label10}>Soil Condition</div>
            {Object.entries(SOILS).map(([key, s]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <input type="radio" name="soil" value={key} checked={soil === key} onChange={() => setSoil(key)} style={{ marginTop: 2, accentColor: 'var(--green)', flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: 'var(--text)' }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, marginLeft: 12 }}>{s.note}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Saved plans */}
      {showPlans && savedPlans.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ ...divider, cursor: 'pointer' }} onClick={() => setShowPlans(false)}>
            <span>Saved Field Plans — click to collapse</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedPlans.map(plan => (
              <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{plan.field_name || plan.farm_name || 'Unnamed field'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{plan.farm_name} · {plan.crop} · {plan.area_acres} ac</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, color: 'var(--green)', fontWeight: 500 }}>{plan.total_pellets_kg} kg</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{plan.bags_needed} bags · {plan.pellet_rate_g_per_acre} g/ac</div>
                  </div>
                </div>
                {plan.notes && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>{plan.notes}</div>}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{new Date(plan.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
