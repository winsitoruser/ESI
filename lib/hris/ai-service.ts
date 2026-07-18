/**
 * Humanify AI Service — unified AI layer for HR modules.
 * Uses rule-based intelligence by default; optional LLM via SumoPod when configured.
 */
import { getSumopodConfig, sumopodChat } from './sumopod-config';

export type HRModule =
  | 'recruitment' | 'attendance' | 'kpi' | 'performance' | 'payroll'
  | 'reimbursement' | 'leave' | 'engagement' | 'workforce' | 'general';

export interface AIInsight {
  module: HRModule;
  title: string;
  summary: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actions: string[];
  metrics?: Record<string, number | string>;
}

export interface AIInsightRequest {
  module: HRModule;
  context: Record<string, unknown>;
}

const MODULE_PROMPTS: Record<HRModule, string> = {
  recruitment: 'Analisis pipeline rekrutmen, kualitas kandidat, dan time-to-hire',
  attendance: 'Analisis pola kehadiran, keterlambatan, dan risiko absensi',
  kpi: 'Evaluasi pencapaian KPI, gap target, dan rekomendasi coaching',
  performance: 'Review kinerja, talent mapping, dan rencana pengembangan',
  payroll: 'Analisis biaya tenaga kerja, lembur, dan efisiensi payroll',
  reimbursement: 'Review klaim, policy compliance, dan anomali pengeluaran',
  leave: 'Analisis pola cuti dan dampak operasional',
  engagement: 'Insight keterlibatan karyawan dan risiko turnover',
  workforce: 'Perencanaan SDM, headcount, dan produktivitas',
  general: 'Insight HR umum',
};

/** Rule-based insights — always available, no external API needed */
export function generateRuleBasedInsights(req: AIInsightRequest): AIInsight[] {
  const insights: AIInsight[] = [];
  const ctx = req.context;

  switch (req.module) {
    case 'recruitment': {
      const total = Number(ctx.totalCandidates || 0);
      const hired = Number(ctx.hired || 0);
      const open = Number(ctx.openPositions || 0);
      const rate = total > 0 ? Math.round((hired / total) * 100) : 0;
      insights.push({
        module: 'recruitment',
        title: rate < 10 && total > 20 ? 'Konversi kandidat rendah' : 'Pipeline rekrutmen aktif',
        summary: `${open} posisi terbuka, ${total} kandidat, ${hired} diterima (${rate}% acceptance). ${rate < 10 ? 'Pertimbangkan revisi job description atau kriteria screening.' : 'Pipeline sehat — lanjutkan proses seleksi.'}`,
        confidence: 85,
        priority: rate < 10 && total > 20 ? 'high' : 'medium',
        actions: rate < 10 ? ['Review kriteria screening', 'Jalankan AI screening batch', 'Perluas channel sourcing'] : ['Prioritaskan kandidat skor >70', 'Jadwalkan interview minggu ini'],
        metrics: { openPositions: open, totalCandidates: total, hired, acceptanceRate: rate },
      });
      break;
    }
    case 'attendance': {
      const rate = Number(ctx.attendanceRate || 0);
      const late = Number(ctx.lateRate || 0);
      insights.push({
        module: 'attendance',
        title: late > 15 ? 'Keterlambatan di atas ambang' : 'Kehadiran dalam batas normal',
        summary: `Tingkat kehadiran ${rate}%, keterlambatan ${late}%. ${late > 15 ? 'Departemen dengan telat tinggi perlu audit shift.' : 'Pola kehadiran stabil.'}`,
        confidence: 90,
        priority: late > 15 ? 'high' : 'low',
        actions: late > 15 ? ['Audit shift & geofence', 'Notifikasi ke manajer departemen'] : ['Pertahankan kebijakan absensi'],
        metrics: { attendanceRate: rate, lateRate: late },
      });
      break;
    }
    case 'kpi': {
      const avg = Number(ctx.avgAchievement || 0);
      const atRisk = Number(ctx.atRisk || 0);
      const offTrack = Number(ctx.offTrack || 0);
      insights.push({
        module: 'kpi',
        title: offTrack > 0 ? `${offTrack} karyawan off-track KPI` : 'KPI mayoritas on-track',
        summary: `Rata-rata pencapaian ${avg}%. ${atRisk} at risk, ${offTrack} off track. ${offTrack > 0 ? 'Segera lakukan check-in dengan manajer.' : 'Kinerja tim sesuai target.'}`,
        confidence: 88,
        priority: offTrack > 3 ? 'high' : atRisk > 5 ? 'medium' : 'low',
        actions: offTrack > 0 ? ['Coaching session minggu ini', 'Review target KPI periode berikutnya'] : ['Apresiasi top performers'],
        metrics: { avgAchievement: avg, atRisk, offTrack },
      });
      break;
    }
    case 'reimbursement': {
      const pending = Number(ctx.pending || 0);
      const pendingAmt = Number(ctx.pendingAmount || 0);
      insights.push({
        module: 'reimbursement',
        title: pending > 10 ? 'Backlog klaim tinggi' : 'Klaim reimbursement terkendali',
        summary: `${pending} klaim pending senilai Rp ${pendingAmt.toLocaleString('id-ID')}. ${pending > 10 ? 'SLA approval terlampaui — percepat review.' : 'Proses approval berjalan lancar.'}`,
        confidence: 92,
        priority: pending > 10 ? 'medium' : 'low',
        actions: pending > 10 ? ['Delegasi approval ke manajer', 'Set auto-reminder 48 jam'] : ['Proses klaim approved ke payroll'],
        metrics: { pending, pendingAmount: pendingAmt },
      });
      break;
    }
    case 'workforce': {
      const turnover = Number(ctx.turnoverRate || 0);
      const newHires = Number(ctx.newHires || 0);
      insights.push({
        module: 'workforce',
        title: turnover > 5 ? 'Turnover di atas rata-rata industri' : 'Turnover terkendali',
        summary: `Turnover ${turnover}% (30 hari), ${newHires} rekrutmen baru. ${turnover > 5 ? 'Aktifkan program retensi & exit interview.' : 'Stabilitas workforce baik.'}`,
        confidence: 80,
        priority: turnover > 8 ? 'critical' : turnover > 5 ? 'high' : 'low',
        actions: turnover > 5 ? ['Analisis exit interview', 'Review kompensasi benchmark'] : ['Lanjutkan workforce planning'],
        metrics: { turnoverRate: turnover, newHires },
      });
      break;
    }
    default:
      insights.push({
        module: req.module,
        title: 'Insight HR tersedia',
        summary: MODULE_PROMPTS[req.module] || 'Analisis modul HR',
        confidence: 70,
        priority: 'low',
        actions: ['Buka dashboard modul terkait'],
      });
  }

  return insights;
}

