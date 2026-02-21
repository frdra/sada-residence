-- ============================================
-- Sada Residence — Seed Data
-- ============================================

-- Properties (3 buildings)
INSERT INTO properties (id, name, slug, description, address, total_rooms, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Sada Residence Persada', 'persada',
   'Akomodasi modern dan nyaman dengan fasilitas lengkap di kawasan Jimbaran.',
   'Jl. Raya Jimbaran, Jimbaran, Kuta Selatan, Badung, Bali', 30, 1),
  ('a1000000-0000-0000-0000-000000000002', 'Sada Residence Udayana', 'udayana',
   'Lokasi strategis dekat kampus Udayana, ideal untuk mahasiswa dan profesional.',
   'Jl. Kampus Udayana, Jimbaran, Kuta Selatan, Badung, Bali', 33, 2),
  ('a1000000-0000-0000-0000-000000000003', 'Sada Residence Taman Griya', 'taman-griya',
   'Konsep taman asri dengan suasana tenang, cocok untuk keluarga dan wisatawan.',
   'Jl. Taman Griya, Jimbaran, Kuta Selatan, Badung, Bali', 33, 3);

-- Room Types
INSERT INTO room_types (id, name, slug, description, max_guests, bed_type, room_size_sqm, amenities, sort_order) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Standard Room', 'standard',
   'Kamar standar yang nyaman dengan fasilitas lengkap untuk tinggal harian maupun bulanan.',
   2, 'Double', 20.0,
   '["AC", "WiFi", "TV", "Kamar Mandi Dalam", "Water Heater", "Lemari Pakaian", "Meja Kerja"]'::jsonb, 1),
  ('b1000000-0000-0000-0000-000000000002', 'Deluxe Room', 'deluxe',
   'Kamar luas dengan pemandangan taman, dilengkapi dapur kecil dan ruang duduk.',
   2, 'Queen', 28.0,
   '["AC", "WiFi", "Smart TV", "Kamar Mandi Dalam", "Water Heater", "Kitchenette", "Balkon", "Lemari Pakaian", "Sofa"]'::jsonb, 2),
  ('b1000000-0000-0000-0000-000000000003', 'Suite Room', 'suite',
   'Suite premium dengan ruang tamu terpisah, dapur lengkap, dan view terbaik.',
   4, 'King', 40.0,
   '["AC", "WiFi", "Smart TV 50\"", "Kamar Mandi Dalam + Bathtub", "Water Heater", "Dapur Lengkap", "Balkon Luas", "Ruang Tamu", "Mesin Cuci", "Sofa Bed"]'::jsonb, 3);

-- Rates
INSERT INTO rates (room_type_id, stay_type, price, min_stay, deposit_percentage, tax_percentage, service_fee) VALUES
  -- Standard
  ('b1000000-0000-0000-0000-000000000001', 'daily',   350000, 1, 100, 11, 25000),
  ('b1000000-0000-0000-0000-000000000001', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b1000000-0000-0000-0000-000000000001', 'monthly', 5500000, 30, 30, 11, 100000),
  -- Deluxe
  ('b1000000-0000-0000-0000-000000000002', 'daily',   500000, 1, 100, 11, 35000),
  ('b1000000-0000-0000-0000-000000000002', 'weekly',  3000000, 7, 50, 11, 70000),
  ('b1000000-0000-0000-0000-000000000002', 'monthly', 8000000, 30, 30, 11, 150000),
  -- Suite
  ('b1000000-0000-0000-0000-000000000003', 'daily',   850000, 1, 100, 11, 50000),
  ('b1000000-0000-0000-0000-000000000003', 'weekly',  5000000, 7, 50, 11, 100000),
  ('b1000000-0000-0000-0000-000000000003', 'monthly', 13000000, 30, 30, 11, 200000);

-- Generate rooms for each property
-- Persada: 30 rooms (20 standard, 8 deluxe, 2 suite)
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000001'::uuid,
  CASE
    WHEN n <= 20 THEN 'b1000000-0000-0000-0000-000000000001'::uuid
    WHEN n <= 28 THEN 'b1000000-0000-0000-0000-000000000002'::uuid
    ELSE 'b1000000-0000-0000-0000-000000000003'::uuid
  END,
  'P' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 10 THEN 1 WHEN n <= 20 THEN 2 ELSE 3 END
FROM generate_series(1, 30) AS n;

-- Udayana: 33 rooms (22 standard, 9 deluxe, 2 suite)
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000002'::uuid,
  CASE
    WHEN n <= 22 THEN 'b1000000-0000-0000-0000-000000000001'::uuid
    WHEN n <= 31 THEN 'b1000000-0000-0000-0000-000000000002'::uuid
    ELSE 'b1000000-0000-0000-0000-000000000003'::uuid
  END,
  'U' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 11 THEN 1 WHEN n <= 22 THEN 2 ELSE 3 END
FROM generate_series(1, 33) AS n;

-- Taman Griya: 33 rooms (22 standard, 9 deluxe, 2 suite)
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
SELECT
  'a1000000-0000-0000-0000-000000000003'::uuid,
  CASE
    WHEN n <= 22 THEN 'b1000000-0000-0000-0000-000000000001'::uuid
    WHEN n <= 31 THEN 'b1000000-0000-0000-0000-000000000002'::uuid
    ELSE 'b1000000-0000-0000-0000-000000000003'::uuid
  END,
  'TG' || lpad(n::text, 3, '0'),
  CASE WHEN n <= 11 THEN 1 WHEN n <= 22 THEN 2 ELSE 3 END
FROM generate_series(1, 33) AS n;
