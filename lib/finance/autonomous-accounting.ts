/**
 * Autonomous Accounting Engine
 * 
 * AI-powered autonomous accounting tasks that can execute without human intervention.
 * Each task has: detection → planning → execution → verification → logging
 * 
 * Tasks:
 * 1. Auto-Categorize uncategorized transactions
 * 2. Auto-Journal Entry from completed transactions
 * 3. Auto-Reconcile bank statements vs recorded transactions
 * 4. Auto-Invoice Follow-up for overdue receivables
 * 5. Auto-Period Closing (month-end adjustments)
 * 6. Auto-Tax Calculation (monthly PPN/PPh)
 * 7. Auto-Expense Approval (rule-based small amounts)
 */

export type TaskType =
  | 'auto_categorize'
  | 'auto_journal'
  | 'auto_reconcile'
  | 'auto_invoice_followup'
  | 'auto_period_close'
  | 'auto_tax_calc'
  | 'auto_expense_approve';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'needs_approval';

export interface AutonomousTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  status: TaskStatus;
  requiresApproval: boolean;
  affectedRecords: number;
  changes: TaskChange[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
  executedBy: 'ai' | 'human';
}

export interface TaskChange {
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: string;
  description: string;
  before?: any;
  after?: any;
}

export interface TaskConfig {
  enabled: boolean;
  autoApprove: boolean;
  maxAmountAutoApprove: number;
  schedule?: string;
}

// ═══════════════════════════════════════════════
// TASK 1: AUTO-CATEGORIZE TRANSACTIONS
// ═══════════════════════════════════════════════
const CATEGORY_RULES: Record<string, { keywords: string[]; category: string; subcategory?: string; expenseType?: string }[]> = {
  income: [
    { keywords: ['penjualan', 'sales', 'jual', 'revenue', 'pendapatan'], category: 'Sales', subcategory: 'Product Sales' },
    { keywords: ['jasa', 'service', 'konsultasi', 'consulting'], category: 'Service Revenue', subcategory: 'Consulting' },
    { keywords: ['bunga', 'interest', 'deposito'], category: 'Interest Income' },
    { keywords: ['sewa', 'rent', 'rental'], category: 'Rental Income' },
    { keywords: ['komisi', 'commission', 'referral'], category: 'Commission Income' },
  ],
  expense: [
    { keywords: ['gaji', 'salary', 'payroll', 'upah', 'honor'], category: 'Payroll', expenseType: 'opex' },
    { keywords: ['listrik', 'pln', 'electricity', 'air', 'pdam'], category: 'Utilities', expenseType: 'opex' },
    { keywords: ['sewa', 'rent', 'rental', 'gedung', 'kantor'], category: 'Rent', expenseType: 'opex' },
    { keywords: ['bahan', 'material', 'raw', 'hpp', 'cogs', 'baku'], category: 'COGS', subcategory: 'Raw Materials', expenseType: 'opex' },
    { keywords: ['marketing', 'iklan', 'advertising', 'promo', 'ads'], category: 'Marketing', expenseType: 'opex' },
    { keywords: ['transport', 'bensin', 'fuel', 'ongkir', 'kirim', 'logistik'], category: 'Logistics', expenseType: 'opex' },
    { keywords: ['maintenance', 'perbaikan', 'repair', 'servis'], category: 'Maintenance', expenseType: 'opex' },
    { keywords: ['asuransi', 'insurance'], category: 'Insurance', expenseType: 'opex' },
    { keywords: ['peralatan', 'equipment', 'mesin', 'komputer', 'laptop'], category: 'Equipment', expenseType: 'capex' },
    { keywords: ['renovasi', 'konstruksi', 'building', 'bangun'], category: 'Construction', expenseType: 'capex' },
    { keywords: ['kendaraan', 'vehicle', 'mobil', 'motor'], category: 'Vehicle', expenseType: 'capex' },
    { keywords: ['pajak', 'tax', 'ppn', 'pph'], category: 'Tax', expenseType: 'opex' },
  ],
};

