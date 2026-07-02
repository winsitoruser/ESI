/**
 * Migration Script: E-Document & Export System
 * Creates tables for document templates, generated documents log, and numbering sequences
 */

const { Sequelize, QueryTypes } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const sequelize = new Sequelize(
  process.env.DB_NAME || process.env.POSTGRES_DATABASE || 'bedagang',
  process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  process.env.DB_PASS || process.env.POSTGRES_PASSWORD || '',
  {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {}
  }
);

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // 1. Document Templates Table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id VARCHAR(50),
        document_type VARCHAR(50) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL,
        format VARCHAR(20) NOT NULL DEFAULT 'pdf',
        template_data JSONB DEFAULT '{}',
        header_config JSONB DEFAULT '{}',
        footer_config JSONB DEFAULT '{}',
        style_config JSONB DEFAULT '{}',
        signature_fields JSONB DEFAULT '[]',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1,
        business_type VARCHAR(50),
        created_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ document_templates table created');

    // 2. Document Generation Log
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS document_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id VARCHAR(50),
        branch_id VARCHAR(50),
        document_type VARCHAR(50) NOT NULL,
        document_number VARCHAR(100) NOT NULL,
        format VARCHAR(20) NOT NULL,
        category VARCHAR(50),
        title VARCHAR(300),
        file_size INTEGER,
        generated_by VARCHAR(100),
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        meta JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'generated',
        error_message TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ document_logs table created');

    // 3. Document Number Sequences
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        document_type VARCHAR(50) NOT NULL,
        prefix VARCHAR(20) NOT NULL,
        current_number INTEGER DEFAULT 0,
        year INTEGER NOT NULL,
        month INTEGER,
        format_pattern VARCHAR(100) DEFAULT '{PREFIX}-{YEAR}{MONTH}-{SEQ}',
        reset_period VARCHAR(20) DEFAULT 'monthly',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, document_type, year, month)
      );
    `);
    console.log('✅ document_sequences table created');

    // 4. Indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_templates_tenant ON document_templates(tenant_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_templates_type ON document_templates(document_type);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_templates_category ON document_templates(category);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_logs_tenant ON document_logs(tenant_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_logs_type ON document_logs(document_type);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_logs_generated_at ON document_logs(generated_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_logs_number ON document_logs(document_number);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_doc_sequences_tenant_type ON document_sequences(tenant_id, document_type);`);
    console.log('✅ Indexes created');

    // 5. Seed default templates
    const defaultTemplates = [
      { type: 'invoice', name: 'Invoice Standar', category: 'finance', desc: 'Template invoice standar untuk semua jenis bisnis' },
      { type: 'e-invoice', name: 'E-Faktur Pajak', category: 'finance', desc: 'Template faktur pajak elektronik sesuai format DJP' },
      { type: 'receipt', name: 'Kwitansi Pembayaran', category: 'finance', desc: 'Bukti penerimaan pembayaran' },
      { type: 'payslip', name: 'Slip Gaji Standar', category: 'hris', desc: 'Slip gaji karyawan dengan rincian komponen' },
      { type: 'payroll-summary', name: 'Rekap Payroll', category: 'hris', desc: 'Rekap penggajian seluruh karyawan per periode' },
      { type: 'warning-letter', name: 'Surat Peringatan', category: 'hris', desc: 'Template SP1/SP2/SP3 sesuai UU Ketenagakerjaan' },
      { type: 'termination-letter', name: 'Surat PHK', category: 'hris', desc: 'Surat Pemutusan Hubungan Kerja' },
      { type: 'employment-contract', name: 'Kontrak Kerja PKWT', category: 'hris', desc: 'Kontrak kerja waktu tertentu' },
      { type: 'attendance-report', name: 'Laporan Kehadiran', category: 'hris', desc: 'Rekap kehadiran karyawan per periode' },
      { type: 'leave-report', name: 'Laporan Cuti', category: 'hris', desc: 'Rekap cuti karyawan per periode' },
      { type: 'mutation-letter', name: 'Surat Mutasi/Promosi', category: 'hris', desc: 'SK Mutasi atau promosi karyawan' },
      { type: 'reference-letter', name: 'Surat Referensi Kerja', category: 'hris', desc: 'Surat keterangan pernah bekerja' },
      { type: 'employee-certificate', name: 'Surat Keterangan Karyawan', category: 'hris', desc: 'Surat keterangan masih bekerja' },
      { type: 'travel-expense-claim', name: 'Klaim Perjalanan Dinas', category: 'hris', desc: 'Formulir klaim biaya perjalanan dinas' },
      { type: 'purchase-order', name: 'Purchase Order', category: 'inventory', desc: 'Dokumen pemesanan barang ke supplier' },
      { type: 'goods-receipt', name: 'Bukti Penerimaan Barang', category: 'inventory', desc: 'Good Receipt Note (GRN)' },
      { type: 'delivery-note', name: 'Surat Jalan', category: 'inventory', desc: 'Dokumen pengiriman barang' },
      { type: 'stock-transfer', name: 'Bukti Transfer Stok', category: 'inventory', desc: 'Dokumen transfer antar gudang/cabang' },
      { type: 'stock-opname-report', name: 'Laporan Stock Opname', category: 'inventory', desc: 'Hasil stock take/opname' },
      { type: 'stock-valuation', name: 'Laporan Nilai Stok', category: 'inventory', desc: 'Laporan valuasi inventori' },
      { type: 'quotation', name: 'Penawaran Harga', category: 'sales', desc: 'Surat penawaran harga ke pelanggan' },
      { type: 'sales-report', name: 'Laporan Penjualan', category: 'sales', desc: 'Laporan penjualan per periode' },
      { type: 'profit-loss', name: 'Laporan Laba Rugi', category: 'finance', desc: 'Laporan P&L periodik' },
      { type: 'cash-flow', name: 'Laporan Arus Kas', category: 'finance', desc: 'Laporan cash flow periodik' },
      { type: 'tax-report', name: 'Laporan Pajak', category: 'finance', desc: 'Rekap pajak PPh & PPN' },
      { type: 'budget-report', name: 'Laporan Anggaran', category: 'finance', desc: 'Realisasi vs anggaran' },
      { type: 'work-order', name: 'Perintah Kerja', category: 'manufacturing', desc: 'Work order untuk produksi' },
      { type: 'freight-bill', name: 'Tagihan Pengiriman', category: 'tms', desc: 'Freight bill / tagihan ongkir' },
      { type: 'proof-of-delivery', name: 'Bukti Pengiriman', category: 'tms', desc: 'Proof of Delivery (POD)' },
      { type: 'vehicle-inspection', name: 'Inspeksi Kendaraan', category: 'fleet', desc: 'Checklist inspeksi kendaraan' },
      { type: 'audit-log-report', name: 'Laporan Audit Trail', category: 'compliance', desc: 'Laporan audit trail sistem' },
    ];

    for (const t of defaultTemplates) {
      await sequelize.query(`
        INSERT INTO document_templates (document_type, name, category, description, is_default, is_active, 
          signature_fields, header_config, footer_config)
        VALUES (:type, :name, :category, :desc, true, true,
          :signatures, :header, :footer)
        ON CONFLICT DO NOTHING
      `, {
        replacements: {
          type: t.type,
          name: t.name,
          category: t.category,
          desc: t.desc,
          signatures: JSON.stringify(getDefaultSignatures(t.type)),
          header: JSON.stringify({ showLogo: true, showCompanyName: true, showAddress: true, showContact: true }),
          footer: JSON.stringify({ showPageNumbers: true, showPrintDate: true, showPrintedBy: true }),
        }
      });
    }
    console.log(`✅ ${defaultTemplates.length} default document templates seeded`);

    console.log('\n🎉 E-Document system migration complete!');
    console.log('Tables created: document_templates, document_logs, document_sequences');
    console.log(`Templates seeded: ${defaultTemplates.length} default templates`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

function getDefaultSignatures(type) {
  const signatureMap = {
    'invoice': [
      { label: 'Hormat Kami', position: 'Direktur' },
      { label: 'Penerima', position: 'Customer' }
    ],
    'receipt': [
      { label: 'Penerima', position: 'Kasir' },
      { label: 'Penyetor', position: 'Customer' }
    ],
    'payslip': [],
    'warning-letter': [
      { label: 'Mengetahui,\nHRD Manager', position: 'HRD' },
      { label: 'Yang Bersangkutan', position: 'Karyawan' }
    ],
    'termination-letter': [
      { label: 'Direktur', position: 'Pihak Pertama' },
      { label: 'Karyawan', position: 'Pihak Kedua' },
      { label: 'Saksi', position: 'HRD' }
    ],
    'employment-contract': [
      { label: 'PIHAK PERTAMA\n(Perusahaan)', position: 'Direktur' },
      { label: 'PIHAK KEDUA\n(Karyawan)', position: 'Karyawan' }
    ],
    'purchase-order': [
      { label: 'Dibuat Oleh', position: 'Purchasing' },
      { label: 'Disetujui Oleh', position: 'Manager' },
      { label: 'Diterima Oleh', position: 'Supplier' }
    ],
    'goods-receipt': [
      { label: 'Diterima Oleh', position: 'Gudang' },
      { label: 'Diperiksa Oleh', position: 'QC' },
      { label: 'Pengirim', position: 'Supplier' }
    ],
    'delivery-note': [
      { label: 'Pengirim', position: 'Gudang' },
      { label: 'Kurir/Driver', position: 'Driver' },
      { label: 'Penerima', position: 'Tujuan' }
    ],
    'stock-transfer': [
      { label: 'Pengirim', position: 'Gudang Asal' },
      { label: 'Penerima', position: 'Gudang Tujuan' }
    ],
    'quotation': [
      { label: 'Hormat Kami', position: 'Sales' },
      { label: 'Persetujuan Customer', position: 'Customer' }
    ],
    'mutation-letter': [
      { label: 'Direktur', position: 'Pembuat Keputusan' },
      { label: 'HRD Manager', position: 'Mengetahui' },
      { label: 'Yang Bersangkutan', position: 'Karyawan' }
    ],
    'work-order': [
      { label: 'Production Manager', position: 'Pembuat' },
      { label: 'QC Manager', position: 'Quality' }
    ],
    'freight-bill': [
      { label: 'Pengirim', position: 'Dispatch' },
      { label: 'Penerima', position: 'Customer' }
    ],
    'proof-of-delivery': [
      { label: 'Driver', position: 'Pengantar' },
      { label: 'Penerima', position: 'Customer' }
    ],
  };
  return signatureMap[type] || [{ label: 'Dibuat Oleh', position: '' }, { label: 'Disetujui Oleh', position: '' }];
}

run();
