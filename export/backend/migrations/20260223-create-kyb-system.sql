-- Migration: KYB (Know Your Business) System
-- Creates kyb_applications and kyb_documents tables
-- Enhances tenants table with KYB status tracking

-- Add KYB status columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kyb_status VARCHAR(30) DEFAULT 'pending_kyb';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_structure VARCHAR(20) DEFAULT 'single';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_hq BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activated_by UUID;

COMMENT ON COLUMN tenants.kyb_status IS 'pending_kyb, in_review, approved, rejected, active';
COMMENT ON COLUMN tenants.business_structure IS 'single, multi_branch';
COMMENT ON COLUMN tenants.parent_tenant_id IS 'For sub-branches, references the HQ tenant';
COMMENT ON COLUMN tenants.is_hq IS 'True if this tenant is an HQ (multi-branch master)';

-- Table: kyb_applications
CREATE TABLE IF NOT EXISTS kyb_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Step 1: Business Identity
  business_name VARCHAR(255) NOT NULL,
  business_category VARCHAR(100),
  business_subcategory VARCHAR(100),
  business_duration VARCHAR(50),
  business_description TEXT,
  employee_count VARCHAR(50),
  annual_revenue VARCHAR(50),

  -- Step 2: Legal Status
  legal_entity_type VARCHAR(50),
  legal_entity_name VARCHAR(255),
  nib_number VARCHAR(100),
  siup_number VARCHAR(100),
  npwp_number VARCHAR(100),
  ktp_number VARCHAR(50),
  ktp_name VARCHAR(255),

  -- Step 3: Documents (references kyb_documents table)
  -- Stored separately

  -- Step 4: PIC & Address
  pic_name VARCHAR(255),
  pic_phone VARCHAR(50),
  pic_email VARCHAR(255),
  pic_position VARCHAR(100),
  business_address TEXT,
  business_city VARCHAR(100),
  business_province VARCHAR(100),
  business_postal_code VARCHAR(20),
  business_district VARCHAR(100),
  business_coordinates JSON,

  -- Step 5: Business Structure
  business_structure VARCHAR(20) DEFAULT 'single',
  planned_branch_count INTEGER DEFAULT 1,
  branch_locations JSON,

  -- Step 6: Additional Notes
  additional_notes TEXT,
  referral_source VARCHAR(100),
  expected_start_date DATE,

  -- KYB Status
  status VARCHAR(30) DEFAULT 'draft',
  submitted_at TIMESTAMP,
  current_step INTEGER DEFAULT 1,
  completion_percentage INTEGER DEFAULT 0,

  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_kyb_status CHECK (status IN (
    'draft', 'submitted', 'in_review', 'approved', 'rejected', 'revision_needed'
  )),
  CONSTRAINT chk_legal_entity CHECK (legal_entity_type IN (
    'pt', 'cv', 'ud', 'perorangan', 'koperasi', 'yayasan', NULL
  )),
  CONSTRAINT chk_business_structure CHECK (business_structure IN ('single', 'multi_branch'))
);

COMMENT ON TABLE kyb_applications IS 'KYB (Know Your Business) applications for tenant verification';

-- Table: kyb_documents
CREATE TABLE IF NOT EXISTS kyb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyb_application_id UUID NOT NULL REFERENCES kyb_applications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  verification_status VARCHAR(30) DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMP,
  verification_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_doc_type CHECK (document_type IN (
    'ktp', 'npwp', 'nib', 'siup', 'akta_pendirian',
    'foto_outlet', 'foto_interior', 'foto_produk',
    'surat_izin_lain', 'other'
  )),
  CONSTRAINT chk_verification_status CHECK (verification_status IN (
    'pending', 'verified', 'rejected'
  ))
);

COMMENT ON TABLE kyb_documents IS 'Documents uploaded during KYB process';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kyb_applications_tenant ON kyb_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kyb_applications_user ON kyb_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyb_applications_status ON kyb_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyb_documents_application ON kyb_documents(kyb_application_id);
CREATE INDEX IF NOT EXISTS idx_kyb_documents_tenant ON kyb_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_kyb_status ON tenants(kyb_status);
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);

-- Verify
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'kyb_%' ORDER BY table_name;