export function autoCategorizeTransactions(transactions: any[]): { task: AutonomousTask; updates: any[] } {
  const changes: TaskChange[] = [];
  const updates: any[] = [];

  for (const tx of transactions) {
    const txType = tx.transactionType || tx.transaction_type || '';
    const desc = (tx.description || '').toLowerCase();
    const contactName = (tx.contactName || tx.contact_name || '').toLowerCase();
    const searchText = `${desc} ${contactName}`;

    if (tx.category && tx.category !== '' && tx.category !== 'Uncategorized') continue;

    const rules = CATEGORY_RULES[txType] || [];
    let matched = false;

    for (const rule of rules) {
      if (rule.keywords.some(kw => searchText.includes(kw))) {
        const update: any = {
          id: tx.id,
          category: rule.category,
          subcategory: rule.subcategory || null,
        };
        if (rule.expenseType) update.expense_type = rule.expenseType;

        updates.push(update);
        changes.push({
          action: 'update',
          entityType: 'finance_transaction',
          entityId: tx.id,
          description: `Kategorikan "${tx.transactionNumber || 'N/A'}" → ${rule.category}${rule.subcategory ? '/' + rule.subcategory : ''}`,
          before: { category: tx.category || null },
          after: { category: rule.category, subcategory: rule.subcategory },
        });
        matched = true;
        break;
      }
    }

    if (!matched && !tx.category) {
      updates.push({ id: tx.id, category: 'Other', subcategory: txType === 'income' ? 'Other Income' : 'Other Expense' });
      changes.push({
        action: 'update',
        entityType: 'finance_transaction',
        entityId: tx.id,
        description: `Kategorikan "${tx.transactionNumber || 'N/A'}" → Other (tidak dapat diidentifikasi otomatis)`,
        before: { category: null },
        after: { category: 'Other' },
      });
    }
  }

  return {
    task: {
      id: `task-cat-${Date.now()}`,
      type: 'auto_categorize',
      title: 'Auto-Kategorisasi Transaksi',
      description: `${changes.length} transaksi tanpa kategori ditemukan dan dikategorikan otomatis berdasarkan deskripsi`,
      status: 'pending',
      requiresApproval: false,
      affectedRecords: changes.length,
      changes,
      executedBy: 'ai',
    },
    updates,
  };
}

// ═══════════════════════════════════════════════
// TASK 2: AUTO-JOURNAL ENTRY
// ═══════════════════════════════════════════════
const ACCOUNT_MAP: Record<string, { debitAccount: string; creditAccount: string }> = {
  'income:Sales': { debitAccount: '1-1100', creditAccount: '4-1000' },
  'income:Service Revenue': { debitAccount: '1-1100', creditAccount: '4-2000' },
  'income:Interest Income': { debitAccount: '1-1100', creditAccount: '4-3000' },
  'income:Other Income': { debitAccount: '1-1100', creditAccount: '4-9000' },
  'expense:COGS': { debitAccount: '5-1000', creditAccount: '1-1100' },
  'expense:Payroll': { debitAccount: '5-2000', creditAccount: '1-1100' },
  'expense:Rent': { debitAccount: '5-3000', creditAccount: '1-1100' },
  'expense:Utilities': { debitAccount: '5-4000', creditAccount: '1-1100' },
  'expense:Marketing': { debitAccount: '5-5000', creditAccount: '1-1100' },
  'expense:Logistics': { debitAccount: '5-6000', creditAccount: '1-1100' },
  'expense:Maintenance': { debitAccount: '5-7000', creditAccount: '1-1100' },
  'expense:Equipment': { debitAccount: '1-3000', creditAccount: '1-1100' },
  'expense:Tax': { debitAccount: '5-9000', creditAccount: '1-1100' },
  'expense:Other Expense': { debitAccount: '5-9900', creditAccount: '1-1100' },
};

