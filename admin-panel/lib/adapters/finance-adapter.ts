import { BaseAdapter, ApiResponse } from './base-adapter';

export interface Transaction {
  id: string;
  transactionNumber: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  amount: number;
  description: string;
  date: string;
  reference?: string;
  accountFrom?: string;
  accountTo?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  totalDebit: number;
  totalCredit: number;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  entries: JournalEntryLine[];
  createdBy: string;
  createdAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId?: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
}

export interface FinancialReport {
  type: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW';
  period: string;
  data: any;
  generatedAt: string;
}

export class FinanceAdapter extends BaseAdapter {

  async getTransactions(filters: {
    type?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: Transaction[]; pagination: any }>> {
    const { type, category, dateFrom, dateTo, status, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (type) {
      whereClause += ' AND t.type = :type';
      replacements.type = type;
    }

    if (category) {
      whereClause += ' AND t.category = :category';
      replacements.category = category;
    }

    if (status) {
      whereClause += ' AND t.status = :status';
      replacements.status = status;
    }

    if (dateFrom) {
      whereClause += ' AND t.date >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND t.date <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const query = `
      SELECT 
        t.id,
        t.transaction_number as "transactionNumber",
        t.type,
        t.category,
        t.amount,
        t.description,
        t.date,
        t.reference,
        t.account_from as "accountFrom",
        t.account_to as "accountTo",
        t.status,
        t.created_by as "createdBy",
        t.created_at as "createdAt"
      FROM finance_transactions t
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM finance_transactions t
      ${whereClause.replace('ORDER BY t.date DESC, t.created_at DESC LIMIT :limit OFFSET :offset', '')}
    `;

    return this.withFallback(
      async () => {
        const [items, countResult] = await Promise.all([
          this.executeQuery<Transaction>(query, replacements),
          this.executeQuery<{ total: string }>(countQuery, replacements)
        ]);

        const total = parseInt(countResult[0]?.total || '0');
        const totalPages = Math.ceil(total / limit);

        return {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        };
      },
      {
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      },
      'Get transactions'
    );
  }

  async createTransaction(transactionData: Omit<Transaction, 'id' | 'transactionNumber' | 'createdAt'>): Promise<ApiResponse<Transaction>> {
    return this.executeTransaction(async (transaction) => {
      // Generate transaction number
      const numberQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS INTEGER)), 0) + 1 as next_number
        FROM finance_transactions 
        WHERE transaction_number LIKE 'TXN%'
      `;
      
      const numberResult = await this.executeQuery<{ next_number: number }>(numberQuery, {}, { transaction });
      const transactionNumber = `TXN${String(numberResult[0].next_number).padStart(6, '0')}`;

      const insertQuery = `
        INSERT INTO finance_transactions (
          transaction_number, type, category, amount, description, date,
          reference, account_from, account_to, status, created_by, created_at
        ) VALUES (
          :transactionNumber, :type, :category, :amount, :description, :date,
          :reference, :accountFrom, :accountTo, :status, :createdBy, NOW()
        ) RETURNING *
      `;

      const results = await this.executeQuery<Transaction>(insertQuery, {
        ...transactionData,
        transactionNumber
      }, { transaction });

      return this.createSuccessResponse(results[0], 'Transaction created successfully');
    });
  }

  async getJournalEntries(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse<{ items: JournalEntry[]; pagination: any }>> {
    const { dateFrom, dateTo, status, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (status) {
      whereClause += ' AND je.status = :status';
      replacements.status = status;
    }

    if (dateFrom) {
      whereClause += ' AND je.date >= :dateFrom';
      replacements.dateFrom = dateFrom;
    }

    if (dateTo) {
      whereClause += ' AND je.date <= :dateTo';
      replacements.dateTo = dateTo;
    }

    const query = `
      SELECT 
        je.id,
        je.entry_number as "entryNumber",
        je.date,
        je.description,
        je.reference,
        je.total_debit as "totalDebit",
        je.total_credit as "totalCredit",
        je.status,
        je.created_by as "createdBy",
        je.created_at as "createdAt"
      FROM journal_entries je
      ${whereClause}
      ORDER BY je.date DESC, je.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    return this.withFallback(
      async () => {
        const items = await this.executeQuery<JournalEntry>(query, replacements);
        
        // Get journal entry lines for each entry
        for (const entry of items) {
          const linesQuery = `
            SELECT 
              jel.id,
              jel.account_code as "accountCode",
              a.name as "accountName",
              jel.debit,
              jel.credit,
              jel.description
            FROM journal_entry_lines jel
            LEFT JOIN chart_of_accounts a ON jel.account_code = a.code
            WHERE jel.journal_entry_id = :entryId
            ORDER BY jel.line_number
          `;
          
          entry.entries = await this.executeQuery<JournalEntryLine>(linesQuery, { entryId: entry.id });
        }

        return {
          items,
          pagination: {
            page,
            limit,
            total: items.length,
            totalPages: Math.ceil(items.length / limit),
            hasNext: false,
            hasPrev: false
          }
        };
      },
      {
        items: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      },
      'Get journal entries'
    );
  }

  async createJournalEntry(entryData: {
    date: string;
    description: string;
    reference?: string;
    entries: Array<{
      accountCode: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
    createdBy: string;
  }): Promise<ApiResponse<JournalEntry>> {
    return this.executeTransaction(async (transaction) => {
      // Validate debit/credit balance
      const totalDebit = entryData.entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredit = entryData.entries.reduce((sum, entry) => sum + entry.credit, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Journal entry is not balanced. Total debits must equal total credits.');
      }

      // Generate entry number
      const numberQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 3) AS INTEGER)), 0) + 1 as next_number
        FROM journal_entries 
        WHERE entry_number LIKE 'JE%'
      `;
      
      const numberResult = await this.executeQuery<{ next_number: number }>(numberQuery, {}, { transaction });
      const entryNumber = `JE${String(numberResult[0].next_number).padStart(6, '0')}`;

      // Create journal entry header
      const headerQuery = `
        INSERT INTO journal_entries (
          entry_number, date, description, reference, total_debit, total_credit,
          status, created_by, created_at
        ) VALUES (
          :entryNumber, :date, :description, :reference, :totalDebit, :totalCredit,
          'DRAFT', :createdBy, NOW()
        ) RETURNING *
      `;

      const headerResult = await this.executeQuery<JournalEntry>(headerQuery, {
        entryNumber,
        date: entryData.date,
        description: entryData.description,
        reference: entryData.reference,
        totalDebit,
        totalCredit,
        createdBy: entryData.createdBy
      }, { transaction });

      const journalEntryId = headerResult[0].id;

      // Create journal entry lines
      for (let i = 0; i < entryData.entries.length; i++) {
        const line = entryData.entries[i];
        const lineQuery = `
          INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_code, debit, credit, description
          ) VALUES (
            :journalEntryId, :lineNumber, :accountCode, :debit, :credit, :description
          )
        `;

        await this.executeQuery(lineQuery, {
          journalEntryId,
          lineNumber: i + 1,
          accountCode: line.accountCode,
          debit: line.debit,
          credit: line.credit,
          description: line.description
        }, { transaction });
      }

      // Get complete journal entry with lines
      const completeEntry = await this.getJournalEntryById(journalEntryId);
      return this.createSuccessResponse(completeEntry.data!, 'Journal entry created successfully');
    });
  }

  async getJournalEntryById(id: string): Promise<ApiResponse<JournalEntry>> {
    const query = `
      SELECT 
        je.id,
        je.entry_number as "entryNumber",
        je.date,
        je.description,
        je.reference,
        je.total_debit as "totalDebit",
        je.total_credit as "totalCredit",
        je.status,
        je.created_by as "createdBy",
        je.created_at as "createdAt"
      FROM journal_entries je
      WHERE je.id = :id
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<JournalEntry>(query, { id });
        if (results.length === 0) {
          throw new Error('Journal entry not found');
        }

        const entry = results[0];

        // Get journal entry lines
        const linesQuery = `
          SELECT 
            jel.id,
            jel.account_code as "accountCode",
            a.name as "accountName",
            jel.debit,
            jel.credit,
            jel.description
          FROM journal_entry_lines jel
          LEFT JOIN chart_of_accounts a ON jel.account_code = a.code
          WHERE jel.journal_entry_id = :entryId
          ORDER BY jel.line_number
        `;
        
        entry.entries = await this.executeQuery<JournalEntryLine>(linesQuery, { entryId: entry.id });

        return entry;
      },
      {
        id,
        entryNumber: 'JE000000',
        date: new Date().toISOString().split('T')[0],
        description: 'Unknown Entry',
        totalDebit: 0,
        totalCredit: 0,
        status: 'DRAFT',
        entries: [],
        createdBy: 'system',
        createdAt: new Date().toISOString()
      },
      'Get journal entry by ID'
    );
  }

  async getChartOfAccounts(): Promise<ApiResponse<Account[]>> {
    const query = `
      SELECT 
        id,
        code,
        name,
        type,
        parent_id as "parentId",
        balance,
        is_active as "isActive",
        created_at as "createdAt"
      FROM chart_of_accounts
      WHERE is_active = true
      ORDER BY code
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery<Account>(query);
        return results;
      },
      [
        { id: '1', code: '1000', name: 'Cash', type: 'ASSET', balance: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '2', code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '3', code: '3000', name: 'Owner Equity', type: 'EQUITY', balance: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '4', code: '4000', name: 'Sales Revenue', type: 'REVENUE', balance: 0, isActive: true, createdAt: new Date().toISOString() },
        { id: '5', code: '5000', name: 'Operating Expenses', type: 'EXPENSE', balance: 0, isActive: true, createdAt: new Date().toISOString() }
      ],
      'Get chart of accounts'
    );
  }

  async getFinancialSummary(period: { from: string; to: string }): Promise<ApiResponse<any>> {
    const query = `
      SELECT 
        SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) as total_expense,
        COUNT(CASE WHEN t.type = 'INCOME' THEN 1 END) as income_count,
        COUNT(CASE WHEN t.type = 'EXPENSE' THEN 1 END) as expense_count
      FROM finance_transactions t
      WHERE t.date BETWEEN :dateFrom AND :dateTo
        AND t.status = 'APPROVED'
    `;

    return this.withFallback(
      async () => {
        const results = await this.executeQuery(query, {
          dateFrom: period.from,
          dateTo: period.to
        });

        const summary = results[0] || {};
        const totalIncome = parseFloat(summary.total_income || '0');
        const totalExpense = parseFloat(summary.total_expense || '0');
        const netIncome = totalIncome - totalExpense;

        return {
          period,
          totalIncome,
          totalExpense,
          netIncome,
          incomeCount: parseInt(summary.income_count || '0'),
          expenseCount: parseInt(summary.expense_count || '0'),
          generatedAt: new Date().toISOString()
        };
      },
      {
        period,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        incomeCount: 0,
        expenseCount: 0,
        generatedAt: new Date().toISOString()
      },
      'Get financial summary'
    );
  }
}

export default FinanceAdapter;
