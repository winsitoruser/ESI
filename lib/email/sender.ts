/**
 * Email Sender Service
 * Handles sending emails via SMTP or email service provider
 */

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function smtpPassword(): string {
  return String(process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').trim();
}

export function isSmtpConfigured(): boolean {
  return Boolean(String(process.env.SMTP_USER || '').trim() && smtpPassword());
}

function smtpPort(): number {
  return parseInt(process.env.SMTP_PORT || '587', 10) || 587;
}

/** Port 465 is implicit TLS; only skip SSL if SMTP_SECURE is explicitly false. */
function smtpSecure(port: number): boolean {
  const raw = String(process.env.SMTP_SECURE || '').toLowerCase();
  if (raw === 'false' || raw === '0') return false;
  if (raw === 'true' || raw === '1') return true;
  return port === 465;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!isSmtpConfigured()) {
      console.warn('[email] SMTP_USER/SMTP_PASSWORD missing — skip send');
      return false;
    }
    const port = smtpPort();
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: smtpSecure(port),
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPassword(),
      }
    });

    // Send email
    const fromName = process.env.SMTP_FROM_NAME || 'Humanify';
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@humanify.id';
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || options.subject,
      html: options.html
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendWelcomeEmail(data: {
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
  tenantName: string;
  businessType: string;
}): Promise<boolean> {
  const { generateWelcomeEmail } = await import('./templates');
  
  const loginUrl = `${process.env.NEXTAUTH_URL || 'https://humanify.id'}/humanify/login`;
  const emailContent = generateWelcomeEmail({
    ...data,
    loginUrl,
  });

  return sendEmail({
    to: data.ownerEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  });
}

export async function sendOnboardingReminder(data: {
  ownerName: string;
  ownerEmail: string;
  tenantName: string;
  currentStep: number;
  totalSteps: number;
}): Promise<boolean> {
  const { generateOnboardingReminder } = await import('./templates');
  
  const emailContent = generateOnboardingReminder({
    ...data,
    continueUrl: `${process.env.NEXTAUTH_URL || 'https://humanify.id'}/humanify/setup`
  });

  return sendEmail({
    to: data.ownerEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  });
}
