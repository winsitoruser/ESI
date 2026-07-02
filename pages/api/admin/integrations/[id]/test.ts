import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { PartnerIntegration } = db;

/**
 * POST /api/admin/integrations/:id/test - Test integration connection
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = (session?.user?.role as string)?.toLowerCase();
    
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    const integration = await PartnerIntegration.findByPk(id);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Test connection based on integration type
    let testResult;
    
    switch (integration.integrationType) {
      case 'payment_gateway':
        testResult = await testPaymentGateway(integration);
        break;
      case 'whatsapp':
        testResult = await testWhatsApp(integration);
        break;
      case 'email_smtp':
        testResult = await testEmailSMTP(integration);
        break;
      default:
        return res.status(400).json({ error: 'Unknown integration type' });
    }

    // Update integration with test results
    await integration.update({
      lastTestedAt: new Date(),
      lastTestStatus: testResult.status,
      lastTestMessage: testResult.message
    });

    return res.status(200).json({
      success: testResult.status === 'success',
      data: {
        status: testResult.status,
        message: testResult.message,
        details: testResult.details,
        testedAt: new Date()
      }
    });
  } catch (error: any) {
    console.error('Integration Test API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function testPaymentGateway(integration: any) {
  const { provider, configuration, testMode } = integration;

  try {
    switch (provider) {
      case 'midtrans':
        return await testMidtrans(configuration, testMode);
      case 'xendit':
        return await testXendit(configuration, testMode);
      case 'stripe':
        return await testStripe(configuration, testMode);
      default:
        return {
          status: 'failed',
          message: `Provider ${provider} not supported`,
          details: null
        };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: error.message,
      details: error
    };
  }
}

async function testMidtrans(config: any, testMode: boolean) {
  const baseUrl = testMode 
    ? 'https://api.sandbox.midtrans.com'
    : 'https://api.midtrans.com';

  try {
    const auth = Buffer.from(config.serverKey + ':').toString('base64');
    const response = await fetch(`${baseUrl}/v2/ping`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return {
        status: 'success',
        message: 'Midtrans connection successful',
        details: { environment: testMode ? 'sandbox' : 'production' }
      };
    } else {
      const error = await response.json();
      return {
        status: 'failed',
        message: 'Midtrans authentication failed',
        details: error
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: 'Failed to connect to Midtrans',
      details: error.message
    };
  }
}

async function testXendit(config: any, testMode: boolean) {
  const baseUrl = 'https://api.xendit.co';

  try {
    const auth = Buffer.from(config.apiKey + ':').toString('base64');
    const response = await fetch(`${baseUrl}/balance`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'success',
        message: 'Xendit connection successful',
        details: { balance: data.balance }
      };
    } else {
      return {
        status: 'failed',
        message: 'Xendit authentication failed',
        details: await response.json()
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: 'Failed to connect to Xendit',
      details: error.message
    };
  }
}

async function testStripe(config: any, testMode: boolean) {
  try {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${config.secretKey}`
      }
    });

    if (response.ok) {
      return {
        status: 'success',
        message: 'Stripe connection successful',
        details: { environment: testMode ? 'test' : 'live' }
      };
    } else {
      return {
        status: 'failed',
        message: 'Stripe authentication failed',
        details: await response.json()
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: 'Failed to connect to Stripe',
      details: error.message
    };
  }
}

async function testWhatsApp(integration: any) {
  const { provider, configuration } = integration;

  try {
    switch (provider) {
      case 'twilio':
        return await testTwilio(configuration);
      case 'wablas':
        return await testWablas(configuration);
      case 'fonnte':
        return await testFonnte(configuration);
      default:
        return {
          status: 'failed',
          message: `Provider ${provider} not supported`,
          details: null
        };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: error.message,
      details: error
    };
  }
}

async function testTwilio(config: any) {
  try {
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'success',
        message: 'Twilio connection successful',
        details: { accountStatus: data.status }
      };
    } else {
      return {
        status: 'failed',
        message: 'Twilio authentication failed',
        details: await response.json()
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: 'Failed to connect to Twilio',
      details: error.message
    };
  }
}

async function testWablas(config: any) {
  try {
    const response = await fetch(`${config.domain}/api/device/status`, {
      headers: {
        'Authorization': config.token
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'success',
        message: 'Wablas connection successful',
        details: data
      };
    } else {
      return {
        status: 'failed',
        message: 'Wablas authentication failed',
        details: await response.json()
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: 'Failed to connect to Wablas',
      details: error.message
    };
  }
}

async function testFonnte(config: any) {
  try {
    const response = await fetch('https://api.fonnte.com/device', {
      headers: {
        'Authorization': config.token
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        status: 'success',
        message: 'Fonnte connection successful',
        details: data
      };
    } else {
      return {
        status: 'failed',
        message: 'Fonnte authentication failed',
        details: await response.json()
      };
    }
  } catch (error: any) {
    return {
      status: 'failed',
      message: 'Failed to connect to Fonnte',
      details: error.message
    };
  }
}

async function testEmailSMTP(integration: any) {
  const { provider, configuration } = integration;

  try {
    // For SMTP testing, we'll do a basic validation
    // In production, you'd use nodemailer to actually test the connection
    if (!configuration.host || !configuration.port || !configuration.username || !configuration.password) {
      return {
        status: 'failed',
        message: 'Missing required SMTP configuration',
        details: null
      };
    }

    // Simulate SMTP test (in production, use nodemailer)
    return {
      status: 'success',
      message: 'SMTP configuration validated',
      details: {
        host: configuration.host,
        port: configuration.port,
        secure: configuration.port === 465
      }
    };
  } catch (error: any) {
    return {
      status: 'failed',
      message: error.message,
      details: error
    };
  }
}
