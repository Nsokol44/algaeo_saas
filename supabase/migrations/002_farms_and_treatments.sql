-- ─── FARMS ───
create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  nickname text,
  state text,
  county text,
  usda_zone text,
  soil_type text check (soil_type in ('clay','loam','sandy_loam','silt','silt_loam','sandy','peat','chalk')),
  avg_rainfall_in numeric,
  irrigation_type text check (irrigation_type in ('drip','pivot','flood','rain_fed','furrow','overhead')),
  primary_crops text[],
  notes text,
  created_at timestamptz default now()
);
alter table farms enable row level security;
create policy "Users manage own farms" on farms for all using (auth.uid() = user_id);

-- ─── ADD farm_id TO EXISTING TABLES ───
alter table fields add column if not exists farm_id uuid references farms on delete cascade;
alter table crop_projections add column if not exists farm_id uuid references farms on delete cascade;

-- ─── TREATMENT RATES (seeded lookup) ───
create table if not exists treatment_rates (
  id uuid primary key default gen_random_uuid(),
  crop_type text not null,
  method text not null check (method in ('foliar','soil_drench','seed_treatment','fertigation','in_furrow')),
  growth_stage text,
  dilution_ratio text,
  rate_oz_per_acre numeric,
  rate_ml_per_acre numeric,
  frequency text,
  timing_notes text,
  cost_per_acre_usd numeric
);

-- Allow all authenticated users to read treatment rates
alter table treatment_rates enable row level security;
drop policy if exists "Authenticated users can read rates" on treatment_rates;
create policy "Authenticated users can read rates" on treatment_rates for select using (auth.role() = 'authenticated');

-- ─── SEED TREATMENT RATES ───
insert into treatment_rates (crop_type, method, growth_stage, dilution_ratio, rate_oz_per_acre, rate_ml_per_acre, frequency, timing_notes, cost_per_acre_usd) values

-- CORN
('corn','foliar','V4–V6','1:200',8,237,'Once at V4, repeat at V8','Apply in evening, wind <10mph, no rain 4hr',6.50),
('corn','in_furrow','Planting','1:100',4,118,'Single application at planting','Mix with starter fertilizer in-furrow',4.00),
('corn','fertigation','V6–V10','1:300',6,177,'Every 10 days during rapid growth','Inject into pivot or drip system',5.00),
('corn','seed_treatment','Pre-plant','Undiluted',null,null,'One-time seed coating','Coat 24hr before planting, air dry',3.50),

-- SOYBEANS
('soybeans','foliar','R1–R3','1:200',6,177,'Apply at R1, repeat at R2 and R3','Critical window — do not skip R2 application',6.00),
('soybeans','in_furrow','Planting','1:100',3,89,'Single application','Co-apply with rhizobium inoculant',3.75),
('soybeans','seed_treatment','Pre-plant','Undiluted',null,null,'One-time','Compatible with standard soybean inoculants',3.00),
('soybeans','fertigation','V3–R1','1:300',5,148,'Every 14 days','Use with phosphorus fertigation pass',4.50),

-- PEANUTS
('peanuts','foliar','Pegging–Pod fill','1:200',8,237,'At pegging, repeat every 21 days x3','Fungicide tank-mix compatible',7.00),
('peanuts','soil_drench','Pre-plant','1:50',16,473,'Once before bedding','Apply to row middles, incorporate lightly',8.00),
('peanuts','fertigation','Pegging','1:300',6,177,'Every 10 days during pod fill','Calcium co-application recommended',5.50),
('peanuts','in_furrow','Planting','1:100',4,118,'Single application','Helps calcium establishment from day 1',4.25),

-- TOMATOES
('tomatoes','foliar','Transplant + Flowering','1:150',10,296,'At transplant, then weekly during flower set','Apply early morning, high humidity ideal',9.00),
('tomatoes','soil_drench','Transplant','1:50',20,591,'At transplant, repeat 3 weeks later','Pour 500mL per plant at base',10.00),
('tomatoes','fertigation','Continuous','1:400',8,237,'Weekly through drip from week 2','Mix into A-tank of fertigation system',8.50),
('tomatoes','in_furrow','Transplant','1:100',6,177,'Single at transplant','Apply in transplant hole before setting plant',6.00),

-- BERRIES
('berries','foliar','Pre-bloom + Fruit set','1:200',6,177,'Pre-bloom and at fruit set','Avoid application in full bloom — bee risk',7.50),
('berries','soil_drench','Spring green-up','1:50',16,473,'Spring and post-harvest','Apply to drip line area',9.00),
('berries','fertigation','Spring–Fruit fill','1:400',6,177,'Every 14 days April–July','Inject into drip system',7.00),

-- PASTURE
('pasture','foliar','Spring green-up + Fall','1:200',8,237,'Early spring and 6 weeks before first frost','Ideal before rain event',5.00),
('pasture','soil_drench','Renovation','1:50',20,591,'At overseeding','Soak seed bed before drilling',6.50),
('pasture','fertigation','Growing season','1:300',6,177,'Monthly April–September','Inject into center pivot',4.50),

-- MISCANTHUS
('miscanthus','soil_drench','Establishment','1:50',24,710,'At rhizome planting','Critical for first-year root establishment',8.00),
('miscanthus','foliar','Year 2+ regrowth','1:200',8,237,'At 12 inch emergence post-harvest','Accelerates regrowth velocity',5.50),
('miscanthus','fertigation','Growing season','1:300',6,177,'Monthly May–August','Low-input — monthly pass sufficient',4.00);

-- ─── ADD Azotobacter vinelandii TO TREATMENT RATE NOTES ───
-- Update timing notes for foliar and in-furrow methods across N-fixing crops
-- to reference the expanded consortia including Azotobacter vinelandii
update treatment_rates set timing_notes = timing_notes || ' — Azotobacter vinelandii in consortia enhances free-living N fixation and produces natural growth hormones.'
where crop_type in ('corn','soybeans','pasture','miscanthus') and method in ('foliar','in_furrow','fertigation');

-- ─── HEMP & CANNABIS TREATMENT RATES ───
insert into treatment_rates (crop_type, method, growth_stage, dilution_ratio, rate_oz_per_acre, rate_ml_per_acre, frequency, timing_notes, cost_per_acre_usd) values

-- HEMP (applies to all 3 markets)
('hemp','foliar','Vegetative (Wk 2–4)','1:200',8,237,'Weekly x3 during veg','Apply early morning. Azotobacter consortia drives internodal spacing and canopy development.',7.00),
('hemp','soil_drench','Transplant','1:50',20,591,'At transplant, repeat week 3','Critical for root zone establishment. Improves calcium and micronutrient uptake.',9.00),
('hemp','fertigation','Flower set','1:300',6,177,'Every 10 days during flower','Inject into drip at flower initiation. Supports trichome density for CBD market.',8.00),
('hemp','in_furrow','Direct seed','1:100',4,118,'At seeding','For fiber and grain markets — coat seed row at planting.',4.50),

-- CANNABIS
('cannabis','soil_drench','Clone / Transplant','1:50',null,300,'At transplant','Apply 250–300mL per plant at root zone. Bacillus subtilis protects against root rot in high-humidity environments.',12.00),
('cannabis','foliar','Early vegetative','1:200',null,177,'Weekly during veg (3–4 applications)','Spray underside of leaves. Stop foliar applications at flower initiation to protect trichomes.',10.00),
('cannabis','fertigation','Vegetative + early flower','1:400',null,148,'Every 7 days','Inject into drip or hand-water system. Reduces synthetic N needs by up to 20%.',9.00);
