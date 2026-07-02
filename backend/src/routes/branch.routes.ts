import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { Branch, BranchModule, BranchSetup, Module } from '../models';
import { CrudController } from '../utils/crud';
import logger from '../utils/logger';

const router = Router();

const branchController = new CrudController(Branch, 'Branch', ['name', 'code', 'city']);

router.get('/', authenticate, branchController.list);
router.get('/:id', authenticate, branchController.getById);
router.post('/', authenticate, authorize('admin', 'super_admin'), branchController.create);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), branchController.update);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), branchController.delete);

// Branch Modules
router.get('/:id/modules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const modules = await BranchModule.findAll({
      where: { branch_id: req.params.id, is_active: true },
      include: [{ model: Module }],
    });
    sendSuccess(res, modules);
  } catch (error) {
    sendError(res, 'Failed to get branch modules', 500);
  }
});

router.post('/:id/modules', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const bm = await BranchModule.create({ branch_id: req.params.id, module_id: req.body.module_id, is_active: true });
    sendSuccess(res, bm, 'Module activated for branch', 201);
  } catch (error) {
    sendError(res, 'Failed to activate module', 500);
  }
});

// Branch Setup
router.get('/:id/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const setup = await BranchSetup.findOne({ where: { branch_id: req.params.id } });
    sendSuccess(res, setup);
  } catch (error) {
    sendError(res, 'Failed to get branch setup', 500);
  }
});

router.put('/:id/setup', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const [setup] = await BranchSetup.upsert({ branch_id: req.params.id, ...req.body });
    sendSuccess(res, setup, 'Branch setup updated');
  } catch (error) {
    sendError(res, 'Failed to update branch setup', 500);
  }
});

export default router;
