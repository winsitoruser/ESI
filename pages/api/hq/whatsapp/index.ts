import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return getWhatsAppDashboard(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getWhatsAppDashboard(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    success: true,
    data: {
      isConnected: false,
      phoneNumber: null,
      businessName: null,
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        broadcastsSent: 0,
        autoReplies: 0,
        activeTemplates: 0
      },
      recentMessages: [],
      templates: [
        { id: '1', name: 'Konfirmasi Order', type: 'order_confirmation', status: 'approved', language: 'id' },
        { id: '2', name: 'Reminder Pembayaran', type: 'payment_reminder', status: 'approved', language: 'id' },
        { id: '3', name: 'Status Pengiriman', type: 'delivery_status', status: 'pending', language: 'id' },
        { id: '4', name: 'Promo Broadcast', type: 'promotion', status: 'approved', language: 'id' },
      ],
      setupSteps: [
        { step: 1, title: 'Daftarkan Nomor WhatsApp Business', completed: false },
        { step: 2, title: 'Verifikasi Bisnis di Meta', completed: false },
        { step: 3, title: 'Setup Template Pesan', completed: false },
        { step: 4, title: 'Konfigurasi Auto-Reply', completed: false },
        { step: 5, title: 'Test Pengiriman Pesan', completed: false },
      ]
    }
  });
}
