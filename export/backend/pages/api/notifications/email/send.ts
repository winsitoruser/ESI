import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const nodemailer = require('nodemailer');

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
    const { partnerId, to, subject, html, text, template, variables } = req.body;

    if (!to || (!html && !text && !template)) {
      return res.status(400).json({ error: 'Recipient and content are required' });
    }

    // Get SMTP integration for partner
    const integration = await PartnerIntegration.findOne({
      where: {
        partnerId,
        integrationType: 'email_smtp',
        isActive: true
      }
    });

    if (!integration) {
      return res.status(404).json({ error: 'Email SMTP integration not configured' });
    }

    const config = integration.configuration;
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port),
      secure: config.port === '465',
      auth: {
        user: config.username,
        pass: config.password
      }
    });

    // Process template if provided
    let emailHtml = html;
    let emailText = text;
    
    if (template && variables) {
      emailHtml = processTemplate(template, variables);
    }

    // Send email
    const mailOptions = {
      from: `"${config.fromName || 'Bedagang POS'}" <${config.fromEmail}>`,
      to,
      subject,
      html: emailHtml,
      text: emailText
    };

    const info = await transporter.sendMail(mailOptions);

    // Log the send attempt
    await IntegrationLog.create({
      integrationId: integration.id,
      action: 'transaction',
      status: 'success',
      message: `Email sent to ${to}`,
      requestData: { to, subject },
      responseData: { messageId: info.messageId }
    });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: { messageId: info.messageId }
    });
  } catch (error: any) {
    console.error('Email Send API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function processTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}
