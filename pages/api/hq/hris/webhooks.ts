import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

// HRIS Webhook Event Types
export type HRISEventType = 
  | 'employee.created' | 'employee.updated' | 'employee.terminated'
  | 'attendance.clock_in' | 'attendance.clock_out' | 'attendance.late' | 'attendance.absent'
  | 'kpi.target_set' | 'kpi.updated' | 'kpi.achieved' | 'kpi.not_achieved'
  | 'performance.review_created' | 'performance.review_submitted' | 'performance.review_acknowledged'
  | 'leave.requested' | 'leave.approved' | 'leave.rejected';

interface HRISWebhookPayload {
  eventType: HRISEventType;
  timestamp: string;
  employeeId: string;
  employeeName: string;
  branchId?: string;
  branchName?: string;
  data: any;
  triggeredBy?: string;
}

let HRISWebhookLog: any;
try {
  const models = require('../../../../models');
  HRISWebhookLog = models.HRISWebhookLog;
} catch (e) {
  console.warn('HRISWebhookLog model not available:', e);
}

const EVENT_TYPES = [
  'employee.created', 'employee.updated', 'employee.terminated',
  'attendance.clock_in', 'attendance.clock_out', 'attendance.late', 'attendance.absent',
  'kpi.target_set', 'kpi.updated', 'kpi.achieved', 'kpi.not_achieved',
  'performance.review_created', 'performance.review_submitted', 'performance.review_acknowledged',
  'leave.requested', 'leave.approved', 'leave.rejected'
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getWebhooks(req, res);
      case 'POST':
        return triggerWebhook(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.error('HRIS Webhook API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'hris' });

async function getWebhooks(req: NextApiRequest, res: NextApiResponse) {
  const { eventType, limit: qLimit } = req.query;
  const take = Math.min(parseInt(qLimit as string) || 50, 200);

  if (HRISWebhookLog) {
    try {
      const where: any = {};
      if (eventType && eventType !== 'all') where.eventType = eventType;

      const webhooks = await HRISWebhookLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: take
      });

      return res.status(HttpStatus.OK).json(
        successResponse({ webhooks, eventTypes: EVENT_TYPES })
      );
    } catch (e: any) {
      console.warn('Webhook DB query failed:', e.message);
    }
  }

  return res.status(HttpStatus.OK).json(
    successResponse({ webhooks: [], eventTypes: EVENT_TYPES })
  );
}

async function triggerWebhook(req: NextApiRequest, res: NextApiResponse) {
  const { eventType, employeeId, employeeName, branchId, branchName, data, triggeredBy } = req.body;

  if (!eventType || !employeeId) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Event type and employee ID are required')
    );
  }

  const payload: HRISWebhookPayload = {
    eventType,
    timestamp: new Date().toISOString(),
    employeeId,
    employeeName: employeeName || 'Unknown',
    branchId,
    branchName,
    data,
    triggeredBy
  };

  await persistWebhook(payload);
  await processHRISWebhook(payload);

  return res.status(HttpStatus.OK).json(
    successResponse(payload, undefined, 'Webhook triggered successfully')
  );
}

async function persistWebhook(payload: HRISWebhookPayload) {
  if (HRISWebhookLog) {
    try {
      await HRISWebhookLog.create({
        eventType: payload.eventType,
        employeeId: payload.employeeId,
        employeeName: payload.employeeName,
        branchId: payload.branchId || null,
        branchName: payload.branchName || null,
        data: typeof payload.data === 'object' ? payload.data : { raw: payload.data },
        triggeredBy: payload.triggeredBy || null,
        status: 'triggered'
      });
    } catch (e: any) {
      console.warn('Failed to persist webhook:', e.message);
    }
  }
}

async function processHRISWebhook(payload: HRISWebhookPayload) {
  const { eventType, employeeName, branchName } = payload;

  console.log(`[HRIS Webhook] ${eventType}:`, {
    employee: employeeName,
    branch: branchName,
    timestamp: payload.timestamp
  });

  // Event-specific processing
  switch (eventType) {
    case 'attendance.late':
      console.log(`[Alert] ${employeeName} terlambat di ${branchName}`);
      break;
    
    case 'attendance.absent':
      console.log(`[Alert] ${employeeName} tidak hadir di ${branchName}`);
      break;
    
    case 'kpi.not_achieved':
      console.log(`[KPI Alert] ${employeeName} tidak mencapai target KPI`);
      break;
    
    case 'kpi.achieved':
      console.log(`[KPI] ${employeeName} berhasil mencapai target KPI`);
      break;
    
    case 'performance.review_submitted':
      console.log(`[Review] Performance review submitted for ${employeeName}`);
      break;
    
    case 'leave.requested':
      console.log(`[Leave] ${employeeName} mengajukan cuti`);
      break;
    
    default:
      console.log(`[HRIS] Event ${eventType} processed`);
  }

  // Update status to processed
  if (HRISWebhookLog) {
    try {
      const { Op } = require('sequelize');
      await HRISWebhookLog.update(
        { status: 'processed' },
        { where: { employeeId: payload.employeeId, eventType: payload.eventType, status: 'triggered' }, limit: 1 }
      );
    } catch (_) {}
  }
}

// Export trigger function for use in other APIs
export async function triggerHRISWebhook(
  eventType: HRISEventType,
  employeeId: string,
  employeeName: string,
  data: any,
  branchId?: string,
  branchName?: string,
  triggeredBy?: string
) {
  const payload: HRISWebhookPayload = {
    eventType,
    timestamp: new Date().toISOString(),
    employeeId,
    employeeName,
    branchId,
    branchName,
    data,
    triggeredBy
  };

  await persistWebhook(payload);
  await processHRISWebhook(payload);

  return payload;
}
