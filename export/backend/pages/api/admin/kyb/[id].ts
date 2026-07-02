import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!['super_admin', 'admin'].includes(session.user.role || '')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const db = getDb();
  const { id } = req.query;

  // GET - Detail KYB application
  if (req.method === 'GET') {
    try {
      const kyb = await db.KybApplication.findByPk(id, {
        include: [
          { model: db.KybDocument, as: 'documents' },
          { model: db.Tenant, as: 'tenant' },
          { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'role', 'createdAt'] }
        ]
      });

      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      return res.status(200).json({ success: true, data: kyb });
    } catch (error) {
      console.error('Admin KYB detail error:', error);
      return res.status(500).json({ message: 'Failed to fetch KYB detail' });
    }
  }

  // PUT - Review actions (approve, reject, request revision, start review)
  if (req.method === 'PUT') {
    try {
      const kyb = await db.KybApplication.findByPk(id);
      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      const { action, reviewNotes, rejectionReason } = req.body;

      switch (action) {
        case 'start_review':
          await kyb.update({
            status: 'in_review',
            reviewedBy: session.user.id,
          });
          await db.Tenant.update(
            { kybStatus: 'in_review' },
            { where: { id: kyb.tenantId } }
          );
          break;

        case 'approve':
          await kyb.update({
            status: 'approved',
            reviewedBy: session.user.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          });
          await db.Tenant.update(
            { kybStatus: 'approved', businessStructure: kyb.businessStructure },
            { where: { id: kyb.tenantId } }
          );

          // Trigger provisioning
          await provisionTenant(db, kyb, session.user.id);
          break;

        case 'reject':
          if (!rejectionReason) {
            return res.status(400).json({ message: 'Alasan penolakan wajib diisi' });
          }
          await kyb.update({
            status: 'rejected',
            reviewedBy: session.user.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
            rejectionReason,
          });
          await db.Tenant.update(
            { kybStatus: 'rejected' },
            { where: { id: kyb.tenantId } }
          );
          break;

        case 'request_revision':
          await kyb.update({
            status: 'revision_needed',
            reviewedBy: session.user.id,
            reviewNotes: reviewNotes || null,
            rejectionReason: rejectionReason || null,
          });
          await db.Tenant.update(
            { kybStatus: 'rejected' },
            { where: { id: kyb.tenantId } }
          );
          break;

        default:
          return res.status(400).json({ message: 'Invalid action' });
      }

      const updated = await db.KybApplication.findByPk(id, {
        include: [
          { model: db.KybDocument, as: 'documents' },
          { model: db.Tenant, as: 'tenant' },
          { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
        ]
      });

      return res.status(200).json({
        success: true,
        message: action === 'approve' ? 'KYB disetujui dan akun sedang diprovisioning.'
          : action === 'reject' ? 'KYB ditolak.'
          : action === 'request_revision' ? 'Permintaan revisi telah dikirim.'
          : 'Status review diperbarui.',
        data: updated,
      });
    } catch (error) {
      console.error('Admin KYB review error:', error);
      return res.status(500).json({ message: 'Failed to process review action' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// Generate next Business Code (BUS-001, BUS-002, etc.)
async function generateBusinessCode(db: any): Promise<string> {
  const { QueryTypes } = require('sequelize');
  const result = await db.sequelize.query(
    `UPDATE system_sequences SET current_value = current_value + 1, updated_at = NOW()
     WHERE sequence_name = 'business_code'
     RETURNING current_value, prefix`,
    { type: QueryTypes.SELECT }
  );
  if (result?.[0]) {
    const { current_value, prefix } = result[0];
    return `${prefix}-${String(current_value).padStart(3, '0')}`;
  }
  // Fallback
  return `BUS-${Date.now().toString().slice(-6)}`;
}

// Clone default settings from master template to tenant's store_settings
async function cloneDefaultSettings(db: any, tenantId: string, businessTypeCode: string) {
  const { QueryTypes } = require('sequelize');
  try {
    const templates = await db.sequelize.query(
      `SELECT setting_category, setting_key, setting_value, data_type, description
       FROM default_settings_templates
       WHERE business_type_code = :code`,
      { replacements: { code: businessTypeCode }, type: QueryTypes.SELECT }
    );

    for (const tpl of (templates as any[])) {
      try {
        await db.StoreSetting.findOrCreate({
          where: {
            category: tpl.setting_category,
            key: tpl.setting_key,
            storeId: null,
            branchId: null,
          },
          defaults: {
            category: tpl.setting_category,
            key: tpl.setting_key,
            value: tpl.setting_value,
            dataType: tpl.data_type,
            description: tpl.description,
            isGlobal: true,
          }
        });
      } catch (e) {
        // Non-critical: skip if setting already exists or model mismatch
      }
    }
    console.log(`[Provisioning] Cloned ${(templates as any[]).length} default settings for ${businessTypeCode}`);
  } catch (error) {
    console.warn('[Provisioning] Settings clone skipped:', (error as Error).message);
  }
}

// Provisioning logic: The Master-Clone Pattern
async function provisionTenant(db: any, kyb: any, adminUserId: string) {
  try {
    const tenant = await db.Tenant.findByPk(kyb.tenantId);
    if (!tenant) return;

    // Step 1: Generate Business Code (BUS-XXX)
    const businessCode = await generateBusinessCode(db);
    console.log(`[Provisioning] Generated Business Code: ${businessCode}`);

    if (kyb.businessStructure === 'multi_branch') {
      // ========================================
      // A. Multi-Branch: The Master-Clone Pattern
      // ========================================

      // Step 2: Set tenant as HQ (Parent)
      await tenant.update({
        isHq: true,
        businessStructure: 'multi_branch',
        businessCode,
        kybStatus: 'active',
        setupCompleted: true,
        activatedAt: new Date(),
        activatedBy: adminUserId,
        businessAddress: kyb.businessAddress,
        businessPhone: kyb.picPhone,
        businessEmail: kyb.picEmail,
      });

      // Step 3: Create HQ main branch linked to tenant
      const hqBranch = await db.Branch.create({
        tenantId: tenant.id,
        code: `${businessCode}-HQ`,
        name: `${kyb.businessName} - HQ`,
        type: 'main',
        address: kyb.businessAddress,
        city: kyb.businessCity,
        province: kyb.businessProvince,
        postalCode: kyb.businessPostalCode,
        phone: kyb.picPhone,
        email: kyb.picEmail,
        isActive: true,
      });

      // Step 4: Create planned sub-branches as placeholders
      const branchCount = Math.min(kyb.plannedBranchCount || 1, 50);
      for (let i = 1; i < branchCount; i++) {
        await db.Branch.create({
          tenantId: tenant.id,
          code: `${businessCode}-BR${String(i).padStart(3, '0')}`,
          name: `${kyb.businessName} - Cabang ${i}`,
          type: 'branch',
          isActive: false, // Inactive until configured by HQ admin
        });
      }

      // Step 5: Set owner user data_scope to all_branches (HQ access)
      await db.User.update(
        { dataScope: 'all_branches', assignedBranchId: hqBranch.id },
        { where: { id: kyb.userId } }
      );

    } else {
      // ========================================
      // B. Single-Branch: The Restricted-Access Pattern
      // ========================================

      // Step 2: Set tenant as single business
      await tenant.update({
        isHq: false,
        businessStructure: 'single',
        businessCode,
        kybStatus: 'active',
        setupCompleted: true,
        activatedAt: new Date(),
        activatedBy: adminUserId,
        businessAddress: kyb.businessAddress,
        businessPhone: kyb.picPhone,
        businessEmail: kyb.picEmail,
      });

      // Step 3: Create single branch linked to tenant
      const branch = await db.Branch.create({
        tenantId: tenant.id,
        code: `${businessCode}-001`,
        name: kyb.businessName,
        type: 'main',
        address: kyb.businessAddress,
        city: kyb.businessCity,
        province: kyb.businessProvince,
        postalCode: kyb.businessPostalCode,
        phone: kyb.picPhone,
        email: kyb.picEmail,
        isActive: true,
      });

      // Step 4: Privilege Locking - user sees only own branch, no multi-branch menu
      await db.User.update(
        { dataScope: 'own_branch', assignedBranchId: branch.id },
        { where: { id: kyb.userId } }
      );
    }

    // Step 6: Clone Configuration - copy default settings from master template
    await cloneDefaultSettings(db, tenant.id, kyb.businessCategory || 'retail');

    // Step 7: Service Provisioning - assign modules based on business type
    const businessType = await db.BusinessType.findOne({
      where: { code: kyb.businessCategory },
      include: [{ model: db.Module, as: 'modules' }]
    });

    if (businessType?.modules?.length) {
      for (const mod of businessType.modules) {
        await db.TenantModule.findOrCreate({
          where: { tenantId: tenant.id, moduleId: mod.id },
          defaults: { tenantId: tenant.id, moduleId: mod.id, isActive: true }
        });
      }
    } else {
      // Assign all core modules if no business type match
      const coreModules = await db.Module.findAll({ where: { isCore: true, isActive: true } });
      for (const mod of coreModules) {
        await db.TenantModule.findOrCreate({
          where: { tenantId: tenant.id, moduleId: mod.id },
          defaults: { tenantId: tenant.id, moduleId: mod.id, isActive: true }
        });
      }
    }

    console.log(`[Provisioning] Tenant ${businessCode} (${tenant.id}) provisioned successfully as ${kyb.businessStructure}`);
  } catch (error) {
    console.error('[Provisioning] Error:', error);
    throw error;
  }
}
