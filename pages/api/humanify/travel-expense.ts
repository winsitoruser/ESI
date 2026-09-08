import type { NextApiRequest, NextApiResponse } from 'next';
import { rowsToSnake, rowToSnake } from '@/lib/hris/serialize-rows';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { ensureTravelSchema } from '@/lib/hris/ensure-travel-schema';
import {
  COST_TO_EXPENSE,
  dateSpan,
  hydratePlanFromRequest,
  itineraryBudget,
  itineraryRoute,
  parseTravelPlan,
  serializeTravelPlan,
} from '@/lib/hris/travel-itinerary';
import { travelEmailInnerHtml, travelEmailText } from '@/lib/hris/travel-document';
import { humanifyTravelRequestEmail } from '@/lib/email/humanify-mails';
import { isSmtpConfigured, sendEmail } from '@/lib/email/sender';

let TravelRequest: any, TravelExpense: any, ExpenseBudget: any;
try { TravelRequest = require('../../../models/TravelRequest'); } catch(e) {}
try { TravelExpense = require('../../../models/TravelExpense'); } catch(e) {}
try { ExpenseBudget = require('../../../models/ExpenseBudget'); } catch(e) {}

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch(e) {}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const tenantId = tenantIdFromSession(session);
  const { method } = req;
  const { action } = req.query;
  if (sequelize) await ensureTravelSchema(sequelize);

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

export default withHQAuth(handler, { module: 'hris' });

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
      const rawId = req.query.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) return res.status(400).json({ error: 'ID required' });
      let request: any = null;
      try {
        request = TravelRequest
          ? await TravelRequest.findOne({ where: { id, tenantId } })
          : null;
      } catch (e) {
        console.warn('travel request-detail findOne:', (e as any)?.message || e);
      }
      if (!request && sequelize) {
        try {
          const [rows] = await sequelize.query(`
            SELECT * FROM travel_requests
            WHERE id = :id AND tenant_id = :tenantId
            LIMIT 1
          `, { replacements: { id, tenantId } });
          request = (rows as any[])?.[0] || null;
        } catch { request = null; }
      }
      if (!request) return res.status(404).json({ error: 'Not found' });
      let expenses: any[] = [];
      try {
        expenses = TravelExpense
          ? await TravelExpense.findAll({ where: { travelRequestId: id }, order: [['expenseDate', 'ASC']] })
          : [];
      } catch {
        if (sequelize) {
          try {
            const [rows] = await sequelize.query(`
              SELECT te.* FROM travel_expenses te
              WHERE te.travel_request_id = :id
              ORDER BY te.expense_date ASC NULLS LAST
            `, { replacements: { id } });
            expenses = (rows as any[]) || [];
          } catch { expenses = []; }
        }
      }
      const snakeExp = rowsToSnake(expenses).length ? rowsToSnake(expenses) : expenses;
      const totalExpenses = (snakeExp || []).reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
      let employee: any = null;
      const empId = (request as any).employeeId || (request as any).employee_id;
      if (sequelize && empId) {
        try {
          const [erows] = await sequelize.query(`
            SELECT id, name, email FROM employees WHERE id = :empId LIMIT 1
          `, { replacements: { empId } });
          employee = (erows as any[])?.[0] || null;
        } catch { employee = null; }
      }
      return res.json({
        success: true,
        data: {
          request: serializeTravelRequest(request),
          expenses: snakeExp,
          totalExpenses,
          employee,
        },
      });
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
      const expense = await TravelExpense.create(mapTravelExpenseBody(body, tenantId));
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
    case 'email-request': {
      const id = body.id;
      const to = String(body.to || '').trim();
      if (!id || !to || !to.includes('@')) {
        return res.status(400).json({ error: 'Isi ID pengajuan dan alamat email tujuan' });
      }
      let request: any = TravelRequest
        ? await TravelRequest.findOne({ where: { id, tenantId } }).catch(() => null)
        : null;
      if (!request && sequelize) {
        const [rows] = await sequelize.query(`
          SELECT * FROM travel_requests WHERE id = :id AND tenant_id = :tenantId LIMIT 1
        `, { replacements: { id, tenantId } });
        request = (rows as any[])?.[0] || null;
      }
      if (!request) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
      let expenses: any[] = [];
      try {
        const [rows] = sequelize
          ? await sequelize.query(`SELECT * FROM travel_expenses WHERE travel_request_id = :id ORDER BY expense_date ASC NULLS LAST`, { replacements: { id } })
          : [[]];
        expenses = (rows as any[]) || [];
      } catch { expenses = []; }
      const serialized = serializeTravelRequest(request);
      const detail = {
        request: serialized,
        expenses,
        totalExpenses: expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0),
      };
      if (!isSmtpConfigured()) {
        return res.status(503).json({ success: false, error: 'SMTP belum dikonfigurasi' });
      }
      const mail = humanifyTravelRequestEmail({
        requestNumber: serialized.request_number || '',
        destination: serialized.destination || '',
        innerHtml: travelEmailInnerHtml(detail, body.note),
        text: travelEmailText(detail, body.note),
        detailUrl: 'https://humanify.id/humanify/travel-expense',
      });
      const ok = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
      if (!ok) return res.status(500).json({ success: false, error: 'Gagal mengirim email' });
      return res.json({ success: true, message: `Terkirim ke ${to}` });
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
      await TravelExpense.update(mapTravelExpenseBody(req.body, tenantId), { where: { id } });
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
  const storedPlan = hydratePlanFromRequest(body);
  const tripType = storedPlan.tripType;
  const originCity = storedPlan.originCity;
  const span = dateSpan(
    storedPlan.stops,
    String(body.departureDate ?? body.startDate ?? body.start_date ?? ''),
    String(body.returnDate ?? body.endDate ?? body.end_date ?? ''),
  );
  const destination = itineraryRoute(originCity, storedPlan.stops, tripType)
    || String(body.destination || '');
  const budget = itineraryBudget(storedPlan.stops) || Number(body.estimatedBudget ?? body.estimated_budget ?? 0) || 0;
  return {
    employeeId: body.employeeId ?? body.employee_id,
    destination,
    departureCity: originCity,
    purpose: body.purpose,
    startDate: span.start || null,
    endDate: span.end || null,
    departureDate: span.start || null,
    returnDate: span.end || null,
    estimatedBudget: budget,
    advanceAmount: body.advanceAmount ?? body.advance_amount ?? 0,
    travelType: body.travelType ?? body.travel_type ?? 'domestic',
    tripType,
    transportation: body.transportation || storedPlan.stops[0]?.transportMode || 'flight',
    accommodationNeeded: body.accommodationNeeded ?? body.accommodation_needed ?? true,
    itinerary: storedPlan,
    status: body.status || 'draft',
    notes: body.notes || null,
  } as Record<string, unknown>;
}

