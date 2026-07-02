import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FaUndo, FaPlus, FaSearch, FaFilter, FaEye, FaCheck,
  FaTimes, FaExclamationTriangle, FaFileInvoice, FaBoxOpen,
  FaShippingFast, FaMoneyBillWave, FaClipboardList, FaPrint,
  FaSortUp, FaSortDown, FaSort, FaUser, FaBox
} from 'react-icons/fa';

interface ReturnOrder {
  id: string;
  returnNumber: string;
  type: 'supplier' | 'customer' | 'internal' | 'damaged';
  fromLocation: string;
  toLocation: string;
  returnDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    condition: 'damaged' | 'expired' | 'wrong_item' | 'defective' | 'other';
    unitCost: number;
    refundAmount: number;
  }[];
  totalRefund: number;
  creditNoteNumber?: string;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
}

const ReturnsManagementPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, formatCurrency, formatDate } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [sortField, setSortField] = useState<string>('return_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [returns, setReturns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalReturns: 0,
    pendingReturns: 0,
    approvedReturns: 0,
    completedReturns: 0,
    totalRefundAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [autoSetupAttempted, setAutoSetupAttempted] = useState(false);

  // Fetch returns data from API
  useEffect(() => {
    initializeReturnsManagement();
  }, []);

  const initializeReturnsManagement = async () => {
    const dataFetched = await fetchReturnsData();
    const statsFetched = await fetchReturnsStats();

    if (!dataFetched && !statsFetched && !autoSetupAttempted) {
      setAutoSetupAttempted(true);
      await setupReturnsTable(true);
    }
  };

  const fetchReturnsData = async (): Promise<boolean> => {
    try {
      const response = await axios.get('/api/returns?limit=50');
      if (response.data.success) {
        setReturns(response.data.data);
        setTableExists(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error fetching returns data:', error);
      if (error.response?.status === 500) {
        setTableExists(false);
      }
      return false;
    }
  };

  const fetchReturnsStats = async (): Promise<boolean> => {
    try {
      const response = await axios.get('/api/returns/stats');
      if (response.data.success) {
        setStats(response.data.data);
        setTableExists(true);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error fetching returns stats:', error);
      if (error.response?.status === 500) {
        setTableExists(false);
      }
      return false;
    }
  };

  const setupReturnsTable = async (isAutoSetup: boolean = false) => {
    setSetupLoading(true);
    
    if (isAutoSetup) {
      toast.loading(t('inventory.returns.setupLoading'), { id: 'auto-setup' });
    }

    try {
      const response = await axios.post('/api/returns/setup');
      if (response.data.success) {
        if (isAutoSetup) {
          toast.success(
            t('inventory.returns.setupSuccess'),
            { id: 'auto-setup', duration: 4000 }
          );
        } else {
          toast.success(
            response.data.alreadyExists 
              ? t('inventory.returns.tableExists') 
              : t('inventory.returns.tableCreated'),
            { duration: 4000 }
          );
        }
        setTableExists(true);
        await fetchReturnsData();
        await fetchReturnsStats();
      }
    } catch (error: any) {
      console.error('Error setting up returns table:', error);
      if (isAutoSetup) {
        toast.error(
          t('inventory.returns.autoSetupFailed'),
          { id: 'auto-setup', duration: 5000 }
        );
      } else {
        toast.error(
          error.response?.data?.message || t('inventory.returns.setupFailed'),
          { duration: 5000 }
        );
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const handleApproveReturn = async (returnId: number) => {
    try {
      const response = await axios.put(`/api/returns/${returnId}`, {
        status: 'approved',
        approvedBy: session?.user?.email || session?.user?.name
      });

      if (response.data.success) {
        toast.success(t('inventory.returns.approveSuccess'), { duration: 3000 });
        await fetchReturnsData();
        await fetchReturnsStats();
      }
    } catch (error: any) {
      toast.error(t('inventory.returns.approveFailed'), { duration: 3000 });
    }
  };

  const handleRejectReturn = async (returnId: number) => {
    setSelectedReturn({ id: returnId });
    setShowRejectModal(true);
  };

  const confirmRejectReturn = async () => {
    if (!rejectReason) {
      toast.error(t('inventory.returns.selectRejectReason'), { duration: 3000 });
      return;
    }

    try {
      const response = await axios.put(`/api/returns/${selectedReturn.id}`, {
        status: 'rejected',
        notes: `DITOLAK - ${rejectReason}: ${rejectNotes}`
      });

      if (response.data.success) {
        toast.success(t('inventory.returns.rejectSuccess'), { duration: 3000 });
        setShowRejectModal(false);
        setRejectReason('');
        setRejectNotes('');
        await fetchReturnsData();
        await fetchReturnsStats();
      }
    } catch (error: any) {
      toast.error(t('inventory.returns.rejectFailed'), { duration: 3000 });
    }
  };

  const handlePrintReturn = async (returnData: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Fetch business settings
    let businessName = 'BEDAGANG Cloud POS';
    let businessAddress = 'Jl. Contoh No. 123, Jakarta';
    let businessPhone = '(021) 1234-5678';
    let businessEmail = 'info@bedagang.com';

    try {
      const settingsResponse = await axios.get('/api/settings/business');
      if (settingsResponse.data.success) {
        const settings = settingsResponse.data.data;
        businessName = settings.business_name || settings.name || businessName;
        businessAddress = settings.address || businessAddress;
        businessPhone = settings.phone || businessPhone;
        businessEmail = settings.email || businessEmail;
      }
    } catch (error) {
      console.log('Using default business info');
    }

    const returnNum = returnData.return_number || returnData.returnNumber;
    const customerName = returnData.customer_name || returnData.customerName || '-';
    const customerPhone = returnData.customer_phone || returnData.customerPhone || '-';
    const productName = returnData.product_name || returnData.productName;
    const productSku = returnData.product_sku || returnData.productSku || '-';
    const quantity = returnData.quantity;
    const unit = returnData.unit || 'pcs';
    const condition = returnData.condition || '-';
    const originalPrice = returnData.original_price || returnData.originalPrice || 0;
    const restockingFee = returnData.restocking_fee || returnData.restockingFee || 0;
    const refundAmt = returnData.refund_amount || returnData.totalRefund || 0;
    const returnDate = new Date(returnData.return_date || returnData.returnDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const returnReason = returnData.return_reason || returnData.reason;
    const returnType = returnData.return_type || returnData.returnType || 'refund';
    const status = returnData.status || 'pending';
    const notes = returnData.notes || '-';
    const createdBy = returnData.created_by || returnData.createdBy || 'Staff';
    
    // Invoice/Distributor info
    const invoiceNumber = returnData.invoice_number || '-';
    const invoiceDate = returnData.invoice_date ? formatDate(returnData.invoice_date) : '-';
    const distributorName = returnData.distributor_name || '-';
    const distributorPhone = returnData.distributor_phone || '-';
    const purchaseDate = returnData.purchase_date ? formatDate(returnData.purchase_date) : '-';
    
    // Approval info
    const approvedBy = returnData.approved_by || '-';
    const approvalDate = returnData.approval_date ? formatDate(returnData.approval_date) : '-';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dokumen Retur - ${returnNum}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Times New Roman', Georgia, serif; 
            padding: 25mm;
            font-size: 11pt;
            line-height: 1.6;
            color: #1a1a1a;
            background: #fff;
          }
          
          /* Kop Surat - Minimalis & Elegan */
          .letterhead {
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          .company-name {
            font-size: 22pt;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          .company-details {
            font-size: 9.5pt;
            color: #555;
            line-height: 1.5;
          }
          .company-details div {
            margin: 3px 0;
          }
          
          /* Document Title - Clean */
          .document-title {
            text-align: center;
            margin: 25px 0 30px 0;
            padding: 15px 0;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
          }
          .document-title h1 {
            font-size: 16pt;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
            letter-spacing: 2px;
          }
          .document-number {
            font-size: 11pt;
            color: #666;
            font-weight: 500;
          }
          
          /* Info Grid - Minimalis */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 25px 0;
          }
          .info-box {
            border: 1px solid #e0e0e0;
            padding: 15px;
            background: #fafafa;
          }
          .info-box h3 {
            font-size: 10.5pt;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row {
            display: flex;
            margin: 8px 0;
            font-size: 10pt;
          }
          .info-label {
            font-weight: 600;
            width: 130px;
            color: #555;
          }
          .info-value {
            flex: 1;
            color: #1a1a1a;
          }
          
          /* Table - Professional */
          .product-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            border: 1px solid #ddd;
          }
          .product-table th {
            background: #2c3e50;
            color: #fff;
            padding: 12px;
            text-align: left;
            font-size: 10pt;
            font-weight: 600;
            border: 1px solid #2c3e50;
          }
          .product-table td {
            border: 1px solid #ddd;
            padding: 12px;
            font-size: 10pt;
            color: #1a1a1a;
          }
          .product-table tbody tr:hover {
            background: #f9f9f9;
          }
          
          /* Financial Summary - Elegant */
          .financial-summary {
            margin: 25px 0;
            border: 1px solid #ddd;
            padding: 20px;
            background: #fafafa;
          }
          .financial-summary h3 {
            font-size: 11pt;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          .financial-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 10.5pt;
            color: #1a1a1a;
          }
          .financial-row.total {
            border-top: 2px solid #2c3e50;
            margin-top: 12px;
            padding-top: 12px;
            font-weight: 700;
            font-size: 12pt;
          }
          .financial-label {
            font-weight: 500;
          }
          .financial-value {
            text-align: right;
            font-weight: 600;
          }
          
          /* Notes - Subtle */
          .notes-section {
            margin: 25px 0;
            padding: 15px;
            background: #f9f9f9;
            border-left: 3px solid #2c3e50;
          }
          .notes-section h3 {
            font-size: 10.5pt;
            font-weight: 600;
            margin-bottom: 10px;
            color: #2c3e50;
          }
          .notes-content {
            font-size: 10pt;
            color: #555;
            white-space: pre-wrap;
            line-height: 1.6;
          }
          
          /* Signatures - Clean */
          .signatures {
            margin-top: 50px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-label {
            font-size: 10pt;
            font-weight: 600;
            margin-bottom: 70px;
            color: #555;
          }
          .signature-line {
            border-top: 1.5px solid #2c3e50;
            padding-top: 8px;
            font-size: 10pt;
          }
          .signature-name {
            font-weight: 600;
            margin-top: 5px;
            color: #1a1a1a;
          }
          
          /* Footer - Minimalis */
          .document-footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 8.5pt;
            color: #888;
            text-align: center;
            line-height: 1.5;
          }
          
          /* Status Badge - Subtle */
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 9pt;
            font-weight: 600;
            background: #f5f5f5;
            color: #555;
          }
          
          /* Print Button - Minimalis */
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 28px;
            background: #2c3e50;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 10.5pt;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            z-index: 1000;
            transition: all 0.3s ease;
          }
          .print-button:hover {
            background: #1a252f;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          
          @media print {
            body { padding: 0; }
            .print-button { display: none; }
            .info-grid { page-break-inside: avoid; }
            .product-table { page-break-inside: avoid; }
            .signatures { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Kop Surat -->
        <div class="letterhead">
          <div class="company-name">${businessName}</div>
          <div class="company-details">
            <div>${businessAddress}</div>
            <div>Telp: ${businessPhone} | Email: ${businessEmail}</div>
          </div>
        </div>

        <!-- Document Title -->
        <div class="document-title">
          <h1>SURAT RETUR BARANG</h1>
          <div class="document-number">Nomor: ${returnNum}</div>
        </div>

        <!-- Kepada (Distributor) -->
        ${distributorName !== '-' ? `
        <div style="margin: 25px 0;">
          <p style="margin-bottom: 5px;"><strong>Kepada Yth.</strong></p>
          <p style="margin-bottom: 3px; font-weight: 600;">${distributorName}</p>
          ${distributorPhone !== '-' ? `<p style="margin-bottom: 3px; font-size: 10pt;">Telp: ${distributorPhone}</p>` : ''}
          <p style="margin-top: 10px;">Dengan hormat,</p>
        </div>
        ` : ''}

        <!-- Surat Content -->
        <div style="margin: 20px 0; text-align: justify; line-height: 1.8;">
          <p style="text-indent: 40px;">
            Bersama surat ini, kami mengajukan permohonan retur barang dengan detail sebagai berikut:
          </p>
        </div>

        <!-- Invoice Reference -->
        ${invoiceNumber !== '-' ? `
        <div class="info-box" style="margin: 20px 0; background: #f9f9f9; padding: 15px; border-left: 3px solid #2c3e50;">
          <h3 style="font-size: 11pt; font-weight: 600; color: #2c3e50; margin-bottom: 10px;">Referensi Faktur Pembelian</h3>
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 8px; font-size: 10pt;">
            <span style="font-weight: 600;">No. Faktur:</span>
            <span style="font-family: 'Courier New', monospace;">${invoiceNumber}</span>
            ${invoiceDate !== '-' ? `
            <span style="font-weight: 600;">Tanggal Faktur:</span>
            <span>${invoiceDate}</span>
            ` : ''}
            ${purchaseDate !== '-' ? `
            <span style="font-weight: 600;">Tanggal Pembelian:</span>
            <span>${purchaseDate}</span>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-box">
            <h3>Informasi Retur</h3>
            <div class="info-row">
              <span class="info-label">Tanggal Retur</span>
              <span class="info-value">${returnDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tipe Retur</span>
              <span class="info-value">${returnType.toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-value">
                <span class="status-badge">${status.toUpperCase()}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Dibuat Oleh</span>
              <span class="info-value">${createdBy}</span>
            </div>
          </div>

          <div class="info-box">
            <h3>Informasi Customer</h3>
            <div class="info-row">
              <span class="info-label">Nama</span>
              <span class="info-value">${customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">No. Telepon</span>
              <span class="info-value">${customerPhone}</span>
            </div>
          </div>
        </div>

        <!-- Product Table -->
        <table class="product-table">
          <thead>
            <tr>
              <th style="width: 35%">Nama Produk</th>
              <th style="width: 15%">SKU</th>
              <th style="width: 12%">Jumlah</th>
              <th style="width: 15%">Kondisi</th>
              <th style="width: 23%">Alasan Retur</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${productName}</strong></td>
              <td>${productSku}</td>
              <td><strong>${quantity} ${unit}</strong></td>
              <td>${condition}</td>
              <td>${returnReason}</td>
            </tr>
          </tbody>
        </table>

        <!-- Financial Summary -->
        <div class="financial-summary">
          <h3>Ringkasan Keuangan</h3>
          <div class="financial-row">
            <span class="financial-label">Harga Original (${quantity} × Rp ${originalPrice.toLocaleString('id-ID')})</span>
            <span class="financial-value">Rp ${(quantity * originalPrice).toLocaleString('id-ID')}</span>
          </div>
          <div class="financial-row">
            <span class="financial-label">Biaya Restocking</span>
            <span class="financial-value">- Rp ${restockingFee.toLocaleString('id-ID')}</span>
          </div>
          <div class="financial-row total">
            <span class="financial-label">TOTAL REFUND</span>
            <span class="financial-value">Rp ${refundAmt.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <!-- Notes -->
        ${notes !== '-' ? `
        <div class="notes-section">
          <h3>Catatan</h3>
          <div class="notes-content">${notes}</div>
        </div>
        ` : ''}

        <!-- Penutup Surat -->
        <div style="margin: 30px 0 20px 0; text-align: justify; line-height: 1.8;">
          <p style="text-indent: 40px;">
            Demikian surat retur ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
          </p>
        </div>

        <!-- Approval Section -->
        ${status === 'approved' && approvedBy !== '-' ? `
        <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 4px;">
          <p style="font-weight: 600; color: #2e7d32; margin-bottom: 8px;">✓ DISETUJUI</p>
          <div style="font-size: 10pt; color: #555;">
            <p>Disetujui oleh: <strong>${approvedBy}</strong></p>
            ${approvalDate !== '-' ? `<p>Tanggal: ${approvalDate}</p>` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-label">Hormat kami,<br>${businessName}</div>
            <div class="signature-line">
              <div class="signature-name">${createdBy}</div>
              <div style="font-size: 9pt; color: #666; margin-top: 3px;">Petugas Retur</div>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Mengetahui,<br>Manager</div>
            <div class="signature-line">
              <div class="signature-name">_________________</div>
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Diterima oleh,<br>${distributorName !== '-' ? distributorName : 'Distributor'}</div>
            <div class="signature-line">
              <div class="signature-name">_________________</div>
            </div>
          </div>
        </div>

        <!-- Disclaimer -->
        <div style="margin-top: 30px; padding: 12px; background: #fff3cd; border-left: 3px solid #ffc107; font-size: 9pt; color: #856404;">
          <p style="font-weight: 600; margin-bottom: 5px;">PENTING:</p>
          <ul style="margin-left: 20px; line-height: 1.6;">
            <li>Surat retur ini merupakan dokumen resmi dan harus disertai dengan barang yang diretur</li>
            <li>Mohon periksa kondisi barang sebelum menerima retur</li>
            <li>Proses refund/penggantian akan dilakukan sesuai kebijakan yang berlaku</li>
            <li>Dokumen ini sah tanpa tanda tangan basah (digital signature)</li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="document-footer">
          <p>Dokumen ini dicetak secara otomatis oleh sistem ${businessName}</p>
          <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <!-- Print Button -->
        <button class="print-button" onclick="window.print()">PRINT DOKUMEN</button>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortOrder === 'asc' ? <FaSortUp className="text-blue-600" /> : <FaSortDown className="text-blue-600" />;
  };

  // Mock data for fallback
  const returnOrders: ReturnOrder[] = [
    {
      id: 'RET001',
      returnNumber: 'RET-2024-001',
      type: 'supplier',
      fromLocation: 'Toko Pusat',
      toLocation: 'PT Kopi Nusantara',
      returnDate: '2024-01-23',
      reason: 'Barang rusak saat pengiriman',
      status: 'approved',
      items: [
        {
          productId: '1',
          productName: 'Kopi Arabica Premium 250g',
          sku: 'KOP-001',
          quantity: 10,
          condition: 'damaged',
          unitCost: 30000,
          refundAmount: 300000
        }
      ],
      totalRefund: 300000,
      creditNoteNumber: 'CN-2024-001',
      requestedBy: 'Admin Toko',
      approvedBy: 'Manager Purchasing',
      notes: 'Kemasan rusak, produk tidak layak jual'
    },
    {
      id: 'RET002',
      returnNumber: 'RET-2024-002',
      type: 'customer',
      fromLocation: 'Toko Pusat',
      toLocation: 'Customer',
      returnDate: '2024-01-24',
      reason: 'Produk tidak sesuai pesanan',
      status: 'processing',
      items: [
        {
          productId: '2',
          productName: 'Teh Hijau Organik',
          sku: 'TEH-001',
          quantity: 3,
          condition: 'wrong_item',
          unitCost: 22000,
          refundAmount: 66000
        }
      ],
      totalRefund: 66000,
      requestedBy: 'Kasir 1',
      notes: 'Customer menerima produk yang salah'
    },
    {
      id: 'RET003',
      returnNumber: 'RET-2024-003',
      type: 'internal',
      fromLocation: 'Toko Cabang A',
      toLocation: 'Gudang Pusat',
      returnDate: '2024-01-24',
      reason: 'Stok berlebih, return ke gudang',
      status: 'pending',
      items: [
        {
          productId: '5',
          productName: 'Beras Premium 5kg',
          sku: 'BER-001',
          quantity: 20,
          condition: 'other',
          unitCost: 70000,
          refundAmount: 0
        }
      ],
      totalRefund: 0,
      requestedBy: 'Manager Cabang A',
      notes: 'Transfer kembali ke gudang pusat'
    },
    {
      id: 'RET004',
      returnNumber: 'RET-2024-004',
      type: 'damaged',
      fromLocation: 'Toko Pusat',
      toLocation: 'Write-off',
      returnDate: '2024-01-22',
      reason: 'Produk kadaluarsa',
      status: 'completed',
      items: [
        {
          productId: '6',
          productName: 'Susu UHT 1L',
          sku: 'SUS-001',
          quantity: 15,
          condition: 'expired',
          unitCost: 14000,
          refundAmount: 0
        }
      ],
      totalRefund: 0,
      requestedBy: 'Admin Toko',
      approvedBy: 'Manager Operasional',
      notes: 'Produk sudah melewati tanggal kadaluarsa'
    }
  ];


  const getTypeBadge = (type: string) => {
    const config = {
      supplier: { color: 'bg-blue-100 text-blue-700', label: t('inventory.returns.supplierReturn') },
      customer: { color: 'bg-green-100 text-green-700', label: t('inventory.returns.customerReturn') },
      internal: { color: 'bg-purple-100 text-purple-700', label: t('inventory.returns.internalReturn') },
      damaged: { color: 'bg-red-100 text-red-700', label: t('inventory.returns.damagedGoods') }
    };
    const typeConfig = config[type as keyof typeof config] || config.supplier;
    return <Badge className={typeConfig.color}>{typeConfig.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: t('inventory.returns.pending') },
      approved: { color: 'bg-blue-100 text-blue-700', label: t('inventory.returns.approved') },
      processing: { color: 'bg-indigo-100 text-indigo-700', label: t('inventory.returns.processing') },
      completed: { color: 'bg-green-100 text-green-700', label: t('inventory.returns.completed') },
      rejected: { color: 'bg-red-100 text-red-700', label: t('inventory.returns.rejected') }
    };
    const statusConfig = config[status as keyof typeof config] || config.pending;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const config = {
      damaged: { color: 'bg-red-100 text-red-700', label: t('inventory.returns.damaged') },
      expired: { color: 'bg-orange-100 text-orange-700', label: t('inventory.returns.expired') },
      wrong_item: { color: 'bg-yellow-100 text-yellow-700', label: t('inventory.returns.wrongItem') },
      defective: { color: 'bg-red-100 text-red-700', label: t('inventory.returns.defective') },
      other: { color: 'bg-gray-100 text-gray-700', label: t('inventory.returns.other') }
    };
    const conditionConfig = config[condition as keyof typeof config] || config.other;
    return <Badge className={conditionConfig.color}>{conditionConfig.label}</Badge>;
  };

  // Use API data if available, otherwise use mock data
  const displayReturns = returns.length > 0 ? returns : returnOrders;

  // Enhanced search - search across multiple fields
  const filteredReturns = displayReturns.filter((ret: any) => {
    const returnNum = ret.return_number || ret.returnNumber;
    const fromLoc = ret.from_location || ret.fromLocation || '';
    const retType = ret.return_type || ret.type;
    const retStatus = ret.status;
    const productName = ret.product_name || ret.productName || '';
    const customerName = ret.customer_name || ret.customerName || '';
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = returnNum.toLowerCase().includes(searchLower) ||
                         fromLoc.toLowerCase().includes(searchLower) ||
                         productName.toLowerCase().includes(searchLower) ||
                         customerName.toLowerCase().includes(searchLower);
    const matchesType = filterType === 'all' || retType === filterType;
    const matchesStatus = filterStatus === 'all' || retStatus === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort filtered returns
  const sortedReturns = [...filteredReturns].sort((a: any, b: any) => {
    let aVal = a[sortField] || a[sortField.replace('_', '')] || '';
    let bVal = b[sortField] || b[sortField.replace('_', '')] || '';

    // Handle dates
    if (sortField.includes('date')) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle numbers
    if (sortField.includes('amount') || sortField === 'quantity') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const displayStats = {
    total: stats.totalReturns || returnOrders.length,
    pending: stats.pendingReturns || returnOrders.filter(r => r.status === 'pending').length,
    processing: stats.approvedReturns || returnOrders.filter(r => r.status === 'processing').length,
    completed: stats.completedReturns || returnOrders.filter(r => r.status === 'completed').length,
    totalRefund: stats.totalRefundAmount || returnOrders.reduce((sum, r) => sum + r.totalRefund, 0)
  };

  return (
    <DashboardLayout>
      <Head>
        <title>{t('inventory.returns.pageTitle')}</title>
      </Head>

      <Toaster position="top-right" />
      <div className="space-y-6">
        {/* Setup Banner if table doesn't exist */}
        {!tableExists && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-amber-600 text-xl mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">{t('inventory.returns.setupRequired')}</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Table <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">returns</code> {t('inventory.returns.tableNotCreated')}
                </p>
                <Button
                  onClick={() => setupReturnsTable(false)}
                  disabled={setupLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                >
                  {setupLoading ? t('inventory.returns.creatingTable') : t('inventory.returns.setupNow')}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-gradient-to-br from-red-500 via-red-600 to-orange-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <FaUndo className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{t('inventory.returns.title')}</h1>
                    <p className="text-red-100 text-sm">{t('inventory.returns.subtitle')}</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push('/inventory/returns/create')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                <FaPlus className="mr-2" />
                {t('inventory.returns.createNew')}
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-red-100">{t('inventory.returns.totalReturns')}</p>
                <p className="text-2xl font-bold">{displayStats.total}</p>
              </div>
              <div className="bg-yellow-500/30 backdrop-blur-sm rounded-lg p-3 border border-yellow-400/30">
                <p className="text-xs text-yellow-100">{t('inventory.returns.pending')}</p>
                <p className="text-2xl font-bold">{displayStats.pending}</p>
              </div>
              <div className="bg-indigo-500/30 backdrop-blur-sm rounded-lg p-3 border border-indigo-400/30">
                <p className="text-xs text-indigo-100">{t('inventory.returns.processing')}</p>
                <p className="text-2xl font-bold">{displayStats.processing}</p>
              </div>
              <div className="bg-green-500/30 backdrop-blur-sm rounded-lg p-3 border border-green-400/30">
                <p className="text-xs text-green-100">{t('inventory.returns.completed')}</p>
                <p className="text-2xl font-bold">{displayStats.completed}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-xs text-red-100">{t('inventory.returns.totalRefund')}</p>
                <p className="text-lg font-bold">{formatCurrency(displayStats.totalRefund)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t('inventory.returns.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('inventory.returns.allTypes')}</option>
                  <option value="supplier">{t('inventory.returns.supplierReturn')}</option>
                  <option value="customer">{t('inventory.returns.customerReturn')}</option>
                  <option value="internal">{t('inventory.returns.internalReturn')}</option>
                  <option value="damaged">{t('inventory.returns.damagedGoods')}</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('inventory.returns.allStatus')}</option>
                  <option value="pending">{t('inventory.returns.pending')}</option>
                  <option value="approved">{t('inventory.returns.approved')}</option>
                  <option value="processing">{t('inventory.returns.processing')}</option>
                  <option value="completed">{t('inventory.returns.completed')}</option>
                  <option value="rejected">{t('inventory.returns.rejected')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Returns List */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>{t('inventory.returns.returnList')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      <button onClick={() => handleSort('return_number')} className="flex items-center space-x-1 hover:text-blue-600">
                        <span>{t('inventory.returns.returnNo')}</span>
                        {getSortIcon('return_number')}
                      </button>
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('inventory.returns.type')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Customer</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('inventory.returns.product')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">
                      <button onClick={() => handleSort('return_date')} className="flex items-center space-x-1 hover:text-blue-600">
                        <span>{t('inventory.returns.date')}</span>
                        {getSortIcon('return_date')}
                      </button>
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">
                      <button onClick={() => handleSort('quantity')} className="flex items-center space-x-1 hover:text-blue-600">
                        <span>Qty</span>
                        {getSortIcon('quantity')}
                      </button>
                    </th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">
                      <button onClick={() => handleSort('refund_amount')} className="flex items-center space-x-1 hover:text-blue-600">
                        <span>Refund</span>
                        {getSortIcon('refund_amount')}
                      </button>
                    </th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">{t('inventory.returns.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReturns.map((returnOrder: any) => {
                    const returnNum = returnOrder.return_number || returnOrder.returnNumber;
                    const returnReason = returnOrder.return_reason || returnOrder.reason;
                    const returnType = returnOrder.return_type || returnOrder.type;
                    const customerName = returnOrder.customer_name || returnOrder.customerName || '-';
                    const productName = returnOrder.product_name || returnOrder.productName || '-';
                    const returnDate = returnOrder.return_date || returnOrder.returnDate;
                    const quantity = returnOrder.quantity || 1;
                    const unit = returnOrder.unit || 'pcs';
                    const refundAmt = returnOrder.refund_amount || returnOrder.totalRefund || 0;
                    const retStatus = returnOrder.status;
                    
                    return (
                    <tr key={returnOrder.id} className="border-b border-gray-100 hover:bg-red-50 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-gray-900">{returnNum}</p>
                        <p className="text-xs text-gray-500">{returnReason}</p>
                      </td>
                      <td className="p-3">
                        {getTypeBadge(returnType)}
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-gray-900 font-medium">{customerName}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-gray-900">{productName}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-gray-900">{formatDate(returnDate)}</p>
                      </td>
                      <td className="p-3 text-center">
                        <p className="font-semibold text-gray-900">{quantity} {unit}</p>
                      </td>
                      <td className="p-3 text-right">
                        <p className="font-semibold text-red-600">{formatCurrency(refundAmt)}</p>
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(retStatus)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReturn(returnOrder);
                              setShowDetailModal(true);
                            }}
                            title={t('inventory.returns.viewDetail')}
                          >
                            <FaEye />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => await handlePrintReturn(returnOrder)}
                            title={t('inventory.returns.printDocument')}
                          >
                            <FaPrint />
                          </Button>
                          {retStatus === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApproveReturn(returnOrder.id)}
                                title={t('inventory.returns.approve')}
                              >
                                <FaCheck />
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleRejectReturn(returnOrder.id)}
                                title={t('inventory.returns.reject')}
                              >
                                <FaTimes />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal - Enhanced */}
      {showDetailModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedReturn.return_number || selectedReturn.returnNumber}</h2>
                  <p className="text-red-100 text-sm mt-1">{t('inventory.returns.fullDetail')}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Customer & Product Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <FaUser className="mr-2 text-blue-600" />
                      {t('inventory.returns.customerInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.returns.name')}:</span>
                      <span className="font-semibold">{selectedReturn.customer_name || selectedReturn.customerName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.returns.phone')}:</span>
                      <span className="font-semibold">{selectedReturn.customer_phone || selectedReturn.customerPhone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.returns.returnDate')}:</span>
                      <span className="font-semibold">{formatDate(selectedReturn.return_date || selectedReturn.returnDate)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <FaBox className="mr-2 text-green-600" />
                      {t('inventory.returns.productInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.returns.product')}:</span>
                      <span className="font-semibold">{selectedReturn.product_name || selectedReturn.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-semibold">{selectedReturn.product_sku || selectedReturn.productSku || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('inventory.returns.quantity')}:</span>
                      <span className="font-semibold">{selectedReturn.quantity} {selectedReturn.unit || 'pcs'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Return Details */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <FaUndo className="mr-2 text-red-600" />
                    {t('inventory.returns.returnDetail')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">{t('inventory.returns.reason')}</p>
                      <p className="font-semibold">{selectedReturn.return_reason || selectedReturn.reason}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">{t('inventory.returns.returnType')}</p>
                      <p className="font-semibold">{selectedReturn.return_type || selectedReturn.returnType}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">{t('inventory.returns.condition')}</p>
                      <p className="font-semibold">{selectedReturn.condition}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Status</p>
                      {getStatusBadge(selectedReturn.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="mb-6 border-2 border-red-200">
                <CardHeader className="pb-3 bg-red-50">
                  <CardTitle className="text-base flex items-center">
                    <FaMoneyBillWave className="mr-2 text-green-600" />
                    {t('inventory.returns.financialSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('inventory.returns.originalPrice')}:</span>
                    <span className="font-semibold">{formatCurrency(selectedReturn.original_price || selectedReturn.originalPrice || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Restocking Fee:</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(selectedReturn.restocking_fee || selectedReturn.restockingFee || 0)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-lg font-bold">{t('inventory.returns.totalRefund')}:</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(selectedReturn.refund_amount || selectedReturn.totalRefund || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedReturn.notes && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-1">{t('inventory.returns.notes')}:</p>
                  <p className="text-sm text-gray-700">{selectedReturn.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={async () => await handlePrintReturn(selectedReturn)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FaPrint className="mr-2" />
                  {t('inventory.returns.printDocument')}
                </Button>
                {selectedReturn.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleApproveReturn(selectedReturn.id);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <FaCheck className="mr-2" />
                      {t('inventory.returns.approve')}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleRejectReturn(selectedReturn.id);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <FaTimes className="mr-2" />
                      {t('inventory.returns.reject')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-red-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaExclamationTriangle className="text-2xl" />
                  <h2 className="text-xl font-bold">{t('inventory.returns.rejectReturn')}</h2>
                </div>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectNotes('');
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('inventory.returns.rejectReason')} *
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{t('inventory.returns.selectReason')}</option>
                  <option value="Produk tidak memenuhi syarat retur">{t('inventory.returns.reasonNotEligible')}</option>
                  <option value="Melewati batas waktu retur">{t('inventory.returns.reasonTimePassed')}</option>
                  <option value="Bukti pembelian tidak valid">{t('inventory.returns.reasonInvalidProof')}</option>
                  <option value="Kondisi produk tidak sesuai">{t('inventory.returns.reasonBadCondition')}</option>
                  <option value="Produk sudah digunakan">{t('inventory.returns.reasonUsed')}</option>
                  <option value="Tidak ada stok pengganti">{t('inventory.returns.reasonNoStock')}</option>
                  <option value="Kebijakan toko tidak mengizinkan">{t('inventory.returns.reasonPolicy')}</option>
                  <option value="Lainnya">{t('inventory.returns.other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('inventory.returns.additionalNotes')}
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={4}
                  placeholder={t('inventory.returns.rejectDetailPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>{t('inventory.returns.attention')}:</strong> {t('inventory.returns.rejectWarning')}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setRejectNotes('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={confirmRejectReturn}
                  disabled={!rejectReason}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <FaTimes className="mr-2" />
                  {t('inventory.returns.confirmReject')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReturnsManagementPage;
