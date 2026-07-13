import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { formatRelativeTime } from '../../../lib/employee-portal';
import { ensureEngagementTables } from '../../../lib/hris/ensure-engagement-tables';

let Survey: any, SurveyResponse: any, Recognition: any, Announcement: any;
let sequelize: any;
try { Survey = require('../../../models/Survey'); } catch(e) {}
try { SurveyResponse = require('../../../models/SurveyResponse'); } catch(e) {}
try { Recognition = require('../../../models/Recognition'); } catch(e) {}
try { Announcement = require('../../../models/Announcement'); } catch(e) {}
try { sequelize = require('../../../lib/sequelize'); } catch(e) {}

function isMissingTableError(error: any): boolean {
  const msg = String(error?.message || error?.parent?.message || error?.original?.message || '');
  return msg.includes('does not exist') || error?.original?.code === '42P01';
}

function asUuidOrNull(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

async function safeCount(table: string, where = ''): Promise<number> {
  if (!sequelize) return 0;
  try {
    const [rows] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM ${table} ${where}`);
    return (rows as any[])[0]?.c || 0;
  } catch {
    return 0;
  }
}

function mapSurveyRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    survey_type: r.survey_type || r.surveyType || 'engagement',
    surveyType: r.survey_type || r.surveyType || 'engagement',
    status: r.status || 'draft',
    start_date: r.start_date ? String(r.start_date).split('T')[0] : null,
    end_date: r.end_date ? String(r.end_date).split('T')[0] : null,
    is_anonymous: r.is_anonymous ?? r.isAnonymous ?? true,
    is_mandatory: r.is_mandatory ?? r.isMandatory ?? false,
    questions: r.questions || [],
    total_responses: Number(r.total_responses ?? r.totalResponses ?? 0),
    created_at: r.created_at || r.createdAt,
  };
}

function mapRecognitionRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    from_employee_id: r.from_employee_id ?? r.fromEmployeeId ?? r.giver_id ?? null,
    to_employee_id: r.to_employee_id ?? r.toEmployeeId ?? null,
    recognition_type: r.recognition_type || r.recognitionType || 'kudos',
    title: r.title || '',
    message: r.message || '',
    points: Number(r.points || 0),
    badge: r.badge || 'star',
    category: r.category || 'general',
    likes_count: Number(r.likes_count ?? r.likesCount ?? 0),
    created_at: r.created_at || r.createdAt,
  };
}

async function listSurveysRaw(filters: { status?: string; survey_type?: string } = {}) {
  if (!sequelize) return [];
  const where: string[] = ['1=1'];
  const replacements: any = {};
  if (filters.status) { where.push('status = :status'); replacements.status = filters.status; }
  if (filters.survey_type) { where.push('survey_type = :surveyType'); replacements.surveyType = filters.survey_type; }
  try {
    const [rows] = await sequelize.query(`
      SELECT id, tenant_id, title, description, survey_type, status,
             start_date, end_date, is_anonymous, is_mandatory, questions,
             COALESCE(total_responses, 0) AS total_responses, created_at, updated_at
      FROM surveys WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC LIMIT 100
    `, { replacements });
    return (rows as any[]).map(mapSurveyRow);
  } catch (e: any) {
    if (isMissingTableError(e)) return [];
    throw e;
  }
}

async function listRecognitionsRaw(filters: { recognition_type?: string } = {}) {
  if (!sequelize) return [];
  const where: string[] = ['1=1'];
  const replacements: any = {};
  if (filters.recognition_type) { where.push('recognition_type = :rt'); replacements.rt = filters.recognition_type; }
  try {
    const [rows] = await sequelize.query(`
      SELECT id, tenant_id, from_employee_id, to_employee_id, giver_id, receiver_id,
             recognition_type, title, message, points, badge, category,
             COALESCE(likes_count, 0) AS likes_count, created_at, updated_at
      FROM recognitions WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC LIMIT 50
    `, { replacements });
    return (rows as any[]).map(mapRecognitionRow);
  } catch (e: any) {
    if (isMissingTableError(e)) return [];
    throw e;
  }
}

async function safeModelFindAll(model: any, options: any, fallback: any[] = []) {
  if (!model) return fallback;
  try {
    const rows = await model.findAll(options);
    return rows.map((r: any) => (r?.toJSON ? r.toJSON() : r));
  } catch (e: any) {
    if (isMissingTableError(e)) return fallback;
    throw e;
  }
}

async function safeModelCount(model: any, options: any = {}): Promise<number> {
  if (!model) return 0;
  try {
    return await model.count(options);
  } catch (e: any) {
    if (isMissingTableError(e)) return 0;
    throw e;
  }
}

function mapAnnouncementRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    content: r.content || '',
    category: r.category || 'general',
    priority: r.priority || 'normal',
    target_audience: r.target_audience || 'all',
    targetAudience: r.target_audience || 'all',
    target_department: r.target_department,
    targetDepartment: r.target_department,
    target_branch: r.target_branch,
    targetBranch: r.target_branch,
    is_pinned: !!r.is_pinned,
    isPinned: !!r.is_pinned,
    status: r.status || (r.is_active === false ? 'archived' : 'published'),
    publish_date: r.published_at,
    publishDate: r.published_at ? String(r.published_at).split('T')[0] : undefined,
    expire_date: r.expires_at,
    expireDate: r.expires_at ? String(r.expires_at).split('T')[0] : undefined,
    view_count: Number(r.view_count || 0),
    viewCount: Number(r.view_count || 0),
    read_count: Number(r.view_count || r.read_count || 0),
    created_at: r.created_at,
    createdAt: r.created_at,
    time: formatRelativeTime(r.published_at || r.created_at),
  };
}

async function fanOutAnnouncementNotifications(ann: any, tenantId: string | null) {
  if (!sequelize || !ann?.id) return;
  const title = 'Pengumuman baru';
  const message = ann.title;
  try {
    await sequelize.query(`
      INSERT INTO employee_notifications (tenant_id, user_id, employee_id, title, message, type, source_type, source_id, created_at)
      SELECT DISTINCT COALESCE(e.tenant_id, :tid), e.user_id, e.id, :title, :message, 'info', 'announcement', :annId, NOW()
      FROM employees e
      WHERE e.is_active = true AND e.user_id IS NOT NULL
        AND (:tid IS NULL OR e.tenant_id IS NULL OR e.tenant_id = :tid)
        AND (
          :audience = 'all' OR :audience IS NULL
          OR (:audience = 'department' AND e.department = :dept)
        )
    `, {
      replacements: {
        tid: tenantId,
        title,
        message,
        annId: ann.id,
        audience: ann.target_audience || 'all',
        dept: ann.target_department || null,
      },
    });
  } catch { /* notifications table may not exist yet */ }
}

async function getSurveyByIdRaw(id: string) {
  if (!sequelize) return null;
  const [rows] = await sequelize.query(
    `SELECT id, tenant_id, title, description, survey_type, status,
            start_date, end_date, is_anonymous, is_mandatory, questions,
            COALESCE(total_responses, 0) AS total_responses, created_at, updated_at
     FROM surveys WHERE id = :id LIMIT 1`,
    { replacements: { id } }
  );
  return (rows as any[])[0] || null;
}

async function getSurveyDetailRaw(id: string) {
  const surveyRow = await getSurveyByIdRaw(id);
  if (!surveyRow) return null;

  let responseRows: any[] = [];
  try {
    const [rows] = await sequelize.query(
      `SELECT answers FROM survey_responses WHERE survey_id = :id`,
      { replacements: { id } }
    );
    responseRows = rows as any[];
  } catch {
    responseRows = [];
  }

  const questions = Array.isArray(surveyRow.questions) ? surveyRow.questions : [];
  const results: Record<string, any> = {};
  if (questions.length > 0 && responseRows.length > 0) {
    for (const q of questions) {
      const answers = responseRows.map((r) => {
        const list = Array.isArray(r.answers) ? r.answers : [];
        const ans = list.find((a: any) => a.question_id === q.id || a.questionId === q.id);
        return ans?.answer;
      }).filter((v) => v !== undefined && v !== null && v !== '');
      if (q.type === 'rating' || q.type === 'scale') {
        const nums = answers.map(Number).filter((n: number) => !Number.isNaN(n));
        results[q.id] = {
          avg: nums.length > 0 ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0,
          count: nums.length,
          distribution: {},
        };
        nums.forEach((n: number) => {
          results[q.id].distribution[n] = (results[q.id].distribution[n] || 0) + 1;
        });
      } else {
        results[q.id] = { answers, count: answers.length };
      }
    }
  }

  return {
    survey: mapSurveyRow(surveyRow),
    responses: responseRows.length,
    results,
  };
}

async function listHrisAnnouncements(filters: { status?: string; category?: string } = {}) {
  if (!sequelize) return [];
  const where: string[] = ['1=1'];
  const replacements: any = {};
  if (filters.status && filters.status !== 'all') {
    where.push('status = :status');
    replacements.status = filters.status;
  }
  if (filters.category) {
    where.push('category = :category');
    replacements.category = filters.category;
  }
  const [rows] = await sequelize.query(`
    SELECT * FROM hris_announcements
    WHERE ${where.join(' AND ')}
    ORDER BY is_pinned DESC, published_at DESC NULLS LAST, created_at DESC
    LIMIT 100
  `, { replacements });
  return (rows as any[]).map(mapAnnouncementRow);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { method } = req;
  const { action } = req.query;

  try {
    if (sequelize) await ensureEngagementTables(sequelize);
    switch (method) {
      case 'GET': return handleGet(req, res, action as string);
      case 'POST': return handlePost(req, res, action as string, session);
      case 'PUT': return handlePut(req, res, action as string);
      case 'DELETE': return handleDelete(req, res, action as string);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Engagement API error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      let publishedAnnouncements = 0;
      if (sequelize) {
        try {
          const [rows] = await sequelize.query(
            `SELECT COUNT(*)::int AS c FROM hris_announcements WHERE is_active = true AND status = 'published'`
          );
          publishedAnnouncements = rows[0]?.c || 0;
        } catch { /* ignore */ }
      }
      if (!publishedAnnouncements && Announcement) {
        publishedAnnouncements = await safeModelCount(Announcement, { where: { status: 'published' } });
      }
      const [surveys, responses, recognitions] = await Promise.all([
        safeCount('surveys'),
        safeCount('survey_responses'),
        safeCount('recognitions'),
      ]);
      const activeSurveys = await safeCount('surveys', `WHERE status = 'active'`);
      return res.json({
        success: true,
        data: { totalSurveys: surveys, activeSurveys, totalResponses: responses, totalRecognitions: recognitions, publishedAnnouncements }
      });
    }
    case 'surveys': {
      const { status, survey_type } = req.query;
      let data = await listSurveysRaw({
        status: status as string,
        survey_type: survey_type as string,
      });
      if (!data.length && Survey) {
        const where: any = {};
        if (status) where.status = status;
        if (survey_type) where.surveyType = survey_type;
        const rows = await safeModelFindAll(Survey, { where, order: [['created_at', 'DESC']] });
        data = rows.map(mapSurveyRow);
      }
      return res.json({ success: true, data });
    }
    case 'survey-detail': {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID required' });
      if (sequelize) {
        try {
          const detail = await getSurveyDetailRaw(String(id));
          if (detail) return res.json({ success: true, data: detail });
        } catch (e: any) {
          if (!isMissingTableError(e)) console.warn('survey-detail raw:', e.message);
        }
      }
      if (!Survey) return res.status(404).json({ error: 'Not found' });
      const survey = await Survey.findByPk(id);
      if (!survey) return res.status(404).json({ error: 'Not found' });
      const responses = SurveyResponse ? await SurveyResponse.findAll({ where: { surveyId: id } }) : [];
      const results: any = {};
      const questions = survey.questions || [];
      if (questions.length > 0 && responses.length > 0) {
        for (const q of questions) {
          const answers = responses.map((r: any) => {
            const ans = (r.answers || []).find((a: any) => a.question_id === q.id);
            return ans?.answer;
          }).filter(Boolean);
          if (q.type === 'rating' || q.type === 'scale') {
            const nums = answers.map(Number).filter((n: number) => !isNaN(n));
            results[q.id] = {
              avg: nums.length > 0 ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : 0,
              count: nums.length,
              distribution: {},
            };
            nums.forEach((n: number) => { results[q.id].distribution[n] = (results[q.id].distribution[n] || 0) + 1; });
          } else {
            results[q.id] = { answers, count: answers.length };
          }
        }
      }
      return res.json({ success: true, data: { survey: mapSurveyRow(survey.toJSON?.() || survey), responses: responses.length, results } });
    }
    case 'recognitions': {
      const { recognition_type } = req.query;
      let data = await listRecognitionsRaw({ recognition_type: recognition_type as string });
      if (!data.length && Recognition) {
        const where: any = {};
        if (recognition_type) where.recognitionType = recognition_type;
        const rows = await safeModelFindAll(Recognition, { where, order: [['created_at', 'DESC']], limit: 50 });
        data = rows.map(mapRecognitionRow);
      }
      return res.json({ success: true, data });
    }
    case 'recognition-leaderboard': {
      const data: any = { topReceivers: [], topGivers: [], recentBadges: [] };
      if (Recognition) {
        const { Op } = require('sequelize');
        const receivers = await Recognition.findAll({
          attributes: ['toEmployeeId', [require('sequelize').fn('COUNT', '*'), 'count'], [require('sequelize').fn('SUM', require('sequelize').col('points')), 'totalPoints']],
          group: ['toEmployeeId'],
          order: [[require('sequelize').fn('SUM', require('sequelize').col('points')), 'DESC']],
          limit: 10, raw: true
        });
        data.topReceivers = receivers;
      }
      return res.json({ success: true, data });
    }
    case 'announcements': {
      const { status: aStatus, category } = req.query;
      if (sequelize) {
        try {
          const data = await listHrisAnnouncements({
            status: aStatus as string,
            category: category as string,
          });
          return res.json({
            success: true,
            data,
            dataSource: data.length ? 'live' : 'empty',
          });
        } catch { /* fall through */ }
      }
      const where: any = {};
      if (aStatus) where.status = aStatus;
      if (category) where.category = category;
      const data = Announcement ? await Announcement.findAll({ where, order: [['is_pinned', 'DESC'], ['publish_date', 'DESC']] }) : [];
      return res.json({
        success: true,
        data,
        dataSource: data.length ? 'live' : 'empty',
      });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const body = req.body;
  switch (action) {
    case 'survey': {
      if (sequelize) {
        try {
          const [rows] = await sequelize.query(`
            INSERT INTO surveys (tenant_id, title, description, survey_type, status, is_anonymous, is_mandatory, questions, created_by)
            VALUES (:tid, :title, :description, :surveyType, 'draft', :isAnonymous, :isMandatory, :questions::jsonb, :createdBy)
            RETURNING *
          `, {
            replacements: {
              tid: (session.user as any)?.tenantId || null,
              title: body.title,
              description: body.description || '',
              surveyType: body.surveyType || body.survey_type || 'engagement',
              isAnonymous: body.isAnonymous ?? body.is_anonymous ?? true,
              isMandatory: body.isMandatory ?? body.is_mandatory ?? false,
              questions: JSON.stringify(body.questions || []),
              createdBy: (session.user as any)?.id || null,
            },
          });
          return res.json({ success: true, data: mapSurveyRow(rows?.[0]) });
        } catch (e: any) {
          if (!isMissingTableError(e)) throw e;
        }
      }
      if (!Survey) return res.json({ success: true, data: body });
      const survey = await Survey.create({ ...body, createdBy: (session.user as any)?.id });
      return res.json({ success: true, data: mapSurveyRow(survey?.toJSON?.() || survey) });
    }
    case 'survey-response': {
      if (!SurveyResponse) return res.json({ success: true });
      const resp = await SurveyResponse.create(body);
      // Update response count
      if (Survey) {
        await Survey.increment('totalResponses', { where: { id: body.surveyId } });
      }
      return res.json({ success: true, data: resp });
    }
    case 'publish-survey': {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'ID required' });
      if (sequelize) {
        try {
          const [rows] = await sequelize.query(`
            UPDATE surveys SET status = 'active', start_date = COALESCE(start_date, NOW()), updated_at = NOW()
            WHERE id = :id RETURNING id
          `, { replacements: { id } });
          if (rows?.length) return res.json({ success: true, message: 'Survey published' });
        } catch (e: any) {
          if (!isMissingTableError(e)) throw e;
        }
      }
      if (!Survey) return res.json({ success: true });
      await Survey.update({ status: 'active', startDate: new Date() }, { where: { id } });
      return res.json({ success: true, message: 'Survey published' });
    }
    case 'close-survey': {
      const { id: sId } = body;
      if (!sId) return res.status(400).json({ error: 'ID required' });
      if (sequelize) {
        try {
          const [rows] = await sequelize.query(`
            UPDATE surveys SET status = 'closed', end_date = COALESCE(end_date, NOW()), updated_at = NOW()
            WHERE id = :sId RETURNING id
          `, { replacements: { sId } });
          if (rows?.length) return res.json({ success: true, message: 'Survey closed' });
        } catch (e: any) {
          if (!isMissingTableError(e)) throw e;
        }
      }
      if (!Survey) return res.json({ success: true });
      await Survey.update({ status: 'closed', endDate: new Date() }, { where: { id: sId } });
      return res.json({ success: true, message: 'Survey closed' });
    }
    case 'recognition': {
      const toEmployeeId = parseInt(String(body.toEmployeeId || body.to_employee_id || ''), 10);
      const fromEmployeeId = parseInt(
        String(body.fromEmployeeId || body.from_employee_id || (session.user as any)?.employeeId || (session.user as any)?.id || '1'),
        10
      );
      if (!toEmployeeId) {
        return res.status(400).json({ success: false, error: 'toEmployeeId wajib diisi' });
      }
      if (sequelize) {
        try {
          const [rows] = await sequelize.query(`
            INSERT INTO recognitions (
              tenant_id, from_employee_id, to_employee_id, recognition_type, title, message, points, badge, category
            ) VALUES (:tid, :fromId, :toId, :rtype, :title, :message, :points, :badge, :category)
            RETURNING *
          `, {
            replacements: {
              tid: (session.user as any)?.tenantId || null,
              fromId: fromEmployeeId,
              toId: toEmployeeId,
              rtype: body.recognitionType || body.recognition_type || 'kudos',
              title: body.title || '',
              message: body.message || '',
              points: body.points || 0,
              badge: body.badge || 'star',
              category: body.category || 'general',
            },
          });
          return res.json({ success: true, data: mapRecognitionRow(rows?.[0]) });
        } catch (e: any) {
          if (!isMissingTableError(e)) throw e;
        }
      }
      if (!Recognition) return res.json({ success: true, data: body });
      const rec = await Recognition.create({
        ...body,
        fromEmployeeId,
        toEmployeeId,
      });
      return res.json({ success: true, data: mapRecognitionRow(rec?.toJSON?.() || rec) });
    }
    case 'like-recognition': {
      const { id: rId, employeeId } = body;
      if (!Recognition || !rId) return res.json({ success: true });
      const rec = await Recognition.findByPk(rId);
      if (rec) {
        const likedBy = [...(rec.likedBy || [])];
        if (!likedBy.includes(employeeId)) {
          likedBy.push(employeeId);
          await Recognition.update({ likedBy, likesCount: likedBy.length }, { where: { id: rId } });
        }
      }
      return res.json({ success: true });
    }
    case 'announcement': {
      const tenantId = (session.user as any)?.tenantId || null;
      const createdBy = asUuidOrNull((session.user as any)?.id);
      const b = body;
      const status = b.status || 'published';
      const isActive = status !== 'archived';
      const publishedAt = status === 'published' ? (b.publishDate || b.publish_date || new Date().toISOString()) : null;

      if (sequelize) {
        try {
          const [rows] = await sequelize.query(`
            INSERT INTO hris_announcements (
              tenant_id, title, content, category, priority, target_audience,
              target_department, target_branch, status, is_pinned, is_active,
              published_at, expires_at, created_by, created_at, updated_at
            ) VALUES (
              :tenantId, :title, :content, :category, :priority, :targetAudience,
              :targetDepartment, :targetBranch, :status, :isPinned, :isActive,
              :publishedAt, :expiresAt, :createdBy, NOW(), NOW()
            ) RETURNING *
          `, {
            replacements: {
              tenantId,
              title: b.title,
              content: b.content,
              category: b.category || 'general',
              priority: b.priority || 'normal',
              targetAudience: b.targetAudience || b.target_audience || 'all',
              targetDepartment: b.targetDepartment || b.target_department || null,
              targetBranch: b.targetBranch || b.target_branch || null,
              status,
              isPinned: Boolean(b.isPinned ?? b.is_pinned),
              isActive,
              publishedAt,
              expiresAt: b.expireDate || b.expire_date || null,
              createdBy,
            },
          });
          const ann = rows?.[0];
          if (status === 'published') await fanOutAnnouncementNotifications(ann, tenantId);
          return res.json({ success: true, data: mapAnnouncementRow(ann) });
        } catch (e: any) {
          console.warn('hris_announcements insert:', e.message);
          if (!isMissingTableError(e)) throw e;
        }
      }
      if (!Announcement) {
        return res.status(500).json({ success: false, error: 'Tabel pengumuman belum tersedia' });
      }
      const ann = await Announcement.create({ ...body, publishedBy: createdBy });
      return res.json({ success: true, data: ann });
    }
    case 'publish-announcement': {
      const { id: aId } = body;
      if (sequelize && aId) {
        try {
          const [rows] = await sequelize.query(`
            UPDATE hris_announcements
            SET status = 'published', is_active = true, published_at = COALESCE(published_at, NOW()), updated_at = NOW()
            WHERE id = :id RETURNING *
          `, { replacements: { id: aId } });
          const ann = rows?.[0];
          if (ann) {
            await fanOutAnnouncementNotifications(ann, (session.user as any)?.tenantId);
            return res.json({ success: true, message: 'Announcement published', data: mapAnnouncementRow(ann) });
          }
        } catch { /* fall through */ }
      }
      if (!Announcement || !aId) return res.json({ success: true });
      await Announcement.update({ status: 'published', publishDate: new Date() }, { where: { id: aId } });
      return res.json({ success: true, message: 'Announcement published' });
    }
    case 'mark-read': {
      const { id: annId, employeeId: eId } = body;
      if (!Announcement || !annId) return res.json({ success: true });
      const ann = await Announcement.findByPk(annId);
      if (ann) {
        const readBy = [...(ann.readBy || [])];
        if (!readBy.includes(eId)) {
          readBy.push(eId);
          await Announcement.update({ readBy, readCount: readBy.length }, { where: { id: annId } });
        }
      }
      return res.json({ success: true });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  switch (action) {
    case 'survey': {
      if (sequelize) {
        try {
          const b = req.body;
          const [rows] = await sequelize.query(`
            UPDATE surveys SET
              title = COALESCE(:title, title),
              description = COALESCE(:description, description),
              survey_type = COALESCE(:surveyType, survey_type),
              is_anonymous = COALESCE(:isAnonymous, is_anonymous),
              is_mandatory = COALESCE(:isMandatory, is_mandatory),
              questions = COALESCE(:questions::jsonb, questions),
              updated_at = NOW()
            WHERE id = :id RETURNING *
          `, {
            replacements: {
              id,
              title: b.title || null,
              description: b.description ?? null,
              surveyType: b.surveyType || b.survey_type || null,
              isAnonymous: b.isAnonymous ?? b.is_anonymous ?? null,
              isMandatory: b.isMandatory ?? b.is_mandatory ?? null,
              questions: b.questions ? JSON.stringify(b.questions) : null,
            },
          });
          if (rows?.[0]) return res.json({ success: true, data: mapSurveyRow(rows[0]), message: 'Survey updated' });
        } catch (e: any) {
          if (!isMissingTableError(e)) throw e;
        }
      }
      if (!Survey) return res.json({ success: true });
      await Survey.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Survey updated' });
    }
    case 'announcement': {
      if (sequelize) {
        try {
          const b = req.body;
          const status = b.status;
          const isActive = status ? status !== 'archived' : undefined;
          const [rows] = await sequelize.query(`
            UPDATE hris_announcements SET
              title = COALESCE(:title, title),
              content = COALESCE(:content, content),
              category = COALESCE(:category, category),
              priority = COALESCE(:priority, priority),
              target_audience = COALESCE(:targetAudience, target_audience),
              target_department = COALESCE(:targetDepartment, target_department),
              target_branch = COALESCE(:targetBranch, target_branch),
              status = COALESCE(:status, status),
              is_pinned = COALESCE(:isPinned, is_pinned),
              is_active = COALESCE(:isActive, is_active),
              published_at = CASE WHEN :status = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END,
              expires_at = COALESCE(:expiresAt, expires_at),
              updated_at = NOW()
            WHERE id = :id RETURNING *
          `, {
            replacements: {
              id,
              title: b.title || null,
              content: b.content || null,
              category: b.category || null,
              priority: b.priority || null,
              targetAudience: b.targetAudience || b.target_audience || null,
              targetDepartment: b.targetDepartment || b.target_department || null,
              targetBranch: b.targetBranch || b.target_branch || null,
              status: status || null,
              isPinned: b.isPinned != null ? Boolean(b.isPinned) : (b.is_pinned != null ? Boolean(b.is_pinned) : null),
              isActive: isActive != null ? isActive : null,
              expiresAt: b.expireDate || b.expire_date || null,
            },
          });
          if (rows?.[0]) return res.json({ success: true, data: mapAnnouncementRow(rows[0]), message: 'Announcement updated' });
        } catch (e: any) {
          console.warn('hris_announcements update:', e.message);
        }
      }
      if (!Announcement) return res.json({ success: true });
      await Announcement.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Announcement updated' });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  if (action === 'announcement' && sequelize) {
    try {
      await sequelize.query(
        `UPDATE hris_announcements SET is_active = false, status = 'archived', updated_at = NOW() WHERE id = :id`,
        { replacements: { id } }
      );
      return res.json({ success: true, message: 'Deleted' });
    } catch { /* fall through */ }
  }

  if (sequelize) {
    const tableMap: Record<string, string> = {
      survey: 'surveys',
      recognition: 'recognitions',
    };
    const table = tableMap[action];
    if (table) {
      try {
        await sequelize.query(`DELETE FROM ${table} WHERE id = :id`, { replacements: { id } });
        return res.json({ success: true, message: 'Deleted' });
      } catch (e: any) {
        if (!isMissingTableError(e)) throw e;
      }
    }
  }

  const models: any = { survey: Survey, recognition: Recognition, announcement: Announcement };
  const model = models[action];
  if (!model) return res.status(400).json({ error: 'Invalid action' });
  await model.destroy({ where: { id } });
  return res.json({ success: true, message: 'Deleted' });
}
