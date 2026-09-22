/**
 * SEC-IAM-018 — lightweight risk-based auth signals.
 * Fail-open: scoring errors never block login.
 */
import type { NextApiRequest } from 'next';

export type RiskSignal =
  | 'new_ip'
  | 'new_ua'
  | 'automation_ua'
  | 'privileged_role'
  | 'tor_like_ua';

export type RiskAssessment = {
  score: number;
  signals: RiskSignal[];
  requireMfaChallenge: boolean;
};

const AUTOMATION_UA = /bot|crawler|curl|wget|python-requests|httpclient|scrapy|phantom|headless/i;

export function clientIpFromReq(req: NextApiRequest | { headers?: any } | null | undefined): string {
  const h = (req as any)?.headers || {};
  const xf = String(h['x-forwarded-for'] || h['x-real-ip'] || '').split(',')[0].trim();
  return xf || 'unknown';
}

export function clientUaFromReq(req: NextApiRequest | { headers?: any } | null | undefined): string {
  const h = (req as any)?.headers || {};
  return String(h['user-agent'] || '').slice(0, 240);
}

export function assessLoginRisk(opts: {
  role?: string | null;
  currentIp?: string | null;
  previousIp?: string | null;
  currentUa?: string | null;
  previousUa?: string | null;
}): RiskAssessment {
  const signals: RiskSignal[] = [];
  let score = 0;

  const role = String(opts.role || '').toLowerCase();
  if (['super_admin', 'superadmin', 'platform_admin', 'owner', 'hq_admin'].includes(role)) {
    signals.push('privileged_role');
    score += 15;
  }

  const curIp = String(opts.currentIp || '').trim();
  const prevIp = String(opts.previousIp || '').trim();
  if (prevIp && curIp && prevIp !== 'unknown' && curIp !== 'unknown' && prevIp !== curIp) {
    signals.push('new_ip');
    score += 40;
  }

  const curUa = String(opts.currentUa || '').trim();
  const prevUa = String(opts.previousUa || '').trim();
  if (prevUa && curUa && prevUa !== curUa) {
    signals.push('new_ua');
    score += 20;
  }

  if (curUa && AUTOMATION_UA.test(curUa)) {
    signals.push('automation_ua');
    score += 50;
  }

  const threshold = Number(process.env.HUMANIFY_LOGIN_RISK_MFA_THRESHOLD || 50);
  const requireMfaChallenge = score >= (Number.isFinite(threshold) ? threshold : 50);

  return { score, signals, requireMfaChallenge };
}

/** Persist last login IP/UA for next comparison (best-effort). */
export async function rememberLoginFingerprint(opts: {
  userId: string;
  ip: string;
  ua: string;
}): Promise<void> {
  let sequelize: any;
  try { sequelize = require('../sequelize'); } catch { return; }
  if (!sequelize) return;
  try {
    await sequelize.query(`
      UPDATE users
      SET last_login_ip = :ip,
          last_login_ua = :ua,
          last_login_at = NOW()
      WHERE id = :id
    `, {
      replacements: {
        id: opts.userId,
        ip: String(opts.ip || '').slice(0, 64),
        ua: String(opts.ua || '').slice(0, 255),
      },
    });
  } catch {
    /* fail-open — columns may be missing on legacy DBs */
  }
}

export async function loadLoginFingerprint(userId: string): Promise<{ ip: string | null; ua: string | null }> {
  let sequelize: any;
  try { sequelize = require('../sequelize'); } catch { return { ip: null, ua: null }; }
  if (!sequelize) return { ip: null, ua: null };
  try {
    const [rows] = await sequelize.query(`
      SELECT last_login_ip, last_login_ua FROM users WHERE id = :id LIMIT 1
    `, { replacements: { id: userId } });
    const r = rows?.[0];
    return {
      ip: r?.last_login_ip || null,
      ua: r?.last_login_ua || null,
    };
  } catch {
    return { ip: null, ua: null };
  }
}
