/**
 * Finance Integration Helper
 * Handles automatic finance transaction creation from other modules
 */

const FinanceTransaction = require('../../models/FinanceTransaction');
const FinanceAccount = require('../../models/FinanceAccount');

interface TransactionData {
  amount: number;
  description: string;
  referenceType: 'invoice' | 'bill' | 'order' | 'manual' | 'other';
  referenceId: string;
  contactName?: string;
  contactId?: string;
  category: string;
  subcategory?: string;
  paymentMethod?: string;
  notes?: string;
}

/**
 * Create finance transaction from POS sale
 */
export async function createFinanceTransactionFromPOS(
  posTransaction: any,
  userId?: string
): Promise<any> {
  try {
    // Find revenue account (Pendapatan Penjualan)
    const revenueAccount = await FinanceAccount.findOne({
      where: {
        accountType: 'revenue',
        category: 'Sales',
        isActive: true
      }
    });

    if (!revenueAccount) {
      throw new Error('Revenue account not found');
    }

    // Find cash/bank account based on payment method
    let cashAccount;
    if (posTransaction.paymentMethod === 'cash') {
      cashAccount = await FinanceAccount.findOne({
        where: { category: 'Cash', isActive: true }
      });
    } else {
      cashAccount = await FinanceAccount.findOne({
        where: { category: 'Bank', isActive: true }
      });
    }

    if (!cashAccount) {
      throw new Error('Cash/Bank account not found');
    }

    // Generate transaction number
    const lastTransaction = await FinanceTransaction.findOne({
      order: [['createdAt', 'DESC']]
    });

    let transactionNumber = 'TRX-2026-001';
    if (lastTransaction) {
      const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2]);
      transactionNumber = `TRX-2026-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Create finance transaction
    const financeTransaction = await FinanceTransaction.create({
      transactionNumber,
      transactionDate: posTransaction.createdAt || new Date(),
      transactionType: 'income',
      accountId: cashAccount.id,
      category: 'Sales',
      subcategory: 'POS Sales',
      amount: posTransaction.totalAmount || posTransaction.total,
      description: `Penjualan POS - ${posTransaction.transactionNumber || posTransaction.id}`,
      referenceType: 'order',
      referenceId: posTransaction.id,
      paymentMethod: posTransaction.paymentMethod || 'cash',
      contactName: posTransaction.customerName || 'Walk-in Customer',
      contactId: posTransaction.customerId,
      notes: `Auto-generated from POS transaction`,
      status: 'completed',
      createdBy: userId,
      isActive: true
    });

    // Update cash/bank account balance
    await cashAccount.update({
      balance: parseFloat(cashAccount.balance) + parseFloat(posTransaction.totalAmount || posTransaction.total)
    });

    return financeTransaction;
  } catch (error) {
    console.error('Error creating finance transaction from POS:', error);
    throw error;
  }
}

/**
 * Create finance transaction from Inventory purchase
 */
export async function createFinanceTransactionFromPurchase(
  purchaseOrder: any,
  userId?: string
): Promise<any> {
  try {
    // Find expense account
    const expenseAccount = await FinanceAccount.findOne({
      where: {
        accountType: 'expense',
        category: 'Operating',
        isActive: true
      }
    });

    if (!expenseAccount) {
      throw new Error('Expense account not found');
    }

    // Find cash/bank account
    const cashAccount = await FinanceAccount.findOne({
      where: { 
        accountType: 'asset',
        category: purchaseOrder.paymentMethod === 'cash' ? 'Cash' : 'Bank',
        isActive: true 
      }
    });

    if (!cashAccount) {
      throw new Error('Cash/Bank account not found');
    }

    // Generate transaction number
    const lastTransaction = await FinanceTransaction.findOne({
      order: [['createdAt', 'DESC']]
    });

    let transactionNumber = 'TRX-2026-001';
    if (lastTransaction) {
      const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2]);
      transactionNumber = `TRX-2026-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Create finance transaction
    const financeTransaction = await FinanceTransaction.create({
      transactionNumber,
      transactionDate: purchaseOrder.orderDate || new Date(),
      transactionType: 'expense',
      accountId: cashAccount.id,
      category: 'Operating',
      subcategory: 'Inventory Purchase',
      amount: purchaseOrder.totalAmount || purchaseOrder.total,
      description: `Pembelian Inventory - ${purchaseOrder.poNumber || purchaseOrder.id}`,
      referenceType: 'bill',
      referenceId: purchaseOrder.id,
      paymentMethod: purchaseOrder.paymentMethod || 'bank_transfer',
      contactName: purchaseOrder.supplierName,
      contactId: purchaseOrder.supplierId,
      notes: `Auto-generated from Purchase Order`,
      status: purchaseOrder.paymentStatus === 'paid' ? 'completed' : 'pending',
      createdBy: userId,
      isActive: true
    });

    // Update cash/bank account balance if paid
    if (purchaseOrder.paymentStatus === 'paid') {
      await cashAccount.update({
        balance: parseFloat(cashAccount.balance) - parseFloat(purchaseOrder.totalAmount || purchaseOrder.total)
      });
    }

    return financeTransaction;
  } catch (error) {
    console.error('Error creating finance transaction from purchase:', error);
    throw error;
  }
}

