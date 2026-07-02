import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Get counts for all settings
    const paymentMethodsCount = await pool.query('SELECT COUNT(*) as count FROM payment_methods WHERE is_active = true');
    const bankAccountsCount = await pool.query('SELECT COUNT(*) as count FROM bank_accounts WHERE is_active = true');
    const expenseCategoriesCount = await pool.query("SELECT COUNT(*) as count FROM finance_categories WHERE type = 'expense' AND is_active = true");
    const incomeCategoriesCount = await pool.query("SELECT COUNT(*) as count FROM finance_categories WHERE type = 'income' AND is_active = true");
    const chartOfAccountsCount = await pool.query('SELECT COUNT(*) as count FROM chart_of_accounts WHERE is_active = true');
    const assetsCount = await pool.query('SELECT COUNT(*) as count FROM company_assets WHERE is_active = true');

    // Get primary bank account
    const primaryBank = await pool.query('SELECT * FROM bank_accounts WHERE is_primary = true LIMIT 1');

    // Get company settings
    const companySettings = await pool.query("SELECT * FROM finance_settings WHERE setting_key IN ('company_name', 'company_tax_id', 'default_currency')");

    const summary = {
      paymentMethods: parseInt(paymentMethodsCount.rows[0]?.count || 0),
      bankAccounts: parseInt(bankAccountsCount.rows[0]?.count || 0),
      expenseCategories: parseInt(expenseCategoriesCount.rows[0]?.count || 0),
      incomeCategories: parseInt(incomeCategoriesCount.rows[0]?.count || 0),
      chartOfAccounts: parseInt(chartOfAccountsCount.rows[0]?.count || 0),
      assets: parseInt(assetsCount.rows[0]?.count || 0),
      primaryBank: primaryBank.rows[0] || null,
      companySettings: companySettings.rows.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {})
    };

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error in finance settings summary API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
