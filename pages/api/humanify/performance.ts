import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../lib/api/response';
import { launchReviewCycle, listReviewCycles } from '@/lib/hris/review-cycle';
import { resolveDataSource } from '@/lib/hris/data-source';

let sequelize: any;
try { sequelize = require('../../../lib/sequelize'); } catch (e) {}

let triggerHRISWebhook: any;
try {
  const webhooks = require('./webhooks');
  triggerHRISWebhook = webhooks.triggerHRISWebhook;
} catch (e) {
  triggerHRISWebhook = async () => {};
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(HttpStatus.UNAUTHORIZED).json(
        errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      );
    }

    switch (req.method) {
      case 'GET':
        if (req.query.action === 'cycles') {
          const cycles = await listReviewCycles(20);
          return res.status(HttpStatus.OK).json(successResponse({ cycles }));
        }
        return await getPerformanceReviews(req, res, session);
      case 'POST':
        if (req.body?.action === 'launch-cycle') {
          return await handleLaunchReviewCycle(req, res, session);
        }
        return await createPerformanceReview(req, res, session);
      case 'PUT':
        return await updatePerformanceReview(req, res);
      case 'DELETE':
        return await deletePerformanceReview(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('Performance Review API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

// ========== GET: Fetch performance reviews from DB ==========
async function getPerformanceReviews(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId, period, status, id } = req.query;
  const tenantId = (session?.user as any)?.tenantId || null;

  if (!tenantId) {
    return res.status(HttpStatus.OK).json(
      successResponse({
        reviews: [],
        templates: [],
        dataSource: resolveDataSource(false, false),
        summary: { total: 0, avgRating: 0, excellent: 0, good: 0, needsImprovement: 0 },
      })
    );
  }

  // Single review by ID
  if (id && sequelize) {
    try {
      const [rows] = await sequelize.query(
        'SELECT * FROM performance_reviews WHERE id = :id AND tenant_id = :tid',
        { replacements: { id, tid: tenantId } }
      );
      if (rows.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json(errorResponse('NOT_FOUND', 'Review not found'));
      }
      const review = rows[0];
      const [cats] = await sequelize.query(
        'SELECT * FROM performance_review_categories WHERE review_id = :rid ORDER BY sort_order',
        { replacements: { rid: review.id } }
      );
      return res.status(HttpStatus.OK).json(successResponse({
        review: mapReview(review, cats)
      }));
    } catch (e: any) {
      console.warn('Performance GET by ID error:', e.message);
    }
  }

  let reviews: any[] = [];

  if (sequelize) {
    try {
      let where = 'WHERE pr.tenant_id = :tid';
      const replacements: any = { tid: tenantId };
      if (employeeId) { where += ' AND pr.employee_id = :employeeId'; replacements.employeeId = employeeId; }
      if (period && period !== 'all') { where += ' AND (pr.review_period = :period OR pr.period = :period)'; replacements.period = period; }
      if (status && status !== 'all') { where += ' AND pr.status = :status'; replacements.status = status; }

      const [rows] = await sequelize.query(`
        SELECT pr.*, e.name as emp_name, e.position as emp_position, e.department as emp_department,
               b.name as emp_branch_name
        FROM performance_reviews pr
        LEFT JOIN employees e ON pr.employee_id = e.id AND e.tenant_id = :tid
        LEFT JOIN branches b ON e.branch_id = b.id
        ${where}
        ORDER BY pr.created_at DESC
      `, { replacements });

      // Batch fetch all categories
      if (rows.length > 0) {
        const ids = rows.map((r: any) => r.id);
        const [allCats] = await sequelize.query(
          `SELECT * FROM performance_review_categories WHERE review_id IN (:ids) ORDER BY sort_order`,
          { replacements: { ids } }
        );
        const catMap: Record<string, any[]> = {};
        allCats.forEach((c: any) => {
          if (!catMap[c.review_id]) catMap[c.review_id] = [];
          catMap[c.review_id].push(c);
        });
        reviews = rows.map((r: any) => mapReview(r, catMap[r.id] || []));
      }
    } catch (e: any) {
      console.warn('Performance DB query error:', e.message);
    }
  }

  // Summary
  const total = reviews.length;
  const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.overallRating, 0) / total : 0;
  const excellent = reviews.filter(r => r.overallRating >= 4.5).length;
  const good = reviews.filter(r => r.overallRating >= 3.5 && r.overallRating < 4.5).length;
  const needsImprovement = reviews.filter(r => r.overallRating < 3.5).length;

  // Fetch templates for create form
  let templates: any[] = [];
  try {
    if (sequelize) {
      const [tpls] = await sequelize.query(
        `SELECT * FROM performance_templates
         WHERE is_active = true AND tenant_id = :tid
         ORDER BY name`,
        { replacements: { tid: tenantId } }
      );
      templates = tpls;
    }
  } catch {}

  return res.status(HttpStatus.OK).json(
    successResponse({
      reviews,
      templates,
      dataSource: resolveDataSource(total > 0, false),
      summary: { total, avgRating: Math.round(avgRating * 10) / 10, excellent, good, needsImprovement }
    })
  );
}

// ========== POST: Create performance review ==========
async function resolveEmployeeId(employeeId: string | null | undefined, employeeName: string, tenantId: string | null) {
  if (employeeId) return employeeId;
  if (!sequelize || !employeeName?.trim()) return null;
  try {
    const [rows] = await sequelize.query(
      `SELECT id FROM employees WHERE name ILIKE :name AND (:tid IS NULL OR tenant_id = :tid) LIMIT 1`,
      { replacements: { name: employeeName.trim(), tid: tenantId } }
    );
    return (rows as any[])[0]?.id || null;
  } catch {
    return null;
  }
}

async function handleLaunchReviewCycle(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { period, reviewType, department } = req.body || {};
  const tenantId = (session?.user as any)?.tenantId || null;
  const launchedBy = (session?.user as any)?.name || (session?.user as any)?.email || null;

  try {
    const cycle = await launchReviewCycle({
      tenantId,
      period,
      reviewType,
      department,
      launchedBy,
    });
    return res.status(HttpStatus.OK).json(
      successResponse({
        cycle,
        message: `Siklus ${cycle.period}: ${cycle.draftsCreated} evaluasi draf dibuat untuk ${cycle.totalEmployees} karyawan aktif`,
      })
    );
  } catch (error: any) {
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Gagal meluncurkan siklus evaluasi')
    );
  }
}

