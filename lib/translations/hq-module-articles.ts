import { Language } from '../i18n';

// ═══════════════════════════════════════════════════════
// Indonesian articles & FAQ
// ═══════════════════════════════════════════════════════
const art_id = {
  articles: {
    fnb: {
      a1: { title: '5 Strategi Meningkatkan Revenue Restoran dengan Teknologi POS', excerpt: 'Pelajari bagaimana sistem POS modern dapat meningkatkan efisiensi operasional dan revenue restoran Anda hingga 30% melalui upselling otomatis, analitik menu, dan loyalty program.', category: 'Strategi Bisnis', readTime: '8 menit' },
      a2: { title: 'Cara Efektif Mengelola Food Cost di Bisnis F&B', excerpt: 'Food cost yang tidak terkontrol adalah pembunuh margin terbesar di bisnis F&B. Temukan cara menggunakan recipe management dan inventory tracking untuk menjaga food cost di bawah 35%.', category: 'Operasional', readTime: '6 menit' },
      a3: { title: 'Tren Digital F&B 2026: AI, Automation & Customer Experience', excerpt: 'Industri F&B bergerak cepat ke era digital. Dari AI-powered menu recommendations hingga automated kitchen display, simak tren yang akan mendominasi tahun ini.', category: 'Tren Industri', readTime: '10 menit' },
    },
    retail: {
      a1: { title: 'Omnichannel Retail: Strategi Integrasi Online & Offline', excerpt: 'Pelanggan modern berbelanja di mana saja. Pelajari cara mengintegrasikan toko fisik dengan marketplace dan online store untuk pengalaman seamless yang meningkatkan konversi.', category: 'Strategi Bisnis', readTime: '9 menit' },
      a2: { title: 'Manajemen Inventory Cerdas untuk Bisnis Retail Modern', excerpt: 'Overstock dan stockout sama-sama merugikan. Gunakan data analytics dan AI forecasting untuk menjaga level stok optimal di setiap lokasi toko Anda.', category: 'Operasional', readTime: '7 menit' },
      a3: { title: 'Loyalty Program yang Efektif: Meningkatkan Repeat Customer', excerpt: 'Akuisisi pelanggan baru 5x lebih mahal dari mempertahankan yang ada. Temukan formula loyalty program yang benar-benar meningkatkan retention rate.', category: 'Customer', readTime: '6 menit' },
    },
    distribution: {
      a1: { title: 'Optimalisasi Supply Chain dengan Teknologi ERP', excerpt: 'Supply chain yang efisien adalah competitive advantage utama di bisnis distribusi. Pelajari bagaimana ERP terintegrasi mempercepat fulfillment dan mengurangi biaya logistik.', category: 'Supply Chain', readTime: '8 menit' },
      a2: { title: 'Sales Force Automation: Meningkatkan Produktivitas Tim Lapangan', excerpt: 'Tim sales lapangan Anda bisa 40% lebih produktif dengan SFA. Dari route optimization hingga field order digital, simak cara memaksimalkan kunjungan harian.', category: 'Sales', readTime: '7 menit' },
      a3: { title: 'Fleet Management Best Practices untuk Perusahaan Distribusi', excerpt: 'Armada kendaraan adalah aset terbesar di bisnis distribusi. Optimalkan maintenance schedule, fuel efficiency, dan driver productivity dengan sistem fleet digital.', category: 'Operasional', readTime: '9 menit' },
    },
    manufacturing: {
      a1: { title: 'Integrasi Production Planning dengan Inventory Management', excerpt: 'Produksi yang efisien dimulai dari perencanaan material yang akurat. Pelajari cara mengintegrasikan jadwal produksi dengan ketersediaan bahan baku secara real-time.', category: 'Produksi', readTime: '8 menit' },
      a2: { title: 'Quality Control Digital: Dari Manual ke Otomatisasi', excerpt: 'Transisi dari checklist kertas ke QC digital meningkatkan akurasi dan traceability. Temukan langkah-langkah implementasi quality control berbasis ERP.', category: 'Quality', readTime: '7 menit' },
      a3: { title: 'HRIS untuk Manufaktur: Kelola Shift & Overtime Lebih Efisien', excerpt: 'Industri manufaktur dengan shift kompleks membutuhkan HRIS yang mumpuni. Dari rotasi shift otomatis hingga kalkulasi overtime akurat sesuai UU Ketenagakerjaan.', category: 'SDM', readTime: '6 menit' },
    },
    services: {
      a1: { title: 'CRM Best Practices untuk Bisnis Jasa Profesional', excerpt: 'Relasi pelanggan adalah segalanya di bisnis jasa. Pelajari cara membangun customer 360° view dan automasi follow-up untuk meningkatkan client retention.', category: 'Customer', readTime: '8 menit' },
      a2: { title: 'Project Management Terintegrasi dengan ERP', excerpt: 'Kelola proyek, alokasi resource, timesheet, dan billing dalam satu platform. Tingkatkan profitabilitas proyek dengan visibility real-time.', category: 'Project', readTime: '7 menit' },
      a3: { title: 'Invoice & Billing Automation untuk Efisiensi Keuangan', excerpt: 'Otomatisasi invoice dari timesheet dan kontrak mengurangi errors dan mempercepat cash collection. Simak best practices billing automation.', category: 'Keuangan', readTime: '6 menit' },
    },
    logistics: {
      a1: { title: 'TMS Modern: Optimalisasi Pengiriman End-to-End', excerpt: 'Transportation Management System yang baik bisa mengurangi biaya pengiriman 15-20%. Dari route optimization hingga carrier management, simak cara implementasinya.', category: 'Transport', readTime: '9 menit' },
      a2: { title: 'GPS Tracking & Geofencing untuk Armada Pengiriman', excerpt: 'Real-time visibility armada meningkatkan on-time delivery rate. Pelajari cara mengimplementasikan GPS tracking dan geofencing yang efektif.', category: 'Fleet', readTime: '7 menit' },
      a3: { title: 'Analisis Biaya Operasional Kendaraan yang Akurat', excerpt: 'Mengetahui true cost per km setiap kendaraan adalah kunci profitabilitas bisnis logistik. Gunakan fleet analytics untuk keputusan yang data-driven.', category: 'Keuangan', readTime: '8 menit' },
    },
  },
  faq: {
    fnb: {
      q1: { q: 'Apakah Bedagang cocok untuk restoran dengan banyak cabang?', a: 'Ya, Bedagang dirancang untuk multi-branch operation. Anda bisa mengelola semua cabang dari satu dashboard HQ, dengan data yang tersinkronisasi real-time. Setiap cabang bisa memiliki konfigurasi menu, harga, dan pajak yang berbeda.' },
      q2: { q: 'Bagaimana integrasi POS dengan Kitchen Display System?', a: 'Order dari POS otomatis masuk ke Kitchen Display System (KDS) berdasarkan station (hot kitchen, cold kitchen, beverage, dll). Setiap station melihat hanya item yang relevan, dan status ready otomatis update ke POS dan pelanggan.' },
      q3: { q: 'Apakah bisa menghitung food cost per menu?', a: 'Ya, melalui modul Recipe Management yang terintegrasi dengan Inventory. Anda bisa mendefinisikan resep dengan bahan dan porsi, lalu sistem otomatis menghitung food cost berdasarkan harga beli terkini dari supplier.' },
      q4: { q: 'Metode pembayaran apa saja yang didukung?', a: 'Bedagang POS mendukung tunai, QRIS (semua e-wallet), GoPay, OVO, Dana, ShopeePay, kartu debit/kredit (via payment gateway), dan split payment kombinasi. Anda juga bisa menambahkan metode kustom.' },
      q5: { q: 'Berapa lama proses setup untuk restoran baru?', a: 'Setup dasar (produk, kategori, pajak, struk) bisa selesai dalam 1-2 hari. Setup lengkap termasuk inventory, karyawan, dan keuangan membutuhkan 3-5 hari kerja dengan pendampingan tim kami.' },
    },
    retail: {
      q1: { q: 'Bisakah Bedagang terhubung ke Tokopedia dan Shopee?', a: 'Ya, melalui modul Marketplace Integration. Produk dan stok di-sync otomatis ke Tokopedia, Shopee, dan marketplace lain. Pesanan dari marketplace juga otomatis masuk ke sistem untuk diproses.' },
      q2: { q: 'Bagaimana mengelola stok di beberapa toko?', a: 'Modul Inventory mendukung multi-warehouse dan multi-branch. Anda bisa melihat stok di setiap lokasi, melakukan transfer antar toko, dan set alert stok minimum per lokasi.' },
      q3: { q: 'Apakah ada fitur loyalty dan membership?', a: 'Ya, melalui modul Loyalty & CRM. Anda bisa membuat program poin, membership tier, voucher, dan diskon khusus member. Data pembelian pelanggan terekam otomatis untuk personalized offers.' },
      q4: { q: 'Bagaimana menangani return dan refund?', a: 'POS Bedagang mendukung proses return dan refund langsung. Return bisa berupa tukar barang atau refund uang, dan stok otomatis di-update ke inventory. Semua transaksi return tercatat di audit log.' },
      q5: { q: 'Apakah mendukung barcode dan label printing?', a: 'Ya, sistem mendukung scan barcode (1D dan 2D/QR), generate barcode untuk produk baru, dan printing label harga. Kompatibel dengan thermal printer dan barcode scanner populer.' },
    },
    distribution: {
      q1: { q: 'Apakah ada fitur untuk tim sales lapangan?', a: 'Ya, modul SFA (Sales Force Automation) menyediakan visit tracking dengan GPS check-in, field order creation, target management, route planning, dan coverage monitoring untuk tim sales lapangan.' },
      q2: { q: 'Bagaimana mengelola armada kendaraan distribusi?', a: 'Modul Fleet Management (FMS) mengelola seluruh armada: master kendaraan, driver, jadwal maintenance, BBM, inspeksi, dan cost analysis. Terintegrasi dengan TMS untuk assignment trip pengiriman.' },
      q3: { q: 'Apakah bisa menghitung komisi dan insentif sales?', a: 'Ya, modul SFA Enhanced mendukung skema insentif fleksibel: komisi per produk, tier achievement, bonus target, dan plafon per salesperson. Perhitungan otomatis berdasarkan data penjualan aktual.' },
      q4: { q: 'Bagaimana proses purchase order ke supplier?', a: 'Melalui modul Inventory, Anda bisa membuat PO ke supplier, tracking approval, monitor status pengiriman, dan goods receipt saat barang diterima. Stok otomatis update dan jurnal terbukukan.' },
      q5: { q: 'Apakah ada approval workflow untuk order dan expenses?', a: 'Ya, sistem mendukung multi-level approval untuk purchase order, field order, expenses, dan dokumen lainnya. Anda bisa konfigurasi approval steps berdasarkan nominal dan tipe transaksi.' },
    },
    manufacturing: {
      q1: { q: 'Bagaimana Bedagang membantu proses manufaktur?', a: 'Bedagang menyediakan modul Inventory untuk raw material management, recipe/BOM tracking, purchase order ke supplier, dan stock opname. Terintegrasi dengan Finance untuk costing dan HR untuk manajemen shift produksi.' },
      q2: { q: 'Apakah mendukung multi-gudang untuk raw material dan finished goods?', a: 'Ya, modul Inventory mendukung unlimited warehouse dengan zona dan lokasi. Anda bisa pisahkan gudang raw material, WIP, finished goods, dan quarantine dengan transfer workflow antar gudang.' },
      q3: { q: 'Bagaimana mengelola shift karyawan produksi?', a: 'Modul HRIS menyediakan 8 template shift (termasuk shift malam dengan cross-day), rotasi shift otomatis, dan overtime tracking. Absensi bisa menggunakan GPS geofencing di area pabrik.' },
      q4: { q: 'Apakah ada fitur quality control?', a: 'Melalui stock opname dan goods receipt inspection, Anda bisa melakukan quality check saat penerimaan barang dan selama proses produksi. Compliance checklist juga tersedia melalui modul Industrial Relations.' },
      q5: { q: 'Bisakah menghitung HPP (Harga Pokok Produksi)?', a: 'Ya, melalui integrasi Inventory (bahan baku) dan Finance (biaya overhead, tenaga kerja), sistem bisa menghitung HPP per produk. Cost history tracking juga tersedia untuk analisis tren biaya.' },
    },
    services: {
      q1: { q: 'Bagaimana Bedagang cocok untuk bisnis jasa profesional?', a: 'Bedagang menyediakan CRM untuk client management, Project Management untuk tracking proyek dan timesheet, Finance untuk invoicing dan billing, serta HRIS untuk kelola tim profesional Anda.' },
      q2: { q: 'Apakah ada fitur project management dan timesheet?', a: 'Ya, modul HRIS Project Management mencakup project planning, worker assignment, timesheet tracking, dan project payroll. Anda bisa menghitung profitabilitas per proyek berdasarkan timesheet vs billing.' },
      q3: { q: 'Bagaimana mengelola invoice ke klien?', a: 'Modul Finance menyediakan fitur invoice creation, recurring invoices, payment tracking, dan aging analysis untuk piutang. Invoice bisa dikirim otomatis via email atau WhatsApp.' },
      q4: { q: 'Apakah CRM bisa mencatat semua interaksi dengan klien?', a: 'Ya, CRM 360° mencatat semua interaksi: meeting, call, email, WhatsApp, dan note. Dengan timeline view, tim Anda bisa melihat seluruh riwayat hubungan dengan setiap klien.' },
      q5: { q: 'Bisakah mengelola kontrak dan SLA?', a: 'Ya, modul CRM menyediakan ticket management dengan SLA tracking, dan modul HRIS Industrial Relations mendukung contract management. Anda bisa set reminder otomatis untuk kontrak yang mendekati expired.' },
    },
    logistics: {
      q1: { q: 'Apakah Bedagang cocok untuk perusahaan logistik?', a: 'Sangat cocok. Dengan modul TMS (Transportation Management) dan FMS (Fleet Management), Anda bisa mengelola seluruh operasional logistik: shipment, trip planning, carrier management, armada kendaraan, dan proof of delivery.' },
      q2: { q: 'Bagaimana tracking pengiriman secara real-time?', a: 'Modul TMS menyediakan shipment lifecycle tracking dari created hingga delivered. Dengan integrasi GPS dari FMS, Anda bisa monitor posisi kendaraan dan estimasi waktu kedatangan secara real-time.' },
      q3: { q: 'Apakah ada fitur rate card dan freight billing?', a: 'Ya, TMS mendukung rate card per zone, service type, dan tipe kendaraan. Freight billing otomatis digenerate berdasarkan shipment data dan rate card, siap untuk invoicing ke pelanggan.' },
      q4: { q: 'Bagaimana mengelola biaya operasional per kendaraan?', a: 'FMS mencatat semua biaya: BBM, maintenance, asuransi, ban, dan overhead. Dashboard cost analysis menampilkan total cost of ownership per kendaraan, cost per km, dan perbandingan efisiensi armada.' },
      q5: { q: 'Apakah ada fitur proof of delivery digital?', a: 'Ya, TMS menyediakan digital proof of delivery (ePOD) dengan tanda tangan digital, foto barang, dan catatan penerima. Data ePOD langsung tersinkronisasi ke sistem untuk proses billing dan reporting.' },
    },
  },
};

