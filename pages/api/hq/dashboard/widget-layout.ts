import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = (session.user as any).id;

    if (req.method === 'GET') {
      // Try to load from user_preferences table
      try {
        const [rows] = await sequelize.query(
          `SELECT value FROM user_preferences WHERE user_id = :userId AND key = 'dashboard_widget_layout' LIMIT 1`,
          { replacements: { userId } }
        );
        if (rows.length > 0) {
          return res.status(200).json({ success: true, data: JSON.parse(rows[0].value) });
        }
      } catch {
        // Table might not exist yet, that's OK
      }
      return res.status(200).json({ success: true, data: null });
    }

    if (req.method === 'PUT') {
      const { widgets } = req.body;
      if (!Array.isArray(widgets)) {
        return res.status(400).json({ success: false, error: 'widgets must be an array' });
      }

      const layout = { widgets, updatedAt: new Date().toISOString() };

      try {
        // Ensure user_preferences table exists
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            key VARCHAR(100) NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, key)
          )
        `);

        // Upsert
        await sequelize.query(`
          INSERT INTO user_preferences (user_id, key, value, updated_at)
          VALUES (:userId, 'dashboard_widget_layout', :value, NOW())
          ON CONFLICT (user_id, key) DO UPDATE SET value = :value, updated_at = NOW()
        `, { replacements: { userId, value: JSON.stringify(layout) } });

        return res.status(200).json({ success: true, data: layout });
      } catch (e: any) {
        console.error('Save widget layout error:', e.message);
        // Fallback: just return success (client will use localStorage)
        return res.status(200).json({ success: true, data: layout, fallback: true });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Widget layout API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
