import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import HQLayout from '@/components/hq/HQLayout';
import { BuilderPage, DEFAULT_SEO } from '@/components/website-builder/types';
import { getWidgetDefinition } from '@/components/website-builder/widgets/registry';
import {
  Plus, Search, FileText, Globe, Trash2, Edit3, Copy, Eye, MoreVertical,
  Monitor, Tablet, Smartphone, Clock, Layout, Code2, Sparkles, Home,
  ChevronRight, ExternalLink, Settings, Palette, LayoutGrid, Zap,
  Rocket, BookOpen, ShoppingCart, Users, Star, ArrowRight,
} from 'lucide-react';

const STORAGE_KEY = 'bedagang-website-builder';

const templates = [
  {
    id: 'blank',
    name: 'Halaman Kosong',
    description: 'Mulai dari nol dengan kanvas kosong',
    icon: FileText,
    color: '#6b7280',
    widgets: [],
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Halaman arahan dengan hero, fitur, dan CTA',
    icon: Rocket,
    color: '#3b82f6',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'heading', y: 2 },
      { type: 'paragraph', y: 4 },
      { type: 'button', y: 7 },
      { type: 'cards', y: 10 },
      { type: 'cta', y: 16 },
      { type: 'footer', y: 20 },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Dashboard dengan widget statistik dan grafik',
    icon: LayoutGrid,
    color: '#10b981',
    widgets: [
      { type: 'heading', y: 0 },
      { type: 'statsCard', y: 2, x: 0, w: 3 },
      { type: 'statsCard', y: 2, x: 3, w: 3 },
      { type: 'statsCard', y: 2, x: 6, w: 3 },
      { type: 'statsCard', y: 2, x: 9, w: 3 },
      { type: 'barChart', y: 5, x: 0 },
      { type: 'lineChart', y: 5, x: 6 },
      { type: 'table', y: 10 },
    ],
  },
  {
    id: 'product',
    name: 'Halaman Produk',
    description: 'Showcase produk dengan galeri dan detail',
    icon: ShoppingCart,
    color: '#f59e0b',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'breadcrumb', y: 2 },
      { type: 'image', y: 3, x: 0, w: 6 },
      { type: 'heading', y: 3, x: 6, w: 6 },
      { type: 'paragraph', y: 5, x: 6, w: 6 },
      { type: 'button', y: 8, x: 6, w: 3 },
      { type: 'divider', y: 11 },
      { type: 'testimonial', y: 12, x: 0, w: 4 },
      { type: 'testimonial', y: 12, x: 4, w: 4 },
      { type: 'testimonial', y: 12, x: 8, w: 4 },
      { type: 'footer', y: 17 },
    ],
  },
  {
    id: 'contact',
    name: 'Halaman Kontak',
    description: 'Form kontak dengan peta dan informasi',
    icon: Users,
    color: '#8b5cf6',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'heading', y: 2 },
      { type: 'paragraph', y: 4 },
      { type: 'contactForm', y: 7, x: 0, w: 7 },
      { type: 'list', y: 7, x: 7, w: 5 },
      { type: 'socialLinks', y: 15 },
      { type: 'footer', y: 17 },
    ],
  },
  {
    id: 'pricing',
    name: 'Halaman Harga',
    description: 'Tabel perbandingan harga paket',
    icon: Star,
    color: '#ec4899',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'heading', y: 2 },
      { type: 'paragraph', y: 4 },
      { type: 'priceCard', y: 7, x: 0, w: 4 },
      { type: 'priceCard', y: 7, x: 4, w: 4 },
      { type: 'priceCard', y: 7, x: 8, w: 4 },
      { type: 'cta', y: 15 },
      { type: 'footer', y: 19 },
    ],
  },
  {
    id: 'blog',
    name: 'Blog / Artikel',
    description: 'Layout blog dengan sidebar dan daftar artikel',
    icon: BookOpen,
    color: '#0ea5e9',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'heading', y: 2 },
      { type: 'searchBar', y: 4 },
      { type: 'cards', y: 6, x: 0, w: 8 },
      { type: 'list', y: 6, x: 8, w: 4 },
      { type: 'pagination', y: 14 },
      { type: 'newsletter', y: 16 },
      { type: 'footer', y: 20 },
    ],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Showcase portfolio dengan galeri masonry',
    icon: Layout,
    color: '#6366f1',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'heading', y: 2 },
      { type: 'paragraph', y: 4 },
      { type: 'gallery', y: 6 },
      { type: 'testimonial', y: 12, x: 0, w: 6 },
      { type: 'testimonial', y: 12, x: 6, w: 6 },
      { type: 'contactForm', y: 17 },
      { type: 'footer', y: 22 },
    ],
  },
  {
    id: 'restaurant',
    name: 'Restoran / F&B',
    description: 'Halaman restoran dengan menu, reservasi & lokasi',
    icon: Zap,
    color: '#ef4444',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'image', y: 2 },
      { type: 'heading', y: 5 },
      { type: 'paragraph', y: 7 },
      { type: 'fnbMenuWidget', y: 9 },
      { type: 'bookingWidget', y: 16, x: 0, w: 6 },
      { type: 'branchWidget', y: 16, x: 6, w: 6 },
      { type: 'footer', y: 22 },
    ],
  },
  {
    id: 'ecommerce',
    name: 'Toko Online',
    description: 'Storefront e-commerce dengan katalog produk',
    icon: ShoppingCart,
    color: '#059669',
    widgets: [
      { type: 'navbar', y: 0 },
      { type: 'image', y: 2 },
      { type: 'heading', y: 5 },
      { type: 'productCatalogWidget', y: 7 },
      { type: 'testimonial', y: 14, x: 0, w: 4 },
      { type: 'testimonial', y: 14, x: 4, w: 4 },
      { type: 'testimonial', y: 14, x: 8, w: 4 },
      { type: 'cta', y: 19 },
      { type: 'footer', y: 23 },
    ],
  },
];

