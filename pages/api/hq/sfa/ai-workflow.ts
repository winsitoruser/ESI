import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { callAI, fillTemplate } from '../../../../lib/ai/provider';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

async function q(sql: string, replacements?: any): Promise<any[]> {
  if (!sequelize) return [];
  try {
    const [rows] = await sequelize.query(sql, replacements ? { replacements } : undefined);
    return rows || [];
  } catch (e: any) { console.error('AI Workflow Q:', e.message); return []; }
}
async function qOne(sql: string, replacements?: any): Promise<any> {
  const rows = await q(sql, replacements); return rows[0] || null;
}
async function qExec(sql: string, replacements?: any): Promise<boolean> {
  if (!sequelize) return false;
  try { await sequelize.query(sql, replacements ? { replacements } : undefined); return true; }
  catch (e: any) { console.error('AI Workflow Exec:', e.message); return false; }
}

// ════════════════════════════════════════════════════════════
// Built-in workflow templates for CRM/SFA
// ════════════════════════════════════════════════════════════
const WORKFLOW_TEMPLATES = [
  {
    code: 'lead_scoring', name: 'Lead Scoring AI', category: 'lead_scoring', module: 'sfa',
    description: 'Analisis dan scoring lead berdasarkan data historis, aktivitas, dan profil perusahaan',
    system_prompt: 'You are a sales intelligence AI. Analyze the provided lead data and return a score from 0-100 with reasoning. Consider: company size, industry fit, engagement level, budget signals, decision-maker involvement, and timeline urgency.',
    user_prompt_template: 'Score this lead:\n\nCompany: {{company_name}}\nContact: {{contact_name}} ({{contact_title}})\nSource: {{source}}\nIndustry: {{industry}}\nEstimated Value: {{expected_value}}\nActivities: {{activity_count}} interactions\nLast Contact: {{last_contact_date}}\nNotes: {{notes}}\n\nReturn JSON: { "score": number, "grade": "A"|"B"|"C"|"D", "reasoning": string, "next_actions": string[] }',
  },
  {
    code: 'customer_segmentation', name: 'Customer Segmentation', category: 'segmentation', module: 'crm',
    description: 'Segmentasi customer otomatis berdasarkan behavior, nilai transaksi, dan engagement',
    system_prompt: 'You are a CRM analytics AI. Analyze customer data and assign appropriate segments. Consider RFM (Recency, Frequency, Monetary) analysis, lifecycle stage, engagement patterns, and growth potential.',
    user_prompt_template: 'Segment this customer:\n\nName: {{name}}\nType: {{customer_type}}\nLifecycle: {{lifecycle_stage}}\nTotal Revenue: {{total_revenue}}\nTransaction Count: {{transaction_count}}\nLast Purchase: {{last_purchase}}\nHealth Score: {{health_score}}\nInteraction Count: {{interaction_count}}\n\nReturn JSON: { "segment": string, "rfm_score": string, "churn_risk": "low"|"medium"|"high", "upsell_potential": number, "recommended_actions": string[] }',
  },
  {
    code: 'sales_forecasting', name: 'Sales Forecast Predictor', category: 'forecasting', module: 'sfa',
    description: 'Prediksi forecast penjualan berdasarkan pipeline, trend historis, dan faktor musiman',
    system_prompt: 'You are a sales forecasting AI. Analyze pipeline data, historical trends, and seasonal patterns to predict revenue outcomes. Provide best case, most likely, and worst case scenarios.',
    user_prompt_template: 'Predict sales for period {{period}}:\n\nPipeline Summary:\n{{pipeline_summary}}\n\nHistorical Revenue (last 6 months):\n{{historical_data}}\n\nOpen Deals: {{open_deals_count}} worth {{open_deals_value}}\nAvg Win Rate: {{win_rate}}%\nAvg Deal Cycle: {{avg_cycle_days}} days\n\nReturn JSON: { "best_case": number, "most_likely": number, "worst_case": number, "confidence": number, "key_risks": string[], "key_opportunities": string[] }',
  },
  {
    code: 'visit_optimization', name: 'Visit Route Optimizer', category: 'optimization', module: 'sfa',
    description: 'Optimasi rute kunjungan field force berdasarkan lokasi, prioritas, dan waktu',
    system_prompt: 'You are a field force optimization AI. Optimize visit schedules and routes for sales representatives based on customer locations, priorities, visit frequency requirements, and travel time.',
    user_prompt_template: 'Optimize visits for {{salesperson_name}} on {{date}}:\n\nStarting Location: {{start_location}}\nAvailable Hours: {{available_hours}}\n\nCustomers to Visit:\n{{customer_list}}\n\nReturn JSON: { "optimized_route": [{ "order": number, "customer": string, "priority": string, "estimated_time": string }], "total_travel_time": string, "coverage_score": number, "suggestions": string[] }',
  },
  {
    code: 'email_generator', name: 'Smart Email Composer', category: 'content', module: 'crm',
    description: 'Generate email follow-up, proposal, dan komunikasi customer otomatis',
    system_prompt: 'You are a professional business communication AI for Indonesian market. Generate well-written emails in Bahasa Indonesia (or English if specified) that are professional, personalized, and action-oriented.',
    user_prompt_template: 'Generate an email:\n\nType: {{email_type}}\nRecipient: {{recipient_name}} ({{recipient_title}}, {{company}})\nContext: {{context}}\nTone: {{tone}}\nLanguage: {{language}}\nKey Points:\n{{key_points}}\n\nReturn JSON: { "subject": string, "body": string, "call_to_action": string }',
  },
  {
    code: 'deal_analysis', name: 'Deal Win/Loss Analyzer', category: 'analysis', module: 'sfa',
    description: 'Analisis faktor win/loss pada deal pipeline untuk perbaikan strategi',
    system_prompt: 'You are a sales analytics AI. Analyze deal outcomes to identify patterns, success factors, and areas for improvement. Consider deal size, cycle time, competitive landscape, and sales activities.',
    user_prompt_template: 'Analyze this deal:\n\nTitle: {{title}}\nValue: {{value}}\nStage: {{stage}}\nDays in Pipeline: {{days_in_pipeline}}\nActivities: {{activity_count}}\nCompetitors: {{competitors}}\nDecision Makers Met: {{dm_count}}\nProposal Sent: {{proposal_sent}}\nOutcome: {{outcome}}\n\nReturn JSON: { "win_probability": number, "key_factors": string[], "risks": string[], "recommended_actions": string[], "similar_deal_insights": string }',
  },
  {
    code: 'ticket_classifier', name: 'Smart Ticket Classifier', category: 'classification', module: 'crm',
    description: 'Klasifikasi dan prioritas tiket support otomatis dengan AI',
    system_prompt: 'You are a customer support AI. Classify incoming support tickets, assign priority, suggest resolution paths, and estimate resolution time based on historical patterns.',
    user_prompt_template: 'Classify this ticket:\n\nSubject: {{subject}}\nDescription: {{description}}\nCustomer: {{customer_name}} ({{customer_tier}})\nChannel: {{channel}}\nPrevious Tickets: {{previous_count}}\n\nReturn JSON: { "category": string, "priority": "critical"|"high"|"medium"|"low", "sentiment": "positive"|"neutral"|"negative", "estimated_resolution_hours": number, "suggested_response": string, "escalation_needed": boolean }',
  },
  {
    code: 'competitor_intel', name: 'Competitive Intelligence', category: 'analysis', module: 'sfa',
    description: 'Analisis kompetitor dari data field dan rekomendasi strategi counter',
    system_prompt: 'You are a competitive intelligence AI. Analyze competitor activities reported by field force and provide strategic insights, counter-strategies, and market positioning recommendations.',
    user_prompt_template: 'Analyze competitor activity:\n\nCompetitor: {{competitor_name}}\nActivity Type: {{activity_type}}\nDescription: {{description}}\nImpact Level: {{impact_level}}\nAffected Products: {{products}}\nLocation: {{location}}\n\nOur Position:\n{{our_position}}\n\nReturn JSON: { "threat_level": "low"|"medium"|"high"|"critical", "counter_strategies": string[], "market_impact": string, "recommended_actions": string[], "timeline": string }',
  },
];