export function autoCreateJournalEntries(transactions: any[]): { task: AutonomousTask; journals: any[] } {
  const changes: TaskChange[] = [];
  const journals: any[] = [];

  for (const tx of transactions) {
    const txType = tx.transactionType || tx.transaction_type || '';
    const category = tx.category || 'Other';
    const amount = parseFloat(tx.amount || 0);
    if (amount <= 0) continue;

    const mapKey = `${txType}:${category}`;
    const mapping = ACCOUNT_MAP[mapKey] || ACCOUNT_MAP[`${txType}:Other ${txType === 'income' ? 'Income' : 'Expense'}`];
    if (!mapping) continue;

    const entryNumber = `AJ-${(tx.transactionDate || new Date().toISOString()).slice(0, 10).replace(/-/g, '')}-${tx.id?.slice(-4) || '0000'}`;

    journals.push({
      entry_number: entryNumber,
      entry_date: tx.transactionDate || tx.transaction_date || new Date().toISOString(),
      description: `Auto-jurnal: ${tx.description || tx.transactionNumber || 'N/A'}`,
      reference_type: 'finance_transaction',
      reference_id: tx.id,
      status: 'draft',
      total_debit: amount,
      total_credit: amount,
      lines: [
        { account_number: mapping.debitAccount, description: `Debit - ${category}`, debit_amount: amount, credit_amount: 0 },
        { account_number: mapping.creditAccount, description: `Credit - ${category}`, debit_amount: 0, credit_amount: amount },
      ],
    });

    changes.push({
      action: 'create',
      entityType: 'journal_entry',
      description: `Buat jurnal ${entryNumber}: Dr ${mapping.debitAccount} / Cr ${mapping.creditAccount} = Rp ${amount.toLocaleString('id-ID')}`,
      after: { entryNumber, debitAccount: mapping.debitAccount, creditAccount: mapping.creditAccount, amount },
    });
  }

  return {
    task: {
      id: `task-jrn-${Date.now()}`,
      type: 'auto_journal',
      title: 'Auto-Jurnal Entri',
      description: `${journals.length} jurnal entri otomatis dibuat dari transaksi yang belum dijurnal (double-entry)`,
      status: 'needs_approval',
      requiresApproval: true,
      affectedRecords: journals.length,
      changes,
      executedBy: 'ai',
    },
    journals,
  };
}

// ═══════════════════════════════════════════════
// TASK 3: AUTO-RECONCILIATION
// ═══════════════════════════════════════════════
export function autoReconcileTransactions(
  recorded: any[],
  bankStatements: any[]
): { task: AutonomousTask; matched: any[]; unmatched: { recorded: any[]; bank: any[] } } {
  const matched: any[] = [];
  const unmatchedRecorded = [...recorded];
  const unmatchedBank = [...bankStatements];
  const changes: TaskChange[] = [];

  for (let i = unmatchedBank.length - 1; i >= 0; i--) {
    const bs = unmatchedBank[i];
    const bsAmount = parseFloat(bs.amount || 0);
    const bsDate = (bs.date || bs.transaction_date || '').toString().slice(0, 10);

    // Try exact match: same amount + same date (±2 days)
    const matchIdx = unmatchedRecorded.findIndex(r => {
      const rAmount = parseFloat(r.amount || 0);
      const rDate = (r.transactionDate || r.transaction_date || '').toString().slice(0, 10);
      const daysDiff = Math.abs(new Date(bsDate).getTime() - new Date(rDate).getTime()) / (1000 * 60 * 60 * 24);
      return Math.abs(rAmount - bsAmount) < 1 && daysDiff <= 2;
    });

    if (matchIdx !== -1) {
      const rec = unmatchedRecorded[matchIdx];
      matched.push({
        bankStatement: bs,
        transaction: rec,
        confidence: 'high',
        matchType: 'exact_amount_date',
      });

      changes.push({
        action: 'update',
        entityType: 'finance_transaction',
        entityId: rec.id,
        description: `Rekonsiliasi: "${rec.transactionNumber || 'N/A'}" ↔ Bank "${bs.reference || bs.description || 'N/A'}" (Rp ${bsAmount.toLocaleString('id-ID')})`,
        before: { reconciled: false },
        after: { reconciled: true, bankReference: bs.reference },
      });

      unmatchedRecorded.splice(matchIdx, 1);
      unmatchedBank.splice(i, 1);
    }
  }

  // Fuzzy match: same amount but different date (±7 days)
  for (let i = unmatchedBank.length - 1; i >= 0; i--) {
    const bs = unmatchedBank[i];
    const bsAmount = parseFloat(bs.amount || 0);
    const bsDate = (bs.date || bs.transaction_date || '').toString().slice(0, 10);

    const matchIdx = unmatchedRecorded.findIndex(r => {
      const rAmount = parseFloat(r.amount || 0);
      const rDate = (r.transactionDate || r.transaction_date || '').toString().slice(0, 10);
      const daysDiff = Math.abs(new Date(bsDate).getTime() - new Date(rDate).getTime()) / (1000 * 60 * 60 * 24);
      return Math.abs(rAmount - bsAmount) < 1 && daysDiff <= 7;
    });

    if (matchIdx !== -1) {
      const rec = unmatchedRecorded[matchIdx];
      matched.push({
        bankStatement: bs,
        transaction: rec,
        confidence: 'medium',
        matchType: 'fuzzy_amount_date',
      });

      changes.push({
        action: 'update',
        entityType: 'finance_transaction',
        entityId: rec.id,
        description: `Rekonsiliasi (fuzzy): "${rec.transactionNumber || 'N/A'}" ↔ Bank "${bs.reference || 'N/A'}" - tanggal berbeda tapi jumlah cocok`,
        before: { reconciled: false },
        after: { reconciled: true, bankReference: bs.reference, confidence: 'medium' },
      });

      unmatchedRecorded.splice(matchIdx, 1);
      unmatchedBank.splice(i, 1);
    }
  }

  return {
    task: {
      id: `task-rec-${Date.now()}`,
      type: 'auto_reconcile',
      title: 'Auto-Rekonsiliasi Bank',
      description: `${matched.length} transaksi berhasil dicocokkan, ${unmatchedBank.length} mutasi bank belum terrekonsiliasi, ${unmatchedRecorded.length} transaksi sistem belum terrekonsiliasi`,
      status: matched.length > 0 ? 'needs_approval' : 'completed',
      requiresApproval: matched.length > 0,
      affectedRecords: matched.length,
      changes,
      executedBy: 'ai',
    },
    matched,
    unmatched: { recorded: unmatchedRecorded, bank: unmatchedBank },
  };
}

