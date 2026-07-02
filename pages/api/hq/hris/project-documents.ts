import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false }
};

// In-memory store (replace with DB in production)
let documents: any[] = [];
let docIdCounter = 1;

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'project-documents');

// Document templates with comprehensive categories
const TEMPLATES = [
  // --- Kontrak & Perjanjian ---
  {
    id: 'tpl-01',
    name: 'Surat Perjanjian Kerja (PKWT)',
    description: 'Template kontrak kerja waktu tertentu sesuai UU Ketenagakerjaan. Mencakup identitas pihak, jabatan, masa kerja, kompensasi, hak & kewajiban, dan klausul pemutusan.',
    category: 'Kontrak & Perjanjian',
    icon: 'FileText',
    color: '#6366F1',
    format: 'docx',
    version: '2.1',
    lastUpdated: '2026-02-15',
    sections: [
      'Identitas Para Pihak',
      'Jabatan & Uraian Tugas',
      'Masa Berlaku Kontrak',
      'Kompensasi & Benefit',
      'Jam Kerja & Cuti',
      'Hak dan Kewajiban',
      'Kerahasiaan (NDA)',
      'Non-Compete Clause',
      'Pemutusan Hubungan Kerja',
      'Penyelesaian Perselisihan',
      'Tanda Tangan & Materai'
    ],
    tags: ['kontrak', 'pkwt', 'hr', 'legal'],
    downloadCount: 142
  },
  {
    id: 'tpl-02',
    name: 'Kontrak Kerja Freelance / Outsource',
    description: 'Template perjanjian untuk pekerja freelance atau outsource berbasis proyek. Termasuk scope of work, deliverables, timeline, dan payment terms.',
    category: 'Kontrak & Perjanjian',
    icon: 'UserCheck',
    color: '#8B5CF6',
    format: 'docx',
    version: '1.5',
    lastUpdated: '2026-02-10',
    sections: [
      'Identitas Para Pihak',
      'Scope of Work (SOW)',
      'Deliverables & Milestone',
      'Timeline Proyek',
      'Kompensasi & Metode Pembayaran',
      'Intellectual Property Rights',
      'Kerahasiaan',
      'Garansi & Revisi',
      'Force Majeure',
      'Pemutusan Kontrak',
      'Tanda Tangan'
    ],
    tags: ['freelance', 'outsource', 'kontrak', 'proyek'],
    downloadCount: 89
  },
  {
    id: 'tpl-03',
    name: 'Perjanjian Kerahasiaan (NDA)',
    description: 'Non-Disclosure Agreement untuk melindungi informasi rahasia perusahaan. Cocok untuk vendor, partner, dan karyawan baru.',
    category: 'Kontrak & Perjanjian',
    icon: 'Shield',
    color: '#EC4899',
    format: 'docx',
    version: '1.3',
    lastUpdated: '2026-01-20',
    sections: [
      'Definisi Informasi Rahasia',
      'Kewajiban Penerima',
      'Pengecualian',
      'Jangka Waktu',
      'Sanksi Pelanggaran',
      'Pengembalian Informasi',
      'Hukum yang Berlaku',
      'Tanda Tangan'
    ],
    tags: ['nda', 'kerahasiaan', 'legal'],
    downloadCount: 67
  },

  // --- Proposal & Perencanaan ---
  {
    id: 'tpl-04',
    name: 'Project Proposal',
    description: 'Template proposal proyek lengkap untuk mengajukan proyek baru ke manajemen atau klien. Termasuk executive summary, scope, budget, dan risk assessment.',
    category: 'Proposal & Perencanaan',
    icon: 'Presentation',
    color: '#F59E0B',
    format: 'docx',
    version: '2.0',
    lastUpdated: '2026-02-20',
    sections: [
      'Executive Summary',
      'Latar Belakang & Tujuan',
      'Scope of Work',
      'Metodologi & Pendekatan',
      'Timeline & Milestone',
      'Struktur Tim',
      'Rencana Anggaran Biaya (RAB)',
      'Risk Assessment & Mitigasi',
      'Expected Outcomes / ROI',
      'Terms & Conditions',
      'Lampiran'
    ],
    tags: ['proposal', 'planning', 'project'],
    downloadCount: 203
  },
  {
    id: 'tpl-05',
    name: 'Project Charter',
    description: 'Dokumen resmi yang mengotorisasi proyek dan memberikan wewenang kepada project manager. Standar PMI/PMBOK.',
    category: 'Proposal & Perencanaan',
    icon: 'Award',
    color: '#10B981',
    format: 'docx',
    version: '1.8',
    lastUpdated: '2026-02-18',
    sections: [
      'Project Title & ID',
      'Project Sponsor',
      'Project Manager & Authority',
      'Business Case / Justification',
      'Project Objectives',
      'High-Level Requirements',
      'High-Level Risks',
      'Milestone Schedule',
      'Budget Summary',
      'Stakeholder List',
      'Approval Signatures'
    ],
    tags: ['charter', 'pmbok', 'otorisasi'],
    downloadCount: 156
  },
  {
    id: 'tpl-06',
    name: 'Rencana Anggaran Biaya (RAB)',
    description: 'Template RAB detail untuk estimasi biaya proyek. Mencakup material, tenaga kerja, peralatan, overhead, dan contingency.',
    category: 'Proposal & Perencanaan',
    icon: 'Calculator',
    color: '#EF4444',
    format: 'xlsx',
    version: '3.0',
    lastUpdated: '2026-02-25',
    sections: [
      'Ringkasan Biaya',
      'Biaya Material / Bahan',
      'Biaya Tenaga Kerja',
      'Biaya Peralatan & Sewa',
      'Biaya Transportasi & Logistik',
      'Biaya Overhead',
      'Biaya Perizinan',
      'Contingency (10-15%)',
      'PPN & Pajak',
      'Total Estimasi',
      'Approval'
    ],
    tags: ['rab', 'budget', 'anggaran', 'keuangan'],
    downloadCount: 278
  },

  // --- Laporan & Monitoring ---
  {
    id: 'tpl-07',
    name: 'Laporan Progress Proyek (Weekly)',
    description: 'Template laporan mingguan proyek untuk update stakeholder. Mencakup progress, issues, risks, dan rencana minggu depan.',
    category: 'Laporan & Monitoring',
    icon: 'TrendingUp',
    color: '#06B6D4',
    format: 'docx',
    version: '2.2',
    lastUpdated: '2026-02-22',
    sections: [
      'Project Info & Status',
      'Executive Summary',
      'Progress vs Target (Gantt)',
      'Pencapaian Minggu Ini',
      'Issue & Kendala',
      'Risk Register Update',
      'Action Items',
      'Rencana Minggu Depan',
      'Budget Utilization',
      'Photo/Evidence',
      'Approval PM'
    ],
    tags: ['progress', 'weekly', 'report', 'monitoring'],
    downloadCount: 312
  },
  {
    id: 'tpl-08',
    name: 'Daily Activity Report',
    description: 'Laporan aktivitas harian di lapangan. Cocok untuk proyek konstruksi, manufaktur, atau operasional yang membutuhkan dokumentasi harian.',
    category: 'Laporan & Monitoring',
    icon: 'ClipboardList',
    color: '#84CC16',
    format: 'docx',
    version: '1.6',
    lastUpdated: '2026-02-12',
    sections: [
      'Tanggal & Lokasi',
      'Cuaca & Kondisi Lapangan',
      'Daftar Pekerja Hadir',
      'Aktivitas Utama',
      'Material yang Digunakan',
      'Peralatan yang Dipakai',
      'Kendala / Masalah',
      'Instruksi dari PM/Supervisor',
      'Foto Dokumentasi',
      'Tanda Tangan Pelapor'
    ],
    tags: ['daily', 'report', 'lapangan', 'aktivitas'],
    downloadCount: 189
  },
  {
    id: 'tpl-09',
    name: 'Project Closure Report',
    description: 'Dokumen penutupan proyek resmi. Mencakup deliverables handover, lessons learned, financial summary, dan sign-off.',
    category: 'Laporan & Monitoring',
    icon: 'CheckCircle',
    color: '#14B8A6',
    format: 'docx',
    version: '1.4',
    lastUpdated: '2026-01-28',
    sections: [
      'Project Summary',
      'Objectives Achievement',
      'Deliverables Checklist',
      'Financial Summary (Budget vs Actual)',
      'Timeline Summary (Plan vs Actual)',
      'Quality Assessment',
      'Lessons Learned',
      'Outstanding Issues',
      'Asset Handover',
      'Client Sign-off',
      'Team Acknowledgement'
    ],
    tags: ['closure', 'handover', 'selesai'],
    downloadCount: 98
  },

  // --- SDM & Ketenagakerjaan ---
  {
    id: 'tpl-10',
    name: 'Surat Perintah Kerja (SPK)',
    description: 'Surat penugasan resmi untuk karyawan atau subkontraktor ke proyek tertentu. Termasuk detail tugas, lokasi, dan durasi.',
    category: 'SDM & Ketenagakerjaan',
    icon: 'Send',
    color: '#F97316',
    format: 'docx',
    version: '1.7',
    lastUpdated: '2026-02-05',
    sections: [
      'Nomor SPK',
      'Data Pekerja/Subkon',
      'Proyek & Lokasi',
      'Uraian Pekerjaan',
      'Tanggal Mulai & Selesai',
      'Fasilitas yang Diberikan',
      'Ketentuan K3',
      'Pelaporan',
      'Tanda Tangan Pemberi & Penerima Tugas'
    ],
    tags: ['spk', 'penugasan', 'assignment'],
    downloadCount: 167
  },
  {
    id: 'tpl-11',
    name: 'Form Penilaian Kinerja Proyek',
    description: 'Template evaluasi kinerja pekerja proyek. Mencakup KPI, kompetensi teknis, teamwork, dan rekomendasi.',
    category: 'SDM & Ketenagakerjaan',
    icon: 'Star',
    color: '#A855F7',
    format: 'docx',
    version: '1.2',
    lastUpdated: '2026-02-08',
    sections: [
      'Data Karyawan & Proyek',
      'Periode Evaluasi',
      'KPI Achievement',
      'Kompetensi Teknis',
      'Kualitas Pekerjaan',
      'Kedisiplinan & Kehadiran',
      'Teamwork & Komunikasi',
      'Safety Compliance',
      'Overall Rating',
      'Rekomendasi (perpanjang/promosi/training)',
      'Tanda Tangan Evaluator & Karyawan'
    ],
    tags: ['kpi', 'evaluasi', 'kinerja', 'performance'],
    downloadCount: 134
  },
  {
    id: 'tpl-12',
    name: 'Timesheet & Absensi Proyek',
    description: 'Template pencatatan jam kerja dan absensi pekerja proyek. Format mingguan dengan kolom lembur dan approval.',
    category: 'SDM & Ketenagakerjaan',
    icon: 'Clock',
    color: '#0EA5E9',
    format: 'xlsx',
    version: '2.0',
    lastUpdated: '2026-02-24',
    sections: [
      'Data Pekerja',
      'Periode (Minggu ke-)',
      'Tabel Harian (Senin-Minggu)',
      'Jam Masuk & Keluar',
      'Total Jam Kerja Regular',
      'Total Jam Lembur',
      'Izin / Sakit / Alpa',
      'Ringkasan Minggu',
      'Approval Supervisor'
    ],
    tags: ['timesheet', 'absensi', 'jam kerja'],
    downloadCount: 245
  },

  // --- Keuangan & Invoice ---
  {
    id: 'tpl-13',
    name: 'Invoice Proyek',
    description: 'Template invoice/tagihan untuk klien berdasarkan milestone atau progress proyek. Termasuk termin pembayaran.',
    category: 'Keuangan & Invoice',
    icon: 'Receipt',
    color: '#059669',
    format: 'xlsx',
    version: '1.9',
    lastUpdated: '2026-02-16',
    sections: [
      'Header Perusahaan',
      'Data Klien',
      'Nomor Invoice & Tanggal',
      'Detail Pekerjaan / Milestone',
      'Volume & Satuan',
      'Harga Satuan & Total',
      'Potongan / Retensi',
      'PPN 11%',
      'Grand Total',
      'Rekening Pembayaran',
      'Terms & Due Date'
    ],
    tags: ['invoice', 'tagihan', 'billing'],
    downloadCount: 198
  },
  {
    id: 'tpl-14',
    name: 'Slip Gaji Pekerja Proyek',
    description: 'Template slip gaji khusus pekerja proyek/kontrak. Mencakup gaji pokok, lembur, tunjangan, potongan, dan net pay.',
    category: 'Keuangan & Invoice',
    icon: 'Wallet',
    color: '#16A34A',
    format: 'xlsx',
    version: '1.5',
    lastUpdated: '2026-02-14',
    sections: [
      'Data Pekerja & Proyek',
      'Periode Gaji',
      'Gaji Pokok / Rate Harian',
      'Jumlah Hari Kerja',
      'Upah Lembur',
      'Tunjangan (makan, transport, site)',
      'BPJS Ketenagakerjaan',
      'BPJS Kesehatan',
      'PPh 21',
      'Potongan Lainnya',
      'Total Take Home Pay'
    ],
    tags: ['slip gaji', 'payroll', 'gaji'],
    downloadCount: 176
  },

  // --- K3 & Keselamatan ---
  {
    id: 'tpl-15',
    name: 'Checklist K3 (Keselamatan Kerja)',
    description: 'Checklist keselamatan dan kesehatan kerja untuk inspeksi rutin di lokasi proyek. Wajib untuk proyek konstruksi & manufaktur.',
    category: 'K3 & Keselamatan',
    icon: 'ShieldCheck',
    color: '#DC2626',
    format: 'docx',
    version: '2.3',
    lastUpdated: '2026-02-19',
    sections: [
      'Data Proyek & Lokasi',
      'Tanggal Inspeksi',
      'APD (Alat Pelindung Diri)',
      'Kondisi Area Kerja',
      'Peralatan & Mesin',
      'Rambu-rambu & Signage',
      'P3K & Emergency Kit',
      'Prosedur Evakuasi',
      'Pelatihan K3 Terakhir',
      'Temuan & Tindak Lanjut',
      'Tanda Tangan Safety Officer'
    ],
    tags: ['k3', 'safety', 'checklist', 'inspeksi'],
    downloadCount: 223
  },
  {
    id: 'tpl-16',
    name: 'Laporan Insiden / Kecelakaan Kerja',
    description: 'Formulir pelaporan insiden atau kecelakaan kerja di lokasi proyek. Sesuai standar pelaporan BPJS Ketenagakerjaan.',
    category: 'K3 & Keselamatan',
    icon: 'AlertTriangle',
    color: '#B91C1C',
    format: 'docx',
    version: '1.1',
    lastUpdated: '2026-01-15',
    sections: [
      'Data Korban',
      'Waktu & Lokasi Kejadian',
      'Kronologi Kejadian',
      'Jenis Cedera / Kerugian',
      'Pertolongan Pertama',
      'Saksi Mata',
      'Analisis Penyebab (5 Why)',
      'Tindakan Korektif',
      'Tindakan Preventif',
      'Dokumentasi Foto',
      'Pelapor & Tanda Tangan'
    ],
    tags: ['insiden', 'kecelakaan', 'safety', 'report'],
    downloadCount: 54
  }
];

