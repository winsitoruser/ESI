import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { rowsToSnake, rowToSnake } from '@/lib/hris/serialize-rows';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';

let TravelRequest: any, TravelExpense: any, ExpenseBudget: any;
try { TravelRequest = require('../../../models/TravelRequest'); } catch(e) {}
try { TravelExpense = require('../../../models/TravelExpense'); } catch(e) {}
try { ExpenseBudget = require('../../../models/ExpenseBudget'); } catch(e) {}

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch(e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = tenantIdFromSession(session);
  const { method } = req;
  const { action } = req.query;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action as string, tenantId);
      case 'POST': return handlePost(req, res, action as string, session, tenantId);
      case 'PUT': return handlePut(req, res, action as string, tenantId);
      case 'DELETE': return handleDelete(req, res, action as string, tenantId);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Travel API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string, tenantId: string | null) {
  if (!tenantId) {
    return res.json({
      success: true,
      data: action === 'overview'
        ? { totalRequests: 0, pendingApproval: 0, totalExpenses: 0, totalExpenseAmount: 0, budgets: [] }
        : [],
    });
  }

  switch (action) {
    case 'overview': {
      const requests = TravelRequest ? await TravelRequest.count({ where: { tenantId } }) : 0;
      const pending = TravelRequest ? await TravelRequest.count({ where: { tenantId, status: 'pending' } }) : 0;
      let expenses = 0;
      let totalExpenseAmount = 0;
      if (sequelize) {
        try {
          const [rows] = await sequelize.query(`
            SELECT COUNT(*)::int AS cnt, COALESCE(SUM(te.amount), 0) AS total
            FROM travel_expenses te
            INNER JOIN travel_requests tr ON te.travel_request_id = tr.id
            WHERE tr.tenant_id = :tenantId
          `, { replacements: { tenantId } });
          expenses = rows?.[0]?.cnt || 0;
          totalExpenseAmount = parseFloat(rows?.[0]?.total || 0);
        } catch { /* */ }
      }
      const budgets = ExpenseBudget
        ? await ExpenseBudget.findAll({ where: { isActive: true, tenantId } })
        : [];
      return res.json({
        success: true,
        data: {
          totalRequests: requests,
          pendingApproval: pending,
          totalExpenses: expenses,
          totalExpenseAmount,
          budgets,
        },
      });
    }
    case 'requests': {
      const { status, employee_id, travel_type } = req.query;
      const where: any = { tenantId };
      if (status) where.status = status;
      if (employee_id) where.employeeId = employee_id;
      if (travel_type) where.travelType = travel_type;
      const rows = TravelRequest ? await TravelRequest.findAll({ where, order: [['createdAt', 'DESC']] }) : [];
      return res.json({ success: true, data: rows.map(serializeTravelRequest) });
    }
    case 'expenses': {
      if (!sequelize) return res.json({ success: true, data: [] });
      const { travel_request_id, employee_id: eId, status: eStatus, category } = req.query;
      let where = `WHERE tr.tenant_id = :tenantId`;
      const repl: any = { tenantId };
      if (travel_request_id) { where += ' AND te.travel_request_id = :trid'; repl.trid = travel_request_id; }
      if (eId) { where += ' AND te.employee_id = :eid'; repl.eid = eId; }
      if (eStatus) { where += ' AND te.status = :st'; repl.st = eStatus; }
      if (category) { where += ' AND te.category = :cat'; repl.cat = category; }
      try {
        const [rows] = await sequelize.query(`
          SELECT te.* FROM travel_expenses te
          INNER JOIN travel_requests tr ON te.travel_request_id = tr.id
          ${where}
          ORDER BY te.expense_date DESC NULLS LAST
          LIMIT 200
        `, { replacements: repl });
        return res.json({ success: true, data: rows || [] });
      } catch {
        return res.json({ success: true, data: [] });
      }
    }
    case 'budgets': {
      const { fiscal_year, category: bCat } = req.query;
      const where: any = { tenantId };
      if (fiscal_year) where.fiscalYear = fiscal_year;
      if (bCat) where.category = bCat;
      const rows = ExpenseBudget ? await ExpenseBudget.findAll({ where, order: [['category', 'ASC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(rows) });
    }
    case 'request-detail': {
      const { id } = req.query;
      if (!id || !TravelRequest) return res.status(404).json({ error: 'Not found' });
      const request = await TravelRequest.findOne({ where: { id, tenantId } });
      if (!request) return res.status(404).json({ error: 'Not found' });
      const expenses = TravelExpense
        ? await TravelExpense.findAll({ where: { travelRequestId: id }, order: [['expenseDate', 'ASC']] })
        : [];
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
      return res.json({ success: true, data: { request, expenses, totalExpenses } });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  action: string,
  session: any,
  tenantId: string | null,
) {
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const body = req.body;
  switch (action) {
    case 'request': {
      if (!TravelRequest) return res.json({ success: true, data: body });
      const count = await TravelRequest.count({ where: { tenantId } });
      const payload = mapTravelRequestBody(body);
      payload.tenantId = tenantId;
      payload.requestNumber = payload.requestNumber || `TR-${String(count + 1).padStart(4, '0')}/${new Date().getFullYear()}`;
      const request = await TravelRequest.create(payload);
      return res.json({ success: true, data: serializeTravelRequest(request) });
    }
    case 'expense': {
      if (!TravelExpense) return res.json({ success: true, data: body });
      // Ensure travel request belongs to this tenant
      if (body.travelRequestId && TravelRequest) {
        const owned = await TravelRequest.findOne({
          where: { id: body.travelRequestId, tenantId },
          attributes: ['id'],
        });
        if (!owned) return res.status(404).json({ error: 'Travel request not found' });
      }
      const expense = await TravelExpense.create(body);
      if (body.travelRequestId && TravelRequest) {
        const totalExp = await TravelExpense.sum('amount', { where: { travelRequestId: body.travelRequestId } });
        await TravelRequest.update({ actualCost: totalExp || 0 }, { where: { id: body.travelRequestId, tenantId } });
      }
      if (body.category && ExpenseBudget) {
        const year = new Date().getFullYear();
        const budget = await ExpenseBudget.findOne({
          where: { category: body.category, fiscalYear: year, isActive: true, tenantId },
        });
        if (budget) {
          const newUsed = parseFloat(budget.usedAmount || 0) + parseFloat(body.amount || 0);
          await ExpenseBudget.update({
            usedAmount: newUsed,
            remainingAmount: parseFloat(budget.annualLimit || 0) - newUsed,
          }, { where: { id: budget.id, tenantId } });
        }
      }
      return res.json({ success: true, data: expense });
    }
    case 'approve-request': {
      const { id } = body;
      if (!TravelRequest || !id) return res.json({ success: true });
      const [n] = await TravelRequest.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date(),
      }, { where: { id, tenantId } });
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, message: 'Travel request approved' });
    }
    case 'reject-request': {
      const { id: rId, reason } = body;
      if (!TravelRequest || !rId) return res.json({ success: true });
      const [n] = await TravelRequest.update(
        { status: 'rejected', notes: reason },
        { where: { id: rId, tenantId } },
      );
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, message: 'Travel request rejected' });
    }
    case 'approve-expense': {
      const { id: eId } = body;
      if (!TravelExpense || !eId || !sequelize) return res.json({ success: true });
      const [owned] = await sequelize.query(`
        SELECT te.id FROM travel_expenses te
        INNER JOIN travel_requests tr ON te.travel_request_id = tr.id
        WHERE te.id = :id AND tr.tenant_id = :tenantId LIMIT 1
      `, { replacements: { id: eId, tenantId } });
      if (!owned?.length) return res.status(404).json({ error: 'Not found' });
      await TravelExpense.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date(),
      }, { where: { id: eId } });
      return res.json({ success: true, message: 'Expense approved' });
    }
    case 'reimburse-expense': {
      const { id: reId } = body;
      if (!TravelExpense || !reId || !sequelize) return res.json({ success: true });
      const [owned] = await sequelize.query(`
        SELECT te.id FROM travel_expenses te
        INNER JOIN travel_requests tr ON te.travel_request_id = tr.id
        WHERE te.id = :id AND tr.tenant_id = :tenantId LIMIT 1
      `, { replacements: { id: reId, tenantId } });
      if (!owned?.length) return res.status(404).json({ error: 'Not found' });
      await TravelExpense.update({ status: 'reimbursed', reimbursedAt: new Date() }, { where: { id: reId } });
      return res.json({ success: true, message: 'Expense reimbursed' });
    }
    case 'complete-travel': {
      const { id: cId } = body;
      if (!TravelRequest || !cId) return res.json({ success: true });
      const [n] = await TravelRequest.update(
        { status: 'completed', completedAt: new Date() },
        { where: { id: cId, tenantId } },
      );
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, message: 'Travel completed' });
    }
    case 'budget': {
      if (!ExpenseBudget) return res.json({ success: true, data: body });
      body.remainingAmount = body.annualLimit;
      body.tenantId = tenantId;
      const budget = await ExpenseBudget.create(body);
      return res.json({ success: true, data: budget });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string, tenantId: string | null) {
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  switch (action) {
    case 'request': {
      if (!TravelRequest) return res.json({ success: true });
      const [n] = await TravelRequest.update(mapTravelRequestBody(req.body), { where: { id, tenantId } });
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, message: 'Request updated' });
    }
    case 'expense': {
      if (!TravelExpense || !sequelize) return res.json({ success: true });
      const [owned] = await sequelize.query(`
        SELECT te.id FROM travel_expenses te
        INNER JOIN travel_requests tr ON te.travel_request_id = tr.id
        WHERE te.id = :id AND tr.tenant_id = :tenantId LIMIT 1
      `, { replacements: { id, tenantId } });
      if (!owned?.length) return res.status(404).json({ error: 'Not found' });
      await TravelExpense.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Expense updated' });
    }
    case 'budget': {
      if (!ExpenseBudget) return res.json({ success: true });
      const body = req.body;
      body.remainingAmount = parseFloat(body.annualLimit || 0) - parseFloat(body.usedAmount || 0);
      const [n] = await ExpenseBudget.update(body, { where: { id, tenantId } });
      if (!n) return res.status(404).json({ error: 'Not found' });
      return res.json({ success: true, message: 'Budget updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string, tenantId: string | null) {
  if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  if (action === 'request' && TravelRequest) {
    const n = await TravelRequest.destroy({ where: { id, tenantId } });
    if (!n) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  }
  if (action === 'budget' && ExpenseBudget) {
    const n = await ExpenseBudget.destroy({ where: { id, tenantId } });
    if (!n) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  }
  if (action === 'expense' && TravelExpense && sequelize) {
    const [owned] = await sequelize.query(`
      SELECT te.id FROM travel_expenses te
      INNER JOIN travel_requests tr ON te.travel_request_id = tr.id
      WHERE te.id = :id AND tr.tenant_id = :tenantId LIMIT 1
    `, { replacements: { id, tenantId } });
    if (!owned?.length) return res.status(404).json({ error: 'Not found' });
    await TravelExpense.destroy({ where: { id } });
    return res.json({ success: true, message: 'Deleted' });
  }
  return res.status(400).json({ error: 'Invalid action' });
}

function mapTravelRequestBody(body: Record<string, unknown>) {
  return {
    employeeId: body.employeeId ?? body.employee_id,
    destination: body.destination,
    purpose: body.purpose,
    startDate: body.departureDate ?? body.startDate ?? body.start_date,
    endDate: body.returnDate ?? body.endDate ?? body.end_date,
    estimatedBudget: body.estimatedBudget ?? body.estimated_budget ?? 0,
    status: body.status || 'draft',
    notes: body.notes || null,
  } as Record<string, unknown>;
}

function serializeTravelRequest(row: any) {
  const s = rowToSnake(row) || {};
  return {
    ...s,
    departure_date: s.start_date || s.departure_date,
    return_date: s.end_date || s.return_date,
    departure_city: s.departure_city || '',
    travel_type: s.travel_type || 'domestic',
    transportation: s.transportation || 'flight',
    accommodation_needed: s.accommodation_needed ?? false,
    actual_cost: s.actual_cost ?? 0,
    advance_amount: s.advance_amount ?? 0,
    itinerary: s.itinerary || [],
  };
}
