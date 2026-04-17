// Growth stage windows per crop — days after planting
// Returns upcoming and past application windows

export const growthStages = {
  corn: [
    { stage: 'V2',  dap: 14,  window: [12,16],  method: 'in_furrow',      label: 'Early emergence — in-furrow window' },
    { stage: 'V4',  dap: 25,  window: [23,28],  method: 'foliar',         label: 'V4 foliar — first above-ground application' },
    { stage: 'V8',  dap: 40,  window: [38,44],  method: 'foliar',         label: 'V8 foliar — rapid growth phase' },
    { stage: 'V10', dap: 50,  window: [48,54],  method: 'fertigation',    label: 'V10 fertigation — peak N demand' },
    { stage: 'VT',  dap: 65,  window: [62,68],  method: 'foliar',         label: 'Tassel — final foliar pass' },
  ],
  soybeans: [
    { stage: 'V3',  dap: 21,  window: [19,24],  method: 'foliar',         label: 'V3 foliar — early canopy' },
    { stage: 'R1',  dap: 45,  window: [42,48],  method: 'foliar',         label: 'R1 flowering — critical window' },
    { stage: 'R2',  dap: 52,  window: [50,55],  method: 'foliar',         label: 'R2 full flower — pod set' },
    { stage: 'R3',  dap: 60,  window: [57,63],  method: 'foliar',         label: 'R3 pod fill — final application' },
  ],
  peanuts: [
    { stage: 'Emergence',   dap: 14,  window: [12,18],  method: 'soil_drench', label: 'Post-emergence soil drench' },
    { stage: 'Pegging',     dap: 45,  window: [42,50],  method: 'foliar',      label: 'Pegging — calcium uptake window' },
    { stage: 'Pod Fill 1',  dap: 70,  window: [67,75],  method: 'foliar',      label: 'Pod fill — first pass' },
    { stage: 'Pod Fill 2',  dap: 91,  window: [88,95],  method: 'foliar',      label: 'Pod fill — second pass' },
  ],
  tomatoes: [
    { stage: 'Transplant',  dap: 0,   window: [0,3],    method: 'soil_drench', label: 'Transplant — soil drench at planting' },
    { stage: 'Establish',   dap: 14,  window: [12,17],  method: 'foliar',      label: 'Establishment foliar' },
    { stage: 'Flowering',   dap: 35,  window: [32,40],  method: 'foliar',      label: 'Flower set — Brix window opens' },
    { stage: 'Fruit Set',   dap: 50,  window: [47,55],  method: 'fertigation', label: 'Fruit set — weekly fertigation begins' },
  ],
  berries: [
    { stage: 'Green-up',    dap: 0,   window: [0,7],    method: 'soil_drench', label: 'Spring green-up soil drench' },
    { stage: 'Pre-bloom',   dap: 21,  window: [18,25],  method: 'foliar',      label: 'Pre-bloom foliar — before bees arrive' },
    { stage: 'Fruit Fill',  dap: 45,  window: [42,50],  method: 'fertigation', label: 'Fruit fill fertigation' },
  ],
  pasture: [
    { stage: 'Spring',      dap: 0,   window: [0,10],   method: 'foliar',      label: 'Spring green-up foliar' },
    { stage: 'Mid-season',  dap: 60,  window: [55,65],  method: 'fertigation', label: 'Mid-season fertigation pass' },
    { stage: 'Pre-frost',   dap: 120, window: [114,128],method: 'foliar',      label: '6 weeks before first frost — final foliar' },
  ],
  miscanthus: [
    { stage: 'Planting',    dap: 0,   window: [0,5],    method: 'soil_drench', label: 'Rhizome planting — soil drench' },
    { stage: 'Emergence',   dap: 30,  window: [25,35],  method: 'foliar',      label: 'First emergence foliar' },
    { stage: 'Regrowth',    dap: 60,  window: [55,67],  method: 'foliar',      label: 'Post-harvest regrowth — velocity window' },
  ],
};

export function getUpcomingWindows(cropType, plantedDate, daysAhead = 30) {
  const stages = growthStages[cropType] || [];
  const today = new Date();
  const planted = new Date(plantedDate);
  const dap = Math.floor((today - planted) / (1000 * 60 * 60 * 24));

  return stages.map(s => {
    const windowStart = new Date(planted);
    windowStart.setDate(windowStart.getDate() + s.window[0]);
    const windowEnd = new Date(planted);
    windowEnd.setDate(windowEnd.getDate() + s.window[1]);

    const daysUntilStart = Math.floor((windowStart - today) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.floor((windowEnd - today) / (1000 * 60 * 60 * 24));

    let status = 'future';
    if (dap >= s.window[0] && dap <= s.window[1]) status = 'active';
    else if (dap > s.window[1]) status = 'past';

    return {
      ...s,
      windowStart,
      windowEnd,
      daysUntilStart,
      daysUntilEnd,
      status,
      dap: s.dap,
    };
  }).filter(s => s.status !== 'past' || s.daysUntilEnd >= -7);
}

export function getMethodLabel(method) {
  const map = {
    foliar: 'Foliar Spray', soil_drench: 'Soil Drench',
    fertigation: 'Fertigation', in_furrow: 'In-Furrow', seed_treatment: 'Seed Treatment',
  };
  return map[method] || method;
}

// Hemp and cannabis appended
export const growthStagesExtra = {
  hemp: [
    { stage: 'Transplant',   dap: 0,  window: [0,5],    method: 'soil_drench', label: 'Transplant — root zone establishment' },
    { stage: 'Veg Wk 2',     dap: 14, window: [12,18],  method: 'foliar',      label: 'Vegetative foliar — first pass' },
    { stage: 'Veg Wk 4',     dap: 28, window: [25,32],  method: 'foliar',      label: 'Vegetative foliar — second pass' },
    { stage: 'Flower Init',  dap: 45, window: [42,50],  method: 'fertigation', label: 'Flower initiation — fertigation begins' },
    { stage: 'Flower Fill',  dap: 65, window: [60,70],  method: 'fertigation', label: 'Flower fill — final fertigation pass' },
  ],
  cannabis: [
    { stage: 'Clone/Plant',  dap: 0,  window: [0,3],    method: 'soil_drench', label: 'At transplant — Bacillus root protection' },
    { stage: 'Veg Wk 1',     dap: 7,  window: [5,10],   method: 'foliar',      label: 'Early veg foliar — canopy development' },
    { stage: 'Veg Wk 2',     dap: 14, window: [12,17],  method: 'foliar',      label: 'Veg foliar — second pass' },
    { stage: 'Veg Wk 3',     dap: 21, window: [19,24],  method: 'foliar',      label: 'Veg foliar — final pre-flower pass' },
    { stage: 'Flower Wk 1',  dap: 35, window: [32,40],  method: 'fertigation', label: 'Flower onset — switch to fertigation only' },
    { stage: 'Flower Wk 4',  dap: 63, window: [60,68],  method: 'fertigation', label: 'Mid-flower fertigation — terpene support' },
  ],
};

// Merge into main growthStages export
Object.assign(growthStages, growthStagesExtra);
