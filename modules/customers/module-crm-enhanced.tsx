import React, { useState, useEffect } from 'react';
import { FaUsers, FaSearch, FaPlus, FaEdit, FaTrash, FaEye, FaPhone, FaEnvelope, FaSpinner } from 'react-icons/fa';
import AddCustomerWizard from '@/components/customers/AddCustomerWizard';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalPurchases: number;
  totalSpent: number;
  lastVisit: string;
  status: string;
  type: string;
  membershipLevel: string;
  points: number;
  discount: number;
  customerType?: string;
  companyName?: string;
  picName?: string;
  picPosition?: string;
  contact1?: string;
  contact2?: string;
  companyEmail?: string;
  companyAddress?: string;
  taxId?: string;
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  avgLifetimeValue: number;
}

const CRMModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    activeCustomers: 0,
    vipCustomers: 0,
    avgLifetimeValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState<'individual' | 'corporate'>('individual');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    type: 'walk-in',
    membershipLevel: 'Bronze',
    discount: 0,
    // Corporate fields
    companyName: '',
    picName: '',
    picPosition: '',
    contact1: '',
    contact2: '',
    companyEmail: '',
    companyAddress: '',
    taxId: ''
  });
  const [availableTiers, setAvailableTiers] = useState<string[]>(['Bronze', 'Silver', 'Gold', 'Platinum']);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [page, searchTerm]);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm
      });

      const response = await fetch(`/api/customers/crud?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.data.customers);
        setTotalPages(data.data.pagination.totalPages);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/customers/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data.overview);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await fetch('/api/loyalty/tiers/crud');
      const data = await response.json();

      if (data.success && data.data) {
        const tierNames = data.data.map((tier: any) => tier.name);
        setAvailableTiers(tierNames);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
      // Keep default tiers if fetch fails
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerType
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Pelanggan berhasil ditambahkan!');
        setShowAddModal(false);
        resetForm();
        fetchCustomers();
        fetchStats();
      } else {
        alert(data.error || 'Gagal menambahkan pelanggan');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Terjadi kesalahan saat menambahkan pelanggan');
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const response = await fetch(`/api/customers/crud?id=${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Pelanggan berhasil diupdate!');
        setShowEditModal(false);
        setSelectedCustomer(null);
        resetForm();
        fetchCustomers();
      } else {
        alert(data.error || 'Gagal mengupdate pelanggan');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Terjadi kesalahan saat mengupdate pelanggan');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) return;

    try {
      const response = await fetch(`/api/customers/crud?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Pelanggan berhasil dihapus!');
        fetchCustomers();
        fetchStats();
      } else {
        alert(data.error || 'Gagal menghapus pelanggan');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Terjadi kesalahan saat menghapus pelanggan');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: '',
      city: '',
      province: '',
      type: customer.type,
      membershipLevel: customer.membershipLevel,
      discount: customer.discount,
      companyName: customer.companyName || '',
      picName: customer.picName || '',
      picPosition: customer.picPosition || '',
      contact1: customer.contact1 || '',
      contact2: customer.contact2 || '',
      companyEmail: customer.companyEmail || '',
      companyAddress: customer.companyAddress || '',
      taxId: customer.taxId || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setCustomerType('individual');
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      province: '',
      type: 'walk-in',
      membershipLevel: 'Silver',
      discount: 0,
      companyName: '',
      picName: '',
      picPosition: '',
      contact1: '',
      contact2: '',
      companyEmail: '',
      companyAddress: '',
      taxId: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getStatusBadge = (customer: Customer) => {
    if (customer.type === 'vip') {
      return 'bg-purple-100 text-purple-800';
    } else if (customer.status === 'active') {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (customer: Customer) => {
    if (customer.type === 'vip') return 'VIP';
    if (customer.status === 'active') return 'Active';
    return 'Inactive';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Pelanggan</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers.toLocaleString()}</p>
          <span className="text-sm text-green-600 font-medium">Semua pelanggan</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Pelanggan Aktif</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeCustomers.toLocaleString()}</p>
          <span className="text-sm text-green-600 font-medium">
            {stats.totalCustomers > 0 ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100) : 0}% dari total
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Pelanggan VIP</p>
          <p className="text-2xl font-bold text-gray-900">{stats.vipCustomers.toLocaleString()}</p>
          <span className="text-sm text-gray-600">
            {stats.totalCustomers > 0 ? Math.round((stats.vipCustomers / stats.totalCustomers) * 100) : 0}% dari total
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Lifetime Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgLifetimeValue)}</p>
          <span className="text-sm text-green-600 font-medium">Rata-rata</span>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, email, atau nomor telepon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FaPlus />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-red-600 text-3xl" />
            <span className="ml-3 text-gray-600">Memuat data pelanggan...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <FaUsers className="mx-auto text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">Tidak ada data pelanggan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Pembelian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Belanja
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kunjungan Terakhir
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                            <FaUsers className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.membershipLevel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <FaEnvelope className="w-3 h-3 text-gray-400" />
                            {customer.email || '-'}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <FaPhone className="w-3 h-3 text-gray-400" />
                            {customer.phone || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{customer.totalPurchases} kali</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{formatDate(customer.lastVisit)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(customer)}`}>
                          {getStatusText(customer)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => window.location.href = `/customers/${customer.id}`}
                            className="text-blue-600 hover:text-blue-800" 
                            title="Lihat"
                          >
                            <FaEye />
                          </button>
                          <button 
                            onClick={() => openEditModal(customer)}
                            className="text-green-600 hover:text-green-800" 
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 hover:text-red-800" 
                            title="Hapus"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Customer Wizard */}
      <AddCustomerWizard
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchCustomers();
          fetchStats();
        }}
      />

      {/* Old Add Customer Modal - REPLACED BY WIZARD */}
      {false && showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h3 className="text-lg font-bold mb-4">Tambah Pelanggan Baru</h3>
            <form onSubmit={handleAddCustomer}>
              <div className="space-y-4">
                {/* Customer Type Selection */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Pelanggan *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="individual"
                        checked={customerType === 'individual'}
                        onChange={(e) => setCustomerType(e.target.value as 'individual' | 'corporate')}
                        className="mr-2"
                      />
                      <span>Individual</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="customerType"
                        value="corporate"
                        checked={customerType === 'corporate'}
                        onChange={(e) => setCustomerType(e.target.value as 'individual' | 'corporate')}
                        className="mr-2"
                      />
                      <span>Corporate</span>
                    </label>
                  </div>
                </div>

                {/* Corporate Fields */}
                {customerType === 'corporate' && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-gray-800">Informasi Perusahaan</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan *</label>
                        <input
                          type="text"
                          required={customerType === 'corporate'}
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NPWP / Tax ID</label>
                        <input
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama PIC *</label>
                        <input
                          type="text"
                          required={customerType === 'corporate'}
                          value={formData.picName}
                          onChange={(e) => setFormData({...formData, picName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan PIC</label>
                        <input
                          type="text"
                          value={formData.picPosition}
                          onChange={(e) => setFormData({...formData, picPosition: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kontak 1</label>
                        <input
                          type="tel"
                          value={formData.contact1}
                          onChange={(e) => setFormData({...formData, contact1: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kontak 2</label>
                        <input
                          type="tel"
                          value={formData.contact2}
                          onChange={(e) => setFormData({...formData, contact2: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Perusahaan</label>
                        <input
                          type="email"
                          value={formData.companyEmail}
                          onChange={(e) => setFormData({...formData, companyEmail: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Perusahaan</label>
                        <textarea
                          value={formData.companyAddress}
                          onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama {customerType === 'individual' ? 'Pelanggan' : 'Kontak'} *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telepon *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Customer</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="member">Member</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                {(formData.type === 'member' || formData.type === 'vip') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Membership Tier</label>
                    <select
                      value={formData.membershipLevel}
                      onChange={(e) => setFormData({...formData, membershipLevel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      {availableTiers.map((tier) => (
                        <option key={tier} value={tier}>{tier}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Tier akan otomatis disesuaikan berdasarkan total belanja
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Edit Pelanggan</h3>
            <form onSubmit={handleEditCustomer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Customer</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="walk-in">Walk-in</option>
                    <option value="member">Member</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                {(formData.type === 'member' || formData.type === 'vip') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Membership Tier</label>
                    <select
                      value={formData.membershipLevel}
                      onChange={(e) => setFormData({...formData, membershipLevel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      {availableTiers.map((tier) => (
                        <option key={tier} value={tier}>{tier}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Tier akan otomatis disesuaikan berdasarkan total belanja
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMModule;