// ═══════════════════════════════════════════════
// TASK 4: AUTO-INVOICE FOLLOW-UP
// ═══════════════════════════════════════════════
export function autoInvoiceFollowUp(invoices: any[]): { task: AutonomousTask; actions: any[] } {
  const changes: TaskChange[] = [];
  const actions: any[] = [];
  const now = new Date();

  for (const inv of invoices) {
    const status = inv.status || inv.paymentStatus || inv.payment_status;
    if (status === 'paid' || status === 'cancelled') continue;

    const dueDate = new Date(inv.dueDate || inv.due_date);
    if (isNaN(dueDate.getTime())) continue;

    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = parseFloat(inv.remainingAmount || inv.remaining_amount || inv.totalAmount || inv.total_amount || 0);
    const invNumber = inv.invoiceNumber || inv.invoice_number || 'N/A';
    const customerName = inv.customerName || inv.customer_name || inv.supplierName || inv.supplier_name || 'N/A';

    if (daysPastDue > 0) {
      let actionType: string;
      let message: string;
      let priority: string;

      if (daysPastDue <= 7) {
        actionType = 'soft_reminder';
        priority = 'medium';
        message = `Pengingat lunak: Invoice ${invNumber} untuk ${customerName} sebesar Rp ${remaining.toLocaleString('id-ID')} telah jatuh tempo ${daysPastDue} hari lalu. Kirim pengingat pembayaran.`;
      } else if (daysPastDue <= 30) {
        actionType = 'formal_reminder';
        priority = 'high';
        message = `Pengingat formal: Invoice ${invNumber} sudah ${daysPastDue} hari melewati jatuh tempo. Pertimbangkan menghubungi langsung dan negosiasi jadwal pembayaran.`;
      } else if (daysPastDue <= 60) {
        actionType = 'escalation';
        priority = 'high';
        message = `Eskalasi: Invoice ${invNumber} sudah ${daysPastDue} hari melewati jatuh tempo (Rp ${remaining.toLocaleString('id-ID')}). Pertimbangkan surat somasi atau penyisihan piutang.`;
      } else {
        actionType = 'write_off_review';
        priority = 'critical';
        message = `Review Write-off: Invoice ${invNumber} sudah ${daysPastDue} hari melewati jatuh tempo. Pertimbangkan penghapusan piutang (write-off) atau tindakan hukum.`;
      }

      actions.push({
        invoiceId: inv.id,
        invoiceNumber: invNumber,
        customerName,
        amount: remaining,
        daysPastDue,
        actionType,
        priority,
        message,
        suggestedDate: new Date().toISOString(),
      });

      changes.push({
        action: 'create',
        entityType: 'follow_up_action',
        description: `[${actionType}] ${invNumber} - ${customerName}: ${daysPastDue} hari lewat jatuh tempo, Rp ${remaining.toLocaleString('id-ID')}`,
        after: { actionType, priority, daysPastDue, amount: remaining },
      });
    }

    // Upcoming due (3 days) - proactive reminder
    if (daysPastDue >= -3 && daysPastDue <= 0) {
      actions.push({
        invoiceId: inv.id,
        invoiceNumber: invNumber,
        customerName,
        amount: remaining,
        daysPastDue: Math.abs(daysPastDue),
        actionType: 'proactive_reminder',
        priority: 'low',
        message: `Proaktif: Invoice ${invNumber} akan jatuh tempo dalam ${Math.abs(daysPastDue)} hari. Kirim pengingat awal ke ${customerName}.`,
        suggestedDate: new Date().toISOString(),
      });

      changes.push({
        action: 'create',
        entityType: 'follow_up_action',
        description: `[proactive] ${invNumber} - jatuh tempo ${Math.abs(daysPastDue)} hari lagi`,
        after: { actionType: 'proactive_reminder', daysToDue: Math.abs(daysPastDue) },
      });
    }
  }

  return {
    task: {
      id: `task-inv-${Date.now()}`,
      type: 'auto_invoice_followup',
      title: 'Auto Follow-up Invoice',
      description: `${actions.length} tindakan follow-up dihasilkan untuk invoice jatuh tempo dan mendekati jatuh tempo`,
      status: 'completed',
      requiresApproval: false,
      affectedRecords: actions.length,
      changes,
      executedBy: 'ai',
    },
    actions,
  };
}

