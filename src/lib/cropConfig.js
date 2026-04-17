export const cropConfig = {
  corn: {
    label: 'Corn', emoji: '🌽', bundle: 'row_crop',
    inputs: [
      { id: 'acres', label: 'Field Size', unit: 'acres', val: 500 },
      { id: 'nCost', label: 'N Cost', unit: '$/lb', val: 0.65 },
      { id: 'yield', label: 'Current Yield', unit: 'bu/acre', val: 175 },
      { id: 'price', label: 'Corn Price', unit: '$/bu', val: 4.50 },
    ],
    kpis: (v) => {
      const nSav = v.acres * 140 * v.nCost * 0.20;
      const yGain = v.yield * 0.015 * v.acres * v.price;
      const total = nSav + yGain;
      return [
        { label: 'N Fertilizer Savings', val: fmt(nSav), delta: '20% N replaced by Algaeo', green: true, tag: 'Cost' },
        { label: 'Test Weight Revenue', val: fmt(yGain), delta: '+1.5% bu weight uplift' },
        { label: 'Total Annual ROI', val: fmt(total), delta: 'Net gain this season', green: true, highlight: true },
        { label: 'ROI Multiple', val: (total / (v.acres * 18)).toFixed(1) + 'x', delta: 'Return on Algaeo spend', amber: true },
      ];
    },
    leverTitle: 'N-Replacement by Growth Stage',
    leverSub: 'Atmospheric N fixation — Azospirillum, Azotobacter & Rhizobium',
    leverLabels: ['V2','V4','V6','V8','V10','VT','R1','R6'],
    leverAlgaeo: [38, 52, 71, 85, 95, 88, 75, 60],
    leverStd:    [28, 38, 52, 62, 70, 65, 55, 44],
    yieldUnit: 'bu/acre',
    costInputKey: 'nCost',
  },
  soy: {
    label: 'Soybeans', emoji: '🫘', bundle: 'row_crop',
    inputs: [
      { id: 'acres', label: 'Field Size', unit: 'acres', val: 400 },
      { id: 'pkCost', label: 'P&K Cost', unit: '$/acre', val: 42 },
      { id: 'yield', label: 'Current Yield', unit: 'bu/acre', val: 52 },
      { id: 'price', label: 'Soy Price', unit: '$/bu', val: 9.80 },
    ],
    kpis: (v) => {
      const abort = v.yield * 0.08 * v.acres * v.price;
      const pkSav = v.acres * (v.pkCost || 42) * 0.18;
      const total = abort + pkSav;
      return [
        { label: 'Pod Retention Gain', val: fmt(abort), delta: '8% pod abortion reduction', green: true, highlight: true },
        { label: 'P&K Input Savings', val: fmt(pkSav), delta: '18% via P-solubilization' },
        { label: 'Total Uplift', val: fmt(total), delta: 'R1–R3 Algaeo window', green: true },
        { label: 'ROI Multiple', val: (total / (v.acres * 18)).toFixed(1) + 'x', delta: 'Return on Algaeo spend', amber: true },
      ];
    },
    leverTitle: 'Pod Retention Rate by Growth Stage',
    leverSub: 'R1–R3 Algaeo treatment impact on pod set',
    leverLabels: ['V4','V6','R1','R2','R3','R4','R5','R6'],
    leverAlgaeo: [60, 65, 70, 85, 92, 95, 90, 80],
    leverStd:    [60, 63, 62, 70, 75, 78, 73, 64],
    yieldUnit: 'bu/acre',
    costInputKey: 'pkCost',
  },
  peanut: {
    label: 'Peanuts', emoji: '🥜', bundle: 'row_crop',
    inputs: [
      { id: 'acres', label: 'Field Size', unit: 'acres', val: 200 },
      { id: 'fungCost', label: 'Fungicide Cost', unit: '$/acre', val: 85 },
      { id: 'tsmk', label: 'Current TSMK', unit: '%', val: 72 },
      { id: 'price', label: 'Grade Price', unit: '$/ton', val: 500 },
    ],
    kpis: (v) => {
      const gradeRev = v.acres * 3.5 * (v.tsmk / 100) * 0.04 * (v.price || 500);
      const fungSav = v.acres * (v.fungCost || 85) * 0.15;
      const total = gradeRev + fungSav;
      return [
        { label: 'TSMK Grade Revenue', val: fmt(gradeRev), delta: '+4% TSMK score improvement', green: true, highlight: true },
        { label: 'Fungicide Savings', val: fmt(fungSav), delta: '15% reduction via Bacillus' },
        { label: 'Total Return', val: fmt(total), delta: 'Net annual Algaeo benefit', green: true },
        { label: 'Projected TSMK', val: ((v.tsmk || 72) + 4).toFixed(1) + '%', delta: 'Projected grade score', amber: true },
      ];
    },
    leverTitle: 'TSMK Grade Improvement',
    leverSub: 'Calcium uptake & empty shell (pop) reduction',
    leverLabels: ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'],
    leverAlgaeo: [72, 73.5, 75, 76.5, 77.5, 77, 76.5, 76],
    leverStd:    [72, 72.5, 73, 73.5, 74, 73.5, 73, 72.5],
    yieldUnit: 'tons/acre',
    costInputKey: 'fungCost',
  },
  tomato: {
    label: 'Tomatoes', emoji: '🍅', bundle: 'specialty',
    inputs: [
      { id: 'acres', label: 'Field Size', unit: 'acres', val: 50 },
      { id: 'waterCost', label: 'Irrigation Cost', unit: '$/acre', val: 120 },
      { id: 'brix', label: 'Current Brix', unit: '°Bx', val: 5.2 },
      { id: 'price', label: 'Processor Price', unit: '$/ton', val: 85 },
    ],
    kpis: (v) => {
      const brixPrem = v.acres * 25 * ((v.brix || 5.2) * 0.06) * 4;
      const waterSav = v.acres * (v.waterCost || 120) * 0.22;
      const total = brixPrem + waterSav;
      return [
        { label: 'Brix Premium Gain', val: fmt(brixPrem), delta: '+6% soluble solids (Azotobacter)', green: true, highlight: true },
        { label: 'Water Savings', val: fmt(waterSav), delta: '22% irrigation reduction' },
        { label: 'Total Uplift', val: fmt(total), delta: 'High-value horticulture ROI', green: true },
        { label: 'Projected Brix', val: ((v.brix || 5.2) * 1.06).toFixed(1) + '°Bx', delta: 'After Algaeo treatment', amber: true },
      ];
    },
    leverTitle: 'Brix Progression Over Season',
    leverSub: 'Azotobacter-driven soluble solids accumulation',
    leverLabels: ['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8'],
    leverAlgaeo: [4.8, 5.0, 5.3, 5.6, 5.9, 6.1, 6.3, 6.2],
    leverStd:    [4.8, 4.9, 5.0, 5.1, 5.2, 5.2, 5.3, 5.2],
    yieldUnit: 'tons/acre',
    costInputKey: 'waterCost',
  },
  berry: {
    label: 'Berries', emoji: '🍓', bundle: 'specialty',
    inputs: [
      { id: 'acres', label: 'Field Size', unit: 'acres', val: 30 },
      { id: 'cullRate', label: 'Current Cull Rate', unit: '%', val: 18 },
      { id: 'yield', label: 'Yield', unit: 'flats/acre', val: 280 },
      { id: 'price', label: 'Price per Flat', unit: '$', val: 24 },
    ],
    kpis: (v) => {
      const cr = v.cullRate || 18;
      const cullSav = v.acres * (v.yield || 280) * (v.price || 24) * ((cr / 100) - (cr * 0.72) / 100);
      const sizePrem = v.acres * (v.yield || 280) * (v.price || 24) * 0.05;
      const total = cullSav + sizePrem;
      return [
        { label: 'Cull Reduction Value', val: fmt(cullSav), delta: '28% fewer culls, cell wall strength', green: true, highlight: true },
        { label: 'Size Premium', val: fmt(sizePrem), delta: '+5% packable yield' },
        { label: 'Total Value Gain', val: fmt(total), delta: 'Shelf-life & size improvement', green: true },
        { label: 'Projected Cull Rate', val: (cr * 0.72).toFixed(1) + '%', delta: 'After Algaeo protocol', amber: true },
      ];
    },
    leverTitle: 'Cull Rate Reduction Over Season',
    leverSub: 'Cellular wall strength from balanced soil minerals',
    leverLabels: ['Wk1','Wk2','Wk4','Wk6','Wk8','Wk10','Wk12','Wk14'],
    leverAlgaeo: [18, 17, 15.5, 14, 12.5, 13, 12.8, 13.2],
    leverStd:    [18, 17.8, 17.5, 17, 16.8, 17, 16.9, 17.1],
    yieldUnit: 'flats/acre',
    costInputKey: 'cullRate',
  },
  pasture: {
    label: 'Pasture', emoji: '🌿', bundle: 'forage',
    inputs: [
      { id: 'acres', label: 'Pasture Size', unit: 'acres', val: 300 },
      { id: 'headCount', label: 'Head of Cattle', unit: 'head', val: 100 },
      { id: 'hayPrice', label: 'Hay Roll Price', unit: '$/roll', val: 60 },
      { id: 'urea', label: 'Urea Cost', unit: '$/acre', val: 38 },
    ],
    kpis: (v) => {
      const rollsPerDay = (v.headCount || 100) / 25;
      const haySav = 14 * rollsPerDay * (v.hayPrice || 60);
      const ureaSav = (v.acres || 300) * (v.urea || 38) * 0.25;
      const total = haySav + ureaSav;
      return [
        { label: 'Extended Grazing Value', val: fmt(haySav), delta: '+14 days fall season', green: true, highlight: true },
        { label: 'Urea Savings', val: fmt(ureaSav), delta: '25% synthetic urea replaced' },
        { label: 'Total Savings', val: fmt(total), delta: 'Regenerative Ag ROI', green: true },
        { label: 'Grazing Extension', val: '14 days', delta: 'Fall season extension', amber: true },
      ];
    },
    leverTitle: 'Grazing Days Extension',
    leverSub: 'Soil treatment impact on pasture regrowth velocity',
    leverLabels: ['Aug','Sep1','Sep2','Oct1','Oct2','Nov1','Nov2','Dec'],
    leverAlgaeo: [0, 2, 5, 8, 11, 13, 14, 14],
    leverStd:    [0, 1, 2, 3, 4,  4,  4,  3],
    yieldUnit: 'grazing days',
    costInputKey: 'hayPrice',
  },
  miscanthus: {
    label: 'Miscanthus', emoji: '🌾', bundle: 'bioenergy',
    inputs: [
      { id: 'acres', label: 'Field Size', unit: 'acres', val: 200 },
      { id: 'harvestCost', label: 'Harvest Cost', unit: '$/acre', val: 95 },
      { id: 'yield', label: 'Dry Tons/Acre', unit: 'dt/acre', val: 8 },
      { id: 'price', label: 'Contract Price', unit: '$/dry ton', val: 65 },
    ],
    kpis: (v) => {
      const biomassGain = (v.acres || 200) * (v.yield || 8) * 0.12 * (v.price || 65);
      const harvestSav = (v.acres || 200) * (v.harvestCost || 95) * 0.08;
      const total = biomassGain + harvestSav;
      return [
        { label: 'Biomass Revenue Gain', val: fmt(biomassGain), delta: '+12% dry ton via regrowth velocity', green: true, highlight: true },
        { label: 'Harvest Efficiency', val: fmt(harvestSav), delta: 'Denser, drier bales' },
        { label: 'Total Uplift', val: fmt(total), delta: 'Bioenergy ROI', green: true },
        { label: 'Projected Yield', val: ((v.yield || 8) * 1.12).toFixed(1) + ' dt/ac', delta: 'After Algaeo establishment', amber: true },
      ];
    },
    leverTitle: 'Regrowth Velocity (Dry Tons Accumulated)',
    leverSub: 'Post-harvest biomass accumulation with Algaeo',
    leverLabels: ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'],
    leverAlgaeo: [0, 0.5, 1.5, 3, 5, 6.5, 8, 9.1],
    leverStd:    [0, 0.3, 1.0, 2.2, 3.8, 5.0, 6.5, 7.2],
    yieldUnit: 'dt/acre',
    costInputKey: 'harvestCost',
  },
};

