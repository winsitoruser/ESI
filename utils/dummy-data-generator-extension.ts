/**
 * Extensions for DummyDataGenerator
 * 
 * Adds additional generation methods for inventory movements and other new data types
 */

import DummyDataGenerator from './dummy-data-generator';

// Extend the DummyDataGenerator class with new methods
export class ExtendedDummyDataGenerator extends DummyDataGenerator {
  /**
   * Generate inventory movements data
   */
  generateInventoryMovements(count: number = 20): any[] {
    const movements = [];
    const typeColors = {
      in: '#ef4444',   // Red color
      out: '#f97316'   // Orange color
    };
    
    const products = this.generateProducts(10); // Generate some products to use
    const descriptions = [
      'Penerimaan barang dari supplier', 
      'Pengambilan untuk resep', 
      'Penyesuaian stok after stockopname', 
      'Retur ke supplier',
      'Pemindahan lokasi',
      'Penyesuaian masa kadaluarsa',
      'Barang rusak',
      'Koreksi kesalahan input',
      'Stok awal'
    ];
    
    const locations = ['Rak A', 'Rak B', 'Rak C', 'Rak D', 'Lemari Khusus', 'Kulkas', 'Gudang'];
    
    // Generate dates for the last 90 days
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 90);
    
    for (let i = 0; i < count; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const isIn = Math.random() > 0.5; // 50% chance of in or out
      const type = isIn ? 'in' : 'out';
      const typeColor = typeColors[type];
      
      const quantity = Math.floor(Math.random() * 50) + 1;
      const unitPrice = Math.floor(Math.random() * 50000) + 5000;
      const totalValue = quantity * unitPrice;
      
      const location = locations[Math.floor(Math.random() * locations.length)] + '-' + 
        (Math.floor(Math.random() * 10) + 1);
        
      const date = this.randomDate(startDate, today);
      const stockBefore = Math.floor(Math.random() * 100) + 1;
      const stockAfter = type === 'in' 
        ? stockBefore + quantity 
        : Math.max(0, stockBefore - quantity);
      
      movements.push({
        id: this.generateId('MV'),
        productId: product.id,
        productName: product.name,
        type,
        typeColor,
        quantity,
        unitPrice,
        totalValue,
        date: date.toISOString(),
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        referenceNumber: Math.random() > 0.7 ? `REF-${Math.floor(Math.random() * 10000)}` : null,
        batchNumber: Math.random() > 0.6 ? `BATCH-${Math.floor(Math.random() * 10000)}` : null,
        stockBefore,
        stockAfter,
        location,
        userId: this.generateId('USER'),
        userName: ['John Doe', 'Jane Smith', 'Ahmad Rizal', 'Siti Aminah'][Math.floor(Math.random() * 4)],
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        tenantId: this.tenantId
      });
    }
    
    // Sort by date descending
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return movements;
  }
}

// Helper function to create an extended generator
export function createExtendedGenerator(tenantId: string): ExtendedDummyDataGenerator {
  return new ExtendedDummyDataGenerator(tenantId);
}

export default ExtendedDummyDataGenerator;
