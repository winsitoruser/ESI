import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PharmacyInfo, BranchInfo } from '@/pages/api/finance/ledger';

// Format currency to Indonesian Rupiah
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date to DD MMM YYYY
export const formatDate = (dateStr: string | Date): string => {
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

// Export data to Excel
export interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
  pharmacyInfo?: PharmacyInfo;
  branchInfo?: BranchInfo;
  title?: string;
  dateRange?: string;
}

export const exportToExcel = (
  data: any[], 
  fileName: string, 
  sheetName: string = 'Sheet1', 
  options?: { pharmacyInfo?: PharmacyInfo; branchInfo?: BranchInfo; title?: string; dateRange?: string }
): void => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add header rows if pharmacy info is provided
    if (options?.pharmacyInfo || options?.branchInfo) {
      // We need to shift the data down to make room for headers
      const headerRows = [];
      
      if (options.pharmacyInfo) {
        headerRows.push([options.pharmacyInfo.name]);
        headerRows.push([options.pharmacyInfo.address]);
        headerRows.push([`Telp: ${options.pharmacyInfo.phone} | Email: ${options.pharmacyInfo.email}`]);
        headerRows.push(['']);
      }
      
      if (options.branchInfo) {
        headerRows.push([`Cabang: ${options.branchInfo.name}`]);
        if (options.branchInfo.address) headerRows.push([`Alamat: ${options.branchInfo.address}`]);
        if (options.branchInfo.phone) headerRows.push([`Telp: ${options.branchInfo.phone}`]);
        if (options.branchInfo.manager) headerRows.push([`Manager: ${options.branchInfo.manager}`]);
        headerRows.push(['']);
      }
      
      if (options.title) {
        headerRows.push([options.title]);
        if (options.dateRange) headerRows.push([options.dateRange]);
        headerRows.push(['']);
        headerRows.push([`Dicetak pada: ${formatDate(new Date())}`]);
        headerRows.push(['']);
      }
      
      // Create a new worksheet with headers
      const wsWithHeaders = XLSX.utils.aoa_to_sheet(headerRows);
      
      // Add the data starting after the headers
      XLSX.utils.sheet_add_json(wsWithHeaders, data, { 
        origin: { r: headerRows.length, c: 0 }, 
        skipHeader: false 
      });
      
      // Apply some basic formatting
      const range = XLSX.utils.decode_range(wsWithHeaders['!ref'] || 'A1');
      if (options.pharmacyInfo) {
        wsWithHeaders['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Merge cells for pharmacy name
          { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Merge cells for address
          { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } } // Merge cells for contact info
        ];
      }
      
      XLSX.utils.book_append_sheet(workbook, wsWithHeaders, sheetName);
    } else {
      // Just add the data without headers
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    // Write file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

// Export data to CSV
export const exportToCSV = (
  data: any[], 
  fileName: string, 
  options?: { pharmacyInfo?: PharmacyInfo; branchInfo?: BranchInfo; title?: string; dateRange?: string }
): void => {
  try {
    let csvContent = '';
    
    // Add header info if provided
    if (options?.pharmacyInfo) {
      csvContent += `${options.pharmacyInfo.name}\n`;
      csvContent += `${options.pharmacyInfo.address}\n`;
      csvContent += `Telp: ${options.pharmacyInfo.phone} | Email: ${options.pharmacyInfo.email}\n\n`;
    }
    
    if (options?.branchInfo) {
      csvContent += `Cabang: ${options.branchInfo.name}\n`;
      if (options.branchInfo.address) csvContent += `Alamat: ${options.branchInfo.address}\n`;
      if (options.branchInfo.phone) csvContent += `Telp: ${options.branchInfo.phone}\n`;
      if (options.branchInfo.manager) csvContent += `Manager: ${options.branchInfo.manager}\n\n`;
    }
    
    if (options?.title) {
      csvContent += `${options.title}\n`;
      if (options.dateRange) csvContent += `${options.dateRange}\n`;
      csvContent += `Dicetak pada: ${formatDate(new Date())}\n\n`;
    }
    
    // Convert data to CSV
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    
    // Combine header with data
    csvContent += csvData;
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

// Export data to PDF
interface PDFExportOptions {
  title?: string;
  fileName: string;
  columns: string[];
  columnLabels?: string[];
  orientation?: 'portrait' | 'landscape';
  pharmacyInfo?: PharmacyInfo;
  branchInfo?: BranchInfo;
  subtitle?: string;
}

export const exportToPDF = (data: any[], options: PDFExportOptions): void => {
  try {
    const { title, fileName, columns, columnLabels, orientation = 'portrait', pharmacyInfo, branchInfo, subtitle } = options;
    const doc = new jsPDF({ orientation });
    const pageWidth = doc.internal.pageSize.width;
    
    let startY = 14;
    
    // Add pharmacy letterhead if provided
    if (pharmacyInfo) {
      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(pharmacyInfo.name, pageWidth / 2, startY, { align: 'center' });
      startY += 7;
      
      // Address
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(pharmacyInfo.address, pageWidth / 2, startY, { align: 'center' });
      startY += 5;
      
      // Contact Info
      const contactInfo = `Telp: ${pharmacyInfo.phone} | Email: ${pharmacyInfo.email} | NPWP: ${pharmacyInfo.taxId}`;
      doc.text(contactInfo, pageWidth / 2, startY, { align: 'center' });
      startY += 7;
      
      // Separating line
      doc.setDrawColor(220, 53, 69); // Set line color to red
      doc.setLineWidth(0.7);
      doc.line(14, startY, pageWidth - 14, startY);
      startY += 7;
    }
    
    // Add branch information if provided
    if (branchInfo) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Cabang: ${branchInfo.name}`, 14, startY);
      startY += 6;
      
      if (branchInfo.address) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Alamat: ${branchInfo.address}`, 14, startY);
        startY += 5;
      }
      
      if (branchInfo.phone) {
        doc.setFontSize(9);
        doc.text(`Telp: ${branchInfo.phone}`, 14, startY);
        startY += 5;
      }
      
      if (branchInfo.manager) {
        doc.setFontSize(9);
        doc.text(`Manager: ${branchInfo.manager}`, 14, startY);
        startY += 7;
      }
    }
    
    // Add title if provided
    if (title) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, pageWidth / 2, startY, { align: 'center' });
      startY += 7;
      
      if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle, pageWidth / 2, startY, { align: 'center' });
        startY += 7;
      }
      
      doc.setFontSize(9);
      doc.text(`Dicetak pada: ${formatDate(new Date())}`, pageWidth - 14, startY, { align: 'right' });
      startY += 5;
      
      // Separating line
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(0.5);
      doc.line(14, startY, pageWidth - 14, startY);
      startY += 5;
    }

    // Prepare the table data
    const tableData = data.map(item => 
      columns.map(col => typeof item[col] === 'number' && !col.includes('percentage') ? 
        formatRupiah(item[col]) : 
        item[col]
      )
    );
    
    // Add the table
    (doc as any).autoTable({
      head: [columnLabels || columns],
      body: tableData,
      startY: startY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { 
        fillColor: [220, 53, 69], 
        textColor: 255,
        fontStyle: 'bold' 
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40, right: 14, bottom: 20, left: 14 }
    });
    
    // Save the PDF
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};
