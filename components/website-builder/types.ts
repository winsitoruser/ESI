import { LucideIcon } from 'lucide-react';

// ============================================
// PROPERTY & WIDGET TYPES
// ============================================

export type PropertyType = 
  | 'text' | 'textarea' | 'number' | 'color' | 'select' 
  | 'boolean' | 'image' | 'spacing' | 'alignment' | 'slider'
  | 'icon' | 'font' | 'border' | 'shadow' | 'url' | 'richtext';

export interface WidgetProperty {
  key: string;
  label: string;
  type: PropertyType;
  defaultValue: any;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  group?: string;
  placeholder?: string;
  responsive?: boolean;
}

export type WidgetCategory =
  | 'layout'
  | 'text'
  | 'media'
  | 'navigation'
  | 'forms'
  | 'data'
  | 'commerce'
  | 'social'
  | 'charts'
  | 'modules'
  | 'integration';

export interface WidgetDefinition {
  type: string;
  name: string;
  icon: LucideIcon;
  category: WidgetCategory;
  description: string;
  properties: WidgetProperty[];
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  tags?: string[];
}

export interface WidgetInstance {
  id: string;
  type: string;
  properties: Record<string, any>;
  layout: {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  responsiveOverrides?: Partial<Record<DeviceType, Record<string, any>>>;
  locked?: boolean;
  hidden?: boolean;
  hiddenOn?: DeviceType[];
}

// ============================================
// SEO TYPES
// ============================================

export interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: 'website' | 'article' | 'product';
  twitterCard: 'summary' | 'summary_large_image';
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  structuredData: StructuredDataItem[];
  robotsIndex: boolean;
  robotsFollow: boolean;
  sitemap: boolean;
  sitemapPriority: number;
  sitemapChangeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  customHeadTags: string;
  analyticsId: string;
  schemaType: 'Organization' | 'LocalBusiness' | 'WebPage' | 'Article' | 'Product';
}

export interface StructuredDataItem {
  type: string;
  properties: Record<string, string>;
}

export const DEFAULT_SEO: SEOSettings = {
  metaTitle: '',
  metaDescription: '',
  metaKeywords: [],
  canonicalUrl: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  structuredData: [],
  robotsIndex: true,
  robotsFollow: true,
  sitemap: true,
  sitemapPriority: 0.5,
  sitemapChangeFreq: 'weekly',
  customHeadTags: '',
  analyticsId: '',
  schemaType: 'WebPage',
};

// ============================================
// DOMAIN & PUBLISHING TYPES
// ============================================

export type DomainType = 'subdomain' | 'custom';
export type SSLStatus = 'none' | 'pending' | 'active' | 'error';
export type PublishStatus = 'draft' | 'published' | 'scheduled' | 'unpublished';
export type DNSStatus = 'pending' | 'verified' | 'error' | 'not_configured';

export interface DomainSettings {
  domainType: DomainType;
  subdomain: string;
  customDomain: string;
  sslStatus: SSLStatus;
  sslCertExpiry: string | null;
  dnsStatus: DNSStatus;
  dnsRecords: DNSRecord[];
  enableWWW: boolean;
  forceHTTPS: boolean;
  customNotFoundPage: string;
  favicon: string;
}

export interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  value: string;
  status: 'pending' | 'verified' | 'error';
}

