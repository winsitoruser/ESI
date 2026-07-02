import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { PartnerIntegration, IntegrationLog } = db;
    const { partnerId, phone, message, templateId, variables } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    // Get WhatsApp integration for partner
    const integration = await PartnerIntegration.findOne({
      where: {
        partnerId,
        integrationType: 'whatsapp',
        isActive: true
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'WhatsApp integration not configured' });
    }

    const config = integration.configuration;
    let result;

    switch (integration.provider) {
      case 'twilio':
        result = await sendViaTwilio(config, phone, message);
        break;
      case 'wablas':
        result = await sendViaWablas(config, phone, message);
        break;
      case 'fonnte':
        result = await sendViaFonnte(config, phone, message);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported WhatsApp provider' });
    }

    // Log the send attempt
    await IntegrationLog.create({
      integrationId: integration.id,
      action: 'transaction',
      status: result.success ? 'success' : 'failed',
      message: result.message,
      requestData: { phone, message: message.substring(0, 100) },
      responseData: result.data
    });

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error: any) {
    console.error('WhatsApp Send API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function sendViaTwilio(config: any, phone: string, message: string) {
  try {
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: `whatsapp:${config.phoneNumber}`,
          To: `whatsapp:${phone}`,
          Body: message
        })
      }
    );

    const data = await response.json();
    
    return {
      success: response.ok,
      message: response.ok ? 'Message sent successfully' : data.message,
      data
    };
  } catch (error: any) {
    return { success: false, message: error.message, data: null };
  }
}

async function sendViaWablas(config: any, phone: string, message: string) {
  try {
    const response = await fetch(`${config.domain}/api/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, message })
    });

    const data = await response.json();
    
    return {
      success: data.status === true,
      message: data.message || 'Message sent',
      data
    };
  } catch (error: any) {
    return { success: false, message: error.message, data: null };
  }
}

async function sendViaFonnte(config: any, phone: string, message: string) {
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': config.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: phone,
        message,
        countryCode: '62'
      })
    });

    const data = await response.json();
    
    return {
      success: data.status === true,
      message: data.reason || 'Message sent',
      data
    };
  } catch (error: any) {
    return { success: false, message: error.message, data: null };
  }
}
