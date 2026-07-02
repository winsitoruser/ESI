import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let Survey: any, SurveyResponse: any, Recognition: any, Announcement: any;
try { Survey = require('../../../../models/Survey'); } catch(e) {}
try { SurveyResponse = require('../../../../models/SurveyResponse'); } catch(e) {}
try { Recognition = require('../../../../models/Recognition'); } catch(e) {}
try { Announcement = require('../../../../models/Announcement'); } catch(e) {}

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
    console.error('Engagement API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'overview': {
      const [surveys, responses, recognitions, announcements] = await Promise.all([
        Survey?.count() || 0,
        SurveyResponse?.count() || 0,
        Recognition?.count() || 0,
        Announcement?.count({ where: { status: 'published' } }) || 0,
      ]);
      const activeSurveys = Survey ? await Survey.count({ where: { status: 'active' } }) : 0;
      return res.json({
        success: true,
        data: { totalSurveys: surveys, activeSurveys, totalResponses: responses, totalRecognitions: recognitions, publishedAnnouncements: announcements }
      });
    }
    case 'surveys': {
      const { status, survey_type } = req.query;
      const where: any = {};
      if (status) where.status = status;
      if (survey_type) where.surveyType = survey_type;
      const data = Survey ? await Survey.findAll({ where, order: [['created_at', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    case 'survey-detail': {
      const { id } = req.query;
      if (!id || !Survey) return res.status(404).json({ error: 'Not found' });
      const survey = await Survey.findByPk(id);
      const responses = SurveyResponse ? await SurveyResponse.findAll({ where: { surveyId: id } }) : [];
      // Compute aggregated results
      const results: any = {};
      if (survey?.questions && responses.length > 0) {
        for (const q of survey.questions) {
          const answers = responses.map((r: any) => {
            const ans = (r.answers || []).find((a: any) => a.question_id === q.id);
            return ans?.answer;
          }).filter(Boolean);
          if (q.type === 'rating' || q.type === 'scale') {
            const nums = answers.map(Number).filter((n: number) => !isNaN(n));
            results[q.id] = {
              avg: nums.length > 0 ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : 0,
              count: nums.length,
              distribution: {}
            };
            nums.forEach((n: number) => { results[q.id].distribution[n] = (results[q.id].distribution[n] || 0) + 1; });
          } else {
            results[q.id] = { answers, count: answers.length };
          }
        }
      }
      return res.json({ success: true, data: { survey, responses: responses.length, results } });
    }
    case 'recognitions': {
      const { recognition_type } = req.query;
      const where: any = {};
      if (recognition_type) where.recognitionType = recognition_type;
      const data = Recognition ? await Recognition.findAll({ where, order: [['created_at', 'DESC']], limit: 50 }) : [];
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
      const where: any = {};
      if (aStatus) where.status = aStatus;
      if (category) where.category = category;
      const data = Announcement ? await Announcement.findAll({ where, order: [['is_pinned', 'DESC'], ['publish_date', 'DESC']] }) : [];
      return res.json({ success: true, data });
    }
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string, session: any) {
  const body = req.body;
  switch (action) {
    case 'survey': {
      if (!Survey) return res.json({ success: true, data: body });
      const survey = await Survey.create({ ...body, createdBy: (session.user as any)?.id });
      return res.json({ success: true, data: survey });
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
      if (!Survey || !id) return res.json({ success: true });
      await Survey.update({ status: 'active', startDate: new Date() }, { where: { id } });
      return res.json({ success: true, message: 'Survey published' });
    }
    case 'close-survey': {
      const { id: sId } = body;
      if (!Survey || !sId) return res.json({ success: true });
      await Survey.update({ status: 'closed', endDate: new Date() }, { where: { id: sId } });
      return res.json({ success: true, message: 'Survey closed' });
    }
    case 'recognition': {
      if (!Recognition) return res.json({ success: true, data: body });
      const rec = await Recognition.create({ ...body, fromEmployeeId: body.fromEmployeeId || (session.user as any)?.employeeId });
      return res.json({ success: true, data: rec });
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
      if (!Announcement) return res.json({ success: true, data: body });
      const ann = await Announcement.create({ ...body, publishedBy: (session.user as any)?.id });
      return res.json({ success: true, data: ann });
    }
    case 'publish-announcement': {
      const { id: aId } = body;
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
      if (!Survey) return res.json({ success: true });
      await Survey.update(req.body, { where: { id } });
      return res.json({ success: true, message: 'Survey updated' });
    }
    case 'announcement': {
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

  const models: any = { survey: Survey, recognition: Recognition, announcement: Announcement };
  const model = models[action];
  if (!model) return res.status(400).json({ error: 'Invalid action' });
  await model.destroy({ where: { id } });
  return res.json({ success: true, message: 'Deleted' });
}
