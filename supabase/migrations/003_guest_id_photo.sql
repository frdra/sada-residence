-- ============================================
-- Add ID photo support for guest check-in
-- ============================================

-- Add id_photo_url column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS id_photo_url TEXT;

-- Create storage bucket for guest ID photos (run in Supabase Dashboard > Storage)
-- Bucket name: guest-id-photos
-- Public: No (private, only accessible via service role)

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guests_id_number ON guests(id_number) WHERE id_number IS NOT NULL;