/**
 * Create finance transaction from Invoice payment
 */
export async function createFinanceTransactionFromInvoice(
  invoice: any,
  payment: any,
  userId?: string
): Promise<any> {
  try {
    // Find revenue account
    const revenueAccount = await FinanceAccount.findOne({
      where: {
        accountType: 'revenue',
        category: 'Sales',
        isActive: true
      }
    });

    if (!revenueAccount) {
      throw new Error('Revenue account not found');
    }

    // Find receivables account
    const receivablesAccount = await FinanceAccount.findOne({
      where: {
        accountType: 'asset',
        category: 'Receivables',
        isActive: true
      }
    });

    // Find cash/bank account
    const cashAccount = await FinanceAccount.findOne({
      where: { 
        accountType: 'asset',
        category: payment.paymentMethod === 'cash' ? 'Cash' : 'Bank',
        isActive: true 
      }
    });

    if (!cashAccount) {
      throw new Error('Cash/Bank account not found');
    }

    // Generate transaction number
    const lastTransaction = await FinanceTransaction.findOne({
      order: [['createdAt', 'DESC']]
    });

    let transactionNumber = 'TRX-2026-001';
    if (lastTransaction) {
      const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2]);
      transactionNumber = `TRX-2026-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Create finance transaction
    const financeTransaction = await FinanceTransaction.create({
      transactionNumber,
      transactionDate: payment.paymentDate || new Date(),
      transactionType: 'income',
      accountId: cashAccount.id,
      category: 'Sales',
      subcategory: 'Invoice Payment',
      amount: payment.amount,
      description: `Pembayaran Invoice - ${invoice.invoiceNumber}`,
      referenceType: 'invoice',
      referenceId: invoice.id,
      paymentMethod: payment.paymentMethod,
      contactName: invoice.customerName,
      contactId: invoice.customerId,
      notes: `Auto-generated from Invoice payment`,
      status: 'completed',
      createdBy: userId,
      isActive: true
    });

    // Update cash account balance
    await cashAccount.update({
      balance: parseFloat(cashAccount.balance) + parseFloat(payment.amount)
    });

    // Update receivables account if exists
    if (receivablesAccount) {
      await receivablesAccount.update({
        balance: parseFloat(receivablesAccount.balance) - parseFloat(payment.amount)
      });
    }

    return financeTransaction;
  } catch (error) {
    console.error('Error creating finance transaction from invoice:', error);
    throw error;
  }
}

/**
 * Create finance transaction from Expense
 */
export async function createFinanceTransactionFromExpense(
  expense: any,
  userId?: string
): Promise<any> {
  try {
    // Find expense account by category
    const expenseAccount = await FinanceAccount.findOne({
      where: {
        accountType: 'expense',
        isActive: true
      }
    });

    if (!expenseAccount) {
      throw new Error('Expense account not found');
    }

    // Find cash/bank account
    const cashAccount = await FinanceAccount.findOne({
      where: { 
        accountType: 'asset',
        category: expense.paymentMethod === 'cash' ? 'Cash' : 'Bank',
        isActive: true 
      }
    });

    if (!cashAccount) {
      throw new Error('Cash/Bank account not found');
    }

    // Generate transaction number
    const lastTransaction = await FinanceTransaction.findOne({
      order: [['createdAt', 'DESC']]
    });

    let transactionNumber = 'TRX-2026-001';
    if (lastTransaction) {
      const lastNumber = parseInt(lastTransaction.transactionNumber.split('-')[2]);
      transactionNumber = `TRX-2026-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Create finance transaction
    const financeTransaction = await FinanceTransaction.create({
      transactionNumber,
      transactionDate: expense.expenseDate || new Date(),
      transactionType: 'expense',
      accountId: cashAccount.id,
      category: expense.category || 'Operating',
      subcategory: expense.subcategory,
      amount: expense.amount,
      description: expense.description || `Pengeluaran - ${expense.category}`,
      referenceType: 'manual',
      referenceId: expense.id,
      paymentMethod: expense.paymentMethod,
      contactName: expense.vendor || expense.recipient,
      notes: expense.notes,
      attachments: expense.attachments,
      status: 'completed',
      createdBy: userId,
      isActive: true
    });

    // Update cash account balance
    await cashAccount.update({
      balance: parseFloat(cashAccount.balance) - parseFloat(expense.amount)
    });

    return financeTransaction;
  } catch (error) {
    console.error('Error creating finance transaction from expense:', error);
    throw error;
  }
}

