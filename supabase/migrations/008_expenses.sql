-- ============================================
-- 008: Expense Tracking System
-- ============================================

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '#6B7280',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO expense_categories (name, icon, color, sort_order) VALUES
  ('Gaji Karyawan', '👤', '#3B82F6', 1),
  ('Listrik', '⚡', '#F59E0B', 2),
  ('Air / PDAM', '💧', '#06B6D4', 3),
  ('Internet', '🌐', '#8B5CF6', 4),
  ('Maintenance', '🔧', '#EF4444', 5),
  ('Iuran Sampah', '🗑️', '#10B981', 6),
  ('Iklan & Pemasaran', '📢', '#EC4899', 7),
  ('Komisi OTA', '🏷️', '#F97316', 8),
  ('Perlengkapan', '🧴', '#6366F1', 9),
  ('Laundry', '👕', '#14B8A6', 10),
  ('Keamanan', '🔒', '#64748B', 11),
  ('Lain-lain', '📦', '#9CA3AF', 99)
ON CONFLICT (name) DO NOTHING;

-- Main expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  property_id UUID REFERENCES properties(id),  -- NULL = pengeluaran umum
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',  -- cash, transfer, qris
  receipt_url TEXT,  -- URL bukti pembayaran

  -- Recurring fields
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  recurring_day INT,  -- day of month (1-31) or day of week (1-7)
  recurring_end_date DATE,  -- NULL = no end date
  parent_expense_id UUID REFERENCES expenses(id),  -- link to original recurring expense

  -- Meta
  recorded_by UUID REFERENCES admin_profiles(id),
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded', 'verified', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_expenses_parent ON expenses(parent_expense_id) WHERE parent_expense_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Monthly expense summary view
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT
  date_trunc('month', expense_date)::DATE AS month,
  property_id,
  category_id,
  COUNT(*) AS total_transactions,
  SUM(amount) AS total_amount
FROM expenses
WHERE status != 'cancelled'
GROUP BY date_trunc('month', expense_date), property_id, category_id
ORDER BY month DESC;
