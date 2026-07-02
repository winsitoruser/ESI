import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { callAI } from '../../../../lib/ai/provider';
import {
  detectDuplicateTransactions,
  detectAmountAnomalies,
  detectSuspiciousRoundNumbers,
  validateJournalBalance,
  validateAccountTypes,
  detectOverdueInvoices,
  detectBudgetAlerts,
  detectTaxDeadlines,
  detectNegativeBalances,
  detectCashFlowTrend,
  calculateHealthScore,
  GuardianAlert,
  GuardianScanResult,
} from '../../../../lib/finance/ai-guardian-engine';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} Not Allowed`));
  }

  try {
    const { action = 'scan' } = req.query;

    switch (action) {
      case 'scan': return await fullScan(req, res);
      case 'validate-transaction': return await validateTransaction(req, res);
      case 'ai-review': return await aiReview(req, res);
      case 'ai-suggest': return await aiSuggestFix(req, res);
      case 'dashboard': return await getDashboard(req, res);
      default:
        return res.status(400).json(errorResponse('VALIDATION', `Unknown action: ${action}`));
    }
  } catch (error: any) {
    console.error('AI Guardian Error:', error);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', error.message || 'Internal server error'));
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

// ─── Full System Scan ───
async function fullScan(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const allAlerts: GuardianAlert[] = [];

  // 1. Fetch recent transactions (last 90 days)
  try {
    const [transactions] = await sequelize.query(`
      SELECT ft.*, fa."accountType", fa."accountName"
      FROM finance_transactions ft
      LEFT JOIN finance_accounts fa ON ft."accountId" = fa.id
      WHERE ft."transactionDate" >= NOW() - INTERVAL '90 days'
        AND ft."isActive" = true ${tf.condition}
      ORDER BY ft."transactionDate" DESC
      LIMIT 500
    `, { replacements: tf.replacements });

    allAlerts.push(...detectDuplicateTransactions(transactions));
    allAlerts.push(...detectAmountAnomalies(transactions));
    allAlerts.push(...detectSuspiciousRoundNumbers(transactions));
    allAlerts.push(...validateAccountTypes(transactions));
  } catch (e: any) { console.warn('Guardian: transactions scan failed:', e.message); }

  // 2. Check journal entries
  try {
    const [journals] = await sequelize.query(`
      SELECT * FROM journal_entries
      WHERE created_at >= NOW() - INTERVAL '90 days' ${tf.condition.replace(/tenant_id/g, 'tenant_id')}
      ORDER BY entry_date DESC LIMIT 200
    `, { replacements: tf.replacements });

    allAlerts.push(...validateJournalBalance(journals));
  } catch (e: any) { /* journal_entries may not exist yet */ }

  // 3. Check invoices for overdue
  try {
    const [invoices] = await sequelize.query(`
      SELECT *, due_date as "dueDate", total_amount as "totalAmount", paid_amount as "paidAmount",
        (total_amount - COALESCE(paid_amount, 0)) as "remainingAmount", invoice_number as "invoiceNumber"
      FROM finance_invoices
      WHERE status NOT IN ('paid', 'cancelled') ${tf.condition}
      ORDER BY due_date ASC LIMIT 200
    `, { replacements: tf.replacements });

    allAlerts.push(...detectOverdueInvoices(invoices));
  } catch (e: any) { console.warn('Guardian: invoice scan failed:', e.message); }

  // 5. Check budgets
  try {
    const [budgets] = await sequelize.query(`
      SELECT * FROM finance_budgets
      WHERE status = 'active' AND "isActive" = true ${tf.condition}
      LIMIT 100
    `, { replacements: tf.replacements });

    allAlerts.push(...detectBudgetAlerts(budgets));
  } catch (e: any) { console.warn('Guardian: budget scan failed:', e.message); }

  // 6. Check accounts for negative balances
  try {
    const [accounts] = await sequelize.query(`
      SELECT * FROM finance_accounts
      WHERE "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });

    allAlerts.push(...detectNegativeBalances(accounts));
  } catch (e: any) { console.warn('Guardian: account scan failed:', e.message); }

  // 7. Tax deadline reminders
  allAlerts.push(...detectTaxDeadlines());

  // 8. Cash flow trend (last 6 months)
  try {
    const [monthlyFlows] = await sequelize.query(`
      SELECT
        TO_CHAR("transactionDate", 'YYYY-MM') as month,
        SUM(CASE WHEN "transactionType" = 'income' THEN amount ELSE 0 END) as inflow,
        SUM(CASE WHEN "transactionType" = 'expense' THEN amount ELSE 0 END) as outflow
      FROM finance_transactions
      WHERE "transactionDate" >= NOW() - INTERVAL '6 months'
        AND status = 'completed' AND "isActive" = true ${tf.condition}
      GROUP BY TO_CHAR("transactionDate", 'YYYY-MM')
      ORDER BY month ASC
    `, { replacements: tf.replacements });

    const cashFlowData = monthlyFlows.map((r: any) => ({
      month: r.month,
      inflow: parseFloat(r.inflow || 0),
      outflow: parseFloat(r.outflow || 0),
    }));

    allAlerts.push(...detectCashFlowTrend(cashFlowData));
  } catch (e: any) { console.warn('Guardian: cash flow scan failed:', e.message); }

  // Sort alerts by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  allAlerts.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5));

  const { score, grade } = calculateHealthScore(allAlerts);

  const result: GuardianScanResult = {
    score,
    grade,
    alerts: allAlerts,
    summary: {
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      high: allAlerts.filter(a => a.severity === 'high').length,
      medium: allAlerts.filter(a => a.severity === 'medium').length,
      low: allAlerts.filter(a => a.severity === 'low').length,
      info: allAlerts.filter(a => a.severity === 'info').length,
      total: allAlerts.length,
    },
    scannedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - start,
  };

  return res.status(200).json(successResponse(result));
}