function createPageFromTemplate(
  templateId: string,
  pageName: string,
  pageSlug: string
): BuilderPage {
  const template = templates.find(t => t.id === templateId);

  const widgets = (template?.widgets || []).map((tw: any) => {
    const def = getWidgetDefinition(tw.type);
    if (!def) return null;

    const id = uuidv4();
    const props: Record<string, any> = {};
    def.properties.forEach((p: any) => { props[p.key] = p.defaultValue; });

    return {
      id,
      type: tw.type,
      properties: props,
      layout: {
        i: id,
        x: tw.x ?? 0,
        y: tw.y ?? 0,
        w: tw.w ?? def.defaultSize.w,
        h: def.defaultSize.h,
        minW: def.minSize?.w,
        minH: def.minSize?.h,
        maxW: def.maxSize?.w,
        maxH: def.maxSize?.h,
      },
    };
  }).filter(Boolean) as BuilderPage['widgets'];

  return {
    id: uuidv4(),
    name: pageName,
    slug: pageSlug,
    widgets,
    sections: [],
    status: 'draft' as const,
    settings: {
      title: pageName,
      description: '',
      backgroundColor: '#ffffff',
      maxWidth: '1200px',
      padding: '24px',
      fontFamily: 'Inter, sans-serif',
    },
    seo: { ...DEFAULT_SEO, metaTitle: pageName },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function WebsiteBuilderIndex() {
  const router = useRouter();
  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Support both old format (array) and new format (object with pages)
        const rawPages: BuilderPage[] = Array.isArray(data) ? data : (data.pages || []);
        const migrated = rawPages.map((p: any) => ({
          ...p,
          sections: p.sections || [],
          seo: p.seo || { ...DEFAULT_SEO, metaTitle: p.name },
          version: p.version || 1,
        }));
        setPages(migrated);
      }
    } catch {}
  }, []);

  const savePages = useCallback((newPages: BuilderPage[]) => {
    setPages(newPages);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPages));
  }, []);

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;
    const slug = newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newPage = createPageFromTemplate(selectedTemplate, newPageName.trim(), slug);
    savePages([...pages, newPage]);
    setShowCreateModal(false);
    setNewPageName('');
    setSelectedTemplate('blank');
    router.push(`/hq/website-builder/editor?pageId=${newPage.id}`);
  };

  const handleDeletePage = (id: string) => {
    savePages(pages.filter(p => p.id !== id));
    setActiveMenu(null);
  };

  const handleDuplicatePage = (page: BuilderPage) => {
    const dup: BuilderPage = {
      ...JSON.parse(JSON.stringify(page)),
      id: uuidv4(),
      name: `${page.name} (Salinan)`,
      slug: `${page.slug}-copy-${Date.now()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePages([...pages, dup]);
    setActiveMenu(null);
  };

  const filteredPages = searchQuery
    ? pages.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pages;

  return (
    <HQLayout>
      <Head>
        <title>Website Builder - Bedagang ERP</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/hq/home" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ChevronRight size={20} className="rotate-180" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Code2 size={18} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">Website Builder</h1>
                      <p className="text-xs text-gray-500">Buat dan kelola halaman website dengan drag & drop</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari halaman..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50
                      focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400
                      w-64 transition-all"
                  />
                </div>

                {/* Create Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600
                    text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700
                    transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                >
                  <Plus size={16} />
                  Buat Halaman
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Site Status Banner */}
        {pages.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div className="bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-indigo-500/5 rounded-2xl border border-purple-100 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Globe size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Status Situs</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        pages.some(p => p.status === 'published')
                          ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pages.some(p => p.status === 'published') ? 'bg-green-500' : 'bg-amber-500'}`} />
                        {pages.some(p => p.status === 'published') ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {pages.length} halaman · {pages.reduce((s, p) => s + p.widgets.length, 0)} widget
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={pages.length > 0 ? `/hq/website-builder/editor?pageId=${pages[0].id}` : '#'}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Edit3 size={13} /> Buka Editor
                  </Link>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
                  >
                    <Plus size={13} /> Halaman Baru
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Halaman', value: pages.length, icon: FileText, color: 'blue' },
              { label: 'Terbit', value: pages.filter(p => p.status === 'published').length, icon: Globe, color: 'green' },
              { label: 'Draf', value: pages.filter(p => p.status === 'draft').length, icon: Edit3, color: 'amber' },
              { label: 'Total Widget', value: pages.reduce((s, p) => s + p.widgets.length, 0), icon: Layout, color: 'purple' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-50`}>
                  <stat.icon size={18} className={`text-${stat.color}-500`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pages Grid */}
          {filteredPages.length === 0 && !searchQuery ? (
            // Empty State
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} className="text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mulai Bangun Website Anda</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-8">
                Buat halaman website profesional dengan drag & drop builder yang mudah digunakan.
                Pilih template atau mulai dari nol.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600
                  text-white font-semibold hover:from-violet-600 hover:to-purple-700
                  transition-all shadow-lg shadow-purple-500/25"
              >
                <Plus size={20} />
                Buat Halaman Pertama
              </button>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Tidak ditemukan</p>
              <p className="text-sm">&quot;{searchQuery}&quot; tidak cocok dengan halaman manapun</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPages.map(page => (
                <div
                  key={page.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl
                    hover:border-purple-200 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Page Preview / Thumbnail */}
                  <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-24 bg-white rounded-lg shadow-md border border-gray-200 p-3">
                        <div className="w-full h-2 bg-gray-200 rounded mb-2" />
                        <div className="w-3/4 h-2 bg-gray-100 rounded mb-2" />
                        <div className="flex gap-1">
                          <div className="w-1/2 h-8 bg-gray-100 rounded" />
                          <div className="w-1/2 h-8 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </div>

                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Link
                          href={`/hq/website-builder/editor?pageId=${page.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-gray-800 text-sm font-semibold
                            shadow-lg hover:bg-gray-50 transition-colors"
                        >
                          <Edit3 size={14} />
                          Edit
                        </Link>
                        <button
                          className="p-2 rounded-lg bg-white/90 text-gray-600 shadow-lg hover:bg-white transition-colors"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        page.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {page.status === 'published' ? 'Terbit' : 'Draf'}
                      </span>
                    </div>

                    {/* Menu */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === page.id ? null : page.id); }}
                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-gray-600 shadow-sm transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {activeMenu === page.id && (
                        <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                          <Link
                            href={`/hq/website-builder/editor?pageId=${page.id}`}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 size={14} />
                            Edit Halaman
                          </Link>
                          <button
                            onClick={() => handleDuplicatePage(page)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy size={14} />
                            Duplikasi
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => handleDeletePage(page.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Widget Count */}
                    <div className="absolute bottom-3 right-3">
                      <span className="text-[10px] font-medium text-gray-500 bg-white/80 px-2 py-1 rounded-md">
                        {page.widgets.length} widget
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{page.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                          <Globe size={11} />
                          <span className="truncate">/{page.slug}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={11} />
                        <span>{new Date(page.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <Link
                        href={`/hq/website-builder/editor?pageId=${page.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        Buka Editor
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Page Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Buat Halaman Baru</h2>
                    <p className="text-sm text-gray-500">Pilih template untuk memulai</p>
                  </div>
                  <button
                    onClick={() => { setShowCreateModal(false); setNewPageName(''); setSelectedTemplate('blank'); }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
                  >
                    <Plus size={18} className="rotate-45" />
                  </button>
                </div>
              </div>

              {/* Page Name Input */}
              <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Halaman</label>
                <input
                  type="text"
                  placeholder="Contoh: Beranda, Tentang Kami, Produk..."
                  value={newPageName}
                  onChange={e => setNewPageName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white
                    focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  onKeyDown={e => { if (e.key === 'Enter' && newPageName.trim()) handleCreatePage(); }}
                />
                {newPageName && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                    <Globe size={11} />
                    <span>/{newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}</span>
                  </div>
                )}
              </div>

              {/* Templates */}
              <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                <label className="block text-sm font-medium text-gray-700 mb-3">Pilih Template</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templates.map(template => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplate === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-500/10'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                          style={{ backgroundColor: `${template.color}15` }}
                        >
                          <Icon size={20} style={{ color: template.color }} />
                        </div>
                        <div className="text-sm font-semibold text-gray-800">{template.name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{template.description}</div>
                        {template.widgets.length > 0 && (
                          <div className="mt-2 text-[10px] text-gray-400">
                            {template.widgets.length} widget
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setShowCreateModal(false); setNewPageName(''); setSelectedTemplate('blank'); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreatePage}
                  disabled={!newPageName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600
                    text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  <Sparkles size={14} />
                  Buat & Buka Editor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
