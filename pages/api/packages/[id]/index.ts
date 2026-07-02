import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const getDb = () => require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return getPackageDetails(req, res, id as string);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Package details API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getPackageDetails(req: NextApiRequest, res: NextApiResponse, packageId: string) {
  try {
    const db = getDb();
    
    const [packageData] = await db.sequelize.query(
      `
      SELECT 
        bp.*,
        bt.name as business_type_name,
        bt.code as business_type_code,
        json_agg(DISTINCT jsonb_build_object(
          'id', m.id,
          'code', m.code,
          'name', m.name,
          'description', m.description,
          'icon', m.icon,
          'category', m.category,
          'isRequired', pm.is_required,
          'isDefaultEnabled', pm.is_default_enabled,
          'sortOrder', pm.sort_order,
          'configuration', pm.configuration
        ) ORDER BY pm.sort_order) FILTER (WHERE m.id IS NOT NULL) as modules,
        json_agg(DISTINCT jsonb_build_object(
          'code', pf.feature_code,
          'name', pf.feature_name,
          'isEnabled', pf.is_enabled
        )) FILTER (WHERE pf.id IS NOT NULL) as features
      FROM business_packages bp
      LEFT JOIN business_types bt ON bp.business_type_id = bt.id
      LEFT JOIN package_modules pm ON bp.id = pm.package_id
      LEFT JOIN modules m ON pm.module_id = m.id
      LEFT JOIN package_features pf ON bp.id = pf.package_id
      WHERE bp.id = :packageId
      GROUP BY bp.id, bt.id, bt.name, bt.code
      `,
      {
        replacements: { packageId },
        type: db.Sequelize.QueryTypes.SELECT
      }
    );
    
    if (!packageData) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        id: packageData.id,
        code: packageData.code,
        name: packageData.name,
        description: packageData.description,
        industryType: packageData.industry_type,
        businessType: {
          id: packageData.business_type_id,
          name: packageData.business_type_name,
          code: packageData.business_type_code
        },
        category: packageData.category,
        icon: packageData.icon,
        color: packageData.color,
        pricingTier: packageData.pricing_tier,
        basePrice: parseFloat(packageData.base_price || 0),
        isFeatured: packageData.is_featured,
        metadata: packageData.metadata,
        modules: packageData.modules || [],
        features: packageData.features || []
      }
    });
  } catch (error: any) {
    console.error('Error fetching package details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
