import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const db = getDb();
    const userId = parseInt(session.user.id);
    const tenantId = session.user.tenantId;

    // Get tenant info (with safe include)
    let tenant = null;
    if (tenantId) {
      try {
        tenant = await db.Tenant.findByPk(tenantId, {
          include: [{ model: db.BusinessType, as: 'businessType' }]
        });
      } catch (e: any) {
        console.log('[Status] Tenant include error, fetching without include:', e.message);
        tenant = await db.Tenant.findByPk(tenantId);
      }
    }

    // Get KYB application (with safe include)
    let kyb = null;
    try {
      kyb = await db.KybApplication.findOne({
        where: { userId },
        include: [{
          model: db.KybDocument,
          as: 'documents'
        }],
        order: [['created_at', 'DESC']]
      });
    } catch (e: any) {
      console.log('[Status] KYB include error, fetching without include:', e.message);
      kyb = await db.KybApplication.findOne({
        where: { userId },
        order: [['created_at', 'DESC']]
      });
    }

    // If KYB loaded without documents, try fetching them separately
    if (kyb && !kyb.documents) {
      try {
        const docs = await db.KybDocument.findAll({
          where: { kybApplicationId: kyb.id }
        });
        kyb.dataValues.documents = docs;
      } catch (e: any) {
        console.log('[Status] Documents fetch skipped:', e.message);
        kyb.dataValues.documents = [];
      }
    }

    // Determine overall status
    const kybStatus = tenant?.kybStatus || 'pending_kyb';
    let statusInfo = {
      status: kybStatus,
      label: '',
      description: '',
      color: '',
      canAccessDashboard: false,
      nextAction: '',
    };

    switch (kybStatus) {
      case 'pending_kyb':
        statusInfo = {
          ...statusInfo,
          label: 'Menunggu Kelengkapan Data',
          description: 'Silakan lengkapi data bisnis Anda (KYB) untuk verifikasi.',
          color: 'yellow',
          nextAction: '/onboarding/kyb',
        };
        break;
      case 'in_review':
        statusInfo = {
          ...statusInfo,
          label: 'Dalam Proses Review',
          description: 'Data Anda sedang direview oleh tim kami. Kami akan menghubungi Anda jika ada pertanyaan.',
          color: 'blue',
          nextAction: '',
        };
        break;
      case 'approved':
        statusInfo = {
          ...statusInfo,
          label: 'Disetujui',
          description: 'Selamat! Data bisnis Anda telah diverifikasi. Akun Anda sedang dipersiapkan.',
          color: 'green',
          nextAction: '',
        };
        break;
      case 'rejected':
        statusInfo = {
          ...statusInfo,
          label: 'Perlu Perbaikan',
          description: kyb?.rejectionReason || 'Beberapa data perlu diperbaiki. Silakan periksa kembali.',
          color: 'red',
          nextAction: '/onboarding/kyb',
        };
        break;
      case 'active':
        statusInfo = {
          ...statusInfo,
          label: 'Aktif',
          description: 'Akun Anda sudah aktif. Selamat menggunakan Bedagang!',
          color: 'green',
          canAccessDashboard: true,
          nextAction: '/dashboard',
        };
        break;
    }

    return res.status(200).json({
      success: true,
      data: {
        tenant: tenant ? {
          id: tenant.id,
          businessName: tenant.businessName,
          businessCode: tenant.businessCode || null,
          businessType: tenant.businessType?.name || null,
          kybStatus: tenant.kybStatus,
          businessStructure: tenant.businessStructure,
          isHq: tenant.isHq,
          setupCompleted: tenant.setupCompleted,
        } : null,
        kyb: kyb ? {
          id: kyb.id,
          status: kyb.status,
          currentStep: kyb.currentStep,
          completionPercentage: kyb.completionPercentage,
          submittedAt: kyb.submittedAt,
          rejectionReason: kyb.rejectionReason,
          reviewNotes: kyb.reviewNotes,
          documentCount: kyb.documents?.length || 0,
        } : null,
        statusInfo,
      }
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    return res.status(500).json({ message: 'Failed to fetch onboarding status' });
  }
}
