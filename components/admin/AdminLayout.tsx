// Admin Panel Layout Component
import { ReactNode, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Boxes,
  Store,
  FileCheck,
  DollarSign,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Brain,
  Users2,
  ClipboardCheck
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Admin Panel' }: AdminLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/admin/login' });
  };

  const menuItems = [
    {
      title: 'Dasbor',
      icon: LayoutDashboard,
      href: '/admin/dashboard',
      active: router.pathname === '/admin/dashboard'
    },
    {
      title: 'KYB Review',
      icon: ClipboardCheck,
      href: '/admin/kyb-review',
      active: router.pathname.startsWith('/admin/kyb-review')
    },
    {
      title: 'Tenant',
      icon: Building2,
      href: '/admin/tenants',
      active: router.pathname.startsWith('/admin/tenants')
    },
    {
      title: 'Jenis Bisnis',
      icon: ShoppingBag,
      href: '/admin/business-types',
      active: router.pathname.startsWith('/admin/business-types')
    },
    {
      title: 'Cabang',
      icon: Store,
      href: '/admin/branches',
      active: router.pathname.startsWith('/admin/branches')
    },
    {
      title: 'Modul',
      icon: Boxes,
      href: '/admin/modules',
      active: router.pathname.startsWith('/admin/modules')
    },
    {
      title: 'Mitra',
      icon: Users2,
      href: '/admin/partners',
      active: router.pathname.startsWith('/admin/partners')
    },
    {
      title: 'Outlet',
      icon: Package,
      href: '/admin/outlets',
      active: router.pathname.startsWith('/admin/outlets')
    },
    {
      title: 'Aktivasi',
      icon: FileCheck,
      href: '/admin/activations',
      active: router.pathname.startsWith('/admin/activations')
    },
    {
      title: 'Transaksi',
      icon: DollarSign,
      href: '/admin/transactions',
      active: router.pathname.startsWith('/admin/transactions')
    },
    {
      title: 'Langganan',
      icon: CreditCard,
      href: '/admin/subscriptions',
      active: router.pathname.startsWith('/admin/subscriptions')
    },
    {
      title: 'Analitik',
      icon: BarChart3,
      href: '/admin/analytics',
      active: router.pathname === '/admin/analytics'
    },
    {
      title: 'AI Models',
      icon: Brain,
      href: '/admin/ai-models',
      active: router.pathname === '/admin/ai-models'
    },
    {
      title: 'Pengaturan',
      icon: Settings,
      href: '/admin/settings',
      active: router.pathname.startsWith('/admin/settings')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              
              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:block p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                title={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center ml-4">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    BEDAGANG
                  </h1>
                </div>
                <div className="hidden md:block ml-4">
                  <span className="text-sm text-gray-500 font-medium">Panel Admin</span>
                </div>
              </div>
            </div>

            {/* Right side - Empty for now */}
            <div className="flex items-center space-x-4">
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-20 overflow-hidden ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <nav className="h-full overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all group relative ${
                    item.active
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                  title={sidebarCollapsed ? item.title : ''}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${item.active ? 'text-blue-600' : 'text-gray-400'}`} />
                  {!sidebarCollapsed && <span className="text-sm">{item.title}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.title}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`lg:hidden fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-transform duration-300 z-40 w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="h-full overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all ${
                    item.active
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${item.active ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="text-sm">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 transition-all duration-300 min-h-screen ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8 w-full">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
