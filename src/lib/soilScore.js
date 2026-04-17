// Calculates a 1–10 soil health score from farm conditions + crop type
// Each factor contributes a weighted sub-score

export function calcSoilHealthScore({ soilType, irrigationType, avgRainfallIn, usdaZone, cropType }) {
  const scores = {};

  // ── Soil Type (0–2.5) ──
  const soilScores = {
    loam: 2.5, silt_loam: 2.3, silt: 2.0, sandy_loam: 1.8,
    clay: 1.4, sandy: 1.1, peat: 2.0, chalk: 1.2,
  };
  scores.soil = soilScores[soilType] ?? 1.5;

  // ── Moisture / Irrigation (0–2.0) ──
  const rainfall = parseFloat(avgRainfallIn) || 30;
  let moistureScore = 0;
  if (rainfall >= 30 && rainfall <= 50) moistureScore = 2.0;
  else if (rainfall >= 20 && rainfall < 30) moistureScore = 1.5;
  else if (rainfall > 50) moistureScore = 1.6;
  else moistureScore = 1.0;

  // Bonus for managed irrigation
  const irrigationBonus = { drip: 0.3, pivot: 0.2, furrow: 0.1, overhead: 0.15, flood: 0.0, rain_fed: 0.0 };
  scores.moisture = Math.min(2.0, moistureScore + (irrigationBonus[irrigationType] ?? 0));

  // ── USDA Zone suitability for crop (0–2.0) ──
  const zone = parseInt((usdaZone || '6a').replace(/[ab]/, '')) || 6;
  const cropZoneIdeal = {
    corn:       { min: 4, max: 8 },
    soybeans:   { min: 4, max: 8 },
    peanuts:    { min: 7, max: 10 },
    tomatoes:   { min: 5, max: 9 },
    berries:    { min: 4, max: 8 },
    pasture:    { min: 3, max: 9 },
    miscanthus: { min: 4, max: 9 },
  };
  const ideal = cropZoneIdeal[cropType] ?? { min: 4, max: 8 };
  if (zone >= ideal.min && zone <= ideal.max) scores.zone = 2.0;
  else if (zone === ideal.min - 1 || zone === ideal.max + 1) scores.zone = 1.3;
  else scores.zone = 0.8;

  // ── Crop–Soil compatibility (0–2.0) ──
  const cropSoilFit = {
    corn:       { loam: 2.0, silt_loam: 1.9, silt: 1.7, sandy_loam: 1.5, clay: 1.2, sandy: 0.9, peat: 1.4, chalk: 1.0 },
    soybeans:   { loam: 2.0, silt_loam: 1.9, silt: 1.8, sandy_loam: 1.6, clay: 1.3, sandy: 1.0, peat: 1.3, chalk: 1.1 },
    peanuts:    { sandy_loam: 2.0, sandy: 1.9, loam: 1.6, silt_loam: 1.3, clay: 0.8, silt: 1.2, peat: 0.9, chalk: 1.0 },
    tomatoes:   { loam: 2.0, silt_loam: 1.9, sandy_loam: 1.7, silt: 1.6, clay: 1.1, sandy: 1.2, peat: 1.5, chalk: 0.9 },
    berries:    { sandy_loam: 2.0, loam: 1.8, silt_loam: 1.6, sandy: 1.5, silt: 1.4, clay: 1.0, peat: 1.9, chalk: 0.7 },
    pasture:    { loam: 2.0, silt_loam: 1.9, clay: 1.7, silt: 1.8, sandy_loam: 1.5, sandy: 1.1, peat: 1.6, chalk: 1.3 },
    miscanthus: { loam: 2.0, silt_loam: 1.8, clay: 1.7, sandy_loam: 1.6, silt: 1.7, sandy: 1.3, peat: 1.5, chalk: 1.2 },
  };
  scores.cropFit = cropSoilFit[cropType]?.[soilType] ?? 1.5;

  // ── Algaeo Microbial Potential (0–1.5) — how well consortia will establish ──
  // Higher in loamy, well-drained, moderate rainfall soils
  const microbialBase = { loam: 1.5, silt_loam: 1.4, silt: 1.2, sandy_loam: 1.3, clay: 0.9, sandy: 1.0, peat: 1.1, chalk: 0.8 };
  scores.microbial = microbialBase[soilType] ?? 1.0;

  const total = scores.soil + scores.moisture + scores.zone + scores.cropFit + scores.microbial;
  const normalized = Math.min(10, Math.max(1, parseFloat(total.toFixed(1))));

  return {
    score: normalized,
    breakdown: {
      'Soil Type Quality':        { score: scores.soil,     max: 2.5 },
      'Moisture & Irrigation':    { score: scores.moisture, max: 2.0 },
      'Climate Zone Fit':         { score: scores.zone,     max: 2.0 },
      'Crop–Soil Compatibility':  { score: scores.cropFit,  max: 2.0 },
      'Microbial Establishment':  { score: scores.microbial,max: 1.5 },
    },
    label: normalized >= 8 ? 'Excellent' : normalized >= 6 ? 'Good' : normalized >= 4 ? 'Fair' : 'Poor',
    color: normalized >= 8 ? '#4ade80' : normalized >= 6 ? '#fbbf24' : normalized >= 4 ? '#fb923c' : '#f87171',
    recommendation: getRecommendation(normalized, soilType, cropType),
  };
}

function getRecommendation(score, soilType, cropType) {
  if (score >= 8) return 'Soil conditions are excellent for AgTurbo application. Microbial consortia will establish rapidly. Proceed with standard protocol.';
  if (score >= 6) return `Good foundation. ${soilType === 'clay' ? 'Consider soil drench method to improve penetration in clay.' : 'Foliar application recommended as primary method.'} Expect full consortia establishment within 2–3 weeks.`;
  if (score >= 4) return `Fair conditions. Recommend soil drench at establishment plus foliar at first growth stage. Consider adding organic carbon amendment to boost microbial fuel.`;
  return `Challenging conditions for microbial establishment. Start with soil drench at 2× standard rate. Re-assess after first application. Contact Algaeo support at algaeo.com for a custom protocol.`;
}