export interface PublishConfig {
  status: PublishStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  publishedUrl: string;
  version: number;
  autoPublish: boolean;
  password: string;
  passwordProtected: boolean;
  allowIndexing: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export const DEFAULT_DOMAIN: DomainSettings = {
  domainType: 'subdomain',
  subdomain: '',
  customDomain: '',
  sslStatus: 'none',
  sslCertExpiry: null,
  dnsStatus: 'not_configured',
  dnsRecords: [],
  enableWWW: true,
  forceHTTPS: true,
  customNotFoundPage: '',
  favicon: '',
};

export const DEFAULT_PUBLISH: PublishConfig = {
  status: 'draft',
  publishedAt: null,
  scheduledAt: null,
  publishedUrl: '',
  version: 1,
  autoPublish: false,
  password: '',
  passwordProtected: false,
  allowIndexing: true,
  maintenanceMode: false,
  maintenanceMessage: 'Situs sedang dalam pemeliharaan. Silakan kembali nanti.',
};

// ============================================
// THEME / GLOBAL STYLES TYPES
// ============================================

export interface ThemeSettings {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorSuccess: string;
  colorWarning: string;
  colorDanger: string;
  colorText: string;
  colorTextSecondary: string;
  colorBackground: string;
  colorSurface: string;
  colorBorder: string;
  fontHeading: string;
  fontBody: string;
  fontMonospace: string;
  fontSizeBase: number;
  fontSizeScale: number;
  lineHeightBase: number;
  borderRadius: number;
  borderWidth: number;
  shadowStyle: 'none' | 'subtle' | 'medium' | 'strong';
  spacing: number;
  maxWidth: number;
  containerPadding: number;
  buttonStyle: 'rounded' | 'pill' | 'square';
  inputStyle: 'rounded' | 'underline' | 'square';
  animationSpeed: 'none' | 'fast' | 'normal' | 'slow';
  customCSS: string;
  darkMode: boolean;
  darkColorBackground: string;
  darkColorSurface: string;
  darkColorText: string;
}

export const DEFAULT_THEME: ThemeSettings = {
  colorPrimary: '#6366f1',
  colorSecondary: '#8b5cf6',
  colorAccent: '#06b6d4',
  colorSuccess: '#10b981',
  colorWarning: '#f59e0b',
  colorDanger: '#ef4444',
  colorText: '#1f2937',
  colorTextSecondary: '#6b7280',
  colorBackground: '#ffffff',
  colorSurface: '#f9fafb',
  colorBorder: '#e5e7eb',
  fontHeading: 'Plus Jakarta Sans, sans-serif',
  fontBody: 'Inter, sans-serif',
  fontMonospace: 'JetBrains Mono, monospace',
  fontSizeBase: 16,
  fontSizeScale: 1.25,
  lineHeightBase: 1.6,
  borderRadius: 8,
  borderWidth: 1,
  shadowStyle: 'subtle',
  spacing: 16,
  maxWidth: 1200,
  containerPadding: 24,
  buttonStyle: 'rounded',
  inputStyle: 'rounded',
  animationSpeed: 'normal',
  customCSS: '',
  darkMode: false,
  darkColorBackground: '#111827',
  darkColorSurface: '#1f2937',
  darkColorText: '#f9fafb',
};

// ============================================
// RESPONSIVE BREAKPOINTS
// ============================================

export interface ResponsiveBreakpoint {
  id: DeviceType;
  label: string;
  width: number;
  height: number;
  icon: string;
}

export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900, icon: 'Monitor' },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: 'Tablet' },
  { id: 'mobile', label: 'Mobile', width: 375, height: 812, icon: 'Smartphone' },
];

// ============================================
// TEMPLATE TYPES
// ============================================

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  color: string;
  icon: string;
  widgets: TemplateWidget[];
  seo?: Partial<SEOSettings>;
  theme?: Partial<ThemeSettings>;
  tags: string[];
  isPremium: boolean;
}

export interface TemplateWidget {
  type: string;
  x?: number;
  y: number;
  w?: number;
  h?: number;
  properties?: Record<string, any>;
}

// ============================================
// ROW / COLUMN TYPES (Elementor-like)
// ============================================

export interface ColumnStyle {
  backgroundColor: string;
  padding: number;
  verticalAlign: 'top' | 'middle' | 'bottom' | 'stretch';
  borderRadius: number;
  shadow: 'none' | 'sm' | 'md' | 'lg';
  customCSS: string;
}