// ═══════════════════════════════════════════════
// TASK 5: AUTO-PERIOD CLOSING
// ═══════════════════════════════════════════════
export function autoPeriodClosing(
  accounts: any[],
  transactions: any[],
  period: { year: number; month: number }
): { task: AutonomousTask; adjustments: any[]; closingSummary: any } {
  const changes: TaskChange[] = [];
  const adjustments: any[] = [];

  const monthName = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][period.month];

  // 1. Revenue summary
  const revenueAccounts = accounts.filter(a => (a.accountType || a.account_type) === 'revenue');
  const totalRevenue = revenueAccounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  // 2. Expense summary
  const expenseAccounts = accounts.filter(a => (a.accountType || a.account_type) === 'expense');
  const totalExpenses = expenseAccounts.reduce((s, a) => s + parseFloat(a.balance || 0), 0);

  // 3. Net income
  const netIncome = totalRevenue - totalExpenses;

  // 4. Create closing journal entries: close revenue & expense accounts to retained earnings
  // Close revenue accounts (debit revenue, credit retained earnings)
  for (const acc of revenueAccounts) {
    const balance = parseFloat(acc.balance || 0);
    if (Math.abs(balance) < 0.01) continue;

    adjustments.push({
      type: 'closing_entry',
      entry_number: `CL-${period.year}${String(period.month).padStart(2, '0')}-R${acc.accountNumber || acc.account_number}`,
      description: `Closing akun pendapatan ${acc.accountName || acc.account_name} untuk ${monthName} ${period.year}`,
      lines: [
        { account_number: acc.accountNumber || acc.account_number, debit_amount: balance, credit_amount: 0 },
        { account_number: '3-3000', debit_amount: 0, credit_amount: balance },
      ],
    });

    changes.push({
      action: 'create',
      entityType: 'closing_journal',
      description: `Closing revenue: Dr ${acc.accountNumber || acc.account_number} Rp ${balance.toLocaleString('id-ID')} / Cr Retained Earnings`,
      after: { account: acc.accountNumber || acc.account_number, amount: balance },
    });
  }

  // Close expense accounts (debit retained earnings, credit expense)
  for (const acc of expenseAccounts) {
    const balance = parseFloat(acc.balance || 0);
    if (Math.abs(balance) < 0.01) continue;

    adjustments.push({
      type: 'closing_entry',
      entry_number: `CL-${period.year}${String(period.month).padStart(2, '0')}-E${acc.accountNumber || acc.account_number}`,
      description: `Closing akun beban ${acc.accountName || acc.account_name} untuk ${monthName} ${period.year}`,
      lines: [
        { account_number: '3-3000', debit_amount: balance, credit_amount: 0 },
        { account_number: acc.accountNumber || acc.account_number, debit_amount: 0, credit_amount: balance },
      ],
    });

    changes.push({
      action: 'create',
      entityType: 'closing_journal',
      description: `Closing expense: Dr Retained Earnings / Cr ${acc.accountNumber || acc.account_number} Rp ${balance.toLocaleString('id-ID')}`,
      after: { account: acc.accountNumber || acc.account_number, amount: balance },
    });
  }

  // 5. Pending transactions check
  const pendingCount = transactions.filter(t => t.status === 'draft' || t.status === 'pending').length;

  const closingSummary = {
    period: `${monthName} ${period.year}`,
    totalRevenue,
    totalExpenses,
    netIncome,
    closingEntries: adjustments.length,
    pendingTransactions: pendingCount,
    canClose: pendingCount === 0,
    warning: pendingCount > 0 ? `Ada ${pendingCount} transaksi pending yang harus diselesaikan sebelum closing` : null,
  };

  return {
    task: {
      id: `task-cls-${Date.now()}`,
      type: 'auto_period_close',
      title: `Auto-Closing Periode ${monthName} ${period.year}`,
      description: `${adjustments.length} jurnal penutup dibuat. Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}, Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}, Net: Rp ${netIncome.toLocaleString('id-ID')}`,
      status: pendingCount > 0 ? 'needs_approval' : 'needs_approval',
      requiresApproval: true,
      affectedRecords: adjustments.length,
      changes,
      executedBy: 'ai',
    },
    adjustments,
    closingSummary,
  };
}

