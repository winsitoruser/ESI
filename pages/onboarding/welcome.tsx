import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import { useSession, signOut } from 'next-auth/react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, ChefHat, Coffee, Zap, Building2, ArrowRight,
  Check, Sparkles, Package, Users, BarChart3,
  LogOut, User, ChevronDown, Search,
  ShoppingCart, ShoppingBag, Shirt, Smartphone, HardHat,
  Pill, BookOpen, Gem, Sofa, Flower2, PawPrint, Palette,
  Scissors, Car, Printer, Camera, Plane, Droplets,
  Heart, Stethoscope, GraduationCap, Baby, Hotel,
  Home, Briefcase, PartyPopper, Truck, Factory,
  Wheat, Fish, Globe, Code, Megaphone, CircleDot,
  UtensilsCrossed, Croissant, Wine, Salad,
  Hammer, Dumbbell, Gamepad2,
  Layers, Box, MoreHorizontal, Bike
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BusinessType {
  code: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  features: string[];
  category: string;
}

const BUSINESS_CATEGORIES = [
  { code: 'all', name: 'Semua', icon: Layers },
  { code: 'fnb', name: 'Food & Beverage', icon: UtensilsCrossed },
  { code: 'retail', name: 'Retail & Toko', icon: ShoppingBag },
  { code: 'services', name: 'Jasa & Layanan', icon: Scissors },
  { code: 'health', name: 'Kesehatan', icon: Heart },
  { code: 'education', name: 'Pendidikan', icon: GraduationCap },
  { code: 'hospitality', name: 'Properti & Hospitality', icon: Hotel },
  { code: 'distribution', name: 'Distribusi & Grosir', icon: Truck },
  { code: 'manufacturing', name: 'Manufaktur', icon: Factory },
  { code: 'agriculture', name: 'Agri & Peternakan', icon: Wheat },
  { code: 'digital', name: 'Teknologi & Digital', icon: Globe },
  { code: 'other', name: 'Lainnya', icon: MoreHorizontal },
];

