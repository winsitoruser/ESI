-- ============================================================================
-- EMPLOYEE SCHEDULE & SHIFT MANAGEMENT TABLES
-- ============================================================================
-- Created: February 5, 2026
-- Purpose: Employee scheduling, shift management, and calendar integration
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: employee_schedules
-- ============================================================================
-- Purpose: Store employee work schedules with shift information
-- Relations: employees, locations, users

CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL,
  schedule_date DATE NOT NULL,
  shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('pagi', 'siang', 'malam', 'full')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'absent')),
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern VARCHAR(10) DEFAULT 'none' CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly', 'none')),
  recurring_end_date DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_employee_schedules_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_schedules_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  CONSTRAINT fk_employee_schedules_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Validation constraints
  CONSTRAINT chk_schedule_time CHECK (end_time > start_time OR shift_type = 'malam'),
  CONSTRAINT chk_recurring_end_date CHECK (
    (is_recurring = false AND recurring_end_date IS NULL) OR
    (is_recurring = true AND recurring_end_date >= schedule_date)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_date ON employee_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_status ON employee_schedules(status);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_shift ON employee_schedules(shift_type);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_location ON employee_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_date_range ON employee_schedules(schedule_date, employee_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_employee_schedules_composite ON employee_schedules(employee_id, schedule_date, status);

-- Comment on table
COMMENT ON TABLE employee_schedules IS 'Employee work schedules with shift information and recurring schedule support';

-- Comments on columns
COMMENT ON COLUMN employee_schedules.shift_type IS 'Type of shift: pagi (08:00-16:00), siang (14:00-22:00), malam (22:00-06:00), full (08:00-20:00)';
COMMENT ON COLUMN employee_schedules.status IS 'Schedule status: scheduled, confirmed, completed, cancelled, absent';
COMMENT ON COLUMN employee_schedules.is_recurring IS 'Whether this is part of a recurring schedule';
COMMENT ON COLUMN employee_schedules.recurring_pattern IS 'Pattern for recurring schedules: daily, weekly, monthly, none';

-- ============================================================================
-- TABLE: shift_templates
-- ============================================================================
-- Purpose: Store reusable shift templates for quick schedule creation

CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('pagi', 'siang', 'malam', 'full')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 0,
  color VARCHAR(20),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Validation constraints
  CONSTRAINT chk_template_time CHECK (end_time > start_time OR shift_type = 'malam'),
  CONSTRAINT chk_break_duration CHECK (break_duration >= 0 AND break_duration <= 120)
);

-- Index for active templates
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_shift_templates_type ON shift_templates(shift_type);

-- Comment on table
COMMENT ON TABLE shift_templates IS 'Reusable shift templates for quick schedule creation';

-- Comments on columns
COMMENT ON COLUMN shift_templates.break_duration IS 'Break duration in minutes';
COMMENT ON COLUMN shift_templates.color IS 'Hex color code for UI display';

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for employee_schedules
DROP TRIGGER IF EXISTS update_employee_schedules_updated_at ON employee_schedules;
CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for shift_templates
DROP TRIGGER IF EXISTS update_shift_templates_updated_at ON shift_templates;
CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON shift_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA: Shift Templates
-- ============================================================================

INSERT INTO shift_templates (name, shift_type, start_time, end_time, break_duration, color, description, is_active)
VALUES
  ('Shift Pagi Standar', 'pagi', '08:00:00', '16:00:00', 60, '#FCD34D', 'Shift pagi standar dengan istirahat 1 jam', true),
  ('Shift Siang Standar', 'siang', '14:00:00', '22:00:00', 60, '#60A5FA', 'Shift siang standar dengan istirahat 1 jam', true),
  ('Shift Malam Standar', 'malam', '22:00:00', '06:00:00', 60, '#A78BFA', 'Shift malam standar dengan istirahat 1 jam', true),
  ('Shift Full Day', 'full', '08:00:00', '20:00:00', 120, '#34D399', 'Shift full day dengan istirahat 2 jam', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('employee_schedules', 'shift_templates')
ORDER BY table_name;

-- Verify indexes created
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('employee_schedules', 'shift_templates')
ORDER BY tablename, indexname;

-- Verify foreign key constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('employee_schedules', 'shift_templates')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Employee Schedule Tables Created Successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables: employee_schedules, shift_templates';
  RAISE NOTICE 'Indexes: 8 indexes created';
  RAISE NOTICE 'Triggers: 2 triggers created';
  RAISE NOTICE 'Sample Data: 4 shift templates inserted';
  RAISE NOTICE '============================================';
END $$;
