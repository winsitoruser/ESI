import type { NextApiRequest, NextApiResponse } from 'next';

interface RequisitionItem {
  id: string;
  productId: number;
  productName: string;
  sku: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  fulfilledQuantity: number;
  unit: string;
  currentStock: number;
  minStock: number;
  estimatedUnitCost: number;
  status: string;
}

interface Requisition {
  id: string;
  irNumber: string;
  requestingBranch: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
  fulfillingBranch: {
    id: string;
    code: string;
    name: string;
  } | null;
  requestType: string;
  priority: string;
  status: string;
  requestedDeliveryDate: string | null;
  totalItems: number;
  totalQuantity: number;
  estimatedValue: number;
  requester: string;
  createdAt: string;
  items: RequisitionItem[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return getRequisitions(req, res);
    case 'POST':
      return createRequisition(req, res);
    case 'PUT':
      return updateRequisition(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getRequisitions(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, priority, branchId, page = '1', limit = '20' } = req.query;

    let requisitions: Requisition[] = [];

    try {
      const InternalRequisition = require('../../../models/InternalRequisition');
      const Branch = require('../../../models/Branch');
      const User = require('../../../models/User');
      const { Op } = require('sequelize');

      const where: any = {};
      if (status && status !== 'all') where.status = status;
      if (priority && priority !== 'all') where.priority = priority;
      if (branchId) where.requesting_branch_id = branchId;

      const dbRequisitions = await InternalRequisition.findAll({
        where,
        include: [
          { model: Branch, as: 'requestingBranch' },
          { model: Branch, as: 'fulfillingBranch' },
          { model: User, as: 'requester' }
        ],
        order: [
          ['priority', 'DESC'],
          ['created_at', 'DESC']
        ],
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      });

      requisitions = dbRequisitions.map((req: any) => ({
        id: req.id,
        irNumber: req.ir_number,
        requestingBranch: req.requestingBranch ? {
          id: req.requestingBranch.id,
          code: req.requestingBranch.code,
          name: req.requestingBranch.name,
          city: req.requestingBranch.city
        } : null,
        fulfillingBranch: req.fulfillingBranch ? {
          id: req.fulfillingBranch.id,
          code: req.fulfillingBranch.code,
          name: req.fulfillingBranch.name
        } : null,
        requestType: req.request_type,
        priority: req.priority,
        status: req.status,
        requestedDeliveryDate: req.requested_delivery_date,
        totalItems: req.total_items,
        totalQuantity: parseFloat(req.total_quantity),
        estimatedValue: parseFloat(req.estimated_value),
        requester: req.requester?.name || 'Unknown',
        createdAt: req.created_at,
        items: []
      }));
    } catch (dbError) {
      console.log('Database not available, using mock data');
      requisitions = getMockRequisitions();
    }

    res.status(200).json({
      success: true,
      requisitions,
      total: requisitions.length
    });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createRequisition(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { requestingBranchId, items, priority, requestType, requestedDeliveryDate, notes } = req.body;

    if (!requestingBranchId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const InternalRequisition = require('../../../models/InternalRequisition');
      const InternalRequisitionItem = require('../../../models/InternalRequisitionItem');
      const Branch = require('../../../models/Branch');

      // Get branch code for IR number generation
      const branch = await Branch.findByPk(requestingBranchId);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }

      // Generate IR number
      const irNumber = await InternalRequisition.generateIRNumber(branch.code);

      // Calculate totals
      const totalItems = items.length;
      const totalQuantity = items.reduce((sum: number, item: any) => sum + item.requestedQuantity, 0);
      const estimatedValue = items.reduce((sum: number, item: any) => 
        sum + (item.requestedQuantity * (item.estimatedUnitCost || 0)), 0);

      // Create requisition
      const requisition = await InternalRequisition.create({
        ir_number: irNumber,
        requesting_branch_id: requestingBranchId,
        request_type: requestType || 'restock',
        priority: priority || 'normal',
        status: 'submitted',
        requested_delivery_date: requestedDeliveryDate,
        total_items: totalItems,
        total_quantity: totalQuantity,
        estimated_value: estimatedValue,
        notes,
        requested_by: req.headers['x-user-id'] || 1
      });

      // Create items
      for (const item of items) {
        await InternalRequisitionItem.create({
          requisition_id: requisition.id,
          product_id: item.productId,
          requested_quantity: item.requestedQuantity,
          unit: item.unit,
          current_stock: item.currentStock,
          min_stock: item.minStock,
          estimated_unit_cost: item.estimatedUnitCost,
          estimated_total_cost: item.requestedQuantity * (item.estimatedUnitCost || 0),
          status: 'pending'
        });
      }

      res.status(201).json({
        success: true,
        requisition: {
          id: requisition.id,
          irNumber: requisition.ir_number
        },
        message: 'Internal Requisition created successfully'
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'Failed to create requisition' });
    }
  } catch (error) {
    console.error('Error creating requisition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateRequisition(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, action, items, rejectionReason, fulfillingBranchId } = req.body;

    if (!id || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const InternalRequisition = require('../../../models/InternalRequisition');
      const InternalRequisitionItem = require('../../../models/InternalRequisitionItem');
      const AuditLog = require('../../../models/AuditLog');

      const requisition = await InternalRequisition.findByPk(id);
      if (!requisition) {
        return res.status(404).json({ error: 'Requisition not found' });
      }

      const oldStatus = requisition.status;
      let newStatus = requisition.status;
      let message = '';

      switch (action) {
        case 'approve':
          newStatus = 'approved';
          message = 'Requisition approved successfully';
          
          // Update item statuses and approved quantities
          if (items && items.length > 0) {
            for (const item of items) {
              await InternalRequisitionItem.update({
                approved_quantity: item.approvedQuantity,
                status: item.approvedQuantity > 0 ? 'approved' : 'rejected'
              }, {
                where: { id: item.id }
              });
            }
          } else {
            // Auto-approve all items with full quantity
            await InternalRequisitionItem.update({
              approved_quantity: require('sequelize').literal('requested_quantity'),
              status: 'approved'
            }, {
              where: { requisition_id: id }
            });
          }
          break;

        case 'partially_approve':
          newStatus = 'partially_approved';
          message = 'Requisition partially approved';
          break;

        case 'reject':
          newStatus = 'rejected';
          message = 'Requisition rejected';
          await InternalRequisitionItem.update({
            status: 'rejected',
            rejection_reason: rejectionReason
          }, {
            where: { requisition_id: id }
          });
          break;

        case 'process':
          newStatus = 'processing';
          message = 'Requisition is now being processed';
          break;

        case 'ship':
          newStatus = 'in_transit';
          message = 'Requisition is now in transit';
          break;

        case 'deliver':
          newStatus = 'delivered';
          message = 'Requisition delivered';
          break;

        case 'complete':
          newStatus = 'completed';
          message = 'Requisition completed';
          await InternalRequisitionItem.update({
            status: 'fulfilled',
            fulfilled_quantity: require('sequelize').literal('approved_quantity')
          }, {
            where: { requisition_id: id, status: 'approved' }
          });
          break;

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      // Update requisition
      await requisition.update({
        status: newStatus,
        fulfilling_branch_id: fulfillingBranchId || requisition.fulfilling_branch_id,
        rejection_reason: action === 'reject' ? rejectionReason : null,
        reviewed_by: req.headers['x-user-id'] || null,
        reviewed_at: ['approve', 'partially_approve', 'reject'].includes(action) ? new Date() : null,
        approved_by: action === 'approve' ? req.headers['x-user-id'] : null,
        approved_at: action === 'approve' ? new Date() : null
      });

      // Log HQ intervention
      try {
        await AuditLog.logHqIntervention({
          userId: req.headers['x-user-id'],
          userRole: 'SUPER_ADMIN',
          action: `IR_${action.toUpperCase()}`,
          resource: 'InternalRequisition',
          resourceId: id,
          targetBranchId: requisition.requesting_branch_id,
          oldValues: { status: oldStatus },
          newValues: { status: newStatus },
          reason: action === 'reject' ? rejectionReason : `IR ${action} by HQ`,
          ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
      } catch (auditError) {
        console.warn('Failed to create audit log:', auditError);
      }

      res.status(200).json({
        success: true,
        message,
        requisition: {
          id: requisition.id,
          status: newStatus
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'Failed to update requisition' });
    }
  } catch (error) {
    console.error('Error updating requisition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getMockRequisitions(): Requisition[] {
  return [
    {
      id: '1',
      irNumber: 'IR-BR002-2602-0001',
      requestingBranch: { id: '2', code: 'BR-002', name: 'Cabang Bandung', city: 'Bandung' },
      fulfillingBranch: { id: '6', code: 'WH-001', name: 'Gudang Pusat Cikarang' },
      requestType: 'restock',
      priority: 'high',
      status: 'submitted',
      requestedDeliveryDate: '2026-02-25',
      totalItems: 15,
      totalQuantity: 450,
      estimatedValue: 12500000,
      requester: 'Siti Rahayu',
      createdAt: '2026-02-22T03:30:00Z',
      items: []
    },
    {
      id: '2',
      irNumber: 'IR-BR003-2602-0002',
      requestingBranch: { id: '3', code: 'BR-003', name: 'Cabang Surabaya', city: 'Surabaya' },
      fulfillingBranch: { id: '6', code: 'WH-001', name: 'Gudang Pusat Cikarang' },
      requestType: 'emergency',
      priority: 'urgent',
      status: 'under_review',
      requestedDeliveryDate: '2026-02-23',
      totalItems: 5,
      totalQuantity: 200,
      estimatedValue: 8500000,
      requester: 'Budi Santoso',
      createdAt: '2026-02-22T01:15:00Z',
      items: []
    },
    {
      id: '3',
      irNumber: 'IR-BR004-2602-0003',
      requestingBranch: { id: '4', code: 'BR-004', name: 'Cabang Medan', city: 'Medan' },
      fulfillingBranch: { id: '6', code: 'WH-001', name: 'Gudang Pusat Cikarang' },
      requestType: 'scheduled',
      priority: 'normal',
      status: 'approved',
      requestedDeliveryDate: '2026-02-28',
      totalItems: 25,
      totalQuantity: 800,
      estimatedValue: 22000000,
      requester: 'Dewi Lestari',
      createdAt: '2026-02-21T08:00:00Z',
      items: []
    }
  ];
}