async function createPerformanceReview(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { employeeId, employeeName, position, department, branchId, branchName, reviewPeriod, reviewType, reviewerId, reviewerName, categories, strengths, areasForImprovement, goals } = req.body;
  const tenantId = (session?.user as any)?.tenantId || null;

  if (!employeeName || !reviewPeriod) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Employee name and review period are required')
    );
  }

  const resolvedEmployeeId = await resolveEmployeeId(employeeId, employeeName, tenantId);
  if (!resolvedEmployeeId) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'employeeId is required — pilih karyawan dari daftar')
    );
  }

  // Calculate overall rating from categories
  let totalWeight = 0, weightedSum = 0;
  if (categories && categories.length > 0) {
    categories.forEach((cat: any) => {
      totalWeight += cat.weight || 0;
      weightedSum += (cat.rating || 0) * (cat.weight || 0);
    });
  }
  const overallRating = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;

  if (sequelize) {
    try {
      const tid = tenantId;
      const [inserted] = await sequelize.query(`
        INSERT INTO performance_reviews (tenant_id, employee_id, employee_name, position, department,
          branch_id, branch_name, period, review_period, review_type, review_date, reviewer_id, reviewer_name,
          overall_rating, overall_score, status, strengths, areas_for_improvement, goals)
        VALUES (:tid, :employeeId, :employeeName, :position, :department,
          :branchId, :branchName, :reviewPeriod, :reviewPeriod, :reviewType, CURRENT_DATE, :reviewerId, :reviewerName,
          :overallRating, :overallRating, 'draft', :strengths::jsonb, :areasForImprovement::jsonb, :goals::jsonb)
        RETURNING *
      `, {
        replacements: {
          tid, employeeId: resolvedEmployeeId, employeeName, position: position || '',
          department: department || '', branchId: branchId || null, branchName: branchName || '',
          reviewPeriod, reviewType: reviewType || 'quarterly',
          reviewerId: reviewerId || null, reviewerName: reviewerName || '',
          overallRating,
          strengths: JSON.stringify(strengths || []),
          areasForImprovement: JSON.stringify(areasForImprovement || []),
          goals: JSON.stringify(goals || [])
        }
      });

      const reviewId = inserted[0].id;

      // Insert categories
      if (categories && categories.length > 0) {
        for (let i = 0; i < categories.length; i++) {
          const c = categories[i];
          await sequelize.query(`
            INSERT INTO performance_review_categories (review_id, name, weight, rating, comments, sort_order)
            VALUES (:reviewId, :name, :weight, :rating, :comments, :sort)
          `, { replacements: { reviewId, name: c.name, weight: c.weight || 20, rating: c.rating || 0, comments: c.comments || '', sort: i } });
        }
      }

      // Fetch complete review with categories
      const [cats] = await sequelize.query(
        'SELECT * FROM performance_review_categories WHERE review_id = :reviewId ORDER BY sort_order',
        { replacements: { reviewId } }
      );
      const newReview = mapReview(inserted[0], cats);

      // Trigger webhook
      try {
        await triggerHRISWebhook('performance.review_created', resolvedEmployeeId, employeeName || 'Unknown', newReview, branchId, branchName);
      } catch {}

      return res.status(HttpStatus.CREATED).json(
        successResponse(newReview, undefined, 'Performance review created successfully')
      );
    } catch (e: any) {
      console.warn('Performance create error:', e.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create review: ' + e.message)
      );
    }
  }

  // Fallback mock
  return res.status(HttpStatus.CREATED).json(
    successResponse({ id: Date.now().toString(), employeeName, reviewPeriod, overallRating, status: 'draft' }, undefined, 'Review created (no DB)')
  );
}

