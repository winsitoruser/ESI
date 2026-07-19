/**
 * Partner payout ledger (Wave-55 / CP-L4-1) — ops mark-paid + CSV.
 * Not Midtrans auto-disbursement (D-015 still: no automated transfer).
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensurePartnerPayoutsTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_partner_payouts (
      id UUID PRIMARY KEY,
      partner_code VARCHAR(32) NOT NULL,
      period_from DATE,
      period_to DATE,
      amount_idr BIGINT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      paid_at TIMESTAMPTZ,
      note TEXT,
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_partner_payouts_code
    ON saas_partner_payouts (partner_code, status, created_at DESC)
  `);
  ready = true;
}

export async function listPartnerPayouts(opts?: { partnerCode?: string; limit?: number }) {
  if (!sequelize) return [];
  await ensurePartnerPayoutsTable();
  const lim = Math.min(200, Math.max(1, Number(opts?.limit) || 50));
  const code = String(opts?.partnerCode || '').trim().toUpperCase();
  if (code) {
    const [rows] = await sequelize.query(
      `SELECT * FROM saas_partner_payouts
       WHERE UPPER(partner_code) = :code
       ORDER BY created_at DESC LIMIT :lim`,
      { replacements: { code, lim } },
    );
    return rows || [];
  }
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_partner_payouts ORDER BY created_at DESC LIMIT :lim`,
    { replacements: { lim } },
  );
  return rows || [];
}

export async function createPartnerPayoutDraft(opts: {
  partnerCode: string;
  amountIdr: number;
  periodFrom?: string | null;
  periodTo?: string | null;
  note?: string | null;
  createdBy?: string | null;
}) {
  if (!sequelize) throw new Error('DB unavailable');
  await ensurePartnerPayoutsTable();
  const id = crypto.randomUUID();
  const code = String(opts.partnerCode || '').trim().toUpperCase().slice(0, 32);
  if (!code) throw new Error('partnerCode required');
  const amount = Math.max(0, Math.round(Number(opts.amountIdr) || 0));
  await sequelize.query(
    `INSERT INTO saas_partner_payouts
      (id, partner_code, period_from, period_to, amount_idr, status, note, created_by)
     VALUES
      (:id, :code, :from, :to, :amount, 'draft', :note, :by)`,
    {
      replacements: {
        id,
        code,
        from: opts.periodFrom || null,
        to: opts.periodTo || null,
        amount,
        note: opts.note || null,
        by: opts.createdBy || null,
      },
    },
  );
  return { id, partnerCode: code, amountIdr: amount, status: 'draft' };
}

export async function markPartnerPayoutPaid(id: string, note?: string | null) {
  if (!sequelize) throw new Error('DB unavailable');
  await ensurePartnerPayoutsTable();
  const [rows] = await sequelize.query(
    `UPDATE saas_partner_payouts
     SET status = 'paid', paid_at = NOW(), updated_at = NOW(),
         note = COALESCE(:note, note)
     WHERE id = :id
     RETURNING *`,
    { replacements: { id, note: note || null } },
  );
  return rows?.[0] || null;
}

export function partnerPayoutsToCsv(rows: any[]): string {
  const header = 'id,partner_code,period_from,period_to,amount_idr,status,paid_at,note,created_at\n';
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = (rows || []).map((r) =>
    [
      r.id,
      r.partner_code,
      r.period_from,
      r.period_to,
      r.amount_idr,
      r.status,
      r.paid_at,
      r.note,
      r.created_at,
    ]
      .map(esc)
      .join(','),
  );
  return header + lines.join('\n') + (lines.length ? '\n' : '');
}
