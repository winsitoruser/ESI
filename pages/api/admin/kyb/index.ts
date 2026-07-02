import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { QueryTypes } from 'sequelize';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userRole = (session.user?.role as string)?.toLowerCase();
  const allowedRoles = ['admin', 'super_admin', 'superadmin'];
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const db = getDb();

  if (req.method === 'GET') {
    try {
      const { status, page = '1', limit = '20', search } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let whereClause = 'WHERE 1=1';
      const replacements: any = {};

      if (status && status !== 'all') {
        whereClause += ' AND ka.status = :status';
        replacements.status = status;
      }

      if (search) {
        whereClause += ' AND (ka.business_name ILIKE :search OR u.name ILIKE :search OR u.email ILIKE :search)';
        replacements.search = `%${search}%`;
      }

      const countResult = await db.sequelize.query(`
        SELECT COUNT(*) as total
        FROM kyb_applications ka
        JOIN users u ON ka.user_id = u.id
        ${whereClause}
      `, {
        replacements,
        type: QueryTypes.SELECT
      });

      const total = parseInt((countResult as any[])[0]?.total || '0');

      const applications = await db.sequelize.query(`
        SELECT 
          ka.id,
          ka.business_name,
          ka.business_category,
          ka.legal_entity_type,
          ka.business_structure,
          ka.status,
          ka.current_step,
          ka.completion_percentage,
          ka.submitted_at,
          ka.reviewed_at,
          ka.created_at,
          ka.pic_name,
          ka.pic_phone,
          ka.business_city,
          ka.business_province,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          t.id as tenant_id,
          t.kyb_status as tenant_kyb_status,
          (SELECT COUNT(*) FROM kyb_documents kd WHERE kd.kyb_application_id = ka.id) as document_count
        FROM kyb_applications ka
        JOIN users u ON ka.user_id = u.id
        LEFT JOIN tenants t ON ka.tenant_id = t.id
        ${whereClause}
        ORDER BY 
          CASE ka.status 
            WHEN 'submitted' THEN 1 
            WHEN 'in_review' THEN 2 
            WHEN 'revision_needed' THEN 3 
            WHEN 'draft' THEN 4 
            WHEN 'approved' THEN 5 
            WHEN 'rejected' THEN 6 
          END,
          ka.submitted_at DESC NULLS LAST,
          ka.created_at DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { ...replacements, limit: parseInt(limit as string), offset },
        type: QueryTypes.SELECT
      });

      return res.status(200).json({
        success: true,
        data: applications,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        }
      });
    } catch (error) {
      console.error('Admin KYB list error:', error);
      return res.status(500).json({ message: 'Failed to fetch KYB applications' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
