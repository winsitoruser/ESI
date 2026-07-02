import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Menu, X, Home, LogIn, LogOut, LayoutDashboard } from 'lucide-react';

const BurgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/?logout=success' });
    setIsOpen(false);
  };

  return (
    <>
      {/* Burger Button */}
      <motion.button
        onClick={toggleMenu}
        className="fixed top-6 right-6 z-50 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-sky-600" />
        ) : (
          <Menu className="w-6 h-6 text-sky-600" />
        )}
      </motion.button>

      {/* Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 bg-gradient-to-br from-sky-500 to-blue-600 z-40 shadow-2xl"
            >
              <div className="flex flex-col h-full p-8 pt-24">
                {/* Logo/Brand */}
                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-white mb-2">BEDAGANG</h2>
                  <p className="text-sky-100 text-sm">Platform Manajemen Retail</p>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 space-y-4">
                  <motion.button
                    onClick={() => handleNavigation('/')}
                    className="w-full flex items-center space-x-3 text-white hover:bg-white/10 rounded-lg p-3 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <Home className="w-5 h-5" />
                    <span className="font-medium">Beranda</span>
                  </motion.button>

                  {session ? (
                    <>
                      <motion.button
                        onClick={() => handleNavigation('/dashboard')}
                        className="w-full flex items-center space-x-3 text-white hover:bg-white/10 rounded-lg p-3 transition-colors"
                        whileHover={{ x: 5 }}
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="font-medium">Dashboard</span>
                      </motion.button>

                      {/* Admin Panel Link - Only for ADMIN and SUPER_ADMIN */}
                      {(session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN') && (
                        <motion.button
                          onClick={() => handleNavigation('/admin')}
                          className="w-full flex items-center space-x-3 text-white hover:bg-white/10 rounded-lg p-3 transition-colors border border-white/30"
                          whileHover={{ x: 5 }}
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          <span className="font-medium">Admin Panel</span>
                        </motion.button>
                      )}

                      <motion.button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 text-white hover:bg-white/10 rounded-lg p-3 transition-colors"
                        whileHover={{ x: 5 }}
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      onClick={() => handleNavigation('/auth/login')}
                      className="w-full flex items-center space-x-3 text-white hover:bg-white/10 rounded-lg p-3 transition-colors"
                      whileHover={{ x: 5 }}
                    >
                      <LogIn className="w-5 h-5" />
                      <span className="font-medium">Login</span>
                    </motion.button>
                  )}
                </nav>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t border-white/20">
                  <p className="text-sky-100 text-xs text-center">
                    © 2024 BEDAGANG. All rights reserved.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BurgerMenu;