// ═══════════════════════════════════════════════════════
// English articles & FAQ
// ═══════════════════════════════════════════════════════
const art_en = {
  articles: {
    fnb: {
      a1: { title: '5 Strategies to Boost Restaurant Revenue with POS Technology', excerpt: 'Learn how modern POS systems can improve operational efficiency and increase your restaurant revenue by up to 30% through automatic upselling, menu analytics, and loyalty programs.', category: 'Business Strategy', readTime: '8 min' },
      a2: { title: 'Effective Food Cost Management in F&B Business', excerpt: 'Uncontrolled food cost is the biggest margin killer in F&B. Discover how to use recipe management and inventory tracking to keep food cost below 35%.', category: 'Operations', readTime: '6 min' },
      a3: { title: 'F&B Digital Trends 2026: AI, Automation & Customer Experience', excerpt: 'The F&B industry is rapidly moving into the digital era. From AI-powered menu recommendations to automated kitchen displays, discover the trends dominating this year.', category: 'Industry Trends', readTime: '10 min' },
    },
    retail: {
      a1: { title: 'Omnichannel Retail: Online & Offline Integration Strategy', excerpt: 'Modern customers shop everywhere. Learn how to integrate physical stores with marketplaces and online stores for a seamless experience that increases conversion.', category: 'Business Strategy', readTime: '9 min' },
      a2: { title: 'Smart Inventory Management for Modern Retail Business', excerpt: 'Overstock and stockout are equally harmful. Use data analytics and AI forecasting to maintain optimal stock levels at every store location.', category: 'Operations', readTime: '7 min' },
      a3: { title: 'Effective Loyalty Programs: Increasing Repeat Customers', excerpt: 'Acquiring new customers is 5x more expensive than retaining existing ones. Find the loyalty program formula that truly improves retention rates.', category: 'Customer', readTime: '6 min' },
    },
    distribution: {
      a1: { title: 'Supply Chain Optimization with ERP Technology', excerpt: 'An efficient supply chain is the main competitive advantage in distribution. Learn how integrated ERP accelerates fulfillment and reduces logistics costs.', category: 'Supply Chain', readTime: '8 min' },
      a2: { title: 'Sales Force Automation: Boosting Field Team Productivity', excerpt: 'Your field sales team can be 40% more productive with SFA. From route optimization to digital field orders, discover how to maximize daily visits.', category: 'Sales', readTime: '7 min' },
      a3: { title: 'Fleet Management Best Practices for Distribution Companies', excerpt: 'Vehicle fleet is the biggest asset in distribution business. Optimize maintenance schedules, fuel efficiency, and driver productivity with digital fleet systems.', category: 'Operations', readTime: '9 min' },
    },
    manufacturing: {
      a1: { title: 'Production Planning Integration with Inventory Management', excerpt: 'Efficient production starts with accurate material planning. Learn how to integrate production schedules with real-time raw material availability.', category: 'Production', readTime: '8 min' },
      a2: { title: 'Digital Quality Control: From Manual to Automation', excerpt: 'Transitioning from paper checklists to digital QC improves accuracy and traceability. Discover steps for implementing ERP-based quality control.', category: 'Quality', readTime: '7 min' },
      a3: { title: 'HRIS for Manufacturing: Managing Shifts & Overtime Efficiently', excerpt: 'Manufacturing with complex shifts needs a capable HRIS. From automatic shift rotation to accurate overtime calculations compliant with labor laws.', category: 'HR', readTime: '6 min' },
    },
    services: {
      a1: { title: 'CRM Best Practices for Professional Services', excerpt: 'Customer relationships are everything in services. Learn how to build a customer 360° view and automate follow-ups to increase client retention.', category: 'Customer', readTime: '8 min' },
      a2: { title: 'Project Management Integrated with ERP', excerpt: 'Manage projects, resource allocation, timesheets, and billing in one platform. Improve project profitability with real-time visibility.', category: 'Project', readTime: '7 min' },
      a3: { title: 'Invoice & Billing Automation for Financial Efficiency', excerpt: 'Automating invoices from timesheets and contracts reduces errors and accelerates cash collection. Discover billing automation best practices.', category: 'Finance', readTime: '6 min' },
    },
    logistics: {
      a1: { title: 'Modern TMS: End-to-End Delivery Optimization', excerpt: 'A good Transportation Management System can reduce shipping costs by 15-20%. From route optimization to carrier management, discover implementation strategies.', category: 'Transport', readTime: '9 min' },
      a2: { title: 'GPS Tracking & Geofencing for Delivery Fleets', excerpt: 'Real-time fleet visibility improves on-time delivery rates. Learn how to implement effective GPS tracking and geofencing.', category: 'Fleet', readTime: '7 min' },
      a3: { title: 'Accurate Vehicle Operational Cost Analysis', excerpt: 'Knowing the true cost per km of each vehicle is key to logistics profitability. Use fleet analytics for data-driven decisions.', category: 'Finance', readTime: '8 min' },
    },
  },
  faq: {
    fnb: {
      q1: { q: 'Is Bedagang suitable for restaurants with multiple branches?', a: 'Yes, Bedagang is designed for multi-branch operations. You can manage all branches from one HQ dashboard with real-time synchronized data. Each branch can have different menu, pricing, and tax configurations.' },
      q2: { q: 'How does POS integrate with Kitchen Display System?', a: 'Orders from POS automatically enter the Kitchen Display System (KDS) based on station (hot kitchen, cold kitchen, beverage, etc). Each station sees only relevant items, and ready status automatically updates to POS and customers.' },
      q3: { q: 'Can it calculate food cost per menu item?', a: 'Yes, through the Recipe Management module integrated with Inventory. You can define recipes with ingredients and portions, then the system automatically calculates food cost based on the latest purchase prices from suppliers.' },
      q4: { q: 'What payment methods are supported?', a: 'Bedagang POS supports cash, QRIS (all e-wallets), GoPay, OVO, Dana, ShopeePay, debit/credit cards (via payment gateway), and split payment combinations. You can also add custom methods.' },
      q5: { q: 'How long does setup take for a new restaurant?', a: 'Basic setup (products, categories, taxes, receipts) can be completed in 1-2 days. Full setup including inventory, employees, and finance takes 3-5 business days with our team\'s guidance.' },
    },
    retail: {
      q1: { q: 'Can Bedagang connect to Tokopedia and Shopee?', a: 'Yes, through the Marketplace Integration module. Products and stock are auto-synced to Tokopedia, Shopee, and other marketplaces. Orders from marketplaces also automatically enter the system for processing.' },
      q2: { q: 'How to manage stock across multiple stores?', a: 'The Inventory module supports multi-warehouse and multi-branch. You can view stock at each location, perform inter-store transfers, and set minimum stock alerts per location.' },
      q3: { q: 'Is there a loyalty and membership feature?', a: 'Yes, through the Loyalty & CRM module. You can create point programs, membership tiers, vouchers, and member-exclusive discounts. Customer purchase data is automatically recorded for personalized offers.' },
      q4: { q: 'How to handle returns and refunds?', a: 'Bedagang POS supports direct return and refund processing. Returns can be exchanges or money refunds, and stock is auto-updated in inventory. All return transactions are recorded in the audit log.' },
      q5: { q: 'Does it support barcode and label printing?', a: 'Yes, the system supports barcode scanning (1D and 2D/QR), barcode generation for new products, and price label printing. Compatible with popular thermal printers and barcode scanners.' },
    },
    distribution: {
      q1: { q: 'Is there a feature for field sales teams?', a: 'Yes, the SFA (Sales Force Automation) module provides visit tracking with GPS check-in, field order creation, target management, route planning, and coverage monitoring for field sales teams.' },
      q2: { q: 'How to manage distribution vehicle fleets?', a: 'The Fleet Management (FMS) module manages the entire fleet: vehicle master data, drivers, maintenance schedules, fuel, inspections, and cost analysis. Integrated with TMS for delivery trip assignments.' },
      q3: { q: 'Can it calculate sales commissions and incentives?', a: 'Yes, the SFA Enhanced module supports flexible incentive schemes: per-product commissions, tier achievements, target bonuses, and per-salesperson caps. Calculations are automatic based on actual sales data.' },
      q4: { q: 'How does the purchase order process work?', a: 'Through the Inventory module, you can create POs to suppliers, track approvals, monitor delivery status, and receive goods. Stock is automatically updated and journal entries are recorded.' },
      q5: { q: 'Is there an approval workflow for orders and expenses?', a: 'Yes, the system supports multi-level approval for purchase orders, field orders, expenses, and other documents. You can configure approval steps based on amount and transaction type.' },
    },
    manufacturing: {
      q1: { q: 'How does Bedagang help manufacturing processes?', a: 'Bedagang provides Inventory module for raw material management, recipe/BOM tracking, purchase orders to suppliers, and stock opname. Integrated with Finance for costing and HR for production shift management.' },
      q2: { q: 'Does it support multi-warehouse for raw materials and finished goods?', a: 'Yes, the Inventory module supports unlimited warehouses with zones and locations. You can separate raw material, WIP, finished goods, and quarantine warehouses with inter-warehouse transfer workflows.' },
      q3: { q: 'How to manage production employee shifts?', a: 'The HRIS module provides 8 shift templates (including night shifts with cross-day), automatic shift rotation, and overtime tracking. Attendance can use GPS geofencing at the factory area.' },
      q4: { q: 'Is there a quality control feature?', a: 'Through stock opname and goods receipt inspection, you can perform quality checks upon receipt and during production. Compliance checklists are also available through the Industrial Relations module.' },
      q5: { q: 'Can it calculate COGS (Cost of Goods Manufactured)?', a: 'Yes, through Inventory (raw materials) and Finance (overhead costs, labor) integration, the system can calculate COGS per product. Cost history tracking is also available for cost trend analysis.' },
    },
    services: {
      q1: { q: 'How is Bedagang suitable for professional services?', a: 'Bedagang provides CRM for client management, Project Management for project and timesheet tracking, Finance for invoicing and billing, and HRIS to manage your professional team.' },
      q2: { q: 'Is there project management and timesheet functionality?', a: 'Yes, the HRIS Project Management module includes project planning, worker assignment, timesheet tracking, and project payroll. You can calculate project profitability based on timesheet vs billing.' },
      q3: { q: 'How to manage client invoices?', a: 'The Finance module provides invoice creation, recurring invoices, payment tracking, and aging analysis for receivables. Invoices can be sent automatically via email or WhatsApp.' },
      q4: { q: 'Can CRM record all client interactions?', a: 'Yes, CRM 360° records all interactions: meetings, calls, emails, WhatsApp, and notes. With timeline view, your team can see the entire relationship history with each client.' },
      q5: { q: 'Can it manage contracts and SLAs?', a: 'Yes, the CRM module provides ticket management with SLA tracking, and the HRIS Industrial Relations module supports contract management. You can set automatic reminders for contracts nearing expiration.' },
    },
    logistics: {
      q1: { q: 'Is Bedagang suitable for logistics companies?', a: 'Absolutely. With TMS (Transportation Management) and FMS (Fleet Management) modules, you can manage all logistics operations: shipments, trip planning, carrier management, vehicle fleets, and proof of delivery.' },
      q2: { q: 'How does real-time shipment tracking work?', a: 'The TMS module provides shipment lifecycle tracking from created to delivered. With GPS integration from FMS, you can monitor vehicle positions and estimated arrival times in real-time.' },
      q3: { q: 'Is there a rate card and freight billing feature?', a: 'Yes, TMS supports rate cards per zone, service type, and vehicle type. Freight billing is auto-generated based on shipment data and rate cards, ready for customer invoicing.' },
      q4: { q: 'How to manage operational costs per vehicle?', a: 'FMS records all costs: fuel, maintenance, insurance, tires, and overhead. The cost analysis dashboard displays total cost of ownership per vehicle, cost per km, and fleet efficiency comparisons.' },
      q5: { q: 'Is there a digital proof of delivery feature?', a: 'Yes, TMS provides digital proof of delivery (ePOD) with digital signatures, item photos, and receiver notes. ePOD data is immediately synchronized to the system for billing and reporting processes.' },
    },
  },
};

