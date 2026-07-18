import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
  Building2,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  User,
  Settings,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  Globe
} from 'lucide-react';
import {
  filterSidebarConfig,
  findActiveMenuItem,
  getParentMenuItem,
  MenuItem,
  MenuGroup,
  UserRole,
  ModuleCode
} from '@/config/sidebar.config';
import { esiHqSidebarConfig as hqSidebarConfig } from '@/config/esi-sidebar.config';
import { humanifySidebarConfig } from '@/config/humanify-sidebar.config';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import { useTranslation, Language, Currency, languageNames, languageFlags, currencySymbols, currencyNames, currencyFlags } from '@/lib/i18n';
import { filterSidebarGroupsByPlan } from '@/lib/saas/plan-entitlements';
import { filterHumanifySidebarByPersona } from '@/lib/humanify/sidebar-persona';

export type HQPlatform = 'simesi' | 'humanify';

type AccountAlertUi = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

interface HQLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  noPadding?: boolean;
  platform?: HQPlatform;
}

function HQLayoutContent({ children, title, subtitle, noPadding, platform = 'simesi' }: HQLayoutProps) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const isHumanify = platform === 'humanify' || router.pathname.startsWith('/humanify');
  const impersonating = Boolean((session?.user as any)?.impersonating);
  const impersonatedSlug = (session?.user as any)?.impersonatedTenantSlug as string | undefined;
  const sidebarStorageKey = isHumanify ? 'humanify-sidebar-collapsed' : 'hq-sidebar-collapsed';
  const baseSidebarConfig = isHumanify ? humanifySidebarConfig : hqSidebarConfig;
  // Use safe localStorage hook for sidebar collapsed state
  // Initialize with default (false) and update from localStorage on client
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const hasReadLocalStorage = useRef(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchPages, setSearchPages] = useState<{ name: string; href: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [accountAlerts, setAccountAlerts] = useState<AccountAlertUi[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // Get user role from session
  const userRole = (session?.user as any)?.role as UserRole | undefined;
  const isPlatformOp = ['super_admin', 'superadmin', 'platform_admin'].includes(
    String(userRole || '').toLowerCase(),
  );

  // Filter sidebar: role first, then Humanify plan features (Phase 2), then persona IA
  const filteredConfig = useMemo(() => {
    const byRole = filterSidebarConfig(baseSidebarConfig, userRole);
    if (!isHumanify) return byRole;
    const byPlan = {
      ...byRole,
      groups: filterSidebarGroupsByPlan(byRole.groups, planId || 'enterprise', {
        bypass: isPlatformOp,
      }),
    };
    return filterHumanifySidebarByPersona(byPlan, userRole);
  }, [userRole, baseSidebarConfig, isHumanify, planId, isPlatformOp]);

  useEffect(() => {
    if (!isHumanify || !session?.user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/humanify/saas-context');
        const json = await res.json();
        if (!cancelled && json.success) {
          setPlanId(json.data?.entitlements?.planId || json.data?.subscriptionPlan || 'trial');
          setAccountAlerts(Array.isArray(json.data?.alerts) ? json.data.alerts : []);
        }
      } catch {
        /* keep default enterprise until loaded — avoid flashing empty menu */
      }
    })();
    return () => { cancelled = true; };
  }, [isHumanify, session?.user]);

  // Load sidebar collapsed state from localStorage ONCE on mount
  useEffect(() => {
    if (hasReadLocalStorage.current) return;
    hasReadLocalStorage.current = true;
    
    try {
      const saved = localStorage.getItem(sidebarStorageKey);
      if (saved !== null) {
        setSidebarCollapsedState(saved === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Compute the single active menu item (memoized) — used for precise active-state highlighting
  const activeMenuItem = useMemo(
    () => findActiveMenuItem(filteredConfig.groups, router.pathname, router.query as Record<string, string | string[] | undefined>),
    [filteredConfig.groups, router.pathname, router.query]
  );

  // Auto-expand parent of active menu item
  useEffect(() => {
    if (activeMenuItem) {
      const parent = getParentMenuItem(filteredConfig.groups, activeMenuItem.id);
      if (parent) {
        setExpandedMenus(prev => [...new Set([...prev, parent.id])]);
      }
    }
    
    fetchNotifications();
  }, [router.pathname, router.query, filteredConfig.groups, activeMenuItem]);

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (isHumanify) {
      try {
        const res = await fetch('/api/humanify/notifications?action=list&limit=15');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setNotifications((json.data || []).map((n: any) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message,
              time: n.createdAt ? formatTimeAgo(n.createdAt) : '',
              isRead: n.isRead,
              actionHref: n.actionHref,
            })));
            setUnreadCount(json.unreadCount || 0);
          }
        }
      } catch {
        // Fallback — keep empty
      }
      return;
    }
    try {
      const res = await fetch('/api/hq/sfa/notifications?action=my-notifications&limit=10&unreadOnly=false');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications((json.data || []).map((n: any) => ({
            id: n.id,
            type: n.type === 'error' ? 'urgent' : n.type === 'warning' ? 'warning' : 'info',
            title: n.title,
            message: n.message,
            time: n.created_at ? formatTimeAgo(n.created_at) : '',
            isRead: n.is_read,
            referenceId: n.reference_id,
            referenceType: n.reference_type,
          })));
          setUnreadCount(json.unreadCount || 0);
        }
      }
    } catch {
      // Fallback — keep empty
    }
  };

  // Initial load + Humanify SSE (fallback poll 60s for SIMESI / unsupported browsers)
  useEffect(() => {
    if (!session?.user) return;

    const mapHumanifyNotifs = (items: any[]) => (items || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      time: n.createdAt ? formatTimeAgo(n.createdAt) : '',
      isRead: n.isRead,
      actionHref: n.actionHref,
    }));

    if (isHumanify) {
      fetchNotifications();
      let es: EventSource | null = null;
      let fallbackInterval: ReturnType<typeof setInterval> | null = null;

      const startFallback = () => {
        if (fallbackInterval) return;
        fallbackInterval = setInterval(fetchNotifications, 60000);
      };

      try {
        es = new EventSource('/api/humanify/notifications/stream');
        es.onmessage = (ev) => {
          try {
            const json = JSON.parse(ev.data);
            if (Array.isArray(json.notifications)) {
              setNotifications(mapHumanifyNotifs(json.notifications));
              setUnreadCount(json.unreadCount || 0);
            }
          } catch { /* ignore malformed */ }
        };
        es.onerror = () => {
          es?.close();
          es = null;
          startFallback();
        };
      } catch {
        startFallback();
      }

      return () => {
        es?.close();
        if (fallbackInterval) clearInterval(fallbackInterval);
      };
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHumanify, session?.user]);

  const handleMarkRead = async (notifId?: number | string) => {
    if (isHumanify) {
      try {
        await fetch('/api/humanify/notifications?action=mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notifId ? { notificationIds: [notifId] } : {}),
        });
        fetchNotifications();
      } catch {}
      return;
    }
    try {
      await fetch('/api/hq/sfa/notifications?action=mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifId ? { notificationIds: [notifId] } : {}),
      });
      fetchNotifications();
    } catch {}
  };

  // Global search (Humanify) — debounced employee lookup + page matches
  useEffect(() => {
    if (!isHumanify) return;
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearchPages([]); setSearchLoading(false); return; }

    const ql = q.toLowerCase();
    const pages: { name: string; href: string }[] = [];
    const collect = (item: any) => {
      if (item?.href && item?.name && String(item.name).toLowerCase().includes(ql)) {
        pages.push({ name: item.name, href: item.href });
      }
      (item?.children || []).forEach(collect);
    };
    filteredConfig.groups.forEach((g: any) => (g.items || []).forEach(collect));
    setSearchPages(pages.slice(0, 6));

    setSearchLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/humanify/search?q=${encodeURIComponent(q)}&limit=8`, { signal: ctrl.signal });
        const json = await res.json();
        if (json.success) setSearchResults(json.data?.employees || []);
      } catch { /* aborted/failed */ }
      finally { setSearchLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isHumanify, filteredConfig]);

  const { t, language, setLanguage, currency, setCurrency } = useTranslation();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('layout.justNow');
    if (mins < 60) return t('layout.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('layout.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('layout.daysAgo', { count: days });
  }

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(m => m !== menuId)
        : [...prev, menuId]
    );
  };

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsedState(newState);
    localStorage.setItem(sidebarStorageKey, String(newState));
  };

  const isActive = (item: MenuItem) => {
    // Gunakan ID-based comparison dari findActiveMenuItem agar hanya SATU item aktif
    if (activeMenuItem) return activeMenuItem.id === item.id;
    // Fallback: exact match saja (tidak pakai startsWith agar tidak double-active)
    if (!item.href) return false;
    return router.pathname === item.href;
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push(isHumanify ? '/humanify/login' : '/auth/login');
  };

  const getTranslatedItem = (id: string, fallback: string) => {
    const key = `sidebar.items.${id}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return fallback;
  };

  const getTranslatedGroup = (id: string, fallback: string) => {
    const key = `sidebar.groups.${id}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return fallback;
  };

  const accent = isHumanify
    ? {
        active: 'bg-violet-600 text-white shadow-sm shadow-violet-200',
        activeChild: 'bg-violet-600 text-white',
        expanded: 'bg-violet-50/80 text-violet-700',
        badge: 'bg-violet-500',
        logo: 'from-violet-600 to-fuchsia-700',
      }
    : {
        active: 'bg-blue-600 text-white shadow-sm shadow-blue-200',
        activeChild: 'bg-blue-600 text-white',
        expanded: 'bg-blue-50/80 text-blue-700',
        badge: 'bg-blue-500',
        logo: 'from-blue-600 to-indigo-700',
      };

  const renderNavItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const active = isActive(item);
    const Icon = item.icon;
    const isChild = depth > 0;

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
              isExpanded ? accent.expanded : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-[15px] font-semibold truncate">{getTranslatedItem(item.id, item.name)}</span>}
            </div>
            {!sidebarCollapsed && (
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </button>
          {!sidebarCollapsed && isExpanded && (
            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
              {item.children!.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        className={`group relative flex items-center justify-between rounded-md transition-all duration-150 ${
          isChild ? 'px-2.5 py-1.5' : 'px-3 py-2.5'
        } ${
          active 
            ? isChild
              ? accent.activeChild
              : accent.active
            : isChild
              ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              : 'text-gray-600 hover:bg-gray-50'
        } ${sidebarCollapsed ? 'justify-center' : ''}`}
      >
        <div className={`flex items-center min-w-0 ${isChild ? 'gap-2.5' : 'gap-3'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <Icon className={`flex-shrink-0 ${isChild ? 'w-4 h-4' : 'w-5 h-5'}`} />
          {!sidebarCollapsed && (
            <span className={`truncate ${isChild ? 'text-sm font-normal' : 'text-[15px] font-semibold'}`}>
              {getTranslatedItem(item.id, item.name)}
            </span>
          )}
        </div>
        {!sidebarCollapsed && item.badge !== undefined && (
          <span className={`ml-auto flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full ${item.badgeColor || accent.badge}`}>
            {item.badge}
          </span>
        )}
        {/* Collapsed tooltip */}
        {sidebarCollapsed && (
          <div className="hidden lg:block absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
            {getTranslatedItem(item.id, item.name)}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
          </div>
        )}
      </Link>
    );
  };

  const renderMenuGroup = (group: MenuGroup, idx: number) => (
    <div key={group.id} className={idx > 0 ? 'mt-5' : ''}>
      {!sidebarCollapsed && (
        <div className="px-3 mb-1.5 flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
            {getTranslatedGroup(group.id, group.title)}
          </h3>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
      )}
      {sidebarCollapsed && idx > 0 && (
        <div className="mx-3 mb-2 h-px bg-gray-100" />
      )}
      <div className="space-y-0.5">
        {group.items.map(item => renderNavItem(item))}
      </div>
    </div>
  );

  const LogoIcon = filteredConfig.logo.icon;

  const pageTitle = title
    ? `${title} | ${isHumanify ? HUMANIFY_BRAND.name : 'ESI ERP'}`
    : isHumanify
      ? `${HUMANIFY_BRAND.name} — ${HUMANIFY_BRAND.productType}`
      : 'ESI ERP';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        {isHumanify ? (
          <link rel="icon" href={HUMANIFY_BRAND.welcomeLogoPath} type="image/png" />
        ) : null}
      </Head>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
      } w-72`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {isHumanify ? (
            <Link
              href={filteredConfig.logo.href}
              className={`inline-flex items-center hover:opacity-85 transition-opacity ${sidebarCollapsed ? 'lg:mx-auto lg:justify-center' : ''}`}
            >
              {sidebarCollapsed ? (
                /* Collapsed: tunjukkan icon saja */
                <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl">
                  <img
                    src={HUMANIFY_BRAND.logoPath}
                    alt={HUMANIFY_BRAND.name}
                    className="absolute inset-0 h-full w-full scale-[2.4] object-cover object-[22%_center]"
                  />
                </span>
              ) : (
                /* Expanded: full wordmark humanify.png */
                <img
                  src={HUMANIFY_BRAND.appLogoPath}
                  alt={HUMANIFY_BRAND.name}
                  style={{ aspectRatio: HUMANIFY_BRAND.appLogoAspect }}
                  className="h-14 w-auto object-contain"
                />
              )}
            </Link>
          ) : (
            <Link href={filteredConfig.logo.href} className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
              <div className={`w-10 h-10 bg-gradient-to-br ${accent.logo} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <LogoIcon className="w-6 h-6 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className={`${sidebarCollapsed ? 'hidden' : ''}`}>
                  <h1 className="text-base font-bold text-gray-900 leading-tight">{filteredConfig.logo.title}</h1>
                  {filteredConfig.logo.subtitle && (
                    <p className="text-xs text-gray-400 font-medium leading-tight">{filteredConfig.logo.subtitle}</p>
                  )}
                </div>
              )}
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-3 overflow-y-auto h-[calc(100vh-8rem)] sidebar-scroll">
          {filteredConfig.groups.map((group, idx) => renderMenuGroup(group as any, idx))}
        </nav>

        {/* Scrollbar styling */}
        <style jsx global>{`
          .sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
          .sidebar-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
        `}</style>
      </aside>

      {/* Collapse Toggle Button - Desktop Only */}
      <button
        onClick={toggleSidebarCollapse}
        className={`hidden lg:flex fixed top-20 z-50 items-center justify-center w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 ${
          sidebarCollapsed ? 'left-16' : 'left-[17rem]'
        }`}
        title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Main Content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-lg"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-16">
          <div className="flex items-center justify-between h-full px-6">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('layout.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setShowSearch(false); (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Enter' && isHumanify && searchQuery.trim().length >= 2) {
                      setShowSearch(false);
                      router.push(`/humanify/employees?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />

                {isHumanify && showSearch && searchQuery.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="max-h-96 overflow-y-auto">
                      {searchPages.length > 0 && (
                        <div className="py-1">
                          <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Halaman</p>
                          {searchPages.map((p) => (
                            <button
                              key={p.href}
                              onMouseDown={(e) => { e.preventDefault(); setShowSearch(false); setSearchQuery(''); router.push(p.href); }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                              <span className="truncate">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="py-1 border-t border-gray-100">
                        <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Karyawan</p>
                        {searchLoading && searchResults.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-400">Mencari…</div>
                        )}
                        {!searchLoading && searchResults.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-400">Tidak ada karyawan cocok</div>
                        )}
                        {searchResults.map((emp) => (
                          <button
                            key={emp.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowSearch(false); setSearchQuery('');
                              router.push(`/humanify/employees?search=${encodeURIComponent(emp.email || emp.name)}`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {[emp.position, emp.department].filter(Boolean).join(' · ') || emp.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  title="Language"
                >
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="hidden sm:inline text-xs font-medium text-gray-600">{languageFlags[language]} {language.toUpperCase()}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    {(Object.keys(languageNames) as Language[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setShowLangMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          language === lang ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base">{languageFlags[lang]}</span>
                        <span>{languageNames[lang]}</span>
                        {language === lang && <CheckCircle className="w-4 h-4 ml-auto text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  title="Currency"
                >
                  <span className="text-xs font-bold text-gray-500">{currencySymbols[currency]}</span>
                  <span className="hidden sm:inline text-xs font-medium text-gray-600">{currency}</span>
                </button>
                {showCurrencyMenu && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    {(Object.keys(currencyNames) as Currency[]).map((cur) => (
                      <button
                        key={cur}
                        onClick={() => { setCurrency(cur); setShowCurrencyMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          currency === cur ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base">{currencyFlags[cur]}</span>
                        <div className="flex-1 text-left">
                          <span className="font-medium">{cur}</span>
                          <span className="text-xs text-gray-400 ml-1.5">{currencyNames[cur]}</span>
                        </div>
                        {currency === cur && <CheckCircle className="w-4 h-4 ml-auto text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{t('layout.notifications')}</h3>
                      {unreadCount > 0 && (
                        <button onClick={() => handleMarkRead()} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          {t('layout.markAllRead')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">{t('layout.noNotifications')}</div>
                      )}
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.isRead) handleMarkRead(notif.id);
                            if (notif.actionHref) { setShowNotifications(false); router.push(notif.actionHref); }
                          }}
                          className={`p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              notif.type === 'urgent' ? 'bg-red-100' :
                              notif.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                            }`}>
                              {notif.type === 'urgent' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                               notif.type === 'warning' ? <Clock className="w-4 h-4 text-yellow-600" /> :
                               <CheckCircle className="w-4 h-4 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>{notif.title}</p>
                              <p className="text-sm text-gray-500 line-clamp-2">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                            </div>
                            {!notif.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-gray-50 text-center">
                      <Link href={isHumanify ? '/humanify/announcements' : '/hq/notifications'} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {t('layout.viewAllNotifications')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile / Account */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="relative flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  {session?.user?.name && (
                    <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {session.user.name}
                    </span>
                  )}
                  <ChevronDown className="hidden md:block w-4 h-4 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</p>
                          <p className="text-xs text-gray-500 truncate">{session?.user?.email || ''}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      {!isHumanify && (
                        <Link
                          href="/hq/billing-info"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          {t('layout.billingInfo')}
                        </Link>
                      )}
                      <Link
                        href={isHumanify ? '/humanify/users' : '/hq/settings'}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        {t('layout.accountSettings')}
                      </Link>
                      {!isHumanify && (
                        <Link
                          href="/hq/knowledge-base"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          {t('layout.knowledgeBase')}
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('layout.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={noPadding ? 'w-full h-[calc(100vh-4rem)] overflow-hidden' : 'p-6'}>
          {impersonating && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
              <span>
                <strong>Support mode</strong>
                {impersonatedSlug ? ` · tenant /${impersonatedSlug}` : ''}
                {(session?.user as any)?.tenantName ? ` (${(session?.user as any).tenantName})` : ''}
              </span>
              <button
                type="button"
                className="rounded-md bg-amber-900 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
                onClick={async () => {
                  await updateSession({ endImpersonation: true });
                  router.push('/platform');
                }}
              >
                Keluar support mode
              </button>
            </div>
          )}
          {!impersonating && accountAlerts.filter((a) => !dismissedAlerts.includes(a.id)).slice(0, 3).map((alert) => {
            const tone = alert.severity === 'critical'
              ? 'border-red-300 bg-red-50 text-red-950'
              : alert.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-blue-200 bg-blue-50 text-blue-950';
            const AlertIcon = alert.severity === 'critical'
              ? AlertCircle
              : alert.severity === 'warning'
                ? Clock
                : CheckCircle;
            return (
              <div
                key={alert.id}
                className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm ${tone}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="min-w-0">
                    <strong className="font-semibold">{alert.title}</strong>
                    <span className="hidden sm:inline"> — {alert.message}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {alert.actionHref && (
                    <Link href={alert.actionHref} className="underline font-medium text-xs whitespace-nowrap">
                      {alert.actionLabel || 'Lihat'}
                    </Link>
                  )}
                  {alert.severity !== 'critical' && (
                    <button
                      type="button"
                      aria-label="Tutup notifikasi"
                      className="opacity-60 hover:opacity-100 transition-opacity"
                      onClick={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showUserMenu || showLangMenu || showCurrencyMenu) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => { setShowNotifications(false); setShowUserMenu(false); setShowLangMenu(false); setShowCurrencyMenu(false); }}
        />
      )}
    </div>
  );
}

export default function HQLayout(props: HQLayoutProps) {
  return <HQLayoutContent {...props} />;
}
