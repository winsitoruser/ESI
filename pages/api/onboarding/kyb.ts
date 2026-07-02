import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

// Helper: resolve tenantId from session or user record
async function resolveTenantId(db: any, userId: number, sessionTenantId: string | null): Promise<string | null> {
  if (sessionTenantId) return sessionTenantId;
  
  // Lookup from user record
  try {
    const user = await db.User.findByPk(userId, { attributes: ['id', 'tenantId'] });
    if (user?.tenantId) return user.tenantId;
  } catch (e: any) {
    console.error('resolveTenantId error:', e.message);
  }
  
  // Lookup from any existing KYB
  try {
    const existingKyb = await db.KybApplication.findOne({ 
      where: { userId }, 
      attributes: ['tenantId'] 
    });
    if (existingKyb?.tenantId) return existingKyb.tenantId;
  } catch (e: any) {
    console.error('resolveTenantId KYB lookup error:', e.message);
  }
  
  // Fallback: get first tenant
  try {
    const tenant = await db.Tenant.findOne({ attributes: ['id'] });
    if (tenant) return tenant.id;
  } catch (e: any) {
    console.error('resolveTenantId fallback error:', e.message);
  }
  
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const db = getDb();
    const userId = parseInt(session.user.id);
    const tenantId = await resolveTenantId(db, userId, session.user.tenantId || null);

    console.log('[KYB API]', req.method, '- userId:', userId, 'tenantId:', tenantId);

    if (req.method === 'GET') {
      // Step 1: Try to find existing KYB (without include first to avoid association errors)
      let kyb = null;
      try {
        kyb = await db.KybApplication.findOne({
          where: { userId },
          order: [['created_at', 'DESC']]
        });
      } catch (e: any) {
        console.error('[KYB GET] findOne error:', e.message);
      }

      // Step 2: If no KYB exists, create one
      if (!kyb) {
        if (!tenantId) {
          return res.status(400).json({ 
            success: false,
            message: 'Tenant tidak ditemukan. Silakan lengkapi welcome step.' 
          });
        }

        let businessName = '';
        try {
          const tenant = await db.Tenant.findByPk(tenantId, { attributes: ['id', 'businessName'] });
          businessName = tenant?.businessName || '';
        } catch (e: any) {
          console.error('[KYB GET] Tenant lookup error:', e.message);
        }
        
        try {
          kyb = await db.KybApplication.create({
            tenantId,
            userId,
            businessName: businessName || 'Bisnis Baru',
            status: 'draft',
            currentStep: 1,
            completionPercentage: 0
          });
          console.log('[KYB GET] Created new KYB:', kyb.id);
        } catch (createErr: any) {
          console.error('[KYB GET] Create error:', createErr.message);
          return res.status(500).json({ 
            success: false, 
            message: 'Gagal membuat aplikasi KYB',
            error: createErr.message 
          });
        }
      }

      // Step 3: Try to load documents separately
      let documents: any[] = [];
      try {
        documents = await db.KybDocument.findAll({
          where: { kybApplicationId: kyb.id }
        });
      } catch (e: any) {
        console.log('[KYB GET] Documents fetch skipped:', e.message);
      }

      const data = kyb.toJSON ? kyb.toJSON() : kyb;
      data.documents = documents;

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'PUT') {
      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ 
          success: false,
          message: 'KYB tidak ditemukan. Silakan refresh halaman.' 
        });
      }

      const updateData = { ...req.body };
      
      // Sanitize date fields - prevent "Invalid date" strings from reaching PostgreSQL
      const dateFields = ['expectedStartDate', 'submittedAt', 'reviewedAt'];
      for (const field of dateFields) {
        if (updateData[field]) {
          const d = new Date(updateData[field]);
          if (isNaN(d.getTime())) {
            delete updateData[field]; // Remove invalid dates
          }
        }
        if (updateData[field] === '' || updateData[field] === 'Invalid date') {
          updateData[field] = null;
        }
      }

      // Sanitize integer fields
      if (updateData.plannedBranchCount) {
        updateData.plannedBranchCount = parseInt(updateData.plannedBranchCount) || 1;
      }
      
      // Calculate completion percentage
      const stepFields: Record<number, string[]> = {
        1: ['businessName', 'businessDuration'],
        2: ['legalEntityType', 'ktpNumber', 'ktpName'],
        3: [],
        4: ['picName', 'picPhone', 'businessAddress', 'businessCity', 'businessProvince'],
        5: ['businessStructure'],
        6: ['additionalNotes']
      };

      let filledSteps = 0;
      const merged = { ...kyb.toJSON(), ...updateData };
      
      for (const [step, fields] of Object.entries(stepFields)) {
        if (parseInt(step) === 3) {
          try {
            const docCount = await db.KybDocument.count({ where: { kybApplicationId: kyb.id } });
            if (docCount > 0) filledSteps++;
          } catch (e) {
            // Skip document check if table has issues
          }
        } else {
          const hasData = (fields as string[]).some(f => merged[f] && merged[f] !== '');
          if (hasData) filledSteps++;
        }
      }

      updateData.completionPercentage = Math.round((filledSteps / 6) * 100);

      await kyb.update(updateData);
      console.log('[KYB PUT] Updated:', kyb.id, 'Step:', updateData.currentStep);

      // Update tenant onboarding step (non-blocking)
      if (tenantId && updateData.currentStep) {
        try {
          await db.Tenant.update(
            { onboardingStep: updateData.currentStep },
            { where: { id: tenantId } }
          );
        } catch (e: any) {
          console.log('[KYB PUT] Tenant update skipped:', e.message);
        }
      }

      return res.status(200).json({ success: true, data: kyb });
    }

    if (req.method === 'POST' && req.query.action === 'submit') {
      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ success: false, message: 'KYB tidak ditemukan' });
      }

      const requiredFields = ['businessName', 'legalEntityType', 'ktpNumber', 'ktpName', 
        'picName', 'picPhone', 'businessAddress', 'businessCity', 'businessProvince', 'businessStructure'];
      
      const missing = requiredFields.filter(f => !kyb[f] || kyb[f] === '');
      if (missing.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Data belum lengkap. Silakan lengkapi semua field wajib.',
          missingFields: missing 
        });
      }

      await kyb.update({
        status: 'submitted',
        submittedAt: new Date(),
        completionPercentage: 100
      });

      if (tenantId) {
        try {
          await db.Tenant.update(
            { kybStatus: 'in_review' },
            { where: { id: tenantId } }
          );
        } catch (e: any) {
          console.log('[KYB SUBMIT] Tenant update skipped:', e.message);
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'KYB berhasil disubmit. Tim kami akan mereview data Anda.',
        data: kyb 
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error: any) {
    console.error('[KYB API] Unhandled error:', error.message);
    console.error('[KYB API] Stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}
