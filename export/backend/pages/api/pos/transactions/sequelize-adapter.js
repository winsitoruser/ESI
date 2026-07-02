import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
const { getTransactions, getTransactionById, createTransaction } = require('../../../../server/sequelize/adapters/pos-adapter');

export default async function handler(req, res) {
  // Pastikan user terautentikasi
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Pastikan request memiliki tenantId (dari session)
  const tenantId = session?.user?.tenantId;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }

  // Proses request berdasarkan HTTP method
  try {
    switch (req.method) {
      case 'GET':
        // Handle GET request (mendapatkan daftar transaksi atau transaksi spesifik)
        if (req.query.id) {
          // Mendapatkan transaksi berdasarkan ID
          const transaction = await getTransactionById(req.query.id);
          
          if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
          }
          
          // Periksa apakah transaksi milik tenant yang sama
          if (transaction.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Access forbidden to this transaction' });
          }
          
          return res.status(200).json(transaction);
        } else {
          // Mendapatkan daftar transaksi dengan filtering dan pagination
          const limit = parseInt(req.query.limit || '100', 10);
          const offset = parseInt(req.query.offset || '0', 10);
          
          // Extract filters from query
          const filters = {};
          if (req.query.startDate && req.query.endDate) {
            filters.startDate = req.query.startDate;
            filters.endDate = req.query.endDate;
          }
          
          if (req.query.paymentMethod) {
            filters.paymentMethod = req.query.paymentMethod;
          }
          
          if (req.query.paymentStatus) {
            filters.paymentStatus = req.query.paymentStatus;
          }
          
          const transactions = await getTransactions(tenantId, limit, offset, filters);
          return res.status(200).json(transactions);
        }
      
      case 'POST':
        // Handle POST request (membuat transaksi baru)
        const transactionData = {
          ...req.body,
          tenantId
        };
        
        const newTransaction = await createTransaction(transactionData);
        return res.status(201).json(newTransaction);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in transactions API:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
