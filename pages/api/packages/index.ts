import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        return getPackages(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Packages API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getPackages(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = getDb();
    const { businessTypeId, industryType, category, featured } = req.query;
    
    const where: any = { isActive: true };
    
    if (businessTypeId) where.businessTypeId = businessTypeId;
    if (industryType) where.industryType = industryType;
    if (category) where.category = category;
    if (featured === 'true') where.isFeatured = true;
    
    const packages = await db.sequelize.query(
      `
      SELECT 
        bp.*,
        bt.name as business_type_name,
        bt.code as business_type_code,
        COUNT(DISTINCT pm.id) as module_count,
        COUNT(DISTINCT pf.id) as feature_count,
        json_agg(DISTINCT jsonb_build_object(
          'id', m.id,
          'code', m.code,
          'name', m.name,
          'icon', m.icon,
          'isRequired', pm.is_required,
          'isDefaultEnabled', pm.is_default_enabled
        )) FILTER (WHERE m.id IS NOT NULL) as modules,
        json_agg(DISTINCT jsonb_build_object(
          'code', pf.feature_code,
          'name', pf.feature_name
        )) FILTER (WHERE pf.id IS NOT NULL) as features
      FROM business_packages bp
      LEFT JOIN business_types bt ON bp.business_type_id = bt.id
      LEFT JOIN package_modules pm ON bp.id = pm.package_id
      LEFT JOIN modules m ON pm.module_id = m.id
      LEFT JOIN package_features pf ON bp.id = pf.package_id
      WHERE bp.is_active = true
        ${businessTypeId ? `AND bp.business_type_id = '${businessTypeId}'` : ''}
        ${industryType ? `AND bp.industry_type = '${industryType}'` : ''}
        ${category ? `AND bp.category = '${category}'` : ''}
        ${featured === 'true' ? 'AND bp.is_featured = true' : ''}
      GROUP BY bp.id, bt.id, bt.name, bt.code
      ORDER BY bp.sort_order ASC, bp.name ASC
      `,
      { type: db.Sequelize.QueryTypes.SELECT }
    );
    
    return res.status(200).json({
      success: true,
      data: {
        packages: packages.map((pkg: any) => ({
          id: pkg.id,
          code: pkg.code,
          name: pkg.name,
          description: pkg.description,
          industryType: pkg.industry_type,
          businessType: {
            id: pkg.business_type_id,
            name: pkg.business_type_name,
            code: pkg.business_type_code
          },
          category: pkg.category,
          icon: pkg.icon,
          color: pkg.color,
          pricingTier: pkg.pricing_tier,
          basePrice: parseFloat(pkg.base_price || 0),
          isFeatured: pkg.is_featured,
          metadata: pkg.metadata,
          moduleCount: parseInt(pkg.module_count || 0),
          featureCount: parseInt(pkg.feature_count || 0),
          modules: pkg.modules || [],
          features: pkg.features || []
        })),
        summary: {
          total: packages.length,
          featured: packages.filter((p: any) => p.is_featured).length
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