// ========== PUT: Update performance review ==========
async function updatePerformanceReview(req: NextApiRequest, res: NextApiResponse) {
  const { id, status, employeeComments, managerComments, hrComments, categories, strengths, areasForImprovement, goals } = req.body;

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Review ID is required')
    );
  }

  if (sequelize) {
    try {
      // Check exists
      const [existing] = await sequelize.query('SELECT * FROM performance_reviews WHERE id = :id', { replacements: { id } });
      if (existing.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json(errorResponse('NOT_FOUND', 'Review not found'));
      }

      // Build dynamic update
      const sets: string[] = ['updated_at = NOW()'];
      const repl: any = { id };

      if (status) {
        const validStatuses = ['draft', 'submitted', 'reviewed', 'acknowledged'];
        if (!validStatuses.includes(status)) {
          return res.status(HttpStatus.BAD_REQUEST).json(errorResponse('INVALID_STATUS', 'Invalid status'));
        }
        sets.push('status = :status');
        repl.status = status;
        if (status === 'submitted') sets.push('submitted_at = NOW()');
        if (status === 'reviewed') sets.push('reviewed_at = NOW()');
        if (status === 'acknowledged') sets.push('acknowledged_at = NOW()');
      }
      if (employeeComments !== undefined) { sets.push('employee_comments = :employeeComments'); repl.employeeComments = employeeComments; }
      if (managerComments !== undefined) { sets.push('manager_comments = :managerComments'); repl.managerComments = managerComments; }
      if (hrComments !== undefined) { sets.push('hr_comments = :hrComments'); repl.hrComments = hrComments; }
      if (strengths) { sets.push('strengths = :strengths::jsonb'); repl.strengths = JSON.stringify(strengths); }
      if (areasForImprovement) { sets.push('areas_for_improvement = :areasForImprovement::jsonb'); repl.areasForImprovement = JSON.stringify(areasForImprovement); }
      if (goals) { sets.push('goals = :goals::jsonb'); repl.goals = JSON.stringify(goals); }

      // Update categories and recalculate rating
      if (categories && categories.length > 0) {
        await sequelize.query('DELETE FROM performance_review_categories WHERE review_id = :id', { replacements: { id } });
        let totalWeight = 0, weightedSum = 0;
        for (let i = 0; i < categories.length; i++) {
          const c = categories[i];
          totalWeight += c.weight || 0;
          weightedSum += (c.rating || 0) * (c.weight || 0);
          await sequelize.query(`
            INSERT INTO performance_review_categories (review_id, name, weight, rating, comments, sort_order)
            VALUES (:id, :name, :weight, :rating, :comments, :sort)
          `, { replacements: { id, name: c.name, weight: c.weight || 20, rating: c.rating || 0, comments: c.comments || '', sort: i } });
        }
        const newRating = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
        sets.push('overall_rating = :overallRating');
        repl.overallRating = newRating;
      }

      await sequelize.query(`UPDATE performance_reviews SET ${sets.join(', ')} WHERE id = :id`, { replacements: repl });

      // Fetch updated review
      const [updated] = await sequelize.query('SELECT * FROM performance_reviews WHERE id = :id', { replacements: { id } });
      const [cats] = await sequelize.query(
        'SELECT * FROM performance_review_categories WHERE review_id = :id ORDER BY sort_order',
        { replacements: { id } }
      );

      const result = mapReview(updated[0], cats);

      // Trigger webhook
      try {
        if (status === 'submitted') await triggerHRISWebhook('performance.review_submitted', updated[0].employee_id, updated[0].employee_name, result);
        if (status === 'acknowledged') await triggerHRISWebhook('performance.review_acknowledged', updated[0].employee_id, updated[0].employee_name, result);
      } catch {}

      return res.status(HttpStatus.OK).json(
        successResponse(result, undefined, 'Performance review updated successfully')
      );
    } catch (e: any) {
      console.warn('Performance update error:', e.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to update review: ' + e.message)
      );
    }
  }

  return res.status(HttpStatus.OK).json(
    successResponse({ id, status }, undefined, 'Review updated (no DB)')
  );
}

