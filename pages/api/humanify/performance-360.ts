import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const FEEDBACK_TYPES = ['self', 'manager', 'peer', 'subordinate', 'customer'];
const COMPETENCIES = ['Komunikasi', 'Kolaborasi', 'Kepemimpinan', 'Inovasi', 'Integritas', 'Produktivitas', 'Kualitas Kerja'];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tenantId = (req as any).session?.user?.tenantId as string | undefined;
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

  const { reviewId, employeeId } = req.query;

  if (req.method === 'GET') {
    return getFeedback(req, res, tenantId, reviewId as string | undefined, employeeId as string | undefined);
  }
  if (req.method === 'POST') {
    return createFeedback(req, res, tenantId);
  }
  if (req.method === 'DELETE') {
    return deleteFeedback(req, res, tenantId);
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function getFeedback(
  req: NextApiRequest, res: NextApiResponse, tenantId: string,
  reviewId?: string, employeeId?: string
) {
  const { sequelize } = await import('@/lib/sequelizeClient');
  const replacements: any = { tenantId };

  let where = 'WHERE f.tenant_id = :tenantId';
  if (reviewId) { where += ' AND f.review_id = :reviewId'; replacements.reviewId = reviewId; }
  if (employeeId) { where += ' AND f.employee_id = :employeeId'; replacements.employeeId = employeeId; }

  try {
    const rows = await sequelize.query(`
      SELECT f.*, e.name as employee_name, pr.review_period, pr.employee_name as review_subject
      FROM performance_review_feedback f
      LEFT JOIN employees e ON f.employee_id = e.id
      LEFT JOIN performance_reviews pr ON f.review_id = pr.id
      ${where}
      ORDER BY f.created_at DESC
      LIMIT 100
    `, { replacements, type: (await import('sequelize')).QueryTypes.SELECT }) as any[];

    const byType: Record<string, number[]> = {};
    rows.forEach((r: any) => {
      if (!byType[r.feedback_type]) byType[r.feedback_type] = [];
      byType[r.feedback_type].push(parseFloat(r.rating));
    });
    const summary = Object.entries(byType).map(([type, ratings]) => ({
      type,
      count: ratings.length,
      avgRating: Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10,
    }));
    const overall360 = rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + parseFloat(r.rating), 0) / rows.length) * 10) / 10
      : 0;

    return res.status(200).json({
      success: true,
      data: rows,
      summary: { overall360, byType: summary, total: rows.length },
      competencies: COMPETENCIES,
      feedbackTypes: FEEDBACK_TYPES,
    });
  } catch (e: any) {
    return res.status(200).json({
      success: true,
      data: [],
      summary: { overall360: 0, byType: [], total: 0 },
      meta: { isMock: true, error: e.message },
    });
  }
}

async function createFeedback(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const {
    reviewId, employeeId, feedbackType, relationship, competency,
    rating, comments, isAnonymous, reviewerName,
  } = req.body;

  if (!reviewId || !employeeId || !feedbackType || rating == null) {
    return res.status(400).json({ success: false, error: 'reviewId, employeeId, feedbackType, rating wajib' });
  }
  if (!FEEDBACK_TYPES.includes(feedbackType)) {
    return res.status(400).json({ success: false, error: `feedbackType harus: ${FEEDBACK_TYPES.join(', ')}` });
  }

  const { sequelize } = await import('@/lib/sequelizeClient');
  const actorName = (req as any).session?.user?.name || reviewerName || 'Reviewer';

  const [owned] = await sequelize.query(
    'SELECT id FROM performance_reviews WHERE id = :reviewId AND tenant_id = :tenantId LIMIT 1',
    { replacements: { reviewId, tenantId } },
  );
  if (!(owned as any[])?.length) {
    return res.status(404).json({ success: false, error: 'Review tidak ditemukan' });
  }

  const [emp] = await sequelize.query(
    'SELECT id FROM employees WHERE id = :employeeId AND tenant_id = :tenantId LIMIT 1',
    { replacements: { employeeId, tenantId } },
  );
  if (!(emp as any[])?.length) {
    return res.status(404).json({ success: false, error: 'Karyawan tidak ditemukan' });
  }

  const [rows] = await sequelize.query(`
    INSERT INTO performance_review_feedback (
      tenant_id, review_id, employee_id, reviewer_name, feedback_type,
      relationship, competency, rating, comments, is_anonymous
    ) VALUES (:tenantId, :reviewId, :employeeId, :reviewerName, :feedbackType,
      :relationship, :competency, :rating, :comments, :isAnonymous)
    RETURNING *
  `, {
    replacements: {
      tenantId, reviewId, employeeId, reviewerName: actorName,
      feedbackType, relationship: relationship || feedbackType,
      competency: competency || 'Komunikasi', rating: parseFloat(rating),
      comments: comments || null, isAnonymous: !!isAnonymous,
    },
  });

  await sequelize.query(
    `UPDATE performance_reviews SET review_type_360 = true, updated_at = NOW()
     WHERE id = :reviewId AND tenant_id = :tenantId`,
    { replacements: { reviewId, tenantId } },
  );

  return res.status(201).json({ success: true, data: (rows as any[])[0] });
}

async function deleteFeedback(req: NextApiRequest, res: NextApiResponse, tenantId: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id wajib' });

  const { sequelize } = await import('@/lib/sequelizeClient');
  const [, meta] = await sequelize.query(
    `DELETE FROM performance_review_feedback WHERE id = :id AND tenant_id = :tenantId`,
    { replacements: { id, tenantId } },
  );
  if ((meta as any)?.rowCount === 0) {
    return res.status(404).json({ success: false, error: 'Feedback tidak ditemukan' });
  }
  return res.status(200).json({ success: true });
}

export default withHQAuth(handler, { module: 'hris' });
