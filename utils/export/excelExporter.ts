import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ExaminationData } from '@/services/api/poliUmumService';

interface ExcelExporterOptions {
  title?: string;
  subtitle?: string;
  filename?: string;
  sheetName?: string;
  includeTimestamp?: boolean;
}

/**
 * Create an Excel file with patient history
 * @param examinations Array of examination data
 * @param patient Patient information
 * @param options Export options
 * @returns Blob containing the Excel file
 */
export const createPatientHistoryExcel = (
  examinations: ExaminationData[],
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    mrNumber: string;
    dob: string;
    address: string;
    phone: string;
    insurance: string;
    insuranceNumber: string;
  },
  options: ExcelExporterOptions = {}
): Blob => {
  // Default options
  const {
    title = 'Riwayat Kunjungan Pasien',
    subtitle = 'KLINIK POLI UMUM',
    filename = `riwayat_${patient.mrNumber}_${format(new Date(), 'yyyyMMdd')}`,
    sheetName = 'Riwayat Kunjungan',
    includeTimestamp = true,
  } = options;

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);

  // Add title and metadata
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [[subtitle]], { origin: 'A2' });
  
  if (includeTimestamp) {
    XLSX.utils.sheet_add_aoa(ws, [[`Dibuat pada: ${format(new Date(), 'PPPPp', { locale: id })}`]], { origin: 'A3' });
  }

  // Add patient information
  XLSX.utils.sheet_add_aoa(ws, [['INFORMASI PASIEN']], { origin: 'A5' });
  XLSX.utils.sheet_add_aoa(ws, [
    ['Nama', patient.name],
    ['No. RM', patient.mrNumber],
    ['Tanggal Lahir', format(new Date(patient.dob), 'PPP', { locale: id })],
    ['Usia', `${patient.age} tahun`],
    ['Jenis Kelamin', patient.gender],
    ['Alamat', patient.address],
    ['Asuransi', `${patient.insurance} (${patient.insuranceNumber})`],
  ], { origin: 'A6' });

  // Set column widths for patient info
  ws['!cols'] = [
    { wch: 15 }, // Column A width
    { wch: 40 }, // Column B width
  ];

  // Add visit history header
  XLSX.utils.sheet_add_aoa(ws, [['RIWAYAT KUNJUNGAN']], { origin: 'A14' });
  
  // Create headers for visit history table
  const visitHistoryHeaders = [
    'No.',
    'Tanggal',
    'Dokter',
    'Keluhan Utama',
    'Diagnosis Utama',
    'Kode ICD-10',
    'Diagnosis Sekunder',
    'Tindakan',
    'Obat',
    'Tindak Lanjut',
    'Status'
  ];
  
  XLSX.utils.sheet_add_aoa(ws, [visitHistoryHeaders], { origin: 'A16' });
  
  // Create rows for visit history
  const visitHistoryRows = examinations.map((exam, index) => {
    // Get primary and secondary diagnoses
    const primaryDiagnosis = exam.diagnoses.find(d => d.type === 'primary');
    const secondaryDiagnoses = exam.diagnoses
      .filter(d => d.type === 'secondary')
      .map(d => `${d.code} - ${d.description}`)
      .join(', ');
    
    // Format medications
    const medications = exam.medications
      .map(med => `${med.name} ${med.dose || ''} (${med.frequency})`)
      .join(', ');
    
    // Format procedures
    const procedures = [
      ...exam.procedures.selected,
      ...exam.procedures.custom.map(p => p.name)
    ].join(', ');
    
    // Format follow-up
    let followUp = '';
    if (exam.followUp.type === 'discharge') {
      followUp = 'Pasien Pulang';
    } else if (exam.followUp.type === 'referral') {
      followUp = `Rujuk ke ${exam.followUp.specialist || 'Spesialis'}`;
    } else if (exam.followUp.type === 'followup') {
      followUp = `Kontrol ${exam.followUp.followUpDuration || ''} hari`;
    }
    
    // Create row
    return [
      index + 1,
      exam.ermData.createdAt ? format(new Date(exam.ermData.createdAt), 'PPP', { locale: id }) : 'N/A',
      exam.ermData.createdBy || 'N/A',
      exam.chiefComplaint,
      primaryDiagnosis ? primaryDiagnosis.description : 'N/A',
      primaryDiagnosis ? primaryDiagnosis.code : 'N/A',
      secondaryDiagnoses || 'N/A',
      procedures || 'N/A',
      medications || 'N/A',
      followUp,
      exam.ermData.status === 'draft' ? 'Draft' : 
      exam.ermData.status === 'final' ? 'Final' : 'Diubah'
    ];
  });
  
  // Add visit history rows
  XLSX.utils.sheet_add_aoa(ws, visitHistoryRows, { origin: 'A17' });
  
  // Set column widths for visit history table
  ws['!cols'] = [
    { wch: 5 },  // No.
    { wch: 15 }, // Tanggal
    { wch: 20 }, // Dokter
    { wch: 30 }, // Keluhan Utama
    { wch: 30 }, // Diagnosis Utama
    { wch: 10 }, // Kode ICD-10
    { wch: 30 }, // Diagnosis Sekunder
    { wch: 30 }, // Tindakan
    { wch: 40 }, // Obat
    { wch: 20 }, // Tindak Lanjut
    { wch: 10 }  // Status
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert buffer to Blob
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  return blob;
};