const BUSINESS_TYPES: BusinessType[] = [
  // ===== FOOD & BEVERAGE =====
  {
    code: 'fine_dining',
    name: 'Fine Dining',
    description: 'Restoran mewah dengan layanan lengkap dan menu premium',
    icon: ChefHat,
    color: 'from-purple-500 to-pink-500',
    features: ['Table Management', 'Reservation', 'Kitchen Display', 'Recipe Management'],
    category: 'fnb'
  },
  {
    code: 'casual_dining',
    name: 'Casual Dining',
    description: 'Restoran santai untuk keluarga dan grup',
    icon: UtensilsCrossed,
    color: 'from-amber-500 to-orange-500',
    features: ['Table Management', 'POS', 'Kitchen Display', 'Inventory'],
    category: 'fnb'
  },
  {
    code: 'qsr',
    name: 'Quick Service Restaurant',
    description: 'Restoran cepat saji & fast food',
    icon: Store,
    color: 'from-red-500 to-pink-500',
    features: ['POS', 'Kitchen Display', 'Inventory', 'Loyalty Program'],
    category: 'fnb'
  },
  {
    code: 'cafe',
    name: 'Cafe & Coffee Shop',
    description: 'Kafe dengan menu minuman dan makanan ringan',
    icon: Coffee,
    color: 'from-amber-600 to-yellow-500',
    features: ['POS', 'Table Management', 'Recipe Management', 'Inventory'],
    category: 'fnb'
  },
  {
    code: 'cloud_kitchen',
    name: 'Cloud Kitchen',
    description: 'Dapur virtual untuk delivery & takeaway',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    features: ['Online Ordering', 'Delivery Management', 'Kitchen Display', 'Inventory'],
    category: 'fnb'
  },
  {
    code: 'bakery',
    name: 'Bakery & Pastry',
    description: 'Toko roti, kue, dan pastry',
    icon: Croissant,
    color: 'from-yellow-500 to-amber-500',
    features: ['POS', 'Recipe Management', 'Inventory', 'Pre-order'],
    category: 'fnb'
  },
  {
    code: 'catering',
    name: 'Catering',
    description: 'Layanan katering untuk event dan kantor',
    icon: Salad,
    color: 'from-green-500 to-emerald-500',
    features: ['Order Management', 'Recipe Management', 'Inventory', 'Finance'],
    category: 'fnb'
  },
  {
    code: 'bar_lounge',
    name: 'Bar & Lounge',
    description: 'Bar, pub, dan lounge',
    icon: Wine,
    color: 'from-violet-500 to-purple-500',
    features: ['Table Management', 'POS', 'Inventory', 'Reservation'],
    category: 'fnb'
  },

  // ===== RETAIL & TOKO =====
  {
    code: 'retail_general',
    name: 'Toko Retail Umum',
    description: 'Toko retail multi-kategori',
    icon: ShoppingCart,
    color: 'from-blue-500 to-cyan-500',
    features: ['POS', 'Inventory', 'Supplier Management', 'Loyalty Program'],
    category: 'retail'
  },
  {
    code: 'minimarket',
    name: 'Minimarket & Supermarket',
    description: 'Minimarket, supermarket, dan toko kelontong',
    icon: ShoppingBag,
    color: 'from-green-500 to-teal-500',
    features: ['POS', 'Barcode Scanner', 'Inventory', 'Supplier Management'],
    category: 'retail'
  },
  {
    code: 'fashion',
    name: 'Fashion & Apparel',
    description: 'Toko pakaian, sepatu, dan aksesoris',
    icon: Shirt,
    color: 'from-pink-500 to-rose-500',
    features: ['POS', 'Inventory (Size/Color)', 'Loyalty', 'Marketplace Integration'],
    category: 'retail'
  },
  {
    code: 'electronics',
    name: 'Elektronik & Gadget',
    description: 'Toko elektronik, gadget, dan aksesoris',
    icon: Smartphone,
    color: 'from-slate-500 to-gray-600',
    features: ['POS', 'Serial Number Tracking', 'Warranty', 'Service Center'],
    category: 'retail'
  },
  {
    code: 'building_materials',
    name: 'Bahan Bangunan',
    description: 'Toko bahan bangunan dan material konstruksi',
    icon: HardHat,
    color: 'from-orange-500 to-amber-600',
    features: ['POS', 'Inventory', 'Supplier Management', 'Delivery'],
    category: 'retail'
  },
  {
    code: 'pharmacy',
    name: 'Apotek & Farmasi',
    description: 'Apotek, toko obat, dan alat kesehatan',
    icon: Pill,
    color: 'from-emerald-500 to-green-600',
    features: ['POS', 'Batch/Expiry Tracking', 'Prescription', 'Inventory'],
    category: 'retail'
  },
  {
    code: 'bookstore',
    name: 'Toko Buku & ATK',
    description: 'Toko buku, alat tulis, dan perlengkapan kantor',
    icon: BookOpen,
    color: 'from-indigo-500 to-blue-600',
    features: ['POS', 'Inventory', 'Supplier Management', 'Loyalty'],
    category: 'retail'
  },
  {
    code: 'cosmetics',
    name: 'Kosmetik & Skincare',
    description: 'Toko kosmetik, skincare, dan perawatan tubuh',
    icon: Sparkles,
    color: 'from-fuchsia-500 to-pink-500',
    features: ['POS', 'Batch/Expiry Tracking', 'Loyalty', 'Marketplace Integration'],
    category: 'retail'
  },
  {
    code: 'jewelry',
    name: 'Perhiasan & Aksesoris',
    description: 'Toko emas, perhiasan, dan aksesoris premium',
    icon: Gem,
    color: 'from-yellow-400 to-amber-500',
    features: ['POS', 'Inventory', 'Custom Order', 'Finance'],
    category: 'retail'
  },
  {
    code: 'furniture',
    name: 'Furniture & Interior',
    description: 'Toko mebel, furniture, dan dekorasi interior',
    icon: Sofa,
    color: 'from-stone-500 to-amber-700',
    features: ['POS', 'Custom Order', 'Delivery', 'Inventory'],
    category: 'retail'
  },
  {
    code: 'pet_shop',
    name: 'Pet Shop',
    description: 'Toko hewan peliharaan dan aksesorisnya',
    icon: PawPrint,
    color: 'from-amber-400 to-orange-500',
    features: ['POS', 'Inventory', 'Grooming Service', 'Loyalty'],
    category: 'retail'
  },
  {
    code: 'florist',
    name: 'Florist & Tanaman',
    description: 'Toko bunga, tanaman hias, dan dekorasi',
    icon: Flower2,
    color: 'from-rose-400 to-pink-500',
    features: ['POS', 'Custom Order', 'Delivery', 'Inventory'],
    category: 'retail'
  },
  {
    code: 'sporting_goods',
    name: 'Peralatan Olahraga',
    description: 'Toko alat olahraga, gym, dan outdoor',
    icon: Dumbbell,
    color: 'from-cyan-500 to-blue-500',
    features: ['POS', 'Inventory', 'Loyalty', 'Marketplace Integration'],
    category: 'retail'
  },
  {
    code: 'toy_store',
    name: 'Toko Mainan',
    description: 'Toko mainan anak dan permainan',
    icon: Gamepad2,
    color: 'from-violet-400 to-purple-500',
    features: ['POS', 'Inventory', 'Loyalty', 'Marketplace Integration'],
    category: 'retail'
  },

  // ===== JASA & LAYANAN =====
  {
    code: 'salon_beauty',
    name: 'Salon & Kecantikan',
    description: 'Salon rambut, nail art, dan perawatan kecantikan',
    icon: Scissors,
    color: 'from-pink-400 to-fuchsia-500',
    features: ['Appointment', 'POS', 'Customer Management', 'Loyalty'],
    category: 'services'
  },
  {
    code: 'spa_wellness',
    name: 'Spa & Wellness',
    description: 'Spa, massage, dan pusat kesehatan',
    icon: Droplets,
    color: 'from-teal-400 to-cyan-500',
    features: ['Appointment', 'POS', 'Membership', 'Employee Schedule'],
    category: 'services'
  },
  {
    code: 'automotive',
    name: 'Bengkel & Otomotif',
    description: 'Bengkel mobil/motor, cuci kendaraan, service center',
    icon: Car,
    color: 'from-gray-500 to-slate-600',
    features: ['Work Order', 'Spare Part Inventory', 'POS', 'Customer History'],
    category: 'services'
  },
  {
    code: 'laundry',
    name: 'Laundry & Dry Cleaning',
    description: 'Layanan laundry, dry cleaning, dan setrika',
    icon: Droplets,
    color: 'from-sky-400 to-blue-500',
    features: ['Order Tracking', 'POS', 'Customer Management', 'Delivery'],
    category: 'services'
  },
  {
    code: 'printing',
    name: 'Percetakan & Digital Printing',
    description: 'Percetakan, fotocopy, dan digital printing',
    icon: Printer,
    color: 'from-indigo-400 to-violet-500',
    features: ['Custom Order', 'POS', 'Inventory', 'Production Tracking'],
    category: 'services'
  },
  {
    code: 'photography',
    name: 'Studio Foto & Video',
    description: 'Studio foto, videografi, dan editing',
    icon: Camera,
    color: 'from-gray-600 to-zinc-700',
    features: ['Appointment', 'POS', 'Customer Gallery', 'Package Management'],
    category: 'services'
  },
  {
    code: 'travel_agency',
    name: 'Travel Agent & Tour',
    description: 'Agen perjalanan, tour, dan ticketing',
    icon: Plane,
    color: 'from-sky-500 to-blue-600',
    features: ['Booking', 'POS', 'Customer Management', 'Package Management'],
    category: 'services'
  },
  {
    code: 'rental',
    name: 'Rental & Persewaan',
    description: 'Sewa kendaraan, alat berat, peralatan, dll',
    icon: Bike,
    color: 'from-emerald-400 to-teal-500',
    features: ['Asset Tracking', 'POS', 'Scheduling', 'Maintenance'],
    category: 'services'
  },
  {
    code: 'tailor',
    name: 'Penjahit / Tailor',
    description: 'Jasa jahit, konveksi kecil, dan alterasi',
    icon: Palette,
    color: 'from-rose-500 to-red-500',
    features: ['Custom Order', 'POS', 'Material Inventory', 'Measurement'],
    category: 'services'
  },

  // ===== KESEHATAN =====
  {
    code: 'clinic',
    name: 'Klinik Kesehatan',
    description: 'Klinik pratama, klinik umum, dan spesialis',
    icon: Stethoscope,
    color: 'from-red-400 to-rose-500',
    features: ['Appointment', 'Medical Records', 'Pharmacy POS', 'Billing'],
    category: 'health'
  },
  {
    code: 'dental_clinic',
    name: 'Klinik Gigi',
    description: 'Praktek dokter gigi dan ortodonti',
    icon: Heart,
    color: 'from-blue-400 to-indigo-500',
    features: ['Appointment', 'Dental Records', 'Treatment Plan', 'Billing'],
    category: 'health'
  },
  {
    code: 'therapy',
    name: 'Terapi & Rehabilitasi',
    description: 'Fisioterapi, terapi wicara, dan rehabilitasi',
    icon: Heart,
    color: 'from-green-400 to-emerald-500',
    features: ['Appointment', 'Patient Records', 'Session Tracking', 'Billing'],
    category: 'health'
  },
  {
    code: 'optical',
    name: 'Optik',
    description: 'Toko kacamata, lensa kontak, dan pemeriksaan mata',
    icon: CircleDot,
    color: 'from-cyan-400 to-sky-500',
    features: ['POS', 'Prescription Records', 'Inventory', 'Custom Order'],
    category: 'health'
  },

  // ===== PENDIDIKAN =====
  {
    code: 'school',
    name: 'Sekolah & Bimbel',
    description: 'Sekolah, bimbingan belajar, dan les privat',
    icon: GraduationCap,
    color: 'from-blue-500 to-indigo-600',
    features: ['Student Management', 'Scheduling', 'Finance', 'Reports'],
    category: 'education'
  },
  {
    code: 'training_center',
    name: 'Training Center & Kursus',
    description: 'Kursus bahasa, musik, komputer, dll',
    icon: BookOpen,
    color: 'from-violet-500 to-indigo-500',
    features: ['Student Management', 'Scheduling', 'POS', 'Attendance'],
    category: 'education'
  },
  {
    code: 'daycare',
    name: 'Daycare & Penitipan Anak',
    description: 'Penitipan anak, PAUD, dan playgroup',
    icon: Baby,
    color: 'from-pink-400 to-rose-400',
    features: ['Child Management', 'Scheduling', 'Finance', 'Parent Portal'],
    category: 'education'
  },

  // ===== PROPERTI & HOSPITALITY =====
  {
    code: 'hotel',
    name: 'Hotel & Penginapan',
    description: 'Hotel, resort, villa, dan penginapan',
    icon: Hotel,
    color: 'from-amber-500 to-yellow-600',
    features: ['Room Management', 'Reservation', 'POS', 'Housekeeping'],
    category: 'hospitality'
  },
  {
    code: 'kost',
    name: 'Kos-kosan & Guest House',
    description: 'Kos-kosan, guest house, dan kontrakan',
    icon: Home,
    color: 'from-teal-500 to-green-600',
    features: ['Room Management', 'Tenant Billing', 'Finance', 'Maintenance'],
    category: 'hospitality'
  },
  {
    code: 'coworking',
    name: 'Co-working Space',
    description: 'Ruang kerja bersama dan virtual office',
    icon: Briefcase,
    color: 'from-blue-400 to-sky-500',
    features: ['Space Management', 'Membership', 'Booking', 'POS'],
    category: 'hospitality'
  },
  {
    code: 'event_venue',
    name: 'Venue & Event Organizer',
    description: 'Gedung pertemuan, wedding venue, dan EO',
    icon: PartyPopper,
    color: 'from-fuchsia-400 to-pink-500',
    features: ['Booking', 'Event Management', 'Vendor Management', 'Finance'],
    category: 'hospitality'
  },

  // ===== DISTRIBUSI & GROSIR =====
  {
    code: 'distributor',
    name: 'Distributor',
    description: 'Distribusi produk ke retailer dan outlet',
    icon: Truck,
    color: 'from-blue-600 to-indigo-600',
    features: ['Sales Force', 'Inventory', 'Route Planning', 'Finance'],
    category: 'distribution'
  },
  {
    code: 'wholesale',
    name: 'Grosir / Wholesaler',
    description: 'Penjualan grosir dan partai besar',
    icon: Package,
    color: 'from-indigo-500 to-blue-600',
    features: ['POS', 'Tiered Pricing', 'Inventory', 'Supplier Management'],
    category: 'distribution'
  },
  {
    code: 'supplier',
    name: 'Supplier Bahan Baku',
    description: 'Pemasok bahan baku untuk industri/bisnis',
    icon: Box,
    color: 'from-amber-600 to-orange-600',
    features: ['Order Management', 'Inventory', 'Delivery', 'Finance'],
    category: 'distribution'
  },

  // ===== MANUFAKTUR =====
  {
    code: 'manufacturing',
    name: 'Manufaktur Umum',
    description: 'Pabrik dan industri manufaktur',
    icon: Factory,
    color: 'from-gray-600 to-slate-700',
    features: ['Production Planning', 'BOM', 'Inventory', 'Quality Control'],
    category: 'manufacturing'
  },
  {
    code: 'food_manufacturing',
    name: 'Manufaktur Makanan',
    description: 'Produksi makanan & minuman skala industri',
    icon: ChefHat,
    color: 'from-green-600 to-emerald-600',
    features: ['Recipe/BOM', 'Batch Tracking', 'Expiry Management', 'Quality Control'],
    category: 'manufacturing'
  },
  {
    code: 'garment',
    name: 'Garment & Konveksi',
    description: 'Konveksi pakaian dan tekstil',
    icon: Shirt,
    color: 'from-rose-400 to-red-500',
    features: ['Production Order', 'Material Inventory', 'Size Matrix', 'Quality Control'],
    category: 'manufacturing'
  },
  {
    code: 'workshop',
    name: 'Workshop & Kerajinan',
    description: 'Workshop custom, kerajinan tangan, dan craft',
    icon: Hammer,
    color: 'from-amber-500 to-yellow-600',
    features: ['Custom Order', 'Material Inventory', 'Production Tracking', 'POS'],
    category: 'manufacturing'
  },

  // ===== AGRI & PETERNAKAN =====
  {
    code: 'agriculture',
    name: 'Pertanian & Perkebunan',
    description: 'Usaha pertanian, perkebunan, dan hortikultura',
    icon: Wheat,
    color: 'from-green-500 to-lime-500',
    features: ['Harvest Tracking', 'Inventory', 'Supplier Management', 'Finance'],
    category: 'agriculture'
  },
  {
    code: 'livestock',
    name: 'Peternakan',
    description: 'Peternakan ayam, sapi, kambing, dll',
    icon: PawPrint,
    color: 'from-amber-500 to-green-500',
    features: ['Livestock Tracking', 'Feed Inventory', 'Production', 'Finance'],
    category: 'agriculture'
  },
  {
    code: 'fishery',
    name: 'Perikanan',
    description: 'Budidaya ikan, tambak, dan perikanan',
    icon: Fish,
    color: 'from-blue-400 to-cyan-500',
    features: ['Pond Management', 'Feed Inventory', 'Harvest Tracking', 'Finance'],
    category: 'agriculture'
  },

  // ===== TEKNOLOGI & DIGITAL =====
  {
    code: 'software_house',
    name: 'Software House / IT Services',
    description: 'Pengembangan software, IT consulting, dan managed services',
    icon: Code,
    color: 'from-gray-700 to-slate-800',
    features: ['Project Management', 'HRIS', 'Timesheet', 'Finance'],
    category: 'digital'
  },
  {
    code: 'digital_agency',
    name: 'Digital Agency & Marketing',
    description: 'Agensi digital marketing, social media, dan branding',
    icon: Megaphone,
    color: 'from-orange-400 to-rose-500',
    features: ['Project Management', 'Client Management', 'Finance', 'Reports'],
    category: 'digital'
  },
  {
    code: 'ecommerce',
    name: 'E-Commerce / Online Store',
    description: 'Toko online dan marketplace seller',
    icon: Globe,
    color: 'from-emerald-500 to-teal-600',
    features: ['Inventory', 'Marketplace Integration', 'Shipping', 'Finance'],
    category: 'digital'
  },

  // ===== LAINNYA =====
  {
    code: 'construction',
    name: 'Konstruksi & Kontraktor',
    description: 'Perusahaan konstruksi, kontraktor, dan developer properti',
    icon: HardHat,
    color: 'from-yellow-600 to-amber-700',
    features: ['Project Management', 'Material Inventory', 'Finance', 'HRIS'],
    category: 'other'
  },
  {
    code: 'logistics',
    name: 'Logistik & Ekspedisi',
    description: 'Jasa pengiriman, ekspedisi, dan logistik',
    icon: Truck,
    color: 'from-blue-500 to-indigo-600',
    features: ['Fleet Management', 'Route Planning', 'Tracking', 'Finance'],
    category: 'other'
  },
  {
    code: 'cleaning_service',
    name: 'Cleaning Service',
    description: 'Jasa kebersihan rumah, kantor, dan gedung',
    icon: Sparkles,
    color: 'from-sky-400 to-cyan-500',
    features: ['Scheduling', 'Employee Management', 'POS', 'Customer Management'],
    category: 'other'
  },
  {
    code: 'professional_services',
    name: 'Jasa Profesional',
    description: 'Konsultan, notaris, akuntan, dan jasa profesional lainnya',
    icon: Briefcase,
    color: 'from-slate-500 to-gray-600',
    features: ['Client Management', 'Project Tracking', 'Finance', 'Reports'],
    category: 'other'
  },
  {
    code: 'other',
    name: 'Lainnya',
    description: 'Jenis bisnis lain yang belum tercantum',
    icon: MoreHorizontal,
    color: 'from-gray-400 to-gray-500',
    features: ['POS', 'Inventory', 'Finance', 'Reports'],
    category: 'other'
  },
];

