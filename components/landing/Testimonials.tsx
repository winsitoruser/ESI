import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Budi Santoso',
      role: 'Owner, Kopi Kenangan Senja',
      image: '👨‍💼',
      rating: 5,
      text: 'BEDAGANG mengubah cara kami mengelola kedai kopi. Sistem POS-nya sangat cepat dan mudah digunakan. Loyalty program-nya juga membantu meningkatkan repeat customer hingga 40%!',
      business: 'F&B',
    },
    {
      name: 'Siti Nurhaliza',
      role: 'Manager, Fashion Store Elegan',
      image: '👩‍💼',
      rating: 5,
      text: 'Inventory management-nya luar biasa! Kami bisa tracking stok real-time di 3 cabang sekaligus. Laporan penjualan yang detail juga membantu kami membuat keputusan bisnis yang lebih baik.',
      business: 'Retail Fashion',
    },
    {
      name: 'Ahmad Rizki',
      role: 'Owner, Minimarket Berkah',
      image: '👨‍💻',
      rating: 5,
      text: 'Dari manual ke BEDAGANG, efisiensi operasional kami meningkat drastis. Kasir lebih cepat, stok terkontrol, dan customer support-nya responsif. Highly recommended!',
      business: 'Minimarket',
    },
    {
      name: 'Linda Wijaya',
      role: 'Founder, Beauty Salon Cantika',
      image: '👩‍🦰',
      rating: 5,
      text: 'Employee management dan appointment scheduling-nya sangat membantu salon kami. Sekarang kami bisa fokus ke customer experience tanpa pusing urusan administrasi.',
      business: 'Beauty & Wellness',
    },
    {
      name: 'Rudi Hartono',
      role: 'Owner, Restoran Nusantara',
      image: '👨‍🍳',
      rating: 5,
      text: 'Multi-payment integration-nya lengkap banget! Customer bisa bayar pakai apa aja. Plus, analytics dashboard-nya membantu kami optimize menu dan pricing strategy.',
      business: 'Restaurant',
    },
    {
      name: 'Dewi Lestari',
      role: 'Manager, Toko Buku Literasi',
      image: '👩‍🏫',
      rating: 5,
      text: 'Cloud-based system-nya bikin kami bisa monitor bisnis dari mana aja. Data aman, backup otomatis, dan yang paling penting - harganya sangat affordable untuk UMKM seperti kami.',
      business: 'Bookstore',
    },
  ];

  return (
    <section className="relative py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
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
            Dipercaya oleh
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">
              {' '}10,000+ Bisnis
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Dengar langsung dari para pemilik bisnis yang telah berkembang bersama BEDAGANG
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-8 h-8 text-sky-500 opacity-50" />
              </div>

              {/* Rating */}
              <div className="flex space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author Info */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-xs text-sky-600 font-medium mt-1">{testimonial.business}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {[
            { number: '10,000+', label: 'Bisnis Aktif' },
            { number: '1M+', label: 'Transaksi/Bulan' },
            { number: '4.9/5', label: 'Rating Pengguna' },
            { number: '99.9%', label: 'Uptime' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-sky-600 mb-1">{stat.number}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
