import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '@/lib/sequelize';

// Helper to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const [result] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = :tableName
      )
    `, { replacements: { tableName } });
    return (result as any[])[0]?.exists === true;
  } catch {
    return false;
  }
}

// Product Categories Data
const categoriesData = [
  { id: 1, name: 'Makanan', description: 'Menu makanan utama', parent_id: null },
  { id: 2, name: 'Minuman', description: 'Berbagai jenis minuman', parent_id: null },
  { id: 3, name: 'Snack', description: 'Makanan ringan dan cemilan', parent_id: null },
  { id: 4, name: 'Dessert', description: 'Hidangan penutup', parent_id: null },
  { id: 5, name: 'Nasi', description: 'Menu berbasis nasi', parent_id: 1 },
  { id: 6, name: 'Mie', description: 'Menu berbasis mie', parent_id: 1 },
  { id: 7, name: 'Ayam', description: 'Menu ayam', parent_id: 1 },
  { id: 8, name: 'Seafood', description: 'Menu seafood', parent_id: 1 },
  { id: 9, name: 'Kopi', description: 'Berbagai kopi', parent_id: 2 },
  { id: 10, name: 'Teh', description: 'Berbagai teh', parent_id: 2 },
  { id: 11, name: 'Jus', description: 'Jus buah segar', parent_id: 2 },
  { id: 12, name: 'Smoothies', description: 'Minuman smoothies', parent_id: 2 },
];

// Products Data
const productsData = [
  // Nasi (category 5)
  { name: 'Nasi Goreng Spesial', sku: 'NGS001', category_id: 5, sell_price: 25000, buy_price: 12000, unit: 'porsi', description: 'Nasi goreng dengan telur, ayam, dan sayuran' },
  { name: 'Nasi Goreng Seafood', sku: 'NGF001', category_id: 5, sell_price: 35000, buy_price: 18000, unit: 'porsi', description: 'Nasi goreng dengan udang, cumi, dan ikan' },
  { name: 'Nasi Goreng Kampung', sku: 'NGK001', category_id: 5, sell_price: 22000, buy_price: 10000, unit: 'porsi', description: 'Nasi goreng tradisional' },
  { name: 'Nasi Putih', sku: 'NPT001', category_id: 5, sell_price: 5000, buy_price: 2500, unit: 'porsi', description: 'Nasi putih hangat' },
  { name: 'Nasi Uduk', sku: 'NUD001', category_id: 5, sell_price: 15000, buy_price: 7000, unit: 'porsi', description: 'Nasi uduk komplit' },
  
  // Mie (category 6)
  { name: 'Mie Goreng Spesial', sku: 'MGS001', category_id: 6, sell_price: 23000, buy_price: 11000, unit: 'porsi', description: 'Mie goreng dengan telur dan sayuran' },
  { name: 'Mie Ayam Bakso', sku: 'MAB001', category_id: 6, sell_price: 20000, buy_price: 9000, unit: 'porsi', description: 'Mie ayam dengan bakso' },
  { name: 'Mie Goreng Seafood', sku: 'MGF001', category_id: 6, sell_price: 32000, buy_price: 16000, unit: 'porsi', description: 'Mie goreng dengan seafood' },
  { name: 'Kwetiau Goreng', sku: 'KWG001', category_id: 6, sell_price: 25000, buy_price: 12000, unit: 'porsi', description: 'Kwetiau goreng spesial' },
  
  // Ayam (category 7)
  { name: 'Ayam Goreng Kremes', sku: 'AGK001', category_id: 7, sell_price: 28000, buy_price: 14000, unit: 'porsi', description: 'Ayam goreng dengan kremesan' },
  { name: 'Ayam Bakar Madu', sku: 'ABM001', category_id: 7, sell_price: 30000, buy_price: 15000, unit: 'porsi', description: 'Ayam bakar dengan saus madu' },
  { name: 'Ayam Geprek', sku: 'AGP001', category_id: 7, sell_price: 22000, buy_price: 10000, unit: 'porsi', description: 'Ayam geprek dengan sambal' },
  { name: 'Ayam Penyet', sku: 'APY001', category_id: 7, sell_price: 25000, buy_price: 12000, unit: 'porsi', description: 'Ayam penyet dengan lalapan' },
  { name: 'Chicken Wings', sku: 'CWG001', category_id: 7, sell_price: 35000, buy_price: 17000, unit: 'porsi', description: 'Sayap ayam goreng crispy' },
  
  // Seafood (category 8)
  { name: 'Udang Goreng Tepung', sku: 'UGT001', category_id: 8, sell_price: 45000, buy_price: 25000, unit: 'porsi', description: 'Udang goreng dengan tepung crispy' },
  { name: 'Cumi Goreng Tepung', sku: 'CGT001', category_id: 8, sell_price: 40000, buy_price: 22000, unit: 'porsi', description: 'Cumi goreng tepung' },
  { name: 'Ikan Bakar', sku: 'IKB001', category_id: 8, sell_price: 55000, buy_price: 30000, unit: 'porsi', description: 'Ikan bakar dengan sambal' },
  
  // Kopi (category 9)
  { name: 'Espresso', sku: 'ESP001', category_id: 9, sell_price: 18000, buy_price: 5000, unit: 'gelas', description: 'Espresso shot' },
  { name: 'Americano', sku: 'AMR001', category_id: 9, sell_price: 22000, buy_price: 6000, unit: 'gelas', description: 'Espresso dengan air panas' },
  { name: 'Cappuccino', sku: 'CAP001', category_id: 9, sell_price: 28000, buy_price: 8000, unit: 'gelas', description: 'Espresso dengan susu foam' },
  { name: 'Cafe Latte', sku: 'LAT001', category_id: 9, sell_price: 28000, buy_price: 8000, unit: 'gelas', description: 'Espresso dengan susu steamed' },
  { name: 'Kopi Susu Gula Aren', sku: 'KSG001', category_id: 9, sell_price: 25000, buy_price: 7000, unit: 'gelas', description: 'Kopi susu dengan gula aren' },
  { name: 'Es Kopi Vietnam', sku: 'EKV001', category_id: 9, sell_price: 26000, buy_price: 7000, unit: 'gelas', description: 'Kopi Vietnam dengan susu kental' },
  
  // Teh (category 10)
  { name: 'Teh Tarik', sku: 'TTR001', category_id: 10, sell_price: 18000, buy_price: 5000, unit: 'gelas', description: 'Teh susu tarik' },
  { name: 'Es Teh Manis', sku: 'ETM001', category_id: 10, sell_price: 8000, buy_price: 2000, unit: 'gelas', description: 'Es teh manis segar' },
  { name: 'Teh Hijau', sku: 'THJ001', category_id: 10, sell_price: 15000, buy_price: 4000, unit: 'gelas', description: 'Green tea' },
  { name: 'Lemon Tea', sku: 'LMT001', category_id: 10, sell_price: 18000, buy_price: 5000, unit: 'gelas', description: 'Teh dengan lemon segar' },
  
  // Jus (category 11)
  { name: 'Jus Jeruk', sku: 'JJR001', category_id: 11, sell_price: 18000, buy_price: 6000, unit: 'gelas', description: 'Jus jeruk segar' },
  { name: 'Jus Alpukat', sku: 'JAL001', category_id: 11, sell_price: 22000, buy_price: 8000, unit: 'gelas', description: 'Jus alpukat' },
  { name: 'Jus Mangga', sku: 'JMG001', category_id: 11, sell_price: 20000, buy_price: 7000, unit: 'gelas', description: 'Jus mangga segar' },
  { name: 'Jus Semangka', sku: 'JSM001', category_id: 11, sell_price: 15000, buy_price: 5000, unit: 'gelas', description: 'Jus semangka segar' },
  { name: 'Jus Strawberry', sku: 'JST001', category_id: 11, sell_price: 22000, buy_price: 8000, unit: 'gelas', description: 'Jus strawberry' },
  
  // Smoothies (category 12)
  { name: 'Mango Smoothie', sku: 'SMS001', category_id: 12, sell_price: 28000, buy_price: 10000, unit: 'gelas', description: 'Smoothie mangga' },
  { name: 'Berry Smoothie', sku: 'BRS001', category_id: 12, sell_price: 32000, buy_price: 12000, unit: 'gelas', description: 'Smoothie mixed berry' },
  { name: 'Banana Smoothie', sku: 'BNS001', category_id: 12, sell_price: 25000, buy_price: 9000, unit: 'gelas', description: 'Smoothie pisang' },
  
  // Snack (category 3)
  { name: 'French Fries', sku: 'FFR001', category_id: 3, sell_price: 18000, buy_price: 6000, unit: 'porsi', description: 'Kentang goreng' },
  { name: 'Onion Rings', sku: 'ONR001', category_id: 3, sell_price: 20000, buy_price: 7000, unit: 'porsi', description: 'Bawang goreng crispy' },
  { name: 'Chicken Nugget', sku: 'CNG001', category_id: 3, sell_price: 22000, buy_price: 8000, unit: 'porsi', description: 'Nugget ayam 6 pcs' },
  { name: 'Pisang Goreng', sku: 'PGR001', category_id: 3, sell_price: 15000, buy_price: 5000, unit: 'porsi', description: 'Pisang goreng crispy' },
  { name: 'Tahu Crispy', sku: 'THC001', category_id: 3, sell_price: 12000, buy_price: 4000, unit: 'porsi', description: 'Tahu goreng crispy' },
  { name: 'Tempe Mendoan', sku: 'TMD001', category_id: 3, sell_price: 12000, buy_price: 4000, unit: 'porsi', description: 'Tempe mendoan' },
  
  // Dessert (category 4)
  { name: 'Es Krim Vanilla', sku: 'EKV001', category_id: 4, sell_price: 15000, buy_price: 5000, unit: 'porsi', description: 'Es krim vanilla' },
  { name: 'Es Krim Coklat', sku: 'EKC001', category_id: 4, sell_price: 15000, buy_price: 5000, unit: 'porsi', description: 'Es krim coklat' },
  { name: 'Pancake', sku: 'PCK001', category_id: 4, sell_price: 25000, buy_price: 10000, unit: 'porsi', description: 'Pancake dengan topping' },
  { name: 'Waffle', sku: 'WFL001', category_id: 4, sell_price: 28000, buy_price: 12000, unit: 'porsi', description: 'Waffle dengan es krim' },
  { name: 'Brownies', sku: 'BRW001', category_id: 4, sell_price: 20000, buy_price: 8000, unit: 'porsi', description: 'Brownies coklat' },
  { name: 'Pudding Caramel', sku: 'PDC001', category_id: 4, sell_price: 18000, buy_price: 6000, unit: 'porsi', description: 'Pudding dengan saus caramel' },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action = 'all' } = req.body;

  try {
    const results: any = {
      categories: { created: 0, updated: 0 },
      products: { created: 0, updated: 0 },
      stock: { created: 0, updated: 0 },
      transactions: { created: 0 }
    };

    // 1. Seed Categories
    if (action === 'all' || action === 'categories') {
      console.log('Seeding categories...');
      for (const cat of categoriesData) {
        const [category, created] = await sequelize.query(`
          INSERT INTO categories (id, name, description, parent_id, is_active, created_at, updated_at)
          VALUES (:id, :name, :description, :parent_id, true, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            parent_id = EXCLUDED.parent_id,
            updated_at = NOW()
          RETURNING id
        `, {
          replacements: cat,
          type: 'INSERT'
        });
        results.categories.created++;
      }
      
      // Reset sequence
      await sequelize.query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);
    }

    // 2. Seed Products (using SERIAL integer IDs)
    if (action === 'all' || action === 'products') {
      console.log('Seeding products...');
      
      let productIndex = 100; // Start from 100 to avoid conflicts
      for (const prod of productsData) {
        productIndex++;
        
        await sequelize.query(`
          INSERT INTO products (id, name, sku, barcode, category_id, description, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point, is_active, created_at, updated_at)
          VALUES (:id, :name, :sku, :barcode, :category_id, :description, :unit, :buy_price, :sell_price, :minimum_stock, :maximum_stock, :reorder_point, true, NOW(), NOW())
          ON CONFLICT (sku) DO UPDATE SET
            name = EXCLUDED.name,
            category_id = EXCLUDED.category_id,
            description = EXCLUDED.description,
            unit = EXCLUDED.unit,
            buy_price = EXCLUDED.buy_price,
            sell_price = EXCLUDED.sell_price,
            updated_at = NOW()
        `, {
          replacements: {
            id: productIndex,
            ...prod,
            barcode: prod.sku,
            minimum_stock: 10,
            maximum_stock: 100,
            reorder_point: 20
          }
        });
        results.products.created++;
      }
      
      // Reset sequence
      await sequelize.query(`SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products))`);

      // 3. Seed Stock for each product
      if (action === 'all' || action === 'stock') {
        console.log('Seeding stock...');
        
        // Get default location or create one
        let locationId = 1;
        const [locations] = await sequelize.query(`SELECT id FROM locations LIMIT 1`);
        if ((locations as any[]).length === 0) {
          await sequelize.query(`
            INSERT INTO locations (id, name, code, type, is_active, created_at, updated_at)
            VALUES (1, 'Gudang Utama', 'GDG001', 'warehouse', true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
          `);
        } else {
          locationId = (locations as any[])[0].id;
        }
        
        // Get all products
        const [products] = await sequelize.query(`SELECT id FROM products WHERE is_active = true`);
        
        for (const product of products as any[]) {
          const randomStock = Math.floor(Math.random() * 90) + 10; // Random stock 10-100
          
          await sequelize.query(`
            INSERT INTO inventory_stock (product_id, location_id, quantity, reserved_quantity, created_at, updated_at)
            VALUES (:product_id, :location_id, :quantity, 0, NOW(), NOW())
            ON CONFLICT (product_id, location_id) DO UPDATE SET
              quantity = EXCLUDED.quantity,
              updated_at = NOW()
          `, {
            replacements: {
              product_id: product.id,
              location_id: locationId,
              quantity: randomStock
            }
          });
          results.stock.created++;
        }
      }
    }

    // 4. Seed Transactions
    if (action === 'all' || action === 'transactions') {
      console.log('Seeding transactions...');
      
      // Check if required tables exist
      const posTransactionsExists = await tableExists('pos_transactions');
      const usersExists = await tableExists('users');
      
      if (!posTransactionsExists) {
        console.log('pos_transactions table does not exist, skipping transactions');
        results.transactions.created = 0;
      } else {
        // Get products for transactions
        const [products] = await sequelize.query(`
          SELECT id, name, sku, sell_price FROM products WHERE is_active = true LIMIT 20
        `);
        
        if ((products as any[]).length === 0) {
          console.log('No products found, skipping transactions');
          return res.status(200).json({
            success: true,
            message: 'POS data seeded (no products for transactions)',
            results
          });
        }
        
        // Get or create a default user as cashier from users table
        let cashierId: string = uuidv4();
        if (usersExists) {
          const [users] = await sequelize.query(`SELECT id FROM users WHERE is_active = true LIMIT 1`);
          if ((users as any[]).length > 0) {
            cashierId = (users as any[])[0].id;
          }
        }

        // Get branch (optional)
        let branchId: string | null = null;
        const branchesExists = await tableExists('branches');
        if (branchesExists) {
          const [branches] = await sequelize.query(`SELECT id FROM branches LIMIT 1`);
          if ((branches as any[]).length > 0) {
            branchId = (branches as any[])[0].id;
          }
        }

      // Create 50 sample transactions over the past 30 days
      // Payment methods must match enum: 'cash', 'card', 'transfer', 'ewallet', 'mixed'
      const paymentMethods = ['cash', 'cash', 'cash', 'card', 'card', 'transfer', 'ewallet', 'ewallet', 'mixed'];
      const customerNames = ['Budi Santoso', 'Ani Wijaya', 'Eko Prasetyo', 'Siti Rahayu', 'Joko Widodo', 'Maya Putri', 'Agus Susanto', 'Dewi Lestari', 'Rini Kusuma', 'Hendra Wijaya', null, null];

      for (let i = 0; i < 50; i++) {
        const transactionId = uuidv4();
        const transactionNumber = `TRX${Date.now()}${i.toString().padStart(3, '0')}`;
        const daysAgo = Math.floor(Math.random() * 30);
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - daysAgo);
        transactionDate.setHours(Math.floor(Math.random() * 12) + 8); // 8am - 8pm
        transactionDate.setMinutes(Math.floor(Math.random() * 60));

        // Random items (2-5 items per transaction)
        const numItems = Math.floor(Math.random() * 4) + 2;
        const selectedProducts = (products as any[])
          .sort(() => Math.random() - 0.5)
          .slice(0, numItems);

        let subtotal = 0;
        const items: any[] = [];

        for (const product of selectedProducts) {
          const quantity = Math.floor(Math.random() * 3) + 1;
          const unitPrice = parseFloat(product.sell_price);
          const itemSubtotal = quantity * unitPrice;
          subtotal += itemSubtotal;

          items.push({
            id: uuidv4(),
            transactionId,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity,
            unitPrice,
            discount: 0,
            subtotal: itemSubtotal
          });
        }

        const discount = Math.random() > 0.8 ? Math.floor(subtotal * 0.1) : 0; // 20% chance of 10% discount
        const tax = Math.floor((subtotal - discount) * 0.1); // 10% tax
        const total = subtotal - discount + tax;
        const paidAmount = Math.ceil(total / 10000) * 10000; // Round up to nearest 10k
        const changeAmount = paidAmount - total;
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];

        // Insert transaction with correct column names from migration
        // Note: branch_id may not exist if migration wasn't run, so we skip it
        await sequelize.query(`
          INSERT INTO pos_transactions (
            id, transaction_number, cashier_id, transaction_date,
            subtotal, tax_amount, discount_amount, service_charge, total_amount, 
            payment_method, payment_status, order_type, status, customer_name, 
            created_at, updated_at
          ) VALUES (
            :id, :transactionNumber, :cashierId, :transactionDate,
            :subtotal, :taxAmount, :discountAmount, 0, :totalAmount, 
            :paymentMethod, 'paid', :orderType, 'closed', :customerName, 
            :transactionDate, :transactionDate
          )
        `, {
          replacements: {
            id: transactionId,
            transactionNumber,
            cashierId,
            transactionDate: transactionDate.toISOString(),
            subtotal,
            taxAmount: tax,
            discountAmount: discount,
            totalAmount: total,
            paymentMethod,
            orderType: ['dine-in', 'takeaway', 'delivery'][Math.floor(Math.random() * 3)],
            customerName
          }
        });

        // Insert transaction items with correct column names
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO pos_transaction_items (
              id, pos_transaction_id, product_id, product_name,
              quantity, unit_price, total_price, discount_amount, created_at, updated_at
            ) VALUES (
              :id, :transactionId, :productId, :productName,
              :quantity, :unitPrice, :totalPrice, :discountAmount, NOW(), NOW()
            )
          `, {
            replacements: {
              id: item.id,
              transactionId: item.transactionId,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.subtotal,
              discountAmount: item.discount
            }
          });
        }

        results.transactions.created++;
      }
      } // Close else block for posTransactionsExists
    }

    res.status(200).json({
      success: true,
      message: 'POS data seeded successfully',
      results
    });

  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
