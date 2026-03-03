-- ============================================
-- Sada Residence — Update Property & Room Data
-- Migration: Restructure from 3 generic room types to
--            1 property-specific room type per building
-- SAFE: Does not delete any rooms (preserves booking history)
-- ============================================

BEGIN;

-- ══════════════════════════════════════════
-- STEP 1: Update property total_rooms
-- ══════════════════════════════════════════
UPDATE properties SET total_rooms = 30 WHERE slug = 'persada';
UPDATE properties SET total_rooms = 34 WHERE slug = 'udayana';
UPDATE properties SET total_rooms = 39 WHERE slug = 'taman-griya';
UPDATE properties SET total_rooms = 24 WHERE slug = 'goa-gong';

-- ══════════════════════════════════════════
-- STEP 2: Deactivate old room types & rates
-- ══════════════════════════════════════════
UPDATE room_types SET is_active = false
WHERE slug IN ('standard', 'deluxe', 'suite');

UPDATE rates SET is_active = false
WHERE room_type_id IN (
  SELECT id FROM room_types WHERE slug IN ('standard', 'deluxe', 'suite')
);

-- ══════════════════════════════════════════
-- STEP 3: Insert new property-specific room types
-- ══════════════════════════════════════════
INSERT INTO room_types (id, name, slug, description, max_guests, bed_type, room_size_sqm, amenities, sort_order) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Kamar Persada', 'kamar-persada',
   'Kamar nyaman 20m² dilengkapi kompor, kulkas kecil, dan fasilitas lengkap di lokasi strategis Jimbaran.',
   2, 'Double', 20.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Kompor", "Kulkas Kecil", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 1),
  ('b2000000-0000-0000-0000-000000000002', 'Kamar Udayana', 'kamar-udayana',
   'Kamar nyaman 21m² dilengkapi kompor, kulkas kecil, dan fasilitas lengkap dekat kampus Udayana.',
   2, 'Double', 21.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Kompor", "Kulkas Kecil", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 2),
  ('b2000000-0000-0000-0000-000000000003', 'Kamar Taman Griya', 'kamar-taman-griya',
   'Kamar nyaman 21m² dilengkapi kompor, kulkas kecil, dan fasilitas lengkap di lingkungan asri Taman Griya.',
   2, 'Double', 21.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Kompor", "Kulkas Kecil", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 3),
  ('b2000000-0000-0000-0000-000000000004', 'Kamar Goa Gong', 'kamar-goa-gong',
   'Kamar luas 23m² dilengkapi dapur & meja makan kecil, kulkas, dan fasilitas lengkap di kawasan Goa Gong.',
   2, 'Double', 23.0,
   '["AC", "Air Panas", "Kamar Mandi Dalam", "Dapur & Meja Makan Kecil", "Kulkas", "Dispenser", "Wifi Fiber Optic"]'::jsonb, 4);

-- ══════════════════════════════════════════
-- STEP 4: Insert rates for new room types
-- ══════════════════════════════════════════
INSERT INTO rates (room_type_id, stay_type, price, min_stay, deposit_percentage, tax_percentage, service_fee) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'daily',   350000, 1, 100, 11, 25000),
  ('b2000000-0000-0000-0000-000000000001', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b2000000-0000-0000-0000-000000000001', 'monthly', 5500000, 30, 30, 11, 100000),
  ('b2000000-0000-0000-0000-000000000002', 'daily',   350000, 1, 100, 11, 25000),
  ('b2000000-0000-0000-0000-000000000002', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b2000000-0000-0000-0000-000000000002', 'monthly', 5500000, 30, 30, 11, 100000),
  ('b2000000-0000-0000-0000-000000000003', 'daily',   350000, 1, 100, 11, 25000),
  ('b2000000-0000-0000-0000-000000000003', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b2000000-0000-0000-0000-000000000003', 'monthly', 5500000, 30, 30, 11, 100000),
  ('b2000000-0000-0000-0000-000000000004', 'daily',   350000, 1, 100, 11, 25000),
  ('b2000000-0000-0000-0000-000000000004', 'weekly',  2000000, 7, 50, 11, 50000),
  ('b2000000-0000-0000-0000-000000000004', 'monthly', 5500000, 30, 30, 11, 100000);

-- ══════════════════════════════════════════
-- STEP 5: Update ALL existing rooms to new room types
-- (no deletion — safe for foreign key constraints)
-- ══════════════════════════════════════════
UPDATE rooms SET room_type_id = 'b2000000-0000-0000-0000-000000000001'::uuid
WHERE property_id = (SELECT id FROM properties WHERE slug = 'persada');

UPDATE rooms SET room_type_id = 'b2000000-0000-0000-0000-000000000002'::uuid
WHERE property_id = (SELECT id FROM properties WHERE slug = 'udayana');

UPDATE rooms SET room_type_id = 'b2000000-0000-0000-0000-000000000003'::uuid
WHERE property_id = (SELECT id FROM properties WHERE slug = 'taman-griya');

UPDATE rooms SET room_type_id = 'b2000000-0000-0000-0000-000000000004'::uuid
WHERE property_id = (SELECT id FROM properties WHERE slug = 'goa-gong');

-- ══════════════════════════════════════════
-- STEP 6: Fix floor assignments for existing rooms
-- ══════════════════════════════════════════

-- Persada: L1=8, L2=11, L3=11 (30 rooms, already correct count)
UPDATE rooms SET floor =
  CASE
    WHEN room_number IN ('P001','P002','P003','P004','P005','P006','P007','P008') THEN 1
    WHEN room_number IN ('P009','P010','P011','P012','P013','P014','P015','P016','P017','P018','P019') THEN 2
    ELSE 3
  END
WHERE property_id = (SELECT id FROM properties WHERE slug = 'persada');

-- Goa Gong: L2=12, L3=12 (24 rooms, already correct count)
UPDATE rooms SET floor =
  CASE
    WHEN room_number IN ('GG001','GG002','GG003','GG004','GG005','GG006','GG007','GG008','GG009','GG010','GG011','GG012') THEN 2
    ELSE 3
  END
WHERE property_id = (SELECT id FROM properties WHERE slug = 'goa-gong');

-- Udayana: L1=10, L2=12, L3=12 (need 34, currently 33 → add 1)
UPDATE rooms SET floor =
  CASE
    WHEN room_number IN ('U001','U002','U003','U004','U005','U006','U007','U008','U009','U010') THEN 1
    WHEN room_number IN ('U011','U012','U013','U014','U015','U016','U017','U018','U019','U020','U021','U022') THEN 2
    ELSE 3
  END
WHERE property_id = (SELECT id FROM properties WHERE slug = 'udayana');

-- Add 1 extra room for Udayana (33 → 34)
INSERT INTO rooms (property_id, room_type_id, room_number, floor)
VALUES (
  (SELECT id FROM properties WHERE slug = 'udayana'),
  'b2000000-0000-0000-0000-000000000002'::uuid,
  'U034', 3
)
ON CONFLICT (property_id, room_number) DO NOTHING;

-- Taman Griya: L1=13, L2=13, L3=13 (need 39, currently 33 → add 6)
UPDATE rooms SET floor =
  CASE
    WHEN room_number IN ('TG001','TG002','TG003','TG004','TG005','TG006','TG007','TG008','TG009','TG010','TG011','TG012','TG013') THEN 1
    WHEN room_number IN ('TG014','TG015','TG016','TG017','TG018','TG019','TG020','TG021','TG022','TG023','TG024','TG025','TG026') THEN 2
    ELSE 3
  END
WHERE property_id = (SELECT id FROM properties WHERE slug = 'taman-griya');

-- Add 6 extra rooms for Taman Griya (33 → 39)
INSERT INTO rooms (property_id, room_type_id, room_number, floor) VALUES
  ((SELECT id FROM properties WHERE slug = 'taman-griya'), 'b2000000-0000-0000-0000-000000000003'::uuid, 'TG034', 3),
  ((SELECT id FROM properties WHERE slug = 'taman-griya'), 'b2000000-0000-0000-0000-000000000003'::uuid, 'TG035', 3),
  ((SELECT id FROM properties WHERE slug = 'taman-griya'), 'b2000000-0000-0000-0000-000000000003'::uuid, 'TG036', 3),
  ((SELECT id FROM properties WHERE slug = 'taman-griya'), 'b2000000-0000-0000-0000-000000000003'::uuid, 'TG037', 3),
  ((SELECT id FROM properties WHERE slug = 'taman-griya'), 'b2000000-0000-0000-0000-000000000003'::uuid, 'TG038', 3),
  ((SELECT id FROM properties WHERE slug = 'taman-griya'), 'b2000000-0000-0000-0000-000000000003'::uuid, 'TG039', 3)
ON CONFLICT (property_id, room_number) DO NOTHING;

COMMIT;
