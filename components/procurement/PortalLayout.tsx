import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  ShoppingCart, Menu, X, User, LogOut, Home, FileText, Gavel,
  LayoutDashboard, ChevronDown, Bell
} from 'lucide-react';

interface PortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function PortalLayout({ children, title, description }: PortalLayoutProps) {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userMenu, setUserMenu] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('vendor_user') : null;
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_user');
    setUser(null);
    router.push('/procurement');
  };

  const navItems = [
    { href: '/procurement', label: 'Pengumuman', icon: Home },
    { href: '/procurement/tenders', label: 'Tender', icon: Gavel },
    { href: '/procurement/rfqs', label: 'RFQ', icon: FileText },
    ...(user ? [{ href: '/procurement/dashboard', label: 'Dashboard Saya', icon: LayoutDashboard }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/procurement') return router.pathname === '/procurement';
    return router.pathname.startsWith(href);
  };

  return (
    <>
      <Head>
        <title>{title ? `${title} | Procurement Portal` : 'Procurement Portal - Bedagang ERP'}</title>
        {description && <meta name="description" content={description} />}
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/procurement" className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-base font-bold text-gray-900 leading-tight">Procurement Portal</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Bedagang ERP</p>
                </div>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(item => (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Right Side */}
              <div className="flex items-center gap-3">
                {user ? (
                  <div className="relative">
                    <button onClick={() => setUserMenu(!userMenu)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all text-sm">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {(user.company_name || 'V').substring(0, 1).toUpperCase()}
                      </div>
                      <span className="hidden sm:block font-medium text-gray-700 max-w-[120px] truncate">{user.company_name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {userMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border shadow-xl z-50 overflow-hidden">
                          <div className="p-3 border-b bg-gray-50">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.company_name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                              ${user.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {user.status === 'approved' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                            </span>
                          </div>
                          <div className="py-1">
                            <Link href="/procurement/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                              <LayoutDashboard className="w-4 h-4" /> Dashboard Saya
                            </Link>
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                              <LogOut className="w-4 h-4" /> Keluar
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link href="/procurement/login"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                      Masuk
                    </Link>
                    <Link href="/procurement/register"
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all">
                      Daftar Vendor
                    </Link>
                  </div>
                )}

                {/* Mobile Menu Toggle */}
                <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
                  {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenu && (
            <div className="md:hidden border-t bg-white">
              <nav className="px-4 py-3 space-y-1">
                {navItems.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <item.icon className="w-4 h-4" /> {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main>{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Procurement Portal</p>
                  <p className="text-xs text-gray-400">Powered by Bedagang ERP</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Bedagang. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