// ═══════════════════════════════════════════════
// TASK 6: AUTO-TAX CALCULATION
// ═══════════════════════════════════════════════
export function autoCalculateTax(
  transactions: any[],
  employees: any[],
  period: { year: number; month: number }
): { task: AutonomousTask; taxSummary: any } {
  const changes: TaskChange[] = [];
  const PPN_RATE = 0.12; // 12% as of 2025

  // PPN Keluaran (from sales/income)
  const salesTransactions = transactions.filter(t => (t.transactionType || t.transaction_type) === 'income');
  const totalSales = salesTransactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const ppnKeluaran = Math.round(totalSales * PPN_RATE);

  // PPN Masukan (from purchases/expenses with PPN)
  const purchaseTransactions = transactions.filter(t => {
    const type = t.transactionType || t.transaction_type;
    const cat = (t.category || '').toLowerCase();
    return type === 'expense' && !['payroll', 'tax', 'insurance'].includes(cat.toLowerCase());
  });
  const totalPurchases = purchaseTransactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const ppnMasukan = Math.round(totalPurchases * PPN_RATE);

  const ppnPayable = ppnKeluaran - ppnMasukan;

  // PPh 21 (employee income tax estimate)
  const totalPayroll = transactions
    .filter(t => (t.category || '').toLowerCase().includes('payroll') || (t.category || '').toLowerCase().includes('gaji'))
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const pph21Estimate = Math.round(totalPayroll * 0.05); // Simplified 5% estimate

  // PPh 23 (service withholding)
  const serviceExpenses = transactions
    .filter(t => {
      const cat = (t.category || '').toLowerCase();
      return cat.includes('jasa') || cat.includes('service') || cat.includes('consulting') || cat.includes('konsultasi');
    })
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const pph23 = Math.round(serviceExpenses * 0.02); // 2%

  // PPh 25 (monthly installment - simplified)
  const pph25 = Math.round((totalSales - totalPurchases) * 0.005); // 0.5% net revenue

  const monthName = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][period.month];

  const taxSummary = {
    period: `${monthName} ${period.year}`,
    ppn: {
      keluaran: ppnKeluaran,
      masukan: ppnMasukan,
      payable: ppnPayable,
      status: ppnPayable >= 0 ? 'kurang_bayar' : 'lebih_bayar',
      dueDate: `${period.year}-${String(period.month + 1 > 12 ? 1 : period.month + 1).padStart(2, '0')}-${period.month === 12 ? '31' : '28'}`,
    },
    pph21: {
      taxablePayroll: totalPayroll,
      estimated: pph21Estimate,
      dueDate: `${period.year}-${String(period.month + 1 > 12 ? 1 : period.month + 1).padStart(2, '0')}-10`,
    },
    pph23: {
      taxableServices: serviceExpenses,
      amount: pph23,
      dueDate: `${period.year}-${String(period.month + 1 > 12 ? 1 : period.month + 1).padStart(2, '0')}-10`,
    },
    pph25: {
      netRevenue: totalSales - totalPurchases,
      installment: pph25,
      dueDate: `${period.year}-${String(period.month + 1 > 12 ? 1 : period.month + 1).padStart(2, '0')}-15`,
    },
    totalTaxObligation: ppnPayable + pph21Estimate + pph23 + pph25,
  };

  changes.push({
    action: 'create',
    entityType: 'tax_calculation',
    description: `Perhitungan pajak ${monthName} ${period.year}: PPN ${ppnPayable >= 0 ? 'KB' : 'LB'} Rp ${Math.abs(ppnPayable).toLocaleString('id-ID')}, PPh 21 Rp ${pph21Estimate.toLocaleString('id-ID')}, PPh 23 Rp ${pph23.toLocaleString('id-ID')}, PPh 25 Rp ${pph25.toLocaleString('id-ID')}`,
    after: taxSummary,
  });

  return {
    task: {
      id: `task-tax-${Date.now()}`,
      type: 'auto_tax_calc',
      title: `Auto-Hitung Pajak ${monthName} ${period.year}`,
      description: `Total kewajiban pajak: Rp ${taxSummary.totalTaxObligation.toLocaleString('id-ID')} (PPN + PPh 21 + PPh 23 + PPh 25)`,
      status: 'needs_approval',
      requiresApproval: true,
      affectedRecords: 4,
      changes,
      executedBy: 'ai',
    },
    taxSummary,
  };
}