// ─── Real-time Transaction Validation (call before saving) ───
async function validateTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));

  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { amount, category, transactionType, contactName, description, accountId } = req.body;
  const warnings: GuardianAlert[] = [];
  const parsedAmount = parseFloat(amount || 0);

  // 1. Check for very large amounts vs historical
  try {
    const [stats] = await sequelize.query(`
      SELECT AVG(amount) as avg_amount, STDDEV(amount) as std_amount, MAX(amount) as max_amount
      FROM finance_transactions
      WHERE "transactionType" = :txType AND status IN ('completed', 'draft')
        AND "isActive" = true AND "transactionDate" >= NOW() - INTERVAL '90 days' ${tf.condition}
    `, { replacements: { txType: transactionType, ...tf.replacements } });

    if (stats[0]?.avg_amount) {
      const avg = parseFloat(stats[0].avg_amount);
      const std = parseFloat(stats[0].std_amount || 0);
      const max = parseFloat(stats[0].max_amount || 0);

      if (std > 0 && parsedAmount > avg + 3 * std) {
        warnings.push({
          id: 'pre-val-amount',
          category: 'anomaly',
          severity: parsedAmount > avg + 5 * std ? 'high' : 'medium',
          title: 'Jumlah Di Atas Rata-rata',
          message: `Rp ${parsedAmount.toLocaleString('id-ID')} jauh di atas rata-rata ${transactionType} (Rp ${Math.round(avg).toLocaleString('id-ID')}). Maksimum sebelumnya: Rp ${Math.round(max).toLocaleString('id-ID')}.`,
          suggestedAction: 'Pastikan jumlah sudah benar sebelum menyimpan',
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (e) { /* skip */ }

  // 2. Check for potential duplicates in last 7 days
  if (contactName && parsedAmount > 0) {
    try {
      const [dupes] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM finance_transactions
        WHERE amount = :amount AND "contactName" ILIKE :contact
          AND "transactionDate" >= NOW() - INTERVAL '7 days'
          AND "isActive" = true ${tf.condition}
      `, { replacements: { amount: parsedAmount, contact: `%${contactName}%`, ...tf.replacements } });

      if (parseInt(dupes[0]?.cnt || '0') > 0) {
        warnings.push({
          id: 'pre-val-dupe',
          category: 'input_error',
          severity: 'high',
          title: 'Kemungkinan Duplikat',
          message: `Sudah ada transaksi Rp ${parsedAmount.toLocaleString('id-ID')} untuk "${contactName}" dalam 7 hari terakhir.`,
          suggestedAction: 'Periksa apakah transaksi ini sudah pernah dicatat',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) { /* skip */ }
  }

  // 3. Check account type compatibility
  if (accountId && transactionType) {
    try {
      const [acc] = await sequelize.query(
        `SELECT "accountType", "accountName" FROM finance_accounts WHERE id = :accId LIMIT 1`,
        { replacements: { accId: accountId } }
      );
      if (acc[0]) {
        const accType = acc[0].accountType;
        if (transactionType === 'income' && accType === 'expense') {
          warnings.push({
            id: 'pre-val-acctype',
            category: 'accounting_violation',
            severity: 'high',
            title: 'Tipe Akun Tidak Sesuai',
            message: `Pendapatan tidak seharusnya dicatat di akun beban "${acc[0].accountName}".`,
            suggestedAction: 'Pilih akun pendapatan atau akun kas/bank',
            createdAt: new Date().toISOString(),
          });
        }
        if (transactionType === 'expense' && accType === 'revenue') {
          warnings.push({
            id: 'pre-val-acctype',
            category: 'accounting_violation',
            severity: 'high',
            title: 'Tipe Akun Tidak Sesuai',
            message: `Beban tidak seharusnya dicatat di akun pendapatan "${acc[0].accountName}".`,
            suggestedAction: 'Pilih akun beban atau akun kas/bank',
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (e) { /* skip */ }
  }

  // 4. Round number check
  if (parsedAmount >= 100000000 && parsedAmount % 100000000 === 0) {
    warnings.push({
      id: 'pre-val-round',
      category: 'input_error',
      severity: 'low',
      title: 'Angka Sangat Bulat',
      message: `Rp ${parsedAmount.toLocaleString('id-ID')} - apakah ada kelebihan/kekurangan nol?`,
      suggestedAction: 'Periksa kembali jumlah yang diinput',
      createdAt: new Date().toISOString(),
    });
  }

  return res.status(200).json(successResponse({
    valid: warnings.filter(w => w.severity === 'critical' || w.severity === 'high').length === 0,
    warnings,
    warningCount: warnings.length,
  }));
}

// ─── AI-Powered Deep Review ───
async function aiReview(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));

  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { provider = 'openai', model = 'gpt-4o-mini' } = req.body;

  // Gather financial summary data
  let financialContext = '';
  try {
    const [txSummary] = await sequelize.query(`
      SELECT 
        "transactionType",
        COUNT(*) as count,
        SUM(amount) as total,
        AVG(amount) as avg_amount
      FROM finance_transactions
      WHERE "transactionDate" >= NOW() - INTERVAL '30 days'
        AND status = 'completed' AND "isActive" = true ${tf.condition}
      GROUP BY "transactionType"
    `, { replacements: tf.replacements });

    const [overdueCount] = await sequelize.query(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
      FROM finance_invoices
      WHERE status NOT IN ('paid', 'cancelled') AND due_date < NOW() ${tf.condition}
    `, { replacements: tf.replacements });

    const [budgetStatus] = await sequelize.query(`
      SELECT category, "budgetAmount", "spentAmount",
        CASE WHEN "budgetAmount" > 0 THEN ROUND(("spentAmount"::numeric / "budgetAmount"::numeric) * 100, 1) ELSE 0 END as utilization
      FROM finance_budgets
      WHERE status = 'active' AND "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });

    const [accounts] = await sequelize.query(`
      SELECT "accountName", "accountType", balance
      FROM finance_accounts WHERE "isActive" = true ${tf.condition}
      ORDER BY ABS(balance) DESC LIMIT 10
    `, { replacements: tf.replacements });

    financialContext = JSON.stringify({
      transactionSummary: txSummary,
      overdueReceivables: overdueCount[0],
      budgets: budgetStatus,
      topAccounts: accounts,
      period: 'Last 30 days'
    }, null, 2);
  } catch (e: any) {
    financialContext = `Error gathering data: ${e.message}`;
  }

  const aiResponse = await callAI({
    provider,
    model,
    temperature: 0.3,
    maxTokens: 2048,
    responseFormat: 'json',
    messages: [
      {
        role: 'system',
        content: `Kamu adalah AI Auditor Keuangan yang ahli dalam akuntansi Indonesia (PSAK/SAK). Tugas kamu:
1. Analisis data keuangan yang diberikan
2. Identifikasi risiko, masalah, dan peluang perbaikan
3. Berikan rekomendasi spesifik dan actionable

Respond in JSON format:
{
  "healthAssessment": "brief overall assessment in Bahasa Indonesia",
  "risks": [{"level": "high/medium/low", "title": "...", "description": "...", "recommendation": "..."}],
  "opportunities": [{"title": "...", "description": "...", "potentialImpact": "..."}],
  "complianceIssues": [{"issue": "...", "regulation": "...", "action": "..."}],
  "actionItems": [{"priority": 1-5, "action": "...", "deadline": "..."}]
}`
      },
      {
        role: 'user',
        content: `Tolong review data keuangan berikut dan berikan analisis mendalam:\n\n${financialContext}`
      }
    ]
  });

  if (!aiResponse.success) {
    return res.status(200).json(successResponse({
      aiAvailable: false,
      error: aiResponse.error,
      fallbackMessage: 'AI review tidak tersedia saat ini. Gunakan fitur Scan untuk deteksi otomatis berbasis aturan.',
    }));
  }

  let parsed: any;
  try {
    parsed = JSON.parse(aiResponse.content);
  } catch {
    parsed = { rawResponse: aiResponse.content };
  }

  return res.status(200).json(successResponse({
    aiAvailable: true,
    review: parsed,
    model: aiResponse.model,
    provider: aiResponse.provider,
    tokensUsed: aiResponse.inputTokens + aiResponse.outputTokens,
    durationMs: aiResponse.durationMs,
  }));
}

// ─── AI Suggest Fix for specific alert ───
async function aiSuggestFix(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));

  const { alert, provider = 'openai', model = 'gpt-4o-mini' } = req.body;
  if (!alert) return res.status(400).json(errorResponse('VALIDATION', 'alert object required'));

  const aiResponse = await callAI({
    provider,
    model,
    temperature: 0.3,
    maxTokens: 1024,
    responseFormat: 'json',
    messages: [
      {
        role: 'system',
        content: `Kamu adalah AI Asisten Akuntansi. Berikan solusi spesifik dan langkah-langkah perbaikan untuk masalah keuangan yang dilaporkan. Respond in JSON:
{"solution": "...", "steps": ["langkah 1", "langkah 2", ...], "journalEntry": {"debit": [{"account": "...", "amount": 0}], "credit": [{"account": "...", "amount": 0}]} | null, "preventionTips": ["tip 1", ...]}`
      },
      {
        role: 'user',
        content: `Masalah: ${alert.title}\nDetail: ${alert.message}\nKategori: ${alert.category}\nSeverity: ${alert.severity}\nMetadata: ${JSON.stringify(alert.metadata || {})}`
      }
    ]
  });

  if (!aiResponse.success) {
    return res.status(200).json(successResponse({
      aiAvailable: false,
      fallbackSuggestion: alert.suggestedAction || 'Periksa dan perbaiki secara manual',
    }));
  }

  let parsed: any;
  try {
    parsed = JSON.parse(aiResponse.content);
  } catch {
    parsed = { solution: aiResponse.content };
  }

  return res.status(200).json(successResponse({ aiAvailable: true, suggestion: parsed }));
}

// ─── Dashboard Summary ───
async function getDashboard(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);

  const stats: any = {
    lastScanAt: null,
    quickStats: {},
    recentAlerts: [],
  };

  try {
    // Quick financial stats
    const [revenue] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions
      WHERE "transactionType" = 'income' AND status = 'completed'
        AND "transactionDate" >= DATE_TRUNC('month', NOW()) AND "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });

    const [expenses] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions
      WHERE "transactionType" = 'expense' AND status = 'completed'
        AND "transactionDate" >= DATE_TRUNC('month', NOW()) AND "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });

    const [overdueInv] = await sequelize.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
      FROM finance_invoices
      WHERE status NOT IN ('paid', 'cancelled') AND due_date < NOW() ${tf.condition}
    `, { replacements: tf.replacements });

    const [pendingTx] = await sequelize.query(`
      SELECT COUNT(*) as count FROM finance_transactions
      WHERE status = 'draft' AND "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });

    stats.quickStats = {
      monthlyRevenue: parseFloat(revenue[0]?.total || 0),
      monthlyExpenses: parseFloat(expenses[0]?.total || 0),
      netIncome: parseFloat(revenue[0]?.total || 0) - parseFloat(expenses[0]?.total || 0),
      overdueInvoices: parseInt(overdueInv[0]?.count || 0),
      overdueAmount: parseFloat(overdueInv[0]?.total || 0),
      pendingTransactions: parseInt(pendingTx[0]?.count || 0),
    };

    // Get tax deadline alerts
    stats.recentAlerts = detectTaxDeadlines();
  } catch (e: any) {
    console.warn('Guardian dashboard error:', e.message);
  }

  return res.status(200).json(successResponse(stats));
}