// ========== DELETE: Remove performance review ==========
async function deletePerformanceReview(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Review ID is required'));
  }

  if (sequelize) {
    try {
      // Categories cascade delete due to ON DELETE CASCADE
      await sequelize.query('DELETE FROM performance_reviews WHERE id = :id', { replacements: { id } });
      return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Review deleted'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
        errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to delete: ' + e.message)
      );
    }
  }
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Deleted (no DB)'));
}

// ========== Map DB row to frontend shape ==========
function mapReview(row: any, categories: any[]) {
  const overall = parseFloat(row.overall_rating ?? row.overall_score) || 0;
  return {
    id: row.id,
    employeeId: row.employee_id?.toString() || '',
    employeeName: row.employee_name || row.emp_name || '',
    position: row.position || row.emp_position || '',
    branchName: row.branch_name || row.emp_branch_name || '',
    department: row.department || row.emp_department || '',
    reviewPeriod: row.review_period || row.period || '',
    reviewDate: row.review_date ? new Date(row.review_date).toISOString().split('T')[0] : '',
    reviewer: row.reviewer_name || '',
    overallRating: overall,
    categories: categories.map(c => ({
      name: c.name,
      rating: parseFloat(c.rating) || 0,
      weight: parseInt(c.weight) || 20,
      comments: c.comments || ''
    })),
    strengths: Array.isArray(row.strengths) ? row.strengths : (typeof row.strengths === 'string' ? JSON.parse(row.strengths || '[]') : []),
    areasForImprovement: Array.isArray(row.areas_for_improvement) ? row.areas_for_improvement : (typeof row.areas_for_improvement === 'string' ? JSON.parse(row.areas_for_improvement || '[]') : []),
    goals: Array.isArray(row.goals) ? row.goals : (typeof row.goals === 'string' ? JSON.parse(row.goals || '[]') : []),
    status: row.status || 'draft',
    employeeComments: row.employee_comments || '',
    managerComments: row.manager_comments || '',
    hrComments: row.hr_comments || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
