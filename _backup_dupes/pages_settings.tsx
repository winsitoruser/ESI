import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaCog, FaStore, FaUsers, FaMoneyBillWave, FaPrint,
  FaShoppingCart, FaBoxOpen, FaBell, FaShieldAlt, FaArrowRight,
  FaDatabase, FaCloud, FaKey, FaPalette, FaFlask
} from 'react-icons/fa';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-sky-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengaturan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const settingsCategories = [
    {
      title: "Pengaturan Toko",
      description: "Informasi toko, cabang, dan lokasi",
      icon: FaStore,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      href: "/settings/store",
      items: ["Info Toko", "Cabang", "Jam Operasional"]
    },
    {
      title: "Pengguna & Tim",
      description: "Kelola pengguna, role, dan permission",
      icon: FaUsers,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      href: "/settings/users",
      items: ["Pengguna", "Role", "Permission"]
    },
    {
      title: "Pengaturan POS",
      description: "Konfigurasi kasir dan transaksi",
      icon: FaShoppingCart,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      href: "/pos/settings",
      items: ["Kasir", "Metode Pembayaran", "Diskon"]
    },
    {
      title: "Pengaturan Inventory",
      description: "Stok, kategori, dan supplier",
      icon: FaBoxOpen,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      href: "/settings/inventory",
      items: ["Kategori", "Supplier", "Unit"]
    },
    {
      title: "Resep & Formula",
      description: "Kelola resep produksi dan formula",
      icon: FaFlask,
      color: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      href: "/settings/recipes",
      items: ["Resep", "Bahan", "History"]
    },
    {
      title: "Pengaturan Keuangan",
      description: "Akuntansi, pajak, dan pembayaran",
      icon: FaMoneyBillWave,
      color: "bg-gradient-to-br from-red-500 to-red-600",
      href: "/finance/settings",
      items: ["Akun", "Pajak", "Bank"]
    },
    {
      title: "Printer & Hardware",
      description: "Konfigurasi printer dan perangkat",
      icon: FaPrint,
      color: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      href: "/settings/hardware",
      items: ["Printer", "Barcode", "Cash Drawer"]
    },
    {
      title: "Notifikasi",
      description: "Pengaturan email dan notifikasi",
      icon: FaBell,
      color: "bg-gradient-to-br from-yellow-500 to-yellow-600",
      href: "/settings/notifications",
      items: ["Email", "SMS", "Push"]
    },
    {
      title: "Keamanan",
      description: "Password, 2FA, dan audit log",
      icon: FaShieldAlt,
      color: "bg-gradient-to-br from-pink-500 to-pink-600",
      href: "/settings/security",
      items: ["Password", "2FA", "Audit Log"]
    },
    {
      title: "Backup & Restore",
      description: "Backup data dan restore",
      icon: FaDatabase,
      color: "bg-gradient-to-br from-teal-500 to-teal-600",
      href: "/settings/backup",
      items: ["Backup", "Restore", "Export"]
    },
    {
      title: "Integrasi",
      description: "API dan integrasi pihak ketiga",
      icon: FaCloud,
      color: "bg-gradient-to-br from-cyan-500 to-cyan-600",
      href: "/settings/integrations",
      items: ["API", "Webhook", "E-commerce"]
    },
    {
      title: "Lisensi & Billing",
      description: "Paket, pembayaran, dan invoice",
      icon: FaKey,
      color: "bg-gradient-to-br from-violet-500 to-violet-600",
      href: "/settings/billing",
      items: ["Paket", "Invoice", "Upgrade"]
    },
    {
      title: "Tampilan & Tema",
      description: "Kustomisasi tampilan aplikasi",
      icon: FaPalette,
      color: "bg-gradient-to-br from-rose-500 to-rose-600",
      href: "/settings/appearance",
      items: ["Tema", "Logo", "Warna"]
    }
  ];

  const quickSettings = [
    { label: "Pengguna Aktif", value: "12", icon: FaUsers },
    { label: "Cabang", value: "3", icon: FaStore },
    { label: "Integrasi", value: "5", icon: FaCloud },
    { label: "Backup Terakhir", value: "2 jam lalu", icon: FaDatabase },
  ];

  return (
    <DashboardLayout>
      <Head>
        <title>Pengaturan | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pengaturan</h1>
              <p className="text-sky-100">
                Kelola semua pengaturan sistem dan konfigurasi
              </p>
            </div>
            <FaCog className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickSettings.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="text-2xl text-sky-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Settings Categories */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kategori Pengaturan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link key={index} href={category.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${category.color} w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <FaArrowRight className="text-gray-400 group-hover:text-sky-600 transition-colors" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {category.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.items.map((item, idx) => (
                          <span key={idx} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Sistem</CardTitle>
            <CardDescription>Detail versi dan status sistem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Versi Aplikasi</p>
                <p className="text-lg font-semibold text-gray-900">v1.0.0</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status Sistem</p>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <p className="text-lg font-semibold text-green-600">Online</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Database</p>
                <p className="text-lg font-semibold text-gray-900">PostgreSQL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
