import { Document, Paragraph, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, TextRun, HeadingLevel, Header, Footer, PageNumber, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import { ExpiryItem } from '@/pages/inventory/expiry';

/**
 * Creates a styled Word document with proper layout for expiry data
 * @param data Data to export
 * @param fileName Filename without extension
 */
export const exportToWord = async (data: ExpiryItem[], fileName: string = 'expiry-data') => {
  // Define colors (RGB hex) for orange/amber theme
  const orangeColor = "E67E22";
  const amberColor = "F39C12";
  const lightAmberColor = "FCF8E3";
  const whiteColor = "FFFFFF";
  
  // Create header with company name and document title
  const header = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "FARMANESIA",
            bold: true,
            size: 36,
            color: orangeColor
          })
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Laporan Produk Kadaluarsa",
            bold: true,
            size: 28,
            color: amberColor
          })
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
            size: 20,
          }),
        ],
        spacing: { after: 100 },
      }),
    ],
  });
  
  // Create a footer with page numbers
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Halaman ",
            size: 18,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18,
          }),
          new TextRun({
            text: " dari ",
            size: 18,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 18,
          }),
          new TextRun({
            text: ` - FARMANESIA © ${new Date().getFullYear()}`,
            size: 18,
          }),
        ],
      }),
    ],
  });

  // Create a title for the table
  const title = new Paragraph({
    children: [
      new TextRun({
        text: "DAFTAR PRODUK KADALUARSA",
        bold: true,
        size: 32,
        color: orangeColor
      })
    ],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 400 },
  });

  // Create the table with headers
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: amberColor },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: amberColor },
      left: { style: BorderStyle.SINGLE, size: 1, color: amberColor },
      right: { style: BorderStyle.SINGLE, size: 1, color: amberColor },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: amberColor },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: amberColor },
    },
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        height: { value: 500, rule: "exact" },
        cantSplit: true,
        children: [
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Kode", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Nama Produk", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Kategori", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Batch", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Jumlah", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 12, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Tanggal Kadaluarsa", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Sisa Hari", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Status", color: whiteColor, bold: true })] 
            })],
          }),
          new TableCell({
            shading: { fill: orangeColor, type: ShadingType.SOLID },
            width: { size: 12, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER, 
              children: [new TextRun({ text: "Lokasi", color: whiteColor, bold: true })] 
            })],
          }),
        ],
      }),
      
      // Data rows
      ...data.map((item, index) => {
        // Calculate days remaining
        const today = new Date();
        const expiryDate = new Date(item.expiryDate);
        const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine status and color
        let status = "Valid";
        let statusColor = "2ECC71"; // Green
        let rowShading = index % 2 === 0 ? lightAmberColor : "FFFFFF";
        
        if (daysRemaining <= 0) {
          status = "Kadaluarsa";
          statusColor = "E74C3C"; // Red
        } else if (daysRemaining <= 30) {
          status = "Kritis";
          statusColor = "F39C12"; // Amber
        } else if (daysRemaining <= 90) {
          status = "Perhatian";
          statusColor = "F1C40F"; // Yellow
        }
        
        return new TableRow({
          height: { value: 400, rule: "exact" },
          cantSplit: true,
          children: [
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: item.sku, alignment: AlignmentType.LEFT })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: item.productName, alignment: AlignmentType.LEFT })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: item.category, alignment: AlignmentType.LEFT })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: item.batchNumber, alignment: AlignmentType.LEFT })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: item.quantity.toString(), alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ 
                text: new Date(item.expiryDate).toLocaleDateString('id-ID'), 
                alignment: AlignmentType.CENTER 
              })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: daysRemaining.toString(), alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              shading: { fill: statusColor, type: ShadingType.SOLID },
              children: [new Paragraph({ 
                text: status, 
                alignment: AlignmentType.CENTER,
                color: daysRemaining <= 90 ? "FFFFFF" : "000000" 
              })],
            }),
            new TableCell({
              shading: { fill: rowShading, type: ShadingType.SOLID },
              children: [new Paragraph({ text: item.location, alignment: AlignmentType.LEFT })],
            }),
          ],
        });
      }),
    ],
  });
  
  // Calculate summary information
  const expiredCount = data.filter(item => {
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 0;
  }).length;
  
  const criticalCount = data.filter(item => {
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 && daysRemaining <= 30;
  }).length;
  
  const warningCount = data.filter(item => {
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 30 && daysRemaining <= 90;
  }).length;
  
  const validCount = data.filter(item => {
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 90;
  }).length;
  
  // Create summary section
  const summary = [
    new Paragraph({
      children: [
        new TextRun({
          text: "RINGKASAN",
          bold: true,
          size: 28,
          color: orangeColor
        })
      ],
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: `Total Produk: ${data.length}`,
      spacing: { before: 100, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Produk Kadaluarsa: ",
        }),
        new TextRun({
          text: `${expiredCount}`,
          color: "E74C3C", // Red
          bold: true,
        }),
      ],
      spacing: { before: 100, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Produk Kritis (<30 hari): ",
        }),
        new TextRun({
          text: `${criticalCount}`,
          color: "F39C12", // Amber
          bold: true,
        }),
      ],
      spacing: { before: 100, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Produk Perhatian (<90 hari): ",
        }),
        new TextRun({
          text: `${warningCount}`,
          color: "F1C40F", // Yellow
          bold: true,
        }),
      ],
      spacing: { before: 100, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Produk Valid: ",
        }),
        new TextRun({
          text: `${validCount}`,
          color: "2ECC71", // Green
          bold: true,
        }),
      ],
      spacing: { before: 100, after: 100 },
    }),
  ];
  
  // Create the Word document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape',
            },
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        headers: {
          default: header,
        },
        footers: {
          default: footer,
        },
        children: [
          title,
          table,
          ...summary,
        ],
      },
    ],
  });
  
  // Generate the document
  const buffer = await Packer.toBuffer(doc);
  
  // Save the file
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, `${fileName}.docx`);
  
  return true;
};

// Need to import Packer after Document is defined due to circular dependencies
import { Packer } from 'docx';
