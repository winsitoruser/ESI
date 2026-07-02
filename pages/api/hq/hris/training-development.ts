/**
 * HRIS Training & Development API
 * 
 * Comprehensive API for Training Development module:
 * - Curricula (kurikulum)
 * - Modules (modul pembelajaran)
 * - Batches (angkatan/batch)
 * - Schedules (jadwal)
 * - Exams (ujian)
 * - Exam Results (hasil ujian)
 * - Graduations (kelulusan)
 * - Placements (penempatan/penyaluran)
 * - Analytics & Dashboard
 * 
 * Supports general industry + outsourcing pipeline
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const sequelize = require('../../../../lib/sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId || null;
    const userId = (session.user as any).id || null;
    const { action } = req.query;
    const method = req.method;

    // ══════════════════════════════════════
    // GET endpoints
    // ══════════════════════════════════════
    if (method === 'GET') {

      // ── Dashboard Analytics ──
      if (action === 'dashboard') {
        const [curricula] = await sequelize.query(`
          SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE status='active')::int as active
          FROM hris_training_curricula WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } });
        const [batches] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status='in_progress')::int as active,
            COUNT(*) FILTER (WHERE status='completed')::int as completed,
            COUNT(*) FILTER (WHERE batch_type='outsourcing')::int as outsourcing
          FROM hris_training_batches WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } });
        const [grads] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE graduation_status='passed')::int as passed,
            COUNT(*) FILTER (WHERE graduation_status='failed')::int as failed,
            COUNT(*) FILTER (WHERE graduation_status='in_progress')::int as in_progress,
            COUNT(*) FILTER (WHERE ready_for_placement=true)::int as ready_placement
          FROM hris_training_graduations WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } });
        const [placements] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status='active')::int as active,
            COUNT(*) FILTER (WHERE status='pending')::int as pending,
            COUNT(*) FILTER (WHERE placement_type='outsourcing_deployment')::int as outsourcing
          FROM hris_training_placements WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } });
        const [exams] = await sequelize.query(`
          SELECT COUNT(*)::int as total,
            COALESCE(AVG(CASE WHEN is_passed=true THEN 1 ELSE 0 END)*100, 0)::decimal(5,2) as pass_rate,
            COALESCE(AVG(score), 0)::decimal(5,2) as avg_score
          FROM hris_training_exam_results WHERE tenant_id = :tid
        `, { replacements: { tid: tenantId } });

        return res.json({
          success: true,
          data: {
            curricula: curricula[0] || { total: 0, active: 0 },
            batches: batches[0] || { total: 0, active: 0, completed: 0, outsourcing: 0 },
            graduations: grads[0] || { total: 0, passed: 0, failed: 0, in_progress: 0, ready_placement: 0 },
            placements: placements[0] || { total: 0, active: 0, pending: 0, outsourcing: 0 },
            exams: exams[0] || { total: 0, pass_rate: 0, avg_score: 0 }
          }
        });
      }

      // ── Curricula ──
      if (action === 'curricula') {
        const { status, category, search } = req.query;
        let where = 'WHERE c.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (status) { where += ' AND c.status = :st'; repl.st = status; }
        if (category) { where += ' AND c.category = :cat'; repl.cat = category; }
        if (search) { where += ' AND (c.title ILIKE :q OR c.code ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`
          SELECT c.*, 
            (SELECT COUNT(*)::int FROM hris_training_modules m WHERE m.curriculum_id = c.id) as module_count,
            (SELECT COUNT(*)::int FROM hris_training_batches b WHERE b.curriculum_id = c.id) as batch_count
          FROM hris_training_curricula c ${where} ORDER BY c.created_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Modules ──
      if (action === 'modules') {
        const { curriculum_id } = req.query;
        let where = 'WHERE m.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (curriculum_id) { where += ' AND m.curriculum_id = :cid'; repl.cid = curriculum_id; }
        const [rows] = await sequelize.query(`
          SELECT m.*, c.title as curriculum_title
          FROM hris_training_modules m
          LEFT JOIN hris_training_curricula c ON m.curriculum_id = c.id
          ${where} ORDER BY m.order_index ASC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Batches ──
      if (action === 'batches') {
        const { status, batch_type, search } = req.query;
        let where = 'WHERE b.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (status) { where += ' AND b.status = :st'; repl.st = status; }
        if (batch_type) { where += ' AND b.batch_type = :bt'; repl.bt = batch_type; }
        if (search) { where += ' AND (b.batch_name ILIKE :q OR b.batch_code ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`
          SELECT b.*, c.title as curriculum_title, c.code as curriculum_code,
            (SELECT COUNT(*)::int FROM hris_training_graduations g WHERE g.batch_id = b.id) as participant_count,
            (SELECT COUNT(*)::int FROM hris_training_graduations g WHERE g.batch_id = b.id AND g.graduation_status='passed') as passed_count
          FROM hris_training_batches b
          LEFT JOIN hris_training_curricula c ON b.curriculum_id = c.id
          ${where} ORDER BY b.start_date DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Schedules ──
      if (action === 'schedules') {
        const { batch_id, date_from, date_to } = req.query;
        let where = 'WHERE s.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (batch_id) { where += ' AND s.batch_id = :bid'; repl.bid = batch_id; }
        if (date_from) { where += ' AND s.session_date >= :df'; repl.df = date_from; }
        if (date_to) { where += ' AND s.session_date <= :dt'; repl.dt = date_to; }
        const [rows] = await sequelize.query(`
          SELECT s.*, b.batch_name, b.batch_code, m.title as module_title
          FROM hris_training_schedules s
          LEFT JOIN hris_training_batches b ON s.batch_id = b.id
          LEFT JOIN hris_training_modules m ON s.module_id = m.id
          ${where} ORDER BY s.session_date ASC, s.start_time ASC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Exams ──
      if (action === 'exams') {
        const { curriculum_id, batch_id, status: examStatus } = req.query;
        let where = 'WHERE e.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (curriculum_id) { where += ' AND e.curriculum_id = :cid'; repl.cid = curriculum_id; }
        if (batch_id) { where += ' AND e.batch_id = :bid'; repl.bid = batch_id; }
        if (examStatus) { where += ' AND e.status = :st'; repl.st = examStatus; }
        const [rows] = await sequelize.query(`
          SELECT e.*, c.title as curriculum_title, m.title as module_title, b.batch_name,
            (SELECT COUNT(*)::int FROM hris_training_exam_results r WHERE r.exam_id = e.id) as total_participants,
            (SELECT COUNT(*)::int FROM hris_training_exam_results r WHERE r.exam_id = e.id AND r.is_passed=true) as passed_count,
            (SELECT COALESCE(AVG(r.score),0)::decimal(5,2) FROM hris_training_exam_results r WHERE r.exam_id = e.id) as avg_score
          FROM hris_training_exams e
          LEFT JOIN hris_training_curricula c ON e.curriculum_id = c.id
          LEFT JOIN hris_training_modules m ON e.module_id = m.id
          LEFT JOIN hris_training_batches b ON e.batch_id = b.id
          ${where} ORDER BY e.exam_date DESC NULLS LAST
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Exam Questions ──
      if (action === 'exam-questions') {
        const { exam_id } = req.query;
        if (!exam_id) return res.status(400).json({ error: 'exam_id required' });
        const [rows] = await sequelize.query(`
          SELECT * FROM hris_training_exam_questions WHERE exam_id = :eid ORDER BY question_number ASC
        `, { replacements: { eid: exam_id } });
        return res.json({ success: true, data: rows });
      }

      // ── Exam Results ──
      if (action === 'exam-results') {
        const { exam_id, batch_id, employee_id } = req.query;
        let where = 'WHERE r.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (exam_id) { where += ' AND r.exam_id = :eid'; repl.eid = exam_id; }
        if (batch_id) { where += ' AND r.batch_id = :bid'; repl.bid = batch_id; }
        if (employee_id) { where += ' AND r.employee_id = :empid'; repl.empid = employee_id; }
        const [rows] = await sequelize.query(`
          SELECT r.*, e.title as exam_title, e.passing_score, e.exam_type
          FROM hris_training_exam_results r
          LEFT JOIN hris_training_exams e ON r.exam_id = e.id
          ${where} ORDER BY r.submitted_at DESC NULLS LAST
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Graduations ──
      if (action === 'graduations') {
        const { batch_id, status: gradStatus, ready_for_placement } = req.query;
        let where = 'WHERE g.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (batch_id) { where += ' AND g.batch_id = :bid'; repl.bid = batch_id; }
        if (gradStatus) { where += ' AND g.graduation_status = :st'; repl.st = gradStatus; }
        if (ready_for_placement === 'true') { where += ' AND g.ready_for_placement = true'; }
        const [rows] = await sequelize.query(`
          SELECT g.*, b.batch_name, b.batch_code, b.batch_type, c.title as curriculum_title
          FROM hris_training_graduations g
          LEFT JOIN hris_training_batches b ON g.batch_id = b.id
          LEFT JOIN hris_training_curricula c ON g.curriculum_id = c.id
          ${where} ORDER BY g.final_score DESC NULLS LAST
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Placements ──
      if (action === 'placements') {
        const { status: plStatus, placement_type, batch_id, search } = req.query;
        let where = 'WHERE p.tenant_id = :tid';
        const repl: any = { tid: tenantId };
        if (plStatus) { where += ' AND p.status = :st'; repl.st = plStatus; }
        if (placement_type) { where += ' AND p.placement_type = :pt'; repl.pt = placement_type; }
        if (batch_id) { where += ' AND p.batch_id = :bid'; repl.bid = batch_id; }
        if (search) { where += ' AND (p.employee_name ILIKE :q OR p.client_company ILIKE :q OR p.position ILIKE :q)'; repl.q = `%${search}%`; }
        const [rows] = await sequelize.query(`
          SELECT p.*, b.batch_name, b.batch_code, g.graduation_status, g.final_score
          FROM hris_training_placements p
          LEFT JOIN hris_training_batches b ON p.batch_id = b.id
          LEFT JOIN hris_training_graduations g ON p.graduation_id = g.id
          ${where} ORDER BY p.created_at DESC
        `, { replacements: repl });
        return res.json({ success: true, data: rows });
      }

      // ── Pipeline Overview (Outsourcing) ──
      if (action === 'outsourcing-pipeline') {
        const [pipeline] = await sequelize.query(`
          SELECT 
            (SELECT COUNT(*)::int FROM hris_candidates WHERE tenant_id = :tid AND stage NOT IN ('rejected','withdrawn')) as recruiting,
            (SELECT COUNT(*)::int FROM hris_training_graduations g 
              JOIN hris_training_batches b ON g.batch_id = b.id
              WHERE g.tenant_id = :tid AND b.batch_type = 'outsourcing' AND g.graduation_status = 'in_progress') as in_training,
            (SELECT COUNT(*)::int FROM hris_training_graduations g 
              JOIN hris_training_batches b ON g.batch_id = b.id
              WHERE g.tenant_id = :tid AND b.batch_type = 'outsourcing' AND g.graduation_status = 'passed' AND g.ready_for_placement = true) as ready_deploy,
            (SELECT COUNT(*)::int FROM hris_training_placements 
              WHERE tenant_id = :tid AND placement_type = 'outsourcing_deployment' AND status = 'active') as deployed,
            (SELECT COUNT(*)::int FROM hris_training_placements 
              WHERE tenant_id = :tid AND placement_type = 'outsourcing_deployment' AND status = 'completed') as completed
        `, { replacements: { tid: tenantId } });
        return res.json({ success: true, data: pipeline[0] });
      }

      return res.status(400).json({ error: `Unknown GET action: ${action}` });
    }

    // ══════════════════════════════════════
    // POST endpoints
    // ══════════════════════════════════════
    if (method === 'POST') {
      const body = req.body;

      // ── Create Curriculum ──
      if (action === 'create-curriculum') {
        if (!body.title || !body.code) return res.status(400).json({ error: 'title and code are required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_curricula (tenant_id, code, title, description, category, target_audience, total_hours, total_modules, passing_score, status, version, created_by)
          VALUES (:tid, :code, :title, :desc, :cat, :target, :hours, :modules, :pass, :status, :ver, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, code: body.code, title: body.title, desc: body.description || '',
            cat: body.category || 'general', target: body.target_audience || 'existing_employee',
            hours: body.total_hours || 0, modules: body.total_modules || 0,
            pass: body.passing_score || 70, status: body.status || 'draft',
            ver: body.version || '1.0', uid: userId
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Create Module ──
      if (action === 'create-module') {
        if (!body.curriculum_id || !body.title) return res.status(400).json({ error: 'curriculum_id and title required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_modules (tenant_id, curriculum_id, code, title, description, order_index, duration_hours, module_type, delivery_method, materials, objectives, has_exam, passing_score, is_mandatory, status, created_by)
          VALUES (:tid, :cid, :code, :title, :desc, :idx, :hours, :type, :method, :mats::jsonb, :obj::jsonb, :hasExam, :pass, :mandatory, :status, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: body.curriculum_id, code: body.code || `MOD-${Date.now()}`,
            title: body.title, desc: body.description || '', idx: body.order_index || 0,
            hours: body.duration_hours || 1, type: body.module_type || 'lesson',
            method: body.delivery_method || 'classroom',
            mats: JSON.stringify(body.materials || []), obj: JSON.stringify(body.objectives || []),
            hasExam: body.has_exam || false, pass: body.passing_score || null,
            mandatory: body.is_mandatory !== false, status: body.status || 'active', uid: userId
          }
        });
        // Update curriculum module count
        await sequelize.query(`
          UPDATE hris_training_curricula SET total_modules = (SELECT COUNT(*) FROM hris_training_modules WHERE curriculum_id = :cid), updated_at = NOW()
          WHERE id = :cid
        `, { replacements: { cid: body.curriculum_id } });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Create Batch ──
      if (action === 'create-batch') {
        if (!body.curriculum_id || !body.batch_name) return res.status(400).json({ error: 'curriculum_id and batch_name required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_batches (tenant_id, curriculum_id, program_id, batch_code, batch_name, batch_type, start_date, end_date, max_participants, instructor, location, client_company, contract_id, status, created_by)
          VALUES (:tid, :cid, :pid, :code, :name, :type, :start, :end, :max, :instructor, :loc, :client, :contract, :status, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: body.curriculum_id, pid: body.program_id || null,
            code: body.batch_code || `BATCH-${Date.now()}`, name: body.batch_name,
            type: body.batch_type || 'regular', start: body.start_date, end: body.end_date,
            max: body.max_participants || 30, instructor: body.instructor || null,
            loc: body.location || null, client: body.client_company || null,
            contract: body.contract_id || null, status: body.status || 'planned', uid: userId
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Create Schedule ──
      if (action === 'create-schedule') {
        if (!body.batch_id || !body.session_title || !body.session_date) return res.status(400).json({ error: 'batch_id, session_title, session_date required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_schedules (tenant_id, batch_id, module_id, session_title, session_date, start_time, end_time, instructor, location, session_type, status, notes)
          VALUES (:tid, :bid, :mid, :title, :date, :start, :end, :instructor, :loc, :type, :status, :notes)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, bid: body.batch_id, mid: body.module_id || null,
            title: body.session_title, date: body.session_date,
            start: body.start_time || '08:00', end: body.end_time || '17:00',
            instructor: body.instructor || null, loc: body.location || null,
            type: body.session_type || 'class', status: body.status || 'scheduled',
            notes: body.notes || null
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Create Exam ──
      if (action === 'create-exam') {
        if (!body.title) return res.status(400).json({ error: 'title required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exams (tenant_id, curriculum_id, module_id, batch_id, title, description, exam_type, exam_scope, total_questions, total_score, passing_score, duration_minutes, exam_date, start_time, max_attempts, shuffle_questions, status, created_by)
          VALUES (:tid, :cid, :mid, :bid, :title, :desc, :type, :scope, :totalQ, :totalS, :pass, :dur, :date, :time, :attempts, :shuffle, :status, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, cid: body.curriculum_id || null, mid: body.module_id || null,
            bid: body.batch_id || null, title: body.title, desc: body.description || '',
            type: body.exam_type || 'written', scope: body.exam_scope || 'module',
            totalQ: body.total_questions || 0, totalS: body.total_score || 100,
            pass: body.passing_score || 70, dur: body.duration_minutes || 60,
            date: body.exam_date || null, time: body.start_time || null,
            attempts: body.max_attempts || 1, shuffle: body.shuffle_questions || false,
            status: body.status || 'draft', uid: userId
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Create Exam Question ──
      if (action === 'create-question') {
        if (!body.exam_id || !body.question_text) return res.status(400).json({ error: 'exam_id and question_text required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exam_questions (exam_id, question_number, question_text, question_type, options, correct_answer, score, explanation, difficulty)
          VALUES (:eid, :num, :text, :type, :opts::jsonb, :answer, :score, :expl, :diff)
          RETURNING *
        `, {
          replacements: {
            eid: body.exam_id, num: body.question_number || 1, text: body.question_text,
            type: body.question_type || 'multiple_choice',
            opts: JSON.stringify(body.options || []), answer: body.correct_answer || '',
            score: body.score || 1, expl: body.explanation || null,
            diff: body.difficulty || 'medium'
          }
        });
        // Update exam total_questions
        await sequelize.query(`
          UPDATE hris_training_exams SET total_questions = (SELECT COUNT(*) FROM hris_training_exam_questions WHERE exam_id = :eid), updated_at = NOW()
          WHERE id = :eid
        `, { replacements: { eid: body.exam_id } });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      // ── Submit Exam Result ──
      if (action === 'submit-result') {
        if (!body.exam_id || !body.employee_id) return res.status(400).json({ error: 'exam_id and employee_id required' });
        const [exam] = await sequelize.query('SELECT passing_score FROM hris_training_exams WHERE id = :eid', { replacements: { eid: body.exam_id } });
        const passingScore = exam[0]?.passing_score || 70;
        const isPassed = (body.score || 0) >= passingScore;
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_exam_results (tenant_id, exam_id, employee_id, employee_name, batch_id, attempt_number, score, total_correct, total_answered, is_passed, started_at, submitted_at, answers, feedback, status)
          VALUES (:tid, :eid, :empid, :name, :bid, :attempt, :score, :correct, :answered, :passed, :started, NOW(), :answers::jsonb, :feedback, 'submitted')
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, eid: body.exam_id, empid: body.employee_id,
            name: body.employee_name || null, bid: body.batch_id || null,
            attempt: body.attempt_number || 1, score: body.score || 0,
            correct: body.total_correct || 0, answered: body.total_answered || 0,
            passed: isPassed, started: body.started_at || null,
            answers: JSON.stringify(body.answers || []), feedback: body.feedback || null
          }
        });
        return res.status(201).json({ success: true, data: { ...rows[0], is_passed: isPassed } });
      }

      // ── Enroll to Batch (Create Graduation record) ──
      if (action === 'enroll-batch') {
        if (!body.batch_id || !body.employee_id) return res.status(400).json({ error: 'batch_id and employee_id required' });
        const [batch] = await sequelize.query('SELECT curriculum_id FROM hris_training_batches WHERE id = :bid', { replacements: { bid: body.batch_id } });
        if (!batch[0]) return res.status(404).json({ error: 'Batch not found' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_graduations (tenant_id, batch_id, employee_id, employee_name, curriculum_id, graduation_status, created_by)
          VALUES (:tid, :bid, :empid, :name, :cid, 'in_progress', :uid)
          ON CONFLICT (batch_id, employee_id) DO NOTHING
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, bid: body.batch_id, empid: body.employee_id,
            name: body.employee_name || null, cid: batch[0].curriculum_id, uid: userId
          }
        });
        // Update batch participant count
        await sequelize.query(`
          UPDATE hris_training_batches SET current_participants = (SELECT COUNT(*) FROM hris_training_graduations WHERE batch_id = :bid), updated_at = NOW()
          WHERE id = :bid
        `, { replacements: { bid: body.batch_id } });
        return res.status(201).json({ success: true, data: rows[0] || { message: 'Already enrolled' } });
      }

      // ── Create Placement ──
      if (action === 'create-placement') {
        if (!body.employee_id || !body.position) return res.status(400).json({ error: 'employee_id and position required' });
        const [rows] = await sequelize.query(`
          INSERT INTO hris_training_placements (tenant_id, graduation_id, employee_id, employee_name, batch_id, placement_type, target_branch_id, target_branch_name, client_company, client_site, position, department, start_date, end_date, contract_value, status, remarks, created_by)
          VALUES (:tid, :gid, :empid, :name, :bid, :type, :branch, :branchName, :client, :site, :position, :dept, :start, :end, :value, :status, :remarks, :uid)
          RETURNING *
        `, {
          replacements: {
            tid: tenantId, gid: body.graduation_id || null, empid: body.employee_id,
            name: body.employee_name || null, bid: body.batch_id || null,
            type: body.placement_type || 'internal', branch: body.target_branch_id || null,
            branchName: body.target_branch_name || null, client: body.client_company || null,
            site: body.client_site || null, position: body.position, dept: body.department || null,
            start: body.start_date || null, end: body.end_date || null,
            value: body.contract_value || null, status: body.status || 'pending',
            remarks: body.remarks || null, uid: userId
          }
        });
        return res.status(201).json({ success: true, data: rows[0] });
      }

      return res.status(400).json({ error: `Unknown POST action: ${action}` });
    }

    // ══════════════════════════════════════
    // PUT endpoints
    // ══════════════════════════════════════
    if (method === 'PUT') {
      const body = req.body;
      if (!body.id) return res.status(400).json({ error: 'id required' });

      if (action === 'update-curriculum') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_curricula SET
            title = COALESCE(:title, title), description = COALESCE(:desc, description),
            category = COALESCE(:cat, category), target_audience = COALESCE(:target, target_audience),
            total_hours = COALESCE(:hours, total_hours), passing_score = COALESCE(:pass, passing_score),
            status = COALESCE(:status, status), version = COALESCE(:ver, version),
            updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, title: body.title || null, desc: body.description || null,
            cat: body.category || null, target: body.target_audience || null,
            hours: body.total_hours ?? null, pass: body.passing_score ?? null,
            status: body.status || null, ver: body.version || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-module') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_modules SET
            title = COALESCE(:title, title), description = COALESCE(:desc, description),
            order_index = COALESCE(:idx, order_index), duration_hours = COALESCE(:hours, duration_hours),
            module_type = COALESCE(:type, module_type), delivery_method = COALESCE(:method, delivery_method),
            has_exam = COALESCE(:hasExam, has_exam), passing_score = COALESCE(:pass, passing_score),
            is_mandatory = COALESCE(:mandatory, is_mandatory), status = COALESCE(:status, status),
            updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, title: body.title || null, desc: body.description || null,
            idx: body.order_index ?? null, hours: body.duration_hours ?? null,
            type: body.module_type || null, method: body.delivery_method || null,
            hasExam: body.has_exam ?? null, pass: body.passing_score ?? null,
            mandatory: body.is_mandatory ?? null, status: body.status || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-batch') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_batches SET
            batch_name = COALESCE(:name, batch_name), status = COALESCE(:status, status),
            instructor = COALESCE(:instructor, instructor), location = COALESCE(:loc, location),
            client_company = COALESCE(:client, client_company), graduation_rate = COALESCE(:rate, graduation_rate),
            updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, name: body.batch_name || null,
            status: body.status || null, instructor: body.instructor || null,
            loc: body.location || null, client: body.client_company || null,
            rate: body.graduation_rate ?? null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-graduation') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_graduations SET
            final_score = COALESCE(:score, final_score), exam_score_avg = COALESCE(:examAvg, exam_score_avg),
            attendance_rate = COALESCE(:att, attendance_rate), practical_score = COALESCE(:pract, practical_score),
            graduation_status = COALESCE(:status, graduation_status), rank = COALESCE(:rank, rank),
            graduation_date = COALESCE(:date, graduation_date), certificate_number = COALESCE(:certNum, certificate_number),
            ready_for_placement = COALESCE(:ready, ready_for_placement), remarks = COALESCE(:remarks, remarks),
            updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, score: body.final_score ?? null,
            examAvg: body.exam_score_avg ?? null, att: body.attendance_rate ?? null,
            pract: body.practical_score ?? null, status: body.graduation_status || null,
            rank: body.rank ?? null, date: body.graduation_date || null,
            certNum: body.certificate_number || null, ready: body.ready_for_placement ?? null,
            remarks: body.remarks || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-placement') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_placements SET
            status = COALESCE(:status, status), position = COALESCE(:pos, position),
            department = COALESCE(:dept, department), client_company = COALESCE(:client, client_company),
            client_site = COALESCE(:site, client_site), start_date = COALESCE(:start, start_date),
            end_date = COALESCE(:end, end_date), contract_value = COALESCE(:value, contract_value),
            performance_rating = COALESCE(:rating, performance_rating), remarks = COALESCE(:remarks, remarks),
            updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, status: body.status || null, pos: body.position || null,
            dept: body.department || null, client: body.client_company || null,
            site: body.client_site || null, start: body.start_date || null,
            end: body.end_date || null, value: body.contract_value ?? null,
            rating: body.performance_rating ?? null, remarks: body.remarks || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-schedule') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_schedules SET
            session_title = COALESCE(:title, session_title), session_date = COALESCE(:date, session_date),
            start_time = COALESCE(:start, start_time), end_time = COALESCE(:end, end_time),
            instructor = COALESCE(:instructor, instructor), location = COALESCE(:loc, location),
            session_type = COALESCE(:type, session_type), status = COALESCE(:status, status),
            notes = COALESCE(:notes, notes), updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, title: body.session_title || null,
            date: body.session_date || null, start: body.start_time || null,
            end: body.end_time || null, instructor: body.instructor || null,
            loc: body.location || null, type: body.session_type || null,
            status: body.status || null, notes: body.notes || null
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      if (action === 'update-exam') {
        const [rows] = await sequelize.query(`
          UPDATE hris_training_exams SET
            title = COALESCE(:title, title), description = COALESCE(:desc, description),
            exam_type = COALESCE(:type, exam_type), passing_score = COALESCE(:pass, passing_score),
            duration_minutes = COALESCE(:dur, duration_minutes), exam_date = COALESCE(:date, exam_date),
            status = COALESCE(:status, status), updated_by = :uid, updated_at = NOW()
          WHERE id = :id AND tenant_id = :tid RETURNING *
        `, {
          replacements: {
            id: body.id, tid: tenantId, title: body.title || null, desc: body.description || null,
            type: body.exam_type || null, pass: body.passing_score ?? null,
            dur: body.duration_minutes ?? null, date: body.exam_date || null,
            status: body.status || null, uid: userId
          }
        });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        return res.json({ success: true, data: rows[0] });
      }

      return res.status(400).json({ error: `Unknown PUT action: ${action}` });
    }

    // ══════════════════════════════════════
    // DELETE endpoints
    // ══════════════════════════════════════
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      const tableMap: Record<string, string> = {
        'delete-curriculum': 'hris_training_curricula',
        'delete-module': 'hris_training_modules',
        'delete-batch': 'hris_training_batches',
        'delete-schedule': 'hris_training_schedules',
        'delete-exam': 'hris_training_exams',
        'delete-question': 'hris_training_exam_questions',
        'delete-result': 'hris_training_exam_results',
        'delete-graduation': 'hris_training_graduations',
        'delete-placement': 'hris_training_placements',
      };

      const table = tableMap[action as string];
      if (!table) return res.status(400).json({ error: `Unknown DELETE action: ${action}` });

      // For questions table, no tenant_id column
      if (table === 'hris_training_exam_questions') {
        await sequelize.query(`DELETE FROM ${table} WHERE id = :id`, { replacements: { id } });
      } else {
        await sequelize.query(`DELETE FROM ${table} WHERE id = :id AND tenant_id = :tid`, { replacements: { id, tid: tenantId } });
      }
      return res.json({ success: true, message: 'Deleted successfully' });
    }

    return res.status(405).json({ error: `Method ${method} not allowed` });
  } catch (error: any) {
    console.error('[training-development API]', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
