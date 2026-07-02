import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const NotificationSetting = require('@/models/NotificationSetting');
const User = require('@/models/User');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ where: { email: session.user?.email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get notification settings
      const settings = await NotificationSetting.findOne({
        where: { userId: user.id }
      });

      if (!settings) {
        return res.status(200).json({
          success: true,
          data: {
            email: {
              newOrder: true,
              lowStock: true,
              dailyReport: false,
              weeklyReport: true,
              customerRegistration: true,
              paymentReceived: true
            },
            sms: {
              newOrder: false,
              lowStock: true,
              orderReady: false,
              paymentReminder: false
            },
            push: {
              newOrder: true,
              lowStock: true,
              systemAlert: true,
              updates: false
            },
            emailConfig: {
              smtpHost: '',
              smtpPort: '587',
              smtpUser: '',
              smtpPassword: '',
              fromEmail: '',
              fromName: ''
            }
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          email: settings.emailSettings || {},
          sms: settings.smsSettings || {},
          push: settings.pushSettings || {},
          emailConfig: settings.emailConfig || {}
        }
      });

    } else if (req.method === 'PUT') {
      // Update notification settings
      const { email, sms, push, emailConfig } = req.body;

      let settings = await NotificationSetting.findOne({
        where: { userId: user.id }
      });

      const dataToSave = {
        userId: user.id,
        emailSettings: email || {},
        smsSettings: sms || {},
        pushSettings: push || {},
        emailConfig: emailConfig || {}
      };

      if (settings) {
        await settings.update(dataToSave);
      } else {
        settings = await NotificationSetting.create(dataToSave);
      }

      return res.status(200).json({
        success: true,
        message: 'Notification settings updated successfully',
        data: settings
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in notification settings API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process notification settings',
      details: error.message
    });
  }
}
