const db = require('../../../models');
const { Product, Supplier } = db;
const ExcelJS = require('exceljs');

// PDFDocument will be loaded dynamically when needed
// This avoids webpack trying to bundle it at build time

/**
 * POST /api/products/export
 * Export products to Excel, PDF, or CSV
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { format = 'excel', filters = {}, fields = [] } = req.body;

    // Build query based on filters
    const where = { isActive: true };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.supplier) {
      where.supplier_id = filters.supplier;
    }

    if (filters.stockStatus) {
      if (filters.stockStatus === 'low') {
        where.stock = {
          [db.Sequelize.Op.lte]: db.Sequelize.col('min_stock'),
          [db.Sequelize.Op.gt]: 0
        };
      } else if (filters.stockStatus === 'out') {
        where.stock = 0;
      }
    }

    if (filters.priceMin || filters.priceMax) {
      where.price = {};
      if (filters.priceMin) {
        where.price[db.Sequelize.Op.gte] = parseFloat(filters.priceMin);
      }
      if (filters.priceMax) {
        where.price[db.Sequelize.Op.lte] = parseFloat(filters.priceMax);
      }
    }

    // Fetch products
    const products = await Product.findAll({
      where,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['name'],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    // Determine which fields to export
    const defaultFields = ['name', 'sku', 'category', 'price', 'stock', 'supplier'];
    const exportFields = fields.length > 0 ? fields : defaultFields;

    switch (format) {
      case 'excel':
        return await exportToExcel(products, exportFields, res);
      
      case 'pdf':
        return await exportToPDF(products, exportFields, res);
      
      case 'csv':
        return await exportToCSV(products, exportFields, res);
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Use: excel, pdf, or csv'
        });
    }

  } catch (error) {
    console.error('Export API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Export to Excel
async function exportToExcel(products, fields, res) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  // Define columns
  const columns = [];
  const fieldMap = {
    name: { header: 'Nama Produk', key: 'name', width: 30 },
    sku: { header: 'SKU', key: 'sku', width: 15 },
    category: { header: 'Kategori', key: 'category', width: 15 },
    price: { header: 'Harga', key: 'price', width: 15 },
    cost: { header: 'Cost', key: 'cost', width: 15 },
    stock: { header: 'Stock', key: 'stock', width: 10 },
    min_stock: { header: 'Min Stock', key: 'min_stock', width: 10 },
    supplier: { header: 'Supplier', key: 'supplier', width: 20 },
    barcode: { header: 'Barcode', key: 'barcode', width: 15 },
    unit: { header: 'Unit', key: 'unit', width: 10 }
  };

  fields.forEach(field => {
    if (fieldMap[field]) {
      columns.push(fieldMap[field]);
    }
  });

  worksheet.columns = columns;

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4CAF50' }
  };

  // Add data
  products.forEach(product => {
    const row = {};
    fields.forEach(field => {
      if (field === 'supplier') {
        row[field] = product.supplier?.name || '-';
      } else {
        row[field] = product[field] || '-';
      }
    });
    worksheet.addRow(row);
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.xlsx`);
  res.send(buffer);
}

// Export to PDF
async function exportToPDF(products, fields, res) {
  try {
    // Dynamic import to avoid webpack bundling at build time
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.pdf`);

  doc.pipe(res);

  // Title
  doc.fontSize(20).text('Daftar Produk', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
  doc.moveDown(2);

  // Table header
  doc.fontSize(8);
  let y = doc.y;
  const colWidth = 80;
  let x = 50;

  fields.forEach(field => {
    const fieldLabels = {
      name: 'Nama',
      sku: 'SKU',
      category: 'Kategori',
      price: 'Harga',
      stock: 'Stock',
      supplier: 'Supplier'
    };
    doc.text(fieldLabels[field] || field, x, y, { width: colWidth });
    x += colWidth;
  });

  doc.moveDown();

  // Table data
  products.forEach(product => {
    x = 50;
    y = doc.y;

    fields.forEach(field => {
      let value = '-';
      if (field === 'supplier') {
        value = product.supplier?.name || '-';
      } else if (field === 'price') {
        value = `Rp ${parseInt(product.price).toLocaleString('id-ID')}`;
      } else {
        value = product[field] || '-';
      }
      
      doc.text(String(value).substring(0, 15), x, y, { width: colWidth });
      x += colWidth;
    });

    doc.moveDown(0.5);
  });

  doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    return res.status(500).json({
      success: false,
      message: 'PDF export is not available. Please install pdfkit package.'
    });
  }
}

// Export to CSV
async function exportToCSV(products, fields, res) {
  const fieldLabels = {
    name: 'Nama Produk',
    sku: 'SKU',
    category: 'Kategori',
    price: 'Harga',
    cost: 'Cost',
    stock: 'Stock',
    min_stock: 'Min Stock',
    supplier: 'Supplier',
    barcode: 'Barcode',
    unit: 'Unit'
  };

  // CSV Header
  const headers = fields.map(field => fieldLabels[field] || field);
  let csv = headers.join(',') + '\n';

  // CSV Data
  products.forEach(product => {
    const row = fields.map(field => {
      let value = '';
      if (field === 'supplier') {
        value = product.supplier?.name || '';
      } else {
        value = product[field] || '';
      }
      // Escape commas and quotes
      value = String(value).replace(/"/g, '""');
      return `"${value}"`;
    });
    csv += row.join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=products_${Date.now()}.csv`);
  res.send(csv);
}
