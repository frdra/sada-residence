-- ============================================
-- Sada Residence — Seed Data
-- ============================================

-- Properties (4 buildings)
INSERT INTO properties (id, name, slug, description, address, total_rooms, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Sada Residence Persada', 'persada',
   'Akomodasi modern dan nyaman di pusat kawasan Jimbaran dengan akses mudah ke segala fasilitas.',
   'Jl. Raya Jimbaran, Jimbaran, Kuta Selatan, Badung, Bali', 30, 1),
  ('a1000000-0000-0000-0000-000000000002', 'Sada Residence Udayana', 'udayana',
   'Lokasi strategis dekat kampus Udayana, ideal untuk mahasiswa dan profesional.',
   'Jl. Kampus Udayana, Jimbaran, Kuta Selatan, Badung, Bali', 34, 2),
  ('a1000000-0000-0000-0000-000000000003', 'Sada Residence Taman Griya', 'taman-griya',
   'Hunian asri di lingkungan Taman Griya yang tenang, cocok untuk keluarga dan wisatawan.',
   'Jl. Taman Griya, Jimbaran, Kuta Selatan, Badung, Bali', 39, 3),
  ('a1000000-0000-0000-0000-000000000004', 'Sada Residence Goa Gong', 'goa-gong',
   'Hunian eksklusif di kawasan Goa Gong dengan akses mudah ke pantai dan pusat kuliner Jimbaran.',
   'Jl. Goa Gong, Jimbaran, Kuta Selatan, Badung, Bali', 24, 4);

-- Room Types (1 per property, each with unique size & amenities)
INSERT INTO room_types (id, name, slug, description, max_guests, bed_type, room_size_sqm, amenities, sort_order) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Kamar Persada', 'kamar-persada',
   'Kamar nyaman 20m² dilengkapi kompor, kulkas kecil, dan fasilitas lengkap di lokasi strategis Jimbaran.',
   2, 'Double', 20.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Kompor", "Kulkas Kecil", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 1),
  ('b1000000-0000-0000-0000-000000000002', 'Kamar Udayana', 'kamar-udayana',
   'Kamar nyaman 21m² dilengkapi kompor, kulkas kecil, dan fasilitas lengkap dekat kampus Udayana.',
   2, 'Double', 21.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Kompor", "Kulkas Kecil", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 2),
  ('b1000000-0000-0000-0000-000000000003', 'Kamar Taman Griya', 'kamar-taman-griya',
   'Kamar nyaman 21m² dilengkapi kompor, kulkas kecil, dan fasilitas lengkap di lingkungan asri Taman Griya.',
   2, 'Double', 21.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Kompor", "Kulkas Kecil", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 3),
  ('b1000000-0000-0000-0000-000000000004', 'Kamar Goa Gong', 'kamar-goa-gong',
   'Kamar luas 23m² dilengkapi dapur & meja makan kecil, kulkas, dan fasilitas lengkap di kawasan Goa Gong.',
   2, 'Double', 23.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Dapur & Meja Makan Kecil", "Kulkas", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 4);

-- Rates (same pricing for all room types)
INSERT INTO rates (room_type_id, stay_type, price, min_stay, deposit_percentage, tax_percentage, service_fee) VALUES
  -- Kamar Persada
  ('b1000000-0000-0000-0000-000000000001', 'daily',   350000, 1, 100, 11, 25000),
  ('b1000000-0000-0000-0000-000000000001', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b1000000-0000-0000-0000-000000000001', 'monthly', 5500000, 30, 30, 11, 100000),
  -- Kamar Udayana
  ('b1000000-0000-0000-0000-000000000002', 'daily',   350000, 1, 100, 11, 25000),
  ('b1000000-0000-0000-0000-000000000002', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b1000000-0000-0000-0000-000000000002', 'monthly', 5500000, 30, 30, 11, 100000),
  -- Kamar Taman Griya
  ('b1000000-0000-0000-0000-000000000003', 'daily',   350000, 1, 100, 11, 25000),
  ('b1000000-0000-0000-0000-000000000003', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b1000000-0000-0000-0000-000000000003', 'monthly', 5500000, 30, 30, 11, 100000),
  -- Kamar Goa Gong
  ('b1000000-0000-0000-0000-000000000004', 'daily',   350000, 1, 100, 11, 25000),
  ('b1000000-0000-0000-0000-000000000004', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b1000000-0000-0000-0000-000000000004', 'monthly', 5500000, 30, 30, 11, 100000);

-- ═══════════════════════════════════════
-- Generate rooms per property with correct floor distribution
-- ═══════════════════════════════════════

-- Persada: 30 rooms — L1=8, L2=11, L3=11
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000001'::uuid,
  'b1000000-0000-0000-0000-000000000001'::uuid,
  'P' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 8 THEN 1 WHEN n <= 19 THEN 2 ELSE 3 END
FROM generate_series(1, 30) AS n;

-- Udayana: 34 rooms — L1=10, L2=12, L3=12
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000002'::uuid,
  'b1000000-0000-0000-0000-000000000002'::uuid,
  'U' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 10 THEN 1 WHEN n <= 22 THEN 2 ELSE 3 END
FROM generate_series(1, 34) AS n;

-- Taman Griya: 39 rooms — L1=13, L2=13, L3=13
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000003'::uuid,
  'b1000000-0000-0000-0000-000000000003'::uuid,
  'TG' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 13 THEN 1 WHEN n <= 26 THEN 2 ELSE 3 END
FROM generate_series(1, 39) AS n;

-- Goa Gong: 24 rooms — L2=12, L3=12 (no ground floor rooms)
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000004'::uuid,
  'b1000000-0000-0000-0000-000000000004'::uuid,
  'GG' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 12 THEN 2 ELSE 3 END
FROM generate_series(1, 24) AS n;
