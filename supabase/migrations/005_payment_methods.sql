-- ============================================
-- 005: Payment Method Types (Bayar di Lokasi)
-- ============================================

-- Add payment_method_type to bookings to track how guest chose to pay
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT 'online';

-- Add constraint
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_type_check
    CHECK (payment_method_type IN ('online', 'dp_online', 'pay_at_property'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add on_site_method to payments for tracking Cash/QRIS/Transfer payments at property
ALTER TABLE payments ADD COLUMN IF NOT EXISTS on_site_method TEXT;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_on_site_method_check
    CHECK (on_site_method IS NULL OR on_site_method IN ('cash', 'qris', 'transfer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add notes column to payments for admin notes when recording on-site payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN bookings.payment_method_type IS 'online = full online, dp_online = deposit online + sisa di lokasi, pay_at_property = bayar penuh di lokasi';
COMMENT ON COLUMN payments.on_site_method IS 'Method used for on-site payment: cash, qris, or transfer';
