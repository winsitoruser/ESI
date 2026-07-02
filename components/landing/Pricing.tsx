import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { useRouter } from 'next/router';

const Pricing: React.FC = () => {
  const router = useRouter();

  const plans = [
    {
      name: 'Starter',
      price: 'Gratis',
      period: 'Selamanya',
      description: 'Sempurna untuk bisnis yang baru mulai',
      features: [
        '1 Outlet',
        'Unlimited Transaksi',
        'Basic POS',
        'Inventory Management',
        'Sales Report',
        'Customer Database',
        'Cloud Backup',
        'Email Support',
      ],
      cta: 'Mulai Gratis',
      popular: false,
    },
    {
      name: 'Professional',
      price: 'Rp 299K',
      period: '/bulan',
      description: 'Untuk bisnis yang sedang berkembang',
      features: [
        'Hingga 3 Outlet',
        'Unlimited Transaksi',
        'Advanced POS',
        'Inventory Management',
        'Advanced Analytics',
        'Customer Loyalty Program',
        'Employee Management',
        'Payment Integration',
        'Priority Support',
        'Custom Receipt',
      ],
      cta: 'Coba 14 Hari Gratis',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'Hubungi Kami',
      description: 'Solusi lengkap untuk bisnis besar',
      features: [
        'Unlimited Outlet',
        'Unlimited Transaksi',
        'Full Features',
        'Multi-Warehouse',
        'API Integration',
        'Custom Development',
        'Dedicated Account Manager',
        'On-premise Option',
        '24/7 Priority Support',
        'Training & Onboarding',
      ],
      cta: 'Hubungi Sales',
      popular: false,
    },
  ];

  const handleCTA = (planName: string) => {
    if (planName === 'Enterprise') {
      // Open contact form or redirect to contact page
      window.location.href = 'mailto:sales@bedagang.com';
    } else {
      router.push('/auth/register');
    }
  };

  return (
    <section className="relative py-20 bg-white overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
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
            Harga yang
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">
              {' '}Transparan
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Upgrade atau downgrade kapan saja.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-sky-500 scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <Zap className="w-4 h-4" />
                    <span>Paling Populer</span>
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period !== 'Hubungi Kami' && (
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  )}
                </div>
                {plan.period === 'Hubungi Kami' && (
                  <p className="text-gray-600 text-sm">{plan.period}</p>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button
                onClick={() => handleCTA(plan.name)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-3 rounded-full font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600">
            Semua paket termasuk free trial 14 hari. Tidak perlu kartu kredit untuk memulai.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
