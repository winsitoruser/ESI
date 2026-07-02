import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import Modal, { ConfirmDialog } from '../../../components/hq/ui/Modal';
import { StatusBadge } from '../../../components/hq/ui/Badge';
import { toast } from 'react-hot-toast';
import {
  Truck, Save, RefreshCw, Plus, Edit, Trash2, Search, Eye, Phone, Mail, MapPin,
  Building2, DollarSign, Package, Star, Calendar, FileText, CheckCircle, AlertTriangle,
  Clock, Download
} from 'lucide-react';
import { rowsOr, MOCK_HQ_SUPPLIERS } from '@/lib/hq/mock-data';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  categories: string[];
  rating: number;
  totalPO: number;
  totalValue: number;
  paymentTerms: string;
  leadTimeDays: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  lastOrderDate: string | null;
}

export default function Suppliers() {
  const [mounted, setMounted] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_HQ_SUPPLIERS as Supplier[]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    categories: [] as string[],
    paymentTerms: 'Net 30',
    leadTimeDays: 3,
    notes: ''
  });

  const allCategories = ['Sembako', 'Minuman', 'Makanan Ringan', 'Perawatan Pribadi', 'Kebersihan Rumah'];

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hq/suppliers');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(rowsOr(data.suppliers, MOCK_HQ_SUPPLIERS as Supplier[]));
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSuppliers();
  }, []);

  if (!mounted) {
    return null;
  }

  const handleCreate = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newSupplier: Supplier = {
      id: Date.now().toString(),
      ...formData,
      rating: 0,
      totalPO: 0,
      totalValue: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastOrderDate: null
    };
    setSuppliers(prev => [...prev, newSupplier]);
    setSaving(false);
    setShowCreateModal(false);
    toast.success(`Supplier ${formData.name} berhasil ditambahkan`);
  };

  const handleEdit = async () => {
    if (!selectedSupplier) return;
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSuppliers(prev => prev.map(s => 
      s.id === selectedSupplier?.id ? { ...s, ...formData } : s
    ));
    setSaving(false);
    setShowEditModal(false);
    toast.success(`Supplier ${formData.name} berhasil diupdate`);
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    const name = selectedSupplier.name;
    setSuppliers(prev => prev.filter(s => s.id !== selectedSupplier?.id));
    setShowDeleteConfirm(false);
    setSelectedSupplier(null);
    toast.success(`Supplier ${name} berhasil dihapus`);
  };

  const handleToggleActive = (supplier: Supplier) => {
    setSuppliers(prev => prev.map(s => 
      s.id === supplier.id ? { ...s, isActive: !s.isActive } : s
    ));
    toast.success(`Supplier ${supplier.name} ${supplier.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
  };

  const handleExportSuppliers = () => {
    const rows = filteredSuppliers.map(s => `${s.code},${s.name},${s.contactPerson},${s.phone},${s.email},${s.city},${s.province},"${s.categories.join(';')}",${s.rating},${s.totalPO},${s.totalValue},${s.paymentTerms},${s.leadTimeDays},${s.isActive}`);
    const csv = `Code,Name,Contact,Phone,Email,City,Province,Categories,Rating,TotalPO,TotalValue,PaymentTerms,LeadTime,Active\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'suppliers.csv'; a.click(); URL.revokeObjectURL(url);
    toast.success('Export supplier berhasil');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.categories.includes(categoryFilter);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && s.isActive) || 
      (statusFilter === 'inactive' && !s.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.isActive).length,
    totalPO: suppliers.reduce((sum, s) => sum + s.totalPO, 0),
    totalValue: suppliers.reduce((sum, s) => sum + s.totalValue, 0),
    avgRating: suppliers.length > 0 ? suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length : 0
  };

  return (
    <HQLayout title="Manajemen Supplier" subtitle="Kelola data supplier dan vendor">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Supplier</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-500">Aktif</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPO}</p>
                <p className="text-sm text-gray-500">Total PO</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500">Total Pembelian</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
                <p className="text-sm text-gray-500">Rata-rata Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Kategori</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Tidak Aktif</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchSuppliers} disabled={loading} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={handleExportSuppliers} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  <Download className="w-4 h-4" /> Export
                </button>
                <button
                  onClick={() => {
                    setFormData({
                      code: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
                      name: '',
                      contactPerson: '',
                      phone: '',
                      email: '',
                      address: '',
                      city: '',
                      province: '',
                      categories: [],
                      paymentTerms: 'Net 30',
                      leadTimeDays: 3,
                      notes: ''
                    });
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Supplier
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Tidak ada supplier ditemukan
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Supplier</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Kontak</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Kategori</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Rating</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Total PO</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Total Nilai</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{supplier.name}</p>
                          <p className="text-sm text-gray-500">{supplier.code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{supplier.contactPerson}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-3 h-3" />
                            {supplier.phone}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {supplier.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {cat}
                            </span>
                          ))}
                          {supplier.categories.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{supplier.categories.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {renderStars(supplier.rating)}
                      </td>
                      <td className="py-3 px-4 text-center">{supplier.totalPO}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(supplier.totalValue)}</td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={supplier.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowViewModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setFormData({
                                code: supplier.code,
                                name: supplier.name,
                                contactPerson: supplier.contactPerson,
                                phone: supplier.phone,
                                email: supplier.email,
                                address: supplier.address,
                                city: supplier.city,
                                province: supplier.province,
                                categories: supplier.categories,
                                paymentTerms: supplier.paymentTerms,
                                leadTimeDays: supplier.leadTimeDays,
                                notes: supplier.notes
                              });
                              setShowEditModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* View Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={selectedSupplier?.name || 'Detail Supplier'}
          subtitle={selectedSupplier?.code}
          size="lg"
        >
          {selectedSupplier && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  {renderStars(selectedSupplier?.rating || 0)}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSupplier?.categories?.map(cat => (
                      <span key={cat} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <StatusBadge status={selectedSupplier?.isActive ? 'active' : 'inactive'} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Kontak Person</p>
                    <p className="font-medium">{selectedSupplier?.contactPerson || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier?.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedSupplier?.email || '-'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p>{selectedSupplier?.address}</p>
                      <p className="text-sm text-gray-500">{selectedSupplier?.city}, {selectedSupplier?.province}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Total PO</p>
                      <p className="text-xl font-bold text-gray-900">{selectedSupplier?.totalPO || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Total Nilai</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedSupplier?.totalValue || 0)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Terms</p>
                    <p className="font-medium">{selectedSupplier?.paymentTerms || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lead Time</p>
                    <p className="font-medium">{selectedSupplier?.leadTimeDays || 0} hari</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order Terakhir</p>
                    <p className="font-medium">
                      {selectedSupplier?.lastOrderDate 
                        ? new Date(selectedSupplier.lastOrderDate).toLocaleDateString('id-ID')
                        : 'Belum ada order'}
                    </p>
                  </div>
                </div>
              </div>

              {selectedSupplier?.notes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800">Catatan</p>
                  <p className="text-yellow-700">{selectedSupplier?.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={() => { setShowCreateModal(false); setShowEditModal(false); }}
          title={showCreateModal ? 'Tambah Supplier' : 'Edit Supplier'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Supplier</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  readOnly={showEditModal}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Supplier</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kontak Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Produk</label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        categories: prev.categories.includes(cat)
                          ? prev.categories.filter(c => c !== cat)
                          : [...prev.categories, cat]
                      }));
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      formData.categories.includes(cat)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="COD">COD (Cash on Delivery)</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (hari)</label>
                <input
                  type="number"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={showCreateModal ? handleCreate : handleEdit}
                disabled={saving || !formData.name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Hapus Supplier"
          message={`Apakah Anda yakin ingin menghapus supplier "${selectedSupplier?.name}"?`}
          confirmText="Hapus"
          variant="danger"
        />
      </div>
    </HQLayout>
  );
}
