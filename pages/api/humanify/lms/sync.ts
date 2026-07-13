/**
 * LMS ↔ Training unified sync API
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import {
  getUnifiedTrainingOverview,
  migrateLegacyCertifications,
  batchSyncExamResults,
  syncExamResultToScoring,
  syncCourseCompletionToGraduation,
} from '../../../../lib/hris/lms/training-bridge';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const { action } = req.query;

    if (req.method === 'GET' && action === 'overview') {
      const data = await getUnifiedTrainingOverview(tenantId);
      return res.json({ success: true, data });
    }

    if (req.method === 'POST') {
      if (action === 'migrate-certs') {
        const result = await migrateLegacyCertifications(tenantId);
        return res.json({ success: true, data: result });
      }
      if (action === 'sync-exam-scores') {
        const result = await batchSyncExamResults(tenantId);
        return res.json({ success: true, data: result });
      }
      if (action === 'sync-exam-result') {
        const { result_id, employee_id, exam_id, percentage, is_passed } = req.body;
        const result = await syncExamResultToScoring({
          tenantId, resultId: result_id, employeeId: employee_id,
          examId: exam_id, percentage: Number(percentage), isPassed: !!is_passed,
        });
        return res.json({ success: true, data: result });
      }
      if (action === 'sync-graduation') {
        const { employee_id, employee_name, curriculum_id } = req.body;
        const result = await syncCourseCompletionToGraduation({
          tenantId, employeeId: employee_id, employeeName: employee_name, curriculumId: curriculum_id,
        });
        return res.json({ success: true, data: result });
      }
      if (action === 'sync-all') {
        const [certs, exams] = await Promise.all([
          migrateLegacyCertifications(tenantId),
          batchSyncExamResults(tenantId),
        ]);
        return res.json({ success: true, data: { certificates: certs, exam_scores: exams } });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[LMS Sync]', err);
    return res.status(500).json({ error: err.message });
  }
}
