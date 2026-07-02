import React, { ReactNode, useMemo, useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useBusinessType } from '@/contexts/BusinessTypeContext';
import { useTranslation } from '@/lib/i18n';
import { languageNames, languageFlags, Language, currencySymbols, currencyNames, Currency } from '@/lib/i18n';
import { 
  LogOut,
  Store,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  ChevronDown
} from 'lucide-react';
import {
  branchSidebarConfig,
  filterSidebarConfig,
  findActiveMenuItem,
  getParentMenuItem,
  MenuItem,
  MenuGroup,
  UserRole,
  ModuleCode
} from '@/config/sidebar.config';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Map sidebar item IDs to translation keys
const sidebarTranslationMap: Record<string, string> = {
  // Groups (match branchSidebarConfig group IDs)
  'outlet': 'sidebar.mainMenu',
  'operations': 'sidebar.fnbOps',
  'backoffice': 'sidebar.financeMenu',
  // Items (match branchSidebarConfig item IDs)
  'dashboard': 'sidebar.dashboard',
  'pos': 'sidebar.cashier',
  'inventory': 'sidebar.stockManagement',
  'customers': 'sidebar.customerList',
  'employees': 'sidebar.employees',
  'employees-schedules': 'sidebar.employeeSchedules',
  'employees-mobile': 'sidebar.employeeMobileApp',
  'loyalty': 'sidebar.loyaltyPoints',
  'tables': 'sidebar.tableManagement',
  'reservations': 'sidebar.reservationMgmt',
  'kitchen': 'sidebar.kitchenDisplay',
  'promo': 'sidebar.promoVoucher',
  'fleet': 'sidebar.fleetManagement',
  'fleet-dashboard': 'sidebar.fleetDashboard',
  'fleet-vehicles': 'sidebar.fleetVehicles',
  'fleet-drivers': 'sidebar.fleetDrivers',
  'fleet-routes': 'sidebar.fleetRoutes',
  'fleet-maintenance': 'sidebar.fleetMaintenance',
  'fleet-fuel': 'sidebar.fleetFuel',
  'fleet-gps': 'sidebar.fleetGps',
  'fleet-costs': 'sidebar.fleetCosts',
  'finance': 'sidebar.financeOverview',
  'reports': 'sidebar.salesReports',
  'settings': 'sidebar.settingsMenu',
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { hasModule, isLoading: configLoading, modules } = useBusinessType();
  const { t, language, setLanguage, currency, setCurrency } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [langOpen, setLangOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const currRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (currRef.current && !currRef.current.contains(e.target as Node)) setCurrOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Helper to get translated name for sidebar items
  const getTranslatedName = (id: string, fallback: string) => {
    const key = sidebarTranslationMap[id];
    if (key) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return fallback;
  };

  // Get user role from session
  const userRole = (session?.user as any)?.role as UserRole | undefined;

  // Convert enabled modules to ModuleCode array
  const enabledModuleCodes = useMemo(() => {
    if (configLoading || !modules) return [];
    return modules.map((m) => m.code) as ModuleCode[];
  }, [modules, configLoading]);

  // Filter sidebar config based on role and modules
  const filteredConfig = useMemo(() => {
    return filterSidebarConfig(
      branchSidebarConfig, 
      userRole, 
      enabledModuleCodes.length > 0 ? enabledModuleCodes : undefined
    );
  }, [userRole, enabledModuleCodes]);

  // Auto-collapse sidebar for cashier page, otherwise load from localStorage
  React.useEffect(() => {
    const isCashierPage = router.pathname === '/pos/cashier';
    if (isCashierPage) {
      setSidebarCollapsed(true);
    } else {
      const saved = localStorage.getItem('branch-sidebar-collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      }
    }
  }, [router.pathname]);

  // Save collapsed state to localStorage
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('branch-sidebar-collapsed', String(newState));
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  const isChildActive = (item: MenuItem): boolean =>
    item.children ? item.children.some(c => isActive(c.href) || isChildActive(c)) : false;

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Auto-expand parent when navigating to a child route
  React.useEffect(() => {
    const autoExpand = (items: MenuItem[]) => {
      items.forEach(item => {
        if (item.children) {
          if (item.children.some(c => isActive(c.href))) {
            setExpandedMenus(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
          }
          autoExpand(item.children);
        }
      });
    };
    filteredConfig.groups.forEach(g => autoExpand(g.items));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname]);

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const active = isActive(item.href);
    const childActive = isChildActive(item);
    const isChild = depth > 0;

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all ${
              isExpanded || childActive
                ? 'bg-sky-50 text-sky-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title={sidebarCollapsed ? item.name : ''}
          >
            <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <Icon className={`w-5 h-5 flex-shrink-0 ${sidebarCollapsed ? 'lg:mx-auto' : ''}`} />
              <span className={`text-sm transition-all ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                {getTranslatedName(item.id, item.name)}
              </span>
            </div>
            {!sidebarCollapsed && (
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>
          {!sidebarCollapsed && isExpanded && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-sky-100 pl-3">
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        className={`flex items-center space-x-3 rounded-lg transition-all group relative ${
          isChild ? 'px-3 py-1.5' : 'px-4 py-2'
        } ${
          active
            ? isChild
              ? 'bg-sky-600 text-white font-medium'
              : 'bg-sky-50 text-sky-600 font-medium'
            : isChild
              ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              : 'text-gray-700 hover:bg-gray-50'
        } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
        title={sidebarCollapsed ? item.name : ''}
      >
        <Icon className={`flex-shrink-0 ${isChild ? 'w-4 h-4' : 'w-5 h-5'} ${sidebarCollapsed ? 'lg:mx-auto' : ''}`} />
        <span className={`transition-all ${isChild ? 'text-xs' : 'text-sm'} ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
          {getTranslatedName(item.id, item.name)}
        </span>

        {/* Tooltip for collapsed state */}
        {sidebarCollapsed && (
          <div className="hidden lg:block absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
            {getTranslatedName(item.id, item.name)}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
          </div>
        )}
      </Link>
    );
  };

  const renderMenuGroup = (group: MenuGroup, groupIndex: number) => (
    <div key={group.id}>
      {/* Section Header */}
      {!sidebarCollapsed && (
        <div className="px-4 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {getTranslatedName(group.id, group.title)}
          </h3>
        </div>
      )}
      
      {/* Divider for collapsed state */}
      {sidebarCollapsed && groupIndex > 0 && (
        <div className="my-2 border-t border-gray-200"></div>
      )}
      
      {/* Menu Items */}
      <div className="space-y-1">
        {group.items.map(item => renderMenuItem(item))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-64`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
          <Link href="/dashboard" className={`flex items-center space-x-2 transition-all ${
            sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''
          }`}>
            <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600 transition-all ${
              sidebarCollapsed ? 'lg:hidden' : ''
            }`}>
              BEDAGANG
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: 'calc(100vh - 64px)' }}
        >
          {filteredConfig.groups.map((group, groupIndex) => renderMenuGroup(group, groupIndex))}
        </nav>
      </aside>

      {/* Collapse Toggle Button - Desktop Only */}
      <button
        onClick={toggleSidebarCollapse}
        className={`hidden lg:flex fixed top-20 z-50 items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 ${
          sidebarCollapsed ? 'left-16' : 'left-60'
        }`}
        title={sidebarCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 lg:flex-none">
              <h1 className="text-xl font-semibold text-gray-900">
                {(() => {
                  const active = findActiveMenuItem(filteredConfig.groups, router.pathname);
                  return active ? getTranslatedName(active.id, active.name) : t('sidebar.dashboard');
                })()}
              </h1>
            </div>

            {/* Language & Currency Switchers */}
            <div className="flex items-center space-x-2">
              {/* Language Switcher */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => { setLangOpen(!langOpen); setCurrOpen(false); }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors border border-gray-200"
                >
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span>{languageFlags[language]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {(Object.keys(languageNames) as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setLangOpen(false); }}
                        className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm hover:bg-sky-50 transition-colors ${
                          language === lang ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{languageFlags[lang]}</span>
                        <span>{languageNames[lang]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Switcher */}
              <div className="relative" ref={currRef}>
                <button
                  onClick={() => { setCurrOpen(!currOpen); setLangOpen(false); }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors border border-gray-200"
                >
                  <span className="font-medium text-gray-700">{currency}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${currOpen ? 'rotate-180' : ''}`} />
                </button>
                {currOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    {(Object.keys(currencySymbols) as Currency[]).map((cur) => (
                      <button
                        key={cur}
                        onClick={() => { setCurrency(cur); setCurrOpen(false); }}
                        className={`w-full flex items-center space-x-2 px-4 py-2.5 text-sm hover:bg-sky-50 transition-colors ${
                          currency === cur ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span className="font-medium">{currencySymbols[cur]}</span>
                        <span>{cur} - {currencyNames[cur]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
