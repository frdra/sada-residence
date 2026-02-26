-- ============================================
-- 009: In-App Notification System
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target
  target_role TEXT NOT NULL DEFAULT 'admin',  -- admin, staff, guest
  target_user_id UUID,  -- specific user (NULL = all users of that role)

  -- Content
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT DEFAULT '🔔',

  -- Link to related entity
  reference_type TEXT,  -- booking, payment, issue, attendance, expense
  reference_id UUID,
  action_url TEXT,      -- deep link e.g. /admin/bookings?id=xxx

  -- State
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(target_user_id, is_read, created_at DESC)
  WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id)
  WHERE reference_type IS NOT NULL;

-- Auto-cleanup: delete notifications older than 90 days (run via cron)
-- This is just a helper function, not auto-scheduled
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
