import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FaTicketAlt, FaPlus, FaEdit, FaTrash, FaSearch, FaFilter,
  FaPercentage, FaMoneyBillWave, FaCalendarAlt, FaUsers,
  FaChartLine, FaCopy, FaDownload, FaTag
} from 'react-icons/fa';

const PromoVoucherPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('promo');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'promo' | 'voucher'>('promo');
  
  // Data states
  const MOCK_PROMOS = [{ id: 'p1', name: 'Diskon Weekend 20%', code: 'WEEKEND20', type: 'percentage', value: 20, minPurchase: 100000, maxDiscount: 50000, startDate: '2026-03-01', endDate: '2026-03-31', usageLimit: 500, usedCount: 185, status: 'active', autoApply: false }, { id: 'p2', name: 'Cashback Rp 25.000', code: 'CASH25K', type: 'fixed', value: 25000, minPurchase: 150000, maxDiscount: 25000, startDate: '2026-03-10', endDate: '2026-04-10', usageLimit: 200, usedCount: 42, status: 'active', autoApply: true }];
  const MOCK_VOUCHERS = [{ id: 'v1', code: 'VCH-LOYAL-001', description: 'Voucher loyal customer', category: 'loyalty', type: 'fixed', value: 50000, minPurchase: 200000, maxDiscount: 50000, validFrom: '2026-03-01', validUntil: '2026-06-30', usageLimit: 1, usedCount: 0, status: 'active' }];
  const MOCK_PV_STATS = { totalActivePromos: 5, totalActiveVouchers: 12, totalUsageThisMonth: 342, totalDiscountGiven: 8500000 };
  const [promos, setPromos] = useState<any[]>(MOCK_PROMOS);
  const [vouchers, setVouchers] = useState<any[]>(MOCK_VOUCHERS);
  const [stats, setStats] = useState(MOCK_PV_STATS);
  
  // Form states
  const [promoFormData, setPromoFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'percentage',
    value: 0,
    minPurchase: 0,
    maxDiscount: 0,
    startDate: '',
    endDate: '',
    usageLimit: 0,
    perUserLimit: 1,
    promoScope: 'general',
    autoApply: false,
    stackable: false,
    priority: 0
  });

  // Product selector states
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);

  // Bundle creator states
  const [bundleProducts, setBundleProducts] = useState<any[]>([]);
  const [bundleType, setBundleType] = useState('fixed_bundle');
  const [bundlePrice, setBundlePrice] = useState(0);
  const [bundleName, setBundleName] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  
  const [voucherFormData, setVoucherFormData] = useState({
    code: '',
    description: '',
    category: 'custom',
    type: 'fixed',
    value: 0,
    minPurchase: 0,
    maxDiscount: 0,
    validFrom: '',
    validUntil: '',
    usageLimit: 0,
    perUserLimit: 1,
    applicableFor: 'all'
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
      fetchProducts();
    }
  }, [session, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/promo-voucher/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data.overview);
      }

      // Fetch promos or vouchers based on active tab
      if (activeTab === 'promo') {
        const promosRes = await fetch('/api/promo-voucher/promos');
        const promosData = await promosRes.json();
        if (promosData.success) {
          setPromos(promosData.data);
        }
      } else {
        const vouchersRes = await fetch('/api/promo-voucher/vouchers');
        const vouchersData = await vouchersRes.json();
        if (vouchersData.success) {
          setVouchers(vouchersData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setStats(MOCK_PV_STATS);
      if (activeTab === 'promo') setPromos(MOCK_PROMOS);
      else setVouchers(MOCK_VOUCHERS);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/promo-voucher/products-list?inStock=true');
      const data = await response.json();
      if (data.success) {
        setAvailableProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleProductSelect = (product: any) => {
    const exists = selectedProducts.find(p => p.productId === product.id);
    if (!exists) {
      setSelectedProducts([...selectedProducts, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        price: product.price,
        discountType: 'percentage',
        discountValue: 10,
        minQuantity: 1
      }]);
    }
  };

  const handleProductRemove = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleBundleProductAdd = (product: any) => {
    const exists = bundleProducts.find(p => p.productId === product.id);
    if (!exists) {
      setBundleProducts([...bundleProducts, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        isFree: false,
        price: product.price
      }]);
    }
  };

  const handleBundleProductRemove = (productId: string) => {
    setBundleProducts(bundleProducts.filter(p => p.productId !== productId));
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/promo-voucher/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoFormData)
      });
      const data = await response.json();
      if (data.success) {
        alert('Promo berhasil dibuat!');
        setShowCreateModal(false);
        resetPromoForm();
        fetchData();
      } else {
        alert(data.error || 'Gagal membuat promo');
      }
    } catch (error) {
      console.error('Error creating promo:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEditPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const response = await fetch(`/api/promo-voucher/promos?id=${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoFormData)
      });
      const data = await response.json();
      if (data.success) {
        alert('Promo berhasil diupdate!');
        setShowEditModal(false);
        setSelectedItem(null);
        resetPromoForm();
        fetchData();
      } else {
        alert(data.error || 'Gagal mengupdate promo');
      }
    } catch (error) {
      console.error('Error updating promo:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus promo ini?')) return;
    try {
      const response = await fetch(`/api/promo-voucher/promos?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        alert('Promo berhasil dihapus!');
        fetchData();
      } else {
        alert(data.error || 'Gagal menghapus promo');
      }
    } catch (error) {
      console.error('Error deleting promo:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/promo-voucher/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherFormData)
      });
      const data = await response.json();
      if (data.success) {
        alert('Voucher berhasil dibuat!');
        setShowCreateModal(false);
        resetVoucherForm();
        fetchData();
      } else {
        alert(data.error || 'Gagal membuat voucher');
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEditVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const response = await fetch(`/api/promo-voucher/vouchers?id=${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherFormData)
      });
      const data = await response.json();
      if (data.success) {
        alert('Voucher berhasil diupdate!');
        setShowEditModal(false);
        setSelectedItem(null);
        resetVoucherForm();
        fetchData();
      } else {
        alert(data.error || 'Gagal mengupdate voucher');
      }
    } catch (error) {
      console.error('Error updating voucher:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus voucher ini?')) return;
    try {
      const response = await fetch(`/api/promo-voucher/vouchers?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        alert('Voucher berhasil dihapus!');
        fetchData();
      } else {
        alert(data.error || 'Gagal menghapus voucher');
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Terjadi kesalahan');
    }
  };

  const openCreateModal = (type: 'promo' | 'voucher') => {
    setModalType(type);
    setSelectedItem(null);
    if (type === 'promo') {
      resetPromoForm();
    } else {
      resetVoucherForm();
    }
    setShowCreateModal(true);
  };

  const openEditPromoModal = (promo: any) => {
    setSelectedItem(promo);
    setPromoFormData({
      name: promo.name,
      code: promo.code,
      description: promo.description || '',
      type: promo.type,
      value: promo.value,
      minPurchase: promo.minPurchase,
      maxDiscount: promo.maxDiscount || 0,
      startDate: promo.startDate.split('T')[0],
      endDate: promo.endDate.split('T')[0],
      usageLimit: promo.usageLimit || 0,
      perUserLimit: promo.perUserLimit || 1,
      promoScope: promo.promoScope || 'general',
      autoApply: promo.autoApply || false,
      stackable: promo.stackable || false,
      priority: promo.priority || 0
    });
    setShowEditModal(true);
    setModalType('promo');
  };

  const openEditVoucherModal = (voucher: any) => {
    setSelectedItem(voucher);
    setVoucherFormData({
      code: voucher.code,
      description: voucher.description || '',
      category: voucher.category,
      type: voucher.type,
      value: voucher.value,
      minPurchase: voucher.minPurchase,
      maxDiscount: voucher.maxDiscount || 0,
      validFrom: voucher.validFrom.split('T')[0],
      validUntil: voucher.validUntil.split('T')[0],
      usageLimit: voucher.usageLimit || 0,
      perUserLimit: voucher.perUserLimit || 1,
      applicableFor: voucher.applicableFor
    });
    setShowEditModal(true);
    setModalType('voucher');
  };

  const resetPromoForm = () => {
    setPromoFormData({
      name: '',
      code: '',
      description: '',
      type: 'percentage',
      value: 0,
      minPurchase: 0,
      maxDiscount: 0,
      startDate: '',
      endDate: '',
      usageLimit: 0,
      perUserLimit: 1,
      promoScope: 'general',
      autoApply: false,
      stackable: false,
      priority: 0
    });
    setSelectedProducts([]);
    setBundleProducts([]);
    setBundleName('');
    setBundleDescription('');
    setBundlePrice(0);
  };

  const resetVoucherForm = () => {
    setVoucherFormData({
      code: '',
      description: '',
      category: 'custom',
      type: 'fixed',
      value: 0,
      minPurchase: 0,
      maxDiscount: 0,
      validFrom: '',
      validUntil: '',
      usageLimit: 0,
      perUserLimit: 1,
      applicableFor: 'all'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Kode berhasil disalin!');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const statsDisplay = [
    { label: 'Total Promo Aktif', value: stats.totalActivePromos.toString(), icon: FaTicketAlt, color: 'bg-blue-500' },
    { label: 'Total Voucher Aktif', value: stats.totalActiveVouchers.toString(), icon: FaTag, color: 'bg-green-500' },
    { label: 'Penggunaan Bulan Ini', value: stats.totalUsageThisMonth.toLocaleString(), icon: FaUsers, color: 'bg-purple-500' },
    { label: 'Total Diskon Diberikan', value: formatCurrency(stats.totalDiscountGiven), icon: FaMoneyBillWave, color: 'bg-orange-500' },
  ];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-purple-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Promo & Voucher Management | BEDAGANG</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <FaTicketAlt className="mr-3 h-6 w-6" />
                Promo & Voucher Management
              </h1>
              <p className="text-purple-50 mt-1 text-sm">
                Kelola promo, voucher, dan diskon untuk pelanggan
              </p>
            </div>
            <Button 
              className="bg-white text-purple-600 hover:bg-purple-50"
              onClick={() => openCreateModal(activeTab as 'promo' | 'voucher')}
            >
              <FaPlus className="mr-2 h-4 w-4" />
              Buat {activeTab === 'promo' ? 'Promo' : 'Voucher'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsDisplay.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger 
              value="promo"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <FaPercentage className="mr-2 h-4 w-4" /> Promo
            </TabsTrigger>
            <TabsTrigger 
              value="voucher"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <FaTag className="mr-2 h-4 w-4" /> Voucher
            </TabsTrigger>
          </TabsList>

          {/* Promo Tab */}
          <TabsContent value="promo" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Promo</CardTitle>
                    <CardDescription>Kelola promo dan diskon untuk pelanggan</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <FaFilter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <FaDownload className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Cari promo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Promo</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Nilai</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Penggunaan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promos.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell className="font-medium">{promo.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm">{promo.code}</code>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(promo.code)}>
                                <FaCopy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={promo.type === 'percentage' ? 'default' : 'secondary'}>
                              {promo.type === 'percentage' ? 'Persentase' : 'Fixed'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {promo.used} / {promo.limit}
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-purple-600 h-1.5 rounded-full" 
                                  style={{ width: `${(promo.used / promo.limit) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={promo.status === 'active' ? 'default' : 'secondary'}>
                              {promo.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditPromoModal(promo)}>
                                <FaEdit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeletePromo(promo.id)}>
                                <FaTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voucher Tab */}
          <TabsContent value="voucher" className="mt-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daftar Voucher</CardTitle>
                    <CardDescription>Kelola voucher untuk pelanggan</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <FaFilter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <FaDownload className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Cari voucher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Voucher</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Nilai</TableHead>
                        <TableHead>Min. Pembelian</TableHead>
                        <TableHead>Valid Hingga</TableHead>
                        <TableHead>Penggunaan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <code className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-semibold">
                                {voucher.code}
                              </code>
                              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(voucher.code)}>
                                <FaCopy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {voucher.category === 'welcome' ? 'Welcome' : 
                               voucher.category === 'member' ? 'Member' : 'Birthday'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={voucher.type === 'percentage' ? 'default' : 'secondary'}>
                              {voucher.type === 'percentage' ? 'Persentase' : 'Fixed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {voucher.type === 'percentage' ? `${voucher.value}%` : formatCurrency(voucher.value)}
                          </TableCell>
                          <TableCell>{formatCurrency(voucher.minPurchase)}</TableCell>
                          <TableCell>{formatDate(voucher.validUntil)}</TableCell>
                          <TableCell>
                            {voucher.used} {voucher.limit ? `/ ${voucher.limit}` : '/ Unlimited'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={voucher.status === 'active' ? 'default' : 'secondary'}>
                              {voucher.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditVoucherModal(voucher)}>
                                <FaEdit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteVoucher(voucher.id)}>
                                <FaTrash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Promo Modal */}
        {showCreateModal && modalType === 'promo' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Buat Promo Baru</h3>
              <form onSubmit={handleCreatePromo}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Promo *</label>
                      <Input
                        required
                        value={promoFormData.name}
                        onChange={(e) => setPromoFormData({...promoFormData, name: e.target.value})}
                        placeholder="e.g., Diskon Akhir Tahun"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Promo *</label>
                      <Input
                        required
                        value={promoFormData.code}
                        onChange={(e) => setPromoFormData({...promoFormData, code: e.target.value.toUpperCase()})}
                        placeholder="e.g., NEWYEAR2026"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <Textarea
                      value={promoFormData.description}
                      onChange={(e) => setPromoFormData({...promoFormData, description: e.target.value})}
                      placeholder="Deskripsi promo"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon *</label>
                      <Select value={promoFormData.type} onValueChange={(value) => setPromoFormData({...promoFormData, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Persentase (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nilai Diskon * {promoFormData.type === 'percentage' ? '(%)' : '(Rp)'}
                      </label>
                      <Input
                        type="number"
                        required
                        min="0"
                        value={promoFormData.value}
                        onChange={(e) => setPromoFormData({...promoFormData, value: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pembelian (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={promoFormData.minPurchase}
                        onChange={(e) => setPromoFormData({...promoFormData, minPurchase: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max. Diskon (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={promoFormData.maxDiscount}
                        onChange={(e) => setPromoFormData({...promoFormData, maxDiscount: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                      <Input
                        type="date"
                        required
                        value={promoFormData.startDate}
                        onChange={(e) => setPromoFormData({...promoFormData, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir *</label>
                      <Input
                        type="date"
                        required
                        value={promoFormData.endDate}
                        onChange={(e) => setPromoFormData({...promoFormData, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Penggunaan</label>
                      <Input
                        type="number"
                        min="0"
                        value={promoFormData.usageLimit}
                        onChange={(e) => setPromoFormData({...promoFormData, usageLimit: parseInt(e.target.value)})}
                        placeholder="0 = unlimited"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Per User</label>
                      <Input
                        type="number"
                        min="1"
                        value={promoFormData.perUserLimit}
                        onChange={(e) => setPromoFormData({...promoFormData, perUserLimit: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetPromoForm(); }} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Simpan
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Promo Modal */}
        {showEditModal && modalType === 'promo' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Edit Promo</h3>
              <form onSubmit={handleEditPromo}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Promo *</label>
                      <Input
                        required
                        value={promoFormData.name}
                        onChange={(e) => setPromoFormData({...promoFormData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Promo *</label>
                      <Input
                        required
                        value={promoFormData.code}
                        onChange={(e) => setPromoFormData({...promoFormData, code: e.target.value.toUpperCase()})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <Textarea
                      value={promoFormData.description}
                      onChange={(e) => setPromoFormData({...promoFormData, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon *</label>
                      <Select value={promoFormData.type} onValueChange={(value) => setPromoFormData({...promoFormData, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Persentase (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nilai Diskon * {promoFormData.type === 'percentage' ? '(%)' : '(Rp)'}
                      </label>
                      <Input
                        type="number"
                        required
                        min="0"
                        value={promoFormData.value}
                        onChange={(e) => setPromoFormData({...promoFormData, value: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pembelian (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={promoFormData.minPurchase}
                        onChange={(e) => setPromoFormData({...promoFormData, minPurchase: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max. Diskon (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={promoFormData.maxDiscount}
                        onChange={(e) => setPromoFormData({...promoFormData, maxDiscount: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                      <Input
                        type="date"
                        required
                        value={promoFormData.startDate}
                        onChange={(e) => setPromoFormData({...promoFormData, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir *</label>
                      <Input
                        type="date"
                        required
                        value={promoFormData.endDate}
                        onChange={(e) => setPromoFormData({...promoFormData, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Penggunaan</label>
                      <Input
                        type="number"
                        min="0"
                        value={promoFormData.usageLimit}
                        onChange={(e) => setPromoFormData({...promoFormData, usageLimit: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Per User</label>
                      <Input
                        type="number"
                        min="1"
                        value={promoFormData.perUserLimit}
                        onChange={(e) => setPromoFormData({...promoFormData, perUserLimit: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setSelectedItem(null); resetPromoForm(); }} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Update
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Voucher Modal */}
        {showCreateModal && modalType === 'voucher' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Buat Voucher Baru</h3>
              <form onSubmit={handleCreateVoucher}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Voucher *</label>
                      <Input
                        required
                        value={voucherFormData.code}
                        onChange={(e) => setVoucherFormData({...voucherFormData, code: e.target.value.toUpperCase()})}
                        placeholder="e.g., WELCOME50K"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                      <Select value={voucherFormData.category} onValueChange={(value) => setVoucherFormData({...voucherFormData, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="welcome">Welcome</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="birthday">Birthday</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <Textarea
                      value={voucherFormData.description}
                      onChange={(e) => setVoucherFormData({...voucherFormData, description: e.target.value})}
                      placeholder="Deskripsi voucher"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon *</label>
                      <Select value={voucherFormData.type} onValueChange={(value) => setVoucherFormData({...voucherFormData, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Persentase (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nilai * {voucherFormData.type === 'percentage' ? '(%)' : '(Rp)'}
                      </label>
                      <Input
                        type="number"
                        required
                        min="0"
                        value={voucherFormData.value}
                        onChange={(e) => setVoucherFormData({...voucherFormData, value: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pembelian (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={voucherFormData.minPurchase}
                        onChange={(e) => setVoucherFormData({...voucherFormData, minPurchase: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max. Diskon (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={voucherFormData.maxDiscount}
                        onChange={(e) => setVoucherFormData({...voucherFormData, maxDiscount: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Dari</label>
                      <Input
                        type="date"
                        value={voucherFormData.validFrom}
                        onChange={(e) => setVoucherFormData({...voucherFormData, validFrom: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Hingga *</label>
                      <Input
                        type="date"
                        required
                        value={voucherFormData.validUntil}
                        onChange={(e) => setVoucherFormData({...voucherFormData, validUntil: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Penggunaan</label>
                      <Input
                        type="number"
                        min="0"
                        value={voucherFormData.usageLimit}
                        onChange={(e) => setVoucherFormData({...voucherFormData, usageLimit: parseInt(e.target.value)})}
                        placeholder="0 = unlimited"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Per User</label>
                      <Input
                        type="number"
                        min="1"
                        value={voucherFormData.perUserLimit}
                        onChange={(e) => setVoucherFormData({...voucherFormData, perUserLimit: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Untuk</label>
                    <Select value={voucherFormData.applicableFor} onValueChange={(value) => setVoucherFormData({...voucherFormData, applicableFor: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Customer</SelectItem>
                        <SelectItem value="new_customer">Customer Baru</SelectItem>
                        <SelectItem value="existing_customer">Customer Lama</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetVoucherForm(); }} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Simpan
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Voucher Modal */}
        {showEditModal && modalType === 'voucher' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Edit Voucher</h3>
              <form onSubmit={handleEditVoucher}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kode Voucher *</label>
                      <Input
                        required
                        value={voucherFormData.code}
                        onChange={(e) => setVoucherFormData({...voucherFormData, code: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                      <Select value={voucherFormData.category} onValueChange={(value) => setVoucherFormData({...voucherFormData, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="welcome">Welcome</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="birthday">Birthday</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                    <Textarea
                      value={voucherFormData.description}
                      onChange={(e) => setVoucherFormData({...voucherFormData, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon *</label>
                      <Select value={voucherFormData.type} onValueChange={(value) => setVoucherFormData({...voucherFormData, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Persentase (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nilai * {voucherFormData.type === 'percentage' ? '(%)' : '(Rp)'}
                      </label>
                      <Input
                        type="number"
                        required
                        min="0"
                        value={voucherFormData.value}
                        onChange={(e) => setVoucherFormData({...voucherFormData, value: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pembelian (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={voucherFormData.minPurchase}
                        onChange={(e) => setVoucherFormData({...voucherFormData, minPurchase: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max. Diskon (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={voucherFormData.maxDiscount}
                        onChange={(e) => setVoucherFormData({...voucherFormData, maxDiscount: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Dari</label>
                      <Input
                        type="date"
                        value={voucherFormData.validFrom}
                        onChange={(e) => setVoucherFormData({...voucherFormData, validFrom: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Hingga *</label>
                      <Input
                        type="date"
                        required
                        value={voucherFormData.validUntil}
                        onChange={(e) => setVoucherFormData({...voucherFormData, validUntil: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Penggunaan</label>
                      <Input
                        type="number"
                        min="0"
                        value={voucherFormData.usageLimit}
                        onChange={(e) => setVoucherFormData({...voucherFormData, usageLimit: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Batas Per User</label>
                      <Input
                        type="number"
                        min="1"
                        value={voucherFormData.perUserLimit}
                        onChange={(e) => setVoucherFormData({...voucherFormData, perUserLimit: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Untuk</label>
                    <Select value={voucherFormData.applicableFor} onValueChange={(value) => setVoucherFormData({...voucherFormData, applicableFor: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Customer</SelectItem>
                        <SelectItem value="new_customer">Customer Baru</SelectItem>
                        <SelectItem value="existing_customer">Customer Lama</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setSelectedItem(null); resetVoucherForm(); }} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Update
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PromoVoucherPage;
