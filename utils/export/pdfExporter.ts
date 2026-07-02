import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { autoTable } from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ExaminationData } from '@/services/api/poliUmumService';

interface PDFExporterOptions {
  title?: string;
  subtitle?: string;
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  logo?: string; // Base64 encoded image
  includeTimestamp?: boolean;
  footerText?: string;
}

/**
 * Create a medical record PDF based on examination data
 * @param data The examination data to export
 * @param patient Patient details
 * @param options PDF export options
 * @returns Promise that resolves to the PDF blob
 */
// Stub exports to prevent import errors
export const generateDeliveryNoteFromReceipt = () => null;
export const generateReceiptAcknowledgement = () => null;

export const createMedicalRecordPDF = async (
  data: ExaminationData,
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
  options: PDFExporterOptions = {}
): Promise<Blob> => {
  // Create new PDF document
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Default options
  const {
    title = 'REKAM MEDIS ELEKTRONIK',
    subtitle = 'KLINIK POLI UMUM',
    filename = `rme_${patient.mrNumber}_${format(new Date(), 'yyyyMMdd')}`,
    includeTimestamp = true,
    footerText = 'FARMANESIA-EVO | Rekam Medis Elektronik'
  } = options;
  
  // Add logo if provided
  if (options.logo) {
    doc.addImage(options.logo, 'PNG', 10, 10, 30, 15);
  }
  
  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, options.logo ? 15 : 20, { align: 'center' });
  
  // Add subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 105, options.logo ? 22 : 27, { align: 'center' });
  
  // Add line
  doc.setDrawColor(200, 200, 200);
  doc.line(10, options.logo ? 30 : 35, 200, options.logo ? 30 : 35);
  
  // Add timestamp if needed
  if (includeTimestamp) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Dibuat pada: ${format(new Date(), 'PPPPp', { locale: id })}`,
      195,
      options.logo ? 25 : 30,
      { align: 'right' }
    );
  }
  
  // Add patient information
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI PASIEN', 10, options.logo ? 40 : 45);
  
  doc.setFont('helvetica', 'normal');
  const patientInfo = [
    ['Nama', `: ${patient.name}`],
    ['No. RM', `: ${patient.mrNumber}`],
    ['Tanggal Lahir / Usia', `: ${format(new Date(patient.dob), 'PPP', { locale: id })} / ${patient.age} tahun`],
    ['Jenis Kelamin', `: ${patient.gender}`],
    ['Alamat', `: ${patient.address}`],
    ['Asuransi', `: ${patient.insurance} (${patient.insuranceNumber})`],
  ];
  
  // First column (left side)
  patientInfo.slice(0, 3).forEach((item, index) => {
    doc.text(item[0], 10, options.logo ? 45 + (index * 5) : 50 + (index * 5));
    doc.text(item[1], 40, options.logo ? 45 + (index * 5) : 50 + (index * 5));
  });
  
  // Second column (right side)
  patientInfo.slice(3, 6).forEach((item, index) => {
    doc.text(item[0], 110, options.logo ? 45 + (index * 5) : 50 + (index * 5));
    doc.text(item[1], 140, options.logo ? 45 + (index * 5) : 50 + (index * 5));
  });
  
  // Add examination info
  const visitDate = data.ermData.createdAt ? format(new Date(data.ermData.createdAt), 'PPP', { locale: id }) : 'N/A';
  
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMASI KUNJUNGAN', 10, options.logo ? 65 : 70);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal Kunjungan: ${visitDate}`, 10, options.logo ? 70 : 75);
  doc.text(`Dokter: ${data.ermData.createdBy || 'N/A'}`, 110, options.logo ? 70 : 75);
  doc.text(`Status: ${
    data.ermData.status === 'draft' ? 'Draft' : 
    data.ermData.status === 'final' ? 'Final' : 'Diubah'
  }`, 10, options.logo ? 75 : 80);
  
  // Section 1: Anamnesis
  const startY = options.logo ? 85 : 90;
  doc.setFont('helvetica', 'bold');
  doc.text('ANAMNESIS', 10, startY);
  doc.setFont('helvetica', 'normal');
  
  let currentY = startY + 5;
  
  // Chief complaint
  doc.setFont('helvetica', 'bold');
  doc.text('Keluhan Utama:', 10, currentY);
  doc.setFont('helvetica', 'normal');
  
  // Handle multi-line text
  const splitChiefComplaint = doc.splitTextToSize(data.chiefComplaint || 'N/A', 180);
  doc.text(splitChiefComplaint, 10, currentY + 5);
  currentY += 5 + (splitChiefComplaint.length * 5);
  
  // Present illness history
  if (data.presentIllnessHistory) {
    doc.setFont('helvetica', 'bold');
    doc.text('Riwayat Penyakit Sekarang:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    
    const splitPresentIllness = doc.splitTextToSize(data.presentIllnessHistory, 180);
    doc.text(splitPresentIllness, 10, currentY + 10);
    currentY += 10 + (splitPresentIllness.length * 5);
  }
  
  // Past medical history
  if (data.pastMedicalHistory) {
    doc.setFont('helvetica', 'bold');
    doc.text('Riwayat Penyakit Dahulu:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    
    const splitPastMedical = doc.splitTextToSize(data.pastMedicalHistory, 180);
    doc.text(splitPastMedical, 10, currentY + 10);
    currentY += 10 + (splitPastMedical.length * 5);
  }
  
  // Allergies
  if (data.allergies && data.allergies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Alergi:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    
    const allergiesText = data.allergies.join(', ');
    const splitAllergies = doc.splitTextToSize(allergiesText, 180);
    doc.text(splitAllergies, 10, currentY + 10);
    currentY += 10 + (splitAllergies.length * 5);
    
    if (data.allergyDetails) {
      const splitAllergyDetails = doc.splitTextToSize(data.allergyDetails, 180);
      doc.text(splitAllergyDetails, 10, currentY + 5);
      currentY += 5 + (splitAllergyDetails.length * 5);
    }
  }
  
  // Family history
  if (data.familyHistory) {
    doc.setFont('helvetica', 'bold');
    doc.text('Riwayat Penyakit Keluarga:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    
    const splitFamilyHistory = doc.splitTextToSize(data.familyHistory, 180);
    doc.text(splitFamilyHistory, 10, currentY + 10);
    currentY += 10 + (splitFamilyHistory.length * 5);
  }
  
  // Check if we need to add a new page
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }
  
  // Section 2: Physical Examination
  doc.setFont('helvetica', 'bold');
  doc.text('PEMERIKSAAN FISIK', 10, currentY + 10);
  doc.setFont('helvetica', 'normal');
  currentY += 15;
  
  // Create a table for vital signs
  const vitalSigns = [
    ['Tekanan Darah', `${data.bloodPressureSystolic || '-'}/${data.bloodPressureDiastolic || '-'} mmHg`],
    ['Suhu', `${data.temperature || '-'} °C`],
    ['Nadi', `${data.heartRate || '-'} bpm`],
    ['Berat Badan', `${data.weight || '-'} kg`],
    ['Tinggi Badan', `${data.height || '-'} cm`],
    ['BMI', data.bmi || '-']
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [['Parameter', 'Nilai']],
    body: vitalSigns,
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
    styles: { fontSize: 9 },
    margin: { left: 10, right: 10 }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Physical exam notes
  if (data.physicalExamNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan Pemeriksaan Fisik:', 10, currentY);
    doc.setFont('helvetica', 'normal');
    
    const splitPhysicalNotes = doc.splitTextToSize(data.physicalExamNotes, 180);
    doc.text(splitPhysicalNotes, 10, currentY + 5);
    currentY += 5 + (splitPhysicalNotes.length * 5);
  }
  
  // Check if we need to add a new page
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }
  
  // Section 3: Diagnosis
  doc.setFont('helvetica', 'bold');
  doc.text('DIAGNOSIS', 10, currentY + 10);
  doc.setFont('helvetica', 'normal');
  currentY += 15;
  
  if (data.diagnoses && data.diagnoses.length > 0) {
    const diagnosisData = data.diagnoses.map(diagnosis => [
      diagnosis.type === 'primary' ? 'Primer' : 'Sekunder',
      diagnosis.code,
      diagnosis.description,
      diagnosis.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Tipe', 'Kode ICD-10', 'Deskripsi', 'Catatan']],
      body: diagnosisData,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
      margin: { left: 10, right: 10 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.text('Tidak ada diagnosis yang tercatat', 10, currentY);
    currentY += 10;
  }
  
  // Check if we need to add a new page
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  
  // Section 4: Procedures
  doc.setFont('helvetica', 'bold');
  doc.text('TINDAKAN MEDIS', 10, currentY + 10);
  doc.setFont('helvetica', 'normal');
  currentY += 15;
  
  // Standard procedures
  if (data.procedures.selected && data.procedures.selected.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Prosedur Standar:', 10, currentY);
    doc.setFont('helvetica', 'normal');
    
    const proceduresText = data.procedures.selected.join(', ');
    const splitProcedures = doc.splitTextToSize(proceduresText, 180);
    doc.text(splitProcedures, 10, currentY + 5);
    currentY += 5 + (splitProcedures.length * 5);
  }
  
  // Custom procedures
  if (data.procedures.custom && data.procedures.custom.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Prosedur Khusus:', 10, currentY + 5);
    currentY += 10;
    
    const customProcedureData = data.procedures.custom.map(procedure => [
      procedure.name,
      procedure.description,
      procedure.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Nama Prosedur', 'Deskripsi', 'Catatan']],
      body: customProcedureData,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
      margin: { left: 10, right: 10 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Procedure notes
  if (data.procedures.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan Prosedur:', 10, currentY);
    doc.setFont('helvetica', 'normal');
    
    const splitProcedureNotes = doc.splitTextToSize(data.procedures.notes, 180);
    doc.text(splitProcedureNotes, 10, currentY + 5);
    currentY += 5 + (splitProcedureNotes.length * 5);
  }
  
  // Check if we need to add a new page
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  
  // Section 5: Medications
  doc.setFont('helvetica', 'bold');
  doc.text('RESEP OBAT', 10, currentY + 10);
  doc.setFont('helvetica', 'normal');
  currentY += 15;
  
  if (data.medications && data.medications.length > 0) {
    const medicationData = data.medications.map(medication => [
      medication.name,
      medication.dose || '-',
      medication.route,
      medication.frequency,
      medication.quantity.toString(),
      medication.instructions || '-'
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Nama Obat', 'Dosis', 'Rute', 'Frekuensi', 'Jumlah', 'Instruksi']],
      body: medicationData,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
      margin: { left: 10, right: 10 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.text('Tidak ada resep obat yang diberikan', 10, currentY);
    currentY += 10;
  }
  
  // Check if we need to add a new page
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }
  
  // Section 6: Follow Up
  doc.setFont('helvetica', 'bold');
  doc.text('TINDAK LANJUT', 10, currentY + 10);
  doc.setFont('helvetica', 'normal');
  currentY += 15;
  
  // Follow-up type
  const followUpType = 
    data.followUp.type === 'discharge' ? 'Pasien Pulang' : 
    data.followUp.type === 'referral' ? 'Rujuk ke Spesialis' : 'Kontrol Kembali';
  
  doc.text(`Tipe: ${followUpType}`, 10, currentY);
  currentY += 5;
  
  // Details based on type
  if (data.followUp.type === 'discharge') {
    if (data.followUp.dischargeInstructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Instruksi untuk Pasien:', 10, currentY + 5);
      doc.setFont('helvetica', 'normal');
      
      const splitInstructions = doc.splitTextToSize(data.followUp.dischargeInstructions, 180);
      doc.text(splitInstructions, 10, currentY + 10);
      currentY += 10 + (splitInstructions.length * 5);
    }
  } else if (data.followUp.type === 'referral') {
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Rujukan:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    currentY += 10;
    
    const referralData = [
      ['Poliklinik Spesialis', data.followUp.specialist || '-'],
      ['Tanggal Rujukan', data.followUp.referralDate ? format(new Date(data.followUp.referralDate), 'PPP', { locale: id }) : '-'],
      ['Alasan Rujukan', data.followUp.referralReason || '-'],
      ['Catatan untuk Spesialis', data.followUp.referralNotes || '-']
    ];
    
    autoTable(doc, {
      startY: currentY,
      body: referralData,
      theme: 'grid',
      styles: { fontSize: 9 },
      margin: { left: 10, right: 10 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  } else if (data.followUp.type === 'followup') {
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Kontrol Kembali:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    currentY += 10;
    
    const followupData = [
      ['Tanggal Kontrol', data.followUp.followUpDate ? format(new Date(data.followUp.followUpDate), 'PPP', { locale: id }) : '-'],
      ['Durasi', `${data.followUp.followUpDuration || '-'} hari`],
      ['Tujuan Kontrol', data.followUp.followUpReason || '-']
    ];
    
    autoTable(doc, {
      startY: currentY,
      body: followupData,
      theme: 'grid',
      styles: { fontSize: 9 },
      margin: { left: 10, right: 10 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Final notes
  if (data.followUp.finalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan Penutup:', 10, currentY + 5);
    doc.setFont('helvetica', 'normal');
    
    const splitFinalNotes = doc.splitTextToSize(data.followUp.finalNotes, 180);
    doc.text(splitFinalNotes, 10, currentY + 10);
    currentY += 10 + (splitFinalNotes.length * 5);
  }
  
  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(footerText, 105, 287, { align: 'center' });
    doc.text(`Halaman ${i} dari ${pageCount}`, 195, 287, { align: 'right' });
  }
  
  // Return the blob
  return doc.output('blob');
};

/**
 * Download a PDF file
 * @param blob PDF blob data
 * @param filename Name of the file to save
 */
export const downloadPDF = (blob: Blob, filename: string): void => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default {
  createMedicalRecordPDF,
  downloadPDF
};