/**
 * Update finance transaction when source is updated
 */
export async function updateFinanceTransactionFromSource(
  referenceType: string,
  referenceId: string,
  updates: any
): Promise<any> {
  try {
    const financeTransaction = await FinanceTransaction.findOne({
      where: {
        referenceType,
        referenceId,
        isActive: true
      }
    });

    if (!financeTransaction) {
      return null; // No finance transaction found
    }

    // Update transaction
    await financeTransaction.update(updates);

    return financeTransaction;
  } catch (error) {
    console.error('Error updating finance transaction:', error);
    throw error;
  }
}

/**
 * Delete finance transaction when source is deleted
 */
export async function deleteFinanceTransactionFromSource(
  referenceType: string,
  referenceId: string
): Promise<boolean> {
  try {
    const financeTransaction = await FinanceTransaction.findOne({
      where: {
        referenceType,
        referenceId,
        isActive: true
      },
      include: [{
        model: FinanceAccount,
        as: 'account'
      }]
    });

    if (!financeTransaction) {
      return false; // No finance transaction found
    }

    const account = financeTransaction.account;
    const amount = parseFloat(financeTransaction.amount);

    // Reverse account balance
    if (financeTransaction.transactionType === 'income') {
      await account.update({
        balance: parseFloat(account.balance) - amount
      });
    } else if (financeTransaction.transactionType === 'expense') {
      await account.update({
        balance: parseFloat(account.balance) + amount
      });
    }

    // Soft delete
    await financeTransaction.update({
      isActive: false,
      status: 'cancelled'
    });

    return true;
  } catch (error) {
    console.error('Error deleting finance transaction:', error);
    throw error;
  }
}

export default {
  createFinanceTransactionFromPOS,
  createFinanceTransactionFromPurchase,
  createFinanceTransactionFromInvoice,
  createFinanceTransactionFromExpense,
  updateFinanceTransactionFromSource,
  deleteFinanceTransactionFromSource
};
