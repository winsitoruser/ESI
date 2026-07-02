import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { PartnerIntegration, OutletIntegration, IntegrationLog } = db;
    const user = session.user as any;

    // Find integration
    let integration = await OutletIntegration.findByPk(id);
    if (!integration) {
      integration = await PartnerIntegration.findByPk(id);
    }

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const config = integration.configuration;
    let testResult: { success: boolean; message: string; details?: any } = {
      success: false,
      message: 'Test not implemented for this provider'
    };

    // Test based on provider
    switch (integration.provider) {
      case 'midtrans':
        testResult = await testMidtrans(config);
        break;
      case 'xendit':
        testResult = await testXendit(config);
        break;
      case 'twilio':
        testResult = await testTwilio(config);
        break;
      case 'wablas':
        testResult = await testWablas(config);
        break;
      case 'fonnte':
        testResult = await testFonnte(config);
        break;
      case 'smtp':
      case 'mailgun':
      case 'sendgrid':
        testResult = await testEmail(config, integration.provider);
        break;
      default:
        testResult = { success: true, message: 'Provider accepted (no test available)' };
    }

    // Update integration status
    await integration.update({
      status: testResult.success ? 'active' : 'failed',
      lastTestedAt: new Date(),
      lastTestResult: testResult
    });

    // Log the test
    await IntegrationLog.create({
      integrationId: integration.id,
      action: 'test',
      status: testResult.success ? 'success' : 'failed',
      message: testResult.message,
      responseData: testResult.details
    });

    return res.status(200).json({
      success: testResult.success,
      message: testResult.message,
      data: testResult.details
    });
  } catch (error: any) {
    console.error('Integration Test API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function testMidtrans(config: any) {
  try {
    const auth = Buffer.from(`${config.serverKey}:`).toString('base64');
    const baseUrl = config.isProduction 
      ? 'https://api.midtrans.com' 
      : 'https://api.sandbox.midtrans.com';

    const response = await fetch(`${baseUrl}/v2/token`, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` }
    });

    return {
      success: response.status !== 401,
      message: response.status === 401 ? 'Invalid Server Key' : 'Midtrans connection successful',
      details: { status: response.status }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function testXendit(config: any) {
  try {
    const auth = Buffer.from(`${config.secretKey}:`).toString('base64');
    const response = await fetch('https://api.xendit.co/balance', {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Xendit connection successful',
        details: { balance: data.balance }
      };
    }
    return { success: false, message: 'Invalid API Key' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function testTwilio(config: any) {
  try {
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`,
      { headers: { 'Authorization': `Basic ${auth}` } }
    );

    return {
      success: response.ok,
      message: response.ok ? 'Twilio connection successful' : 'Invalid credentials'
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function testWablas(config: any) {
  try {
    const response = await fetch(`${config.domain}/api/device/info`, {
      headers: { 'Authorization': config.token }
    });

    const data = await response.json();
    return {
      success: data.status === true,
      message: data.status ? 'Wablas connection successful' : 'Connection failed',
      details: data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function testFonnte(config: any) {
  try {
    const response = await fetch('https://api.fonnte.com/device', {
      headers: { 'Authorization': config.token }
    });

    const data = await response.json();
    return {
      success: data.status === true,
      message: data.status ? 'Fonnte connection successful' : 'Connection failed',
      details: data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

async function testEmail(config: any, provider: string) {
  try {
    const nodemailer = require('nodemailer');
    
    let transportConfig: any;
    
    if (provider === 'smtp') {
      transportConfig = {
        host: config.host,
        port: parseInt(config.port),
        secure: config.port === '465',
        auth: { user: config.username, pass: config.password }
      };
    } else if (provider === 'mailgun') {
      transportConfig = {
        host: 'smtp.mailgun.org',
        port: 587,
        auth: { user: config.username, pass: config.apiKey }
      };
    } else if (provider === 'sendgrid') {
      transportConfig = {
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: { user: 'apikey', pass: config.apiKey }
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);
    await transporter.verify();

    return { success: true, message: 'Email connection successful' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
