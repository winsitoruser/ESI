import { NextPage } from "next";
import { useState } from "react";
import Link from "next/link";
import FinanceLayout from "@/components/layouts/finance-layout";
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FaChartLine, FaFileInvoiceDollar, FaPercent, FaIdCard, 
  FaBuilding, FaCalendarAlt, FaExclamationTriangle, 
  FaCheckCircle, FaArrowRight, FaServer, FaRegFileAlt,
  FaChartBar, FaChartPie, FaClipboardList, FaMoneyBillWave
} from "react-icons/fa";

const TaxDashboard: NextPage = () => {
  const { t } = useTranslation();
  // Simple tax summary data - no complex state management
  const taxSummary = {
    ppn: {
      inputVAT: 15250000,
      outputVAT: 28750000,
      netVAT: 13500000,
      transactionCount: 145,
      nextDueDate: "15 April 2025",
      status: "Belum Dibayar"
    },
    pph21: {
      monthlyTax: 3600000,
      employeeCount: 24,
      nextDueDate: "15 April 2025",
      status: "Belum Dibayar"
    },
    pphBadan: {
      quarterlyTax: 18500000,
      annualTax: 74000000,
      nextDueDate: "30 April 2025",
      status: "Belum Dibayar"
    }
  };

  // Tax menu items
  const taxMenuItems = [
    {
      title: "PPN",
      description: "Pajak Pertambahan Nilai",
      icon: <FaPercent className="h-8 w-8 text-white" />,
      path: "/finance/tax/ppn",
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "PPh 21",
      description: "Pajak Penghasilan Karyawan",
      icon: <FaIdCard className="h-8 w-8 text-white" />,
      path: "/finance/tax/pph21",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "PPh Badan",
      description: "Pajak Penghasilan Perusahaan",
      icon: <FaBuilding className="h-8 w-8 text-white" />,
      path: "/finance/tax/pphbadan",
      color: "from-orange-400 to-amber-500"
    },
    {
      title: "Faktur Pajak",
      description: "Pengelolaan Faktur Pajak (e-Faktur)",
      icon: <FaFileInvoiceDollar className="h-8 w-8 text-white" />,
      path: "/finance/tax/invoices",
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "Integrasi DJP",
      description: "Integrasi dengan Sistem DJP",
      icon: <FaServer className="h-8 w-8 text-white" />,
      path: "/finance/tax/djp",
      color: "from-amber-500 to-amber-600"
    },
    {
      title: "Laporan Pajak",
      description: "Laporan dan SPT Pajak",
      icon: <FaChartBar className="h-8 w-8 text-white" />,
      path: "/finance/tax/reports",
      color: "from-orange-400 to-amber-500"
    }
  ];

  return (
    <FinanceLayout>
      <div className="flex flex-col space-y-6 p-8 relative">
        {/* Decorative background elements */}
        <div className="absolute top-24 right-12 w-72 h-72 bg-gradient-to-br from-orange-200/30 to-amber-100/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-24 left-12 w-80 h-80 bg-gradient-to-tr from-amber-100/30 to-orange-200/20 rounded-full blur-3xl -z-10" />
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Manajemen Pajak</h2>
            <p className="text-muted-foreground">Pengelolaan seluruh aspek perpajakan perusahaan</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
          >
            Unduh Laporan Pajak
          </Button>
        </div>

        {/* Tax Summary Section */}
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-orange-100">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle>Ringkasan Pajak</CardTitle>
            <CardDescription>Ringkasan status pajak saat ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PPN Summary */}
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-orange-50 border border-orange-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 mr-3">
                      <FaPercent className="h-4 w-4 text-white" />
                    </span>
                    <span className="font-semibold text-orange-900">PPN</span>
                  </div>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                    <FaExclamationTriangle className="h-3 w-3 mr-1" /> {taxSummary.ppn.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">PPN Keluaran</p>
                    <p className="font-medium">Rp {taxSummary.ppn.outputVAT.toLocaleString('id')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">PPN Masukan</p>
                    <p className="font-medium">Rp {taxSummary.ppn.inputVAT.toLocaleString('id')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Kurang/Lebih Bayar</p>
                  <p className="text-lg font-bold text-orange-600">Rp {taxSummary.ppn.netVAT.toLocaleString('id')}</p>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                  <div className="flex items-center">
                    <FaCalendarAlt className="h-3 w-3 mr-1" /> {taxSummary.ppn.nextDueDate}
                  </div>
                  <div>
                    {taxSummary.ppn.transactionCount} Transaksi
                  </div>
                </div>
              </div>

              {/* PPh 21 Summary */}
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-orange-50 border border-orange-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 mr-3">
                      <FaIdCard className="h-4 w-4 text-white" />
                    </span>
                    <span className="font-semibold text-orange-900">PPh 21</span>
                  </div>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                    <FaExclamationTriangle className="h-3 w-3 mr-1" /> {taxSummary.pph21.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Jumlah Karyawan</p>
                    <p className="font-medium">{taxSummary.pph21.employeeCount} Orang</p>
                  </div>
                  <div>
                    <p className="text-gray-500">PPh 21 Bulanan</p>
                    <p className="font-medium">Rp {taxSummary.pph21.monthlyTax.toLocaleString('id')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">PPh 21 Bulan Ini</p>
                  <p className="text-lg font-bold text-orange-600">Rp {taxSummary.pph21.monthlyTax.toLocaleString('id')}</p>
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <FaCalendarAlt className="h-3 w-3 mr-1" /> {taxSummary.pph21.nextDueDate}
                </div>
              </div>

              {/* PPh Badan Summary */}
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-orange-50 border border-orange-100">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <span className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 mr-3">
                      <FaBuilding className="h-4 w-4 text-white" />
                    </span>
                    <span className="font-semibold text-orange-900">PPh Badan</span>
                  </div>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                    <FaExclamationTriangle className="h-3 w-3 mr-1" /> {taxSummary.pphBadan.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Kuartalan</p>
                    <p className="font-medium">Rp {taxSummary.pphBadan.quarterlyTax.toLocaleString('id')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tahunan</p>
                    <p className="font-medium">Rp {taxSummary.pphBadan.annualTax.toLocaleString('id')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">PPh Badan Kuartal Ini</p>
                  <p className="text-lg font-bold text-orange-600">Rp {taxSummary.pphBadan.quarterlyTax.toLocaleString('id')}</p>
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <FaCalendarAlt className="h-3 w-3 mr-1" /> {taxSummary.pphBadan.nextDueDate}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Menu Cards */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Modul Manajemen Pajak</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {taxMenuItems.map((item, index) => (
              <Link href={item.path} key={index}>
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-orange-100 h-full">
                  <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start mb-4">
                      <div className={`mr-4 p-3 rounded-xl bg-gradient-to-br ${item.color} shadow-md`}>
                        {item.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="flex items-center text-orange-600 font-medium text-sm mt-2 group-hover:text-orange-700">
                        <span className="mr-1">Akses Modul</span>
                        <FaArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Pengingat Pajak */}
        <Card className="overflow-hidden shadow-md border-orange-100">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <FaCalendarAlt className="mr-2 h-5 w-5 text-orange-500" />
              Pengingat Pajak
            </CardTitle>
            <CardDescription>Jatuh tempo pajak yang akan datang</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start rounded-lg bg-red-50 border border-red-100 p-3">
                <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">PPN Masa Maret 2025</p>
                  <p className="text-sm text-red-600">Jatuh tempo 15 April 2025 (18 hari lagi)</p>
                  <p className="text-sm text-red-600">Nilai terutang: Rp {taxSummary.ppn.netVAT.toLocaleString('id')}</p>
                </div>
              </div>
              
              <div className="flex items-start rounded-lg bg-yellow-50 border border-yellow-100 p-3">
                <FaExclamationTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-700">PPh 21 Masa Maret 2025</p>
                  <p className="text-sm text-yellow-600">Jatuh tempo 15 April 2025 (18 hari lagi)</p>
                  <p className="text-sm text-yellow-600">Nilai terutang: Rp {taxSummary.pph21.monthlyTax.toLocaleString('id')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceLayout>
  );
};

export default TaxDashboard;