// ════════════════════════════════════════════════════════════
// Available AI providers and models
// ════════════════════════════════════════════════════════════
const MODEL_CATALOG = [
  { provider: 'openai', model_id: 'gpt-4o', name: 'GPT-4o', capabilities: ['text', 'vision', 'function_calling'], max_tokens: 128000, cost_input: 0.005, cost_output: 0.015 },
  { provider: 'openai', model_id: 'gpt-4o-mini', name: 'GPT-4o Mini', capabilities: ['text', 'vision', 'function_calling'], max_tokens: 128000, cost_input: 0.00015, cost_output: 0.0006 },
  { provider: 'openai', model_id: 'o1-preview', name: 'O1 Preview (Reasoning)', capabilities: ['text', 'reasoning'], max_tokens: 128000, cost_input: 0.015, cost_output: 0.06 },
  { provider: 'anthropic', model_id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', capabilities: ['text', 'vision', 'function_calling'], max_tokens: 200000, cost_input: 0.003, cost_output: 0.015 },
  { provider: 'anthropic', model_id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', capabilities: ['text', 'function_calling'], max_tokens: 200000, cost_input: 0.001, cost_output: 0.005 },
  { provider: 'google', model_id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capabilities: ['text', 'vision', 'function_calling'], max_tokens: 1000000, cost_input: 0.0001, cost_output: 0.0004 },
  { provider: 'google', model_id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', capabilities: ['text', 'vision', 'function_calling'], max_tokens: 2000000, cost_input: 0.00125, cost_output: 0.005 },
  { provider: 'deepseek', model_id: 'deepseek-chat', name: 'DeepSeek V3', capabilities: ['text', 'function_calling'], max_tokens: 64000, cost_input: 0.00027, cost_output: 0.0011 },
  { provider: 'deepseek', model_id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoning)', capabilities: ['text', 'reasoning'], max_tokens: 64000, cost_input: 0.00055, cost_output: 0.0022 },
  { provider: 'groq', model_id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', capabilities: ['text', 'function_calling'], max_tokens: 128000, cost_input: 0.00059, cost_output: 0.00079 },
  { provider: 'local', model_id: 'ollama-llama3', name: 'Ollama Llama 3 (Local)', capabilities: ['text'], max_tokens: 8000, cost_input: 0, cost_output: 0 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = (session.user as any).tenantId;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'System';
    const isManager = ['super_admin', 'owner', 'admin', 'manager'].includes((session.user as any).role || 'staff');
    const { action } = req.query;

    // ═══════════════════════════════════════
    // GET endpoints
    // ═══════════════════════════════════════
    if (req.method === 'GET') {
      switch (action) {

        // List configured AI models for this tenant
        case 'models': {
          const models = await q(`
            SELECT * FROM ai_models WHERE tenant_id = :tid AND is_active = true ORDER BY is_default DESC, provider, name
          `, { tid: tenantId });

          // If no models configured yet, return catalog
          return res.json({
            success: true,
            data: models.length > 0 ? models : [],
            catalog: MODEL_CATALOG,
          });
        }

        // List workflows
        case 'workflows': {
          const { category, module: mod } = req.query;
          let where = 'WHERE w.tenant_id = :tid';
          const params: any = { tid: tenantId };
          if (category) { where += ' AND w.category = :cat'; params.cat = category; }
          if (mod) { where += ' AND (w.module = :mod OR w.module = \'both\')'; params.mod = mod; }

          const workflows = await q(`
            SELECT w.*, m.name as model_name, m.provider as model_provider, m.model_id as model_code
            FROM ai_workflows w
            LEFT JOIN ai_models m ON m.id = w.ai_model_id
            ${where}
            ORDER BY w.sort_order, w.name
          `, params);

          // If empty, return templates
          return res.json({
            success: true,
            data: workflows,
            templates: workflows.length === 0 ? WORKFLOW_TEMPLATES : undefined,
          });
        }

        // Workflow detail
        case 'workflow-detail': {
          const { id } = req.query;
          const wf = await qOne(`
            SELECT w.*, m.name as model_name, m.provider, m.model_id as model_code
            FROM ai_workflows w LEFT JOIN ai_models m ON m.id = w.ai_model_id
            WHERE w.id = :id AND w.tenant_id = :tid
          `, { id, tid: tenantId });
          if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });

          const recentExecutions = await q(`
            SELECT e.id, e.status, e.execution_time_ms, e.input_tokens, e.output_tokens,
              e.total_cost, e.entity_type, e.entity_id, e.created_at, u.name as triggered_by_name
            FROM ai_executions e LEFT JOIN users u ON u.id = e.triggered_by
            WHERE e.workflow_id = :wid AND e.tenant_id = :tid
            ORDER BY e.created_at DESC LIMIT 10
          `, { wid: id, tid: tenantId });

          return res.json({ success: true, data: { ...wf, recentExecutions } });
        }

        // Execution history
        case 'executions': {
          const { workflow_id, limit: lim = '20' } = req.query;
          let where = 'WHERE e.tenant_id = :tid';
          const params: any = { tid: tenantId, lim: parseInt(lim as string) };
          if (workflow_id) { where += ' AND e.workflow_id = :wid'; params.wid = workflow_id; }

          const executions = await q(`
            SELECT e.*, w.name as workflow_name, w.category, m.name as model_name, u.name as user_name
            FROM ai_executions e
            LEFT JOIN ai_workflows w ON w.id = e.workflow_id
            LEFT JOIN ai_models m ON m.id = e.ai_model_id
            LEFT JOIN users u ON u.id = e.triggered_by
            ${where}
            ORDER BY e.created_at DESC LIMIT :lim
          `, params);

          return res.json({ success: true, data: executions });
        }

        // Usage stats
        case 'usage-stats': {
          const [totalExec, totalCost, byWorkflow, byModel] = await Promise.all([
            qOne(`SELECT COUNT(*) as c, COUNT(*) FILTER (WHERE status='completed') as ok, COUNT(*) FILTER (WHERE status='failed') as fail FROM ai_executions WHERE tenant_id = :tid`, { tid: tenantId }),
            qOne(`SELECT COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(input_tokens),0) as inp, COALESCE(SUM(output_tokens),0) as out FROM ai_executions WHERE tenant_id = :tid`, { tid: tenantId }),
            q(`SELECT w.name, w.category, COUNT(*) as executions, AVG(e.execution_time_ms)::int as avg_time, SUM(e.total_cost)::numeric(10,4) as cost FROM ai_executions e JOIN ai_workflows w ON w.id = e.workflow_id WHERE e.tenant_id = :tid GROUP BY w.name, w.category ORDER BY executions DESC LIMIT 10`, { tid: tenantId }),
            q(`SELECT m.name, m.provider, COUNT(*) as executions, SUM(e.total_cost)::numeric(10,4) as cost FROM ai_executions e JOIN ai_models m ON m.id = e.ai_model_id WHERE e.tenant_id = :tid GROUP BY m.name, m.provider ORDER BY executions DESC`, { tid: tenantId }),
          ]);

          return res.json({
            success: true,
            data: {
              totalExecutions: parseInt(totalExec?.c || 0),
              successCount: parseInt(totalExec?.ok || 0),
              failCount: parseInt(totalExec?.fail || 0),
              totalCost: parseFloat(totalCost?.cost || 0),
              totalInputTokens: parseInt(totalCost?.inp || 0),
              totalOutputTokens: parseInt(totalCost?.out || 0),
              byWorkflow, byModel,
            }
          });
        }

        // Model catalog (static)
        case 'model-catalog': {
          return res.json({ success: true, data: MODEL_CATALOG });
        }

        // Workflow templates (static)
        case 'workflow-templates': {
          return res.json({ success: true, data: WORKFLOW_TEMPLATES });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    // ═══════════════════════════════════════
    // POST endpoints
    // ═══════════════════════════════════════
    if (req.method === 'POST') {
      switch (action) {

        // Configure an AI model
        case 'setup-model': {
          if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });
          const { code, name, provider, model_id, description, capabilities, config, api_key_ref, is_default, cost_per_1k_input, cost_per_1k_output, max_context_tokens } = req.body;
          if (!provider || !model_id) return res.status(400).json({ success: false, error: 'provider & model_id required' });

          // If setting as default, unset others
          if (is_default) {
            await qExec(`UPDATE ai_models SET is_default = false WHERE tenant_id = :tid`, { tid: tenantId });
          }

          const [model] = await q(`
            INSERT INTO ai_models (tenant_id, code, name, provider, model_id, description, capabilities, config, api_key_ref, is_default, cost_per_1k_input, cost_per_1k_output, max_context_tokens, created_by)
            VALUES (:tid, :code, :name, :provider, :mid, :desc, :caps, :config, :key, :def, :ci, :co, :mct, :uid)
            ON CONFLICT DO NOTHING
            RETURNING id
          `, {
            tid: tenantId, code: code || model_id, name: name || model_id,
            provider, mid: model_id, desc: description || '',
            caps: JSON.stringify(capabilities || []), config: JSON.stringify(config || {}),
            key: api_key_ref || null, def: is_default || false,
            ci: cost_per_1k_input || 0, co: cost_per_1k_output || 0,
            mct: max_context_tokens || 128000, uid: userId,
          });

          return res.json({ success: true, message: 'Model dikonfigurasi', data: { id: model?.id } });
        }

        // Create workflow from template or custom
        case 'create-workflow': {
          if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });
          const wf = req.body;
          if (!wf.code || !wf.name) return res.status(400).json({ success: false, error: 'code & name required' });

          const [row] = await q(`
            INSERT INTO ai_workflows (tenant_id, code, name, description, category, module, ai_model_id, system_prompt, user_prompt_template, input_schema, output_schema, tools, trigger_type, trigger_config, sort_order, created_by)
            VALUES (:tid, :code, :name, :desc, :cat, :mod, :mid, :sp, :upt, :is, :os, :tools, :tt, :tc, :so, :uid)
            RETURNING id
          `, {
            tid: tenantId, code: wf.code, name: wf.name,
            desc: wf.description || '', cat: wf.category || 'general',
            mod: wf.module || 'both', mid: wf.ai_model_id || null,
            sp: wf.system_prompt || '', upt: wf.user_prompt_template || '',
            is: JSON.stringify(wf.input_schema || {}), os: JSON.stringify(wf.output_schema || {}),
            tools: JSON.stringify(wf.tools || []),
            tt: wf.trigger_type || 'manual', tc: JSON.stringify(wf.trigger_config || {}),
            so: wf.sort_order || 0, uid: userId,
          });

          return res.json({ success: true, message: 'Workflow dibuat', data: { id: row?.id } });
        }

        // Initialize all template workflows at once
        case 'init-templates': {
          if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });
          const { ai_model_id } = req.body;

          let created = 0;
          for (const tmpl of WORKFLOW_TEMPLATES) {
            const exists = await qOne(`SELECT id FROM ai_workflows WHERE tenant_id = :tid AND code = :code`, { tid: tenantId, code: tmpl.code });
            if (!exists) {
              await qExec(`
                INSERT INTO ai_workflows (tenant_id, code, name, description, category, module, ai_model_id, system_prompt, user_prompt_template, sort_order, created_by)
                VALUES (:tid, :code, :name, :desc, :cat, :mod, :mid, :sp, :upt, :so, :uid)
              `, {
                tid: tenantId, code: tmpl.code, name: tmpl.name,
                desc: tmpl.description, cat: tmpl.category, mod: tmpl.module,
                mid: ai_model_id || null, sp: tmpl.system_prompt, upt: tmpl.user_prompt_template,
                so: WORKFLOW_TEMPLATES.indexOf(tmpl), uid: userId,
              });
              created++;
            }
          }

          return res.json({ success: true, message: `${created} workflow template diinisialisasi`, data: { created } });
        }

        // Execute a workflow (simulated — real execution would call the AI API)
        case 'execute': {
          const { workflow_id, input_data, model_override_id } = req.body;
          if (!workflow_id) return res.status(400).json({ success: false, error: 'workflow_id required' });

          const wf = await qOne(`SELECT w.*, m.provider, m.model_id, m.api_key_ref, m.config as model_config FROM ai_workflows w LEFT JOIN ai_models m ON m.id = COALESCE(:moid::uuid, w.ai_model_id) WHERE w.id = :wid AND w.tenant_id = :tid`, { wid: workflow_id, tid: tenantId, moid: model_override_id || null });
          if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });

          const modelId = model_override_id || wf.ai_model_id;
          const startTime = Date.now();

          // Create execution record
          const [exec] = await q(`
            INSERT INTO ai_executions (tenant_id, workflow_id, ai_model_id, triggered_by, trigger_type, status, input_data, started_at)
            VALUES (:tid, :wid, :mid, :uid, 'manual', 'running', :input, NOW())
            RETURNING id
          `, {
            tid: tenantId, wid: workflow_id, mid: modelId, uid: userId,
            input: JSON.stringify(input_data || {}),
          });

          // ── AI Execution Logic ──
          // Tries real AI provider first; falls back to mock if no API key configured.
          try {
            let outputData: any = {};
            let inputTokens = 0, outputTokens = 0, executionTimeMs = 0;
            let usedMock = false;

            // Build prompt from template
            const userPrompt = wf.user_prompt_template
              ? fillTemplate(wf.user_prompt_template, input_data || {})
              : JSON.stringify(input_data || {});

            // Attempt real AI call if provider is set
            if (wf.provider && wf.model_id) {
              const aiResult = await callAI({
                provider: wf.provider,
                model: wf.model_id,
                messages: [
                  ...(wf.system_prompt ? [{ role: 'system' as const, content: wf.system_prompt }] : []),
                  { role: 'user' as const, content: userPrompt },
                ],
                temperature: 0.7,
                maxTokens: 2048,
                apiKey: wf.api_key_ref || undefined,
                responseFormat: 'json',
              });

              if (aiResult.success) {
                inputTokens = aiResult.inputTokens;
                outputTokens = aiResult.outputTokens;
                executionTimeMs = aiResult.durationMs;
                // Try to parse JSON from response
                try { outputData = JSON.parse(aiResult.content); }
                catch { outputData = { raw_response: aiResult.content }; }
              } else {
                console.warn('AI call failed, using mock:', aiResult.error);
                usedMock = true;
              }
            } else {
              usedMock = true;
            }

            // Mock fallback when no provider or call failed
            if (usedMock) {
              executionTimeMs = Math.floor(Math.random() * 2000) + 300;
              inputTokens = Math.floor(Math.random() * 1500) + 200;
              outputTokens = Math.floor(Math.random() * 800) + 100;

              switch (wf.category) {
                case 'lead_scoring':
                  outputData = { score: Math.floor(Math.random() * 40) + 60, grade: ['A','B','B','C'][Math.floor(Math.random()*4)], reasoning: 'Lead menunjukkan engagement tinggi. Profil sesuai ICP. Budget authority teridentifikasi.', next_actions: ['Schedule demo call','Send proposal','Connect with decision maker'], _mock: true };
                  break;
                case 'segmentation':
                  outputData = { segment: ['Champion','Loyal','Potential Loyalist','At Risk'][Math.floor(Math.random()*4)], rfm_score: `${Math.floor(Math.random()*3)+3}${Math.floor(Math.random()*3)+3}${Math.floor(Math.random()*3)+3}`, churn_risk: ['low','medium','high'][Math.floor(Math.random()*3)], upsell_potential: Math.floor(Math.random()*80)+20, recommended_actions: ['Kirim loyalty reward','Upsell premium tier','Schedule review meeting'], _mock: true };
                  break;
                case 'forecasting':
                  { const b = Math.floor(Math.random()*500000000)+100000000; outputData = { best_case: b*1.3, most_likely: b, worst_case: b*0.7, confidence: Math.floor(Math.random()*30)+60, key_risks: ['Pipeline velocity menurun','Seasonal slowdown','Competitor pricing war'], key_opportunities: ['Enterprise deal closing','New product traction','Cross-sell base'], _mock: true }; }
                  break;
                case 'content':
                  outputData = { subject: 'Tindak Lanjut: Proposal Kerjasama '+(input_data?.company||'PT. Client'), body: `Yth. ${input_data?.recipient_name||'Bapak/Ibu'},\n\nTerima kasih atas waktu yang telah diberikan. Saya ingin menindaklanjuti diskusi kita...\n\nSalam,\n${userName}`, call_to_action: 'Schedule follow-up meeting', _mock: true };
                  break;
                default:
                  outputData = { analysis: 'AI analysis completed (mock)', insights: ['Trend positif terdeteksi','Peluang optimasi field force','Customer engagement meningkat 15%'], recommendations: ['Fokus top 20% customers','Optimalkan rute kunjungan','Tingkatkan follow-up rate'], _mock: true };
              }
            }

            const costPerInput = wf.cost_per_1k_input || 0.003;
            const costPerOutput = wf.cost_per_1k_output || 0.015;
            const totalCost = (inputTokens * costPerInput + outputTokens * costPerOutput) / 1000;

            // Update execution as completed
            await qExec(`
              UPDATE ai_executions SET
                status = 'completed', output_data = :output,
                input_tokens = :it, output_tokens = :ot,
                total_cost = :cost, execution_time_ms = :time,
                completed_at = NOW()
              WHERE id = :id
            `, {
              id: exec.id, output: JSON.stringify(outputData),
              it: inputTokens, ot: outputTokens,
              cost: totalCost, time: executionTimeMs,
            });

            // Update workflow stats
            await qExec(`
              UPDATE ai_workflows SET
                execution_count = execution_count + 1,
                avg_execution_time_ms = (avg_execution_time_ms * execution_count + :time) / (execution_count + 1),
                updated_at = NOW()
              WHERE id = :wid
            `, { wid: workflow_id, time: executionTimeMs });

            return res.json({
              success: true,
              data: {
                executionId: exec.id,
                status: 'completed',
                output: outputData,
                mock: usedMock,
                stats: { inputTokens, outputTokens, executionTimeMs, cost: totalCost },
              }
            });

          } catch (execError: any) {
            await qExec(`UPDATE ai_executions SET status = 'failed', error_message = :err, completed_at = NOW() WHERE id = :id`, { id: exec.id, err: execError.message });
            return res.status(500).json({ success: false, error: 'Execution failed: ' + execError.message });
          }
        }

        // Update workflow's assigned model
        case 'assign-model': {
          if (!isManager) return res.status(403).json({ success: false, error: 'Manager only' });
          const { workflow_id: wid, ai_model_id: mid } = req.body;
          if (!wid) return res.status(400).json({ success: false, error: 'workflow_id required' });

          await qExec(`UPDATE ai_workflows SET ai_model_id = :mid, updated_at = NOW() WHERE id = :wid AND tenant_id = :tid`, { mid: mid || null, wid, tid: tenantId });
          return res.json({ success: true, message: 'Model diassign ke workflow' });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error('AI Workflow Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
