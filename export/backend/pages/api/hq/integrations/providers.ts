import type { NextApiRequest, NextApiResponse } from 'next';

// Mock integration providers data
const mockProviders = [
  // Payment Gateways
  {
    id: 'pg-001',
    code: 'midtrans',
    name: 'Midtrans',
    category: 'payment_gateway',
    subcategory: 'full_service',
    description: 'Payment gateway lengkap dengan dukungan QRIS, Virtual Account, E-Wallet, Kartu Kredit/Debit, dan lainnya.',
    logo: '/images/integrations/midtrans.png',
    website: 'https://midtrans.com',
    documentationUrl: 'https://docs.midtrans.com',
    apiBaseUrl: 'https://api.midtrans.com',
    sandboxApiUrl: 'https://api.sandbox.midtrans.com',
    requiredCredentials: [
      { key: 'server_key', label: 'Server Key', type: 'password', required: true, encrypted: true },
      { key: 'client_key', label: 'Client Key', type: 'text', required: true, encrypted: false },
      { key: 'merchant_id', label: 'Merchant ID', type: 'text', required: true, encrypted: false }
    ],
    webhookSupported: true,
    webhookEvents: ['payment.success', 'payment.pending', 'payment.failed', 'payment.expired', 'refund.success'],
    features: ['QRIS', 'Virtual Account', 'E-Wallet (GoPay, OVO, DANA, ShopeePay)', 'Kartu Kredit/Debit', 'Alfamart/Indomaret', 'Akulaku'],
    pricing: { mdr: '0.7% - 2.9%', setupFee: 'Gratis', monthlyFee: 'Gratis' },
    requiresApproval: true,
    applicationFields: [
      { key: 'business_name', label: 'Nama Bisnis', type: 'text', required: true },
      { key: 'business_type', label: 'Jenis Usaha', type: 'select', options: ['PT', 'CV', 'UD', 'Perorangan'], required: true },
      { key: 'npwp', label: 'NPWP', type: 'text', required: true },
      { key: 'ktp', label: 'KTP Pemilik', type: 'file', required: true },
      { key: 'siup', label: 'SIUP/NIB', type: 'file', required: true },
      { key: 'bank_account', label: 'Rekening Bank', type: 'text', required: true },
      { key: 'bank_name', label: 'Nama Bank', type: 'select', options: ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB'], required: true }
    ],
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'pg-002',
    code: 'xendit',
    name: 'Xendit',
    category: 'payment_gateway',
    subcategory: 'full_service',
    description: 'Platform pembayaran modern dengan API yang mudah diintegrasikan untuk berbagai metode pembayaran.',
    logo: '/images/integrations/xendit.png',
    website: 'https://xendit.co',
    documentationUrl: 'https://developers.xendit.co',
    apiBaseUrl: 'https://api.xendit.co',
    sandboxApiUrl: 'https://api.xendit.co',
    requiredCredentials: [
      { key: 'secret_key', label: 'Secret API Key', type: 'password', required: true, encrypted: true },
      { key: 'public_key', label: 'Public API Key', type: 'text', required: false, encrypted: false },
      { key: 'webhook_token', label: 'Webhook Verification Token', type: 'password', required: false, encrypted: true }
    ],
    webhookSupported: true,
    webhookEvents: ['invoice.paid', 'invoice.expired', 'ewallet.payment', 'qr_code.payment', 'va.payment'],
    features: ['QRIS', 'Virtual Account', 'E-Wallet', 'Retail Outlet', 'Direct Debit', 'Credit Card'],
    pricing: { mdr: '0.7% - 2.9%', setupFee: 'Gratis', monthlyFee: 'Gratis' },
    requiresApproval: true,
    applicationFields: [
      { key: 'business_name', label: 'Nama Bisnis', type: 'text', required: true },
      { key: 'business_type', label: 'Jenis Usaha', type: 'select', options: ['PT', 'CV', 'UD', 'Perorangan'], required: true },
      { key: 'email', label: 'Email Bisnis', type: 'email', required: true },
      { key: 'phone', label: 'Nomor Telepon', type: 'tel', required: true },
      { key: 'address', label: 'Alamat Bisnis', type: 'textarea', required: true }
    ],
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'pg-003',
    code: 'doku',
    name: 'DOKU',
    category: 'payment_gateway',
    subcategory: 'full_service',
    description: 'Payment gateway tertua di Indonesia dengan jaringan merchant yang luas.',
    logo: '/images/integrations/doku.png',
    website: 'https://doku.com',
    documentationUrl: 'https://dashboard.doku.com/docs',
    features: ['QRIS', 'Virtual Account', 'E-Wallet', 'Credit Card', 'Debit Card'],
    requiresApproval: true,
    isActive: true,
    sortOrder: 3
  },
  {
    id: 'pg-004',
    code: 'ipay88',
    name: 'iPay88',
    category: 'payment_gateway',
    subcategory: 'full_service',
    description: 'Payment gateway dengan coverage regional Asia Tenggara.',
    logo: '/images/integrations/ipay88.png',
    website: 'https://ipay88.co.id',
    features: ['Credit Card', 'Online Banking', 'E-Wallet'],
    requiresApproval: true,
    isActive: true,
    sortOrder: 4
  },
  // QRIS Specific
  {
    id: 'qris-001',
    code: 'qris_bi',
    name: 'QRIS Bank Indonesia',
    category: 'payment_gateway',
    subcategory: 'qris',
    description: 'Daftar QRIS resmi melalui bank atau PSP yang terdaftar di Bank Indonesia.',
    logo: '/images/integrations/qris.png',
    features: ['QRIS Static', 'QRIS Dynamic', 'Multi-merchant'],
    requiresApproval: true,
    applicationFields: [
      { key: 'merchant_name', label: 'Nama Merchant', type: 'text', required: true },
      { key: 'merchant_category', label: 'Kategori Merchant (MCC)', type: 'select', required: true },
      { key: 'npwp', label: 'NPWP', type: 'text', required: true },
      { key: 'nik', label: 'NIK Pemilik', type: 'text', required: true },
      { key: 'bank_account', label: 'Rekening Settlement', type: 'text', required: true }
    ],
    isActive: true,
    sortOrder: 5
  },
  // Messaging - WhatsApp
  {
    id: 'msg-001',
    code: 'whatsapp_cloud',
    name: 'WhatsApp Business Cloud API',
    category: 'messaging',
    subcategory: 'whatsapp',
    description: 'Official WhatsApp Business API untuk mengirim notifikasi, OTP, dan customer service.',
    logo: '/images/integrations/whatsapp.png',
    website: 'https://business.whatsapp.com',
    documentationUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    apiBaseUrl: 'https://graph.facebook.com',
    requiredCredentials: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true, encrypted: false },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, encrypted: true },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', required: true, encrypted: false },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'password', required: false, encrypted: true }
    ],
    webhookSupported: true,
    webhookEvents: ['message.received', 'message.delivered', 'message.read', 'message.failed'],
    features: ['Template Messages', 'Session Messages', 'Media Messages', 'Interactive Messages', 'Catalog'],
    pricing: { perMessage: '$0.005 - $0.08', setupFee: 'Gratis' },
    requiresApproval: true,
    applicationFields: [
      { key: 'business_name', label: 'Nama Bisnis', type: 'text', required: true },
      { key: 'phone_number', label: 'Nomor WhatsApp', type: 'tel', required: true },
      { key: 'business_description', label: 'Deskripsi Bisnis', type: 'textarea', required: true },
      { key: 'website', label: 'Website', type: 'url', required: false },
      { key: 'industry', label: 'Industri', type: 'select', options: ['Retail', 'F&B', 'Healthcare', 'Education', 'Other'], required: true }
    ],
    isActive: true,
    sortOrder: 10
  },
  {
    id: 'msg-002',
    code: 'whatsapp_wablas',
    name: 'Wablas (WhatsApp Gateway)',
    category: 'messaging',
    subcategory: 'whatsapp',
    description: 'WhatsApp Gateway Indonesia untuk pengiriman pesan massal dan otomatis.',
    logo: '/images/integrations/wablas.png',
    website: 'https://wablas.com',
    documentationUrl: 'https://wablas.com/documentation',
    apiBaseUrl: 'https://console.wablas.com/api',
    requiredCredentials: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, encrypted: true },
      { key: 'sender', label: 'Nomor Pengirim', type: 'tel', required: true, encrypted: false }
    ],
    features: ['Text Messages', 'Image Messages', 'Document Messages', 'Broadcast', 'Auto Reply'],
    pricing: { perMessage: 'Rp 50 - Rp 100' },
    requiresApproval: false,
    isActive: true,
    sortOrder: 11
  },
  // Telegram
  {
    id: 'msg-003',
    code: 'telegram_bot',
    name: 'Telegram Bot API',
    category: 'messaging',
    subcategory: 'telegram',
    description: 'Telegram Bot untuk notifikasi dan customer service otomatis.',
    logo: '/images/integrations/telegram.png',
    website: 'https://telegram.org',
    documentationUrl: 'https://core.telegram.org/bots/api',
    apiBaseUrl: 'https://api.telegram.org',
    requiredCredentials: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true, encrypted: true },
      { key: 'chat_id', label: 'Default Chat ID', type: 'text', required: false, encrypted: false }
    ],
    webhookSupported: true,
    webhookEvents: ['message', 'callback_query', 'inline_query'],
    features: ['Text Messages', 'Media Messages', 'Inline Keyboards', 'Commands', 'Groups & Channels'],
    pricing: { perMessage: 'Gratis' },
    requiresApproval: false,
    isActive: true,
    sortOrder: 12
  },
  // Email
  {
    id: 'email-001',
    code: 'smtp',
    name: 'SMTP Email',
    category: 'email',
    subcategory: 'smtp',
    description: 'Konfigurasi SMTP untuk pengiriman email transaksional.',
    logo: '/images/integrations/email.png',
    requiredCredentials: [
      { key: 'host', label: 'SMTP Host', type: 'text', required: true, encrypted: false },
      { key: 'port', label: 'SMTP Port', type: 'number', required: true, encrypted: false },
      { key: 'username', label: 'Username', type: 'text', required: true, encrypted: false },
      { key: 'password', label: 'Password', type: 'password', required: true, encrypted: true },
      { key: 'from_email', label: 'From Email', type: 'email', required: true, encrypted: false },
      { key: 'from_name', label: 'From Name', type: 'text', required: true, encrypted: false },
      { key: 'encryption', label: 'Encryption', type: 'select', options: ['none', 'ssl', 'tls'], required: true }
    ],
    features: ['Transactional Email', 'HTML Email', 'Attachments'],
    requiresApproval: false,
    isActive: true,
    sortOrder: 20
  },
  {
    id: 'email-002',
    code: 'sendgrid',
    name: 'SendGrid',
    category: 'email',
    subcategory: 'transactional',
    description: 'Platform email cloud untuk pengiriman email transaksional dan marketing.',
    logo: '/images/integrations/sendgrid.png',
    website: 'https://sendgrid.com',
    documentationUrl: 'https://docs.sendgrid.com',
    apiBaseUrl: 'https://api.sendgrid.com',
    requiredCredentials: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, encrypted: true },
      { key: 'from_email', label: 'From Email', type: 'email', required: true, encrypted: false },
      { key: 'from_name', label: 'From Name', type: 'text', required: true, encrypted: false }
    ],
    webhookSupported: true,
    webhookEvents: ['delivered', 'opened', 'clicked', 'bounced', 'spam_report'],
    features: ['Transactional Email', 'Email Templates', 'Analytics', 'Webhooks'],
    pricing: { free: '100 emails/day', paid: 'Starting $14.95/month' },
    requiresApproval: false,
    isActive: true,
    sortOrder: 21
  },
  {
    id: 'email-003',
    code: 'mailgun',
    name: 'Mailgun',
    category: 'email',
    subcategory: 'transactional',
    description: 'Email API service untuk developer dengan deliverability tinggi.',
    logo: '/images/integrations/mailgun.png',
    website: 'https://mailgun.com',
    documentationUrl: 'https://documentation.mailgun.com',
    requiredCredentials: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, encrypted: true },
      { key: 'domain', label: 'Domain', type: 'text', required: true, encrypted: false },
      { key: 'from_email', label: 'From Email', type: 'email', required: true, encrypted: false }
    ],
    features: ['Transactional Email', 'Email Validation', 'Analytics', 'Templates'],
    requiresApproval: false,
    isActive: true,
    sortOrder: 22
  },
  // Delivery
  {
    id: 'del-001',
    code: 'gojek',
    name: 'GoSend (Gojek)',
    category: 'delivery',
    subcategory: 'instant',
    description: 'Layanan pengiriman instant dan same-day dari Gojek.',
    logo: '/images/integrations/gojek.png',
    website: 'https://www.gojek.com/business',
    features: ['Instant Delivery', 'Same Day', 'Tracking'],
    requiresApproval: true,
    isActive: true,
    sortOrder: 30
  },
  {
    id: 'del-002',
    code: 'grab',
    name: 'GrabExpress',
    category: 'delivery',
    subcategory: 'instant',
    description: 'Layanan pengiriman dari Grab untuk bisnis.',
    logo: '/images/integrations/grab.png',
    website: 'https://www.grab.com/id/business',
    features: ['Instant Delivery', 'Same Day', 'Multi-stop'],
    requiresApproval: true,
    isActive: true,
    sortOrder: 31
  },
  // Accounting
  {
    id: 'acc-001',
    code: 'jurnal',
    name: 'Jurnal by Mekari',
    category: 'accounting',
    subcategory: 'accounting_software',
    description: 'Software akuntansi online untuk sinkronisasi data keuangan.',
    logo: '/images/integrations/jurnal.png',
    website: 'https://jurnal.id',
    documentationUrl: 'https://api.jurnal.id/docs',
    requiredCredentials: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, encrypted: true },
      { key: 'company_id', label: 'Company ID', type: 'text', required: true, encrypted: false }
    ],
    features: ['Sync Transactions', 'Sync Invoices', 'Sync Inventory', 'Financial Reports'],
    requiresApproval: false,
    isActive: true,
    sortOrder: 40
  },
  {
    id: 'acc-002',
    code: 'accurate',
    name: 'Accurate Online',
    category: 'accounting',
    subcategory: 'accounting_software',
    description: 'Software akuntansi Indonesia untuk integrasi laporan keuangan.',
    logo: '/images/integrations/accurate.png',
    website: 'https://accurate.id',
    features: ['Sync Transactions', 'Sync Invoices', 'Chart of Accounts'],
    requiresApproval: false,
    isActive: true,
    sortOrder: 41
  },
  // Marketplace
  {
    id: 'mp-001',
    code: 'tokopedia',
    name: 'Tokopedia',
    category: 'marketplace',
    subcategory: 'ecommerce',
    description: 'Integrasi dengan Tokopedia untuk sinkronisasi produk dan pesanan.',
    logo: '/images/integrations/tokopedia.png',
    website: 'https://seller.tokopedia.com',
    documentationUrl: 'https://developer.tokopedia.com',
    features: ['Product Sync', 'Order Sync', 'Stock Sync', 'Price Sync'],
    requiresApproval: true,
    isActive: true,
    sortOrder: 50
  },
  {
    id: 'mp-002',
    code: 'shopee',
    name: 'Shopee',
    category: 'marketplace',
    subcategory: 'ecommerce',
    description: 'Integrasi dengan Shopee untuk manajemen toko online.',
    logo: '/images/integrations/shopee.png',
    website: 'https://seller.shopee.co.id',
    documentationUrl: 'https://open.shopee.com',
    features: ['Product Sync', 'Order Sync', 'Stock Sync', 'Promotion Sync'],
    requiresApproval: true,
    isActive: true,
    sortOrder: 51
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { category, search, requiresApproval } = req.query;

    let providers = [...mockProviders];

    // Filter by category
    if (category && category !== 'all') {
      providers = providers.filter(p => p.category === category);
    }

    // Filter by search
    if (search) {
      const searchLower = (search as string).toLowerCase();
      providers = providers.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
      );
    }

    // Filter by requiresApproval
    if (requiresApproval !== undefined) {
      providers = providers.filter(p => p.requiresApproval === (requiresApproval === 'true'));
    }

    // Sort by sortOrder
    providers.sort((a, b) => a.sortOrder - b.sortOrder);

    // Group by category for summary
    const categories = {
      payment_gateway: { label: 'Payment Gateway', count: mockProviders.filter(p => p.category === 'payment_gateway').length },
      messaging: { label: 'Messaging', count: mockProviders.filter(p => p.category === 'messaging').length },
      email: { label: 'Email', count: mockProviders.filter(p => p.category === 'email').length },
      delivery: { label: 'Delivery', count: mockProviders.filter(p => p.category === 'delivery').length },
      accounting: { label: 'Accounting', count: mockProviders.filter(p => p.category === 'accounting').length },
      marketplace: { label: 'Marketplace', count: mockProviders.filter(p => p.category === 'marketplace').length }
    };

    return res.status(200).json({
      providers,
      categories,
      total: providers.length
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
