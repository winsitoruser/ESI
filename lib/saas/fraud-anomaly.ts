/**
 * Wave 12 — fraud / anomaly scoring (SEC-ABU-021 light)
 */
export type AnomalyInput = {
  massChangeCount?: number;
  rejectedApprovalsRecent?: number;
  abnormalExports?: number;
  attendanceRiskScore?: number;
  bankChangesPending?: number;
};

export function scoreFraudAnomaly(input: AnomalyInput): {
  score: number;
  level: 'low' | 'medium' | 'high';
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;
  if ((input.massChangeCount || 0) >= 10) {
    signals.push('mass_change');
    score += 30;
  }
  if ((input.rejectedApprovalsRecent || 0) >= 5) {
    signals.push('rejected_approvals');
    score += 20;
  }
  if ((input.abnormalExports || 0) >= 1) {
    signals.push('abnormal_export');
    score += 25;
  }
  if ((input.attendanceRiskScore || 0) >= 50) {
    signals.push('attendance_risk');
    score += 15;
  }
  if ((input.bankChangesPending || 0) >= 3) {
    signals.push('bank_change_burst');
    score += 25;
  }
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score, level, signals };
}