// ═══════════════════════════════════════════════
// TASK 7: AUTO-EXPENSE APPROVAL
// ═══════════════════════════════════════════════
export function autoApproveExpenses(
  expenses: any[],
  config: { maxAutoApprove: number; allowedCategories: string[] }
): { task: AutonomousTask; approved: any[]; needsReview: any[] } {
  const changes: TaskChange[] = [];
  const approved: any[] = [];
  const needsReview: any[] = [];

  for (const exp of expenses) {
    const amount = parseFloat(exp.amount || 0);
    const category = exp.category || '';

    const canAutoApprove =
      amount <= config.maxAutoApprove &&
      config.allowedCategories.some(c => category.toLowerCase().includes(c.toLowerCase()));

    if (canAutoApprove) {
      approved.push({ ...exp, autoApproved: true, approvedBy: 'AI Guardian' });
      changes.push({
        action: 'update',
        entityType: 'finance_transaction',
        entityId: exp.id,
        description: `Auto-approve: "${exp.transactionNumber || 'N/A'}" Rp ${amount.toLocaleString('id-ID')} (${category}) — di bawah batas Rp ${config.maxAutoApprove.toLocaleString('id-ID')}`,
        before: { status: 'draft' },
        after: { status: 'completed', approvedBy: 'AI Guardian' },
      });
    } else {
      needsReview.push(exp);
      changes.push({
        action: 'update',
        entityType: 'finance_transaction',
        entityId: exp.id,
        description: `Perlu review manual: "${exp.transactionNumber || 'N/A'}" Rp ${amount.toLocaleString('id-ID')} (${amount > config.maxAutoApprove ? 'melebihi batas' : 'kategori tidak diizinkan'})`,
        before: { status: 'draft' },
        after: { status: 'pending', reason: amount > config.maxAutoApprove ? 'exceeds_limit' : 'category_restricted' },
      });
    }
  }

  return {
    task: {
      id: `task-exp-${Date.now()}`,
      type: 'auto_expense_approve',
      title: 'Auto-Approval Pengeluaran',
      description: `${approved.length} pengeluaran di-approve otomatis, ${needsReview.length} perlu review manual`,
      status: 'completed',
      requiresApproval: false,
      affectedRecords: approved.length + needsReview.length,
      changes,
      executedBy: 'ai',
    },
    approved,
    needsReview,
  };
}
