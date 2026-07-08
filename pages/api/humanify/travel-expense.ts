import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { rowsToSnake, rowToSnake } from '@/lib/hris/serialize-rows';

let TravelRequest: any, TravelExpense: any, ExpenseBudget: any;
try { TravelRequest = require('../../../models/TravelRequest'); } catch(e) {}
try { TravelExpense = require('../../../models/TravelExpense'); } catch(e) {}
try { ExpenseBudget = require('../../../models/ExpenseBudget'); } catch(e) {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { method } = req;
  const { action } = req.query;

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action as string);
      case 'POST': return handlePost(req, res, action as string, session);
      case 'PUT': return handlePut(req, res, action as string);
      case 'DELETE': return handleDelete(req, res, action as string);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Travel API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      const [requests, expenses, budgets] = await Promise.all([
        TravelRequest?.count() || 0,
        TravelExpense?.count() || 0,
        ExpenseBudget?.findAll({ where: { isActive: true } }) || [],
      ]);
      const pending = TravelRequest ? await TravelRequest.count({ where: { status: 'pending' } }) : 0;
      const totalExpenseAmount = TravelExpense ? await TravelExpense.sum('amount') : 0;
      return res.json({
        success: true,
        data: { totalRequests: requests, pendingApproval: pending, totalExpenses: expenses, totalExpenseAmount: totalExpenseAmount || 0, budgets }
      });
    }
    case 'requests': {
      const { status, employee_id, travel_type } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (employee_id) where.employeeId = employee_id;
      if (travel_type) where.travelType = travel_type;
      const rows = TravelRequest ? await TravelRequest.findAll({ where, order: [['createdAt', 'DESC']] }) : [];
      return res.json({ success: true, data: rows.map(serializeTravelRequest) });
    }
    case 'expenses': {
      const { travel_request_id, employee_id: eId, status: eStatus, category } = req.query;
      const where: any = {};
      if (travel_request_id) where.travelRequestId = travel_request_id;
      if (eId) where.employeeId = eId;
      if (eStatus) where.status = eStatus;
      if (category) where.category = category;
      const rows = TravelExpense ? await TravelExpense.findAll({ where, order: [['expenseDate', 'DESC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(rows) });
    }
    case 'budgets': {
      const { fiscal_year, category: bCat } = req.query;
      const where: any = {};
      if (fiscal_year) where.fiscalYear = fiscal_year;
      if (bCat) where.category = bCat;
      const rows = ExpenseBudget ? await ExpenseBudget.findAll({ where, order: [['category', 'ASC']] }) : [];
      return res.json({ success: true, data: rowsToSnake(rows) });
    }
    case 'request-detail': {
      const { id } = req.query;
      if (!id || !TravelRequest) return res.status(404).json({ error: 'Not found' });
      const request = await TravelRequest.findByPk(id);
      const expenses = TravelExpense ? await TravelExpense.findAll({ where: { travelRequestId: id }, order: [['expenseDate', 'ASC']] }) : [];
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
      return res.json({ success: true, data: { request, expenses, totalExpenses } });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const body = req.body;
  switch (action) {
    case 'request': {
      if (!TravelRequest) return res.json({ success: true, data: body });
      const count = await TravelRequest.count();
      const payload = mapTravelRequestBody(body);
      payload.requestNumber = payload.requestNumber || `TR-${String(count + 1).padStart(4, '0')}/${new Date().getFullYear()}`;
      const request = await TravelRequest.create(payload);
      return res.json({ success: true, data: serializeTravelRequest(request) });
    }
    case 'expense': {
      if (!TravelExpense) return res.json({ success: true, data: body });
      const expense = await TravelExpense.create(body);
      // Update travel request actual cost
      if (body.travelRequestId && TravelRequest) {
        const totalExp = await TravelExpense.sum('amount', { where: { travelRequestId: body.travelRequestId } });
        await TravelRequest.update({ actualCost: totalExp || 0 }, { where: { id: body.travelRequestId } });
      }
      // Update budget used amount
      if (body.category && ExpenseBudget) {
        const year = new Date().getFullYear();
        const budget = await ExpenseBudget.findOne({ where: { category: body.category, fiscalYear: year, isActive: true } });
        if (budget) {
          const newUsed = parseFloat(budget.usedAmount || 0) + parseFloat(body.amount || 0);
          await ExpenseBudget.update({
            usedAmount: newUsed,
            remainingAmount: parseFloat(budget.annualLimit || 0) - newUsed
          }, { where: { id: budget.id } });
        }
      }
      return res.json({ success: true, data: expense });
    }
    case 'approve-request': {
      const { id } = body;
      if (!TravelRequest || !id) return res.json({ success: true });
      await TravelRequest.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date()
      }, { where: { id } });
      return res.json({ success: true, message: 'Travel request approved' });
    }
    case 'reject-request': {
      const { id: rId, reason } = body;
      if (!TravelRequest || !rId) return res.json({ success: true });
      await TravelRequest.update({ status: 'rejected', notes: reason }, { where: { id: rId } });
      return res.json({ success: true, message: 'Travel request rejected' });
    }
    case 'approve-expense': {
      const { id: eId } = body;
      if (!TravelExpense || !eId) return res.json({ success: true });
      await TravelExpense.update({
        status: 'approved', approvedBy: (session.user as any)?.id, approvedAt: new Date()
      }, { where: { id: eId } });
      return res.json({ success: true, message: 'Expense approved' });
    }
    case 'reimburse-expense': {
      const { id: reId } = body;
      if (!TravelExpense || !reId) return res.json({ success: true });
      await TravelExpense.update({ status: 'reimbursed', reimbursedAt: new Date() }, { where: { id: reId } });
      return res.json({ success: true, message: 'Expense reimbursed' });
    }
    case 'complete-travel': {
      const { id: cId } = body;
      if (!TravelRequest || !cId) return res.json({ success: true });
      await TravelRequest.update({ status: 'completed', completedAt: new Date() }, { where: { id: cId } });
      return res.json({ success: true, message: 'Travel completed' });
    }
    case 'budget': {
      if (!ExpenseBudget) return res.json({ success: true, data: body });
      body.remainingAmount = body.annualLimit;
      const budget = await ExpenseBudget.create(body);
      return res.json({ success: true, data: budget });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  switch (action) {
    case 'request': {
      if (!TravelRequest) return res.json({ success: true });
      await TravelRequest.update(mapTravelRequestBody(req.body), { where: { id } });
      return res.json({ success: true, message: 'Request updated' });
    }
    case 'expense': {
      if (!TravelExpense) return res.json({ success: true });
      await TravelExpense.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Expense updated' });
    }
    case 'budget': {
      if (!ExpenseBudget) return res.json({ success: true });
      const body = req.body;
      body.remainingAmount = parseFloat(body.annualLimit || 0) - parseFloat(body.usedAmount || 0);
      await ExpenseBudget.update(body, { where: { id } });
      return res.json({ success: true, message: 'Budget updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  const models: any = { request: TravelRequest, expense: TravelExpense, budget: ExpenseBudget };
  const model = models[action];
  if (!model) return res.status(400).json({ error: 'Invalid action' });
  await model.destroy({ where: { id } });
  return res.json({ success: true, message: 'Deleted' });
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
  };
}

function serializeTravelRequest(row: any) {
  const s = rowToSnake(row) || {};
  return {
    ...s,
    departure_date: s.start_date,
    return_date: s.end_date,
    departure_city: s.departure_city || '',
    travel_type: s.travel_type || 'domestic',
    transportation: s.transportation || 'flight',
    accommodation_needed: s.accommodation_needed ?? false,
    actual_cost: s.actual_cost ?? 0,
    advance_amount: s.advance_amount ?? 0,
    itinerary: s.itinerary || [],
  };
}
