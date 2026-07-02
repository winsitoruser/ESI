import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaArrowLeft, FaBoxOpen, FaPlus, FaEdit, FaTrash, FaSearch, FaTags,
  FaTruck, FaWarehouse, FaRuler, FaSpinner
} from 'react-icons/fa';

const InventorySettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');
  const [searchTerm, setSearchTerm] = useState('');

  const MOCK_CATEGORIES = [{ id: 'c1', name: 'Makanan', code: 'MKN', description: 'Produk makanan', productCount: 45 }, { id: 'c2', name: 'Minuman', code: 'MNM', description: 'Produk minuman', productCount: 30 }, { id: 'c3', name: 'Bahan Baku', code: 'BB', description: 'Bahan baku dapur', productCount: 25 }];
  const MOCK_SUPPLIERS = [{ id: 's1', name: 'PT Indofood', contact: 'Budi', phone: '021-1234567', email: 'budi@indofood.com', address: 'Jakarta' }, { id: 's2', name: 'CV Segar Jaya', contact: 'Siti', phone: '021-7654321', email: 'siti@segarjaya.com', address: 'Bandung' }];
  const MOCK_UNITS = [{ id: 'u1', name: 'Kilogram', symbol: 'kg' }, { id: 'u2', name: 'Liter', symbol: 'L' }, { id: 'u3', name: 'Piece', symbol: 'pcs' }, { id: 'u4', name: 'Pack', symbol: 'pack' }];
  const MOCK_WAREHOUSES = [{ id: 'w1', name: 'Gudang Utama', location: 'Jakarta', description: 'Gudang pusat' }, { id: 'w2', name: 'Gudang Cabang 1', location: 'Bandung', description: 'Gudang cabang Bandung' }];
  const [categories, setCategories] = useState<any[]>(MOCK_CATEGORIES);
  const [suppliers, setSuppliers] = useState<any[]>(MOCK_SUPPLIERS);
  const [units, setUnits] = useState<any[]>(MOCK_UNITS);
  const [warehouses, setWarehouses] = useState<any[]>(MOCK_WAREHOUSES);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    contact: '',
    address: '',
    phone: '',
    email: '',
    symbol: '',
    location: ''
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'categories':
          endpoint = '/api/settings/inventory/categories';
          break;
        case 'suppliers':
          endpoint = '/api/settings/inventory/suppliers';
          break;
        case 'units':
          endpoint = '/api/settings/inventory/units';
          break;
        case 'warehouses':
          endpoint = '/api/settings/inventory/warehouses';
          break;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        switch (activeTab) {
          case 'categories':
            setCategories(data.data || []);
            break;
          case 'suppliers':
            setSuppliers(data.data || []);
            break;
          case 'units':
            setUnits(data.data || []);
            break;
          case 'warehouses':
            setWarehouses(data.data || []);
            break;
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      switch (activeTab) {
        case 'categories': setCategories(MOCK_CATEGORIES); break;
        case 'suppliers': setSuppliers(MOCK_SUPPLIERS); break;
        case 'units': setUnits(MOCK_UNITS); break;
        case 'warehouses': setWarehouses(MOCK_WAREHOUSES); break;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      let endpoint = '';
      let body: any = {};

      switch (activeTab) {
        case 'categories':
          endpoint = '/api/settings/inventory/categories';
          body = { name: formData.name, description: formData.description };
          break;
        case 'suppliers':
          endpoint = '/api/settings/inventory/suppliers';
          body = {
            name: formData.name,
            contact: formData.contact,
            phone: formData.phone,
            email: formData.email,
            address: formData.address
          };
          break;
        case 'units':
          endpoint = '/api/settings/inventory/units';
          body = { name: formData.name, symbol: formData.symbol };
          break;
        case 'warehouses':
          endpoint = '/api/settings/inventory/warehouses';
          body = { name: formData.name, location: formData.location, description: formData.description };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        alert('Data berhasil ditambahkan!');
        setShowAddModal(false);
        resetForm();
        fetchData();
      } else {
        alert('Gagal menambahkan data: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding data:', error);
      alert('Terjadi kesalahan saat menambahkan data');
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;

    try {
      let endpoint = '';
      let body: any = {};

      switch (activeTab) {
        case 'categories':
          endpoint = `/api/settings/inventory/categories/${selectedItem.id}`;
          body = { name: formData.name, description: formData.description };
          break;
        case 'suppliers':
          endpoint = `/api/settings/inventory/suppliers/${selectedItem.id}`;
          body = {
            name: formData.name,
            contact: formData.contact,
            phone: formData.phone,
            email: formData.email,
            address: formData.address
          };
          break;
        case 'units':
          endpoint = `/api/settings/inventory/units/${selectedItem.id}`;
          body = { name: formData.name, symbol: formData.symbol };
          break;
        case 'warehouses':
          endpoint = `/api/settings/inventory/warehouses/${selectedItem.id}`;
          body = { name: formData.name, location: formData.location, description: formData.description };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        alert('Data berhasil diupdate!');
        setShowEditModal(false);
        resetForm();
        fetchData();
      } else {
        alert('Gagal mengupdate data: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating data:', error);
      alert('Terjadi kesalahan saat mengupdate data');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    try {
      let endpoint = '';
      switch (activeTab) {
        case 'categories':
          endpoint = `/api/settings/inventory/categories/${id}`;
          break;
        case 'suppliers':
          endpoint = `/api/settings/inventory/suppliers/${id}`;
          break;
        case 'units':
          endpoint = `/api/settings/inventory/units/${id}`;
          break;
        case 'warehouses':
          endpoint = `/api/settings/inventory/warehouses/${id}`;
          break;
      }

      const response = await fetch(endpoint, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        alert('Data berhasil dihapus!');
        fetchData();
      } else {
        alert('Gagal menghapus data: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Terjadi kesalahan saat menghapus data');
    }
  };

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      code: item.code || '',
      contact: item.contact || '',
      address: item.address || '',
      phone: item.phone || '',
      email: item.email || '',
      symbol: item.symbol || '',
      location: item.location || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      contact: '',
      address: '',
      phone: '',
      email: '',
      symbol: '',
      location: ''
    });
    setSelectedItem(null);
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'categories':
        return categories;
      case 'suppliers':
        return suppliers;
      case 'units':
        return units;
      case 'warehouses':
        return warehouses;
      default:
        return [];
    }
  };

  const filteredData = getCurrentData().filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-orange-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengaturan Inventory...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Pengaturan Inventory | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Pengaturan Inventory</h1>
              <p className="text-orange-100">
                Kelola kategori, supplier, satuan, dan gudang
              </p>
            </div>
            <FaBoxOpen className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaTags className="text-2xl text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Kategori</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaTruck className="text-2xl text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Supplier</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaRuler className="text-2xl text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Unit</p>
              <p className="text-2xl font-bold text-gray-900">{units.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaWarehouse className="text-2xl text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Gudang</p>
              <p className="text-2xl font-bold text-gray-900">{warehouses.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'categories'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaTags className="inline mr-2" />
                Kategori
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'suppliers'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaTruck className="inline mr-2" />
                Supplier
              </button>
              <button
                onClick={() => setActiveTab('units')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'units'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaRuler className="inline mr-2" />
                Unit
              </button>
              <button
                onClick={() => setActiveTab('warehouses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'warehouses'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaWarehouse className="inline mr-2" />
                Gudang
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Search and Add */}
            <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Cari ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <FaPlus className="mr-2" />
                Tambah {activeTab === 'categories' ? 'Kategori' : 
                        activeTab === 'suppliers' ? 'Supplier' :
                        activeTab === 'units' ? 'Unit' : 'Gudang'}
              </Button>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    {activeTab === 'suppliers' && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Kontak
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Telepon
                        </th>
                      </>
                    )}
                    {activeTab === 'units' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Simbol
                      </th>
                    )}
                    {activeTab === 'warehouses' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Lokasi
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        </td>
                        {activeTab === 'suppliers' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{item.contact || '-'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900">{item.phone || '-'}</span>
                            </td>
                          </>
                        )}
                        {activeTab === 'units' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{item.symbol || '-'}</span>
                          </td>
                        )}
                        {activeTab === 'warehouses' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{item.location || '-'}</span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{item.description || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Hapus"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">
                Tambah {activeTab === 'categories' ? 'Kategori' : 
                        activeTab === 'suppliers' ? 'Supplier' :
                        activeTab === 'units' ? 'Unit' : 'Gudang'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Nama"
                  />
                </div>

                {activeTab === 'suppliers' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kontak Person
                      </label>
                      <input
                        type="text"
                        value={formData.contact}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Nama kontak"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telepon
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="081234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="supplier@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alamat
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Alamat lengkap"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'units' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Simbol
                    </label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="pcs, kg, liter, dll"
                    />
                  </div>
                )}

                {activeTab === 'warehouses' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Lokasi gudang"
                    />
                  </div>
                )}

                {(activeTab === 'categories' || activeTab === 'warehouses') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Deskripsi singkat"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleAdd}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal - Similar structure to Add Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">
                Edit {activeTab === 'categories' ? 'Kategori' : 
                      activeTab === 'suppliers' ? 'Supplier' :
                      activeTab === 'units' ? 'Unit' : 'Gudang'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {activeTab === 'suppliers' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kontak Person
                      </label>
                      <input
                        type="text"
                        value={formData.contact}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telepon
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alamat
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'units' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Simbol
                    </label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {activeTab === 'warehouses' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {(activeTab === 'categories' || activeTab === 'warehouses') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleEdit}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InventorySettingsPage;
