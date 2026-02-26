-- ============================================
-- 007: Per-Property & Per-Room Pricing
-- ============================================

-- Add property_id to rates table for per-building pricing
ALTER TABLE rates ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- Room-level rate overrides (highest priority)
CREATE TABLE IF NOT EXISTS room_rate_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  stay_type stay_type NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, stay_type)
);

CREATE INDEX IF NOT EXISTS idx_room_rate_overrides_room ON room_rate_overrides(room_id);

ALTER TABLE room_rate_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read room rate overrides" ON room_rate_overrides
  FOR SELECT USING (true);

-- Trigger
CREATE OR REPLACE TRIGGER set_room_rate_overrides_updated_at
  BEFORE UPDATE ON room_rate_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the unique constraint on rates to allow per-property rates
-- First drop old constraint if exists, then add new one
DO $$
BEGIN
  -- Try to drop old unique constraint
  ALTER TABLE rates DROP CONSTRAINT IF EXISTS rates_room_type_id_stay_type_valid_from_key;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new unique constraint including property_id
-- property_id NULL = global rate, property_id set = building-specific rate
CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_type_stay_property
  ON rates (room_type_id, stay_type, COALESCE(property_id, '00000000-0000-0000-0000-000000000000'));

COMMENT ON COLUMN rates.property_id IS 'If set, rate applies only to this property. NULL = global fallback rate.';
COMMENT ON TABLE room_rate_overrides IS 'Per-room price overrides. Takes priority over property and global rates.';
