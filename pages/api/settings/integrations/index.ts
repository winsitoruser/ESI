import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { PartnerIntegration, OutletIntegration, Partner, Outlet } = db;
    const user = session.user as any;
    const partnerId = user.partnerId;
    const outletId = user.outletId;

    switch (req.method) {
      case 'GET':
        // Get integrations based on user context (partner or outlet)
        let integrations: any[] = [];

        if (outletId) {
          // Get outlet-specific integrations
          integrations = await OutletIntegration.findAll({
            where: { outletId, isActive: true },
            include: [{ model: Outlet, as: 'outlet', attributes: ['id', 'name'] }],
            order: [['integrationType', 'ASC']]
          });

          // Also get partner integrations that outlet can use
          const outlet = await Outlet.findByPk(outletId);
          if (outlet?.partnerId) {
            const partnerIntegrations = await PartnerIntegration.findAll({
              where: { partnerId: outlet.partnerId, isActive: true }
            });
            
            // Mark which ones are from partner
            partnerIntegrations.forEach((pi: any) => {
              const existing = integrations.find((i: any) => i.integrationType === pi.integrationType);
              if (!existing) {
                integrations.push({
                  ...pi.toJSON(),
                  source: 'partner',
                  canOverride: true
                });
              }
            });
          }
        } else if (partnerId) {
          // Get partner integrations
          integrations = await PartnerIntegration.findAll({
            where: { partnerId, isActive: true },
            include: [{ model: Partner, as: 'partner', attributes: ['id', 'companyName'] }],
            order: [['integrationType', 'ASC']]
          });
        }

        // Group by type
        const grouped = {
          payment_gateway: integrations.filter((i: any) => i.integrationType === 'payment_gateway'),
          whatsapp: integrations.filter((i: any) => i.integrationType === 'whatsapp'),
          email_smtp: integrations.filter((i: any) => i.integrationType === 'email_smtp'),
          other: integrations.filter((i: any) => 
            !['payment_gateway', 'whatsapp', 'email_smtp'].includes(i.integrationType)
          )
        };

        return res.status(200).json({
          success: true,
          data: {
            integrations,
            grouped,
            context: outletId ? 'outlet' : 'partner'
          }
        });

      case 'POST':
        const { integrationType, provider, configuration, name } = req.body;

        if (!integrationType || !provider) {
          return res.status(400).json({ error: 'Integration type and provider are required' });
        }

        let newIntegration;

        if (outletId) {
          // Create outlet integration
          newIntegration = await OutletIntegration.create({
            outletId,
            integrationType,
            provider,
            name: name || `${provider} Integration`,
            configuration: configuration || {},
            isActive: true,
            status: 'pending',
            createdBy: user.id
          });
        } else if (partnerId) {
          // Create partner integration
          newIntegration = await PartnerIntegration.create({
            partnerId,
            integrationType,
            provider,
            name: name || `${provider} Integration`,
            configuration: configuration || {},
            isActive: true,
            status: 'pending',
            createdBy: user.id
          });
        } else {
          return res.status(400).json({ error: 'No partner or outlet context found' });
        }

        return res.status(201).json({
          success: true,
          message: 'Integration created',
          data: newIntegration
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Settings Integrations API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
