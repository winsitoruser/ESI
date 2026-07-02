import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, getSession, getCsrfToken } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n';

// Role-based redirect mapping (same as in [...nextauth].ts)
const ROLE_REDIRECTS: Record<string, string> = {
  // Admin/Management roles → HQ Dashboard
  'super_admin': '/hq/dashboard',
  'owner': '/hq/dashboard',
  'hq_admin': '/hq/dashboard',
  'admin_hq': '/hq/dashboard',
  'admin': '/hq/dashboard',
  'manager': '/hq/dashboard',
  'branch_manager': '/hq/dashboard',
  'manager_toko': '/hq/dashboard',
  // Finance → Finance module
  'finance_staff': '/finance',
  'finance': '/finance',
  // HR/HRIS → HRIS module
  'hr_staff': '/hq/hris',
  'hris_staff': '/hq/hris',
  'hr': '/hq/hris',
  // Auditor → Audit Logs
  'auditor': '/hq/audit-logs',
  'regulator': '/hq/audit-logs',
  // Cashier → HQ Dashboard (no PoS in ESI platform)
  'cashier': '/hq/dashboard',
  'kasir': '/hq/dashboard',
  'supervisor_kasir': '/hq/dashboard',
  // Inventory/Gudang → Inventory
  'inventory_staff': '/hq/inventory',
  'gudang': '/hq/inventory',
  // Kitchen → HQ (no FnB)
  'kitchen_staff': '/hq/dashboard',
  // Staff fallback
  'staff': '/hq/dashboard',
};

function getRedirectUrlForRole(role: string | undefined | null): string {
  if (!role) return '/hq/dashboard';
  return ROLE_REDIRECTS[role] || '/hq/dashboard';
}

interface LoginProps {
  csrfToken: string;
}

const Login: React.FC<LoginProps> = ({ csrfToken }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (router.query.logout === 'success') {
      toast.success(t('auth.logoutSuccess') || 'Berhasil keluar.', {
        duration: 4000,
        position: 'top-center',
      });
      router.replace('/auth/login', undefined, { shallow: true });
    }
  }, [router.query.logout, router, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error(t('auth.emailRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        toast.error(t('auth.invalidCredentials'));
      } else if (result?.ok) {
        toast.success(t('auth.loginSuccess'));
        
        // Fetch the session to get user role for redirect
        const session = await getSession();
        const userRole = session?.user?.role;
        
        const callbackUrl = router.query.callbackUrl as string;
        let target: string;
        
        // Priority 1: callbackUrl if provided and not auth-related
        if (callbackUrl && !callbackUrl.includes('/auth/')) {
          target = callbackUrl;
        } 
        // Priority 2: role-based redirect from session redirectUrl
        else if ((session as any)?.redirectUrl) {
          target = (session as any).redirectUrl;
        }
        // Priority 3: role-based redirect using helper
        else if (userRole) {
          target = getRedirectUrlForRole(userRole);
        }
        // Fallback
        else {
          target = '/hq/dashboard';
        }
        
        console.log(`[Login] Redirecting user with role '${userRole}' to: ${target}`);
        window.location.href = target;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('auth.loginTitle')}</title>
        <meta name="description" content={t('auth.loginDesc')} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-500 via-sky-400 to-blue-500 flex items-center justify-center p-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-block"
              >
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 mb-2">
                  ESI ERP
                </h1>
              </motion.div>
              <p className="text-gray-600">{t('auth.welcomeBack')}</p>
              <p className="text-xs text-gray-400 mt-1">PT Ekosistem Satwa Indonesia</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} action="/api/auth/callback/credentials" method="POST" className="space-y-5">
              {/* Hidden CSRF token for native form fallback when JS fails to hydrate */}
              <input type="hidden" name="csrfToken" value={csrfToken} />
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    placeholder={t('auth.enterPassword')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-sm text-sky-600 hover:text-sky-700">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <span>{t('auth.processing')}</span>
                ) : (
                  <>
                    <span>{t('auth.loginBtn')}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          {/* Demo Account Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white text-center"
          >
            <p className="text-sm font-medium mb-2">{t('auth.demoAccount')}</p>
            <p className="text-xs">Email: demo@bedagang.com</p>
            <p className="text-xs">Password: demo123</p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const csrfToken = await getCsrfToken(context);
  return {
    props: {
      csrfToken: csrfToken || '',
    },
  };
};

export default Login;
