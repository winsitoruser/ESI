import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '@/lib/sequelize';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get a valid user ID for cashier - pos_transactions expects UUID type
    // Check if users table has UUID or integer IDs
    const [users] = await sequelize.query(`SELECT id FROM users WHERE is_active = true LIMIT 1`);
    let cashierId: string;
    
    if ((users as any[]).length > 0) {
      const userId = (users as any[])[0].id;
      // If ID is integer, generate a consistent UUID for this user
      if (typeof userId === 'number') {
        // Use a deterministic UUID based on user ID for consistency
        cashierId = uuidv4();
      } else {
        cashierId = userId;
      }
    } else {
      // No users exist, use a placeholder UUID
      cashierId = uuidv4();
    }

    // Get products for transactions
    const [products] = await sequelize.query(`
      SELECT id, name, sell_price FROM products WHERE is_active = true LIMIT 20
    `);

    if ((products as any[]).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No products found. Please seed products first.' 
      });
    }

    // Payment methods matching the enum
    const paymentMethods = ['cash', 'cash', 'cash', 'card', 'card', 'transfer', 'ewallet', 'ewallet', 'mixed'];
    const orderTypes = ['dine-in', 'takeaway', 'delivery'];
    const customerNames = [
      'Budi Santoso', 'Ani Wijaya', 'Eko Prasetyo', 'Siti Rahayu', 
      'Joko Widodo', 'Maya Putri', 'Agus Susanto', 'Dewi Lestari',
      'Rini Kusuma', 'Hendra Wijaya', 'Andi Pratama', 'Lisa Permata',
      null, null, null
    ];

    let createdCount = 0;

    // Create 50 transactions over the past 30 days
    for (let i = 0; i < 50; i++) {
      const transactionId = uuidv4();
      const transactionNumber = `TRX${Date.now()}${i.toString().padStart(4, '0')}`;
      
      // Random date within last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - daysAgo);
      transactionDate.setHours(Math.floor(Math.random() * 12) + 8);
      transactionDate.setMinutes(Math.floor(Math.random() * 60));

      // Random items (2-5 items per transaction)
      const numItems = Math.floor(Math.random() * 4) + 2;
      const selectedProducts = [...(products as any[])]
        .sort(() => Math.random() - 0.5)
        .slice(0, numItems);

      let subtotal = 0;
      const items: any[] = [];

      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1;
        const unitPrice = parseFloat(product.sell_price);
        const totalPrice = quantity * unitPrice;
        subtotal += totalPrice;

        // Convert integer product ID to UUID format if needed
        let productIdUuid: string;
        if (typeof product.id === 'number') {
          // Create a deterministic UUID from integer ID
          productIdUuid = `00000000-0000-0000-0000-${product.id.toString().padStart(12, '0')}`;
        } else {
          productIdUuid = product.id;
        }

        items.push({
          id: uuidv4(),
          transactionId,
          productId: productIdUuid,
          productName: product.name,
          quantity,
          unitPrice,
          totalPrice,
          discountAmount: 0
        });
      }

      const discountAmount = Math.random() > 0.8 ? Math.floor(subtotal * 0.1) : 0;
      const taxAmount = Math.floor((subtotal - discountAmount) * 0.1);
      const totalAmount = subtotal - discountAmount + taxAmount;
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
      const tableNumber = orderType === 'dine-in' ? `T${Math.floor(Math.random() * 20) + 1}` : null;

      try {
        // Insert transaction
        await sequelize.query(`
          INSERT INTO pos_transactions (
            id, transaction_number, cashier_id, transaction_date,
            subtotal, tax_amount, discount_amount, service_charge, total_amount, 
            payment_method, payment_status, order_type, status, customer_name,
            table_number, created_at, updated_at
          ) VALUES (
            :id, :transactionNumber, :cashierId, :transactionDate,
            :subtotal, :taxAmount, :discountAmount, 0, :totalAmount, 
            :paymentMethod, 'paid', :orderType, 'closed', :customerName,
            :tableNumber, :createdAt, :updatedAt
          )
        `, {
          replacements: {
            id: transactionId,
            transactionNumber,
            cashierId,
            transactionDate: transactionDate.toISOString(),
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            paymentMethod,
            orderType,
            customerName,
            tableNumber,
            createdAt: transactionDate.toISOString(),
            updatedAt: transactionDate.toISOString()
          }
        });

        // Insert transaction items
        for (const item of items) {
          await sequelize.query(`
            INSERT INTO pos_transaction_items (
              id, pos_transaction_id, product_id, product_name,
              quantity, unit_price, total_price, discount_amount, 
              created_at, updated_at
            ) VALUES (
              :id, :transactionId, :productId, :productName,
              :quantity, :unitPrice, :totalPrice, :discountAmount,
              NOW(), NOW()
            )
          `, {
            replacements: {
              id: item.id,
              transactionId: item.transactionId,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              discountAmount: item.discountAmount
            }
          });
        }

        createdCount++;
      } catch (insertError: any) {
        console.error(`Error inserting transaction ${i}:`, insertError.message);
        // Return the first error to help debug
        if (createdCount === 0) {
          return res.status(500).json({
            success: false,
            error: insertError.message,
            transactionAttempted: i,
            cashierId,
            hint: 'Check column types and constraints'
          });
        }
      }
    }

    // Get summary statistics
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        payment_method,
        COUNT(*) as method_count
      FROM pos_transactions 
      WHERE payment_status = 'paid'
      GROUP BY payment_method
      ORDER BY method_count DESC
    `);

    res.status(200).json({
      success: true,
      message: `Successfully created ${createdCount} transactions`,
      stats: {
        transactionsCreated: createdCount,
        paymentMethodBreakdown: stats
      }
    });

  } catch (error: any) {
    console.error('Seed transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure users and products exist, and pos_transactions table is properly migrated'
    });
  }
}
