import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { StoreSetting, Store, AuditLog } = getDb();

    if (req.method === 'GET') {
      // Get receipt design settings from database
      const defaultSettings = {
        // Header
        showLogo: true,
        logoUrl: '',
        logoSize: 'medium',
        storeName: '',
        storeNameSize: 16,
        showAddress: true,
        showPhone: true,
        showEmail: false,
        showWebsite: false,
        showSocialMedia: false,
        headerAlignment: 'center',
        
        // Transaction Info
        showTransactionId: true,
        showDate: true,
        showTime: true,
        showCashier: true,
        showCustomer: false,
        showTable: false,
        
        // Items
        showItemCode: false,
        showItemDiscount: true,
        itemNameWidth: 60,
        
        // Footer
        showSubtotal: true,
        showDiscount: true,
        showTax: true,
        showServiceCharge: false,
        showPaymentMethod: true,
        showChange: true,
        showThankyouMessage: true,
        thankyouMessage: 'Terima kasih atas kunjungan Anda!',
        showPromoMessage: false,
        promoMessage: 'Dapatkan diskon 10% untuk pembelian selanjutnya!',
        showQRCode: false,
        qrCodeContent: '',
        showBarcode: false,
        showSocialIcons: false,
        
        // Styling
        paperWidth: 80,
        fontFamily: 'monospace',
        fontSize: 12,
        lineSpacing: 1.4,
        borderStyle: 'dashed',
        accentColor: '#000000',
        
        // Template
        template: 'modern'
      };

      // Get user's store (assuming single store for now)
      const store = await Store.findOne({ where: { isActive: true } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Get all receipt settings
      const receiptSettings = {};
      const settings = await StoreSetting.findAll({
        where: {
          storeId: store.id,
          category: 'receipt_design'
        }
      });

      // Parse settings
      settings.forEach((setting: any) => {
        (receiptSettings as any)[setting.key] = setting.getParsedValue();
      });

      // Merge with defaults
      const finalSettings = { ...defaultSettings, ...receiptSettings };

      // Get header and footer lines
      const headerLines = (receiptSettings as any).headerLines || [
        { id: '1', text: '{STORE_NAME}', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#000000' },
        { id: '2', text: '{STORE_ADDRESS}', fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#666666' },
        { id: '3', text: 'Telp: {STORE_PHONE}', fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#666666' },
      ];

      const footerLines = (receiptSettings as any).footerLines || [
        { id: '1', text: '================================', fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#999999' },
        { id: '2', text: 'Terima kasih atas kunjungan Anda!', fontSize: 11, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#000000' },
        { id: '3', text: 'Barang yang sudah dibeli tidak dapat dikembalikan', fontSize: 9, fontWeight: 'normal', fontStyle: 'italic', textDecoration: 'none', alignment: 'center', color: '#666666' },
      ];

      return res.status(200).json({
        success: true,
        data: {
          settings: finalSettings,
          headerLines,
          footerLines,
          store: {
            name: store.name || 'NAMA TOKO',
            address: store.address || '',
            city: store.city || '',
            phone: store.phone || '',
            email: store.email || '',
            website: store.website || ''
          }
        }
      });

    } else if (req.method === 'POST') {
      // Accept settings object with nested structure
      const { settings: receiptSettings, headerLines, footerLines } = req.body;
      const settingsToSave = receiptSettings || {};
      
      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is empty' });
      }
      
      // All allowed fields for receipt design
      const allowedFields = [
        // Header
        'showLogo', 'logoUrl', 'logoSize', 'storeName', 'storeNameSize',
        'showAddress', 'showPhone', 'showEmail', 'showWebsite', 'showSocialMedia',
        'headerAlignment',
        // Transaction Info
        'showTransactionId', 'showDate', 'showTime', 'showCashier',
        'showCustomer', 'showTable',
        // Items
        'showItemCode', 'showItemDiscount', 'itemNameWidth',
        // Footer
        'showSubtotal', 'showDiscount', 'showTax', 'showServiceCharge',
        'showPaymentMethod', 'showChange', 'showThankyouMessage', 'thankyouMessage',
        'showPromoMessage', 'promoMessage', 'showQRCode', 'qrCodeContent',
        'showBarcode', 'showSocialIcons',
        // Styling
        'paperWidth', 'fontFamily', 'fontSize', 'lineSpacing', 'borderStyle',
        'accentColor',
        // Template
        'template'
      ];

      // Get user's store
      const store = await Store.findOne({ where: { isActive: true } });
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Save each setting (only allowed fields)
      for (const [key, value] of Object.entries(settingsToSave)) {
        if (!allowedFields.includes(key)) continue;
        let dataType = 'string';
        if (typeof value === 'boolean') dataType = 'boolean';
        else if (typeof value === 'number') dataType = 'number';
        else if (typeof value === 'object') dataType = 'json';

        await StoreSetting.setSetting(
          'receipt_design',
          key,
          value,
          dataType,
          null,
          store.id,
          `Receipt design setting: ${key}`
        );
      }

      // Save header lines if provided
      if (headerLines && Array.isArray(headerLines)) {
        await StoreSetting.setSetting(
          'receipt_design',
          'headerLines',
          headerLines,
          'json',
          null,
          store.id,
          'Custom header lines'
        );
      }

      // Save footer lines if provided
      if (footerLines && Array.isArray(footerLines)) {
        await StoreSetting.setSetting(
          'receipt_design',
          'footerLines',
          footerLines,
          'json',
          null,
          store.id,
          'Custom footer lines'
        );
      }

      // Log the change
      await AuditLog.create({
        userId: session.user?.id || '',
        action: 'UPDATE',
        entityType: 'StoreSetting',
        entityId: store.id,
        oldValues: {},
        newValues: settingsToSave,
        ipAddress: (req as any).ip || '',
        userAgent: req.headers['user-agent'],
        description: 'Updated receipt design settings'
      });

      return res.status(200).json({
        success: true,
        message: 'Receipt design settings saved successfully',
        data: settingsToSave
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in receipt design API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}