function mapTravelExpenseBody(body: Record<string, unknown>, tenantId: string | null) {
  const categoryRaw = String(body.category || 'other');
  const category = COST_TO_EXPENSE[categoryRaw as keyof typeof COST_TO_EXPENSE] || categoryRaw;
  return {
    tenantId,
    travelRequestId: body.travelRequestId ?? body.travel_request_id,
    employeeId: body.employeeId ?? body.employee_id,
    expenseDate: body.expenseDate ?? body.expense_date,
    category,
    description: body.description || null,
    amount: body.amount ?? 0,
    receiptUrl: body.receiptUrl ?? body.receipt_url ?? null,
    receiptNumber: body.receiptNumber ?? body.receipt_number ?? null,
    itineraryStopId: body.itineraryStopId ?? body.itinerary_stop_id ?? null,
    costLineId: body.costLineId ?? body.cost_line_id ?? null,
    plannedAmount: body.plannedAmount ?? body.planned_amount ?? 0,
    notes: body.notes || null,
    status: body.status || 'submitted',
  };
}

function serializeTravelRequest(row: any) {
  const s = rowToSnake(row) || {};
  const origin = s.departure_city || '';
  const plan = parseTravelPlan(s.itinerary, origin);
  return {
    ...s,
    departure_date: s.start_date || s.departure_date,
    return_date: s.end_date || s.return_date,
    departure_city: plan.originCity || origin,
    travel_type: s.travel_type || 'domestic',
    trip_type: s.trip_type || plan.tripType,
    transportation: s.transportation || plan.stops[0]?.transportMode || 'flight',
    accommodation_needed: s.accommodation_needed ?? false,
    actual_cost: s.actual_cost ?? 0,
    advance_amount: s.advance_amount ?? 0,
    itinerary: serializeTravelPlan({ ...plan, originCity: plan.originCity || origin }),
  };
}
