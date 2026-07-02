import React from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react';

const Services: React.FC = () => {
  const services = [
    {
      icon: ShoppingCart,
      title: 'Cloud-Based POS',
      description: 'Sistem kasir modern yang bisa diakses dari mana saja. Proses transaksi lebih cepat dengan interface yang intuitif.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Package,
      title: 'Inventory Management',
      description: 'Kelola stok real-time, tracking produk, dan notifikasi otomatis saat stok menipis. Terintegrasi dengan POS.',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Users,
      title: 'Customer Loyalty Program',
      description: 'Program loyalitas pelanggan dengan poin reward, member tier, dan promosi khusus untuk meningkatkan repeat purchase.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: BarChart3,
      title: 'Sales Analytics',
      description: 'Dashboard analytics real-time dengan insights penjualan, produk terlaris, dan performa bisnis yang actionable.',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: TrendingUp,
      title: 'Multi-Outlet Management',
      description: 'Kelola beberapa cabang dalam satu platform. Monitor performa setiap outlet dan sinkronisasi data otomatis.',
      color: 'from-red-500 to-red-600',
    },
    {
      icon: FileText,
      title: 'Payment Integration',
      description: 'Terima berbagai metode pembayaran: cash, debit, credit, e-wallet, dan QRIS. Semua terintegrasi dalam satu sistem.',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: Clock,
      title: 'Employee Management',
      description: 'Kelola shift karyawan, tracking performa, dan kontrol akses berdasarkan role untuk keamanan maksimal.',
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: Shield,
      title: 'Cloud Backup & Security',
      description: 'Data Anda aman dengan cloud backup otomatis, enkripsi end-to-end, dan uptime 99.9%.',
      color: 'from-pink-500 to-pink-600',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="relative py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(14 165 233) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Semua Fitur yang
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">
              {' '}Bisnis Anda Butuhkan
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Platform all-in-one untuk retail, F&B, dan bisnis jasa. Tingkatkan efisiensi operasional dan revenue Anda.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                {/* Icon Container */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-sky-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {service.description}
                </p>

                {/* Hover Border Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-12 shadow-2xl">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Mulai Gratis Hari Ini!
            </h3>
            <p className="text-xl text-sky-100 mb-8 max-w-2xl mx-auto">
              Bergabunglah dengan 10,000+ bisnis yang telah berkembang bersama BEDAGANG. Tanpa biaya setup, tanpa kontrak jangka panjang.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-sky-600 px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
            >
              Coba Gratis 14 Hari
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;
