/**
 * Payroll frequency runs — daily, weekly, monthly
 */

export type PayrollFrequency = 'daily' | 'weekly' | 'monthly';

export interface FrequencyRunConfig {
  frequency: PayrollFrequency;
  periodStart: string;
  periodEnd: string;
  label: string;
  workingDays?: number;
  prorateFactor?: number;
}

export function getFrequencyPeriod(frequency: PayrollFrequency, referenceDate?: Date): FrequencyRunConfig {
  const ref = referenceDate || new Date();
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();

  if (frequency === 'daily') {
    const dateStr = ref.toISOString().slice(0, 10);
    return { frequency, periodStart: dateStr, periodEnd: dateStr, label: `Harian ${dateStr}`, workingDays: 1, prorateFactor: 1 / 22 };
  }

  if (frequency === 'weekly') {
    const dayOfWeek = ref.getDay();
    const monday = new Date(ref);
    monday.setDate(d - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      frequency,
      periodStart: monday.toISOString().slice(0, 10),
      periodEnd: sunday.toISOString().slice(0, 10),
      label: `Mingguan ${monday.toISOString().slice(0, 10)} s/d ${sunday.toISOString().slice(0, 10)}`,
      workingDays: 5,
      prorateFactor: 5 / 22,
    };
  }

  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
  return {
    frequency,
    periodStart: start,
    periodEnd: end,
    label: `Bulanan ${start} s/d ${end}`,
    workingDays: 22,
    prorateFactor: 1,
  };
}

export function prorateSalary(baseSalary: number, config: FrequencyRunConfig): number {
  return Math.round(baseSalary * (config.prorateFactor ?? 1));
}

export function generateRunCode(frequency: PayrollFrequency, ref?: Date): string {
  const cfg = getFrequencyPeriod(frequency, ref);
  const prefix = frequency === 'daily' ? 'PAY-D' : frequency === 'weekly' ? 'PAY-W' : 'PAY-M';
  return `${prefix}-${cfg.periodStart.replace(/-/g, '')}`;
}

export function getFrequencyOptions() {
  return [
    { value: 'daily' as PayrollFrequency, label: 'Harian', desc: 'Untuk tenaga harian & borongan' },
    { value: 'weekly' as PayrollFrequency, label: 'Mingguan', desc: 'Payroll mingguan (5 hari kerja)' },
    { value: 'monthly' as PayrollFrequency, label: 'Bulanan', desc: 'Payroll reguler karyawan tetap' },
  ];
}