// ═══════════════════════════════════════════════════════
// Japanese articles & FAQ
// ═══════════════════════════════════════════════════════
const art_ja = {
  articles: {
    fnb: {
      a1: { title: 'POSテクノロジーでレストラン収益を向上させる5つの戦略', excerpt: '最新のPOSシステムが自動アップセリング、メニュー分析、ロイヤルティプログラムを通じて、レストランの運営効率と収益を最大30%向上させる方法を学びましょう。', category: 'ビジネス戦略', readTime: '8分' },
      a2: { title: 'F&Bビジネスにおける効果的なフードコスト管理', excerpt: '管理されていないフードコストはF&Bの利益率を最も圧迫します。レシピ管理と在庫追跡を使用してフードコストを35%以下に抑える方法を発見しましょう。', category: 'オペレーション', readTime: '6分' },
      a3: { title: 'F&Bデジタルトレンド2026：AI、自動化＆顧客体験', excerpt: 'F&B業界は急速にデジタル化が進んでいます。AI搭載メニュー推奨から自動キッチンディスプレイまで、今年のトレンドをご覧ください。', category: '業界トレンド', readTime: '10分' },
    },
    retail: {
      a1: { title: 'オムニチャネルリテール：オンライン＆オフライン統合戦略', excerpt: '現代の顧客はどこでも買い物をします。実店舗とマーケットプレイスを統合してコンバージョンを向上させるシームレスな体験の構築方法を学びましょう。', category: 'ビジネス戦略', readTime: '9分' },
      a2: { title: 'モダンリテールビジネスのためのスマート在庫管理', excerpt: '過剰在庫と在庫切れは同様に有害です。データ分析とAI予測を使用して各店舗の最適な在庫レベルを維持しましょう。', category: 'オペレーション', readTime: '7分' },
      a3: { title: '効果的なロイヤルティプログラム：リピート顧客の増加', excerpt: '新規顧客の獲得は既存顧客の維持よりも5倍のコストがかかります。リテンション率を本当に向上させるロイヤルティプログラムの公式を見つけましょう。', category: 'カスタマー', readTime: '6分' },
    },
    distribution: {
      a1: { title: 'ERPテクノロジーによるサプライチェーン最適化', excerpt: '効率的なサプライチェーンは流通ビジネスの主要な競争優位性です。統合ERPがフルフィルメントを加速し物流コストを削減する方法を学びましょう。', category: 'サプライチェーン', readTime: '8分' },
      a2: { title: '営業力自動化：フィールドチームの生産性向上', excerpt: 'SFAでフィールド営業チームの生産性を40%向上させることができます。ルート最適化からデジタル受注まで、日次訪問を最大化する方法をご覧ください。', category: '営業', readTime: '7分' },
      a3: { title: '流通企業のためのフリート管理ベストプラクティス', excerpt: '車両フリートは流通ビジネス最大の資産です。デジタルフリートシステムでメンテナンス、燃費効率、ドライバー生産性を最適化しましょう。', category: 'オペレーション', readTime: '9分' },
    },
    manufacturing: {
      a1: { title: '生産計画と在庫管理の統合', excerpt: '効率的な生産は正確な資材計画から始まります。生産スケジュールとリアルタイムの原材料在庫を統合する方法を学びましょう。', category: '生産', readTime: '8分' },
      a2: { title: 'デジタル品質管理：手動から自動化へ', excerpt: '紙のチェックリストからデジタルQCへの移行は精度とトレーサビリティを向上させます。ERP品質管理の導入手順を学びましょう。', category: '品質', readTime: '7分' },
      a3: { title: '製造業のためのHRIS：シフト＆残業の効率的管理', excerpt: '複雑なシフトを持つ製造業には優れたHRISが必要です。自動シフトローテーションから労働法に準拠した正確な残業計算まで。', category: '人事', readTime: '6分' },
    },
    services: {
      a1: { title: 'プロフェッショナルサービスのためのCRMベストプラクティス', excerpt: 'サービス業では顧客関係がすべてです。顧客360°ビューの構築とフォローアップの自動化でクライアントリテンションを向上させる方法を学びましょう。', category: 'カスタマー', readTime: '8分' },
      a2: { title: 'ERPと統合されたプロジェクト管理', excerpt: 'プロジェクト、リソース配分、タイムシート、請求を一つのプラットフォームで管理。リアルタイムの可視性でプロジェクトの収益性を向上させましょう。', category: 'プロジェクト', readTime: '7分' },
      a3: { title: '請求書＆課金自動化で財務効率を向上', excerpt: 'タイムシートと契約からの請求書自動化はエラーを削減しキャッシュ回収を加速します。課金自動化のベストプラクティスをご覧ください。', category: '財務', readTime: '6分' },
    },
    logistics: {
      a1: { title: 'モダンTMS：エンドツーエンドの配送最適化', excerpt: '優れた輸送管理システムは配送コストを15-20%削減できます。ルート最適化からキャリア管理まで、導入戦略をご覧ください。', category: '輸送', readTime: '9分' },
      a2: { title: '配送フリートのためのGPSトラッキング＆ジオフェンシング', excerpt: 'リアルタイムのフリート可視性は定時配送率を向上させます。効果的なGPSトラッキングとジオフェンシングの導入方法を学びましょう。', category: 'フリート', readTime: '7分' },
      a3: { title: '正確な車両運用コスト分析', excerpt: '各車両のkm当たりの真のコストを知ることが物流の収益性の鍵です。データドリブンな意思決定のためにフリート分析を活用しましょう。', category: '財務', readTime: '8分' },
    },
  },
  faq: {
    fnb: {
      q1: { q: 'Bedagangは複数店舗のレストランに適していますか？', a: 'はい、Bedagangはマルチブランチ運営向けに設計されています。1つのHQダッシュボードからすべての店舗をリアルタイムで管理でき、各店舗は独自のメニュー、価格、税金設定が可能です。' },
      q2: { q: 'POSとキッチンディスプレイシステムの連携は？', a: 'POSからの注文はステーション（ホットキッチン、コールドキッチン、ドリンクなど）に基づいてKDSに自動入力されます。各ステーションは関連アイテムのみ表示し、準備完了ステータスはPOSとお客様に自動更新されます。' },
      q3: { q: 'メニューごとのフードコストは計算できますか？', a: 'はい、在庫と連携したレシピ管理モジュールで可能です。材料と分量でレシピを定義すると、仕入先からの最新購入価格に基づいてフードコストが自動計算されます。' },
      q4: { q: 'どのような決済方法に対応していますか？', a: 'Bedagang POSは現金、QRIS（全電子ウォレット）、GoPay、OVO、Dana、ShopeePay、デビット/クレジットカード（決済ゲートウェイ経由）、分割払いに対応しています。カスタム方法の追加も可能です。' },
      q5: { q: '新しいレストランのセットアップにはどのくらいかかりますか？', a: '基本セットアップ（商品、カテゴリ、税金、レシート）は1-2日で完了できます。在庫、従業員、財務を含むフルセットアップは当社チームのサポートで3-5営業日かかります。' },
    },
    retail: {
      q1: { q: 'BedagangはTokopediaやShopeeと接続できますか？', a: 'はい、マーケットプレイス連携モジュールで可能です。商品と在庫はTokopedia、Shopee、その他のマーケットプレイスに自動同期されます。マーケットプレイスからの注文も自動的にシステムに入ります。' },
      q2: { q: '複数店舗の在庫管理はどうしますか？', a: '在庫モジュールはマルチウェアハウスとマルチブランチに対応しています。各場所の在庫確認、店舗間移動、場所ごとの最低在庫アラート設定が可能です。' },
      q3: { q: 'ロイヤルティとメンバーシップ機能はありますか？', a: 'はい、ロイヤルティ＆CRMモジュールで対応しています。ポイントプログラム、メンバーシップティア、バウチャー、会員限定割引を作成できます。購入データは自動記録されパーソナライズされたオファーに活用されます。' },
      q4: { q: '返品と返金はどう処理しますか？', a: 'Bedagang POSは返品と返金の直接処理をサポートしています。商品交換または返金が可能で、在庫は自動更新されます。すべての返品取引は監査ログに記録されます。' },
      q5: { q: 'バーコードとラベル印刷に対応していますか？', a: 'はい、バーコードスキャン（1Dおよび2D/QR）、新商品のバーコード生成、価格ラベル印刷に対応しています。主要なサーマルプリンターとバーコードスキャナーと互換性があります。' },
    },
    distribution: {
      q1: { q: 'フィールド営業チーム向けの機能はありますか？', a: 'はい、SFA（営業力自動化）モジュールはGPSチェックイン付き訪問追跡、フィールドオーダー作成、目標管理、ルート計画、カバレッジ監視を提供します。' },
      q2: { q: '流通車両フリートの管理方法は？', a: 'フリート管理（FMS）モジュールが車両マスターデータ、ドライバー、メンテナンススケジュール、燃料、点検、コスト分析を管理します。TMSと連携して配送トリップを割り当てます。' },
      q3: { q: '営業コミッションとインセンティブを計算できますか？', a: 'はい、SFA Enhancedモジュールは商品別コミッション、ティア達成、目標ボーナス、営業担当者別上限など柔軟なインセンティブスキームをサポートしています。' },
      q4: { q: '仕入先への発注プロセスは？', a: '在庫モジュールで仕入先へのPO作成、承認追跡、配送状況監視、入荷処理が可能です。在庫は自動更新され仕訳も記録されます。' },
      q5: { q: '注文と経費の承認ワークフローはありますか？', a: 'はい、発注、フィールドオーダー、経費などのマルチレベル承認をサポートしています。金額と取引タイプに基づいて承認ステップを設定できます。' },
    },
    manufacturing: {
      q1: { q: 'Bedagangは製造プロセスをどのように支援しますか？', a: 'Bedagangは原材料管理、レシピ/BOM追跡、仕入先への発注、棚卸しのための在庫モジュールを提供します。原価計算のための財務とシフト管理のためのHRと統合されています。' },
      q2: { q: '原材料と完成品のマルチ倉庫に対応していますか？', a: 'はい、在庫モジュールはゾーンとロケーション付きの無制限ウェアハウスをサポートしています。原材料、仕掛品、完成品、検疫倉庫を分離し、倉庫間移動ワークフローを設定できます。' },
      q3: { q: '製造従業員のシフト管理方法は？', a: 'HRISモジュールは8つのシフトテンプレート（日をまたぐ夜勤含む）、自動シフトローテーション、残業追跡を提供します。工場エリアでのGPSジオフェンシング出勤も可能です。' },
      q4: { q: '品質管理機能はありますか？', a: '棚卸しと入荷検査を通じて、受入時と製造中の品質チェックが可能です。コンプライアンスチェックリストも労使関係モジュールで利用できます。' },
      q5: { q: '製造原価（COGS）を計算できますか？', a: 'はい、在庫（原材料）と財務（間接費、人件費）の統合により、製品ごとのCOGSを計算できます。コスト履歴追跡でコストトレンド分析も可能です。' },
    },
    services: {
      q1: { q: 'Bedagangはプロフェッショナルサービスに適していますか？', a: 'Bedagangはクライアント管理のためのCRM、プロジェクトとタイムシート追跡のためのプロジェクト管理、請求のための財務、チーム管理のためのHRISを提供します。' },
      q2: { q: 'プロジェクト管理とタイムシート機能はありますか？', a: 'はい、HRISプロジェクト管理モジュールはプロジェクト計画、作業者割り当て、タイムシート追跡、プロジェクト給与を含みます。タイムシートと請求に基づくプロジェクト収益性の計算が可能です。' },
      q3: { q: 'クライアントへの請求書管理方法は？', a: '財務モジュールは請求書作成、定期請求書、入金追跡、売掛金のエイジング分析を提供します。請求書はメールまたはWhatsAppで自動送信できます。' },
      q4: { q: 'CRMはクライアントとのすべてのやり取りを記録できますか？', a: 'はい、CRM 360°はミーティング、電話、メール、WhatsApp、メモなどすべてのやり取りを記録します。タイムラインビューで各クライアントとの関係履歴全体を確認できます。' },
      q5: { q: '契約とSLAを管理できますか？', a: 'はい、CRMモジュールはSLA追跡付きチケット管理を提供し、HRIS労使関係モジュールは契約管理をサポートします。期限が近い契約の自動リマインダーを設定できます。' },
    },
    logistics: {
      q1: { q: 'Bedagangは物流会社に適していますか？', a: 'TMS（輸送管理）とFMS（フリート管理）モジュールで、出荷、トリップ計画、キャリア管理、車両フリート、配達証明などすべての物流業務を管理できます。' },
      q2: { q: 'リアルタイム配送追跡はどのように機能しますか？', a: 'TMSモジュールは作成から配達完了までの出荷ライフサイクル追跡を提供します。FMSのGPS連携で車両位置と到着予定時刻をリアルタイムで監視できます。' },
      q3: { q: 'レートカードと運賃請求機能はありますか？', a: 'はい、TMSはゾーン、サービスタイプ、車両タイプごとのレートカードをサポートしています。出荷データとレートカードに基づいて運賃請求が自動生成され、顧客請求の準備ができます。' },
      q4: { q: '車両ごとの運用コスト管理方法は？', a: 'FMSは燃料、メンテナンス、保険、タイヤ、間接費などすべてのコストを記録します。コスト分析ダッシュボードで車両ごとの総所有コスト、km当たりのコスト、フリート効率比較を表示します。' },
      q5: { q: 'デジタル配達証明機能はありますか？', a: 'はい、TMSはデジタル署名、商品写真、受取人メモ付きのデジタル配達証明（ePOD）を提供します。ePODデータは請求およびレポートプロセスのためにシステムに即座に同期されます。' },
    },
  },
};

