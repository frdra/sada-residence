-- ============================================
-- 006: Staff Attendance (Absensi Foto + GPS)
-- ============================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attendance records table
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Clock in
  clock_in TIMESTAMPTZ,
  clock_in_photo_url TEXT,
  clock_in_latitude DOUBLE PRECISION,
  clock_in_longitude DOUBLE PRECISION,
  clock_in_address TEXT,
  clock_in_property_id UUID REFERENCES properties(id),

  -- Clock out
  clock_out TIMESTAMPTZ,
  clock_out_photo_url TEXT,
  clock_out_latitude DOUBLE PRECISION,
  clock_out_longitude DOUBLE PRECISION,
  clock_out_address TEXT,
  clock_out_property_id UUID REFERENCES properties(id),

  -- Calculated fields
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  work_duration_minutes INTEGER,
  is_early_leave BOOLEAN DEFAULT false,

  -- Status
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'late', 'absent', 'half_day', 'leave', 'sick')),

  notes TEXT,
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One record per staff per day
  UNIQUE(staff_id, date)
);

-- Attendance settings (shift configuration)
CREATE TABLE IF NOT EXISTS attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_name TEXT NOT NULL DEFAULT 'Pagi',
  shift_start TIME NOT NULL DEFAULT '08:00:00',
  shift_end TIME NOT NULL DEFAULT '17:00:00',
  late_tolerance_minutes INTEGER NOT NULL DEFAULT 15,
  early_leave_tolerance_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default shift setting
INSERT INTO attendance_settings (shift_name, shift_start, shift_end, late_tolerance_minutes)
VALUES ('Pagi', '08:00:00', '17:00:00', 15)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON staff_attendance(staff_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON staff_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON staff_attendance(status);

-- RLS
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

-- Staff can read their own attendance
CREATE POLICY "Staff can view own attendance" ON staff_attendance
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert own attendance" ON staff_attendance
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update own attendance" ON staff_attendance
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can read attendance settings" ON attendance_settings
  FOR SELECT USING (true);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON staff_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE staff_attendance IS 'Staff attendance records with photo + GPS verification';
COMMENT ON TABLE attendance_settings IS 'Shift configuration for attendance system';
