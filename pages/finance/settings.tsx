import { NextPage } from "next";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  FaCog,
  FaCreditCard,
  FaUniversity,
  FaTags,
  FaBoxes,
  FaChartLine,
  FaSyncAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaMoneyBillWave,
  FaShoppingCart,
  FaUserShield,
  FaHome,
  FaBolt,
  FaDesktop,
  FaCar,
  FaChair,
  FaServer
} from "react-icons/fa";
import {
  useFinanceSettingsSummary,
  usePaymentMethods,
  useBankAccounts,
  useFinanceCategories,
  useChartOfAccounts,
  useCompanyAssets,
  useFinanceSettingsCRUD
} from "@/hooks/useFinanceSettings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PaymentMethodModal,
  BankAccountModal,
  CategoryModal,
  DeleteConfirmationDialog
} from "@/components/finance";

const FinanceSettingsNewPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch data using hooks
  const { summary, isLoading: summaryLoading, refresh: refreshSummary } = useFinanceSettingsSummary();
  const { paymentMethods, isLoading: pmLoading, refresh: refreshPM } = usePaymentMethods(true);
  const { bankAccounts, isLoading: bankLoading, refresh: refreshBank } = useBankAccounts();
  const { categories: expenseCategories, isLoading: expenseLoading, refresh: refreshExpense } = useFinanceCategories('expense');
  const { categories: incomeCategories, isLoading: incomeLoading, refresh: refreshIncome } = useFinanceCategories('income');
  const { accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { assets, isLoading: assetsLoading } = useCompanyAssets();

  // CRUD hooks
  const { create: createPaymentMethod, update: updatePaymentMethod, remove: removePaymentMethod } = useFinanceSettingsCRUD('payment-methods');
  const { create: createBankAccount, update: updateBankAccount, remove: removeBankAccount } = useFinanceSettingsCRUD('bank-accounts');
  const { create: createCategory, update: updateCategory, remove: removeCategory } = useFinanceSettingsCRUD('categories');

  // Modal states
  const [paymentMethodModal, setPaymentMethodModal] = useState({ isOpen: false, mode: 'create' as 'create' | 'edit', data: null as any });
  const [bankAccountModal, setBankAccountModal] = useState({ isOpen: false, mode: 'create' as 'create' | 'edit', data: null as any });
  const [categoryModal, setCategoryModal] = useState({ isOpen: false, mode: 'create' as 'create' | 'edit', data: null as any, type: 'expense' as 'income' | 'expense' });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, type: '', id: 0, name: '' });

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const isLoading = summaryLoading || pmLoading || bankLoading;

  // CRUD Handlers
  const handleSavePaymentMethod = async (data: any) => {
    if (paymentMethodModal.mode === 'create') {
      await createPaymentMethod(data);
    } else {
      await updatePaymentMethod(data);
    }
    refreshPM();
    refreshSummary();
  };

  const handleSaveBankAccount = async (data: any) => {
    if (bankAccountModal.mode === 'create') {
      await createBankAccount(data);
    } else {
      await updateBankAccount(data);
    }
    refreshBank();
    refreshSummary();
  };

  const handleSaveCategory = async (data: any) => {
    if (categoryModal.mode === 'create') {
      await createCategory(data);
    } else {
      await updateCategory(data);
    }
    refreshExpense();
    refreshIncome();
    refreshSummary();
  };

  const handleDelete = async () => {
    if (deleteDialog.type === 'payment-method') {
      await removePaymentMethod(deleteDialog.id);
      refreshPM();
    } else if (deleteDialog.type === 'bank-account') {
      await removeBankAccount(deleteDialog.id);
      refreshBank();
    } else if (deleteDialog.type === 'category') {
      await removeCategory(deleteDialog.id);
      refreshExpense();
      refreshIncome();
    }
    refreshSummary();
  };

  const iconMap: Record<string, React.ReactNode> = {
    FaCreditCard: <FaCreditCard className="w-5 h-5" />,
    FaUniversity: <FaUniversity className="w-5 h-5" />,
    FaTags: <FaTags className="w-5 h-5" />,
    FaMoneyBillWave: <FaMoneyBillWave className="w-5 h-5" />,
    FaShoppingCart: <FaShoppingCart className="w-5 h-5" />,
    FaUserShield: <FaUserShield className="w-5 h-5" />,
    FaHome: <FaHome className="w-5 h-5" />,
    FaBolt: <FaBolt className="w-5 h-5" />,
    FaCog: <FaCog className="w-5 h-5" />,
    FaDesktop: <FaDesktop className="w-5 h-5" />,
    FaCar: <FaCar className="w-5 h-5" />,
    FaChair: <FaChair className="w-5 h-5" />,
    FaServer: <FaServer className="w-5 h-5" />,
  };

  return (
    <FinanceLayout>
      <Head>
        <title>Pengaturan Keuangan - Bedagang</title>
      </Head>

      <div className="space-y-6">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pengaturan Keuangan</h1>
              <p className="text-blue-100">
                Kelola metode pembayaran, rekening bank, kategori, dan pengaturan keuangan lainnya
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  refreshSummary();
                  refreshPM();
                  refreshBank();
                }}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <FaSyncAlt className="mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FaCreditCard className="w-8 h-8 text-blue-500" />
                  <Badge variant="secondary">{summary?.paymentMethods || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Metode Pembayaran</CardTitle>
                <CardDescription>Metode pembayaran aktif</CardDescription>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FaUniversity className="w-8 h-8 text-green-500" />
                  <Badge variant="secondary">{summary?.bankAccounts || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Rekening Bank</CardTitle>
                <CardDescription>Rekening bank terdaftar</CardDescription>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FaTags className="w-8 h-8 text-orange-500" />
                  <Badge variant="secondary">
                    {(summary?.expenseCategories || 0) + (summary?.incomeCategories || 0)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Kategori</CardTitle>
                <CardDescription>Kategori pendapatan & pengeluaran</CardDescription>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <FaChartLine className="w-8 h-8 text-purple-500" />
                  <Badge variant="secondary">{summary?.chartOfAccounts || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Bagan Akun</CardTitle>
                <CardDescription>Chart of Accounts</CardDescription>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="overview">
                  <FaCog className="mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="payment">
                  <FaCreditCard className="mr-2" />
                  Pembayaran
                </TabsTrigger>
                <TabsTrigger value="bank">
                  <FaUniversity className="mr-2" />
                  Bank
                </TabsTrigger>
                <TabsTrigger value="categories">
                  <FaTags className="mr-2" />
                  Kategori
                </TabsTrigger>
                <TabsTrigger value="accounts">
                  <FaChartLine className="mr-2" />
                  Bagan Akun
                </TabsTrigger>
                <TabsTrigger value="assets">
                  <FaBoxes className="mr-2" />
                  Aset
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Company Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Informasi Perusahaan</CardTitle>
                      <CardDescription>Data perusahaan untuk transaksi keuangan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Nama Perusahaan</p>
                        <p className="font-semibold">{summary?.companySettings?.company_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">NPWP</p>
                        <p className="font-semibold">{summary?.companySettings?.company_tax_id || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Mata Uang</p>
                        <p className="font-semibold">{summary?.companySettings?.default_currency || 'IDR'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Primary Bank */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Rekening Bank Utama</CardTitle>
                      <CardDescription>Rekening bank default untuk transaksi</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {summary?.primaryBank ? (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Bank</p>
                            <p className="font-semibold">{summary.primaryBank.bank_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Nomor Rekening</p>
                            <p className="font-semibold">{summary.primaryBank.account_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Atas Nama</p>
                            <p className="font-semibold">{summary.primaryBank.account_name}</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">Belum ada rekening bank utama</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Payment Methods Tab */}
              <TabsContent value="payment" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Metode Pembayaran</h3>
                    <p className="text-sm text-gray-500">Kelola metode pembayaran yang tersedia</p>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setPaymentMethodModal({ isOpen: true, mode: 'create', data: null })}
                  >
                    <FaPlus className="mr-2" />
                    Tambah Metode
                  </Button>
                </div>

                {pmLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Memuat data...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metode</TableHead>
                        <TableHead>Biaya (%)</TableHead>
                        <TableHead>Waktu Proses</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethods.map((method: any) => (
                        <TableRow key={method.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {iconMap[method.icon] || <FaCreditCard className="w-5 h-5" />}
                              <span className="font-medium">{method.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{method.fees}%</TableCell>
                          <TableCell>{method.processing_time}</TableCell>
                          <TableCell>
                            {method.is_active ? (
                              <Badge className="bg-green-100 text-green-800">
                                <FaCheck className="mr-1" /> Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <FaTimes className="mr-1" /> Nonaktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setPaymentMethodModal({ isOpen: true, mode: 'edit', data: method })}
                            >
                              <FaEdit />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => setDeleteDialog({ isOpen: true, type: 'payment-method', id: method.id, name: method.name })}
                            >
                              <FaTrash />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Bank Accounts Tab */}
              <TabsContent value="bank" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Rekening Bank</h3>
                    <p className="text-sm text-gray-500">Kelola rekening bank perusahaan</p>
                  </div>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setBankAccountModal({ isOpen: true, mode: 'create', data: null })}
                  >
                    <FaPlus className="mr-2" />
                    Tambah Rekening
                  </Button>
                </div>

                {bankLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Memuat data...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank</TableHead>
                        <TableHead>Nomor Rekening</TableHead>
                        <TableHead>Atas Nama</TableHead>
                        <TableHead>Cabang</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankAccounts.map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FaUniversity className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="font-medium">{account.bank_name}</p>
                                {account.bank_code && (
                                  <p className="text-xs text-gray-500">Kode: {account.bank_code}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{account.account_number}</TableCell>
                          <TableCell>{account.account_name}</TableCell>
                          <TableCell>{account.branch}</TableCell>
                          <TableCell>
                            {account.is_primary ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                <FaCheck className="mr-1" /> Utama
                              </Badge>
                            ) : account.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setBankAccountModal({ isOpen: true, mode: 'edit', data: account })}
                            >
                              <FaEdit />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => setDeleteDialog({ isOpen: true, type: 'bank-account', id: account.id, name: account.bank_name })}
                            >
                              <FaTrash />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-6">
                {/* Expense Categories */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Kategori Pengeluaran</h3>
                      <p className="text-sm text-gray-500">Kategori untuk mencatat pengeluaran</p>
                    </div>
                    <Button 
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => setCategoryModal({ isOpen: true, mode: 'create', data: null, type: 'expense' })}
                    >
                      <FaPlus className="mr-2" />
                      Tambah Kategori
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenseCategories.map((category: any) => (
                      <Card key={category.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {iconMap[category.icon] || <FaTags className="w-5 h-5" />}
                              <div>
                                <h4 className="font-semibold">{category.name}</h4>
                                <p className="text-xs text-gray-500">{category.code}</p>
                              </div>
                            </div>
                            <Badge className={`bg-${category.color}-100 text-${category.color}-800`}>
                              {category.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setCategoryModal({ isOpen: true, mode: 'edit', data: category, type: 'expense' })}
                            >
                              <FaEdit className="mr-1" /> Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => setDeleteDialog({ isOpen: true, type: 'category', id: category.id, name: category.name })}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Income Categories */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Kategori Pendapatan</h3>
                      <p className="text-sm text-gray-500">Kategori untuk mencatat pendapatan</p>
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setCategoryModal({ isOpen: true, mode: 'create', data: null, type: 'income' })}
                    >
                      <FaPlus className="mr-2" />
                      Tambah Kategori
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {incomeCategories.map((category: any) => (
                      <Card key={category.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {iconMap[category.icon] || <FaTags className="w-5 h-5" />}
                              <div>
                                <h4 className="font-semibold">{category.name}</h4>
                                <p className="text-xs text-gray-500">{category.code}</p>
                              </div>
                            </div>
                            <Badge className={`bg-${category.color}-100 text-${category.color}-800`}>
                              {category.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setCategoryModal({ isOpen: true, mode: 'edit', data: category, type: 'income' })}
                            >
                              <FaEdit className="mr-1" /> Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => setDeleteDialog({ isOpen: true, type: 'category', id: category.id, name: category.name })}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Chart of Accounts Tab */}
              <TabsContent value="accounts" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Bagan Akun (Chart of Accounts)</h3>
                    <p className="text-sm text-gray-500">Kelola akun-akun untuk pembukuan</p>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <FaPlus className="mr-2" />
                    Tambah Akun
                  </Button>
                </div>

                {accountsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Memuat data...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama Akun</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Sub Kategori</TableHead>
                        <TableHead>Saldo Normal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.slice(0, 20).map((account: any) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono font-semibold">{account.code}</TableCell>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{account.sub_category || '-'}</TableCell>
                          <TableCell>
                            <Badge className={account.normal_balance === 'debit' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                              {account.normal_balance}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {account.is_system ? (
                              <Badge variant="secondary">System</Badge>
                            ) : account.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!account.is_system && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <FaEdit />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600">
                                  <FaTrash />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Assets Tab */}
              <TabsContent value="assets" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Aset Perusahaan</h3>
                    <p className="text-sm text-gray-500">Kelola aset dan inventaris perusahaan</p>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <FaPlus className="mr-2" />
                    Tambah Aset
                  </Button>
                </div>

                {assetsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Memuat data...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map((asset: any) => (
                      <Card key={asset.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {iconMap[asset.icon] || <FaBoxes className="w-6 h-6" />}
                              <div>
                                <h4 className="font-semibold">{asset.name}</h4>
                                <p className="text-xs text-gray-500">{asset.code}</p>
                              </div>
                            </div>
                            <Badge>{asset.category}</Badge>
                          </div>
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Nilai Beli:</span>
                              <span className="font-semibold">
                                Rp {asset.purchase_value?.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Nilai Saat Ini:</span>
                              <span className="font-semibold">
                                Rp {asset.current_value?.toLocaleString('id-ID')}
                              </span>
                            </div>
                            {asset.depreciation_rate > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Penyusutan:</span>
                                <span className="font-semibold">{asset.depreciation_rate}%</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{asset.description}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <FaEdit className="mr-1" /> Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600">
                              <FaTrash />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <PaymentMethodModal
        isOpen={paymentMethodModal.isOpen}
        onClose={() => setPaymentMethodModal({ ...paymentMethodModal, isOpen: false })}
        onSave={handleSavePaymentMethod}
        paymentMethod={paymentMethodModal.data}
        mode={paymentMethodModal.mode}
      />

      <BankAccountModal
        isOpen={bankAccountModal.isOpen}
        onClose={() => setBankAccountModal({ ...bankAccountModal, isOpen: false })}
        onSave={handleSaveBankAccount}
        bankAccount={bankAccountModal.data}
        mode={bankAccountModal.mode}
      />

      <CategoryModal
        isOpen={categoryModal.isOpen}
        onClose={() => setCategoryModal({ ...categoryModal, isOpen: false })}
        onSave={handleSaveCategory}
        category={categoryModal.data}
        mode={categoryModal.mode}
        defaultType={categoryModal.type}
      />

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={handleDelete}
        title="Konfirmasi Hapus"
        description="Apakah Anda yakin ingin menghapus data ini?"
        itemName={deleteDialog.name}
      />
    </FinanceLayout>
  );
};

export default FinanceSettingsNewPage;
