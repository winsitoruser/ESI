const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function verifyAndAddTransactions() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check existing transactions
    console.log('📊 Checking existing transactions...');
    const [existingTransactions] = await sequelize.query(`
      SELECT COUNT(*) as count FROM finance_transactions WHERE "isActive" = true;
    `);
    
    const existingCount = parseInt(existingTransactions[0].count);
    console.log(`Found ${existingCount} existing transactions\n`);

    // Get sample of existing transactions
    if (existingCount > 0) {
      console.log('📋 Sample of existing transactions:');
      const [sampleTransactions] = await sequelize.query(`
        SELECT 
          "transactionNumber",
          "transactionDate",
          "transactionType",
          category,
          amount,
          description
        FROM finance_transactions 
        WHERE "isActive" = true
        ORDER BY "transactionDate" DESC
        LIMIT 5;
      `);
      
      console.table(sampleTransactions);
    }

    // Add more sample transactions if needed
    if (existingCount < 10) {
      console.log('\n📝 Adding more sample transactions...');
      
      const today = new Date();
      const transactions = [];
      
      // Generate 15 more transactions for the last 30 days
      for (let i = 0; i < 15; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const transactionDate = new Date(today);
        transactionDate.setDate(transactionDate.getDate() - daysAgo);
        
        const isIncome = Math.random() > 0.4; // 60% income, 40% expense
        const transactionType = isIncome ? 'income' : 'expense';
        
        const categories = isIncome 
          ? ['Sales', 'Service', 'Investment', 'Other Income']
          : ['Operating', 'Salary', 'Marketing', 'Utilities', 'Supplies'];
        
        const category = categories[Math.floor(Math.random() * categories.length)];
        
        const descriptions = isIncome
          ? [
              'Penjualan produk retail',
              'Pembayaran invoice pelanggan',
              'Pendapatan jasa konsultasi',
              'Penjualan online marketplace',
              'Pendapatan dari distributor'
            ]
          : [
              'Pembelian bahan baku',
              'Gaji karyawan',
              'Biaya marketing digital',
              'Pembayaran listrik dan air',
              'Pembelian perlengkapan kantor'
            ];
        
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        const amount = isIncome 
          ? Math.floor(Math.random() * 50000000) + 5000000  // 5jt - 55jt
          : Math.floor(Math.random() * 20000000) + 1000000; // 1jt - 21jt
        
        transactions.push({
          transactionNumber: `TRX-2026-${String(i + 100).padStart(3, '0')}`,
          transactionDate: transactionDate.toISOString(),
          transactionType,
          accountId: isIncome ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000006',
          category,
          subcategory: category,
          amount,
          description,
          paymentMethod: isIncome ? 'bank_transfer' : 'cash',
          status: 'completed',
          isRecurring: false,
          isActive: true
        });
      }
      
      // Insert transactions
      for (const tx of transactions) {
        await sequelize.query(`
          INSERT INTO finance_transactions (
            "transactionNumber",
            "transactionDate",
            "transactionType",
            "accountId",
            category,
            subcategory,
            amount,
            description,
            "paymentMethod",
            status,
            "isRecurring",
            "isActive",
            "createdAt",
            "updatedAt"
          ) VALUES (
            :transactionNumber,
            :transactionDate,
            :transactionType,
            :accountId,
            :category,
            :subcategory,
            :amount,
            :description,
            :paymentMethod,
            :status,
            :isRecurring,
            :isActive,
            NOW(),
            NOW()
          )
          ON CONFLICT ("transactionNumber") DO NOTHING;
        `, {
          replacements: tx
        });
      }
      
      console.log(`✅ Added ${transactions.length} new transactions\n`);
    }

    // Final count
    const [finalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM finance_transactions WHERE "isActive" = true;
    `);
    
    console.log(`\n📊 Total transactions in database: ${finalCount[0].count}`);

    // Show recent transactions
    console.log('\n📋 Recent 10 transactions:');
    const [recentTransactions] = await sequelize.query(`
      SELECT 
        "transactionNumber",
        TO_CHAR("transactionDate", 'YYYY-MM-DD') as date,
        "transactionType" as type,
        category,
        TO_CHAR(amount, 'FM999,999,999') as amount,
        description
      FROM finance_transactions 
      WHERE "isActive" = true
      ORDER BY "transactionDate" DESC
      LIMIT 10;
    `);
    
    console.table(recentTransactions);

    console.log('\n🎉 Verification complete!');
    console.log('\n💡 Now refresh your browser at http://localhost:3001/finance to see the transactions.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

verifyAndAddTransactions();
