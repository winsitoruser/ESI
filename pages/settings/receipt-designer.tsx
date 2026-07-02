import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FaReceipt, FaSave, FaArrowLeft, FaPrint, FaImage, FaFont, FaPalette,
  FaAlignLeft, FaAlignCenter, FaAlignRight, FaUndo, FaRedo, FaEye,
  FaDownload, FaCog, FaMagic, FaQrcode, FaBarcode, FaCopy, FaCheck,
  FaMobile, FaDesktop, FaExpand, FaCompress, FaBold, FaItalic, FaUnderline,
  FaListUl, FaListOl, FaLink, FaTrash, FaPlus, FaGripVertical, FaEdit,
  FaTextHeight, FaHeading, FaParagraph, FaStrikethrough, FaSuperscript,
  FaSubscript, FaIndent, FaOutdent, FaEraser
} from 'react-icons/fa';

interface ReceiptTemplate {
  id: string;
  name: string;
  preview: string;
  style: 'minimal' | 'classic' | 'modern' | 'elegant' | 'bold';
}

interface ReceiptSettings {
  // Header
  showLogo: boolean;
  logoUrl: string;
  logoSize: 'small' | 'medium' | 'large';
  storeName: string;
  storeNameSize: number;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showSocialMedia: boolean;
  headerAlignment: 'left' | 'center' | 'right';
  
  // Transaction Info
  showTransactionId: boolean;
  showDate: boolean;
  showTime: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showTable: boolean;
  
  // Items
  showItemCode: boolean;
  showItemDiscount: boolean;
  itemNameWidth: number;
  
  // Footer
  showSubtotal: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showServiceCharge: boolean;
  showPaymentMethod: boolean;
  showChange: boolean;
  showThankyouMessage: boolean;
  thankyouMessage: string;
  showPromoMessage: boolean;
  promoMessage: string;
  showQRCode: boolean;
  qrCodeContent: string;
  showBarcode: boolean;
  showSocialIcons: boolean;
  
  // Styling
  paperWidth: 58 | 80;
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  borderStyle: 'none' | 'dashed' | 'solid' | 'double';
  accentColor: string;
  
  // Template
  template: string;
}

const templates: ReceiptTemplate[] = [
  { id: 'minimal', name: 'Minimal', preview: '🎯', style: 'minimal' },
  { id: 'classic', name: 'Classic', preview: '📜', style: 'classic' },
  { id: 'modern', name: 'Modern', preview: '✨', style: 'modern' },
  { id: 'elegant', name: 'Elegant', preview: '💎', style: 'elegant' },
  { id: 'bold', name: 'Bold', preview: '🔥', style: 'bold' },
];

