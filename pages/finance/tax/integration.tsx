import { NextPage } from "next";
import { useState, useEffect } from "react";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  FaServer, FaSync, FaCheckCircle, FaExclamationTriangle, 
  FaArrowRight, FaChartLine, FaFileInvoiceDollar, FaMoneyBillWave,
  FaClipboardList, FaBuilding, FaCalendarAlt, FaPercent
} from "react-icons/fa";

const TaxIntegrationPage: NextPage = () => {
  const { t } = useTranslation();
  const [integrationData, setIntegrationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Mock integration data
  const mockIntegrationData = {
    posIntegration: {
      status: "active",
      lastSync: "2025-01-29 21:30:00",
      transactionsProcessed: 1247,
      taxCalculated: 137170000,
      errors: 0
    },
    inventoryIntegration: {
      status: "active", 
      lastSync: "2025-01-29 21:25:00",
      purchaseOrdersProcessed: 89,
      inputVATCalculated: 24750000,
      errors: 0
    },
    financeIntegration: {
      status: "active",
      lastSync: "2025-01-29 21:35:00", 
      journalEntriesCreated: 156,
      taxAccountsUpdated: 8,
      errors: 0
    },
    recentTransactions: [
      {
        id: "TRX-10001",
        type: "POS Sale",
        amount: 125000,
        taxAmount: 13750,
        taxType: "PPN",
        status: "processed",
        timestamp: "2025-01-29 21:30:15"
      },
      {
        id: "PO-2025-001",
        type: "Purchase Order",
        amount: 2500000,
        taxAmount: 275000,
        taxType: "PPN Input",
        status: "processed", 
        timestamp: "2025-01-29 21:25:30"
      },
      {
        id: "SAL-2025-001",
        type: "Salary Payment",
        amount: 5000000,
        taxAmount: 250000,
        taxType: "PPh 21",
        status: "processed",
        timestamp: "2025-01-29 21:20:45"
      }
    ]
  };

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setIntegrationData(mockIntegrationData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync process
    setTimeout(() => {
      setSyncing(false);
      setIntegrationData({
        ...integrationData,
        posIntegration: {
          ...integrationData.posIntegration,
          lastSync: typeof window !== 'undefined' ? new Date().toLocaleString('id-ID') : ''
        },
        inventoryIntegration: {
          ...integrationData.inventoryIntegration,
          lastSync: typeof window !== 'undefined' ? new Date().toLocaleString('id-ID') : ''
        },
        financeIntegration: {
          ...integrationData.financeIntegration,
          lastSync: typeof window !== 'undefined' ? new Date().toLocaleString('id-ID') : ''
        }
      });
    }, 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0 
    }).format(amount);
  };

  if (loading) {
    return (
      <FinanceLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </FinanceLayout>
    );
  }

  return (
    <FinanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-orange-800">Integrasi Pajak</h1>
            <p className="text-gray-600">Integrasi otomatis perhitungan pajak dengan modul lain</p>
          </div>
          
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sinkronisasi...
              </>
            ) : (
              <>
                <FaSync className="h-4 w-4 mr-2" />
                Sinkronisasi Sekarang
              </>
            )}
          </Button>
        </div>

        {/* Integration Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* POS Integration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-orange-800">Integrasi POS</CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <FaCheckCircle className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Transaksi Diproses</span>
                  <span className="font-medium">{integrationData.posIntegration.transactionsProcessed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pajak Dihitung</span>
                  <span className="font-medium">{formatCurrency(integrationData.posIntegration.taxCalculated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sinkronisasi Terakhir</span>
                  <span className="text-xs text-gray-500">{integrationData.posIntegration.lastSync}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Integration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-orange-800">Integrasi Inventaris</CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <FaCheckCircle className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">PO Diproses</span>
                  <span className="font-medium">{integrationData.inventoryIntegration.purchaseOrdersProcessed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">PPN Masukan</span>
                  <span className="font-medium">{formatCurrency(integrationData.inventoryIntegration.inputVATCalculated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sinkronisasi Terakhir</span>
                  <span className="text-xs text-gray-500">{integrationData.inventoryIntegration.lastSync}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finance Integration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-orange-800">Integrasi Keuangan</CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <FaCheckCircle className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Jurnal Dibuat</span>
                  <span className="font-medium">{integrationData.financeIntegration.journalEntriesCreated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Akun Pajak Diupdate</span>
                  <span className="font-medium">{integrationData.financeIntegration.taxAccountsUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sinkronisasi Terakhir</span>
                  <span className="text-xs text-gray-500">{integrationData.financeIntegration.lastSync}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Flow Diagram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-orange-800">Alur Integrasi Pajak</CardTitle>
            <CardDescription>Diagram alur otomatis perhitungan dan pencatatan pajak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
              {/* POS */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-3">
                  <FaMoneyBillWave className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Transaksi POS</h3>
                <p className="text-sm text-gray-600">Penjualan & Pembayaran</p>
              </div>

              <FaArrowRight className="h-6 w-6 text-gray-400 hidden md:block" />

              {/* Tax Calculation */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-3">
                  <FaPercent className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Perhitungan Pajak</h3>
                <p className="text-sm text-gray-600">PPN & PPh Otomatis</p>
              </div>

              <FaArrowRight className="h-6 w-6 text-gray-400 hidden md:block" />

              {/* Finance Journal */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mb-3">
                  <FaClipboardList className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Jurnal Keuangan</h3>
                <p className="text-sm text-gray-600">Pencatatan Otomatis</p>
              </div>

              <FaArrowRight className="h-6 w-6 text-gray-400 hidden md:block" />

              {/* Reporting */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-3">
                  <FaChartLine className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Laporan Pajak</h3>
                <p className="text-sm text-gray-600">SPT & Rekapitulasi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tax Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-orange-800">Transaksi Pajak Terbaru</CardTitle>
            <CardDescription>Transaksi yang telah diproses sistem pajak otomatis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaksi</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Pajak</TableHead>
                    <TableHead>Jenis Pajak</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrationData.recentTransactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.id}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>{formatCurrency(transaction.taxAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {transaction.taxType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <FaCheckCircle className="h-3 w-3 mr-1" />
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{transaction.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-orange-800">Pengaturan Integrasi</CardTitle>
            <CardDescription>Konfigurasi integrasi pajak dengan modul lain</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pos" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pos">POS</TabsTrigger>
                <TabsTrigger value="inventory">Inventaris</TabsTrigger>
                <TabsTrigger value="finance">Keuangan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pos" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auto Calculate PPN</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PPN Rate</label>
                    <span className="text-sm">11%</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auto Journal Entry</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sync Frequency</label>
                    <span className="text-sm">Real-time</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="inventory" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auto Calculate Input VAT</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchase Order Integration</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock Movement Tax</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sync Frequency</label>
                    <span className="text-sm">Hourly</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="finance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auto Journal Creation</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tax Account Mapping</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monthly Closing</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Automated
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Generation</label>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <FaCheckCircle className="h-3 w-3 mr-1" />
                      Automated
                    </Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </FinanceLayout>
  );
};

export default TaxIntegrationPage;