// ═══════════════════════════════════════════════════════
// Chinese articles & FAQ
// ═══════════════════════════════════════════════════════
const art_zh = {
  articles: {
    fnb: {
      a1: { title: '利用POS技术提升餐厅收入的5大策略', excerpt: '了解现代POS系统如何通过自动追加销售、菜单分析和忠诚度计划，将您的餐厅运营效率和收入提高多达30%。', category: '商业策略', readTime: '8分钟' },
      a2: { title: '有效管理餐饮业食品成本', excerpt: '失控的食品成本是餐饮业利润率的最大杀手。了解如何使用配方管理和库存跟踪将食品成本控制在35%以下。', category: '运营', readTime: '6分钟' },
      a3: { title: '2026年餐饮数字化趋势：AI、自动化和客户体验', excerpt: '餐饮行业正迅速迈入数字化时代。从AI驱动的菜单推荐到自动化厨房显示，了解今年的主导趋势。', category: '行业趋势', readTime: '10分钟' },
    },
    retail: {
      a1: { title: '全渠道零售：线上线下整合策略', excerpt: '现代消费者随处购物。了解如何将实体店与电商平台整合，打造提升转化率的无缝体验。', category: '商业策略', readTime: '9分钟' },
      a2: { title: '现代零售业的智能库存管理', excerpt: '库存过剩和缺货同样有害。使用数据分析和AI预测来维持每个门店的最佳库存水平。', category: '运营', readTime: '7分钟' },
      a3: { title: '有效的忠诚度计划：提升回头客', excerpt: '获取新客户的成本是留住现有客户的5倍。找到真正提高留存率的忠诚度计划方案。', category: '客户', readTime: '6分钟' },
    },
    distribution: {
      a1: { title: '利用ERP技术优化供应链', excerpt: '高效的供应链是分销业务的核心竞争优势。了解集成ERP如何加速履约并降低物流成本。', category: '供应链', readTime: '8分钟' },
      a2: { title: '销售力量自动化：提升外勤团队生产力', excerpt: '通过SFA，您的外勤销售团队可以提高40%的生产力。从路线优化到数字化现场订单，了解如何最大化日常拜访。', category: '销售', readTime: '7分钟' },
      a3: { title: '分销企业的车队管理最佳实践', excerpt: '车队是分销业务最大的资产。通过数字化车队系统优化维护计划、燃油效率和驾驶员生产力。', category: '运营', readTime: '9分钟' },
    },
    manufacturing: {
      a1: { title: '生产计划与库存管理的集成', excerpt: '高效生产始于准确的物料计划。了解如何将生产计划与实时原材料库存进行集成。', category: '生产', readTime: '8分钟' },
      a2: { title: '数字化质量控制：从手动到自动化', excerpt: '从纸质检查表到数字QC的转变提高了准确性和可追溯性。了解实施基于ERP的质量控制的步骤。', category: '质量', readTime: '7分钟' },
      a3: { title: '制造业HRIS：高效管理班次和加班', excerpt: '复杂班次的制造业需要强大的HRIS。从自动班次轮换到符合劳动法的准确加班计算。', category: '人力资源', readTime: '6分钟' },
    },
    services: {
      a1: { title: '专业服务的CRM最佳实践', excerpt: '在服务业中，客户关系就是一切。了解如何构建客户360°视图并自动化跟进以提高客户留存。', category: '客户', readTime: '8分钟' },
      a2: { title: '与ERP集成的项目管理', excerpt: '在一个平台上管理项目、资源分配、工时表和计费。通过实时可视性提升项目盈利能力。', category: '项目', readTime: '7分钟' },
      a3: { title: '发票和计费自动化提升财务效率', excerpt: '从工时表和合同自动生成发票可减少错误并加速资金回收。了解计费自动化的最佳实践。', category: '财务', readTime: '6分钟' },
    },
    logistics: {
      a1: { title: '现代TMS：端到端配送优化', excerpt: '良好的运输管理系统可以将运输成本降低15-20%。从路线优化到承运商管理，了解实施策略。', category: '运输', readTime: '9分钟' },
      a2: { title: '配送车队的GPS跟踪和地理围栏', excerpt: '实时车队可视性可提高准时交付率。了解如何实施有效的GPS跟踪和地理围栏。', category: '车队', readTime: '7分钟' },
      a3: { title: '准确的车辆运营成本分析', excerpt: '了解每辆车的真实每公里成本是物流盈利的关键。利用车队分析进行数据驱动的决策。', category: '财务', readTime: '8分钟' },
    },
  },
  faq: {
    fnb: {
      q1: { q: 'Bedagang适合多分店餐厅吗？', a: '是的，Bedagang专为多分店运营设计。您可以从一个HQ仪表板管理所有分店，数据实时同步。每个分店可以拥有不同的菜单、价格和税务配置。' },
      q2: { q: 'POS如何与厨房显示系统集成？', a: 'POS订单根据工位（热厨、冷厨、饮品等）自动进入KDS。每个工位只显示相关项目，准备就绪状态自动更新到POS和顾客。' },
      q3: { q: '能计算每道菜的食品成本吗？', a: '是的，通过与库存集成的配方管理模块。您可以定义配料和份量的配方，系统根据供应商最新采购价格自动计算食品成本。' },
      q4: { q: '支持哪些付款方式？', a: 'Bedagang POS支持现金、QRIS（所有电子钱包）、GoPay、OVO、Dana、ShopeePay、借记卡/信用卡（通过支付网关）和混合分期付款。您还可以添加自定义方式。' },
      q5: { q: '新餐厅的设置需要多长时间？', a: '基本设置（产品、类别、税务、收据）可在1-2天内完成。包括库存、员工和财务的完整设置在我们团队的指导下需要3-5个工作日。' },
    },
    retail: {
      q1: { q: 'Bedagang能连接Tokopedia和Shopee吗？', a: '是的，通过电商平台集成模块。产品和库存自动同步到Tokopedia、Shopee和其他平台。平台订单也自动进入系统进行处理。' },
      q2: { q: '如何管理多店铺库存？', a: '库存模块支持多仓库和多门店。您可以查看每个位置的库存、进行门店间调拨、设置每个位置的最低库存预警。' },
      q3: { q: '有忠诚度和会员功能吗？', a: '是的，通过忠诚度和CRM模块。您可以创建积分计划、会员等级、优惠券和会员专属折扣。客户购买数据自动记录用于个性化推荐。' },
      q4: { q: '如何处理退货和退款？', a: 'Bedagang POS支持直接退货和退款处理。退货可以是换货或退款，库存自动更新。所有退货交易记录在审计日志中。' },
      q5: { q: '支持条形码和标签打印吗？', a: '是的，系统支持条形码扫描（1D和2D/QR）、新产品条形码生成和价格标签打印。兼容主流热敏打印机和条形码扫描仪。' },
    },
    distribution: {
      q1: { q: '有外勤销售团队的功能吗？', a: '是的，SFA模块提供GPS签到访问跟踪、现场订单创建、目标管理、路线规划和覆盖监控。' },
      q2: { q: '如何管理分销车队？', a: 'FMS模块管理整个车队：车辆主数据、司机、维护计划、燃油、检查和成本分析。与TMS集成进行配送任务分配。' },
      q3: { q: '能计算销售佣金和激励吗？', a: '是的，SFA Enhanced模块支持灵活的激励方案：按产品佣金、阶梯达成、目标奖金和个人上限。基于实际销售数据自动计算。' },
      q4: { q: '采购订单流程是怎样的？', a: '通过库存模块，您可以创建供应商PO、跟踪审批、监控发货状态和入库。库存自动更新，会计分录自动记录。' },
      q5: { q: '有订单和费用的审批流程吗？', a: '是的，系统支持采购订单、现场订单、费用等的多级审批。您可以根据金额和交易类型配置审批步骤。' },
    },
    manufacturing: {
      q1: { q: 'Bedagang如何帮助制造流程？', a: 'Bedagang提供原材料管理、配方/BOM跟踪、供应商采购和盘点的库存模块。与财务集成进行成本核算，与HR集成进行生产班次管理。' },
      q2: { q: '支持原材料和成品的多仓库吗？', a: '是的，库存模块支持带区域和位置的无限仓库。您可以分离原材料、在制品、成品和隔离仓库，并设置仓库间调拨流程。' },
      q3: { q: '如何管理生产员工班次？', a: 'HRIS模块提供8个班次模板（包括跨日夜班）、自动班次轮换和加班跟踪。可在工厂区域使用GPS地理围栏考勤。' },
      q4: { q: '有质量控制功能吗？', a: '通过盘点和入库检查，您可以在收货时和生产过程中进行质量检查。合规检查清单也可通过劳动关系模块使用。' },
      q5: { q: '能计算生产成本（COGS）吗？', a: '是的，通过库存（原材料）和财务（间接成本、人工）集成，系统可以计算每个产品的COGS。还提供成本历史跟踪用于成本趋势分析。' },
    },
    services: {
      q1: { q: 'Bedagang适合专业服务公司吗？', a: 'Bedagang提供客户管理的CRM、项目和工时跟踪的项目管理、发票和计费的财务，以及团队管理的HRIS。' },
      q2: { q: '有项目管理和工时表功能吗？', a: '是的，HRIS项目管理模块包括项目规划、人员分配、工时跟踪和项目工资。您可以根据工时和计费计算项目盈利能力。' },
      q3: { q: '如何管理客户发票？', a: '财务模块提供发票创建、定期发票、收款跟踪和应收账款账龄分析。发票可通过邮件或WhatsApp自动发送。' },
      q4: { q: 'CRM能记录与客户的所有互动吗？', a: '是的，CRM 360°记录所有互动：会议、电话、邮件、WhatsApp和备注。通过时间线视图，您的团队可以查看与每个客户的完整关系历史。' },
      q5: { q: '能管理合同和SLA吗？', a: '是的，CRM模块提供带SLA跟踪的工单管理，HRIS劳动关系模块支持合同管理。您可以设置即将到期合同的自动提醒。' },
    },
    logistics: {
      q1: { q: 'Bedagang适合物流公司吗？', a: '非常适合。通过TMS和FMS模块，您可以管理所有物流业务：货运、行程规划、承运商管理、车队和交货证明。' },
      q2: { q: '实时货运跟踪如何工作？', a: 'TMS模块提供从创建到交付的货运生命周期跟踪。结合FMS的GPS集成，您可以实时监控车辆位置和预计到达时间。' },
      q3: { q: '有费率卡和运费计费功能吗？', a: '是的，TMS支持按区域、服务类型和车辆类型的费率卡。运费账单根据货运数据和费率卡自动生成，准备好进行客户开票。' },
      q4: { q: '如何管理每辆车的运营成本？', a: 'FMS记录所有成本：燃油、维护、保险、轮胎和间接费用。成本分析仪表板显示每辆车的总拥有成本、每公里成本和车队效率对比。' },
      q5: { q: '有数字化交货证明功能吗？', a: '是的，TMS提供带数字签名、货物照片和收件人备注的数字化交货证明（ePOD）。ePOD数据立即同步到系统用于计费和报告。' },
    },
  },
};

export const moduleArticleTranslations: Record<Language, Record<string, any>> = {
  id: { mp: art_id },
  en: { mp: art_en },
  ja: { mp: art_ja },
  zh: { mp: art_zh },
};
