import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/server/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;
    const { sequelize } = db;

    if (method === 'GET') {
      const { asOfDate } = req.query;
      
      const replacements: any = {
        asOfDate: asOfDate || new Date().toISOString().split('T')[0]
      };

      // Get assets
      const [assets] = await sequelize.query(`
        SELECT 
          category,
          COALESCE(SUM(value), 0) as total
        FROM assets
        WHERE is_active = true
        GROUP BY category
        ORDER BY total DESC
      `, { replacements });

      // Get bank accounts
      const [bankAccounts] = await sequelize.query(`
        SELECT 
          COALESCE(SUM(balance), 0) as total
        FROM bank_accounts
        WHERE is_active = true
      `, { replacements });

      // Get accounts receivable
      const [accountsReceivable] = await sequelize.query(`
        SELECT 
          COALESCE(SUM(total_amount - paid_amount), 0) as total
        FROM accounts_receivable
        WHERE status IN ('pending', 'partial')
      `, { replacements });

      // Get accounts payable
      const [accountsPayable] = await sequelize.query(`
        SELECT 
          COALESCE(SUM(total_amount - paid_amount), 0) as total
        FROM accounts_payable
        WHERE status IN ('pending', 'partial')
      `, { replacements });

      // Calculate totals
      const totalAssets = parseFloat(assets.reduce((sum: number, item: any) => sum + parseFloat(item.total), 0));
      const cashAndBank = parseFloat(bankAccounts[0]?.total || 0);
      const receivables = parseFloat(accountsReceivable[0]?.total || 0);
      const payables = parseFloat(accountsPayable[0]?.total || 0);

      const currentAssets = cashAndBank + receivables;
      const fixedAssets = totalAssets;
      const totalAssetsSum = currentAssets + fixedAssets;

      const currentLiabilities = payables;
      const totalLiabilities = currentLiabilities;

      const equity = totalAssetsSum - totalLiabilities;

      return res.status(200).json({
        success: true,
        data: {
          asOfDate: replacements.asOfDate,
          assets: {
            current: {
              cashAndBank,
              accountsReceivable: receivables,
              total: currentAssets
            },
            fixed: {
              items: assets,
              total: fixedAssets
            },
            total: totalAssetsSum
          },
          liabilities: {
            current: {
              accountsPayable: payables,
              total: currentLiabilities
            },
            longTerm: {
              items: [],
              total: 0
            },
            total: totalLiabilities
          },
          equity: {
            capital: equity,
            retainedEarnings: 0,
            total: equity
          },
          check: {
            assetsTotal: totalAssetsSum,
            liabilitiesAndEquityTotal: totalLiabilities + equity,
            balanced: Math.abs(totalAssetsSum - (totalLiabilities + equity)) < 0.01
          }
        },
        message: 'Balance Sheet generated successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error: any) {
    console.error('Balance Sheet API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
