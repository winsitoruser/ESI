import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

const getDb = () => require('../../../../models');

const defaultNotifications = {
  stock: {
    lowStockThreshold: 20,
    criticalStockThreshold: 5,
    notifyByEmail: true,
    notifyByWhatsapp: false,
    notifyByTelegram: false
  },
  sales: {
    salesTargetAlerts: true,
    dailyReportEmail: true,
    dailyReportTime: '07:00',
    reportRecipients: []
  },
  billing: {
    invoiceOverdue: true,
    invoiceDueReminderDays: [3, 1],
    paymentSuccess: true,
    paymentFailed: true
  },
  channels: {
    email: { enabled: true, fromName: 'Bedagang ERP', fromAddress: '' },
    whatsapp: { enabled: false, provider: 'whatsapp_business', phoneNumber: '' },
    telegram: { enabled: false, botToken: '', chatId: '' },
    slack: { enabled: false, webhookUrl: '' }
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  const StoreSetting = db.StoreSetting;

  if (req.method === 'GET') {
    let data = defaultNotifications;
    try {
      const row = await StoreSetting.findOne({ where: { key: 'notification_settings', scope: 'hq' } });
      if (row?.value) data = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch (_) {}
    return res.status(200).json({ success: true, data });
  }

  if (req.method === 'PUT') {
    const payload = req.body || {};
    try {
      await StoreSetting.upsert({
        key: 'notification_settings',
        scope: 'hq',
        value: JSON.stringify(payload),
        updated_at: new Date()
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
    return res.status(200).json({ success: true, data: payload });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default withHQAuth(handler, { module: 'settings' });
