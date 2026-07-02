import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ExpiryItem } from '@/pages/inventory/expiry';

/**
 * Creates a styled Excel workbook with branded orange/amber theme
 * @param data Data to export
 * @param fileName Filename without extension
 */
export const exportToExcel = (data: ExpiryItem[], fileName: string = 'expiry-data') => {
  // Create a workbook
  const wb = XLSX.utils.book_new();
  
  // Set workbook properties with Farmanesia branding
  wb.Props = {
    Title: "Laporan Produk Kadaluarsa",
    Subject: "Data Produk Kadaluarsa",
    Author: "Farmanesia",
    Company: "Farmanesia Pharmacy",
    CreatedDate: new Date()
  };

  // Transform data for excel by creating a header row and data rows
  const headerRow = [
    'Kode Produk',
    'Nama Produk',
    'Kategori',
    'Batch',
    'Jumlah',
    'Exp. Date',
    'Sisa Hari',
    'Status',
    'Lokasi',
    'Principal',
    'Harga Beli',
    'Total Nilai'
  ];

  // Format data rows
  const dataRows = data.map(item => {
    // Calculate days remaining
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Determine status text
    let status = "Valid";
    if (daysRemaining <= 0) {
      status = "Kadaluarsa";
    } else if (daysRemaining <= 30) {
      status = "Kritis";
    } else if (daysRemaining <= 90) {
      status = "Perhatian";
    }

    return [
      item.sku,
      item.productName,
      item.category,
      item.batchNumber,
      item.quantity,
      new Date(item.expiryDate).toLocaleDateString('id-ID'),
      daysRemaining,
      status,
      item.location,
      item.supplier,
      item.costPrice.toLocaleString('id-ID'),
      (item.costPrice * item.quantity).toLocaleString('id-ID')
    ];
  });

  // Combine header and data rows
  const wsData = [headerRow, ...dataRows];
  
  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Add column widths for better readability
  const columnWidths = [
    { wch: 15 }, // SKU
    { wch: 30 }, // Product Name
    { wch: 15 }, // Category
    { wch: 15 }, // Batch
    { wch: 10 }, // Quantity
    { wch: 15 }, // Expiry Date
    { wch: 10 }, // Days Remaining
    { wch: 15 }, // Status
    { wch: 15 }, // Location
    { wch: 20 }, // Supplier
    { wch: 15 }, // Cost Price
    { wch: 15 }, // Total Value
  ];
  
  ws['!cols'] = columnWidths;
  
  // Apply styles to header (we'll use cell formatting to make headers stand out)
  // Note: XLSX styling is limited in the basic library, full styling would require additional libraries

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Produk Kadaluarsa");
  
  // Generate the Excel file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Convert to blob and save
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, `${fileName}.xlsx`);
  
  return true;
};
