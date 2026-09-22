/**
 * Humanify Talent Bank + Talent Intelligence API
 * Feature gate: talent_bank (paid add-on) via enforceHumanifyPlanFeature
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { enforceHumanifyPlanFeature } from '@/lib/saas/assert-feature';
import {
  addTalentInteraction,
  createSelfUpdateToken,
  deleteTalentProfile,
  getTalentBankStats,
  getTalentProfile,
  listTalentEvidence,
  listTalentInteractions,
  listTalentProfiles,
  parseTalentFromText,
  syncCandidatesIntoTalentBank,
  upsertTalentProfile,
} from '@/lib/hris/talent-bank';
import {
  matchTalentToRole,
  parseRoleBlueprint,
  rankTalentMatches,
  setRequirementPriority,
  simulateTalentMarket,
  suggestSmartRelaxation,
} from '@/lib/hris/talent-matching';
import {
  analyzeBuildVsBuy,
  analyzeTeamCapability,
  listInternalTalentProfiles,
  rankUnifiedTalent,
} from '@/lib/hris/talent-workforce';
import {
  applyDnaToBlueprint,
  buildCompanyTalentDna,
  buildHirePerformanceLoop,
  buildSuccessionPlans,
  buildTalentMarketBenchmark,
  getTalentIntelligencePhase4,
} from '@/lib/hris/talent-dna';
import { listRecruitmentMemory, runAnalystTurn } from '@/lib/hris/talent-analyst';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!(await enforceHumanifyPlanFeature(req, res, session))) return;

    const tenantId = tenantIdFromSession(session) || (session.user as any).tenantId || null;
    if (!tenantId) {
      return res.status(403).json({ success: false, error: 'NO_TENANT', message: 'Tenant tidak terikat pada sesi' });
    }

    const action = String(req.query.action || req.body?.action || 'list');

    if (req.method === 'GET') {
        if (action === 'stats') {
          const data = await getTalentBankStats(tenantId);
          return res.json({ success: true, data });
        }
        if (action === 'get') {
          const id = String(req.query.id || '');
          if (!id) return res.status(400).json({ success: false, error: 'id required' });
          const profile = await getTalentProfile(tenantId, id);
          if (!profile) return res.status(404).json({ success: false, error: 'Not found' });
          const [evidence, history] = await Promise.all([
            listTalentEvidence(tenantId, id),
            listTalentInteractions(tenantId, id),
          ]);
          return res.json({ success: true, data: { profile, evidence, history } });
        }
        if (action === 'search' || action === 'list') {
          try {
            const { assertSearchScrapeLimit } = await import('@/lib/saas/otp-abuse');
            const lim = await assertSearchScrapeLimit({
              tenantId: String(tenantId),
              userId: String(session.user.id),
              surface: 'talent_bank',
            });
            if (!lim.allowed) {
              return res.status(429).json({
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Terlalu banyak pencarian Talent Bank',
                retryAfter: lim.retryAfterSec,
              });
            }
          } catch { /* fail-open */ }
          const q = String(req.query.q || '');
          const intent = req.query.intent ? String(req.query.intent) : undefined;
          const location = req.query.location ? String(req.query.location) : undefined;
          const data = await listTalentProfiles(tenantId, {
            q: q || undefined,
            intent,
            location,
            limit: Number(req.query.limit || 50),
            offset: Number(req.query.offset || 0),
          });
          return res.json({ success: true, data });
        }
        if (action === 'blueprint') {
          const q = String(req.query.q || '');
          if (!q) return res.status(400).json({ success: false, error: 'q required' });
          return res.json({ success: true, data: parseRoleBlueprint(q) });
        }
        if (action === 'workforce' || action === 'team-capability') {
          const q = String(req.query.q || '');
          const blueprint = q ? parseRoleBlueprint(q) : null;
          const data = await analyzeTeamCapability(tenantId, blueprint);
          const internal = await listInternalTalentProfiles(tenantId, { includeAlumni: true, limit: 50 });
          return res.json({
            success: true,
            data: {
              ...data,
              internalPreview: internal.slice(0, 20).map((p) => ({
                id: p.id,
                fullName: p.fullName,
                title: p.currentTitle,
                department: p.metadata?.department,
                skills: p.skills.slice(0, 6),
                sourceKind: p.metadata?.sourceKind || 'employee',
              })),
            },
          });
        }
        if (action === 'dna' || action === 'phase4' || action === 'intelligence') {
          const q = req.query.q ? String(req.query.q) : undefined;
          const data = await getTalentIntelligencePhase4(tenantId, q);
          return res.json({ success: true, data });
        }
        if (action === 'succession') {
          const q = req.query.q ? String(req.query.q) : undefined;
          const data = await buildSuccessionPlans(tenantId, { roleQuery: q });
          return res.json({ success: true, data });
        }
        if (action === 'hire-loop') {
          const data = await buildHirePerformanceLoop(tenantId);
          return res.json({ success: true, data });
        }
        if (action === 'benchmark') {
          const q = req.query.q ? String(req.query.q) : undefined;
          const data = await buildTalentMarketBenchmark(tenantId, q);
          return res.json({ success: true, data });
        }
        if (action === 'memory' || action === 'recruitment-memory') {
          const profileId = req.query.profileId ? String(req.query.profileId) : undefined;
          const data = await listRecruitmentMemory(tenantId, {
            profileId,
            limit: Number(req.query.limit || 40),
          });
          return res.json({ success: true, data });
        }
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }

      if (req.method === 'POST') {
        if (action === 'parse-cv' || action === 'parse') {
          const text = String(req.body?.text || req.body?.resumeText || '');
          if (!text.trim()) return res.status(400).json({ success: false, error: 'text required' });
          const parsed = parseTalentFromText({
            text,
            fullName: req.body?.fullName,
            email: req.body?.email,
            phone: req.body?.phone,
          });
          return res.json({ success: true, data: parsed });
        }

        if (action === 'create' || action === 'upsert') {
          const body = req.body || {};
          let evidence = body.evidence;
          let payload = { ...body };
          if (body.resumeText && !(body.skills && body.skills.length)) {
            const parsed = parseTalentFromText({
              text: body.resumeText,
              fullName: body.fullName,
              email: body.email,
              phone: body.phone,
            });
            payload = {
              ...parsed,
              ...body,
              skills: body.skills?.length ? body.skills : parsed.skills,
              industries: body.industries?.length ? body.industries : parsed.industries,
            };
            evidence = evidence || parsed.evidence;
          }
          if (!payload.fullName) {
            return res.status(400).json({ success: false, error: 'fullName required' });
          }
          const profile = await upsertTalentProfile(tenantId, payload, { evidence });
          if (action === 'create') {
            await addTalentInteraction(tenantId, {
              profileId: profile.id,
              kind: 'profile_created',
              title: 'Profil ditambahkan ke Bank Data',
              detail: payload.source || 'manual',
            });
          }
          return res.json({ success: true, data: profile });
        }

        if (action === 'match' || action === 'search-nl') {
          const query = String(req.body?.query || req.body?.q || '');
          if (!query.trim()) return res.status(400).json({ success: false, error: 'query required' });
          let blueprint = parseRoleBlueprint(query);
          if (Array.isArray(req.body?.requirements) && req.body.requirements.length) {
            blueprint = { ...blueprint, requirements: req.body.requirements };
          }
          if (req.body?.priorityOverrides && typeof req.body.priorityOverrides === 'object') {
            for (const [key, priority] of Object.entries(req.body.priorityOverrides)) {
              blueprint = setRequirementPriority(blueprint, key, priority as any);
            }
          }
          if (req.body?.applyDna) {
            const dnaPack = await buildCompanyTalentDna(tenantId, { roleQuery: query });
            const dnaRole = dnaPack.roles[0] || null;
            blueprint = applyDnaToBlueprint(blueprint, dnaRole);
          }
          const scope = String(req.body?.scope || 'all'); // external | internal | all
          const { items: external } = await listTalentProfiles(tenantId, { limit: 200 });
          const internal = await listInternalTalentProfiles(tenantId, { includeAlumni: true, limit: 200 });
          const pool = scope === 'internal'
            ? internal
            : scope === 'external'
              ? external
              : [...external, ...internal];

          const matches = scope === 'external'
            ? rankTalentMatches(pool, blueprint, Number(req.body?.limit || 25))
            : rankUnifiedTalent(pool, blueprint, Number(req.body?.limit || 25));
          const market = simulateTalentMarket(external, blueprint);
          const relaxation = suggestSmartRelaxation(external, blueprint);
          const buildBuy = analyzeBuildVsBuy(external, internal, blueprint);
          return res.json({
            success: true,
            data: {
              blueprint,
              matches,
              market,
              relaxation,
              buildBuy,
              scope,
              poolCounts: { external: external.length, internal: internal.length },
            },
          });
        }

        if (action === 'dna' || action === 'phase4' || action === 'intelligence') {
          const q = req.body?.query || req.body?.q || req.query.q;
          const data = await getTalentIntelligencePhase4(tenantId, q ? String(q) : undefined);
          return res.json({ success: true, data });
        }

        if (action === 'succession') {
          const q = req.body?.query || req.body?.q;
          const data = await buildSuccessionPlans(tenantId, { roleQuery: q ? String(q) : undefined });
          return res.json({ success: true, data });
        }

        if (action === 'hire-loop') {
          const data = await buildHirePerformanceLoop(tenantId);
          return res.json({ success: true, data });
        }

        if (action === 'benchmark') {
          const q = req.body?.query || req.body?.q;
          const data = await buildTalentMarketBenchmark(tenantId, q ? String(q) : undefined);
          return res.json({ success: true, data });
        }

        if (action === 'analyst' || action === 'refine' || action === 'chat') {
          const utterance = String(req.body?.message || req.body?.query || req.body?.q || '').trim();
          if (!utterance) return res.status(400).json({ success: false, error: 'message required' });
          const scope = String(req.body?.scope || 'all') as 'all' | 'external' | 'internal';
          const { items: external } = await listTalentProfiles(tenantId, { limit: 200 });
          const internal = await listInternalTalentProfiles(tenantId, { includeAlumni: true, limit: 200 });
          const pool = scope === 'internal'
            ? internal
            : scope === 'external'
              ? external
              : [...external, ...internal];
          const turn = runAnalystTurn({
            utterance,
            blueprint: req.body?.blueprint || null,
            messages: Array.isArray(req.body?.messages) ? req.body.messages : [],
            profiles: pool,
            scope,
            limit: Number(req.body?.limit || 15),
          });
          return res.json({
            success: true,
            data: {
              ...turn,
              poolCounts: { external: external.length, internal: internal.length },
              scope,
            },
          });
        }

        if (action === 'memory' || action === 'recruitment-memory') {
          const data = await listRecruitmentMemory(tenantId, {
            profileId: req.body?.profileId ? String(req.body.profileId) : undefined,
            limit: Number(req.body?.limit || 40),
          });
          return res.json({ success: true, data });
        }

        if (action === 'build-buy') {
          const query = String(req.body?.query || req.body?.q || '');
          if (!query.trim()) return res.status(400).json({ success: false, error: 'query required' });
          let blueprint = parseRoleBlueprint(query);
          if (req.body?.priorityOverrides && typeof req.body.priorityOverrides === 'object') {
            for (const [key, priority] of Object.entries(req.body.priorityOverrides)) {
              blueprint = setRequirementPriority(blueprint, key, priority as any);
            }
          }
          const { items: external } = await listTalentProfiles(tenantId, { limit: 200 });
          const internal = await listInternalTalentProfiles(tenantId, { includeAlumni: true, limit: 200 });
          const buildBuy = analyzeBuildVsBuy(external, internal, blueprint);
          const market = simulateTalentMarket(external, blueprint);
          return res.json({ success: true, data: { blueprint, buildBuy, market } });
        }

        if (action === 'workforce' || action === 'team-capability') {
          const query = String(req.body?.query || req.query.q || '');
          const blueprint = query ? parseRoleBlueprint(query) : null;
          const data = await analyzeTeamCapability(tenantId, blueprint);
          const internal = await listInternalTalentProfiles(tenantId, { includeAlumni: true, limit: 50 });
          return res.json({
            success: true,
            data: {
              ...data,
              internalPreview: internal.slice(0, 20).map((p) => ({
                id: p.id,
                fullName: p.fullName,
                title: p.currentTitle,
                department: p.metadata?.department,
                skills: p.skills.slice(0, 6),
                sourceKind: p.metadata?.sourceKind || 'employee',
              })),
            },
          });
        }

        if (action === 'invite-self-update') {
          const profileId = String(req.body?.profileId || '');
          if (!profileId) return res.status(400).json({ success: false, error: 'profileId required' });
          const link = await createSelfUpdateToken(tenantId, profileId, Number(req.body?.ttlHours || 72));
          await addTalentInteraction(tenantId, {
            profileId,
            kind: 'invite_self_update',
            title: 'Undangan self-update dikirim',
            detail: `Berlaku hingga ${link.expiresAt}`,
          });
          const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
          return res.json({
            success: true,
            data: { ...link, url: `${origin}${link.urlPath}` },
          });
        }

        if (action === 'match-profile') {
          const profileId = String(req.body?.profileId || '');
          const query = String(req.body?.query || '');
          if (!profileId || !query) {
            return res.status(400).json({ success: false, error: 'profileId and query required' });
          }
          const profile = await getTalentProfile(tenantId, profileId);
          if (!profile) return res.status(404).json({ success: false, error: 'Not found' });
          const blueprint = parseRoleBlueprint(query);
          const match = matchTalentToRole(profile, blueprint);
          const evidence = await listTalentEvidence(tenantId, profileId);
          return res.json({ success: true, data: { match, blueprint, evidence } });
        }

        if (action === 'rediscover' || action === 'sync-ats') {
          const result = await syncCandidatesIntoTalentBank(tenantId);
          const stats = await getTalentBankStats(tenantId);
          return res.json({ success: true, data: { ...result, stats } });
        }

        if (action === 'add-interaction') {
          const profileId = String(req.body?.profileId || '');
          if (!profileId) return res.status(400).json({ success: false, error: 'profileId required' });
          const item = await addTalentInteraction(tenantId, {
            profileId,
            kind: String(req.body?.kind || 'note'),
            title: req.body?.title,
            detail: req.body?.detail,
            openingId: req.body?.openingId,
            candidateId: req.body?.candidateId,
          });
          return res.json({ success: true, data: item });
        }

        if (action === 'push-to-ats') {
          const profileId = String(req.body?.profileId || '');
          const openingId = req.body?.openingId ? String(req.body.openingId) : null;
          if (!profileId) return res.status(400).json({ success: false, error: 'profileId required' });
          const profile = await getTalentProfile(tenantId, profileId);
          if (!profile) return res.status(404).json({ success: false, error: 'Not found' });

          // Push requires ATS entitlement
          const { assertHumanifyFeature } = await import('@/lib/saas/assert-feature');
          if (!(await assertHumanifyFeature(req, res, {
            tenantId,
            role: (session.user as any).role,
            feature: 'recruitment',
          }))) return;

          let sequelize: any;
          try { sequelize = require('@/lib/sequelize'); } catch {}
          if (!sequelize) return res.status(503).json({ success: false, error: 'Database unavailable' });

          const { randomUUID } = await import('crypto');
          const candidateId = randomUUID();
          try {
            await sequelize.query(
              `INSERT INTO hris_candidates (
                id, tenant_id, job_opening_id, full_name, email, phone, current_stage, status,
                source, experience_summary, education_level, resume_url, notes, metadata, created_at, updated_at
              ) VALUES (
                :id, :tenantId, :openingId, :fullName, :email, :phone, 'applied', 'active',
                'talent_bank', :experience, :education, :resumeUrl, :notes, CAST(:metadata AS jsonb), NOW(), NOW()
              )`,
              {
                replacements: {
                  id: candidateId,
                  tenantId,
                  openingId,
                  fullName: profile.fullName,
                  email: profile.email,
                  phone: profile.phone,
                  experience: [
                    profile.headline,
                    profile.currentTitle && profile.currentCompany
                      ? `${profile.currentTitle} @ ${profile.currentCompany}`
                      : profile.currentTitle,
                    profile.experienceYears != null ? `${profile.experienceYears} tahun` : null,
                    profile.skills.join(', '),
                  ].filter(Boolean).join('\n'),
                  education: profile.educationLevel,
                  resumeUrl: profile.resumeUrl,
                  notes: 'Pushed from Talent Bank',
                  metadata: JSON.stringify({
                    talentProfileId: profile.id,
                    salaryExpectedMin: profile.salaryExpectedMin,
                    salaryExpectedMax: profile.salaryExpectedMax,
                    intent: profile.intent,
                  }),
                },
              },
            );
          } catch (e: any) {
            return res.status(500).json({
              success: false,
              error: e?.message || 'Gagal membuat kandidat ATS',
            });
          }

          await addTalentInteraction(tenantId, {
            profileId,
            kind: 'pushed_to_ats',
            title: 'Dimasukkan ke pipeline ATS',
            detail: openingId ? `Opening ${openingId}` : 'Tanpa lowongan spesifik',
            openingId: openingId || undefined,
            candidateId,
          });

          return res.json({ success: true, data: { candidateId, profileId, openingId } });
        }

        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }

      if (req.method === 'DELETE') {
        const id = String(req.query.id || req.body?.id || '');
        if (!id) return res.status(400).json({ success: false, error: 'id required' });
        const ok = await deleteTalentProfile(tenantId, id);
        return res.json({ success: ok });
      }

      return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[talent-bank]', e);
    return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