export default function WelcomeOnboarding() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [creating, setCreating] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const profileRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const filteredTypes = useMemo(() => {
    return BUSINESS_TYPES.filter((type) => {
      const matchesCategory = activeCategory === 'all' || type.category === activeCategory;
      const matchesSearch = !searchQuery || 
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const selectedTypeData = useMemo(() => {
    return BUSINESS_TYPES.find(t => t.code === selectedType);
  }, [selectedType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateTenant = async () => {
    if (!businessName.trim()) {
      toast.error('Nama bisnis harus diisi');
      return;
    }
    if (!selectedType) {
      toast.error('Pilih jenis bisnis');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/onboarding/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessTypeCode: selectedType
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat tenant');
      }

      toast.success('Tenant berhasil dibuat!');
      
      // Redirect to KYB
      setTimeout(() => {
        router.push('/onboarding/kyb');
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat tenant');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Head>
        <title>Welcome - BEDAGANG ERP</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">
                BEDAGANG
              </h1>
            </div>

            {/* Profile & Logout */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[150px] truncate">
                  {session?.user?.name || 'User'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email || '-'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      router.push('/profile');
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Profil Saya</span>
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      signOut({ callbackUrl: '/auth/login' });
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              Selamat Datang, {session?.user?.name}!
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              BEDAGANG ERP mendukung berbagai jenis bisnis. Pilih jenis bisnis Anda untuk memulai.
            </p>
          </motion.div>

          {/* Business Name Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">Nama Bisnis Anda</h3>
            <p className="text-sm text-gray-500 mb-4">Masukkan nama resmi bisnis atau outlet Anda</p>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Contoh: PT Maju Bersama, Toko Sejahtera, Klinik Sehat..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all text-lg"
            />
          </motion.div>

          {/* Business Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Pilih Jenis Bisnis</h3>
                <p className="text-sm text-gray-500">
                  {BUSINESS_TYPES.length} jenis bisnis tersedia &mdash; cari atau filter berdasarkan kategori
                </p>
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari jenis bisnis..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div
              ref={categoryScrollRef}
              className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-thin scrollbar-thumb-gray-300"
            >
              {BUSINESS_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = activeCategory === cat.code;
                const count = cat.code === 'all'
                  ? BUSINESS_TYPES.length
                  : BUSINESS_TYPES.filter(t => t.category === cat.code).length;

                return (
                  <button
                    key={cat.code}
                    onClick={() => { setActiveCategory(cat.code); setSearchQuery(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-300 hover:text-sky-600'
                    }`}
                  >
                    <CatIcon className="w-4 h-4" />
                    <span>{cat.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-gray-100'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Type Summary (sticky) */}
            <AnimatePresence>
              {selectedTypeData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className={`bg-gradient-to-r ${selectedTypeData.color} rounded-xl p-4 text-white flex items-center gap-4`}>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <selectedTypeData.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Bisnis terpilih</p>
                      <p className="text-lg font-bold truncate">{selectedTypeData.name}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-wrap">
                      {selectedTypeData.features.map((f, i) => (
                        <span key={i} className="text-xs bg-white/20 px-2 py-1 rounded-full">{f}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedType(null)}
                      className="text-white/70 hover:text-white ml-2 flex-shrink-0"
                      title="Batal pilih"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Business Type Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.code;

                return (
                  <motion.button
                    key={type.code}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedType(type.code)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 shadow-lg ring-2 ring-sky-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate pr-6">{type.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2">{type.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {type.features.map((feature, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredTypes.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Tidak ditemukan jenis bisnis</p>
                <p className="text-sm text-gray-400 mt-1">Coba kata kunci lain atau pilih kategori "Lainnya"</p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                  className="mt-4 text-sm text-sky-500 hover:text-sky-600 font-medium"
                >
                  Reset filter
                </button>
              </div>
            )}
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 text-white mb-8"
          >
            <h3 className="text-2xl font-bold mb-6">Yang Akan Anda Dapatkan</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Modul Lengkap</h4>
                  <p className="text-sm text-sky-100">POS, Inventory, Finance, HRIS, SFA & lainnya</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Multi-User & Branch</h4>
                  <p className="text-sm text-sky-100">Kelola tim & cabang dengan role management</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Analytics & Reports</h4>
                  <p className="text-sm text-sky-100">Dashboard real-time dan laporan komprehensif</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Scalable</h4>
                  <p className="text-sm text-sky-100">Dari UMKM hingga enterprise multi-cabang</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center pb-8"
          >
            <button
              onClick={handleCreateTenant}
              disabled={!businessName.trim() || !selectedType || creating}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {creating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Membuat...</span>
                </>
              ) : (
                <>
                  <span>Lanjutkan ke KYB</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Proses selanjutnya: Verifikasi bisnis (KYB) → Pilih paket → Aktivasi
            </p>
          </motion.div>
        </main>
      </div>
    </>
  );
}