export const agturboFormula = [
  { name: 'Nitrogen (NaNO₃)', amount: '4.00 g/L', role: 'Primary Macro — Vegetative growth driver', type: 'macro' },
  { name: 'Phosphorus (K₂HPO₄)', amount: '0.60 g/L', role: 'ATP energy + root/stem structure', type: 'macro' },
  { name: 'Potassium (K₂SO₄)', amount: '1.20 g/L', role: 'Potassium & Sulfur delivery', type: 'macro' },
  { name: 'Calcium (CaCl₂)', amount: '0.30 g/L', role: 'Cell wall strength — prevents floppy stems', type: 'macro' },
  { name: 'Magnesium (MgSO₄)', amount: '0.50 g/L', role: 'Chlorophyll core — maintains deep green', type: 'macro' },
  { name: 'Trace Metal Suite A5', amount: '3.0 mL/L', role: 'B, Mn, Zn, Mo, Cu, Fe — metabolic cofactors', type: 'micro' },
  { name: 'Organic Carbon (Dextrose)', amount: '0.5–1.0 g/L', role: 'Prebiotic fuel for microbial layer', type: 'organic' },
  { name: 'Vitamin Suite B1/B7/B12', amount: 'Trace μg/mg', role: 'Enzyme cofactors — reduces plant stress', type: 'organic' },
  { name: 'Azospirillum brasilense Sp7', amount: 'Inoculum', role: 'Nitrogen fixer — atmospheric N conversion', type: 'microbe' },
  { name: 'Azotobacter vinelandii', amount: 'Inoculum', role: 'Nitrogen fixer — free-living atmospheric N₂ fixation, also produces alginate & growth hormones', type: 'microbe' },
  { name: 'Rhizobium OK036', amount: 'Inoculum', role: 'Nitrogen cycler — root N absorption', type: 'microbe' },
  { name: 'Pseudomonas GM41', amount: 'Inoculum', role: 'P-Solubilizer — unlocks bound phosphorus', type: 'microbe' },
  { name: 'Bacillus subtilis', amount: 'Inoculum', role: 'Bio-fungicide + cell elongation', type: 'microbe' },
  { name: 'Variovorax CF313', amount: 'Inoculum', role: 'Hormonal balancer — degrades ACC', type: 'microbe' },
  { name: 'Arthrobacter sp. CF158', amount: 'Inoculum', role: 'Environmental cleaner — hot soil tolerance', type: 'microbe' },
  { name: 'Flavobacterium sp. CF108', amount: 'Inoculum', role: 'Nutrient mobilizer — root hair mineral delivery', type: 'microbe' },
  { name: 'Microbacterium sp. CF046', amount: 'Inoculum', role: 'Siderophore producer — iron acquisition', type: 'microbe' },
  { name: 'Promicromonospora sp. YR516', amount: 'Inoculum', role: 'Secondary metabolites — root zone antibiotics', type: 'microbe' },
  { name: 'Microalgae (3-strain blend)', amount: 'Biomass', role: 'Nannochloropsis/Scenedesmus/Chlorella — organic matter + vitamin charge', type: 'algae' },
];

