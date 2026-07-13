/**
 * ZKTeco attendance device adapter — pull attendance logs.
 * Production: set ZKTECO_API_URL or device ipAddress + port (TCP bridge on VPS).
 * Dev/simulate: ZKTECO_SIMULATE=true generates sample punches from recent employees.
 */

export interface ZktecoDeviceConfig {
  id: string;
  ipAddress?: string | null;
  port?: number | null;
  serialNumber?: string | null;
  communicationKey?: string | null;
  tenantId?: string | null;
}

export interface ZktecoPunchRecord {
  userId: string;
  userName?: string;
  punchTime: string;
  punchType?: string;
  verifyMode?: string;
}

export interface ZktecoPullResult {
  records: ZktecoPunchRecord[];
  source: 'device' | 'simulate' | 'empty';
  message: string;
}

export async function pullZktecoAttendance(
  device: ZktecoDeviceConfig,
  sequelize?: any,
): Promise<ZktecoPullResult> {
  const simulate = process.env.ZKTECO_SIMULATE === 'true' || process.env.NODE_ENV !== 'production';

  if (device.ipAddress && process.env.ZKTECO_API_URL) {
    try {
      const url = `${process.env.ZKTECO_API_URL.replace(/\/$/, '')}/attendance`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: device.ipAddress,
          port: device.port || 4370,
          sn: device.serialNumber,
          key: device.communicationKey,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const records = (json.records || json.data || []) as ZktecoPunchRecord[];
        return { records, source: 'device', message: `Pulled ${records.length} records from ZKTeco bridge` };
      }
    } catch (e: any) {
      if (!simulate) {
        return { records: [], source: 'empty', message: e.message || 'ZKTeco bridge unreachable' };
      }
    }
  }

  if (!simulate || !sequelize) {
    return {
      records: [],
      source: 'empty',
      message: 'Konfigurasi ZKTECO_API_URL atau ZKTECO_SIMULATE=true diperlukan',
    };
  }

  const [emps] = await sequelize.query(`
    SELECT id, employee_id, name FROM employees
    WHERE is_active = true
    ORDER BY RANDOM() LIMIT 5
  `);
  const now = Date.now();
  const records: ZktecoPunchRecord[] = [];
  for (const e of emps as any[]) {
    const pin = e.employee_id || String(e.id);
    const morning = new Date(now);
    morning.setHours(8, 5 + Math.floor(Math.random() * 20), 0, 0);
    records.push({
      userId: pin,
      userName: e.name,
      punchTime: morning.toISOString(),
      punchType: 'check_in',
      verifyMode: 'fingerprint',
    });
    const evening = new Date(now);
    evening.setHours(17, Math.floor(Math.random() * 30), 0, 0);
    records.push({
      userId: pin,
      userName: e.name,
      punchTime: evening.toISOString(),
      punchType: 'check_out',
      verifyMode: 'fingerprint',
    });
  }

  return {
    records,
    source: 'simulate',
    message: `Simulasi ZKTeco: ${records.length} punch dari ${(emps as any[]).length} karyawan`,
  };
}
