import { Router } from 'express';

import authRoutes from './auth.routes';
import branchRoutes from './branch.routes';
import productRoutes from './product.routes';
import posRoutes from './pos.routes';
import inventoryRoutes from './inventory.routes';
import purchaseRoutes from './purchase.routes';
import customerRoutes from './customer.routes';
import kitchenRoutes from './kitchen.routes';
import tableRoutes from './table.routes';
import employeeRoutes from './employee.routes';
import financeRoutes from './finance.routes';
import sfaRoutes from './sfa.routes';
import marketingRoutes from './marketing.routes';
import fleetRoutes from './fleet.routes';
import tmsRoutes from './tms.routes';
import manufacturingRoutes from './manufacturing.routes';
import assetRoutes from './asset.routes';
import projectRoutes from './project.routes';
import procurementRoutes from './procurement.routes';
import eximRoutes from './exim.routes';
import billingRoutes from './billing.routes';
import crmRoutes from './crm.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Module routes
router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/products', productRoutes);
router.use('/pos', posRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchase', purchaseRoutes);
router.use('/customers', customerRoutes);
router.use('/kitchen', kitchenRoutes);
router.use('/tables', tableRoutes);
router.use('/employees', employeeRoutes);
router.use('/finance', financeRoutes);
router.use('/sfa', sfaRoutes);
router.use('/marketing', marketingRoutes);
router.use('/fleet', fleetRoutes);
router.use('/tms', tmsRoutes);
router.use('/manufacturing', manufacturingRoutes);
router.use('/assets', assetRoutes);
router.use('/projects', projectRoutes);
router.use('/procurement', procurementRoutes);
router.use('/exim', eximRoutes);
router.use('/billing', billingRoutes);
router.use('/crm', crmRoutes);
router.use('/admin', adminRoutes);

export default router;