export function fmt(n) {
  return '$' + Math.round(n).toLocaleString();
}

// ─── HEMP & CANNABIS ───
export const hempMarketConfig = {
  cbd_flower: {
    label: 'CBD Flower',
    inputOverrides: [
      { id: 'acres',     label: 'Field Size',    unit: 'acres',    val: 50   },
      { id: 'inputCost', label: 'Input Cost',    unit: '$/acre',   val: 320  },
      { id: 'yield',     label: 'Current Yield', unit: 'lbs/acre', val: 1200 },
      { id: 'price',     label: 'Price per lb',  unit: '$/lb',     val: 0.45 },
    ],
    kpis: (v) => {
      const acres = v.acres || 50; const inputCost = v.inputCost || 320;
      const yield_ = v.yield || 1200; const price = v.price || 0.45;
      const yieldGain = acres * yield_ * 0.14 * price;
      const inputSav  = acres * inputCost * 0.18;
      const total = yieldGain + inputSav;
      return [
        { label: 'CBD Yield Revenue Gain', val: fmt(yieldGain), delta: '+14% flower weight via trichome density', green: true, highlight: true },
        { label: 'Input Savings',          val: fmt(inputSav),  delta: '18% reduction — fertilizer & fungicide' },
        { label: 'Total ROI',              val: fmt(total),     delta: 'Net annual Algaeo benefit', green: true },
        { label: 'Projected Yield',        val: Math.round(yield_ * 1.14) + ' lbs/ac', delta: 'After AgTurbo protocol', amber: true },
      ];
    },
    leverTitle: 'CBD Flower Weight Accumulation',
    leverSub: 'Trichome density & bud weight — AgTurbo vs standard',
    leverLabels: ['Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8','Wk9'],
    leverAlgaeo: [0.8, 1.8, 3.2, 5.0, 7.2, 9.1, 10.8, 11.4],
    leverStd:    [0.7, 1.5, 2.7, 4.1, 5.9, 7.4,  8.8,  9.6],
  },
  fiber: {
    label: 'Fiber / Biomass',
    inputOverrides: [
      { id: 'acres',     label: 'Field Size',    unit: 'acres',       val: 100 },
      { id: 'inputCost', label: 'Input Cost',    unit: '$/acre',      val: 180 },
      { id: 'yield',     label: 'Current Yield', unit: 'dry tons/ac', val: 4   },
      { id: 'price',     label: 'Price',         unit: '$/dry ton',   val: 85  },
    ],
    kpis: (v) => {
      const acres = v.acres || 100; const inputCost = v.inputCost || 180;
      const yield_ = v.yield || 4; const price = v.price || 85;
      const biomassGain = acres * yield_ * 0.11 * price;
      const inputSav    = acres * inputCost * 0.20;
      const total = biomassGain + inputSav;
      return [
        { label: 'Fiber Biomass Gain', val: fmt(biomassGain), delta: '+11% stalk dry weight', green: true, highlight: true },
        { label: 'Input Savings',      val: fmt(inputSav),    delta: '20% via N-fixation consortia' },
        { label: 'Total ROI',          val: fmt(total),       delta: 'Net annual Algaeo benefit', green: true },
        { label: 'Projected Yield',    val: (yield_ * 1.11).toFixed(1) + ' dt/ac', delta: 'After AgTurbo protocol', amber: true },
      ];
    },
    leverTitle: 'Stalk Dry Weight Accumulation',
    leverSub: 'Fiber biomass growth — AgTurbo vs standard',
    leverLabels: ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov'],
    leverAlgaeo: [0.2, 0.8, 2.0, 3.5, 4.8, 5.6, 4.8, 4.0],
    leverStd:    [0.2, 0.7, 1.7, 3.0, 4.1, 4.8, 4.1, 3.4],
  },
  grain: {
    label: 'Grain / Seed',
    inputOverrides: [
      { id: 'acres',     label: 'Field Size',    unit: 'acres',    val: 75   },
      { id: 'inputCost', label: 'Input Cost',    unit: '$/acre',   val: 220  },
      { id: 'yield',     label: 'Current Yield', unit: 'lbs/acre', val: 800  },
      { id: 'price',     label: 'Price per lb',  unit: '$/lb',     val: 0.65 },
    ],
    kpis: (v) => {
      const acres = v.acres || 75; const inputCost = v.inputCost || 220;
      const yield_ = v.yield || 800; const price = v.price || 0.65;
      const grainGain = acres * yield_ * 0.10 * price;
      const inputSav  = acres * inputCost * 0.15;
      const total = grainGain + inputSav;
      return [
        { label: 'Grain Yield Revenue', val: fmt(grainGain), delta: '+10% seed weight via phosphorus availability', green: true, highlight: true },
        { label: 'Input Savings',        val: fmt(inputSav),  delta: '15% fertilizer reduction' },
        { label: 'Total ROI',            val: fmt(total),     delta: 'Net annual Algaeo benefit', green: true },
        { label: 'Projected Yield',      val: Math.round(yield_ * 1.10) + ' lbs/ac', delta: 'After AgTurbo protocol', amber: true },
      ];
    },
    leverTitle: 'Seed Weight Accumulation',
    leverSub: 'Grain density per acre — AgTurbo vs standard',
    leverLabels: ['Jun','Jul','Aug','Sep','Oct'],
    leverAlgaeo: [50, 200, 550, 820, 880],
    leverStd:    [45, 175, 490, 740, 800],
  },
};