/**
 * Create an Excel file with queue statistics
 * @param queueData Queue data for statistics
 * @param dateRange Date range for the report
 * @param options Export options
 * @returns Blob containing the Excel file
 */
export const createQueueStatisticsExcel = (
  queueData: {
    date: string;
    totalPatients: number;
    waitingTime: number;
    examinationTime: number;
    completedPatients: number;
    cancelledPatients: number;
    diagnosisCounts: { code: string; description: string; count: number }[];
  }[],
  dateRange: { from: string; to: string },
  options: ExcelExporterOptions = {}
): Blob => {
  // Default options
  const {
    title = 'Laporan Statistik Antrian',
    subtitle = 'KLINIK POLI UMUM',
    filename = `statistik_antrian_${format(new Date(), 'yyyyMMdd')}`,
    sheetName = 'Statistik Antrian',
    includeTimestamp = true,
  } = options;

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);

  // Add title and metadata
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [[subtitle]], { origin: 'A2' });
  XLSX.utils.sheet_add_aoa(ws, [[`Periode: ${format(new Date(dateRange.from), 'PPP', { locale: id })} s/d ${format(new Date(dateRange.to), 'PPP', { locale: id })}`]], { origin: 'A3' });
  
  if (includeTimestamp) {
    XLSX.utils.sheet_add_aoa(ws, [[`Dibuat pada: ${format(new Date(), 'PPPPp', { locale: id })}`]], { origin: 'A4' });
  }

  // Add queue statistics header
  XLSX.utils.sheet_add_aoa(ws, [['STATISTIK HARIAN']], { origin: 'A6' });
  
  // Create headers for statistics table
  const statisticsHeaders = [
    'Tanggal',
    'Total Pasien',
    'Waktu Tunggu Rata-rata (menit)',
    'Waktu Pemeriksaan Rata-rata (menit)',
    'Pasien Selesai',
    'Pasien Batal',
  ];
  
  XLSX.utils.sheet_add_aoa(ws, [statisticsHeaders], { origin: 'A8' });
  
  // Create rows for statistics
  const statisticsRows = queueData.map(data => [
    format(new Date(data.date), 'PPP', { locale: id }),
    data.totalPatients,
    data.waitingTime.toFixed(1),
    data.examinationTime.toFixed(1),
    data.completedPatients,
    data.cancelledPatients
  ]);
  
  // Add statistics rows
  XLSX.utils.sheet_add_aoa(ws, statisticsRows, { origin: 'A9' });
  
  // Set column widths for statistics table
  ws['!cols'] = [
    { wch: 15 }, // Tanggal
    { wch: 12 }, // Total Pasien
    { wch: 25 }, // Waktu Tunggu Rata-rata
    { wch: 25 }, // Waktu Pemeriksaan Rata-rata
    { wch: 15 }, // Pasien Selesai
    { wch: 15 }, // Pasien Batal
  ];
  
  // Add diagnosis statistics section
  const startRow = 9 + queueData.length + 2;
  XLSX.utils.sheet_add_aoa(ws, [['TOP 10 DIAGNOSIS']], { origin: `A${startRow}` });
  
  // Create headers for diagnosis table
  const diagnosisHeaders = [
    'Kode ICD-10',
    'Deskripsi',
    'Jumlah',
    'Persentase'
  ];
  
  XLSX.utils.sheet_add_aoa(ws, [diagnosisHeaders], { origin: `A${startRow + 2}` });
  
  // Collect all diagnoses from all days
  const allDiagnoses = queueData.flatMap(data => data.diagnosisCounts);
  
  // Group and sum diagnoses by code
  const diagnosisMap = new Map();
  allDiagnoses.forEach(diag => {
    if (diagnosisMap.has(diag.code)) {
      diagnosisMap.set(diag.code, {
        ...diag,
        count: diagnosisMap.get(diag.code).count + diag.count
      });
    } else {
      diagnosisMap.set(diag.code, diag);
    }
  });
  
  // Sort diagnoses by count (descending) and take top 10
  const topDiagnoses = Array.from(diagnosisMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Calculate total diagnoses
  const totalDiagnoses = topDiagnoses.reduce((sum, diag) => sum + diag.count, 0);
  
  // Create rows for diagnosis table
  const diagnosisRows = topDiagnoses.map(diag => [
    diag.code,
    diag.description,
    diag.count,
    `${((diag.count / totalDiagnoses) * 100).toFixed(1)}%`
  ]);
  
  // Add diagnosis rows
  XLSX.utils.sheet_add_aoa(ws, diagnosisRows, { origin: `A${startRow + 3}` });
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert buffer to Blob
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  return blob;
};

/**
 * Download an Excel file
 * @param blob Excel blob data
 * @param filename Name of the file to save
 */
export const downloadExcel = (blob: Blob, filename: string): void => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default {
  createPatientHistoryExcel,
  createQueueStatisticsExcel,
  downloadExcel
};
