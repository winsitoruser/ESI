import { withModuleGuard } from '../../../../lib/middleware/withModuleGuard';
import { crmApiHandler } from '../sfa/crm';

/**
 * Help Desk API — same contract as `/api/hq/sfa/crm` (tickets, SLA, satisfaction, automation service data).
 * Enabled when tenant has `helpdesk` OR `crm` module (shared CRM ticket storage).
 */
export default withModuleGuard(['helpdesk', 'crm'], crmApiHandler);
