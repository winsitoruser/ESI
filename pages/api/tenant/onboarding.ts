import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { step } = req.body;

    if (typeof step !== 'number' || step < 0) {
      return res.status(400).json({ error: 'Invalid step number' });
    }

    const { User, Tenant } = db;

    // Get user's tenant
    const user = await User.findOne({
      where: { email: session.user.email }
    });

    if (!user || !user.tenantId) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Update onboarding step
    await Tenant.update(
      { onboardingStep: step },
      { where: { id: user.tenantId } }
    );

    return res.status(200).json({
      success: true,
      message: 'Onboarding step updated',
      step
    });

  } catch (error: any) {
    console.error('Onboarding update API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
