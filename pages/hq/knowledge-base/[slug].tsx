import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HQLayout from '../../../components/hq/HQLayout';
import { getArticleBySlug, KB_ARTICLES, CATEGORIES } from '../../../lib/knowledge-base/data';
import { KBArticle, SequenceStep } from '../../../lib/knowledge-base/types';
import {
  ArrowLeft, BookOpen, Clock, ChevronRight, Star, CheckCircle,
  Lightbulb, HelpCircle, ChevronDown, ChevronUp, Users,
  ArrowRight, Zap, FileText, Share2, Printer, Link2,
  LayoutDashboard, Package, Wallet, UserCheck, Briefcase, Truck,
  Plug, BarChart3, Settings, Rocket, ChefHat, Factory, Send,
  MessageCircle, ShoppingBag, Shield, Building2, ShoppingCart, Compass,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Rocket, LayoutDashboard, Package, Wallet, UserCheck, Briefcase, Truck,
  Plug, BarChart3, Settings, ChefHat, Factory, Send, MessageCircle,
  ShoppingBag, Shield, Building2, ShoppingCart, Compass, BookOpen,
};

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Pemula', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  intermediate: { label: 'Menengah', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  advanced: { label: 'Lanjutan', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const SEQ_COLORS: Record<string, string> = {
  request: '#3b82f6',
  response: '#10b981',
  action: '#f59e0b',
  notify: '#8b5cf6',
};

const SEQ_LABELS: Record<string, string> = {
  request: 'Request',
  response: 'Response',
  action: 'Action',
  notify: 'Notify',
};

