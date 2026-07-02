import { SectionTemplateItem } from './types';

export const sectionTemplates: SectionTemplateItem[] = [
  // ===== HEADER =====
  {
    id: 'header-simple',
    name: 'Header Sederhana',
    description: 'Navbar dengan logo dan menu navigasi',
    category: 'header',
    thumbnail: '',
    color: '#6366f1',
    sectionType: 'header',
    widgets: [
      { type: 'navbar', x: 0, y: 0, w: 12, h: 2 },
    ],
    style: { paddingTop: 0, paddingBottom: 0 },
    tags: ['navbar', 'header', 'menu'],
  },
  {
    id: 'header-with-banner',
    name: 'Header + Banner',
    description: 'Navbar dengan info banner di atas',
    category: 'header',
    thumbnail: '',
    color: '#8b5cf6',
    sectionType: 'header',
    widgets: [
      { type: 'paragraph', x: 0, y: 0, w: 12, h: 1, properties: { text: '🔥 Promo Spesial! Diskon 20% untuk semua produk', alignment: 'center', fontSize: 13, color: '#ffffff' } },
      { type: 'navbar', x: 0, y: 1, w: 12, h: 2 },
    ],
    style: { paddingTop: 0, paddingBottom: 0, backgroundColor: '#1e1b4b' },
    tags: ['navbar', 'header', 'banner', 'promo'],
  },

  // ===== HERO =====
  {
    id: 'hero-centered',
    name: 'Hero Tengah',
    description: 'Hero section dengan teks di tengah dan tombol CTA',
    category: 'hero',
    thumbnail: '',
    color: '#3b82f6',
    sectionType: 'hero',
    widgets: [
      { type: 'heading', x: 1, y: 0, w: 10, h: 2, properties: { text: 'Bangun Bisnis Anda Bersama Kami', level: 'h1', alignment: 'center', fontWeight: '800', color: '#111827' } },
      { type: 'paragraph', x: 2, y: 2, w: 8, h: 2, properties: { text: 'Platform all-in-one untuk mengelola bisnis Anda dengan mudah, cepat, dan efisien. Mulai sekarang dan rasakan perbedaannya.', alignment: 'center', fontSize: 18, color: '#6b7280' } },
      { type: 'button', x: 4, y: 4, w: 4, h: 2, properties: { text: 'Mulai Sekarang', alignment: 'center', variant: 'primary', size: 'lg' } },
    ],
    style: { paddingTop: 80, paddingBottom: 80, backgroundColor: '#f8fafc' },
    tags: ['hero', 'centered', 'cta'],
  },
  {
    id: 'hero-split',
    name: 'Hero Split',
    description: 'Hero dengan teks kiri dan gambar kanan',
    category: 'hero',
    thumbnail: '',
    color: '#0ea5e9',
    sectionType: 'hero',
    widgets: [
      { type: 'heading', x: 0, y: 0, w: 6, h: 2, properties: { text: 'Solusi Digital untuk Bisnis Modern', level: 'h1', fontWeight: '800' } },
      { type: 'paragraph', x: 0, y: 2, w: 6, h: 2, properties: { text: 'Tingkatkan produktivitas dan efisiensi operasional bisnis Anda dengan teknologi terdepan.', fontSize: 17, color: '#6b7280' } },
      { type: 'button', x: 0, y: 4, w: 3, h: 2, properties: { text: 'Coba Gratis', variant: 'primary', size: 'lg' } },
      { type: 'button', x: 3, y: 4, w: 3, h: 2, properties: { text: 'Pelajari Lagi', variant: 'outline', size: 'lg' } },
      { type: 'image', x: 6, y: 0, w: 6, h: 6, properties: { src: '', alt: 'Hero Image', borderRadius: '12' } },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['hero', 'split', 'image'],
  },
  {
    id: 'hero-gradient',
    name: 'Hero Gradient',
    description: 'Hero dengan background gradient menarik',
    category: 'hero',
    thumbnail: '',
    color: '#a855f7',
    sectionType: 'hero',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Transformasi Digital Dimulai di Sini', level: 'h1', alignment: 'center', fontWeight: '800', color: '#ffffff' } },
      { type: 'paragraph', x: 3, y: 2, w: 6, h: 2, properties: { text: 'Bergabunglah dengan ribuan bisnis yang telah sukses menggunakan platform kami.', alignment: 'center', fontSize: 18, color: '#e0e7ff' } },
      { type: 'button', x: 4, y: 4, w: 4, h: 2, properties: { text: 'Daftar Sekarang', alignment: 'center', variant: 'primary', size: 'lg' } },
    ],
    style: { paddingTop: 96, paddingBottom: 96, backgroundColor: '#4338ca' },
    tags: ['hero', 'gradient', 'dark'],
  },

  // ===== FEATURES =====
  {
    id: 'features-3col',
    name: 'Fitur 3 Kolom',
    description: '3 kartu fitur dengan ikon dan deskripsi',
    category: 'features',
    thumbnail: '',
    color: '#10b981',
    sectionType: 'features',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Fitur Unggulan', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'paragraph', x: 3, y: 2, w: 6, h: 1, properties: { text: 'Semua yang Anda butuhkan dalam satu platform', alignment: 'center', color: '#6b7280' } },
      { type: 'cards', x: 0, y: 4, w: 4, h: 4 },
      { type: 'cards', x: 4, y: 4, w: 4, h: 4 },
      { type: 'cards', x: 8, y: 4, w: 4, h: 4 },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['features', 'cards', '3-column'],
  },
  {
    id: 'features-icon-grid',
    name: 'Fitur Grid Ikon',
    description: 'Grid 2x3 fitur dengan ikon',
    category: 'features',
    thumbnail: '',
    color: '#06b6d4',
    sectionType: 'features',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Mengapa Memilih Kami?', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'cards', x: 0, y: 3, w: 4, h: 3 },
      { type: 'cards', x: 4, y: 3, w: 4, h: 3 },
      { type: 'cards', x: 8, y: 3, w: 4, h: 3 },
      { type: 'cards', x: 0, y: 6, w: 4, h: 3 },
      { type: 'cards', x: 4, y: 6, w: 4, h: 3 },
      { type: 'cards', x: 8, y: 6, w: 4, h: 3 },
    ],
    style: { paddingTop: 64, paddingBottom: 64, backgroundColor: '#f9fafb' },
    tags: ['features', 'grid', 'icons'],
  },

  // ===== CONTENT =====
  {
    id: 'content-text-image',
    name: 'Teks + Gambar',
    description: 'Konten dengan teks kiri dan gambar kanan',
    category: 'content',
    thumbnail: '',
    color: '#f59e0b',
    sectionType: 'content',
    widgets: [
      { type: 'heading', x: 0, y: 0, w: 6, h: 2, properties: { text: 'Tentang Kami', level: 'h2', fontWeight: '700' } },
      { type: 'paragraph', x: 0, y: 2, w: 6, h: 3, properties: { text: 'Kami adalah perusahaan teknologi yang berdedikasi untuk membantu bisnis tumbuh dengan solusi digital inovatif. Dengan pengalaman lebih dari 10 tahun, kami telah melayani ribuan klien di seluruh Indonesia.', fontSize: 16, color: '#4b5563' } },
      { type: 'button', x: 0, y: 5, w: 3, h: 2, properties: { text: 'Selengkapnya', variant: 'outline' } },
      { type: 'image', x: 6, y: 0, w: 6, h: 7, properties: { src: '', alt: 'About image', borderRadius: '12' } },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['content', 'about', 'text-image'],
  },
  {
    id: 'content-image-text',
    name: 'Gambar + Teks',
    description: 'Konten dengan gambar kiri dan teks kanan',
    category: 'content',
    thumbnail: '',
    color: '#ec4899',
    sectionType: 'content',
    widgets: [
      { type: 'image', x: 0, y: 0, w: 6, h: 7, properties: { src: '', alt: 'Content image', borderRadius: '12' } },
      { type: 'heading', x: 6, y: 0, w: 6, h: 2, properties: { text: 'Visi & Misi Kami', level: 'h2', fontWeight: '700' } },
      { type: 'paragraph', x: 6, y: 2, w: 6, h: 3, properties: { text: 'Memberikan solusi terbaik yang dapat membantu setiap bisnis berkembang di era digital. Kami percaya bahwa teknologi harus mudah diakses oleh semua orang.', fontSize: 16, color: '#4b5563' } },
      { type: 'list', x: 6, y: 5, w: 6, h: 2 },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['content', 'image-text', 'vision'],
  },

  // ===== STATS =====
  {
    id: 'stats-bar',
    name: 'Statistik Bar',
    description: 'Baris statistik dengan 4 angka',
    category: 'stats',
    thumbnail: '',
    color: '#6366f1',
    sectionType: 'content',
    widgets: [
      { type: 'statsCard', x: 0, y: 0, w: 3, h: 3 },
      { type: 'statsCard', x: 3, y: 0, w: 3, h: 3 },
      { type: 'statsCard', x: 6, y: 0, w: 3, h: 3 },
      { type: 'statsCard', x: 9, y: 0, w: 3, h: 3 },
    ],
    style: { paddingTop: 48, paddingBottom: 48, backgroundColor: '#4338ca' },
    tags: ['stats', 'numbers', 'counter'],
  },

  // ===== TESTIMONIALS =====
  {
    id: 'testimonials-3col',
    name: 'Testimoni 3 Kolom',
    description: '3 kartu testimoni pelanggan',
    category: 'testimonials',
    thumbnail: '',
    color: '#f97316',
    sectionType: 'testimonials',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Apa Kata Mereka?', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'paragraph', x: 3, y: 2, w: 6, h: 1, properties: { text: 'Testimoni dari pelanggan setia kami', alignment: 'center', color: '#6b7280' } },
      { type: 'testimonial', x: 0, y: 4, w: 4, h: 4 },
      { type: 'testimonial', x: 4, y: 4, w: 4, h: 4 },
      { type: 'testimonial', x: 8, y: 4, w: 4, h: 4 },
    ],
    style: { paddingTop: 64, paddingBottom: 64, backgroundColor: '#fafafa' },
    tags: ['testimonials', 'reviews', 'social-proof'],
  },
  {
    id: 'testimonials-single',
    name: 'Testimoni Besar',
    description: 'Satu testimoni besar yang menarik perhatian',
    category: 'testimonials',
    thumbnail: '',
    color: '#14b8a6',
    sectionType: 'testimonials',
    widgets: [
      { type: 'testimonial', x: 2, y: 0, w: 8, h: 5 },
    ],
    style: { paddingTop: 64, paddingBottom: 64, backgroundColor: '#f0fdf4' },
    tags: ['testimonials', 'single', 'large'],
  },

  // ===== CTA =====
  {
    id: 'cta-centered',
    name: 'CTA Tengah',
    description: 'Call to action dengan teks dan tombol di tengah',
    category: 'cta',
    thumbnail: '',
    color: '#ef4444',
    sectionType: 'cta',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Siap Untuk Memulai?', level: 'h2', alignment: 'center', fontWeight: '700', color: '#ffffff' } },
      { type: 'paragraph', x: 3, y: 2, w: 6, h: 2, properties: { text: 'Bergabunglah sekarang dan dapatkan akses gratis selama 14 hari. Tanpa kartu kredit.', alignment: 'center', fontSize: 17, color: '#e0e7ff' } },
      { type: 'button', x: 4, y: 4, w: 4, h: 2, properties: { text: 'Mulai Gratis', alignment: 'center', variant: 'primary', size: 'lg' } },
    ],
    style: { paddingTop: 80, paddingBottom: 80, backgroundColor: '#1e40af' },
    tags: ['cta', 'centered', 'action'],
  },
  {
    id: 'cta-split',
    name: 'CTA Split',
    description: 'CTA dengan teks kiri dan tombol kanan',
    category: 'cta',
    thumbnail: '',
    color: '#d946ef',
    sectionType: 'cta',
    widgets: [
      { type: 'heading', x: 0, y: 0, w: 8, h: 2, properties: { text: 'Tingkatkan Bisnis Anda Hari Ini', level: 'h3', fontWeight: '700' } },
      { type: 'paragraph', x: 0, y: 2, w: 8, h: 1, properties: { text: 'Hubungi tim kami untuk konsultasi gratis.', color: '#6b7280' } },
      { type: 'button', x: 8, y: 0, w: 4, h: 3, properties: { text: 'Hubungi Kami', variant: 'primary', size: 'lg' } },
    ],
    style: { paddingTop: 48, paddingBottom: 48, backgroundColor: '#faf5ff', borderTop: '1px solid #e9d5ff', borderBottom: '1px solid #e9d5ff' },
    tags: ['cta', 'split', 'contact'],
  },

  // ===== PRICING =====
  {
    id: 'pricing-3col',
    name: 'Tabel Harga 3 Kolom',
    description: '3 paket harga berdampingan',
    category: 'pricing',
    thumbnail: '',
    color: '#22c55e',
    sectionType: 'pricing',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Pilih Paket Anda', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'paragraph', x: 3, y: 2, w: 6, h: 1, properties: { text: 'Harga transparan tanpa biaya tersembunyi', alignment: 'center', color: '#6b7280' } },
      { type: 'priceCard', x: 0, y: 4, w: 4, h: 6 },
      { type: 'priceCard', x: 4, y: 4, w: 4, h: 6 },
      { type: 'priceCard', x: 8, y: 4, w: 4, h: 6 },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['pricing', 'plans', 'table'],
  },

  // ===== GALLERY =====
  {
    id: 'gallery-grid',
    name: 'Galeri Grid',
    description: 'Grid gambar 3 kolom',
    category: 'gallery',
    thumbnail: '',
    color: '#0284c7',
    sectionType: 'gallery',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Galeri Kami', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'gallery', x: 0, y: 3, w: 12, h: 6 },
    ],
    style: { paddingTop: 64, paddingBottom: 64, backgroundColor: '#f8fafc' },
    tags: ['gallery', 'images', 'portfolio'],
  },

  // ===== CONTACT =====
  {
    id: 'contact-form-map',
    name: 'Kontak + Peta',
    description: 'Formulir kontak dengan info dan peta',
    category: 'contact',
    thumbnail: '',
    color: '#8b5cf6',
    sectionType: 'contact',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Hubungi Kami', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'paragraph', x: 3, y: 2, w: 6, h: 1, properties: { text: 'Ada pertanyaan? Jangan ragu untuk menghubungi kami.', alignment: 'center', color: '#6b7280' } },
      { type: 'contactForm', x: 0, y: 4, w: 7, h: 6 },
      { type: 'list', x: 7, y: 4, w: 5, h: 6 },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['contact', 'form', 'map'],
  },
  {
    id: 'contact-simple',
    name: 'Kontak Sederhana',
    description: 'Formulir kontak sederhana di tengah',
    category: 'contact',
    thumbnail: '',
    color: '#64748b',
    sectionType: 'contact',
    widgets: [
      { type: 'heading', x: 3, y: 0, w: 6, h: 2, properties: { text: 'Kirim Pesan', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'contactForm', x: 2, y: 2, w: 8, h: 6 },
    ],
    style: { paddingTop: 64, paddingBottom: 64, backgroundColor: '#f9fafb' },
    tags: ['contact', 'form', 'simple'],
  },

  // ===== E-COMMERCE =====
  {
    id: 'ecom-product-showcase',
    name: 'Produk Showcase',
    description: 'Katalog produk dengan filter',
    category: 'ecommerce',
    thumbnail: '',
    color: '#059669',
    sectionType: 'content',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Produk Terlaris', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'productCatalogWidget', x: 0, y: 3, w: 12, h: 6 },
    ],
    style: { paddingTop: 64, paddingBottom: 64 },
    tags: ['ecommerce', 'products', 'catalog'],
  },
  {
    id: 'ecom-menu-fnb',
    name: 'Menu Restoran',
    description: 'Menu F&B dari modul restoran',
    category: 'ecommerce',
    thumbnail: '',
    color: '#ef4444',
    sectionType: 'content',
    widgets: [
      { type: 'heading', x: 2, y: 0, w: 8, h: 2, properties: { text: 'Menu Kami', level: 'h2', alignment: 'center', fontWeight: '700' } },
      { type: 'fnbMenuWidget', x: 0, y: 3, w: 12, h: 6 },
    ],
    style: { paddingTop: 64, paddingBottom: 64, backgroundColor: '#fef2f2' },
    tags: ['fnb', 'restaurant', 'menu'],
  },

  // ===== FOOTER =====
  {
    id: 'footer-simple',
    name: 'Footer Sederhana',
    description: 'Footer dengan logo, link, dan copyright',
    category: 'footer',
    thumbnail: '',
    color: '#374151',
    sectionType: 'footer',
    widgets: [
      { type: 'footer', x: 0, y: 0, w: 12, h: 3 },
    ],
    style: { paddingTop: 32, paddingBottom: 32, backgroundColor: '#111827' },
    tags: ['footer', 'copyright', 'links'],
  },
  {
    id: 'footer-with-social',
    name: 'Footer + Sosial',
    description: 'Footer dengan sosial media dan newsletter',
    category: 'footer',
    thumbnail: '',
    color: '#1f2937',
    sectionType: 'footer',
    widgets: [
      { type: 'socialLinks', x: 0, y: 0, w: 6, h: 2 },
      { type: 'newsletter', x: 6, y: 0, w: 6, h: 2 },
      { type: 'footer', x: 0, y: 2, w: 12, h: 2 },
    ],
    style: { paddingTop: 48, paddingBottom: 32, backgroundColor: '#0f172a' },
    tags: ['footer', 'social', 'newsletter'],
  },
];

export function getSectionTemplatesByCategory(category: SectionTemplateItem['category']): SectionTemplateItem[] {
  return sectionTemplates.filter(t => t.category === category);
}

export function getSectionTemplateById(id: string): SectionTemplateItem | undefined {
  return sectionTemplates.find(t => t.id === id);
}
