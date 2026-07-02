import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { CanAccess, PageGuard } from '../../../components/permissions';
import Link from 'next/link';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  DollarSign,
  Printer,
  Mail,
  MoreVertical,
  X
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  customerType: 'corporate' | 'individual';
  branch: string;
  branchCode: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paidAmount: number;
  notes: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
}

const defaultInvSummary: InvoiceSummary = { totalInvoices: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0, overdueAmount: 0, draftCount: 0, sentCount: 0, paidCount: 0, overdueCount: 0 };

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const formatFullCurrency = (value: number) => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const MOCK_INV_SUMMARY: InvoiceSummary = {
  totalInvoices: 42, totalAmount: 1850000000, paidAmount: 1200000000, pendingAmount: 450000000,
  overdueAmount: 200000000, draftCount: 3, sentCount: 8, paidCount: 25, overdueCount: 6,
};

const MOCK_INVOICES: Invoice[] = [
  { id: 'inv1', invoiceNumber: 'INV-2026-0042', customer: 'PT Maju Bersama', customerType: 'corporate', branch: 'Kantor Pusat Jakarta', branchCode: 'HQ-001', issueDate: '2026-03-01', dueDate: '2026-03-31', items: [{ id: 'i1', description: 'Kopi Arabica Blend 1kg x 100', quantity: 100, unitPrice: 185000, total: 18500000 }], subtotal: 18500000, tax: 2035000, discount: 0, total: 20535000, status: 'sent', paidAmount: 0, notes: '' },
  { id: 'inv2', invoiceNumber: 'INV-2026-0041', customer: 'Hotel Grand Nusa', customerType: 'corporate', branch: 'Cabang Bali', branchCode: 'BR-005', issueDate: '2026-02-15', dueDate: '2026-03-15', items: [{ id: 'i2', description: 'Supply Kopi Bulanan', quantity: 1, unitPrice: 85000000, total: 85000000 }], subtotal: 85000000, tax: 9350000, discount: 5000000, total: 89350000, status: 'partial', paidAmount: 50000000, notes: 'Kontrak bulanan' },
  { id: 'inv3', invoiceNumber: 'INV-2026-0040', customer: 'CV Sejahtera Abadi', customerType: 'corporate', branch: 'Cabang Bandung', branchCode: 'BR-002', issueDate: '2026-02-01', dueDate: '2026-03-01', items: [{ id: 'i3', description: 'Paket Produk Mix', quantity: 50, unitPrice: 350000, total: 17500000 }], subtotal: 17500000, tax: 1925000, discount: 0, total: 19425000, status: 'paid', paidAmount: 19425000, notes: '' },
  { id: 'inv4', invoiceNumber: 'INV-2026-0039', customer: 'Restoran Padang Sederhana', customerType: 'individual', branch: 'Cabang Surabaya', branchCode: 'BR-003', issueDate: '2026-01-20', dueDate: '2026-02-20', items: [{ id: 'i4', description: 'Teh Premium Bulk', quantity: 200, unitPrice: 35000, total: 7000000 }], subtotal: 7000000, tax: 770000, discount: 0, total: 7770000, status: 'overdue', paidAmount: 0, notes: '' },
  { id: 'inv5', invoiceNumber: 'INV-2026-0038', customer: 'PT Teknologi Nusantara', customerType: 'corporate', branch: 'Kantor Pusat Jakarta', branchCode: 'HQ-001', issueDate: '2026-03-10', dueDate: '2026-04-10', items: [{ id: 'i5', description: 'Catering Event Kantor', quantity: 1, unitPrice: 45000000, total: 45000000 }], subtotal: 45000000, tax: 4950000, discount: 2000000, total: 47950000, status: 'draft', paidAmount: 0, notes: 'Draft - perlu approval' },
];