function getCategories() {
  const cats: Record<string, any[]> = {};
  TEMPLATES.forEach(t => {
    if (!cats[t.category]) cats[t.category] = [];
    cats[t.category].push(t);
  });
  return cats;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.query;

  try {
    if (req.method === 'GET') {
      switch (action) {
        case 'documents': {
          const { project_id, category } = req.query;
          let filtered = [...documents];
          if (project_id) filtered = filtered.filter(d => d.projectId === project_id);
          if (category) filtered = filtered.filter(d => d.category === category);
          return res.json({ success: true, data: filtered.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()) });
        }
        case 'templates': {
          const { category } = req.query;
          let filtered = [...TEMPLATES];
          if (category) filtered = filtered.filter(t => t.category === category);
          return res.json({ success: true, data: filtered, categories: getCategories() });
        }
        case 'template-detail': {
          const { id } = req.query;
          const tpl = TEMPLATES.find(t => t.id === id);
          if (!tpl) return res.status(404).json({ error: 'Template not found' });
          return res.json({ success: true, data: tpl });
        }
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'upload': {
          // Ensure upload directory exists
          if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          }

          const form = formidable({
            uploadDir: UPLOAD_DIR,
            keepExtensions: true,
            maxFileSize: 25 * 1024 * 1024, // 25MB
            filename: (_name, ext) => {
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
              return `doc-${uniqueSuffix}${ext}`;
            }
          });

          const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
              if (err) reject(err);
              resolve([fields, files]);
            });
          });

          const fileArray = Array.isArray(files.file) ? files.file : files.file ? [files.file] : [];
          const uploaded: any[] = [];

          for (const file of fileArray) {
            if (file) {
              const relativePath = `/uploads/project-documents/${path.basename(file.filepath)}`;
              const ext = path.extname(file.originalFilename || '').toLowerCase();
              const doc = {
                id: `doc-${docIdCounter++}`,
                projectId: Array.isArray(fields.projectId) ? fields.projectId[0] : (fields.projectId || null),
                name: Array.isArray(fields.name) ? fields.name[0] : (fields.name || file.originalFilename),
                description: Array.isArray(fields.description) ? fields.description[0] : (fields.description || ''),
                category: Array.isArray(fields.category) ? fields.category[0] : (fields.category || 'Umum'),
                originalFilename: file.originalFilename,
                filePath: relativePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                fileExtension: ext,
                uploadedBy: (session.user as any)?.name || 'Admin',
                uploadedAt: new Date().toISOString(),
                tags: Array.isArray(fields.tags) ? fields.tags[0] : (fields.tags || ''),
                version: '1.0',
                status: 'active'
              };
              documents.push(doc);
              uploaded.push(doc);
            }
          }

          return res.json({ success: true, data: uploaded, message: `${uploaded.length} file(s) uploaded` });
        }
        case 'download-template': {
          const { templateId } = req.body ? JSON.parse(await new Promise<string>((resolve) => {
            let body = '';
            req.on('data', (chunk) => body += chunk);
            req.on('end', () => resolve(body));
          })) : { templateId: null };

          const tpl = TEMPLATES.find(t => t.id === templateId);
          if (!tpl) return res.status(404).json({ error: 'Template not found' });

          // Increment download count
          (tpl as any).downloadCount = ((tpl as any).downloadCount || 0) + 1;

          return res.json({
            success: true,
            data: {
              ...tpl,
              downloadUrl: `/api/hq/hris/project-documents?action=generate-template&id=${tpl.id}`,
              message: 'Template ready for download'
            }
          });
        }
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const idx = documents.findIndex(d => d.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Document not found' });

      // Delete physical file
      const doc = documents[idx];
      const fullPath = path.join(process.cwd(), 'public', doc.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      documents.splice(idx, 1);
      return res.json({ success: true, message: 'Document deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Project Documents API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