const fontFamilies = [
  { value: 'monospace', label: 'Monospace (Default)', category: 'system' },
  { value: 'Arial, sans-serif', label: 'Arial', category: 'system' },
  { value: 'Courier New, monospace', label: 'Courier New', category: 'system' },
  { value: 'Georgia, serif', label: 'Georgia', category: 'system' },
  { value: 'Verdana, sans-serif', label: 'Verdana', category: 'system' },
  { value: 'Times New Roman, serif', label: 'Times New Roman', category: 'system' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS', category: 'system' },
  { value: 'Impact, sans-serif', label: 'Impact', category: 'system' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans', category: 'system' },
  { value: 'Lucida Console, monospace', label: 'Lucida Console', category: 'system' },
  { value: "'Roboto', sans-serif", label: 'Roboto', category: 'google' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans', category: 'google' },
  { value: "'Lato', sans-serif", label: 'Lato', category: 'google' },
  { value: "'Poppins', sans-serif", label: 'Poppins', category: 'google' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat', category: 'google' },
  { value: "'Oswald', sans-serif", label: 'Oswald', category: 'google' },
  { value: "'Roboto Mono', monospace", label: 'Roboto Mono', category: 'google' },
  { value: "'Source Code Pro', monospace", label: 'Source Code Pro', category: 'google' },
  { value: "'Playfair Display', serif", label: 'Playfair Display', category: 'google' },
  { value: "'Merriweather', serif", label: 'Merriweather', category: 'google' },
];

interface HeaderLine {
  id: string;
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  alignment: 'left' | 'center' | 'right';
  color: string;
}

interface FooterLine {
  id: string;
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  alignment: 'left' | 'center' | 'right';
  color: string;
}

const ReceiptDesigner: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [previewScale, setPreviewScale] = useState(1);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [storeData, setStoreData] = useState({
    name: 'NAMA TOKO',
    address: 'Jl. Contoh No. 123',
    city: 'Jakarta',
    phone: '021-1234567',
    email: 'info@toko.com',
    website: 'www.toko.com'
  });

  const [headerLines, setHeaderLines] = useState<HeaderLine[]>([
    { id: '1', text: '{STORE_NAME}', fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#000000' },
    { id: '2', text: '{STORE_ADDRESS}', fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#666666' },
    { id: '3', text: 'Telp: {STORE_PHONE}', fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#666666' },
  ]);

  const [footerLines, setFooterLines] = useState<FooterLine[]>([
    { id: '1', text: '================================', fontSize: 10, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#999999' },
    { id: '2', text: 'Terima kasih atas kunjungan Anda!', fontSize: 11, fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#000000' },
    { id: '3', text: 'Barang yang sudah dibeli tidak dapat dikembalikan', fontSize: 9, fontWeight: 'normal', fontStyle: 'italic', textDecoration: 'none', alignment: 'center', color: '#666666' },
    { id: '4', text: 'Follow IG: @namatoko', fontSize: 9, fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', alignment: 'center', color: '#1a56db' },
  ]);

  const [editingHeaderLine, setEditingHeaderLine] = useState<string | null>(null);
  const [editingFooterLine, setEditingFooterLine] = useState<string | null>(null);

  const [settings, setSettings] = useState<ReceiptSettings>({
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
    
    showTransactionId: true,
    showDate: true,
    showTime: true,
    showCashier: true,
    showCustomer: false,
    showTable: false,
    
    showItemCode: false,
    showItemDiscount: true,
    itemNameWidth: 60,
    
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
    
    paperWidth: 80,
    fontFamily: 'monospace',
    fontSize: 12,
    lineSpacing: 1.4,
    borderStyle: 'dashed',
    accentColor: '#000000',
    
    template: 'modern'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/store/receipt-design');
      const data = await response.json();
      
      if (data.success && data.data) {
        setSettings(prev => ({ ...prev, ...data.data.settings }));
        if (data.data.store) {
          setStoreData(data.data.store);
        }
        if (data.data.headerLines) {
          setHeaderLines(data.data.headerLines);
        }
        if (data.data.footerLines) {
          setFooterLines(data.data.footerLines);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Keep default state values as fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/store/receipt-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          settings,
          headerLines,
          footerLines
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Desain struk berhasil disimpan!');
      } else {
        alert('Gagal menyimpan: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (previewRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Receipt</title>
              <style>
                body { margin: 0; padding: 20px; }
                @media print {
                  body { margin: 0; padding: 0; }
                }
              </style>
            </head>
            <body>
              ${previewRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const applyTemplate = (templateId: string) => {
    const templateSettings: Partial<ReceiptSettings> = {
      template: templateId
    };

    switch (templateId) {
      case 'minimal':
        templateSettings.showLogo = false;
        templateSettings.showEmail = false;
        templateSettings.showWebsite = false;
        templateSettings.showSocialMedia = false;
        templateSettings.borderStyle = 'none';
        templateSettings.fontSize = 11;
        break;
      case 'classic':
        templateSettings.showLogo = true;
        templateSettings.headerAlignment = 'center';
        templateSettings.borderStyle = 'dashed';
        templateSettings.fontFamily = 'Courier New, monospace';
        break;
      case 'modern':
        templateSettings.showLogo = true;
        templateSettings.headerAlignment = 'center';
        templateSettings.borderStyle = 'solid';
        templateSettings.fontFamily = 'Arial, sans-serif';
        templateSettings.showQRCode = true;
        break;
      case 'elegant':
        templateSettings.showLogo = true;
        templateSettings.headerAlignment = 'center';
        templateSettings.borderStyle = 'double';
        templateSettings.fontFamily = 'Georgia, serif';
        templateSettings.fontSize = 13;
        break;
      case 'bold':
        templateSettings.showLogo = true;
        templateSettings.storeNameSize = 20;
        templateSettings.borderStyle = 'solid';
        templateSettings.fontFamily = 'Verdana, sans-serif';
        templateSettings.accentColor = '#1a56db';
        break;
    }

    setSettings(prev => ({ ...prev, ...templateSettings }));
  };

  // Header/Footer Line Management Functions
  const addHeaderLine = () => {
    const newLine: HeaderLine = {
      id: Date.now().toString(),
      text: 'Teks baru',
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      alignment: 'center',
      color: '#000000'
    };
    setHeaderLines([...headerLines, newLine]);
  };

  const updateHeaderLine = (id: string, updates: Partial<HeaderLine>) => {
    setHeaderLines(headerLines.map(line => 
      line.id === id ? { ...line, ...updates } : line
    ));
  };

  const deleteHeaderLine = (id: string) => {
    setHeaderLines(headerLines.filter(line => line.id !== id));
  };

  const moveHeaderLine = (id: string, direction: 'up' | 'down') => {
    const index = headerLines.findIndex(line => line.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= headerLines.length) return;
    
    const newLines = [...headerLines];
    [newLines[index], newLines[newIndex]] = [newLines[newIndex], newLines[index]];
    setHeaderLines(newLines);
  };

  const addFooterLine = () => {
    const newLine: FooterLine = {
      id: Date.now().toString(),
      text: 'Teks baru',
      fontSize: 10,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      alignment: 'center',
      color: '#000000'
    };
    setFooterLines([...footerLines, newLine]);
  };

  const updateFooterLine = (id: string, updates: Partial<FooterLine>) => {
    setFooterLines(footerLines.map(line => 
      line.id === id ? { ...line, ...updates } : line
    ));
  };

  const deleteFooterLine = (id: string) => {
    setFooterLines(footerLines.filter(line => line.id !== id));
  };

  const moveFooterLine = (id: string, direction: 'up' | 'down') => {
    const index = footerLines.findIndex(line => line.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= footerLines.length) return;
    
    const newLines = [...footerLines];
    [newLines[index], newLines[newIndex]] = [newLines[newIndex], newLines[index]];
    setFooterLines(newLines);
  };

  // Replace placeholders with actual store data
  const replacePlaceholders = (text: string) => {
    return text
      .replace('{STORE_NAME}', storeData.name)
      .replace('{STORE_ADDRESS}', `${storeData.address}, ${storeData.city}`)
      .replace('{STORE_PHONE}', storeData.phone)
      .replace('{STORE_EMAIL}', storeData.email)
      .replace('{STORE_WEBSITE}', storeData.website)
      .replace('{DATE}', new Date().toLocaleDateString('id-ID'))
      .replace('{TIME}', new Date().toLocaleTimeString('id-ID'));
  };

  // Line Editor Component
  const LineEditor = ({ 
    line, 
    onUpdate, 
    onDelete, 
    onMove,
    isFirst,
    isLast 
  }: { 
    line: HeaderLine | FooterLine;
    onUpdate: (updates: Partial<HeaderLine | FooterLine>) => void;
    onDelete: () => void;
    onMove: (direction: 'up' | 'down') => void;
    isFirst: boolean;
    isLast: boolean;
  }) => (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMove('up')}
            disabled={isFirst}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={isLast}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <Input
          value={line.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="flex-1 text-sm"
          placeholder="Masukkan teks..."
        />
        <button
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 rounded"
        >
          <FaTrash className="w-3 h-3" />
        </button>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-t pt-2">
        {/* Font Size */}
        <select
          value={line.fontSize}
          onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
          className="text-xs px-2 py-1 border rounded"
        >
          {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24].map(size => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Bold */}
        <button
          onClick={() => onUpdate({ fontWeight: line.fontWeight === 'bold' ? 'normal' : 'bold' })}
          className={`p-1.5 rounded ${line.fontWeight === 'bold' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        >
          <FaBold className="w-3 h-3" />
        </button>

        {/* Italic */}
        <button
          onClick={() => onUpdate({ fontStyle: line.fontStyle === 'italic' ? 'normal' : 'italic' })}
          className={`p-1.5 rounded ${line.fontStyle === 'italic' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        >
          <FaItalic className="w-3 h-3" />
        </button>

        {/* Underline */}
        <button
          onClick={() => onUpdate({ textDecoration: line.textDecoration === 'underline' ? 'none' : 'underline' })}
          className={`p-1.5 rounded ${line.textDecoration === 'underline' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        >
          <FaUnderline className="w-3 h-3" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => onUpdate({ alignment: 'left' })}
          className={`p-1.5 rounded ${line.alignment === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        >
          <FaAlignLeft className="w-3 h-3" />
        </button>
        <button
          onClick={() => onUpdate({ alignment: 'center' })}
          className={`p-1.5 rounded ${line.alignment === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        >
          <FaAlignCenter className="w-3 h-3" />
        </button>
        <button
          onClick={() => onUpdate({ alignment: 'right' })}
          className={`p-1.5 rounded ${line.alignment === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
        >
          <FaAlignRight className="w-3 h-3" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Color */}
        <input
          type="color"
          value={line.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-6 h-6 rounded cursor-pointer border-0"
        />
      </div>
    </div>
  );

  const SettingToggle = ({ 
    label, 
    checked, 
    onChange,
    description 
  }: { 
    label: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void;
    description?: string;
  }) => (
    <label className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 text-blue-600 rounded mt-0.5"
      />
      <div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Desain Struk...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Receipt Designer | BEDAGANG Cloud POS</title>
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/settings/store')}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <FaArrowLeft className="w-6 h-6" />
                </button>
                <div className="p-3 bg-white/20 rounded-xl">
                  <FaReceipt className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Receipt Designer</h1>
                  <p className="text-purple-200">Desain struk profesional untuk bisnis Anda</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handlePrint}>
                  <FaPrint className="mr-2" />
                  Test Print
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-white text-purple-600 hover:bg-purple-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full mr-2"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Simpan Desain
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FaMagic className="mr-2 text-purple-600" />
                    Template Cepat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          settings.template === template.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-3xl mb-2 text-center">{template.preview}</div>
                        <div className="text-xs font-medium text-center">{template.name}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Settings Tabs */}
              <Card>
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start border-b rounded-none px-4 flex-wrap">
                      <TabsTrigger value="content" className="flex items-center gap-2">
                        <FaReceipt className="w-4 h-4" />
                        Konten
                      </TabsTrigger>
                      <TabsTrigger value="header-editor" className="flex items-center gap-2">
                        <FaHeading className="w-4 h-4" />
                        Header Editor
                      </TabsTrigger>
                      <TabsTrigger value="footer-editor" className="flex items-center gap-2">
                        <FaParagraph className="w-4 h-4" />
                        Footer Editor
                      </TabsTrigger>
                      <TabsTrigger value="fonts" className="flex items-center gap-2">
                        <FaFont className="w-4 h-4" />
                        Font
                      </TabsTrigger>
                      <TabsTrigger value="style" className="flex items-center gap-2">
                        <FaPalette className="w-4 h-4" />
                        Gaya
                      </TabsTrigger>
                    </TabsList>

                    <div className="p-6">
                      <TabsContent value="content" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">Informasi Transaksi</h4>
                            <SettingToggle
                              label="No. Transaksi"
                              checked={settings.showTransactionId}
                              onChange={(v) => setSettings(prev => ({ ...prev, showTransactionId: v }))}
                            />
                            <SettingToggle
                              label="Tanggal"
                              checked={settings.showDate}
                              onChange={(v) => setSettings(prev => ({ ...prev, showDate: v }))}
                            />
                            <SettingToggle
                              label="Waktu"
                              checked={settings.showTime}
                              onChange={(v) => setSettings(prev => ({ ...prev, showTime: v }))}
                            />
                            <SettingToggle
                              label="Nama Kasir"
                              checked={settings.showCashier}
                              onChange={(v) => setSettings(prev => ({ ...prev, showCashier: v }))}
                            />
                            <SettingToggle
                              label="Nama Customer"
                              checked={settings.showCustomer}
                              onChange={(v) => setSettings(prev => ({ ...prev, showCustomer: v }))}
                            />
                            <SettingToggle
                              label="No. Meja"
                              checked={settings.showTable}
                              onChange={(v) => setSettings(prev => ({ ...prev, showTable: v }))}
                              description="Untuk restoran/cafe"
                            />
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">Informasi Pembayaran</h4>
                            <SettingToggle
                              label="Subtotal"
                              checked={settings.showSubtotal}
                              onChange={(v) => setSettings(prev => ({ ...prev, showSubtotal: v }))}
                            />
                            <SettingToggle
                              label="Diskon"
                              checked={settings.showDiscount}
                              onChange={(v) => setSettings(prev => ({ ...prev, showDiscount: v }))}
                            />
                            <SettingToggle
                              label="Pajak/PPN"
                              checked={settings.showTax}
                              onChange={(v) => setSettings(prev => ({ ...prev, showTax: v }))}
                            />
                            <SettingToggle
                              label="Service Charge"
                              checked={settings.showServiceCharge}
                              onChange={(v) => setSettings(prev => ({ ...prev, showServiceCharge: v }))}
                            />
                            <SettingToggle
                              label="Metode Pembayaran"
                              checked={settings.showPaymentMethod}
                              onChange={(v) => setSettings(prev => ({ ...prev, showPaymentMethod: v }))}
                            />
                            <SettingToggle
                              label="Kembalian"
                              checked={settings.showChange}
                              onChange={(v) => setSettings(prev => ({ ...prev, showChange: v }))}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="header" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Logo & Nama</h4>
                            <SettingToggle
                              label="Tampilkan Logo"
                              checked={settings.showLogo}
                              onChange={(v) => setSettings(prev => ({ ...prev, showLogo: v }))}
                            />
                            {settings.showLogo && (
                              <div className="ml-8 space-y-3">
                                <div>
                                  <Label>URL Logo</Label>
                                  <Input
                                    value={settings.logoUrl}
                                    onChange={(e) => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                                    placeholder="https://example.com/logo.png"
                                  />
                                </div>
                                <div>
                                  <Label>Ukuran Logo</Label>
                                  <div className="flex gap-2 mt-1">
                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                      <Button
                                        key={size}
                                        variant={settings.logoSize === size ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSettings(prev => ({ ...prev, logoSize: size }))}
                                      >
                                        {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <Label>Ukuran Nama Toko</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="range"
                                  min="12"
                                  max="24"
                                  value={settings.storeNameSize}
                                  onChange={(e) => setSettings(prev => ({ ...prev, storeNameSize: parseInt(e.target.value) }))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-12">{settings.storeNameSize}px</span>
                              </div>
                            </div>

                            <div>
                              <Label>Alignment Header</Label>
                              <div className="flex gap-2 mt-1">
                                <Button
                                  variant={settings.headerAlignment === 'left' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setSettings(prev => ({ ...prev, headerAlignment: 'left' }))}
                                >
                                  <FaAlignLeft />
                                </Button>
                                <Button
                                  variant={settings.headerAlignment === 'center' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setSettings(prev => ({ ...prev, headerAlignment: 'center' }))}
                                >
                                  <FaAlignCenter />
                                </Button>
                                <Button
                                  variant={settings.headerAlignment === 'right' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setSettings(prev => ({ ...prev, headerAlignment: 'right' }))}
                                >
                                  <FaAlignRight />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Informasi Toko</h4>
                            <SettingToggle
                              label="Alamat"
                              checked={settings.showAddress}
                              onChange={(v) => setSettings(prev => ({ ...prev, showAddress: v }))}
                            />
                            <SettingToggle
                              label="Telepon"
                              checked={settings.showPhone}
                              onChange={(v) => setSettings(prev => ({ ...prev, showPhone: v }))}
                            />
                            <SettingToggle
                              label="Email"
                              checked={settings.showEmail}
                              onChange={(v) => setSettings(prev => ({ ...prev, showEmail: v }))}
                            />
                            <SettingToggle
                              label="Website"
                              checked={settings.showWebsite}
                              onChange={(v) => setSettings(prev => ({ ...prev, showWebsite: v }))}
                            />
                            <SettingToggle
                              label="Media Sosial"
                              checked={settings.showSocialMedia}
                              onChange={(v) => setSettings(prev => ({ ...prev, showSocialMedia: v }))}
                              description="Instagram, Facebook, dll"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="items" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Tampilan Item</h4>
                            <SettingToggle
                              label="Kode Item"
                              checked={settings.showItemCode}
                              onChange={(v) => setSettings(prev => ({ ...prev, showItemCode: v }))}
                              description="SKU atau barcode item"
                            />
                            <SettingToggle
                              label="Diskon Per Item"
                              checked={settings.showItemDiscount}
                              onChange={(v) => setSettings(prev => ({ ...prev, showItemDiscount: v }))}
                            />
                          </div>
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Lebar Kolom</h4>
                            <div>
                              <Label>Lebar Nama Item</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="range"
                                  min="40"
                                  max="80"
                                  value={settings.itemNameWidth}
                                  onChange={(e) => setSettings(prev => ({ ...prev, itemNameWidth: parseInt(e.target.value) }))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-12">{settings.itemNameWidth}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="footer" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Pesan</h4>
                            <SettingToggle
                              label="Pesan Terima Kasih"
                              checked={settings.showThankyouMessage}
                              onChange={(v) => setSettings(prev => ({ ...prev, showThankyouMessage: v }))}
                            />
                            {settings.showThankyouMessage && (
                              <div className="ml-8">
                                <Input
                                  value={settings.thankyouMessage}
                                  onChange={(e) => setSettings(prev => ({ ...prev, thankyouMessage: e.target.value }))}
                                  placeholder="Terima kasih atas kunjungan Anda!"
                                />
                              </div>
                            )}
                            
                            <SettingToggle
                              label="Pesan Promo"
                              checked={settings.showPromoMessage}
                              onChange={(v) => setSettings(prev => ({ ...prev, showPromoMessage: v }))}
                            />
                            {settings.showPromoMessage && (
                              <div className="ml-8">
                                <Input
                                  value={settings.promoMessage}
                                  onChange={(e) => setSettings(prev => ({ ...prev, promoMessage: e.target.value }))}
                                  placeholder="Dapatkan diskon 10%..."
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">QR Code & Barcode</h4>
                            <SettingToggle
                              label="QR Code"
                              checked={settings.showQRCode}
                              onChange={(v) => setSettings(prev => ({ ...prev, showQRCode: v }))}
                              description="Link ke website atau review"
                            />
                            {settings.showQRCode && (
                              <div className="ml-8">
                                <Input
                                  value={settings.qrCodeContent}
                                  onChange={(e) => setSettings(prev => ({ ...prev, qrCodeContent: e.target.value }))}
                                  placeholder="https://example.com/review"
                                />
                              </div>
                            )}
                            
                            <SettingToggle
                              label="Barcode Transaksi"
                              checked={settings.showBarcode}
                              onChange={(v) => setSettings(prev => ({ ...prev, showBarcode: v }))}
                            />
                            
                            <SettingToggle
                              label="Ikon Media Sosial"
                              checked={settings.showSocialIcons}
                              onChange={(v) => setSettings(prev => ({ ...prev, showSocialIcons: v }))}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      {/* Header Editor Tab */}
                      <TabsContent value="header-editor" className="mt-0 space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">Header Struk</h4>
                              <p className="text-sm text-gray-500">Kustomisasi baris-baris header pada struk</p>
                            </div>
                            <Button onClick={addHeaderLine} size="sm">
                              <FaPlus className="mr-2 w-3 h-3" />
                              Tambah Baris
                            </Button>
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                            <p className="font-medium text-blue-800 mb-1">💡 Placeholder yang tersedia:</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{STORE_NAME}'}</code>
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{STORE_ADDRESS}'}</code>
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{STORE_PHONE}'}</code>
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{STORE_EMAIL}'}</code>
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{STORE_WEBSITE}'}</code>
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{DATE}'}</code>
                              <code className="bg-blue-100 px-2 py-1 rounded">{'{TIME}'}</code>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {headerLines.map((line, index) => (
                              <LineEditor
                                key={line.id}
                                line={line}
                                onUpdate={(updates) => updateHeaderLine(line.id, updates)}
                                onDelete={() => deleteHeaderLine(line.id)}
                                onMove={(dir) => moveHeaderLine(line.id, dir)}
                                isFirst={index === 0}
                                isLast={index === headerLines.length - 1}
                              />
                            ))}
                            {headerLines.length === 0 && (
                              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                <FaHeading className="mx-auto text-3xl mb-2 opacity-50" />
                                <p>Belum ada baris header</p>
                                <Button onClick={addHeaderLine} variant="outline" size="sm" className="mt-2">
                                  <FaPlus className="mr-2 w-3 h-3" />
                                  Tambah Baris Pertama
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Footer Editor Tab */}
                      <TabsContent value="footer-editor" className="mt-0 space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">Footer Struk</h4>
                              <p className="text-sm text-gray-500">Kustomisasi baris-baris footer pada struk</p>
                            </div>
                            <Button onClick={addFooterLine} size="sm">
                              <FaPlus className="mr-2 w-3 h-3" />
                              Tambah Baris
                            </Button>
                          </div>
                          
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                            <p className="font-medium text-green-800 mb-1">💡 Tips Footer:</p>
                            <ul className="text-xs text-green-700 list-disc list-inside space-y-1">
                              <li>Gunakan karakter seperti <code className="bg-green-100 px-1 rounded">====</code> atau <code className="bg-green-100 px-1 rounded">----</code> untuk separator</li>
                              <li>Tambahkan link sosial media atau website</li>
                              <li>Sertakan pesan promo atau ucapan terima kasih</li>
                            </ul>
                          </div>

                          <div className="space-y-3">
                            {footerLines.map((line, index) => (
                              <LineEditor
                                key={line.id}
                                line={line}
                                onUpdate={(updates) => updateFooterLine(line.id, updates)}
                                onDelete={() => deleteFooterLine(line.id)}
                                onMove={(dir) => moveFooterLine(line.id, dir)}
                                isFirst={index === 0}
                                isLast={index === footerLines.length - 1}
                              />
                            ))}
                            {footerLines.length === 0 && (
                              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                <FaParagraph className="mx-auto text-3xl mb-2 opacity-50" />
                                <p>Belum ada baris footer</p>
                                <Button onClick={addFooterLine} variant="outline" size="sm" className="mt-2">
                                  <FaPlus className="mr-2 w-3 h-3" />
                                  Tambah Baris Pertama
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Fonts Tab */}
                      <TabsContent value="fonts" className="mt-0 space-y-4">
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Pilih Font Utama</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {fontFamilies.map((font) => (
                                <button
                                  key={font.value}
                                  onClick={() => setSettings(prev => ({ ...prev, fontFamily: font.value }))}
                                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    settings.fontFamily === font.value
                                      ? 'border-purple-600 bg-purple-50'
                                      : 'border-gray-200 hover:border-purple-300'
                                  }`}
                                >
                                  <div 
                                    className="text-lg mb-1"
                                    style={{ fontFamily: font.value }}
                                  >
                                    {font.label}
                                  </div>
                                  <div 
                                    className="text-xs text-gray-500"
                                    style={{ fontFamily: font.value }}
                                  >
                                    ABCDEFGHIJ 1234567890
                                  </div>
                                  <div className="mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      font.category === 'google' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {font.category === 'google' ? 'Google Font' : 'System Font'}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <Label>Ukuran Font Default</Label>
                              <div className="flex items-center gap-3 mt-2">
                                <input
                                  type="range"
                                  min="8"
                                  max="18"
                                  value={settings.fontSize}
                                  onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-16 text-center bg-gray-100 py-1 rounded">
                                  {settings.fontSize}px
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label>Spasi Baris</Label>
                              <div className="flex items-center gap-3 mt-2">
                                <input
                                  type="range"
                                  min="1"
                                  max="2.5"
                                  step="0.1"
                                  value={settings.lineSpacing}
                                  onChange={(e) => setSettings(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-16 text-center bg-gray-100 py-1 rounded">
                                  {settings.lineSpacing}x
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-medium text-gray-900 mb-3">Preview Font</h5>
                            <div 
                              className="bg-white p-4 rounded border text-center"
                              style={{ 
                                fontFamily: settings.fontFamily,
                                fontSize: `${settings.fontSize}px`,
                                lineHeight: settings.lineSpacing
                              }}
                            >
                              <div className="font-bold text-lg mb-2">NAMA TOKO ANDA</div>
                              <div>Jl. Contoh Alamat No. 123</div>
                              <div>Telp: 021-1234567</div>
                              <div className="my-2">------------------------</div>
                              <div>Nasi Goreng Spesial    Rp 35.000</div>
                              <div>Es Teh Manis x2        Rp 16.000</div>
                              <div className="my-2">------------------------</div>
                              <div className="font-bold">TOTAL: Rp 51.000</div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="style" className="mt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Ukuran Kertas</h4>
                            <div className="flex gap-3">
                              <button
                                onClick={() => setSettings(prev => ({ ...prev, paperWidth: 58 }))}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                  settings.paperWidth === 58
                                    ? 'border-purple-600 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <FaMobile className="mx-auto text-2xl mb-2" />
                                <div className="text-sm font-medium">58mm</div>
                                <div className="text-xs text-gray-500">Mini</div>
                              </button>
                              <button
                                onClick={() => setSettings(prev => ({ ...prev, paperWidth: 80 }))}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                  settings.paperWidth === 80
                                    ? 'border-purple-600 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <FaDesktop className="mx-auto text-2xl mb-2" />
                                <div className="text-sm font-medium">80mm</div>
                                <div className="text-xs text-gray-500">Standard</div>
                              </button>
                            </div>

                            <div>
                              <Label>Font</Label>
                              <select
                                value={settings.fontFamily}
                                onChange={(e) => setSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                              >
                                {fontFamilies.map((font) => (
                                  <option key={font.value} value={font.value}>
                                    {font.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <Label>Ukuran Font</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="range"
                                  min="10"
                                  max="16"
                                  value={settings.fontSize}
                                  onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-12">{settings.fontSize}px</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Gaya Visual</h4>
                            
                            <div>
                              <Label>Border Style</Label>
                              <div className="grid grid-cols-4 gap-2 mt-1">
                                {(['none', 'dashed', 'solid', 'double'] as const).map((style) => (
                                  <button
                                    key={style}
                                    onClick={() => setSettings(prev => ({ ...prev, borderStyle: style }))}
                                    className={`p-2 rounded-lg border-2 transition-all text-xs ${
                                      settings.borderStyle === style
                                        ? 'border-purple-600 bg-purple-50'
                                        : 'border-gray-200 hover:border-purple-300'
                                    }`}
                                  >
                                    {style.charAt(0).toUpperCase() + style.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label>Warna Aksen</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="color"
                                  value={settings.accentColor}
                                  onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                                  className="w-12 h-10 rounded border cursor-pointer"
                                />
                                <Input
                                  value={settings.accentColor}
                                  onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                                  className="flex-1"
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Line Spacing</Label>
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="range"
                                  min="1"
                                  max="2"
                                  step="0.1"
                                  value={settings.lineSpacing}
                                  onChange={(e) => setSettings(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-12">{settings.lineSpacing}x</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <FaEye className="mr-2 text-purple-600" />
                      Preview
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                      >
                        <FaCompress />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                      >
                        <FaExpand />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[600px]">
                    <div
                      ref={previewRef}
                      className="bg-white mx-auto shadow-lg transition-transform"
                      style={{
                        width: settings.paperWidth === 58 ? '220px' : '300px',
                        padding: '16px',
                        fontSize: `${settings.fontSize}px`,
                        fontFamily: settings.fontFamily,
                        lineHeight: settings.lineSpacing,
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'top center'
                      }}
                    >
                      {/* Logo */}
                      {settings.showLogo && (
                        <div className={`mb-3 ${settings.headerAlignment === 'center' ? 'text-center' : settings.headerAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                          {settings.logoUrl ? (
                            <img
                              src={settings.logoUrl}
                              alt="Logo"
                              className={`inline-block ${
                                settings.logoSize === 'small' ? 'h-8' :
                                settings.logoSize === 'medium' ? 'h-12' : 'h-16'
                              }`}
                            />
                          ) : (
                            <div className={`inline-block bg-gray-200 rounded ${
                              settings.logoSize === 'small' ? 'w-8 h-8' :
                              settings.logoSize === 'medium' ? 'w-12 h-12' : 'w-16 h-16'
                            }`}></div>
                          )}
                        </div>
                      )}

                      {/* Custom Header Lines */}
                      <div className="mb-3">
                        {headerLines.map((line) => (
                          <div
                            key={line.id}
                            style={{
                              fontSize: `${line.fontSize}px`,
                              fontWeight: line.fontWeight,
                              fontStyle: line.fontStyle,
                              textDecoration: line.textDecoration,
                              textAlign: line.alignment,
                              color: line.color
                            }}
                          >
                            {replacePlaceholders(line.text)}
                          </div>
                        ))}
                      </div>

                      {/* Store Info */}
                      <div className={`text-xs mb-3 ${settings.headerAlignment === 'center' ? 'text-center' : settings.headerAlignment === 'right' ? 'text-right' : 'text-left'}`}>
                        {settings.showAddress && <div>{storeData.address}, {storeData.city}</div>}
                        {settings.showPhone && <div>Telp: {storeData.phone}</div>}
                        {settings.showEmail && <div>{storeData.email}</div>}
                        {settings.showWebsite && <div>{storeData.website}</div>}
                      </div>

                      {/* Divider */}
                      <div className={`my-2 ${
                        settings.borderStyle === 'none' ? '' :
                        settings.borderStyle === 'dashed' ? 'border-t border-dashed border-gray-400' :
                        settings.borderStyle === 'solid' ? 'border-t border-gray-400' :
                        'border-t-4 border-double border-gray-400'
                      }`}></div>

                      {/* Transaction Info */}
                      <div className="text-xs mb-2">
                        {settings.showTransactionId && (
                          <div className="flex justify-between">
                            <span>No:</span>
                            <span>INV-2024-001234</span>
                          </div>
                        )}
                        {settings.showDate && (
                          <div className="flex justify-between">
                            <span>Tanggal:</span>
                            <span>23/02/2024</span>
                          </div>
                        )}
                        {settings.showTime && (
                          <div className="flex justify-between">
                            <span>Waktu:</span>
                            <span>14:30:45</span>
                          </div>
                        )}
                        {settings.showCashier && (
                          <div className="flex justify-between">
                            <span>Kasir:</span>
                            <span>Admin</span>
                          </div>
                        )}
                        {settings.showCustomer && (
                          <div className="flex justify-between">
                            <span>Customer:</span>
                            <span>John Doe</span>
                          </div>
                        )}
                        {settings.showTable && (
                          <div className="flex justify-between">
                            <span>Meja:</span>
                            <span>A-05</span>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className={`my-2 ${
                        settings.borderStyle === 'none' ? '' :
                        settings.borderStyle === 'dashed' ? 'border-t border-dashed border-gray-400' :
                        settings.borderStyle === 'solid' ? 'border-t border-gray-400' :
                        'border-t-4 border-double border-gray-400'
                      }`}></div>

                      {/* Items */}
                      <div className="text-xs space-y-1 mb-2">
                        <div>
                          {settings.showItemCode && <span className="text-gray-500">SKU001 </span>}
                          <span>Nasi Goreng Spesial</span>
                          {settings.showItemDiscount && <span className="text-red-500 ml-1">-10%</span>}
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>1 x 35.000</span>
                          <span>31.500</span>
                        </div>
                        
                        <div>
                          {settings.showItemCode && <span className="text-gray-500">SKU002 </span>}
                          <span>Es Teh Manis</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>2 x 8.000</span>
                          <span>16.000</span>
                        </div>
                        
                        <div>
                          {settings.showItemCode && <span className="text-gray-500">SKU003 </span>}
                          <span>Ayam Bakar</span>
                        </div>
                        <div className="flex justify-between pl-2">
                          <span>1 x 45.000</span>
                          <span>45.000</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className={`my-2 ${
                        settings.borderStyle === 'none' ? '' :
                        settings.borderStyle === 'dashed' ? 'border-t border-dashed border-gray-400' :
                        settings.borderStyle === 'solid' ? 'border-t border-gray-400' :
                        'border-t-4 border-double border-gray-400'
                      }`}></div>

                      {/* Totals */}
                      <div className="text-xs space-y-1">
                        {settings.showSubtotal && (
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>92.500</span>
                          </div>
                        )}
                        {settings.showDiscount && (
                          <div className="flex justify-between text-red-500">
                            <span>Diskon:</span>
                            <span>-3.500</span>
                          </div>
                        )}
                        {settings.showTax && (
                          <div className="flex justify-between">
                            <span>PPN 11%:</span>
                            <span>9.790</span>
                          </div>
                        )}
                        {settings.showServiceCharge && (
                          <div className="flex justify-between">
                            <span>Service 5%:</span>
                            <span>4.450</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-sm pt-1" style={{ color: settings.accentColor }}>
                          <span>TOTAL:</span>
                          <span>98.790</span>
                        </div>
                        {settings.showPaymentMethod && (
                          <div className="flex justify-between pt-1">
                            <span>Bayar (QRIS):</span>
                            <span>100.000</span>
                          </div>
                        )}
                        {settings.showChange && (
                          <div className="flex justify-between">
                            <span>Kembali:</span>
                            <span>1.210</span>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className={`my-2 ${
                        settings.borderStyle === 'none' ? '' :
                        settings.borderStyle === 'dashed' ? 'border-t border-dashed border-gray-400' :
                        settings.borderStyle === 'solid' ? 'border-t border-gray-400' :
                        'border-t-4 border-double border-gray-400'
                      }`}></div>

                      {/* Custom Footer Lines */}
                      <div className="mt-2">
                        {footerLines.map((line) => (
                          <div
                            key={line.id}
                            style={{
                              fontSize: `${line.fontSize}px`,
                              fontWeight: line.fontWeight,
                              fontStyle: line.fontStyle,
                              textDecoration: line.textDecoration,
                              textAlign: line.alignment,
                              color: line.color
                            }}
                          >
                            {replacePlaceholders(line.text)}
                          </div>
                        ))}
                      </div>

                      {/* QR Code & Barcode */}
                      {settings.showQRCode && (
                        <div className="flex justify-center my-3">
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <FaQrcode className="text-2xl text-gray-400" />
                          </div>
                        </div>
                      )}
                      {settings.showBarcode && (
                        <div className="flex justify-center my-2">
                          <div className="w-32 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <FaBarcode className="text-xl text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default ReceiptDesigner;
