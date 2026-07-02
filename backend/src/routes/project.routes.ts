import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { PjmProject, PjmTask, PjmMilestone, PjmTimesheet, PjmRisk } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Projects
const prjCtrl = new CrudController(PjmProject, 'Project', ['name', 'code', 'client_name']);
router.get('/', authenticate, prjCtrl.list);
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const p = await PjmProject.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: PjmTask, as: 'tasks' },
        { model: PjmMilestone, as: 'milestones' },
        { model: PjmRisk, as: 'risks' },
      ],
    });
    if (!p) { sendError(res, 'Project not found', 404); return; }
    sendSuccess(res, p);
  } catch (error) { sendError(res, 'Failed to get project', 500); }
});
router.post('/', authenticate, authorize('admin', 'manager'), prjCtrl.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), prjCtrl.update);
router.delete('/:id', authenticate, authorize('admin'), prjCtrl.delete);

// Tasks
const taskCtrl = new CrudController(PjmTask, 'Task', ['title']);
router.get('/:id/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await PjmTask.findAll({ where: { project_id: req.params.id }, order: [['sort_order', 'ASC']] });
    sendSuccess(res, tasks);
  } catch (error) { sendError(res, 'Failed to get tasks', 500); }
});
router.post('/:id/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const task = await PjmTask.create({ ...req.body, project_id: req.params.id });
    sendSuccess(res, task, 'Task created', 201);
  } catch (error) { sendError(res, 'Failed to create task', 500); }
});
router.put('/tasks/:id', authenticate, taskCtrl.update);
router.delete('/tasks/:id', authenticate, taskCtrl.delete);

// Milestones
router.post('/:id/milestones', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const ms = await PjmMilestone.create({ ...req.body, project_id: req.params.id });
    sendSuccess(res, ms, 'Milestone created', 201);
  } catch (error) { sendError(res, 'Failed to create milestone', 500); }
});

// Timesheets
const tsCtrl = new CrudController(PjmTimesheet, 'Timesheet', ['description']);
router.get('/timesheets/list', authenticate, tsCtrl.list);
router.post('/timesheets', authenticate, tsCtrl.create);
router.put('/timesheets/:id', authenticate, tsCtrl.update);

// Risks
router.post('/:id/risks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const risk = await PjmRisk.create({ ...req.body, project_id: req.params.id });
    sendSuccess(res, risk, 'Risk created', 201);
  } catch (error) { sendError(res, 'Failed to create risk', 500); }
});

export default router;