/** Optional LLM enhancement via SumoPod — graceful fallback to rule-based */
export async function generateAIInsights(req: AIInsightRequest): Promise<{
  insights: AIInsight[];
  source: 'rules' | 'llm' | 'hybrid';
}> {
  const ruleInsights = generateRuleBasedInsights(req);
  const cfg = getSumopodConfig();

  if (!cfg.llmEnabled) {
    return { insights: ruleInsights, source: 'rules' };
  }

  const llmText = await sumopodChat({
    system: `Anda adalah AI HR advisor untuk platform Humanify HRIS. ${MODULE_PROMPTS[req.module]}. Berikan 1 insight singkat dalam bahasa Indonesia, maksimal 2 kalimat.`,
    user: JSON.stringify(req.context),
    maxTokens: 200,
    model: cfg.chatModel,
    timeoutMs: 8000,
  });

  if (!llmText) return { insights: ruleInsights, source: 'rules' };

  const llmInsight: AIInsight = {
    module: req.module,
    title: 'AI Advisor (AIMAN)',
    summary: llmText,
    confidence: 75,
    priority: 'medium',
    actions: ['Review rekomendasi AI dengan tim HR'],
  };

  return { insights: [llmInsight, ...ruleInsights], source: 'hybrid' };
}

export function generateModuleInsightsBatch(
  modules: { module: HRModule; context: Record<string, unknown> }[],
): AIInsight[] {
  return modules.flatMap(m => generateRuleBasedInsights({ module: m.module, context: m.context }));
}

/** Batch insights with optional LLM enhancement for top-priority modules */
export async function generateModuleInsightsBatchAsync(
  modules: { module: HRModule; context: Record<string, unknown> }[],
): Promise<{ insights: AIInsight[]; source: 'rules' | 'llm' | 'hybrid' }> {
  const ruleInsights = generateModuleInsightsBatch(modules);
  const cfg = getSumopodConfig();

  if (!cfg.llmEnabled) {
    return { insights: ruleInsights, source: 'rules' };
  }

  const summaryContext = modules.map(m => ({ module: m.module, ...m.context }));
  const text = await sumopodChat({
    system: 'Anda AI HR advisor Humanify (AIMAN). Berikan 2 insight singkat bahasa Indonesia dari data HR berikut. Format: [MODUL] judul: ringkasan',
    user: JSON.stringify(summaryContext),
    maxTokens: 400,
    model: cfg.chatModel,
    timeoutMs: 10000,
  });

  if (!text) return { insights: ruleInsights, source: 'rules' };

  const llmInsight: AIInsight = {
    module: 'general',
    title: 'AI Executive Summary (AIMAN)',
    summary: text.split('\n').slice(0, 3).join(' '),
    confidence: 78,
    priority: 'medium',
    actions: ['Review insight dengan tim HR', 'Jalankan automation scan'],
  };

  return { insights: [llmInsight, ...ruleInsights], source: 'hybrid' };
}
