import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import id from 'date-fns/locale/id';

// Function to generate QR code data URL
const generateQRCode = (text: string): string => {
  // Simple simulation of QR code with canvas
  // In a real app, you would use a proper QR code library like qrcode.js
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Create a fake QR code appearance
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#000000';
    
    // Create QR code pattern
    const blockSize = 5;
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        // Random determination of black blocks to simulate QR code
        if (Math.random() > 0.6 || 
            // Always draw the corner squares for QR code appearance
            ((i < 3 && j < 3) || (i > 16 && j < 3) || (i < 3 && j > 16))) {
          ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
        }
      }
    }
    
    // Draw the text below (won't be scannable but looks like a QR code)
    ctx.font = '5px Arial';
    ctx.fillText(text.substring(0, 10), 25, 95, 75);
  }
  
  return canvas.toDataURL('image/png');
};

// Function to add watermark with improved aesthetics
const addWatermark = (doc: any) => {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Gunakan opacity yang lebih rendah untuk watermark yang lebih halus
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setTextColor(220, 50, 50); // Soft red
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    doc.text('FARMANESIA', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
  }
};

// Function to add QR code with improved design
const addQRCode = (doc: any, y: number, id: string) => {
  // Border untuk QR code
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(8, y - 17, 34, 34, 2, 2, 'D');
  
  const qrCodeDataUrl = generateQRCode(id);
  try {
    doc.addImage(qrCodeDataUrl, 'PNG', 10, y - 15, 30, 30);
    
    // Tambahkan ID sebagai text di bawah QR
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`ID: ${id}`, 25, y + 20, { align: 'center' });
  } catch (err) {
    console.error('Error adding QR code:', err);
    // Fallback if QR code fails
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(10, y - 15, 30, 30, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('QR Code', 25, y, { align: 'center' });
    doc.setFontSize(6);
    doc.text(id, 25, y + 5, { align: 'center' });
  }
};

// Interface untuk item surat jalan
interface DeliveryNoteItem {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  notes?: string;
  batch?: string;
}

// Interface untuk surat jalan
interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string;
  date: Date | string;
  receiptNumber?: string;
  purchaseOrderNumber?: string;
  supplierName: string;
  supplierAddress?: string;
  customerName: string;
  customerAddress: string;
  items: DeliveryNoteItem[];
  notes?: string;
  createdBy?: string;
  deliveredBy?: string;
  receivedBy?: string;
}

/**
 * Fungsi untuk membuat PDF surat jalan dengan skema warna merah-oranye
 * @param deliveryNote Data surat jalan
 * @returns Blob PDF yang siap diunduh
 */
