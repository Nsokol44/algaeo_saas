export function calcSoilHealthScore({ soilType, irrigationType, avgRainfallIn, usdaZone, cropType }) {
  const scores = {};
  const soilScores = { loam:2.5,silt_loam:2.3,silt:2.0,sandy_loam:1.8,clay:1.4,sandy:1.1,peat:2.0,chalk:1.2 };
  scores.soil = soilScores[soilType] ?? 1.5;
  const rainfall = parseFloat(avgRainfallIn) || 30;
  let ms = rainfall>=30&&rainfall<=50?2.0:rainfall>=20&&rainfall<30?1.5:rainfall>50?1.6:1.0;
  const ib = { drip:0.3,pivot:0.2,furrow:0.1,overhead:0.15,flood:0.0,rain_fed:0.0 };
  scores.moisture = Math.min(2.0, ms + (ib[irrigationType]??0));
  const zone = parseInt((usdaZone||'6a').replace(/[ab]/,''))||6;
  const czm = { corn:{min:4,max:8},soybeans:{min:4,max:8},peanuts:{min:7,max:10},tomatoes:{min:5,max:9},berries:{min:4,max:8},pasture:{min:3,max:9},miscanthus:{min:4,max:9},hemp:{min:4,max:9},cannabis:{min:5,max:10} };
  const ideal = czm[cropType]??{min:4,max:8};
  scores.zone = zone>=ideal.min&&zone<=ideal.max?2.0:(zone===ideal.min-1||zone===ideal.max+1)?1.3:0.8;
  const csf = { corn:{loam:2.0,silt_loam:1.9,silt:1.7,sandy_loam:1.5,clay:1.2,sandy:0.9,peat:1.4,chalk:1.0},soybeans:{loam:2.0,silt_loam:1.9,silt:1.8,sandy_loam:1.6,clay:1.3,sandy:1.0,peat:1.3,chalk:1.1},peanuts:{sandy_loam:2.0,sandy:1.9,loam:1.6,silt_loam:1.3,clay:0.8,silt:1.2,peat:0.9,chalk:1.0},tomatoes:{loam:2.0,silt_loam:1.9,sandy_loam:1.7,silt:1.6,clay:1.1,sandy:1.2,peat:1.5,chalk:0.9},berries:{sandy_loam:2.0,loam:1.8,silt_loam:1.6,sandy:1.5,silt:1.4,clay:1.0,peat:1.9,chalk:0.7},pasture:{loam:2.0,silt_loam:1.9,clay:1.7,silt:1.8,sandy_loam:1.5,sandy:1.1,peat:1.6,chalk:1.3},miscanthus:{loam:2.0,silt_loam:1.8,clay:1.7,sandy_loam:1.6,silt:1.7,sandy:1.3,peat:1.5,chalk:1.2},hemp:{loam:2.0,silt_loam:1.9,sandy_loam:1.8,silt:1.6,clay:1.1,sandy:1.3,peat:1.4,chalk:1.0},cannabis:{loam:2.0,silt_loam:1.9,sandy_loam:1.8,peat:1.9,silt:1.5,clay:1.0,sandy:1.2,chalk:0.8} };
  scores.cropFit = csf[cropType]?.[soilType]??1.5;
  const mb = { loam:1.5,silt_loam:1.4,silt:1.2,sandy_loam:1.3,clay:0.9,sandy:1.0,peat:1.1,chalk:0.8 };
  scores.microbial = mb[soilType]??1.0;
  const total = scores.soil+scores.moisture+scores.zone+scores.cropFit+scores.microbial;
  const normalized = Math.min(10,Math.max(1,parseFloat(total.toFixed(1))));
  return {
    score: normalized,
    breakdown: { 'Soil Type Quality':{score:scores.soil,max:2.5},'Moisture & Irrigation':{score:scores.moisture,max:2.0},'Climate Zone Fit':{score:scores.zone,max:2.0},'Crop–Soil Compatibility':{score:scores.cropFit,max:2.0},'Microbial Establishment':{score:scores.microbial,max:1.5} },
    label: normalized>=8?'Excellent':normalized>=6?'Good':normalized>=4?'Fair':'Poor',
    color: normalized>=8?'#4ade80':normalized>=6?'#fbbf24':normalized>=4?'#fb923c':'#f87171',
    recommendation: getRecommendation(normalized,soilType,cropType),
  };
}
function getRecommendation(score,soilType,cropType){
  if(score>=8)return'Soil conditions are excellent for AgTurbo application. Microbial consortia will establish rapidly. Proceed with standard protocol.';
  if(score>=6)return`Good foundation. ${soilType==='clay'?'Consider soil drench method to improve penetration in clay.':'Foliar application recommended as primary method.'} Expect full consortia establishment within 2–3 weeks.`;
  if(score>=4)return'Fair conditions. Recommend soil drench at establishment plus foliar at first growth stage. Consider adding organic carbon amendment to boost microbial fuel.';
  return'Challenging conditions for microbial establishment. Start with soil drench at 2× standard rate. Re-assess after first application. Contact Algaeo support at algaeo.com for a custom protocol.';
}
