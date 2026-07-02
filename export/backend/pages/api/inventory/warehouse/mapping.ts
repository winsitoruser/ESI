import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { sequelize } from '@/lib/sequelizeClient';
import { QueryTypes } from 'sequelize';
import { canAccessBranch } from '@/lib/branchFilter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { branchId, includeProducts = false, includeMovements = false } = req.query;

      // Determine which branch to query
      const targetBranchId = branchId || session.user.branchId;
      
      if (!targetBranchId) {
        return res.status(400).json({
          success: false,
          error: 'Branch ID is required'
        });
      }

      // Check branch access
      const hasAccess = await canAccessBranch(req, res, targetBranchId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this branch'
        });
      }

      // Get branch warehouse info
      const [branch] = await sequelize.query(`
        SELECT 
          id, name, code, address, city,
          warehouse_layout, warehouse_capacity,
          warehouse_zones, storage_areas
        FROM branches
        WHERE id = :branchId
        AND tenant_id = :tenantId
      `, {
        replacements: { 
          branchId: targetBranchId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          error: 'Branch not found'
        });
      }

      // Get warehouse zones
      const zones = await sequelize.query(`
        SELECT 
          wz.id,
          wz.name,
          wz.zone_type,
          wz.capacity,
          wz.current_utilization,
          wz.coordinates,
          wz.description,
          wz.is_active
        FROM warehouse_zones wz
        WHERE wz.branch_id = :branchId
        AND wz.tenant_id = :tenantId
        ORDER BY wz.name
      `, {
        replacements: { 
          branchId: targetBranchId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      // Get storage areas/bins
      const storageAreas = await sequelize.query(`
        SELECT 
          sa.id,
          sa.zone_id,
          sa.name,
          sa.bin_code,
          sa.capacity,
            sa.current_utilization,
          sa.coordinates_x,
          sa.coordinates_y,
          sa.coordinates_z,
          sa.aisle,
          sa.shelf,
          sa.level,
          sa.is_active
        FROM storage_areas sa
        WHERE sa.branch_id = :branchId
        AND sa.tenant_id = :tenantId
        ORDER BY sa.aisle, sa.shelf, sa.level
      `, {
        replacements: { 
          branchId: targetBranchId,
          tenantId: session.user.tenantId 
        },
        type: QueryTypes.SELECT
      });

      let products = [];
      if (includeProducts === 'true') {
        // Get products with location info
        products = await sequelize.query(`
          SELECT 
            p.id,
            p.name,
            p.sku,
            p.stock,
            p.min_stock,
            p.max_stock,
            p.unit_id,
            u.name as unit_name,
            c.name as category_name,
            sa.id as storage_area_id,
            sa.bin_code,
            sa.aisle,
            sa.shelf,
            sa.level,
            wz.name as zone_name,
            wz.zone_type
          FROM products p
            LEFT JOIN storage_areas sa ON p.storage_area_id = sa.id
            LEFT JOIN warehouse_zones wz ON sa.zone_id = wz.id
            LEFT JOIN units u ON p.unit_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.branch_id = :branchId
          AND p.tenant_id = :tenantId
          AND p.is_active = true
          ORDER BY sa.aisle, sa.shelf, sa.level, p.name
        `, {
          replacements: { 
            branchId: targetBranchId,
            tenantId: session.user.tenantId 
          },
          type: QueryTypes.SELECT
        });
      }

      let movements = [];
      if (includeMovements === 'true') {
        // Get recent stock movements
        movements = await sequelize.query(`
          SELECT 
            sm.id,
            sm.movement_number,
            sm.movement_type,
            sm.reference_type,
            sm.reference_id,
            sm.quantity,
            sm.from_location,
            sm.to_location,
            sm.status,
            sm.notes,
            sm.created_at,
            p.name as product_name,
            p.sku as product_sku,
            u.name as created_by_name
          FROM stock_movements sm
            JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.created_by = u.id
          WHERE (sm.from_branch_id = :branchId OR sm.to_branch_id = :branchId)
          AND sm.tenant_id = :tenantId
          AND sm.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY sm.created_at DESC
          LIMIT 50
        `, {
          replacements: { 
            branchId: targetBranchId,
            tenantId: session.user.tenantId 
          },
          type: QueryTypes.SELECT
        });
      }

      // Calculate utilization metrics
      const totalCapacity = zones.reduce((sum, zone) => sum + parseFloat(zone.capacity || 0), 0);
      const totalUtilization = zones.reduce((sum, zone) => sum + parseFloat(zone.current_utilization || 0), 0);
      const utilizationPercentage = totalCapacity > 0 ? (totalUtilization / totalCapacity) * 100 : 0;

      // Get zone utilization breakdown
      const zoneUtilization = zones.map(zone => ({
        ...zone,
        utilizationPercentage: zone.capacity > 0 
          ? (parseFloat(zone.current_utilization || 0) / parseFloat(zone.capacity)) * 100 
          : 0,
        storageAreas: storageAreas.filter(sa => sa.zone_id === zone.id).map(sa => ({
          ...sa,
          utilizationPercentage: sa.capacity > 0 
            ? (parseFloat(sa.current_utilization || 0) / parseFloat(sa.capacity)) * 100 
            : 0,
          products: products.filter(p => p.storage_area_id === sa.id)
        }))
      }));

      return res.status(200).json({
        success: true,
        data: {
          branch: {
            id: branch.id,
            name: branch.name,
            code: branch.code,
            address: branch.address,
            city: branch.city,
            warehouseLayout: branch.warehouse_layout,
            warehouseCapacity: parseFloat(branch.warehouse_capacity || 0),
            warehouseZones: branch.warehouse_zones,
            storageAreas: branch.storage_areas
          },
          zones: zoneUtilization,
          storageAreas: includeProducts === 'true' ? storageAreas : undefined,
          products: includeProducts === 'true' ? products : undefined,
          movements: includeMovements === 'true' ? movements : undefined,
          metrics: {
            totalCapacity,
            totalUtilization,
            utilizationPercentage,
            totalZones: zones.length,
            totalStorageAreas: storageAreas.length,
            activeZones: zones.filter(z => z.is_active).length,
            activeStorageAreas: storageAreas.filter(sa => sa.is_active).length,
            productsWithLocation: products.filter(p => p.storage_area_id).length,
            productsWithoutLocation: products.filter(p => !p.storage_area_id).length
          }
        }
      });

    } else if (req.method === 'POST') {
      // Update product location
      const {
        productId,
        storageAreaId,
        zoneId,
        coordinates
      } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      // Get product to verify branch access
      const [product] = await sequelize.query(`
        SELECT id, branch_id, tenant_id FROM products 
        WHERE id = :productId
      `, {
        replacements: { productId },
        type: QueryTypes.SELECT
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Check branch access
      const hasAccess = await canAccessBranch(req, res, product.branch_id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this branch'
        });
      }

      // Validate storage area if provided
      if (storageAreaId) {
        const [storageArea] = await sequelize.query(`
          SELECT id, branch_id FROM storage_areas 
          WHERE id = :storageAreaId
        `, {
          replacements: { storageAreaId },
          type: QueryTypes.SELECT
        });

        if (!storageArea || storageArea.branch_id !== product.branch_id) {
          return res.status(400).json({
            success: false,
            error: 'Invalid storage area'
          });
        }
      }

      // Update product location
      await sequelize.query(`
        UPDATE products SET
          storage_area_id = :storageAreaId,
          warehouse_coordinates = :coordinates,
          updated_at = NOW()
        WHERE id = :productId
      `, {
        replacements: {
          productId,
          storageAreaId,
          coordinates: coordinates ? JSON.stringify(coordinates) : null
        }
      });

      // Create location history
      await sequelize.query(`
        INSERT INTO product_location_history (
          id, product_id, storage_area_id, coordinates,
          moved_by, tenant_id, created_at
        ) VALUES (
          UUID(), :productId, :storageAreaId, :coordinates,
          :movedBy, :tenantId, NOW()
        )
      `, {
        replacements: {
          productId,
          storageAreaId,
          coordinates: coordinates ? JSON.stringify(coordinates) : null,
          movedBy: session.user.id,
          tenantId: session.user.tenantId
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Product location updated successfully'
      });

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error: any) {
    console.error('Warehouse mapping API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
