-- ============================================================
-- Algaeo Field Planner — Supabase Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── field_plans table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS field_plans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identity
  farm_name               text,
  field_name              text,

  -- Crop + application config
  crop                    text NOT NULL,
  application_timing      text NOT NULL,
  soil_condition          text NOT NULL DEFAULT 'average',

  -- Geometry — stored as GeoJSON and as PostGIS geometry for spatial queries
  geojson                 jsonb,
  geom                    geometry(Polygon, 4326),  -- WGS84

  -- Calculated outputs
  area_acres              numeric(10, 4),
  pellet_rate_g_per_acre  numeric(10, 2),
  total_pellets_g         numeric(12, 2),
  total_pellets_kg        numeric(10, 3),
  bags_needed             integer,
  n_reduction_lbs         numeric(10, 2),

  -- Free text
  notes                   text,

  -- Timestamps
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ── Spatial index for PostGIS queries ─────────────────────────
CREATE INDEX IF NOT EXISTS field_plans_geom_idx
  ON field_plans USING GIST (geom);

-- ── Index on user_id for RLS performance ──────────────────────
CREATE INDEX IF NOT EXISTS field_plans_user_idx
  ON field_plans (user_id);

-- ── Trigger: auto-populate geom from geojson on insert/update ─
CREATE OR REPLACE FUNCTION field_plans_geom_from_geojson()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.geojson IS NOT NULL AND NEW.geojson->'geometry' IS NOT NULL THEN
    NEW.geom := ST_SetSRID(
      ST_GeomFromGeoJSON(NEW.geojson->>'geometry'),
      4326
    );
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS field_plans_geom_trigger ON field_plans;
CREATE TRIGGER field_plans_geom_trigger
  BEFORE INSERT OR UPDATE ON field_plans
  FOR EACH ROW
  EXECUTE FUNCTION field_plans_geom_from_geojson();

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE field_plans ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own field plans
CREATE POLICY "Users manage own field plans"
  ON field_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Helpful view: field plans with area in hectares too ────────
CREATE OR REPLACE VIEW field_plans_summary AS
SELECT
  id,
  user_id,
  farm_name,
  field_name,
  crop,
  application_timing,
  soil_condition,
  area_acres,
  ROUND((area_acres * 0.404686)::numeric, 3) AS area_hectares,
  pellet_rate_g_per_acre,
  total_pellets_kg,
  bags_needed,
  n_reduction_lbs,
  notes,
  created_at
FROM field_plans
ORDER BY created_at DESC;

-- ── Verify ─────────────────────────────────────────────────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'field_plans'
-- ORDER BY ordinal_position;
