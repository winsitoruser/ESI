/**
 * AI Guardian Engine for Finance Module
 * 
 * Rules-based anomaly detection + accounting validation engine.
 * Runs locally (no external AI calls) for real-time transaction validation.
 * 
 * Categories:
 * 1. Input Validation Errors - duplicate entries, wrong amounts, missing fields
 * 2. Accounting Rule Violations - unbalanced entries, wrong account types, period violations
 * 3. Anomaly Detection - unusual amounts, suspicious patterns, outlier transactions
 * 4. Compliance Alerts - overdue invoices, tax deadlines, budget thresholds
 * 5. Cash Flow Warnings - low balance predictions, negative trend detection
 */

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertCategory = 'input_error' | 'accounting_violation' | 'anomaly' | 'compliance' | 'cash_flow' | 'reminder';

export interface GuardianAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  suggestedAction?: string;
  autoFixable?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface GuardianScanResult {
  score: number; // 0-100 health score
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  alerts: GuardianAlert[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  scannedAt: string;
  scanDurationMs: number;
}

// ─── Helper: Generate alert ID ───
let alertSeq = 0;
function alertId(): string {
  return `ga-${Date.now()}-${++alertSeq}`;
}

// ═══════════════════════════════════════════════
// 1. DUPLICATE DETECTION
// ═══════════════════════════════════════════════
export function detectDuplicateTransactions(transactions: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];
  const seen = new Map<string, any[]>();

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount || 0);
    const date = (tx.transactionDate || tx.transaction_date || '').toString().slice(0, 10);
    const contact = (tx.contactName || tx.contact_name || '').toLowerCase().trim();
    const key = `${amount}-${date}-${contact}`;

    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(tx);
  }

  for (const [key, group] of Array.from(seen)) {
    if (group.length > 1) {
      const [amt, date, contact] = key.split('-');
      alerts.push({
        id: alertId(),
        category: 'input_error',
        severity: 'high',
        title: 'Transaksi Duplikat Terdeteksi',
        message: `${group.length} transaksi dengan jumlah Rp ${parseFloat(amt).toLocaleString('id-ID')} pada tanggal ${date} untuk "${contact || 'N/A'}". Kemungkinan input ganda.`,
        entityType: 'finance_transaction',
        entityId: group.map(t => t.id).join(','),
        suggestedAction: 'Periksa dan hapus/void transaksi duplikat',
        autoFixable: false,
        metadata: { duplicateCount: group.length, amount: parseFloat(amt), transactionIds: group.map(t => t.id) },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 2. AMOUNT ANOMALY DETECTION (Statistical)
// ═══════════════════════════════════════════════
export function detectAmountAnomalies(transactions: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];
  if (transactions.length < 5) return alerts;

  const amounts = transactions.map(t => parseFloat(t.amount || 0)).filter(a => a > 0);
  if (amounts.length < 5) return alerts;

  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + (3 * stdDev); // 3-sigma rule

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount || 0);
    if (amount > threshold && amount > 0) {
      const zScore = ((amount - mean) / stdDev).toFixed(1);
      alerts.push({
        id: alertId(),
        category: 'anomaly',
        severity: amount > mean + 5 * stdDev ? 'critical' : 'high',
        title: 'Jumlah Transaksi Tidak Wajar',
        message: `Transaksi ${tx.transactionNumber || tx.transaction_number || 'N/A'} sebesar Rp ${amount.toLocaleString('id-ID')} jauh di atas rata-rata (Rp ${Math.round(mean).toLocaleString('id-ID')}). Z-score: ${zScore}σ.`,
        entityType: 'finance_transaction',
        entityId: tx.id,
        suggestedAction: 'Verifikasi apakah jumlah ini benar atau salah input (misalnya kelebihan nol)',
        autoFixable: false,
        metadata: { amount, mean: Math.round(mean), stdDev: Math.round(stdDev), zScore: parseFloat(zScore) },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 3. ROUND NUMBER DETECTION (Common input errors)
// ═══════════════════════════════════════════════
export function detectSuspiciousRoundNumbers(transactions: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount || 0);
    if (amount <= 0) continue;

    // Flag very round numbers above 100M (possibly missing digits or extra zeros)
    if (amount >= 100000000 && amount % 100000000 === 0) {
      alerts.push({
        id: alertId(),
        category: 'input_error',
        severity: 'medium',
        title: 'Angka Pembulatan Besar',
        message: `Transaksi ${tx.transactionNumber || 'N/A'} tepat Rp ${amount.toLocaleString('id-ID')}. Angka yang sangat bulat bisa mengindikasikan salah input (kelebihan/kekurangan nol).`,
        entityType: 'finance_transaction',
        entityId: tx.id,
        suggestedAction: 'Pastikan jumlah transaksi sudah benar',
        autoFixable: false,
        metadata: { amount },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 4. JOURNAL ENTRY BALANCE CHECK
// ═══════════════════════════════════════════════
export function validateJournalBalance(journalEntries: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];

  for (const je of journalEntries) {
    const totalDebit = parseFloat(je.total_debit || 0);
    const totalCredit = parseFloat(je.total_credit || 0);
    const diff = Math.abs(totalDebit - totalCredit);

    if (diff > 0.01) {
      alerts.push({
        id: alertId(),
        category: 'accounting_violation',
        severity: 'critical',
        title: 'Jurnal Tidak Seimbang (Unbalanced)',
        message: `Jurnal ${je.entry_number} memiliki selisih Debit-Kredit sebesar Rp ${diff.toLocaleString('id-ID')}. Debit: Rp ${totalDebit.toLocaleString('id-ID')}, Kredit: Rp ${totalCredit.toLocaleString('id-ID')}.`,
        entityType: 'journal_entry',
        entityId: je.id,
        suggestedAction: 'Perbaiki entri jurnal agar total Debit = total Kredit',
        autoFixable: false,
        metadata: { totalDebit, totalCredit, difference: diff },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 5. WRONG ACCOUNT TYPE DETECTION
// ═══════════════════════════════════════════════
export function validateAccountTypes(transactions: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];

  for (const tx of transactions) {
    const txType = tx.transactionType || tx.transaction_type;
    const accType = tx.accountType || tx.account_type;

    if (!accType || !txType) continue;

    // Income recorded to expense account
    if (txType === 'income' && accType === 'expense') {
      alerts.push({
        id: alertId(),
        category: 'accounting_violation',
        severity: 'high',
        title: 'Pendapatan di Akun Beban',
        message: `Transaksi pendapatan ${tx.transactionNumber || 'N/A'} tercatat di akun beban "${tx.accountName || tx.account_name || 'N/A'}". Seharusnya di akun pendapatan (revenue) atau aset (asset).`,
        entityType: 'finance_transaction',
        entityId: tx.id,
        suggestedAction: 'Pindahkan transaksi ke akun pendapatan yang sesuai',
        autoFixable: true,
        metadata: { txType, accType, accountName: tx.accountName || tx.account_name },
        createdAt: new Date().toISOString(),
      });
    }

    // Expense recorded to revenue account
    if (txType === 'expense' && accType === 'revenue') {
      alerts.push({
        id: alertId(),
        category: 'accounting_violation',
        severity: 'high',
        title: 'Beban di Akun Pendapatan',
        message: `Transaksi beban ${tx.transactionNumber || 'N/A'} tercatat di akun pendapatan "${tx.accountName || tx.account_name || 'N/A'}". Seharusnya di akun beban (expense) atau aset (asset).`,
        entityType: 'finance_transaction',
        entityId: tx.id,
        suggestedAction: 'Pindahkan transaksi ke akun beban yang sesuai',
        autoFixable: true,
        metadata: { txType, accType, accountName: tx.accountName || tx.account_name },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 6. OVERDUE INVOICE DETECTION
// ═══════════════════════════════════════════════
export function detectOverdueInvoices(invoices: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];
  const now = new Date();

  for (const inv of invoices) {
    const status = inv.status || inv.payment_status || inv.paymentStatus;
    if (status === 'paid' || status === 'cancelled') continue;

    const dueDate = new Date(inv.dueDate || inv.due_date);
    if (isNaN(dueDate.getTime())) continue;

    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPastDue > 0) {
      const amount = parseFloat(inv.remainingAmount || inv.remaining_amount || inv.totalAmount || inv.total_amount || 0);
      const severity: AlertSeverity = daysPastDue > 90 ? 'critical' : daysPastDue > 30 ? 'high' : daysPastDue > 7 ? 'medium' : 'low';

      alerts.push({
        id: alertId(),
        category: 'compliance',
        severity,
        title: `Invoice Jatuh Tempo ${daysPastDue} Hari`,
        message: `Invoice ${inv.invoiceNumber || inv.invoice_number} sebesar Rp ${amount.toLocaleString('id-ID')} sudah melewati jatuh tempo ${daysPastDue} hari (${dueDate.toLocaleDateString('id-ID')}).`,
        entityType: 'finance_invoice',
        entityId: inv.id,
        suggestedAction: daysPastDue > 30 ? 'Segera follow up dan pertimbangkan penyisihan piutang' : 'Kirim pengingat pembayaran kepada pelanggan',
        autoFixable: false,
        metadata: { daysPastDue, dueDate: dueDate.toISOString(), amount, invoiceNumber: inv.invoiceNumber || inv.invoice_number },
        createdAt: new Date().toISOString(),
      });
    }

    // Upcoming due (within 3 days)
    if (daysPastDue >= -3 && daysPastDue <= 0) {
      const amount = parseFloat(inv.remainingAmount || inv.remaining_amount || inv.totalAmount || inv.total_amount || 0);
      alerts.push({
        id: alertId(),
        category: 'reminder',
        severity: 'info',
        title: `Invoice Akan Jatuh Tempo ${Math.abs(daysPastDue)} Hari Lagi`,
        message: `Invoice ${inv.invoiceNumber || inv.invoice_number} sebesar Rp ${amount.toLocaleString('id-ID')} jatuh tempo ${dueDate.toLocaleDateString('id-ID')}.`,
        entityType: 'finance_invoice',
        entityId: inv.id,
        suggestedAction: 'Siapkan pembayaran atau kirim pengingat',
        autoFixable: false,
        metadata: { daysToDue: Math.abs(daysPastDue), amount },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 7. BUDGET THRESHOLD ALERTS
// ═══════════════════════════════════════════════
export function detectBudgetAlerts(budgets: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];

  for (const b of budgets) {
    const budgetAmt = parseFloat(b.budgetAmount || b.totalBudget || 0);
    const spentAmt = parseFloat(b.spentAmount || b.totalActual || 0);
    if (budgetAmt <= 0) continue;

    const utilization = (spentAmt / budgetAmt) * 100;
    const threshold = b.alertThreshold || b.alert_threshold || 80;
    const critThreshold = b.criticalThreshold || b.critical_threshold || 90;

    if (utilization >= 100) {
      alerts.push({
        id: alertId(),
        category: 'compliance',
        severity: 'critical',
        title: 'Budget Terlampaui!',
        message: `Budget "${b.budgetName || b.category}" terpakai ${utilization.toFixed(1)}% (Rp ${spentAmt.toLocaleString('id-ID')} dari Rp ${budgetAmt.toLocaleString('id-ID')}). Sudah melebihi batas!`,
        entityType: 'finance_budget',
        entityId: b.id,
        suggestedAction: 'Segera bekukan pengeluaran di kategori ini atau ajukan perubahan anggaran',
        autoFixable: false,
        metadata: { utilization, budgetAmount: budgetAmt, spentAmount: spentAmt },
        createdAt: new Date().toISOString(),
      });
    } else if (utilization >= critThreshold) {
      alerts.push({
        id: alertId(),
        category: 'compliance',
        severity: 'high',
        title: 'Budget Hampir Habis (Kritis)',
        message: `Budget "${b.budgetName || b.category}" sudah ${utilization.toFixed(1)}% terpakai. Sisa Rp ${(budgetAmt - spentAmt).toLocaleString('id-ID')}.`,
        entityType: 'finance_budget',
        entityId: b.id,
        suggestedAction: 'Batasi pengeluaran baru dan review prioritas belanja',
        autoFixable: false,
        metadata: { utilization, remaining: budgetAmt - spentAmt },
        createdAt: new Date().toISOString(),
      });
    } else if (utilization >= threshold) {
      alerts.push({
        id: alertId(),
        category: 'reminder',
        severity: 'medium',
        title: 'Peringatan Budget',
        message: `Budget "${b.budgetName || b.category}" sudah ${utilization.toFixed(1)}% terpakai. Perhatikan sisa anggaran.`,
        entityType: 'finance_budget',
        entityId: b.id,
        suggestedAction: 'Monitor pengeluaran lebih ketat',
        autoFixable: false,
        metadata: { utilization, remaining: budgetAmt - spentAmt },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 8. TAX DEADLINE REMINDERS
// ═══════════════════════════════════════════════
export function detectTaxDeadlines(): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  // Indonesian tax deadlines (monthly)
  const deadlines = [
    { type: 'PPh 21/26', day: 10, desc: 'Penyetoran dan pelaporan PPh 21 karyawan' },
    { type: 'PPh 23/26', day: 10, desc: 'Penyetoran PPh 23 atas jasa/sewa' },
    { type: 'PPh 25', day: 15, desc: 'Angsuran PPh 25 bulanan' },
    { type: 'PPN', day: 31, desc: 'Pelaporan SPT Masa PPN dan penyetoran PPN kurang bayar' },
  ];

  for (const dl of deadlines) {
    const deadlineDate = new Date(currentYear, currentMonth, dl.day);
    const daysUntil = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0 && daysUntil >= -5) {
      alerts.push({
        id: alertId(),
        category: 'compliance',
        severity: 'critical',
        title: `${dl.type} Terlambat!`,
        message: `Batas waktu ${dl.type} sudah lewat ${Math.abs(daysUntil)} hari (tanggal ${dl.day}). ${dl.desc}. Keterlambatan dikenakan denda.`,
        suggestedAction: 'Segera setor dan lapor untuk meminimalkan denda keterlambatan',
        metadata: { taxType: dl.type, deadline: deadlineDate.toISOString(), daysLate: Math.abs(daysUntil) },
        createdAt: new Date().toISOString(),
      });
    } else if (daysUntil >= 0 && daysUntil <= 5) {
      alerts.push({
        id: alertId(),
        category: 'reminder',
        severity: daysUntil <= 2 ? 'high' : 'medium',
        title: `${dl.type} Jatuh Tempo ${daysUntil === 0 ? 'Hari Ini' : `${daysUntil} Hari Lagi`}`,
        message: `${dl.desc}. Batas waktu: tanggal ${dl.day} bulan ini.`,
        suggestedAction: 'Siapkan perhitungan dan dokumen untuk pelaporan',
        metadata: { taxType: dl.type, deadline: deadlineDate.toISOString(), daysUntil },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 9. NEGATIVE BALANCE DETECTION
// ═══════════════════════════════════════════════
export function detectNegativeBalances(accounts: any[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];

  for (const acc of accounts) {
    const balance = parseFloat(acc.balance || 0);
    const accType = acc.accountType || acc.account_type;

    // Asset accounts should not have negative balances (except accumulated depreciation)
    if (accType === 'asset' && balance < 0 && !(acc.category || '').toLowerCase().includes('depreci')) {
      alerts.push({
        id: alertId(),
        category: 'accounting_violation',
        severity: 'critical',
        title: 'Saldo Negatif di Akun Aset',
        message: `Akun "${acc.accountName || acc.account_name}" (${acc.accountNumber || acc.account_number}) memiliki saldo negatif Rp ${balance.toLocaleString('id-ID')}. Akun aset seharusnya tidak negatif.`,
        entityType: 'finance_account',
        entityId: acc.id,
        suggestedAction: 'Periksa jurnal terakhir yang mempengaruhi akun ini',
        autoFixable: false,
        metadata: { balance, accountNumber: acc.accountNumber || acc.account_number },
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// 10. CASH FLOW TREND WARNING
// ═══════════════════════════════════════════════
export function detectCashFlowTrend(monthlyData: { month: string; inflow: number; outflow: number }[]): GuardianAlert[] {
  const alerts: GuardianAlert[] = [];
  if (monthlyData.length < 3) return alerts;

  // Check last 3 months for consecutive negative net cash flow
  const last3 = monthlyData.slice(-3);
  const allNegative = last3.every(m => (m.inflow - m.outflow) < 0);

  if (allNegative) {
    const totalDeficit = last3.reduce((s, m) => s + (m.outflow - m.inflow), 0);
    alerts.push({
      id: alertId(),
      category: 'cash_flow',
      severity: 'critical',
      title: 'Arus Kas Negatif 3 Bulan Berturut-turut',
      message: `Pengeluaran melebihi pemasukan selama 3 bulan terakhir dengan total defisit Rp ${totalDeficit.toLocaleString('id-ID')}. Jika tren berlanjut, kas bisa habis.`,
      suggestedAction: 'Review pengeluaran besar, percepat penagihan piutang, pertimbangkan pemotongan biaya',
      metadata: { months: last3, totalDeficit },
      createdAt: new Date().toISOString(),
    });
  }

  // Predict when cash might run out (simple linear projection)
  const netFlows = monthlyData.map(m => m.inflow - m.outflow);
  const avgNetFlow = netFlows.reduce((s, n) => s + n, 0) / netFlows.length;
  if (avgNetFlow < 0) {
    // Get current estimated balance from last month's cumulative
    const currentBalance = monthlyData.reduce((s, m) => s + m.inflow - m.outflow, 0);
    if (currentBalance > 0) {
      const monthsUntilZero = Math.ceil(currentBalance / Math.abs(avgNetFlow));
      if (monthsUntilZero <= 6) {
        alerts.push({
          id: alertId(),
          category: 'cash_flow',
          severity: monthsUntilZero <= 2 ? 'critical' : 'high',
          title: `Prediksi Kas Habis dalam ${monthsUntilZero} Bulan`,
          message: `Berdasarkan tren arus kas rata-rata (defisit Rp ${Math.abs(Math.round(avgNetFlow)).toLocaleString('id-ID')}/bulan), estimasi kas akan habis dalam ${monthsUntilZero} bulan.`,
          suggestedAction: 'Perlu tindakan segera: negosiasi pembayaran, kurangi pengeluaran, atau cari pendanaan tambahan',
          metadata: { monthsUntilZero, avgNetFlow: Math.round(avgNetFlow), currentBalance: Math.round(currentBalance) },
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════
// MASTER: Calculate health score from alerts
// ═══════════════════════════════════════════════
export function calculateHealthScore(alerts: GuardianAlert[]): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' } {
  let score = 100;

  for (const alert of alerts) {
    switch (alert.severity) {
      case 'critical': score -= 15; break;
      case 'high': score -= 8; break;
      case 'medium': score -= 3; break;
      case 'low': score -= 1; break;
      case 'info': break; // no penalty
    }
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

  return { score, grade };
}
