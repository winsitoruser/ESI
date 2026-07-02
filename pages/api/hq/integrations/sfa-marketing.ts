import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import sequelize from '@/lib/sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const { action } = req.query;

    const q = async (sql: string, replacements?: any) => {
      const [rows] = await sequelize.query(sql, { replacements });
      return rows;
    };

    switch (action) {
      // ═══════════════════════════════════════════
      // SFA ↔ HRIS: Get salespeople from employees
      // ═══════════════════════════════════════════
      case 'sfa-salespeople': {
        const salespeople = await q(`
          SELECT u.id, u.name, u.email, u.role,
            COALESCE(
              (SELECT COUNT(*) FROM sfa_leads l WHERE l.created_by = u.id AND l.tenant_id = :tid), 0
            ) as lead_count,
            COALESCE(
              (SELECT COUNT(*) FROM sfa_visits v WHERE v.salesperson_id = u.id AND v.tenant_id = :tid), 0
            ) as visit_count,
            COALESCE(
              (SELECT SUM(o.expected_value) FROM sfa_opportunities o WHERE o.created_by = u.id AND o.tenant_id = :tid AND o.status = 'open'), 0
            ) as pipeline_value
          FROM users u
          WHERE u.tenant_id = :tid
            AND u.role IN ('sales_staff', 'branch_manager', 'hq_admin', 'owner')
            AND u.is_active = true
          ORDER BY u.name
        `, { tid: tenantId });
        return res.json({ success: true, data: salespeople });
      }

      // ═══════════════════════════════════════════
      // SFA ↔ HRIS: Salesperson performance (KPI link)
      // ═══════════════════════════════════════════
      case 'sfa-performance': {
        const { salesperson_id, period } = req.query;
        const p = period || new Date().toISOString().slice(0, 7);
        const perf = await q(`
          SELECT
            (SELECT COUNT(*) FROM sfa_leads WHERE created_by = :sid AND tenant_id = :tid AND TO_CHAR(created_at, 'YYYY-MM') = :period) as leads_created,
            (SELECT COUNT(*) FROM sfa_leads WHERE created_by = :sid AND tenant_id = :tid AND status = 'converted' AND TO_CHAR(converted_at, 'YYYY-MM') = :period) as leads_converted,
            (SELECT COUNT(*) FROM sfa_visits WHERE salesperson_id = :sid AND tenant_id = :tid AND TO_CHAR(visit_date, 'YYYY-MM') = :period AND status = 'completed') as visits_completed,
            (SELECT COUNT(*) FROM sfa_opportunities WHERE created_by = :sid AND tenant_id = :tid AND status = 'won' AND TO_CHAR(actual_close_date, 'YYYY-MM') = :period) as deals_won,
            (SELECT COALESCE(SUM(actual_value), 0) FROM sfa_opportunities WHERE created_by = :sid AND tenant_id = :tid AND status = 'won' AND TO_CHAR(actual_close_date, 'YYYY-MM') = :period) as revenue_won,
            (SELECT COALESCE(SUM(total), 0) FROM sfa_quotations WHERE salesperson_id = :sid AND tenant_id = :tid AND TO_CHAR(created_at, 'YYYY-MM') = :period) as quotation_value
        `, { sid: salesperson_id, tid: tenantId, period: p });
        return res.json({ success: true, data: perf[0] || {} });
      }

      // ═══════════════════════════════════════════
      // SFA ↔ Inventory: Products for quotations
      // ═══════════════════════════════════════════
      case 'sfa-products': {
        const { search, category_id } = req.query;
        let where = 'WHERE p.tenant_id = :tid AND p.is_active = true';
        const params: any = { tid: tenantId };
        if (search) { where += ` AND (p.name ILIKE :search OR p.sku ILIKE :search)`; params.search = `%${search}%`; }
        if (category_id) { where += ` AND p.category_id = :cid`; params.cid = category_id; }

        const products = await q(`
          SELECT p.id, p.name, p.sku, p.price, p.cost_price,
            c.name as category_name,
            COALESCE((SELECT SUM(s.quantity) FROM stocks s WHERE s.product_id = p.id), 0) as total_stock
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          ${where}
          ORDER BY p.name
          LIMIT 100
        `, params);
        return res.json({ success: true, data: products });
      }

      // ═══════════════════════════════════════════
      // Marketing ↔ POS: Validate promo at checkout
      // ═══════════════════════════════════════════
      case 'validate-promo': {
        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
        const { promo_code, order_total, customer_id, branch_id, items } = req.body;
        if (!promo_code) return res.status(400).json({ success: false, error: 'Kode promo diperlukan' });

        const promos = await q(`
          SELECT * FROM mkt_promotions
          WHERE tenant_id = :tid AND promo_code = :code AND status = 'active'
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date >= NOW())
          LIMIT 1
        `, { tid: tenantId, code: promo_code.toUpperCase() });

        if (!promos || (promos as any[]).length === 0) {
          return res.json({ success: false, error: 'Kode promo tidak valid atau sudah expired' });
        }

        const promo = (promos as any[])[0];

        // Check usage limit
        if (promo.usage_limit > 0 && promo.usage_count >= promo.usage_limit) {
          return res.json({ success: false, error: 'Kuota promo sudah habis' });
        }

        // Check per-customer limit
        if (customer_id && promo.per_customer_limit > 0) {
          const custUsage = await q(`
            SELECT COUNT(*) as cnt FROM mkt_promotion_usage
            WHERE promotion_id = :pid AND customer_id = :cid
          `, { pid: promo.id, cid: customer_id });
          if ((custUsage as any[])[0]?.cnt >= promo.per_customer_limit) {
            return res.json({ success: false, error: 'Anda sudah mencapai batas penggunaan promo ini' });
          }
        }

        // Check minimum purchase
        if (promo.min_purchase > 0 && order_total < parseFloat(promo.min_purchase)) {
          return res.json({
            success: false,
            error: `Minimum pembelian Rp ${parseFloat(promo.min_purchase).toLocaleString('id-ID')}`
          });
        }

        // Check branch applicability
        if (branch_id && promo.applicable_branches && promo.applicable_branches.length > 0) {
          if (!promo.applicable_branches.includes(branch_id)) {
            return res.json({ success: false, error: 'Promo tidak berlaku di cabang ini' });
          }
        }

        // Calculate discount
        let discount = 0;
        if (promo.promo_type === 'discount') {
          if (promo.discount_type === 'percentage') {
            discount = (order_total * parseFloat(promo.discount_value)) / 100;
            if (promo.max_discount > 0) discount = Math.min(discount, parseFloat(promo.max_discount));
          } else {
            discount = parseFloat(promo.discount_value);
          }
        } else if (promo.promo_type === 'cashback') {
          if (promo.discount_type === 'percentage') {
            discount = (order_total * parseFloat(promo.discount_value)) / 100;
            if (promo.max_discount > 0) discount = Math.min(discount, parseFloat(promo.max_discount));
          } else {
            discount = parseFloat(promo.discount_value);
          }
        } else if (promo.promo_type === 'free_shipping') {
          discount = 0; // Handled by shipping logic
        }

        return res.json({
          success: true,
          data: {
            promo_id: promo.id,
            promo_code: promo.promo_code,
            promo_name: promo.name,
            promo_type: promo.promo_type,
            discount_amount: Math.round(discount),
            order_total,
            final_total: Math.max(0, order_total - discount),
            message: `Promo "${promo.name}" berhasil diterapkan! Diskon Rp ${Math.round(discount).toLocaleString('id-ID')}`
          }
        });
      }

      // ═══════════════════════════════════════════
      // Marketing ↔ POS: Redeem promo after payment
      // ═══════════════════════════════════════════
      case 'redeem-promo': {
        if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
        const { promo_id, customer_id: cid, order_id, branch_id: bid, discount_applied, order_total: ot } = req.body;
        if (!promo_id) return res.status(400).json({ success: false, error: 'promo_id diperlukan' });

        await sequelize.query(`
          INSERT INTO mkt_promotion_usage (id, promotion_id, customer_id, order_id, branch_id, discount_applied, order_total, created_at, updated_at)
          VALUES (gen_random_uuid(), :pid, :cid, :oid, :bid, :disc, :ot, NOW(), NOW())
        `, { replacements: { pid: promo_id, cid: cid || null, oid: order_id || null, bid: bid || null, disc: discount_applied || 0, ot: ot || 0 } });

        await sequelize.query(`UPDATE mkt_promotions SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = :pid`, { replacements: { pid: promo_id } });

        return res.json({ success: true, message: 'Promo berhasil diredeem' });
      }

      // ═══════════════════════════════════════════
      // Marketing ↔ CRM: Customer data for segments
      // ═══════════════════════════════════════════
      case 'segment-customers': {
        const { segment_id } = req.query;
        if (!segment_id) return res.status(400).json({ success: false, error: 'segment_id diperlukan' });

        const seg = await q(`SELECT * FROM mkt_segments WHERE id = :sid AND tenant_id = :tid`, { sid: segment_id, tid: tenantId });
        if (!(seg as any[]).length) return res.status(404).json({ success: false, error: 'Segment tidak ditemukan' });

        const segment = (seg as any[])[0];
        let customerQuery = `SELECT c.id, c.name, c.email, c.phone, c.total_spent, c.visit_count, c.last_visit_at, c.created_at FROM customers c WHERE c.tenant_id = :tid`;
        const params: any = { tid: tenantId };

        // Apply segment criteria if dynamic
        if (segment.segment_type === 'dynamic' && segment.criteria) {
          const criteria = typeof segment.criteria === 'string' ? JSON.parse(segment.criteria) : segment.criteria;
          if (criteria.min_spent) { customerQuery += ` AND c.total_spent >= :minSpent`; params.minSpent = criteria.min_spent; }
          if (criteria.min_visits) { customerQuery += ` AND c.visit_count >= :minVisits`; params.minVisits = criteria.min_visits; }
          if (criteria.days_since_last_visit) {
            customerQuery += ` AND c.last_visit_at <= NOW() - INTERVAL '${parseInt(criteria.days_since_last_visit)} days'`;
          }
          if (criteria.registered_within_days) {
            customerQuery += ` AND c.created_at >= NOW() - INTERVAL '${parseInt(criteria.registered_within_days)} days'`;
          }
        }

        customerQuery += ` ORDER BY c.total_spent DESC LIMIT 500`;
        const customers = await q(customerQuery, params);
        return res.json({ success: true, data: customers, segment: { id: segment.id, name: segment.name, code: segment.code } });
      }

      // ═══════════════════════════════════════════
      // SFA ↔ Finance: Revenue attribution by salesperson
      // ═══════════════════════════════════════════
      case 'sfa-revenue': {
        const { period: revPeriod } = req.query;
        const rp = revPeriod || new Date().toISOString().slice(0, 7);
        const revenue = await q(`
          SELECT
            u.id as salesperson_id, u.name as salesperson_name,
            COALESCE(SUM(o.actual_value), 0) as total_revenue,
            COUNT(o.id) as deals_closed,
            COALESCE(AVG(o.actual_value), 0) as avg_deal_size,
            COALESCE(SUM(q.total), 0) as total_quoted
          FROM users u
          LEFT JOIN sfa_opportunities o ON o.created_by = u.id AND o.tenant_id = :tid AND o.status = 'won' AND TO_CHAR(o.actual_close_date, 'YYYY-MM') = :period
          LEFT JOIN sfa_quotations q ON q.salesperson_id = u.id AND q.tenant_id = :tid AND TO_CHAR(q.created_at, 'YYYY-MM') = :period
          WHERE u.tenant_id = :tid AND u.is_active = true
          GROUP BY u.id, u.name
          HAVING COALESCE(SUM(o.actual_value), 0) > 0 OR COALESCE(SUM(q.total), 0) > 0
          ORDER BY total_revenue DESC
        `, { tid: tenantId, period: rp });
        return res.json({ success: true, data: revenue });
      }

      // ═══════════════════════════════════════════
      // Marketing ↔ Finance: Campaign ROI analytics
      // ═══════════════════════════════════════════
      case 'campaign-roi': {
        const campaigns = await q(`
          SELECT
            c.id, c.name, c.campaign_number, c.objective, c.status,
            c.budget, c.spent, c.actual_revenue, c.roi,
            c.actual_reach, c.actual_conversions,
            CASE WHEN c.actual_reach > 0 THEN c.actual_conversions::FLOAT / c.actual_reach * 100 ELSE 0 END as conversion_rate,
            CASE WHEN c.actual_conversions > 0 THEN c.spent / c.actual_conversions ELSE 0 END as cost_per_conversion,
            (SELECT COUNT(*) FROM mkt_promotion_usage pu JOIN mkt_promotions p ON pu.promotion_id = p.id WHERE p.campaign_id = c.id) as promo_redemptions,
            (SELECT COALESCE(SUM(pu.discount_applied), 0) FROM mkt_promotion_usage pu JOIN mkt_promotions p ON pu.promotion_id = p.id WHERE p.campaign_id = c.id) as total_discount_given
          FROM mkt_campaigns c
          WHERE c.tenant_id = :tid
          ORDER BY c.created_at DESC
          LIMIT 50
        `, { tid: tenantId });
        return res.json({ success: true, data: campaigns });
      }

      // ═══════════════════════════════════════════
      // SFA ↔ Marketing: Lead attribution by campaign
      // ═══════════════════════════════════════════
      case 'campaign-leads': {
        const { campaign_id } = req.query;
        let where = 'WHERE l.tenant_id = :tid AND l.campaign_id IS NOT NULL';
        const params2: any = { tid: tenantId };
        if (campaign_id) { where += ` AND l.campaign_id = :cid`; params2.cid = campaign_id; }

        const leads = await q(`
          SELECT
            c.id as campaign_id, c.name as campaign_name,
            COUNT(l.id) as total_leads,
            COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
            COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
            COALESCE(SUM(l.estimated_value), 0) as total_lead_value,
            COALESCE(AVG(l.score), 0) as avg_lead_score
          FROM sfa_leads l
          JOIN mkt_campaigns c ON l.campaign_id = c.id
          ${where}
          GROUP BY c.id, c.name
          ORDER BY total_leads DESC
        `, params2);
        return res.json({ success: true, data: leads });
      }

      // ═══════════════════════════════════════════
      // Cross-module dashboard summary
      // ═══════════════════════════════════════════
      case 'cross-summary': {
        const period3 = req.query.period || new Date().toISOString().slice(0, 7);
        const summary = await q(`
          SELECT
            (SELECT COUNT(*) FROM sfa_leads WHERE tenant_id = :tid AND TO_CHAR(created_at, 'YYYY-MM') = :period) as new_leads,
            (SELECT COUNT(*) FROM sfa_leads WHERE tenant_id = :tid AND status = 'converted' AND TO_CHAR(converted_at, 'YYYY-MM') = :period) as converted_leads,
            (SELECT COUNT(*) FROM sfa_visits WHERE tenant_id = :tid AND status = 'completed' AND TO_CHAR(visit_date, 'YYYY-MM') = :period) as completed_visits,
            (SELECT COALESCE(SUM(actual_value), 0) FROM sfa_opportunities WHERE tenant_id = :tid AND status = 'won' AND TO_CHAR(actual_close_date, 'YYYY-MM') = :period) as revenue_from_sfa,
            (SELECT COUNT(*) FROM mkt_campaigns WHERE tenant_id = :tid AND status = 'active') as active_campaigns,
            (SELECT COALESCE(SUM(actual_reach), 0) FROM mkt_campaigns WHERE tenant_id = :tid AND status = 'active') as total_reach,
            (SELECT COALESCE(SUM(actual_conversions), 0) FROM mkt_campaigns WHERE tenant_id = :tid AND status = 'active') as total_conversions,
            (SELECT COUNT(*) FROM mkt_promotion_usage pu JOIN mkt_promotions p ON pu.promotion_id = p.id WHERE p.tenant_id = :tid AND TO_CHAR(pu.created_at, 'YYYY-MM') = :period) as promo_redemptions,
            (SELECT COALESCE(SUM(pu.discount_applied), 0) FROM mkt_promotion_usage pu JOIN mkt_promotions p ON pu.promotion_id = p.id WHERE p.tenant_id = :tid AND TO_CHAR(pu.created_at, 'YYYY-MM') = :period) as promo_discount_total
        `, { tid: tenantId, period: period3 });
        return res.json({ success: true, data: summary[0] || {} });
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    console.error('Integration API error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
