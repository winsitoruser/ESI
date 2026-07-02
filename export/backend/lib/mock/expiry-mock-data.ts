import { ExpiryItem, OrderHistory, getDaysBetween } from '@/lib/adapters/expiry-adapter';

// Expiry status thresholds in days
const EXPIRED = 0;
const CRITICAL = 30;  // Less than 30 days
const WARNING = 90;   // Less than 90 days

// Generate mock expiry data
export function generateMockExpiryData(): ExpiryItem[] {
  const categories = ["Analgesik", "Antibiotik", "Vitamin", "Suplemen", "Antihistamin", "Antiseptik", "Antidiabetes"];
  const locations = ["Rak A", "Rak B", "Rak C", "Rak D", "Gudang Utama"];
  const suppliers = ["PT. Farma Utama", "CV. Sehat Sentosa", "PT. Medika Jaya", "PT. Sarana Husada", "CV. Prima Farma"];
  
  const today = new Date();
  const items: ExpiryItem[] = [];
  
  for (let i = 1; i <= 100; i++) {
    // Generate random expiry date between now and 180 days
    const randomDays = Math.floor(Math.random() * 180) - 20; // Some items already expired
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + randomDays);
    
    // Calculate days remaining
    const daysRemaining = getDaysBetween(today, expiryDate) * (expiryDate > today ? 1 : -1);
    
    // Set status based on days remaining
    let status: "expired" | "critical" | "warning" | "good";
    if (daysRemaining <= EXPIRED) {
      status = "expired";
    } else if (daysRemaining <= CRITICAL) {
      status = "critical";
    } else if (daysRemaining <= WARNING) {
      status = "warning";
    } else {
      status = "good";
    }
    
    // Random stock quantity between 1 and 100
    const currentStock = Math.floor(Math.random() * 100) + 1;
    
    // Random cost price between Rp 5,000 and Rp 500,000
    const costPrice = Math.floor(Math.random() * 495000) + 5000;
    
    // Total value
    const value = costPrice * currentStock;
    
    items.push({
      id: `exp-${i}`,
      productId: `prod-${i}`,
      productName: `Produk Farmasi ${i}`,
      sku: `SKU-${10000 + i}`,
      batchNumber: `BATCH-${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`,
      expiryDate,
      daysRemaining,
      currentStock,
      value,
      status,
      category: categories[i % categories.length],
      quantity: currentStock,
      location: locations[i % locations.length],
      supplier: suppliers[i % suppliers.length],
      costPrice
    });
  }
  
  return items;
}

// Generate mock order history
export function generateOrderHistory(productId: string): OrderHistory[] {
  const staffMembers = [
    { id: "staff1", name: "Budi Santoso", avatar: "", position: "Senior Apoteker" },
    { id: "staff2", name: "Ani Wijaya", avatar: "", position: "Apoteker" },
    { id: "staff3", name: "Dedi Kurniawan", avatar: "", position: "Asisten Apoteker" },
    { id: "staff4", name: "Siti Rahayu", avatar: "", position: "Staff Gudang" },
  ];

  const numberOfOrders = Math.floor(Math.random() * 5) + 1;
  const orders: OrderHistory[] = [];

  for (let i = 0; i < numberOfOrders; i++) {
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 60) - 5);
    
    const randomStaff = staffMembers[Math.floor(Math.random() * staffMembers.length)];
    
    orders.push({
      id: `order-${productId}-${i}`,
      orderDate,
      orderNumber: `PO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      quantity: Math.floor(Math.random() * 50) + 5,
      staff: randomStaff
    });
  }

  return orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
}
