import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';
import { authenticate, authorize, generateToken, generateRefreshToken } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { User, Tenant, Role, BusinessType, Module, TenantModule } from '../models';
import { CrudController } from '../utils/crud';
import logger from '../utils/logger';

const router = Router();

// ==================== AUTH ====================
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, business_name, business_type_id } = req.body;
    if (!name || !email || !password || !business_name) {
      sendError(res, 'Name, email, password, and business_name are required', 400);
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const slug = business_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const tenant = await Tenant.create({
      name: business_name,
      slug: `${slug}-${Date.now()}`,
      business_type_id: business_type_id || null,
      status: 'trial',
    });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      tenant_id: tenant.id,
      name,
      email,
      password_hash,
      role: 'admin',
      is_active: true,
    });

    const tokenPayload = { id: user.id, email, role: 'admin', tenantId: tenant.id };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await user.update({ refresh_token: refreshToken });

    sendSuccess(res, {
      user: { id: user.id, name, email, role: 'admin' },
      tenant: { id: tenant.id, name: business_name, slug: tenant.slug },
      token,
      refreshToken,
    }, 'Registration successful', 201);
  } catch (error: any) {
    logger.error('Registration error:', error);
    sendError(res, 'Registration failed', 500);
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      sendError(res, 'Email and password required', 400);
      return;
    }

    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      branchId: user.branch_id,
    };
    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await user.update({ refresh_token: refreshToken, last_login: new Date() });

    sendSuccess(res, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id, branchId: user.branch_id },
      token,
      refreshToken,
    }, 'Login successful');
  } catch (error: any) {
    logger.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
});

router.post('/refresh-token', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    const user = await User.findOne({ where: { refresh_token: refreshToken, is_active: true } });
    if (!user) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id, branchId: user.branch_id };
    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await user.update({ refresh_token: newRefreshToken });

    sendSuccess(res, { token: newToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    logger.error('Refresh token error:', error);
    sendError(res, 'Token refresh failed', 500);
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.id) {
      await User.update({ refresh_token: null }, { where: { id: req.user.id } });
    }
    sendSuccess(res, null, 'Logged out');
  } catch (error) {
    sendError(res, 'Logout failed', 500);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      attributes: { exclude: ['password_hash', 'refresh_token'] },
    });
    sendSuccess(res, user);
  } catch (error) {
    sendError(res, 'Failed to get profile', 500);
  }
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, avatar_url } = req.body;
    await User.update({ name, phone, avatar_url }, { where: { id: req.user!.id } });
    const user = await User.findByPk(req.user!.id, {
      attributes: { exclude: ['password_hash', 'refresh_token'] },
    });
    sendSuccess(res, user, 'Profile updated');
  } catch (error) {
    sendError(res, 'Failed to update profile', 500);
  }
});

router.put('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user!.id);
    if (!user) { sendError(res, 'User not found', 404); return; }

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) { sendError(res, 'Current password is incorrect', 400); return; }

    const password_hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash });
    sendSuccess(res, null, 'Password changed');
  } catch (error) {
    sendError(res, 'Failed to change password', 500);
  }
});

// ==================== USERS (Admin) ====================
const userController = new CrudController(User, 'User', ['name', 'email']);
router.get('/users', authenticate, authorize('admin', 'super_admin'), userController.list);
router.get('/users/:id', authenticate, authorize('admin', 'super_admin'), userController.getById);
router.post('/users', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId };
    if (data.password) {
      data.password_hash = await bcrypt.hash(data.password, 12);
      delete data.password;
    }
    const user = await User.create(data);
    sendSuccess(res, user, 'User created', 201);
  } catch (error: any) {
    logger.error('Create user error:', error);
    sendError(res, 'Failed to create user', 500);
  }
});
router.put('/users/:id', authenticate, authorize('admin', 'super_admin'), userController.update);
router.delete('/users/:id', authenticate, authorize('admin', 'super_admin'), userController.delete);

// ==================== ROLES ====================
const roleController = new CrudController(Role, 'Role', ['name']);
router.get('/roles', authenticate, roleController.list);
router.get('/roles/:id', authenticate, roleController.getById);
router.post('/roles', authenticate, authorize('admin', 'super_admin'), roleController.create);
router.put('/roles/:id', authenticate, authorize('admin', 'super_admin'), roleController.update);
router.delete('/roles/:id', authenticate, authorize('admin', 'super_admin'), roleController.delete);

// ==================== BUSINESS TYPES ====================
router.get('/business-types', async (_req: AuthRequest, res: Response) => {
  try {
    const types = await BusinessType.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    sendSuccess(res, types);
  } catch (error) {
    sendError(res, 'Failed to get business types', 500);
  }
});

// ==================== MODULES ====================
router.get('/modules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const modules = await Module.findAll({ where: { is_active: true }, order: [['category', 'ASC'], ['name', 'ASC']] });
    sendSuccess(res, modules);
  } catch (error) {
    sendError(res, 'Failed to get modules', 500);
  }
});

router.get('/tenant-modules', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const modules = await TenantModule.findAll({
      where: { tenant_id: req.tenantId, is_active: true },
      include: [{ model: Module }],
    });
    sendSuccess(res, modules);
  } catch (error) {
    sendError(res, 'Failed to get tenant modules', 500);
  }
});

router.post('/tenant-modules', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { module_id } = req.body;
    const tm = await TenantModule.create({ tenant_id: req.tenantId, module_id, is_active: true });
    sendSuccess(res, tm, 'Module activated', 201);
  } catch (error) {
    sendError(res, 'Failed to activate module', 500);
  }
});

export default router;