export default function InvoiceManagement() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<InvoiceSummary>(MOCK_INV_SUMMARY);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Form state for new invoice
  const [newInvoice, setNewInvoice] = useState({
    customer: '',
    customerType: 'corporate' as 'corporate' | 'individual',
    branch: '',
    dueDate: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    discount: 0,
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hq/finance/invoices?status=${filterStatus}&limit=100`);
      if (response.ok) {
        const json = await response.json();
        const rawData = json.data || json;
        const rows = Array.isArray(rawData) ? rawData : (rawData.invoices || []);
        const paginationData = json.pagination || json.meta || {};

        // Map DB rows to Invoice interface
        const mappedInvoices: Invoice[] = rows.map((row: any) => ({
          id: row.id,
          invoiceNumber: row.invoice_number || row.invoiceNumber || '',
          customer: row.customer_name || row.supplier_name || row.customer || '',
          customerType: row.customer_id ? 'corporate' : 'individual',
          branch: row.branch_name || '',
          branchCode: row.branch_id || '',
          issueDate: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : '',
          dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : '',
          items: [],
          subtotal: parseFloat(row.subtotal || row.items_total || 0),
          tax: parseFloat(row.tax_amount || 0),
          discount: parseFloat(row.discount_amount || 0),
          total: parseFloat(row.total_amount || 0),
          status: row.status || 'draft',
          paidAmount: parseFloat(row.paid_amount || 0),
          notes: row.notes || ''
        }));

        setInvoices(mappedInvoices);

        // Calculate summary from data
        const totalAmount = mappedInvoices.reduce((s, i) => s + i.total, 0);
        const paidAmount = mappedInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
        const pendingAmount = mappedInvoices.filter(i => i.status === 'sent' || i.status === 'partial').reduce((s, i) => s + (i.total - i.paidAmount), 0);
        const overdueAmount = mappedInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total - i.paidAmount), 0);
        setSummary({
          totalInvoices: paginationData.total || mappedInvoices.length,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount,
          draftCount: mappedInvoices.filter(i => i.status === 'draft').length,
          sentCount: mappedInvoices.filter(i => i.status === 'sent' || i.status === 'partial').length,
          paidCount: mappedInvoices.filter(i => i.status === 'paid').length,
          overdueCount: mappedInvoices.filter(i => i.status === 'overdue').length,
        });
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices(MOCK_INVOICES);
      setSummary(MOCK_INV_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [filterStatus]);

  if (!mounted) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"><Clock className="w-3 h-3" />Draft</span>;
      case 'sent':
        return <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"><Send className="w-3 h-3" />Sent</span>;
      case 'paid':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"><CheckCircle className="w-3 h-3" />Paid</span>;
      case 'partial':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"><Clock className="w-3 h-3" />Partial</span>;
      case 'overdue':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs"><AlertTriangle className="w-3 h-3" />Overdue</span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs"><XCircle className="w-3 h-3" />Cancelled</span>;
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.customer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const addInvoiceItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removeInvoiceItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.11; // 11% PPN
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - newInvoice.discount;
  };

  const handleCreateInvoice = async () => {
    try {
      const response = await fetch('/api/hq/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sales',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: newInvoice.dueDate,
          subtotal: calculateSubtotal(),
          tax_amount: calculateTax(),
          discount_amount: newInvoice.discount,
          total_amount: calculateTotal(),
          notes: newInvoice.notes,
          items: newInvoice.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewInvoice({
          customer: '',
          customerType: 'corporate',
          branch: '',
          dueDate: '',
          items: [{ description: '', quantity: 1, unitPrice: 0 }],
          discount: 0,
          notes: ''
        });
        fetchData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    }
  };

  const viewInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  return (
    <PageGuard
      anyPermission={['finance.view', 'finance.*', 'finance_invoices.view']}
      title="Manajemen Invoice"
    >
    <HQLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hq/finance" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('finance.invTitle')}</h1>
              <p className="text-gray-500">{t('finance.invSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CanAccess anyPermission={['finance_invoices.create', 'finance.*']}>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                {t('finance.invCreate')}
              </button>
            </CanAccess>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              {t('finance.export')}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <p className="text-blue-100 text-sm">{t('finance.totalInvoices')}</p>
            <p className="text-2xl font-bold">{summary.totalInvoices}</p>
            <p className="text-blue-200 text-xs mt-1">{formatCurrency(summary.totalAmount)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-gray-500 text-sm">{t('finance.paid')}</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{summary.paidCount}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(summary.paidAmount)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <p className="text-gray-500 text-sm">{t('finance.pending')}</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{summary.sentCount}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(summary.pendingAmount)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-gray-500 text-sm">{t('finance.overdue')}</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.overdueCount}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(summary.overdueAmount)}</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <p className="text-gray-500 text-sm">{t('finance.draft')}</p>
            </div>
            <p className="text-2xl font-bold text-gray-600">{summary.draftCount}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting send</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {['all', 'draft', 'sent', 'paid', 'partial', 'overdue'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filterStatus === status ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('finance.invSearch')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.invoiceNo')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.customer')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.branch')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.issueDate')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('finance.dueDate')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('finance.amount')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.status')}</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('finance.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-blue-600">{invoice.invoiceNumber}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{invoice.customer}</p>
                    <p className="text-xs text-gray-500 capitalize">{invoice.customerType}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-gray-600">{invoice.branchCode}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{invoice.issueDate}</td>
                  <td className="px-5 py-4">
                    <p className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {invoice.dueDate}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                    {invoice.paidAmount > 0 && invoice.paidAmount < invoice.total && (
                      <p className="text-xs text-green-600">Paid: {formatCurrency(invoice.paidAmount)}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">{getStatusBadge(invoice.status)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => viewInvoiceDetail(invoice)} className="p-1.5 hover:bg-gray-100 rounded" title="View">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded" title="Send">
                        <Mail className="w-4 h-4 text-gray-500" />
                      </button>
                      <DocumentExportButton
                        documentType="invoice"
                        variant="icon"
                        data={{
                          customerName: invoice.customer,
                          customerType: invoice.customerType,
                          items: invoice.items,
                          subtotal: invoice.subtotal,
                          tax: invoice.tax,
                          discount: invoice.discount,
                          total: invoice.total,
                          dueDate: invoice.dueDate,
                          status: invoice.status,
                          paidAmount: invoice.paidAmount,
                          notes: invoice.notes,
                        }}
                        meta={{
                          documentNumber: invoice.invoiceNumber,
                          documentDate: invoice.issueDate,
                          branchId: invoice.branchCode,
                        }}
                        showFormats={['pdf', 'html']}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Invoice Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Invoice</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newInvoice.customer}
                      onChange={(e) => setNewInvoice({ ...newInvoice, customer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                    <select
                      value={newInvoice.customerType}
                      onChange={(e) => setNewInvoice({ ...newInvoice, customerType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="corporate">Corporate</option>
                      <option value="individual">Individual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <select
                      value={newInvoice.branch}
                      onChange={(e) => setNewInvoice({ ...newInvoice, branch: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Branch</option>
                      <option value="HQ-001">Cabang Pusat Jakarta</option>
                      <option value="BR-002">Cabang Bandung</option>
                      <option value="BR-003">Cabang Surabaya</option>
                      <option value="BR-004">Cabang Medan</option>
                      <option value="BR-005">Cabang Yogyakarta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Invoice Items</label>
                    <button
                      onClick={addInvoiceItem}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newInvoice.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Unit Price"
                          value={item.unitPrice}
                          onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                          className="w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <span className="w-32 text-right font-medium">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                        {newInvoice.items.length > 1 && (
                          <button onClick={() => removeInvoiceItem(index)} className="p-1 hover:bg-red-100 rounded">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discount & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                    <input
                      type="number"
                      value={newInvoice.discount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, discount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={newInvoice.notes}
                      onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Additional notes"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatFullCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (11% PPN)</span>
                    <span className="font-medium">{formatFullCurrency(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-red-600">-{formatFullCurrency(newInvoice.discount)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-blue-600">{formatFullCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={!newInvoice.customer || !newInvoice.dueDate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Detail Modal */}
        {showDetailModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedInvoice.invoiceNumber}</h2>
                  <p className="text-sm text-gray-500">{selectedInvoice.customer}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Issue Date</p>
                    <p className="font-medium">{selectedInvoice.issueDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium">{selectedInvoice.dueDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Branch</p>
                    <p className="font-medium">{selectedInvoice.branch}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    {getStatusBadge(selectedInvoice.status)}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Items</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatFullCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatFullCurrency(selectedInvoice.tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">-{formatFullCurrency(selectedInvoice.discount)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatFullCurrency(selectedInvoice.total)}</span>
                  </div>
                  {selectedInvoice.paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Paid Amount</span>
                        <span>{formatFullCurrency(selectedInvoice.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>Balance Due</span>
                        <span>{formatFullCurrency(selectedInvoice.total - selectedInvoice.paidAmount)}</span>
                      </div>
                    </>
                  )}
                </div>

                {selectedInvoice.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
    </PageGuard>
  );
}
