import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ExpiryItem } from '@/pages/inventory/expiry';

/**
 * Creates a styled PDF document with proper layout for expiry data
 * @param data Data to export
 * @param fileName Filename without extension
 */
export const exportToPDF = (data: ExpiryItem[], fileName: string = 'expiry-data') => {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add header with logo and title
  // Set font size and color
  doc.setFontSize(22);
  doc.setTextColor(230, 126, 34); // Orange color in RGB
  doc.text('FARMANESIA', 14, 20);
  
  doc.setFontSize(18);
  doc.setTextColor(243, 156, 18); // Amber color in RGB
  doc.text('Laporan Produk Kadaluarsa', 14, 30);
  
  // Add date information
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray
  const today = new Date();
  doc.text(`Tanggal: ${today.toLocaleDateString('id-ID')}`, 14, 38);
  doc.text(`Waktu: ${today.toLocaleTimeString('id-ID')}`, 14, 43);
  
  // Add a decorative line
  doc.setDrawColor(230, 126, 34); // Orange
  doc.setLineWidth(0.5);
  doc.line(14, 45, 280, 45);
  
  // Create table headers and formatting
  const headers = [
    { header: 'Kode', dataKey: 'sku' },
    { header: 'Nama Produk', dataKey: 'productName' },
    { header: 'Kategori', dataKey: 'category' },
    { header: 'Batch', dataKey: 'batchNumber' },
    { header: 'Jumlah', dataKey: 'quantity' },
    { header: 'Tanggal Kadaluarsa', dataKey: 'expiryDate' },
    { header: 'Sisa Hari', dataKey: 'daysRemaining' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Lokasi', dataKey: 'location' },
    { header: 'Nilai Total', dataKey: 'totalValue' }
  ];
  
  // Format data for the table
  const tableData = data.map(item => {
    // Calculate days remaining
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine status
    let status = "Valid";
    if (daysRemaining <= 0) {
      status = "Kadaluarsa";
    } else if (daysRemaining <= 30) {
      status = "Kritis";
    } else if (daysRemaining <= 90) {
      status = "Perhatian";
    }
    
    return {
      sku: item.sku,
      productName: item.productName,
      category: item.category,
      batchNumber: item.batchNumber,
      quantity: item.quantity.toString(),
      expiryDate: new Date(item.expiryDate).toLocaleDateString('id-ID'),
      daysRemaining: daysRemaining.toString(),
      status: status,
      location: item.location,
      totalValue: (item.costPrice * item.quantity).toLocaleString('id-ID')
    };
  });
  
  // Add the table to the PDF with styling
  (doc as any).autoTable({
    startY: 50,
    head: [headers.map(column => column.header)],
    body: tableData.map(item => 
      headers.map(column => item[column.dataKey as keyof typeof item])
    ),
    theme: 'grid',
    headStyles: {
      fillColor: [230, 126, 34], // Orange
      textColor: [255, 255, 255], // White
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 20 }, // SKU
      1: { cellWidth: 40 }, // Product Name
      2: { cellWidth: 25 }, // Category
      3: { cellWidth: 20 }, // Batch
      4: { cellWidth: 15 }, // Quantity
      5: { cellWidth: 25 }, // Expiry Date
      6: { cellWidth: 15 }, // Days Remaining
      7: { cellWidth: 20 }, // Status
      8: { cellWidth: 25 }, // Location
      9: { cellWidth: 25 }, // Total Value
    },
    alternateRowStyles: {
      fillColor: [252, 248, 227] // Light amber background for alternate rows
    },
    bodyStyles: {
      fontSize: 9
    },
    didDrawCell: (data: any) => {
      // Apply conditional formatting to the status column
      if (data.section === 'body' && data.column.index === 7) {
        const status = data.cell.raw;
        if (status === 'Kadaluarsa') {
          doc.setFillColor(231, 76, 60); // Red
          doc.setTextColor(255, 255, 255); // White
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { 
            align: 'center',
            baseline: 'middle'
          });
          return false; // Prevent automatic drawing of text
        } else if (status === 'Kritis') {
          doc.setFillColor(243, 156, 18); // Amber
          doc.setTextColor(255, 255, 255); // White
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { 
            align: 'center',
            baseline: 'middle'
          });
          return false; // Prevent automatic drawing of text
        } else if (status === 'Perhatian') {
          doc.setFillColor(241, 196, 15); // Yellow
          doc.setTextColor(0, 0, 0); // Black
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          doc.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { 
            align: 'center',
            baseline: 'middle'
          });
          return false; // Prevent automatic drawing of text
        }
      }
    }
  });
  
  // Get the final y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  
  // Add a summary section
  doc.setFontSize(12);
  doc.setTextColor(230, 126, 34); // Orange
  doc.text('Ringkasan:', 14, finalY + 15);
  
  // Count items by status
  const expiredCount = tableData.filter(item => item.status === 'Kadaluarsa').length;
  const criticalCount = tableData.filter(item => item.status === 'Kritis').length;
  const warningCount = tableData.filter(item => item.status === 'Perhatian').length;
  const validCount = tableData.filter(item => item.status === 'Valid').length;
  
  // Add summary information
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray
  doc.text(`Total Produk: ${tableData.length}`, 14, finalY + 23);
  doc.text(`Produk Kadaluarsa: ${expiredCount}`, 14, finalY + 29);
  doc.text(`Produk Kritis (<30 hari): ${criticalCount}`, 14, finalY + 35);
  doc.text(`Produk Perhatian (<90 hari): ${warningCount}`, 14, finalY + 41);
  doc.text(`Produk Valid: ${validCount}`, 14, finalY + 47);
  
  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150); // Light gray
    doc.text(
      `Halaman ${i} dari ${pageCount} - FARMANESIA © ${new Date().getFullYear()}`, 
      doc.internal.pageSize.getWidth() / 2, 
      doc.internal.pageSize.getHeight() - 10, 
      { align: 'center' }
    );
  }
  
  // Save the PDF
  doc.save(`${fileName}.pdf`);
  
  return true;
};
