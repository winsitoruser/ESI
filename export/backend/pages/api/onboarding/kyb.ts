import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const db = getDb();
  const userId = parseInt(session.user.id);
  const tenantId = session.user.tenantId;

  if (req.method === 'GET') {
    try {
      const kyb = await db.KybApplication.findOne({
        where: { userId },
        include: [{
          model: db.KybDocument,
          as: 'documents'
        }],
        order: [['created_at', 'DESC']]
      });

      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      return res.status(200).json({ success: true, data: kyb });
    } catch (error) {
      console.error('KYB fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch KYB data' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      const updateData = req.body;
      
      // Calculate completion percentage based on filled fields
      const steps = {
        1: ['businessName', 'businessCategory', 'businessDuration'],
        2: ['legalEntityType', 'ktpNumber', 'ktpName'],
        3: [], // documents - checked separately
        4: ['picName', 'picPhone', 'businessAddress', 'businessCity', 'businessProvince'],
        5: ['businessStructure'],
        6: ['additionalNotes']
      };

      let filledSteps = 0;
      const totalSteps = 6;
      
      const merged = { ...kyb.toJSON(), ...updateData };
      
      for (const [step, fields] of Object.entries(steps)) {
        if (parseInt(step) === 3) {
          // Check documents
          const docCount = await db.KybDocument.count({ where: { kybApplicationId: kyb.id } });
          if (docCount > 0) filledSteps++;
        } else {
          const hasData = (fields as string[]).some(f => merged[f] && merged[f] !== '');
          if (hasData) filledSteps++;
        }
      }

      updateData.completionPercentage = Math.round((filledSteps / totalSteps) * 100);

      await kyb.update(updateData);

      // Update tenant onboarding step
      if (tenantId && updateData.currentStep) {
        await db.Tenant.update(
          { onboardingStep: updateData.currentStep },
          { where: { id: tenantId } }
        );
      }

      return res.status(200).json({ success: true, data: kyb });
    } catch (error) {
      console.error('KYB update error:', error);
      return res.status(500).json({ message: 'Failed to update KYB data' });
    }
  }

  if (req.method === 'POST' && req.query.action === 'submit') {
    try {
      const kyb = await db.KybApplication.findOne({ where: { userId } });
      if (!kyb) {
        return res.status(404).json({ message: 'KYB application not found' });
      }

      // Validate required fields before submission
      const requiredFields = ['businessName', 'legalEntityType', 'ktpNumber', 'ktpName', 
        'picName', 'picPhone', 'businessAddress', 'businessCity', 'businessProvince', 'businessStructure'];
      
      const missing = requiredFields.filter(f => !kyb[f] || kyb[f] === '');
      if (missing.length > 0) {
        return res.status(400).json({ 
          message: 'Data belum lengkap. Silakan lengkapi semua field wajib.',
          missingFields: missing 
        });
      }

      await kyb.update({
        status: 'submitted',
        submittedAt: new Date(),
        completionPercentage: 100
      });

      // Update tenant KYB status
      if (tenantId) {
        await db.Tenant.update(
          { kybStatus: 'in_review' },
          { where: { id: tenantId } }
        );
      }

      return res.status(200).json({ 
        success: true, 
        message: 'KYB berhasil disubmit. Tim kami akan mereview data Anda.',
        data: kyb 
      });
    } catch (error) {
      console.error('KYB submit error:', error);
      return res.status(500).json({ message: 'Failed to submit KYB' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
