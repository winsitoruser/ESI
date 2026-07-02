import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError, parsePagination, sendPaginated } from '../utils/helpers';
import { AuditLog, SystemBackup, Notification, NotificationSetting, SystemAlert, AlertSubscription, Webhook, StoreSetting, SyncLog, IntegrationConfig, Announcement } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Audit Logs
router.get('/audit-logs', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const pagination = parsePagination(req.query);
    const where: any = {};
    if (req.tenantId) where.tenant_id = req.tenantId;
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.action) where.action = req.query.action;
    if (req.query.user_id) where.user_id = req.query.user_id;

    const { count, rows } = await AuditLog.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: pagination.limit, offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
    });
    sendPaginated(res, rows, count, pagination);
  } catch (error) { sendError(res, 'Failed to get audit logs', 500); }
});

// System Backups
const bkCtrl = new CrudController(SystemBackup, 'Backup', []);
router.get('/backups', authenticate, authorize('admin', 'super_admin'), bkCtrl.list);
router.post('/backups', authenticate, authorize('super_admin'), bkCtrl.create);

// Notifications
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pagination = parsePagination(req.query);
    const where: any = { user_id: req.user!.id, tenant_id: req.tenantId };
    if (req.query.is_read === 'false') where.is_read = false;

    const { count, rows } = await Notification.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: pagination.limit, offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
    });
    sendPaginated(res, rows, count, pagination);
  } catch (error) { sendError(res, 'Failed to get notifications', 500); }
});
router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.update({ is_read: true, read_at: new Date() }, { where: { id: req.params.id, user_id: req.user!.id } });
    sendSuccess(res, null, 'Marked as read');
  } catch (error) { sendError(res, 'Failed to mark as read', 500); }
});
router.put('/notifications/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.update({ is_read: true, read_at: new Date() }, { where: { user_id: req.user!.id, is_read: false } });
    sendSuccess(res, null, 'All marked as read');
  } catch (error) { sendError(res, 'Failed to mark all as read', 500); }
});

// Notification Settings
router.get('/notification-settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await NotificationSetting.findAll({ where: { user_id: req.user!.id, tenant_id: req.tenantId } });
    sendSuccess(res, settings);
  } catch (error) { sendError(res, 'Failed to get settings', 500); }
});
router.put('/notification-settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, channels, is_enabled } = req.body;
    const [setting] = await NotificationSetting.upsert({ user_id: req.user!.id, tenant_id: req.tenantId, type, channels, is_enabled });
    sendSuccess(res, setting, 'Settings updated');
  } catch (error) { sendError(res, 'Failed to update settings', 500); }
});

// System Alerts
const alertCtrl = new CrudController(SystemAlert, 'Alert', ['title', 'type']);
router.get('/alerts', authenticate, alertCtrl.list);
router.put('/alerts/:id/acknowledge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const alert = await SystemAlert.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!alert) { sendError(res, 'Alert not found', 404); return; }
    await alert.update({ status: 'acknowledged', acknowledged_by: req.user!.id, acknowledged_at: new Date() });
    sendSuccess(res, alert, 'Alert acknowledged');
  } catch (error) { sendError(res, 'Failed to acknowledge alert', 500); }
});

// Alert Subscriptions
router.get('/alert-subscriptions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const subs = await AlertSubscription.findAll({ where: { user_id: req.user!.id, tenant_id: req.tenantId } });
    sendSuccess(res, subs);
  } catch (error) { sendError(res, 'Failed to get subscriptions', 500); }
});
router.post('/alert-subscriptions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await AlertSubscription.create({ user_id: req.user!.id, tenant_id: req.tenantId, ...req.body });
    sendSuccess(res, sub, 'Subscription created', 201);
  } catch (error) { sendError(res, 'Failed to create subscription', 500); }
});

// Webhooks
const whCtrl = new CrudController(Webhook, 'Webhook', ['name', 'url']);
router.get('/webhooks', authenticate, authorize('admin'), whCtrl.list);
router.post('/webhooks', authenticate, authorize('admin'), whCtrl.create);
router.put('/webhooks/:id', authenticate, authorize('admin'), whCtrl.update);
router.delete('/webhooks/:id', authenticate, authorize('admin'), whCtrl.delete);

// Store Settings
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { tenant_id: req.tenantId };
    if (req.query.category) where.category = req.query.category;
    if (req.branchId) where.branch_id = req.branchId;
    const settings = await StoreSetting.findAll({ where });
    sendSuccess(res, settings);
  } catch (error) { sendError(res, 'Failed to get settings', 500); }
});
router.put('/settings', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { category, key, value } = req.body;
    const [setting] = await StoreSetting.upsert({
      tenant_id: req.tenantId, branch_id: req.branchId, category, key, value,
    });
    sendSuccess(res, setting, 'Setting saved');
  } catch (error) { sendError(res, 'Failed to save setting', 500); }
});

// Sync Logs
router.get('/sync-logs', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await SyncLog.findAll({
      where: { tenant_id: req.tenantId },
      order: [['created_at', 'DESC']], limit: 50,
    });
    sendSuccess(res, logs);
  } catch (error) { sendError(res, 'Failed to get sync logs', 500); }
});

// Integration Configs
const intCtrl = new CrudController(IntegrationConfig, 'Integration', ['provider', 'type']);
router.get('/integrations', authenticate, authorize('admin'), intCtrl.list);
router.get('/integrations/:id', authenticate, authorize('admin'), intCtrl.getById);
router.post('/integrations', authenticate, authorize('admin'), intCtrl.create);
router.put('/integrations/:id', authenticate, authorize('admin'), intCtrl.update);
router.delete('/integrations/:id', authenticate, authorize('admin'), intCtrl.delete);

// Announcements
const annCtrl = new CrudController(Announcement, 'Announcement', ['title']);
router.get('/announcements', authenticate, annCtrl.list);
router.post('/announcements', authenticate, authorize('admin', 'super_admin'), annCtrl.create);
router.put('/announcements/:id', authenticate, authorize('admin', 'super_admin'), annCtrl.update);
router.delete('/announcements/:id', authenticate, authorize('admin', 'super_admin'), annCtrl.delete);

export default router;