export const generateDeliveryNotePDF = (deliveryNote: DeliveryNote): Blob => {
  // Inisialisasi PDF dengan ukuran A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add watermark to each page
  addWatermark(doc);

  // Warna dari tema red-orange sesuai standard FARMANESIA
  const primaryColor = '#ef4444'; // red-600
  const secondaryColor = '#f97316'; // orange-500
  const tertiaryColor = '#fee2e2'; // red-100
  const gradientColor = '#fb923c'; // orange-400

  // Header dengan logo dan judul - menggunakan desain gradient
  const grd = doc.context2d.createLinearGradient(10, 10, 200, 10);
  grd.addColorStop(0, primaryColor);
  grd.addColorStop(1, secondaryColor);
  doc.context2d.fillStyle = grd;
  doc.context2d.fillRect(10, 10, 190, 42);
  
  // Logo placeholder dengan desain yang lebih modern
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 15, 30, 30, 3, 3, 'F');
  doc.setTextColor(primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FARMANESIA', 30, 30, { align: 'center' });
  doc.setFontSize(8);
  doc.text('APOTEK', 30, 35, { align: 'center' });

  // Judul dokumen - dengan warna putih untuk kontras yang lebih baik pada background gradient
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT JALAN', 105, 25, { align: 'center' });

  // Nomor surat jalan
  doc.setFontSize(12);
  doc.text(`No. ${deliveryNote.deliveryNoteNumber}`, 105, 35, { align: 'center' });

  // Informasi perusahaan dengan layout yang lebih rapi
  doc.setFillColor(255, 255, 255, 0.8); // Semi-transparent white
  doc.roundedRect(140, 15, 58, 32, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50); // Dark gray for better readability
  doc.setFont('helvetica', 'normal');
  doc.text('PT FARMANESIA INDONESIA', 169, 20, { align: 'center' });
  doc.text('Jl. Kebahagiaan No. 123', 169, 25, { align: 'center' });
  doc.text('Jakarta Selatan, 12345', 169, 30, { align: 'center' });
  doc.text('Telp: (021) 1234-5678', 169, 35, { align: 'center' });
  doc.text('Email: admin@farmanesia.com', 169, 40, { align: 'center' });

  // Informasi pengiriman - dengan desain yang lebih clean
  doc.setFillColor(252, 252, 252); // Slightly off-white for softer look
  doc.setDrawColor(secondaryColor);
  doc.roundedRect(10, 55, 190, 45, 3, 3, 'FD');

  // Pengirim dengan desain ikon dan struktur yang lebih terorganisir
  doc.setFillColor(secondaryColor);
  doc.setDrawColor(secondaryColor);
  doc.roundedRect(15, 60, 6, 6, 1, 1, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('FROM', 18, 64, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PENGIRIM:', 25, 65);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(deliveryNote.supplierName, 15, 73);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (deliveryNote.supplierAddress) {
    const addressLines = doc.splitTextToSize(deliveryNote.supplierAddress, 80);
    addressLines.forEach((line: string, index: number) => {
      doc.text(line, 15, 78 + (index * 4));
    });
  }

  // Penerima dengan desain serupa
  doc.setFillColor(primaryColor);
  doc.setDrawColor(primaryColor);
  doc.roundedRect(110, 60, 6, 6, 1, 1, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('TO', 113, 64, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PENERIMA:', 120, 65);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text(deliveryNote.customerName, 110, 73);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (deliveryNote.customerAddress) {
    const addressLines = doc.splitTextToSize(deliveryNote.customerAddress, 80);
    addressLines.forEach((line: string, index: number) => {
      doc.text(line, 110, 78 + (index * 4));
    });
  }

  // Informasi tambahan dengan desain modern
  // Gunakan gradient lembut untuk background
  const refGrad = doc.context2d.createLinearGradient(10, 105, 200, 105);
  refGrad.addColorStop(0, '#fff1f2'); // Sangat soft red
  refGrad.addColorStop(1, '#fff7ed'); // Sangat soft orange
  doc.context2d.fillStyle = refGrad;
  doc.context2d.fillRect(10, 105, 190, 25);
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, 105, 190, 25, 3, 3, 'D');

  // Judul seksi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);
  doc.text('INFORMASI DOKUMEN', 16, 111);
  
  // Grid info dokumen dengan layout 3 kolom
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Tanggal:', 16, 117);
  doc.text('No. Pesanan:', 80, 117);
  doc.text('No. Penerimaan:', 145, 117);

  // Nilai dokumen referensi dengan style yang lebih jelas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const formattedDate = typeof deliveryNote.date === 'string' 
    ? deliveryNote.date 
    : format(deliveryNote.date, 'dd MMMM yyyy', { locale: id });
  doc.text(formattedDate, 16, 123);
  doc.text(deliveryNote.purchaseOrderNumber || '-', 80, 123);
  doc.text(deliveryNote.receiptNumber || '-', 145, 123);

  // Tabel item barang dengan desain yang ditingkatkan
  autoTable(doc, {
    startY: 135,
    head: [['No', 'Nama Barang', 'Batch', 'Jumlah', 'Satuan', 'Keterangan']],
    body: deliveryNote.items.map((item, index) => [
      (index + 1).toString(),
      item.productName,
      item.batch || '-',
      item.quantity.toString(),
      item.unit,
      item.notes || '-'
    ]),
    headStyles: {
      // Gunakan gradient jika memungkinkan
      fillColor: secondaryColor,
      textColor: '#ffffff',
      halign: 'center',
      valign: 'middle',
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252]
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220]
    },
    rowPageBreak: 'auto',
    bodyStyles: {
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
      1: { cellWidth: 65 },
      2: { cellWidth: 25, halign: 'center' },
      3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 20 },
      5: { cellWidth: 40 }
    },
    didDrawPage: function(data) {
      // Footer pada setiap halaman
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Surat Jalan No. ${deliveryNote.deliveryNoteNumber} - Halaman ${doc.getCurrentPageInfo().pageNumber}`, 
        105, 
        pageHeight - 10, 
        { align: 'center' }
      );
    }
  });

  // Mendapatkan posisi Y setelah tabel
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Catatan
  if (deliveryNote.notes) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(deliveryNote.notes, 180);
    notesLines.forEach((line: string, index: number) => {
      doc.text(line, 15, finalY + 6 + (index * 5));
    });
  }

  // Tanda tangan
  let signatureY = finalY + (deliveryNote.notes ? 25 : 10);
  
  // Box tanda tangan
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(primaryColor);
  doc.rect(10, signatureY, 190, 40, 'FD');

  // Tanda tangan dengan design modern
  signatureY = (doc as any).lastAutoTable.finalY + 20;

  // Background area tanda tangan
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(10, signatureY - 5, 190, 70, 3, 3, 'FD');
  
  // Header area tanda tangan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);
  doc.text('OTORISASI DOKUMEN', 16, signatureY + 5);
  
  // Line pembatas header
  doc.setDrawColor(220, 220, 220);
  doc.line(10, signatureY + 10, 200, signatureY + 10);

  // Area tanda tangan pengirim dengan box signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Pengirim', 55, signatureY + 20, { align: 'center' });
  
  // Box signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(25, signatureY + 25, 60, 25, 2, 2, 'D');
  doc.setLineDashPattern([0, 0], 0); // Reset dash pattern
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Tanda tangan & Nama Jelas', 55, signatureY + 42, { align: 'center' });
  
  // Tanggal pengirim
  doc.setDrawColor(0, 0, 0);
  doc.line(25, signatureY + 58, 85, signatureY + 58);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Tanggal', 55, signatureY + 63, { align: 'center' });

  // Area tanda tangan penerima
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Penerima', 145, signatureY + 20, { align: 'center' });
  
  // Box signature
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.roundedRect(115, signatureY + 25, 60, 25, 2, 2, 'D');
  doc.setLineDashPattern([0, 0], 0); // Reset dash pattern
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Tanda tangan & Nama Jelas', 145, signatureY + 42, { align: 'center' });
  
  // Tanggal penerima
  doc.setDrawColor(0, 0, 0);
  doc.line(115, signatureY + 58, 175, signatureY + 58);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Tanggal', 145, signatureY + 63, { align: 'center' });
  
  // Mengetahui
  doc.setFont('helvetica', 'bold');
  doc.text('Mengetahui:', 170, signatureY + 7, { align: 'center' });
  doc.line(145, signatureY + 30, 195, signatureY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(deliveryNote.createdBy || '(.............................)', 170, signatureY + 35, { align: 'center' });

  // Footer dengan design yang lebih profesional
  const pageCount = doc.getNumberOfPages();

  // Tambahkan footer ke semua halaman
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Background footer
    const footerY = pageHeight - 18;
    doc.setFillColor(248, 248, 248);
    doc.rect(0, footerY, pageWidth, 18, 'F');
    
    // Garis pembatas footer
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(10, footerY, pageWidth - 10, footerY);
    
    // QR code untuk verifikasi dokumen dengan caption
    if (i === pageCount) { // Tampilkan QR hanya di halaman terakhir
      addQRCode(doc, pageHeight - 40, deliveryNote.deliveryNoteNumber);
      
      // Caption QR Code
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text('Scan untuk verifikasi', 25, pageHeight - 15, { align: 'center' });
    }

    // Informasi halaman dengan styling yang lebih baik
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(`Halaman ${i} dari ${pageCount}`, 105, pageHeight - 10, { align: 'center' });

    // Logo kecil di footer
    doc.setFillColor(primaryColor);
    doc.circle(pageWidth - 30, pageHeight - 10, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('F', pageWidth - 30, pageHeight - 8, { align: 'center' });
    
    // Timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: id });
    doc.text(`Dicetak: ${timestamp}`, pageWidth - 45, pageHeight - 10, { align: 'right' });
  } // Konversi PDF ke Blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

/**
 * Fungsi untuk menghasilkan PDF surat jalan dari data penerimaan barang
 * @param receipt Data penerimaan barang dari backend
 * @returns Blob PDF surat jalan
 */
export const generateDeliveryNoteFromReceipt = (receipt: any): Blob => {
  // Mengonversi data penerimaan ke format surat jalan
  const deliveryNote: DeliveryNote = {
    id: receipt.id,
    deliveryNoteNumber: receipt.deliveryNoteNumber || `SJ-${Math.floor(Math.random() * 10000)}`,
    date: receipt.receiptDate || new Date(),
    receiptNumber: receipt.receiptNumber,
    purchaseOrderNumber: receipt.purchaseOrderNumber || '-',
    supplierName: receipt.supplierName,
    supplierAddress: receipt.supplierAddress || 'Alamat Supplier',
    customerName: 'PT FARMANESIA',
    customerAddress: 'Jl. Kebahagiaan No. 123, Jakarta Selatan, 12345',
    items: receipt.items.map((item: any) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.receivedQuantity || item.quantity,
      unit: item.unit || 'Pcs',
      notes: item.notes,
      batch: item.batchNumber
    })),
    notes: receipt.notes,
    createdBy: receipt.verifiedByName,
    deliveredBy: receipt.supplierRepresentative || '-',
    receivedBy: receipt.receivedByName
  };

  return generateDeliveryNotePDF(deliveryNote);
};

/**
 * Fungsi untuk menghasilkan PDF tanda terima dari data penerimaan barang
 * @param receipt Data penerimaan barang dari backend
 * @returns Blob PDF tanda terima
 */
export const generateReceiptAcknowledgement = (receipt: any): Blob => {
  // Inisialisasi PDF dengan ukuran A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Warna dari tema red-orange sesuai standard FARMANESIA
  const primaryColor = '#ef4444';
  const secondaryColor = '#f97316';

  // Header dengan logo dan judul
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(primaryColor);
  doc.rect(10, 10, 190, 40, 'FD');

  // Judul dokumen
  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('TANDA TERIMA BARANG', 105, 25, { align: 'center' });

  // Nomor penerimaan
  doc.setFontSize(12);
  doc.text(`No. ${receipt.receiptNumber}`, 105, 35, { align: 'center' });

  // Informasi perusahaan
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('PT FARMANESIA INDONESIA', 155, 20);
  doc.text('Jl. Kebahagiaan No. 123', 155, 25);
  doc.text('Jakarta Selatan, 12345', 155, 30);
  doc.text('Telp: (021) 1234-5678', 155, 35);

  // Detail penerimaan
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(secondaryColor);
  doc.rect(10, 55, 190, 40, 'FD');

  // Informasi penerimaan
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETAIL PENERIMAAN:', 15, 62);
  doc.setFont('helvetica', 'normal');

  // Data penerimaan
  const receiveDate = receipt.receiptDate ? new Date(receipt.receiptDate) : new Date();
  const formattedDate = format(receiveDate, 'dd MMMM yyyy', { locale: id });

  doc.text(`Tanggal Penerimaan: ${formattedDate}`, 15, 70);
  doc.text(`Supplier: ${receipt.supplierName || '-'}`, 15, 77);
  doc.text(`No. Surat Jalan: ${receipt.deliveryNoteNumber || '-'}`, 15, 84);
  doc.text(`No. Pesanan: ${receipt.purchaseOrderNumber || '-'}`, 105, 70);
  doc.text(`Penerima: ${receipt.receivedByName || '-'}`, 105, 77);
  doc.text(`Status: ${receipt.status || 'DITERIMA'}`, 105, 84);

  // Tabel item barang
  autoTable(doc, {
    startY: 100,
    head: [['No', 'Nama Barang', 'Jumlah Diterima', 'Satuan', 'Batch', 'Keterangan']],
    body: receipt.items.map((item: any, index: number) => [
      (index + 1).toString(),
      item.productName,
      item.receivedQuantity || item.quantity,
      item.unit || 'Pcs',
      item.batchNumber || '-',
      item.notes || '-'
    ]),
    headStyles: {
      fillColor: primaryColor,
      textColor: '#ffffff',
      halign: 'center',
      valign: 'middle',
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    rowPageBreak: 'auto',
    bodyStyles: {
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 60 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 15 },
      4: { cellWidth: 25 },
      5: { cellWidth: 45 }
    }
  });

  // Mendapatkan posisi Y setelah tabel
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Catatan
  if (receipt.notes) {
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(receipt.notes, 180);
    notesLines.forEach((line: string, index: number) => {
      doc.text(line, 15, finalY + 6 + (index * 5));
    });
  }

  // Tanda tangan
  const signatureY = finalY + (receipt.notes ? 25 : 10);
  
  // Box tanda tangan
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(primaryColor);
  doc.rect(10, signatureY, 190, 40, 'FD');

  // Teks tanda tangan
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  // Diserahkan oleh supplier
  doc.setFont('helvetica', 'bold');
  doc.text('Diserahkan Oleh:', 55, signatureY + 7, { align: 'center' });
  doc.line(25, signatureY + 30, 85, signatureY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text('(Supplier)', 55, signatureY + 35, { align: 'center' });
  
  // Diterima oleh
  doc.setFont('helvetica', 'bold');
  doc.text('Diterima Oleh:', 155, signatureY + 7, { align: 'center' });
  doc.line(125, signatureY + 30, 185, signatureY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.receivedByName || '(Penerima)', 155, signatureY + 35, { align: 'center' });

  // Stempel perusahaan
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Cap/Stempel Perusahaan', 105, signatureY + 20, { align: 'center' });
  
  // Draw a placeholder for company stamp
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([1, 1], 0);
  doc.ellipse(105, signatureY + 10, 15, 10);
  doc.setLineDashPattern([0, 0], 0);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Tanda Terima Barang - ${receipt.receiptNumber} - Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, 105, 287, { align: 'center' });

  // Konversi PDF ke Blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

export default generateDeliveryNoteFromReceipt;
