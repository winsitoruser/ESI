import { utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipe untuk kolom ekspor
export interface ExportColumn {
  header: string;
  accessorKey: string | ((data: any) => any);
  format?: (value: any) => string;
}

// Ekspor ke CSV
export const exportToCSV = <T extends Record<string, any>>(data: T[], filename: string): { success: boolean; error?: Error } => {
  try {
    if (!data.length) return { success: false, error: new Error('Tidak ada data untuk diekspor') };
    const headers = Object.keys(data[0]);
    const escape = (val: unknown) => {
      const s = val == null ? '' : String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...data.map(row => headers.map(h => escape(row[h])).join(','))
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('Export to CSV failed:', error);
    return { success: false, error: error instanceof Error ? error : new Error('Failed to export to CSV') };
  }
};

// Ekspor ke Excel
export const exportToExcel = <T extends Record<string, any>>(data: T[], filename: string): { success: boolean; error?: Error } => {
  try {
    // Format data jika diperlukan
    const formattedData = data.map(item => {
      const formattedItem: Record<string, any> = {};
      Object.keys(item).forEach(key => {
        formattedItem[key] = item[key];
      });
      return formattedItem;
    });

    const ws: WorkSheet = utils.json_to_sheet(formattedData);
    const wb: WorkBook = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sheet1");
    writeFile(wb, `${filename}.xlsx`);
    return { success: true };
  } catch (error) {
    console.error('Export to Excel failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Failed to export to Excel') 
    };
  }
};

// Ekspor ke PDF
export const exportToPDF = <T extends Record<string, any>>(
  data: T[], 
  columns: ExportColumn[], 
  filename: string
): { success: boolean; error?: Error } => {
  try {
    const doc = new jsPDF();
    doc.text('Laporan Data', 14, 16);
    
    // Siapkan data untuk tabel
    const tableData = data.map(row => 
      columns.map(col => {
        const value = typeof col.accessorKey === 'function' 
          ? col.accessorKey(row)
          : row[col.accessorKey];
        return col.format ? col.format(value) : value;
      })
    );
    
    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: tableData,
      startY: 20,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [229, 57, 53], // Warna merah Farmanesia
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [255, 245, 245] // Warna latar belakang alternatif
      }
    });
    
    doc.save(`${filename}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Export to PDF failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Failed to export to PDF') 
    };
  }
};