export const DEFAULT_COLUMN_STYLE: ColumnStyle = {
  backgroundColor: 'transparent',
  padding: 8,
  verticalAlign: 'top',
  borderRadius: 0,
  shadow: 'none',
  customCSS: '',
};

export interface BuilderColumn {
  id: string;
  width: number; // percentage 0-100
  widgets: WidgetInstance[];
  style: ColumnStyle;
}

export interface RowStyle {
  backgroundColor: string;
  gap: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  marginTop: number;
  marginBottom: number;
  minHeight: number;
  verticalAlign: 'top' | 'middle' | 'bottom' | 'stretch';
  reverseOnMobile: boolean;
  stackOnMobile: boolean;
  fullWidth: boolean;
  customCSS: string;
}

export const DEFAULT_ROW_STYLE: RowStyle = {
  backgroundColor: 'transparent',
  gap: 16,
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 0,
  paddingRight: 0,
  marginTop: 0,
  marginBottom: 0,
  minHeight: 0,
  verticalAlign: 'stretch',
  reverseOnMobile: false,
  stackOnMobile: true,
  fullWidth: false,
  customCSS: '',
};

export interface BuilderRow {
  id: string;
  columns: BuilderColumn[];
  style: RowStyle;
  collapsed?: boolean;
  locked?: boolean;
  hidden?: boolean;
  order: number;
}

// Row layout presets (column width distributions)
export interface RowLayoutPreset {
  id: string;
  label: string;
  columns: number[]; // widths in percent
  icon: string; // visual representation
}

export const ROW_LAYOUT_PRESETS: RowLayoutPreset[] = [
  { id: '100', label: '1 Column', columns: [100], icon: '█████████████' },
  { id: '50-50', label: '2 Equal', columns: [50, 50], icon: '██████ ██████' },
  { id: '33-33-33', label: '3 Equal', columns: [33.33, 33.33, 33.34], icon: '████ ████ ████' },
  { id: '25-25-25-25', label: '4 Equal', columns: [25, 25, 25, 25], icon: '███ ███ ███ ███' },
  { id: '30-70', label: 'Left Sidebar', columns: [30, 70], icon: '████ ████████' },
  { id: '70-30', label: 'Right Sidebar', columns: [70, 30], icon: '████████ ████' },
  { id: '25-50-25', label: 'Center Wide', columns: [25, 50, 25], icon: '███ ██████ ███' },
  { id: '60-40', label: 'Left Wide', columns: [60, 40], icon: '███████ █████' },
  { id: '40-60', label: 'Right Wide', columns: [40, 60], icon: '█████ ███████' },
  { id: '20-60-20', label: 'Centered', columns: [20, 60, 20], icon: '██ ████████ ██' },
];

// ============================================
// SECTION / BLOCK TYPES
// ============================================

export interface SectionStyle {
  backgroundColor: string;
  backgroundImage: string;
  backgroundOverlay: string;
  backgroundOverlayOpacity: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  marginTop: number;
  marginBottom: number;
  maxWidth: 'full' | 'container' | 'narrow';
  minHeight: number;
  borderTop: string;
  borderBottom: string;
  borderRadius: number;
  customCSS: string;
}

export const DEFAULT_SECTION_STYLE: SectionStyle = {
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundOverlay: '#000000',
  backgroundOverlayOpacity: 0,
  paddingTop: 48,
  paddingBottom: 48,
  paddingLeft: 24,
  paddingRight: 24,
  marginTop: 0,
  marginBottom: 0,
  maxWidth: 'container',
  minHeight: 0,
  borderTop: 'none',
  borderBottom: 'none',
  borderRadius: 0,
  customCSS: '',
};

export interface Section {
  id: string;
  name: string;
  type: 'header' | 'hero' | 'content' | 'features' | 'cta' | 'testimonials' | 'gallery' | 'pricing' | 'contact' | 'footer' | 'custom';
  widgets: WidgetInstance[]; // legacy flat widgets (backward compat)
  rows: BuilderRow[]; // new row/column structure
  style: SectionStyle;
  collapsed?: boolean;
  locked?: boolean;
  hidden?: boolean;
  order: number;
}

