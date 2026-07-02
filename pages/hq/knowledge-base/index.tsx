import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import { CATEGORIES, KB_ARTICLES, searchArticles } from '../../../lib/knowledge-base/data';
import { KBCategory } from '../../../lib/knowledge-base/types';
import {
  Search, BookOpen, Clock, ArrowRight, Star, Zap, ChevronRight,
  LayoutDashboard, Package, Wallet, UserCheck, Briefcase, Truck,
  Plug, BarChart3, Settings, Rocket, ChefHat, Factory, Send,
  MessageCircle, ShoppingBag, Shield, Building2, ShoppingCart,
  Compass, HelpCircle, TrendingUp, Users, Lightbulb, GraduationCap,
  FileText, PlayCircle, Filter, X
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Rocket, LayoutDashboard, Package, Wallet, UserCheck, Briefcase, Truck,
  Plug, BarChart3, Settings, ChefHat, Factory, Send, MessageCircle,
  ShoppingBag, Shield, Building2, ShoppingCart, Compass, BookOpen,
};

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Pemula', color: 'bg-green-100 text-green-700', icon: '🟢' },
  intermediate: { label: 'Menengah', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  advanced: { label: 'Lanjutan', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KBCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredArticles = useMemo(() => {
    let articles = searchQuery ? searchArticles(searchQuery) : KB_ARTICLES;
    if (selectedCategory !== 'all') {
      articles = articles.filter(a => a.category === selectedCategory);
    }
    if (selectedDifficulty !== 'all') {
      articles = articles.filter(a => a.difficulty === selectedDifficulty);
    }
    return articles;
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const popularArticles = KB_ARTICLES.filter(a =>
    ['onboarding-guide', 'point-of-sale', 'hris-overview', 'warehouse-inventory', 'crm-sfa'].includes(a.slug)
  );

  const totalFaqs = KB_ARTICLES.reduce((sum, a) => sum + a.faqs.length, 0);
  const hasFilters = selectedCategory !== 'all' || selectedDifficulty !== 'all' || searchQuery;

  return (
    <HQLayout>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZWMzRoNnptMC0zMHY2aC02VjRoNnptLTMwIDMwdjZIMFYzNGg2em0wLTMwdjZIMFY0aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Knowledge Base</h1>
                <p className="text-blue-100 text-sm mt-0.5">Pusat Panduan & Dokumentasi Bedagang ERP</p>
              </div>
            </div>
            <p className="text-blue-100 text-lg max-w-2xl mb-6">
              Pelajari cara menggunakan semua modul, pahami alur bisnis, dan temukan jawaban untuk pertanyaan Anda.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari panduan, modul, atau pertanyaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:outline-none shadow-lg text-base"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="flex items-center gap-2 text-white/80">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{KB_ARTICLES.length} Artikel</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">{CATEGORIES.length} Kategori</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{totalFaqs} FAQ</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <PlayCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Step-by-Step Guides</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Baru Mulai?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Panduan langkah demi langkah untuk pengguna baru Bedagang.</p>
            <Link href="/hq/knowledge-base/onboarding-guide" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Mulai Belajar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Tips & Trik</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Optimalkan penggunaan platform dengan tips dari tim kami.</p>
            <Link href="/hq/knowledge-base/navigasi-platform" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
              Lihat Tips <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Alur Bisnis</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Pahami alur kerja dan integrasi antar modul secara visual.</p>
            <Link href="/hq/knowledge-base/dashboard-operasional" className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700">
              Lihat Diagram <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Popular Articles */}
        {!hasFilters && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Artikel Populer</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularArticles.map(article => {
                const IconComponent = ICON_MAP[article.icon] || BookOpen;
                const diff = DIFFICULTY_CONFIG[article.difficulty];
                return (
                  <Link key={article.slug} href={`/hq/knowledge-base/${article.slug}`}
                    className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${article.gradient} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}>
                        {diff.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{article.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{article.subtitle}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                      <span>{article.faqs.length} FAQ</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Kategori Modul</h2>
            {selectedCategory !== 'all' && (
              <button onClick={() => setSelectedCategory('all')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <X className="w-4 h-4" /> Reset Filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORIES.map(cat => {
              const CatIcon = ICON_MAP[cat.icon] || BookOpen;
              const isActive = selectedCategory === cat.id;
              const count = KB_ARTICLES.filter(a => a.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isActive ? 'all' : cat.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-9 h-9 bg-gradient-to-br ${cat.gradient} rounded-lg flex items-center justify-center mb-2`}>
                    <CatIcon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className={`font-semibold text-sm ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{cat.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{count} artikel</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Level:</span>
          </div>
          {['all', 'beginner', 'intermediate', 'advanced'].map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                selectedDifficulty === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d === 'all' ? 'Semua' : DIFFICULTY_CONFIG[d as keyof typeof DIFFICULTY_CONFIG].label}
            </button>
          ))}
          <span className="ml-auto text-sm text-gray-500">
            {filteredArticles.length} artikel ditemukan
          </span>
        </div>

        {/* Articles List */}
        <div className="space-y-3 mb-10">
          {filteredArticles.map(article => {
            const IconComponent = ICON_MAP[article.icon] || BookOpen;
            const diff = DIFFICULTY_CONFIG[article.difficulty];
            const catInfo = CATEGORIES.find(c => c.id === article.category);
            return (
              <Link key={article.slug} href={`/hq/knowledge-base/${article.slug}`}
                className="group flex items-center gap-5 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                <div className={`w-12 h-12 bg-gradient-to-br ${article.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {catInfo && (
                      <span className="text-xs text-gray-400 font-medium">{catInfo.name}</span>
                    )}
                    <span className="text-gray-300">·</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.color}`}>
                      {diff.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{article.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{article.subtitle}</p>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                  <span className="text-xs text-gray-400">{article.usageGuide.length} langkah · {article.faqs.length} FAQ</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              </Link>
            );
          })}

          {filteredArticles.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-600 mb-1">Tidak ada hasil</h3>
              <p className="text-sm text-gray-400">Coba ubah kata kunci pencarian atau filter kategori.</p>
            </div>
          )}
        </div>

        {/* Platform Architecture Diagram */}
        {!hasFilters && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Arsitektur Platform Bedagang</h2>
            <p className="text-sm text-gray-500 mb-6">Diagram integrasi antar modul dalam ekosistem Bedagang ERP</p>
            
            <div className="relative bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-6 overflow-x-auto">
              {/* Architecture Diagram - SVG */}
              <svg viewBox="0 0 900 520" className="w-full min-w-[700px]" xmlns="http://www.w3.org/2000/svg">
                {/* Background Grid */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
                  </pattern>
                  <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#6366f1"/>
                  </linearGradient>
                  <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981"/>
                    <stop offset="100%" stopColor="#14b8a6"/>
                  </linearGradient>
                  <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#f97316"/>
                  </linearGradient>
                  <linearGradient id="grad-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899"/>
                    <stop offset="100%" stopColor="#f43f5e"/>
                  </linearGradient>
                  <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4"/>
                    <stop offset="100%" stopColor="#0ea5e9"/>
                  </linearGradient>
                  <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6"/>
                    <stop offset="100%" stopColor="#a855f7"/>
                  </linearGradient>
                  <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316"/>
                    <stop offset="100%" stopColor="#ef4444"/>
                  </linearGradient>
                  <filter id="shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                  </filter>
                </defs>
                <rect width="900" height="520" fill="url(#grid)" rx="8"/>

                {/* Center Hub */}
                <circle cx="450" cy="260" r="55" fill="url(#grad-blue)" filter="url(#shadow)"/>
                <text x="450" y="252" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">Bedagang</text>
                <text x="450" y="270" textAnchor="middle" fill="white" fontSize="11" opacity="0.9">ERP Core</text>

                {/* Modules - Orbital Layout */}
                {/* POS - Top */}
                <rect x="395" y="40" width="110" height="50" rx="12" fill="url(#grad-blue)" filter="url(#shadow)"/>
                <text x="450" y="62" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Point of Sale</text>
                <text x="450" y="78" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Kasir & Penjualan</text>
                <line x1="450" y1="90" x2="450" y2="205" stroke="#93c5fd" strokeWidth="2" strokeDasharray="5,3"/>

                {/* Inventory - Top Right */}
                <rect x="620" y="80" width="120" height="50" rx="12" fill="url(#grad-green)" filter="url(#shadow)"/>
                <text x="680" y="102" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Inventory</text>
                <text x="680" y="118" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Stok & Gudang</text>
                <line x1="630" y1="130" x2="500" y2="235" stroke="#6ee7b7" strokeWidth="2" strokeDasharray="5,3"/>

                {/* Finance - Right */}
                <rect x="700" y="220" width="120" height="50" rx="12" fill="url(#grad-amber)" filter="url(#shadow)"/>
                <text x="760" y="242" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Keuangan Pro</text>
                <text x="760" y="258" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Akuntansi & Invoice</text>
                <line x1="700" y1="250" x2="505" y2="260" stroke="#fcd34d" strokeWidth="2" strokeDasharray="5,3"/>

                {/* CRM - Bottom Right */}
                <rect x="630" y="380" width="120" height="50" rx="12" fill="url(#grad-pink)" filter="url(#shadow)"/>
                <text x="690" y="402" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">CRM & SFA</text>
                <text x="690" y="418" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Sales & Customer</text>
                <line x1="640" y1="385" x2="498" y2="295" stroke="#f9a8d4" strokeWidth="2" strokeDasharray="5,3"/>

                {/* HRIS - Bottom */}
                <rect x="370" y="430" width="160" height="50" rx="12" fill="url(#grad-cyan)" filter="url(#shadow)"/>
                <text x="450" y="452" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">HRIS</text>
                <text x="450" y="468" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">SDM, Payroll, KPI, Cuti</text>
                <line x1="450" y1="430" x2="450" y2="315" stroke="#67e8f9" strokeWidth="2" strokeDasharray="5,3"/>

                {/* Fleet/TMS - Bottom Left */}
                <rect x="140" y="380" width="130" height="50" rx="12" fill="url(#grad-orange)" filter="url(#shadow)"/>
                <text x="205" y="402" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Fleet & TMS</text>
                <text x="205" y="418" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Logistik & Transport</text>
                <line x1="260" y1="385" x2="405" y2="290" stroke="#fdba74" strokeWidth="2" strokeDasharray="5,3"/>

                {/* Branches - Left */}
                <rect x="70" y="220" width="120" height="50" rx="12" fill="url(#grad-purple)" filter="url(#shadow)"/>
                <text x="130" y="242" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Cabang</text>
                <text x="130" y="258" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Multi-Outlet</text>
                <line x1="190" y1="250" x2="395" y2="260" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="5,3"/>

                {/* Manufacturing - Top Left */}
                <rect x="155" y="80" width="130" height="50" rx="12" fill="#475569" filter="url(#shadow)"/>
                <text x="220" y="102" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Manufacturing</text>
                <text x="220" y="118" textAnchor="middle" fill="white" fontSize="9" opacity="0.8">Produksi & QC</text>
                <line x1="275" y1="130" x2="405" y2="235" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,3"/>

                {/* Integration badges */}
                <rect x="780" y="350" width="100" height="36" rx="8" fill="#059669" filter="url(#shadow)"/>
                <text x="830" y="372" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">WhatsApp</text>
                <rect x="780" y="310" width="100" height="36" rx="8" fill="#2563eb" filter="url(#shadow)"/>
                <text x="830" y="332" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Marketplace</text>
                <line x1="780" y1="368" x2="750" y2="408" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="3,2"/>
                <line x1="780" y1="328" x2="740" y2="280" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3,2"/>

                {/* Legend */}
                <rect x="20" y="480" width="860" height="30" rx="6" fill="white" opacity="0.6"/>
                <text x="40" y="500" fontSize="10" fill="#6b7280">─ ─  Alur data & integrasi antar modul</text>
                <circle cx="280" cy="496" r="5" fill="url(#grad-blue)"/>
                <text x="292" y="500" fontSize="10" fill="#6b7280">Core</text>
                <circle cx="340" cy="496" r="5" fill="url(#grad-green)"/>
                <text x="352" y="500" fontSize="10" fill="#6b7280">Operations</text>
                <circle cx="430" cy="496" r="5" fill="url(#grad-amber)"/>
                <text x="442" y="500" fontSize="10" fill="#6b7280">Finance</text>
                <circle cx="506" cy="496" r="5" fill="url(#grad-cyan)"/>
                <text x="518" y="500" fontSize="10" fill="#6b7280">HR</text>
                <circle cx="550" cy="496" r="5" fill="url(#grad-pink)"/>
                <text x="562" y="500" fontSize="10" fill="#6b7280">Sales</text>
                <circle cx="606" cy="496" r="5" fill="url(#grad-orange)"/>
                <text x="618" y="500" fontSize="10" fill="#6b7280">Logistics</text>
              </svg>
            </div>
          </div>
        )}

        {/* FAQ Highlights */}
        {!hasFilters && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Pertanyaan Umum (FAQ)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {KB_ARTICLES.flatMap(a => a.faqs.slice(0, 1).map(f => ({
                ...f, module: a.title, slug: a.slug, icon: a.icon, gradient: a.gradient
              }))).slice(0, 8).map((faq, i) => (
                <Link key={i} href={`/hq/knowledge-base/${faq.slug}`}
                  className="group p-4 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">?</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 mb-1">{faq.question}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{faq.answer}</p>
                      <span className="text-xs text-blue-500 mt-1 inline-block">{faq.module}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sources & Understanding */}
        {!hasFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Sumber Pemahaman
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Artikel Knowledge Base</strong> — Panduan lengkap per modul dengan step-by-step guide</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Diagram Sequence</strong> — Visualisasi alur data antar aktor dan sistem</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Business Flow</strong> — Alur bisnis end-to-end setiap proses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>FAQ</strong> — Jawaban cepat untuk pertanyaan yang sering diajukan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Role Guide</strong> — Akses dan permission per role pengguna</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Cara Menggunakan Knowledge Base
              </h3>
              <ol className="space-y-2.5 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span><strong>Cari</strong> — Gunakan search bar untuk menemukan topik spesifik</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span><strong>Pilih Kategori</strong> — Klik kategori untuk filter berdasarkan modul</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span><strong>Baca Artikel</strong> — Setiap artikel berisi overview, guide, diagram, dan FAQ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                  <span><strong>Ikuti Langkah</strong> — Panduan step-by-step dengan substep detail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
                  <span><strong>Jelajahi Modul Terkait</strong> — Lihat rekomendasi modul yang terintegrasi</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
