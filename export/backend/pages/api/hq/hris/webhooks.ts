import type { NextApiRequest, NextApiResponse } from 'next';

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

// In-memory webhook storage
const hrisWebhooks: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getWebhooks(req, res);
      case 'POST':
        return triggerWebhook(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('HRIS Webhook API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getWebhooks(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ 
    webhooks: hrisWebhooks,
    eventTypes: [
      'employee.created', 'employee.updated', 'employee.terminated',
      'attendance.clock_in', 'attendance.clock_out', 'attendance.late', 'attendance.absent',
      'kpi.target_set', 'kpi.updated', 'kpi.achieved', 'kpi.not_achieved',
      'performance.review_created', 'performance.review_submitted', 'performance.review_acknowledged',
      'leave.requested', 'leave.approved', 'leave.rejected'
    ]
  });
}

async function triggerWebhook(req: NextApiRequest, res: NextApiResponse) {
  const { eventType, employeeId, employeeName, branchId, branchName, data, triggeredBy } = req.body;

  if (!eventType || !employeeId) {
    return res.status(400).json({ error: 'Event type and employee ID are required' });
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

  // Log webhook
  hrisWebhooks.push({
    id: Date.now().toString(),
    ...payload,
    status: 'triggered'
  });

  // Process webhook based on event type
  await processHRISWebhook(payload);

  return res.status(200).json({ 
    success: true, 
    message: 'Webhook triggered successfully',
    payload 
  });
}

async function processHRISWebhook(payload: HRISWebhookPayload) {
  const { eventType, employeeName, branchName, data } = payload;

  console.log(`[HRIS Webhook] ${eventType}:`, {
    employee: employeeName,
    branch: branchName,
    timestamp: payload.timestamp
  });

  // Event-specific processing
  switch (eventType) {
    case 'attendance.late':
      // Send notification to manager
      console.log(`[Alert] ${employeeName} terlambat di ${branchName}`);
      break;
    
    case 'attendance.absent':
      // Send urgent notification
      console.log(`[Alert] ${employeeName} tidak hadir di ${branchName}`);
      break;
    
    case 'kpi.not_achieved':
      // Alert to HQ
      console.log(`[KPI Alert] ${employeeName} tidak mencapai target KPI`);
      break;
    
    case 'kpi.achieved':
      // Congratulations notification
      console.log(`[KPI] ${employeeName} berhasil mencapai target KPI`);
      break;
    
    case 'performance.review_submitted':
      // Notify reviewer
      console.log(`[Review] Performance review submitted for ${employeeName}`);
      break;
    
    case 'leave.requested':
      // Notify approver
      console.log(`[Leave] ${employeeName} mengajukan cuti`);
      break;
    
    default:
      console.log(`[HRIS] Event ${eventType} processed`);
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

  hrisWebhooks.push({
    id: Date.now().toString(),
    ...payload,
    status: 'triggered'
  });

  await processHRISWebhook(payload);

  return payload;
}
