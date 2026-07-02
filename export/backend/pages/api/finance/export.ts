import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { handleApiError } from '@/middleware/error-handler';
import { IncomeStatement, BalanceSheet, CashFlow, TaxSummary, ReportData } from '../reports';

/**
 * Converts ReportData to CSV format
 */
const convertToCSV = (reportData: ReportData, type: string): string => {
  let csvContent = '';
  
  // Helper function to flatten nested objects
  const flattenObject = (obj: any, prefix = ''): { [key: string]: any } => {
    const flattened: { [key: string]: any } = {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const flattenedChild = flattenObject(obj[key], `${prefix}${key}_`);
        Object.assign(flattened, flattenedChild);
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    
    return flattened;
  };
  
  // Process different report types
  switch(type) {
    case 'income-statement':
      if (reportData.incomeStatement) {
        const flatData = flattenObject(reportData.incomeStatement);
        const headers = Object.keys(flatData).join(',');
        const values = Object.values(flatData).join(',');
        csvContent = `${headers}\n${values}`;
      }
      break;
      
    case 'balance-sheet':
      if (reportData.balanceSheet) {
        const flatData = flattenObject(reportData.balanceSheet);
        const headers = Object.keys(flatData).join(',');
        const values = Object.values(flatData).join(',');
        csvContent = `${headers}\n${values}`;
      }
      break;
      
    case 'cash-flow':
      if (reportData.cashFlow) {
        const flatData = flattenObject(reportData.cashFlow);
        const headers = Object.keys(flatData).join(',');
        const values = Object.values(flatData).join(',');
        csvContent = `${headers}\n${values}`;
      }
      break;
      
    case 'tax':
      if (reportData.taxSummary) {
        const flatData = flattenObject(reportData.taxSummary);
        const headers = Object.keys(flatData).join(',');
        const values = Object.values(flatData).join(',');
        csvContent = `${headers}\n${values}`;
      }
      break;
      
    case 'all':
      // For 'all', create a combined report with sections
      csvContent = 'Report Type,Category,Item,Value\n';
      
      if (reportData.incomeStatement) {
        const flatData = flattenObject(reportData.incomeStatement);
        for (const [key, value] of Object.entries(flatData)) {
          csvContent += `Income Statement,${key.split('_')[0] || 'General'},${key},${value}\n`;
        }
      }
      
      if (reportData.balanceSheet) {
        const flatData = flattenObject(reportData.balanceSheet);
        for (const [key, value] of Object.entries(flatData)) {
          csvContent += `Balance Sheet,${key.split('_')[0] || 'General'},${key},${value}\n`;
        }
      }
      
      if (reportData.cashFlow) {
        const flatData = flattenObject(reportData.cashFlow);
        for (const [key, value] of Object.entries(flatData)) {
          csvContent += `Cash Flow,${key.split('_')[0] || 'General'},${key},${value}\n`;
        }
      }
      
      if (reportData.taxSummary) {
        const flatData = flattenObject(reportData.taxSummary);
        for (const [key, value] of Object.entries(flatData)) {
          csvContent += `Tax Summary,${key.split('_')[0] || 'General'},${key},${value}\n`;
        }
      }
      break;
  }
  
  return csvContent;
};

/**
 * Creates a simple Excel-like format (actually CSV with .xlsx extension)
 * In a real app, you would use a library like exceljs or xlsx to create proper Excel files
 */
const convertToExcel = (reportData: ReportData, type: string): Buffer => {
  // For this mock, we'll just use CSV content but return it as a buffer
  const csvContent = convertToCSV(reportData, type);
  return Buffer.from(csvContent);
};

/**
 * Creates a PDF document using jsPDF
 */
const convertToPDF = (reportData: ReportData, type: string): Buffer => {
  try {
    // Import jsPDF dynamically (not available on server build otherwise)
    const { jsPDF } = require('jspdf');
    require('jspdf-autotable');
    
    // Initialize PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Helper function to flatten the data for processing
    const flattenObject = (obj: any, prefix = ''): { [key: string]: any } => {
      const flattened: { [key: string]: any } = {};
      
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const flattenedChild = flattenObject(obj[key], `${prefix}${key}_`);
          Object.assign(flattened, flattenedChild);
        } else {
          flattened[`${prefix}${key}`] = obj[key];
        }
      }
      
      return flattened;
    };
    
    // Get flat data for the specific report type
    let flatData: { [key: string]: any } = {};
    switch(type) {
      case 'income-statement':
        if (reportData.incomeStatement) {
          flatData = flattenObject(reportData.incomeStatement);
        }
        break;
      case 'balance-sheet':
        if (reportData.balanceSheet) {
          flatData = flattenObject(reportData.balanceSheet);
        }
        break;
      case 'cash-flow':
        if (reportData.cashFlow) {
          flatData = flattenObject(reportData.cashFlow);
        }
        break;
      case 'tax':
        if (reportData.taxSummary) {
          flatData = flattenObject(reportData.taxSummary);
        }
        break;
      case 'all':
        // Combined flat data from all reports
        if (reportData.incomeStatement) {
          Object.assign(flatData, flattenObject(reportData.incomeStatement));
        }
        if (reportData.balanceSheet) {
          Object.assign(flatData, flattenObject(reportData.balanceSheet));
        }
        if (reportData.cashFlow) {
          Object.assign(flatData, flattenObject(reportData.cashFlow));
        }
        if (reportData.taxSummary) {
          Object.assign(flatData, flattenObject(reportData.taxSummary));
        }
        break;
    }
    
    // Add title and metadata
    doc.setFontSize(16);
    doc.text(`Financial Report: ${type.replace('-', ' ').toUpperCase()}`, 14, 20);
    doc.setFontSize(10);
    const currentDate = new Date();
    doc.text(`Generated on: ${currentDate.toLocaleDateString('id-ID')}`, 14, 30);
    
    // Add company info if available
    doc.text('FARMANESIA', 14, 40);
    doc.text('Sistem Manajemen Apotek Terpadu', 14, 45);
    
    // Set up table data
    const tableColumns = [[
      { content: 'ITEM', styles: { halign: 'left', fontStyle: 'bold' } }, 
      { content: 'VALUE', styles: { halign: 'right', fontStyle: 'bold' } }
    ]];
    
    const tableRows = Object.entries(flatData).map(([key, value]) => [
      key.replace(/([A-Z])/g, ' $1').trim(),
      typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : String(value)
    ]);
    
    // Draw the table
    // @ts-ignore - jspdf-autotable adds this method
    doc.autoTable({
      head: tableColumns,
      body: tableRows,
      startY: 60,
      margin: { top: 20 },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 80, 40], textColor: 255 },  // Red-orange theme
      alternateRowStyles: { fillColor: [255, 240, 235] } // Light orange background for alternate rows
    });
    
    // Add footer
    // Ensure pageCount is a number by converting the return value with Number()
    const pageCount = Number(doc.internal.getNumberOfPages()) || 1;
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Halaman ${i} dari ${pageCount} - Dihasilkan oleh Sistem FARMANESIA`, 
        // Ensure these are numbers by using Number() explicitly
        Number(doc.internal.pageSize.width) / 2, 
        Number(doc.internal.pageSize.height) - 10, 
        { align: 'center' }
      );
    }
    
    // Convert to buffer and return
    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to simple text if PDF generation fails
    const flatData = {};
    // Get data based on report type
    switch(type) {
      case 'income-statement':
        if (reportData.incomeStatement) {
          Object.assign(flatData, reportData.incomeStatement);
        }
        break;
      default:
        // Just use a simple representation
        Object.assign(flatData, { type, date: new Date().toISOString() });
    }
    
    const text = `Report Data for ${type}:\n${JSON.stringify(flatData, null, 2)}`;
    return Buffer.from(text, 'utf-8');
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authenticate user
    const user = await authenticateUser(req);
    
    // Check if user is authorized to access finance reports
    if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'FINANCE_STAFF'])) {
      return res.status(403).json({ error: 'You do not have permission to export financial reports' });
    }
    
    const { method } = req;
    
    if (method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
    
    // Get query parameters
    const { 
      type = 'all', 
      period = 'Jan 2025 - Mar 2025', 
      year = '2025', 
      month = '3',
      quarter = '1',
      branchId = 'all',
      format = 'csv',
      tenantId = user.tenantId
    } = req.query;
    
    // Implement API endpoint for reports
    const reportType = typeof type === 'string' ? type : 'all';
    const exportFormat = typeof format === 'string' ? format : 'csv';
    
    // Get report data from the main reports API by re-using its logic
    // In a real app, we might import the function directly or use a service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/finance/reports?` + 
      new URLSearchParams({
        type: reportType,
        period: typeof period === 'string' ? period : 'Jan 2025 - Mar 2025',
        year: typeof year === 'string' ? year : '2025',
        month: typeof month === 'string' ? month : '3',
        quarter: typeof quarter === 'string' ? quarter : '1',
        branchId: typeof branchId === 'string' ? branchId : 'all',
        tenantId: typeof tenantId === 'string' ? tenantId : 'default'
      }).toString()
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch report data: ${response.statusText}`);
    }
    
    const { data: reportData } = await response.json();
    
    // Set appropriate headers for file download
    let filename = `farmanesia_${reportType}_report_${new Date().toISOString().split('T')[0]}`;
    let contentType = 'text/plain';
    let content: string | Buffer = '';
    
    // Convert data to requested format
    switch (exportFormat) {
      case 'csv':
        contentType = 'text/csv';
        filename += '.csv';
        content = convertToCSV(reportData, reportType);
        break;
        
      case 'excel':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename += '.xlsx';
        content = convertToExcel(reportData, reportType);
        break;
        
      case 'pdf':
        contentType = 'application/pdf';
        filename += '.pdf';
        content = convertToPDF(reportData, reportType);
        break;
        
      default:
        contentType = 'text/csv';
        filename += '.csv';
        content = convertToCSV(reportData, reportType);
    }
    
    // Set download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Send the response
    res.status(200).send(content);
  } catch (error) {
    console.error('Error exporting financial reports:', error);
    const { status, message } = handleApiError(error);
    res.status(status).json({ error: message });
  }
}