export interface SectionTemplateItem {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'content' | 'features' | 'cta' | 'testimonials' | 'gallery' | 'pricing' | 'contact' | 'header' | 'footer' | 'ecommerce' | 'stats';
  thumbnail: string;
  color: string;
  sectionType: Section['type'];
  widgets: Array<{
    type: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    properties?: Record<string, any>;
  }>;
  style?: Partial<SectionStyle>;
  tags: string[];
}

export const SECTION_CATEGORY_LABELS: Record<SectionTemplateItem['category'], string> = {
  hero: 'Hero / Banner',
  content: 'Konten',
  features: 'Fitur',
  cta: 'Call to Action',
  testimonials: 'Testimoni',
  gallery: 'Galeri',
  pricing: 'Harga',
  contact: 'Kontak',
  header: 'Header / Navbar',
  footer: 'Footer',
  ecommerce: 'E-Commerce',
  stats: 'Statistik',
};

// ============================================
// PAGE (UPDATED)
// ============================================

export interface BuilderPage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  widgets: WidgetInstance[];
  sections: Section[];
  settings: PageSettings;
  seo: SEOSettings;
  isHome?: boolean;
  status: PublishStatus;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  version: number;
}

export interface PageSettings {
  title: string;
  description: string;
  backgroundColor: string;
  backgroundImage?: string;
  maxWidth: string;
  padding: string;
  fontFamily: string;
  customCSS?: string;
}

// ============================================
// SITE CONFIG (WRAPS ALL PAGES)
// ============================================

export interface SiteConfig {
  id: string;
  name: string;
  domain: DomainSettings;
  publish: PublishConfig;
  theme: ThemeSettings;
  globalSeo: Partial<SEOSettings>;
  pages: BuilderPage[];
  createdAt: string;
  updatedAt: string;
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface HistoryEntry {
  widgets: WidgetInstance[];
  sections?: Section[];
  timestamp: number;
  description: string;
}

// Selection context for property editor
export type SelectionType = 'widget' | 'row' | 'column' | 'section' | null;

// ============================================
// BUILDER STATE (UPDATED)
// ============================================

export interface BuilderState {
  siteConfig: SiteConfig | null;
  pages: BuilderPage[];
  currentPageId: string | null;
  selectedWidgetId: string | null;
  hoveredWidgetId: string | null;
  selectedSectionId: string | null;
  selectedRowId: string | null;
  selectedColumnId: string | null;
  devicePreview: DeviceType;
  zoom: number;
  showGrid: boolean;
  isDragging: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  isPreviewing: boolean;
  showLayers: boolean;
  leftPanelTab: 'widgets' | 'pages' | 'layers';
  rightPanelTab: 'properties' | 'seo' | 'theme' | 'publish';
  rightPanelOpen: boolean;
  droppingWidgetType: string | null;
  showPublishModal: boolean;
  showResponsivePreview: boolean;
  showSectionPicker: boolean;
  sectionPickerInsertIndex: number;
  showRowLayoutPicker: boolean;
  rowLayoutPickerSectionId: string | null;
  rowLayoutPickerInsertIndex: number;
  responsivePreviewUrl: string;
  isSaving: boolean;
  lastSavedAt: string | null;
}

export const DEVICE_WIDTHS: Record<DeviceType, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

export const GRID_COLS: Record<DeviceType, number> = {
  desktop: 12,
  tablet: 8,
  mobile: 4,
};

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  layout: 'Tata Letak',
  text: 'Teks',
  media: 'Media',
  navigation: 'Navigasi',
  forms: 'Formulir',
  data: 'Data',
  commerce: 'Perdagangan',
  social: 'Sosial',
  charts: 'Grafik',
  modules: 'Modul ERP',
  integration: 'Integrasi',
};
