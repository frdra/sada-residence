-- ============================================
-- Sada Residence — Database Schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── ENUMS ──
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid', 'partial', 'paid', 'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'qris', 'credit_card', 'bank_transfer', 'cash'
);

CREATE TYPE stay_type AS ENUM (
  'daily', 'weekly', 'monthly'
);

CREATE TYPE block_reason AS ENUM (
  'maintenance', 'renovation', 'reserved', 'owner_use', 'other'
);

-- ── PROPERTIES (buildings) ──
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  city TEXT DEFAULT 'Jimbaran',
  province TEXT DEFAULT 'Bali',
  image_url TEXT,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ROOM TYPES ──
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bed_type TEXT DEFAULT 'Double',
  room_size_sqm NUMERIC(6,1),
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ROOMS ──
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  room_number TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'maintenance', 'blocked')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, room_number)
);

-- ── RATES ──
CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  stay_type stay_type NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  min_stay INTEGER NOT NULL DEFAULT 1,
  deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 11.00,
  service_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_type_id, stay_type, valid_from)
);

-- ── AVAILABILITY BLOCKS (admin can block dates) ──
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason block_reason NOT NULL DEFAULT 'maintenance',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE INDEX idx_avail_blocks_room_dates
  ON availability_blocks(room_id, start_date, end_date);

-- ── GUESTS ──
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_type TEXT,
  id_number TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Indonesia',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone ON guests(phone);

-- ── BOOKINGS ──
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_code TEXT NOT NULL UNIQUE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  stay_type stay_type NOT NULL DEFAULT 'daily',
  num_guests INTEGER NOT NULL DEFAULT 1,
  status booking_status NOT NULL DEFAULT 'pending',
  -- Pricing snapshot at time of booking
  base_price NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Payment
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Meta
  special_requests TEXT,
  admin_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX idx_bookings_code ON bookings(booking_code);
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment ON bookings(payment_status);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_checkin ON bookings(check_in);

-- ── PAYMENTS ──
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  external_id TEXT,
  xendit_invoice_id TEXT,
  xendit_payment_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method payment_method,
  payment_channel TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'expired', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_external ON payments(external_id);
CREATE INDEX idx_payments_xendit ON payments(xendit_invoice_id);

-- ── ADMIN USERS (leverages Supabase Auth) ──
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'super_admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'properties','room_types','rooms','rates',
      'guests','bookings','payments','admin_profiles'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- Generate booking code (SR-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  today TEXT;
  seq INTEGER;
BEGIN
  today := to_char(now(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq
  FROM bookings
  WHERE booking_code LIKE 'SR-' || today || '-%';

  code := 'SR-' || today || '-' || lpad(seq::text, 4, '0');
  NEW.booking_code = code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_code
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.booking_code IS NULL OR NEW.booking_code = '')
  EXECUTE FUNCTION generate_booking_code();

-- ════════════════════════════════════════
-- AVAILABILITY CHECK FUNCTION
-- Uses row-level locking to prevent double-booking
-- ════════════════════════════════════════
CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
  block_count INTEGER;
BEGIN
  -- Lock the room row to prevent concurrent bookings
  PERFORM id FROM rooms WHERE id = p_room_id FOR UPDATE;

  -- Check for overlapping bookings (exclude cancelled/no-show)
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE room_id = p_room_id
    AND status NOT IN ('cancelled', 'no_show', 'checked_out')
    AND check_in < p_check_out
    AND check_out > p_check_in
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);

  IF conflict_count > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check for availability blocks
  SELECT COUNT(*) INTO block_count
  FROM availability_blocks
  WHERE room_id = p_room_id
    AND start_date < p_check_out
    AND end_date > p_check_in;

  RETURN block_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Public read for properties, room_types, rooms, rates
CREATE POLICY "Public read properties" ON properties FOR SELECT USING (is_active = true);
CREATE POLICY "Public read room_types" ON room_types FOR SELECT USING (is_active = true);
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (is_active = true);
CREATE POLICY "Public read rates" ON rates FOR SELECT USING (is_active = true);

-- Service role has full access (used by API routes)
CREATE POLICY "Service full access properties" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access room_types" ON room_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access rates" ON rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access guests" ON guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access blocks" ON availability_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access admin" ON admin_profiles FOR ALL USING (true) WITH CHECK (true);

-- Admin access
CREATE POLICY "Admin read own profile" ON admin_profiles
  FOR SELECT USING (auth.uid() = id);