// Sequence Diagram Component
function SequenceDiagram({ steps }: { steps: SequenceStep[] }) {
  const actors = useMemo(() => {
    const set = new Set<string>();
    steps.forEach(s => { set.add(s.from); set.add(s.to); });
    return Array.from(set);
  }, [steps]);

  const colWidth = 140;
  const rowHeight = 60;
  const headerHeight = 60;
  const padding = 30;
  const width = actors.length * colWidth + padding * 2;
  const height = headerHeight + steps.length * rowHeight + 40;

  const getX = (actor: string) => {
    const idx = actors.indexOf(actor);
    return padding + idx * colWidth + colWidth / 2;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
          </marker>
          <marker id="arrowhead-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
          </marker>
          <marker id="arrowhead-amber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
          </marker>
          <marker id="arrowhead-purple" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#8b5cf6" />
          </marker>
          <filter id="dshadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1"/>
          </filter>
        </defs>

        {/* Actor Headers */}
        {actors.map((actor, i) => {
          const x = getX(actor);
          return (
            <g key={actor}>
              <rect x={x - 50} y={8} width={100} height={36} rx={8} fill="#1e40af" filter="url(#dshadow)" />
              <text x={x} y={30} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{actor}</text>
              {/* Lifeline */}
              <line x1={x} y1={headerHeight} x2={x} y2={height - 10} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4,3" />
            </g>
          );
        })}

        {/* Messages */}
        {steps.map((step, i) => {
          const y = headerHeight + i * rowHeight + 30;
          const fromX = getX(step.from);
          const toX = getX(step.to);
          const color = SEQ_COLORS[step.type];
          const markerMap: Record<string, string> = {
            request: 'url(#arrowhead-blue)',
            response: 'url(#arrowhead-green)',
            action: 'url(#arrowhead-amber)',
            notify: 'url(#arrowhead-purple)',
          };
          const isSelf = step.from === step.to;
          const midX = (fromX + toX) / 2;

          if (isSelf) {
            return (
              <g key={i}>
                <path d={`M ${fromX} ${y} C ${fromX + 50} ${y}, ${fromX + 50} ${y + 25}, ${fromX} ${y + 25}`}
                  fill="none" stroke={color} strokeWidth="1.5" markerEnd={markerMap[step.type]} />
                <rect x={fromX + 8} y={y - 12} width={Math.max(step.action.length * 6 + 12, 60)} height={18} rx={4} fill={color} opacity="0.15" />
                <text x={fromX + 14} y={y} fill={color} fontSize="9" fontWeight="bold">{step.action}</text>
                <text x={fromX + 55} y={y + 18} fill="#6b7280" fontSize="8" textAnchor="middle">{step.description}</text>
              </g>
            );
          }

          const isReverse = toX < fromX;
          const lineFromX = isReverse ? fromX - 8 : fromX + 8;
          const lineToX = isReverse ? toX + 8 : toX - 8;

          return (
            <g key={i}>
              <line x1={lineFromX} y1={y} x2={lineToX} y2={y}
                stroke={color} strokeWidth="1.5" markerEnd={markerMap[step.type]}
                strokeDasharray={step.type === 'response' ? '5,3' : 'none'} />
              <rect x={midX - Math.max(step.action.length * 3.2 + 8, 30)} y={y - 18}
                width={Math.max(step.action.length * 6.4 + 16, 60)} height={16} rx={4}
                fill="white" stroke={color} strokeWidth="0.8" />
              <text x={midX} y={y - 7} textAnchor="middle" fill={color} fontSize="8.5" fontWeight="bold">{step.action}</text>
              <text x={midX} y={y + 13} textAnchor="middle" fill="#9ca3af" fontSize="7.5">{step.description}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Business Flow Diagram Component
function BusinessFlowDiagram({ flow }: { flow: KBArticle['businessFlow'] }) {
  return (
    <div className="space-y-3">
      {flow.steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
              i === 0 ? 'bg-blue-600' :
              i === flow.steps.length - 1 ? 'bg-green-600' :
              'bg-indigo-500'
            }`}>
              {step.id}
            </div>
            {i < flow.steps.length - 1 && (
              <div className="w-0.5 h-8 bg-gray-200 mt-1" />
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold text-gray-900 text-sm">{step.label}</h4>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{step.actor}</span>
            </div>
            <p className="text-sm text-gray-600">{step.description}</p>
            <p className="text-xs text-blue-600 mt-0.5">→ {step.action}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Usage Guide Steps Component
function UsageGuide({ steps }: { steps: KBArticle['usageGuide'] }) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const toggle = (step: number) => {
    setExpandedSteps(prev =>
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const isOpen = expandedSteps.includes(i);
        return (
          <div key={step.step} className={`border rounded-xl transition-all ${isOpen ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
            <button onClick={() => toggle(i)} className="w-full flex items-center gap-4 p-4 text-left">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {step.step}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
                {!isOpen && <p className="text-xs text-gray-500 truncate">{step.description}</p>}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pl-16">
                <p className="text-sm text-gray-700 mb-2">{step.description}</p>
                {step.substeps && step.substeps.length > 0 && (
                  <ul className="space-y-1.5">
                    {step.substeps.map((sub, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{sub}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// FAQ Accordion Component
function FAQSection({ faqs }: { faqs: KBArticle['faqs'] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div key={i} className={`border rounded-xl overflow-hidden transition-all ${openIndex === i ? 'border-blue-200' : 'border-gray-200'}`}>
          <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              openIndex === i ? 'bg-blue-600' : 'bg-blue-100'
            }`}>
              <HelpCircle className={`w-4 h-4 ${openIndex === i ? 'text-white' : 'text-blue-600'}`} />
            </div>
            <span className="flex-1 font-medium text-sm text-gray-800">{faq.question}</span>
            {openIndex === i ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {openIndex === i && (
            <div className="px-4 pb-4 pl-14">
              <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Table of Contents Component
function TableOfContents({ activeSection }: { activeSection: string }) {
  const sections = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'features', label: 'Fitur Utama' },
    { id: 'business-flow', label: 'Alur Bisnis' },
    { id: 'sequence', label: 'Sequence Diagram' },
    { id: 'guide', label: 'Panduan Penggunaan' },
    { id: 'tips', label: 'Tips & Trik' },
    { id: 'faq', label: 'FAQ' },
    { id: 'roles', label: 'Akses & Role' },
    { id: 'related', label: 'Modul Terkait' },
  ];

  return (
    <nav className="sticky top-20">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Daftar Isi</h3>
      <ul className="space-y-1">
        {sections.map(s => (
          <li key={s.id}>
            <a href={`#${s.id}`}
              className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                activeSection === s.id
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function KnowledgeBaseArticlePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [activeSection, setActiveSection] = useState('overview');

  const article = useMemo(() => {
    if (typeof slug === 'string') return getArticleBySlug(slug);
    return undefined;
  }, [slug]);

  if (!article) {
    return (
      <HQLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Artikel Tidak Ditemukan</h1>
          <p className="text-gray-500 mb-6">Artikel yang Anda cari tidak tersedia.</p>
          <Link href="/hq/knowledge-base" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Knowledge Base
          </Link>
        </div>
      </HQLayout>
    );
  }

  const ArticleIcon = ICON_MAP[article.icon] || BookOpen;
  const diff = DIFFICULTY_CONFIG[article.difficulty];
  const catInfo = CATEGORIES.find(c => c.id === article.category);

  const relatedArticles = KB_ARTICLES.filter(a =>
    article.relatedModules.includes(a.module) && a.slug !== article.slug
  ).slice(0, 4);

  return (
    <HQLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/hq/knowledge-base" className="hover:text-blue-600 transition-colors">Knowledge Base</Link>
          <ChevronRight className="w-4 h-4" />
          {catInfo && (
            <>
              <Link href={`/hq/knowledge-base?category=${article.category}`} className="hover:text-blue-600 transition-colors">{catInfo.name}</Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-gray-700 font-medium truncate">{article.title}</span>
        </div>

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Article Header */}
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${article.gradient} p-6 md:p-8 mb-6`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <ArticleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{article.title}</h1>
                    <p className="text-white/80 text-sm mt-0.5">{article.subtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-white/20 text-white backdrop-blur-sm`}>
                    {diff.label}
                  </span>
                  <span className="text-xs text-white/70 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {article.readTime}
                  </span>
                  <span className="text-xs text-white/70 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {article.usageGuide.length} langkah
                  </span>
                  <span className="text-xs text-white/70 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" /> {article.faqs.length} FAQ
                  </span>
                  <span className="text-xs text-white/60 ml-auto">
                    Diperbarui: {article.lastUpdated}
                  </span>
                </div>
              </div>
            </div>

            {/* Overview Section */}
            <section id="overview" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Ringkasan
              </h2>
              <p className="text-gray-700 leading-relaxed">{article.overview}</p>
            </section>

            {/* Key Features */}
            <section id="features" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Fitur Utama
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {article.keyFeatures.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feat}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Business Flow */}
            <section id="business-flow" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Alur Bisnis: {article.businessFlow.title}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{article.businessFlow.description}</p>

              {/* Horizontal Flow Chart */}
              <div className="overflow-x-auto pb-2 mb-6">
                <div className="flex items-center gap-2 min-w-max">
                  {article.businessFlow.steps.map((step, i) => (
                    <React.Fragment key={step.id}>
                      <div className={`flex-shrink-0 w-36 p-3 rounded-xl border-2 ${
                        i === 0 ? 'border-blue-300 bg-blue-50' :
                        i === article.businessFlow.steps.length - 1 ? 'border-green-300 bg-green-50' :
                        'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            i === 0 ? 'bg-blue-600' : i === article.businessFlow.steps.length - 1 ? 'bg-green-600' : 'bg-indigo-500'
                          }`}>{step.id}</span>
                          <span className="text-xs font-bold text-gray-800 truncate">{step.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">{step.description}</p>
                        <div className="mt-1.5 text-[9px] text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 truncate">{step.actor}</div>
                      </div>
                      {i < article.businessFlow.steps.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Vertical Detail */}
              <BusinessFlowDiagram flow={article.businessFlow} />
            </section>

            {/* Sequence Diagram */}
            <section id="sequence" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                Sequence Diagram
              </h2>
              <p className="text-sm text-gray-500 mb-4">Visualisasi alur interaksi antar aktor dan sistem</p>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                {Object.entries(SEQ_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5" style={{ backgroundColor: SEQ_COLORS[key] }} />
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4">
                <SequenceDiagram steps={article.sequenceDiagram} />
              </div>
            </section>

            {/* Usage Guide */}
            <section id="guide" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Panduan Penggunaan Step-by-Step
              </h2>
              <p className="text-sm text-gray-500 mb-4">Ikuti langkah berikut untuk menggunakan fitur ini</p>
              <UsageGuide steps={article.usageGuide} />
            </section>

            {/* Tips */}
            <section id="tips" className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Tips & Trik
              </h2>
              <div className="space-y-2">
                {article.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 text-sm mt-0.5">💡</span>
                    <p className="text-sm text-gray-700">{tip}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                Pertanyaan Umum (FAQ)
              </h2>
              <FAQSection faqs={article.faqs} />
            </section>

            {/* User Roles */}
            <section id="roles" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Akses Berdasarkan Role
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Role</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Akses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {article.userRoles.map((ur, i) => (
                      <tr key={i} className={i % 2 ? 'bg-gray-50/50' : 'bg-white'}>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{ur.role}</td>
                        <td className="px-4 py-2.5 text-gray-600">{ur.access}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Related Modules */}
            <section id="related" className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-600" />
                Modul Terkait
              </h2>
              {relatedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {relatedArticles.map(ra => {
                    const RAIcon = ICON_MAP[ra.icon] || BookOpen;
                    return (
                      <Link key={ra.slug} href={`/hq/knowledge-base/${ra.slug}`}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                        <div className={`w-10 h-10 bg-gradient-to-br ${ra.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <RAIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 truncate">{ra.title}</h4>
                          <p className="text-xs text-gray-500 truncate">{ra.subtitle}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Modul terkait: {article.relatedModules.join(', ')}</p>
              )}
            </section>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 mb-8">
              <Link href="/hq/knowledge-base" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 font-medium">
                <ArrowLeft className="w-4 h-4" /> Kembali ke Knowledge Base
              </Link>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <Printer className="w-4 h-4" /> Cetak
              </button>
            </div>
          </div>

          {/* Sidebar - Table of Contents (desktop only) */}
          <div className="hidden lg:block w-52 flex-shrink-0">
            <TableOfContents activeSection={activeSection} />
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
