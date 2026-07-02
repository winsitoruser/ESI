-- Quick fix: Add tenant_id column to users table
-- Run this SQL directly in your PostgreSQL database

-- 1. Check if column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Add tenant_id column
        ALTER TABLE users ADD COLUMN tenant_id UUID;
        
        -- Add comment
        COMMENT ON COLUMN users.tenant_id IS 'Reference to tenant (nullable for super admin)';
        
        RAISE NOTICE 'Column tenant_id added to users table';
    ELSE
        RAISE NOTICE 'Column tenant_id already exists';
    END IF;
END $$;

-- 2. Check if role column exists and has correct type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        -- Add role column if it doesn't exist
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'staff';
        
        RAISE NOTICE 'Column role added to users table';
    END IF;
END $$;

-- 3. Verify columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('tenant_id', 'role')
ORDER BY column_name;
