-- ============================================
-- Sada Residence — Housekeeping SOP System
-- ============================================

-- ── ENUMS ──
CREATE TYPE task_type AS ENUM (
  'checkout_clean', 'occupied_clean', 'deep_clean', 'inspection'
);

CREATE TYPE task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'needs_review', 'approved', 'rejected'
);

CREATE TYPE photo_type AS ENUM ('before', 'after', 'issue');

CREATE TYPE issue_type AS ENUM (
  'electrical', 'plumbing', 'furniture', 'appliance', 'structural', 'other'
);

CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE issue_status AS ENUM (
  'reported', 'acknowledged', 'in_progress', 'resolved', 'closed'
);

CREATE TYPE laundry_status AS ENUM (
  'pending', 'picked_up', 'washing', 'done', 'delivered'
);

-- ── STAFF PROFILES ──
-- Staff use Supabase Auth just like admins, but with role='staff' in admin_profiles.
-- This table stores extra staff-specific data.
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  employee_id TEXT UNIQUE,
  assigned_property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  shift TEXT NOT NULL DEFAULT 'pagi'
    CHECK (shift IN ('pagi', 'sore')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_property ON staff_profiles(assigned_property_id);

-- ── CLEANING CHECKLIST MASTER ──
-- SOP items that every room cleaning must follow
CREATE TABLE cleaning_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL
    CHECK (category IN ('kamar_tidur', 'kamar_mandi', 'area_umum', 'perlengkapan')),
  item_name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── HOUSEKEEPING TASKS ──
CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_type task_type NOT NULL DEFAULT 'occupied_clean',
  status task_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  -- Scoring
  checklist_score NUMERIC(5,2),      -- % checklist completed
  time_score NUMERIC(5,2),           -- time-based score
  photo_score NUMERIC(5,2),          -- has before+after
  admin_rating INTEGER CHECK (admin_rating BETWEEN 1 AND 5),
  total_score NUMERIC(5,2),          -- weighted composite
  admin_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hk_tasks_room ON housekeeping_tasks(room_id, task_date);
CREATE INDEX idx_hk_tasks_staff ON housekeeping_tasks(assigned_to, task_date);
CREATE INDEX idx_hk_tasks_property ON housekeeping_tasks(property_id, task_date);
CREATE INDEX idx_hk_tasks_status ON housekeeping_tasks(status);

-- ── TASK PHOTOS ──
CREATE TABLE task_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES housekeeping_tasks(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type photo_type NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_photos_task ON task_photos(task_id);

-- ── TASK CHECKLIST (per-task instance) ──
CREATE TABLE task_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES housekeeping_tasks(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES cleaning_checklist_items(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(task_id, checklist_item_id)
);

CREATE INDEX idx_task_checklist_task ON task_checklist(task_id);

-- ── ROOM ISSUES (damage reports) ──
CREATE TABLE room_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  issue_type issue_type NOT NULL,
  severity issue_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  status issue_status NOT NULL DEFAULT 'reported',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issues_room ON room_issues(room_id);
CREATE INDEX idx_issues_property ON room_issues(property_id);
CREATE INDEX idx_issues_status ON room_issues(status);
CREATE INDEX idx_issues_severity ON room_issues(severity);

-- ── ISSUE PHOTOS ──
CREATE TABLE issue_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES room_issues(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_photos_issue ON issue_photos(issue_id);

-- ── LAUNDRY REQUESTS ──
CREATE TABLE laundry_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL DEFAULT 'regular'
    CHECK (request_type IN ('regular', 'express')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER NOT NULL DEFAULT 0,
  status laundry_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_laundry_room ON laundry_requests(room_id);
CREATE INDEX idx_laundry_property ON laundry_requests(property_id);
CREATE INDEX idx_laundry_status ON laundry_requests(status);

-- ── TRIGGERS ──
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'staff_profiles','housekeeping_tasks','room_issues','laundry_requests'
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

-- ── ROW LEVEL SECURITY ──
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service full access staff" ON staff_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access checklist_master" ON cleaning_checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access hk_tasks" ON housekeeping_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access task_photos" ON task_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access task_checklist" ON task_checklist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access issues" ON room_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access issue_photos" ON issue_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access laundry" ON laundry_requests FOR ALL USING (true) WITH CHECK (true);

-- ════════════════════════════════════════
-- SEED: Standard SOP Checklist Items
-- ════════════════════════════════════════

INSERT INTO cleaning_checklist_items (category, item_name, description, is_required, sort_order) VALUES
-- Kamar Tidur
('kamar_tidur', 'Ganti sprei & sarung bantal', 'Ganti dengan yang bersih, pastikan tidak ada noda', true, 1),
('kamar_tidur', 'Rapikan tempat tidur', 'Lipat rapi, bantal tertata simetris', true, 2),
('kamar_tidur', 'Bersihkan meja & nakas', 'Lap debu, bersihkan permukaan', true, 3),
('kamar_tidur', 'Bersihkan lantai', 'Sapu dan pel seluruh lantai kamar', true, 4),
('kamar_tidur', 'Cek AC & remote', 'Pastikan AC berfungsi, remote ada & baterai hidup', true, 5),
('kamar_tidur', 'Bersihkan jendela & tirai', 'Lap kaca, rapikan tirai', false, 6),
('kamar_tidur', 'Kosongkan tempat sampah', 'Ganti kantong plastik baru', true, 7),
('kamar_tidur', 'Cek lampu kamar', 'Semua lampu menyala normal', true, 8),
-- Kamar Mandi
('kamar_mandi', 'Bersihkan toilet & bidet', 'Sikat dalam & luar, pastikan bersih', true, 10),
('kamar_mandi', 'Bersihkan wastafel & cermin', 'Lap hingga mengkilap, tidak ada noda air', true, 11),
('kamar_mandi', 'Bersihkan shower & lantai', 'Sikat lantai, bersihkan shower head', true, 12),
('kamar_mandi', 'Ganti handuk', 'Handuk mandi + handuk tangan baru', true, 13),
('kamar_mandi', 'Isi sabun & shampoo', 'Pastikan dispenser terisi penuh', true, 14),
('kamar_mandi', 'Isi tisu toilet', 'Ganti gulungan baru jika kurang dari 1/4', true, 15),
('kamar_mandi', 'Cek saluran air', 'Pastikan tidak mampet', true, 16),
-- Area Umum
('area_umum', 'Bersihkan teras/balkon', 'Sapu & pel area teras', false, 20),
('area_umum', 'Lap pintu & handle', 'Bersihkan gagang pintu, lap permukaan', true, 21),
('area_umum', 'Cek kunci pintu', 'Pastikan kunci & kartu akses berfungsi', true, 22),
-- Perlengkapan
('perlengkapan', 'Cek air minum', 'Sediakan 2 botol air mineral', true, 30),
('perlengkapan', 'Cek gelas & piring', 'Bersih, lengkap 2 set', true, 31),
('perlengkapan', 'Cek sandal kamar', 'Ada 2 pasang sandal bersih', true, 32),
('perlengkapan', 'Cek hanger lemari', 'Minimal 6 hanger tersedia', false, 33),
('perlengkapan', 'Cek stop kontak', 'Semua stop kontak berfungsi', true, 34),
('perlengkapan', 'Cek WiFi info card', 'Kartu info WiFi tersedia di meja', true, 35);
