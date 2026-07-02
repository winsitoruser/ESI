'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      // ════════════════════════════════════════════════════════
      // CRM MODULE - 25 Tables for Comprehensive CRM System
      // ════════════════════════════════════════════════════════

      // ── 1. CUSTOMER 360° ──────────────────────────────────

      // crm_customers - Enhanced customer master
      await queryInterface.createTable('crm_customers', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        customer_number: { type: Sequelize.STRING(30), unique: true },
        company_name: { type: Sequelize.STRING(300) },
        display_name: { type: Sequelize.STRING(300), allowNull: false },
        customer_type: { type: Sequelize.STRING(30), defaultValue: 'company' }, // company, individual
        industry: { type: Sequelize.STRING(100) },
        company_size: { type: Sequelize.STRING(30) },
        website: { type: Sequelize.STRING(300) },
        // Address
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(100) },
        province: { type: Sequelize.STRING(100) },
        postal_code: { type: Sequelize.STRING(10) },
        country: { type: Sequelize.STRING(60), defaultValue: 'Indonesia' },
        latitude: { type: Sequelize.DECIMAL(10, 7) },
        longitude: { type: Sequelize.DECIMAL(10, 7) },
        // Lifecycle
        lifecycle_stage: { type: Sequelize.STRING(30), defaultValue: 'prospect' }, // prospect, lead, opportunity, customer, evangelist, churned
        customer_status: { type: Sequelize.STRING(20), defaultValue: 'active' }, // active, inactive, churned, blacklisted
        acquisition_source: { type: Sequelize.STRING(50) },
        acquisition_date: { type: Sequelize.DATEONLY },
        // Scoring
        health_score: { type: Sequelize.INTEGER, defaultValue: 50 }, // 0-100
        engagement_score: { type: Sequelize.INTEGER, defaultValue: 0 },
        ltv: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 }, // lifetime value
        // Segmentation
        segment: { type: Sequelize.STRING(50) }, // platinum, gold, silver, bronze
        tier: { type: Sequelize.STRING(30) },
        tags: { type: Sequelize.JSONB, defaultValue: [] },
        custom_fields: { type: Sequelize.JSONB, defaultValue: {} },
        // Financial
        credit_limit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        payment_terms: { type: Sequelize.STRING(50) },
        tax_id: { type: Sequelize.STRING(30) },
        // Relations
        territory_id: { type: Sequelize.UUID },
        assigned_to: { type: Sequelize.INTEGER },
        team_id: { type: Sequelize.UUID },
        lead_id: { type: Sequelize.UUID }, // from sfa_leads
        // Stats (denormalized for performance)
        total_revenue: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total_orders: { type: Sequelize.INTEGER, defaultValue: 0 },
        last_order_date: { type: Sequelize.DATEONLY },
        last_interaction_date: { type: Sequelize.DATE },
        avg_order_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        // Meta
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER },
        updated_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_contacts - Multiple contacts per customer
      await queryInterface.createTable('crm_contacts', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        customer_id: { type: Sequelize.UUID, references: { model: 'crm_customers', key: 'id' } },
        first_name: { type: Sequelize.STRING(100), allowNull: false },
        last_name: { type: Sequelize.STRING(100) },
        title: { type: Sequelize.STRING(100) }, // job title
        department: { type: Sequelize.STRING(100) },
        email: { type: Sequelize.STRING(200) },
        phone: { type: Sequelize.STRING(30) },
        mobile: { type: Sequelize.STRING(30) },
        whatsapp: { type: Sequelize.STRING(30) },
        is_primary: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_decision_maker: { type: Sequelize.BOOLEAN, defaultValue: false },
        role_in_deal: { type: Sequelize.STRING(50) }, // champion, influencer, blocker, user, approver
        communication_preference: { type: Sequelize.STRING(30), defaultValue: 'email' },
        birthday: { type: Sequelize.DATEONLY },
        social_linkedin: { type: Sequelize.STRING(200) },
        notes: { type: Sequelize.TEXT },
        tags: { type: Sequelize.JSONB, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_interactions - All interaction timeline
      await queryInterface.createTable('crm_interactions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        customer_id: { type: Sequelize.UUID, references: { model: 'crm_customers', key: 'id' } },
        contact_id: { type: Sequelize.UUID, references: { model: 'crm_contacts', key: 'id' } },
        interaction_type: { type: Sequelize.STRING(30), allowNull: false }, // call, email, meeting, note, visit, chat, social
        direction: { type: Sequelize.STRING(10) }, // inbound, outbound
        subject: { type: Sequelize.STRING(300) },
        description: { type: Sequelize.TEXT },
        outcome: { type: Sequelize.STRING(50) }, // positive, neutral, negative, no_answer
        duration_minutes: { type: Sequelize.INTEGER },
        interaction_date: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        // References
        lead_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        ticket_id: { type: Sequelize.UUID },
        // Sentiment
        sentiment: { type: Sequelize.STRING(20) }, // positive, neutral, negative
        sentiment_score: { type: Sequelize.DECIMAL(3, 2) },
        // Meta
        channel: { type: Sequelize.STRING(30) }, // phone, email, whatsapp, in_person, social
        metadata: { type: Sequelize.JSONB, defaultValue: {} },
        attachments: { type: Sequelize.JSONB, defaultValue: [] },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_customer_segments - Segmentation rules
      await queryInterface.createTable('crm_customer_segments', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(100), allowNull: false },
        code: { type: Sequelize.STRING(30) },
        description: { type: Sequelize.TEXT },
        segment_type: { type: Sequelize.STRING(30), defaultValue: 'static' }, // static, dynamic, rfm
        // For dynamic segments
        rules: { type: Sequelize.JSONB, defaultValue: {} }, // filter rules
        // RFM scoring
        rfm_recency_weight: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0.33 },
        rfm_frequency_weight: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0.33 },
        rfm_monetary_weight: { type: Sequelize.DECIMAL(3, 2), defaultValue: 0.34 },
        // Stats
        customer_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_revenue: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        avg_health_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
        color: { type: Sequelize.STRING(10) },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        last_refreshed_at: { type: Sequelize.DATE },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_customer_tags - Tags/labels
      await queryInterface.createTable('crm_customer_tags', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(50), allowNull: false },
        color: { type: Sequelize.STRING(10), defaultValue: '#6366f1' },
        category: { type: Sequelize.STRING(50) },
        usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 2. COMMUNICATION HUB ──────────────────────────────

      // crm_communications - All communication logs
      await queryInterface.createTable('crm_communications', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        comm_number: { type: Sequelize.STRING(30) },
        customer_id: { type: Sequelize.UUID, references: { model: 'crm_customers', key: 'id' } },
        contact_id: { type: Sequelize.UUID, references: { model: 'crm_contacts', key: 'id' } },
        comm_type: { type: Sequelize.STRING(20), allowNull: false }, // call, email, sms, whatsapp, meeting
        direction: { type: Sequelize.STRING(10) }, // inbound, outbound
        status: { type: Sequelize.STRING(20), defaultValue: 'completed' }, // scheduled, in_progress, completed, missed, failed
        subject: { type: Sequelize.STRING(300) },
        body: { type: Sequelize.TEXT },
        // Call specific
        call_duration: { type: Sequelize.INTEGER }, // seconds
        call_recording_url: { type: Sequelize.STRING(500) },
        // Email specific
        email_from: { type: Sequelize.STRING(200) },
        email_to: { type: Sequelize.JSONB, defaultValue: [] },
        email_cc: { type: Sequelize.JSONB, defaultValue: [] },
        email_opened: { type: Sequelize.BOOLEAN, defaultValue: false },
        email_clicked: { type: Sequelize.BOOLEAN, defaultValue: false },
        // Meeting specific
        meeting_location: { type: Sequelize.STRING(300) },
        meeting_start: { type: Sequelize.DATE },
        meeting_end: { type: Sequelize.DATE },
        meeting_attendees: { type: Sequelize.JSONB, defaultValue: [] },
        // Relations
        lead_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        campaign_id: { type: Sequelize.UUID },
        template_id: { type: Sequelize.UUID },
        // Meta
        outcome: { type: Sequelize.STRING(50) },
        next_action: { type: Sequelize.STRING(200) },
        attachments: { type: Sequelize.JSONB, defaultValue: [] },
        metadata: { type: Sequelize.JSONB, defaultValue: {} },
        scheduled_at: { type: Sequelize.DATE },
        completed_at: { type: Sequelize.DATE },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_follow_ups - Follow-up reminders
      await queryInterface.createTable('crm_follow_ups', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        customer_id: { type: Sequelize.UUID, references: { model: 'crm_customers', key: 'id' } },
        contact_id: { type: Sequelize.UUID },
        title: { type: Sequelize.STRING(300), allowNull: false },
        description: { type: Sequelize.TEXT },
        follow_up_type: { type: Sequelize.STRING(30) }, // call, email, meeting, visit, task
        priority: { type: Sequelize.STRING(10), defaultValue: 'medium' },
        status: { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending, completed, overdue, cancelled
        due_date: { type: Sequelize.DATE, allowNull: false },
        completed_date: { type: Sequelize.DATE },
        // Relations
        lead_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        communication_id: { type: Sequelize.UUID },
        // Assignment
        assigned_to: { type: Sequelize.INTEGER },
        reminder_sent: { type: Sequelize.BOOLEAN, defaultValue: false },
        reminder_minutes_before: { type: Sequelize.INTEGER, defaultValue: 30 },
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_email_templates - Email/message templates
      await queryInterface.createTable('crm_email_templates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        category: { type: Sequelize.STRING(50) }, // sales, follow_up, onboarding, support, marketing
        subject: { type: Sequelize.STRING(300) },
        body_html: { type: Sequelize.TEXT },
        body_text: { type: Sequelize.TEXT },
        variables: { type: Sequelize.JSONB, defaultValue: [] }, // {{customer_name}}, {{company}}, etc.
        channel: { type: Sequelize.STRING(20), defaultValue: 'email' }, // email, whatsapp, sms
        usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        open_rate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
        click_rate: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_comm_campaigns - Outreach campaigns
      await queryInterface.createTable('crm_comm_campaigns', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        campaign_type: { type: Sequelize.STRING(30) }, // email_blast, drip, follow_up, nurture
        status: { type: Sequelize.STRING(20), defaultValue: 'draft' }, // draft, scheduled, running, paused, completed
        template_id: { type: Sequelize.UUID },
        segment_id: { type: Sequelize.UUID },
        // Schedule
        scheduled_start: { type: Sequelize.DATE },
        scheduled_end: { type: Sequelize.DATE },
        // Stats
        total_recipients: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_sent: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_opened: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_clicked: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_replied: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_bounced: { type: Sequelize.INTEGER, defaultValue: 0 },
        // Config
        settings: { type: Sequelize.JSONB, defaultValue: {} },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 3. TASKS & ACTIVITIES ─────────────────────────────

      // crm_tasks - Task management
      await queryInterface.createTable('crm_tasks', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        task_number: { type: Sequelize.STRING(20) },
        title: { type: Sequelize.STRING(300), allowNull: false },
        description: { type: Sequelize.TEXT },
        task_type: { type: Sequelize.STRING(30) }, // call, email, meeting, follow_up, review, approval, custom
        priority: { type: Sequelize.STRING(10), defaultValue: 'medium' }, // low, medium, high, urgent
        status: { type: Sequelize.STRING(20), defaultValue: 'open' }, // open, in_progress, completed, cancelled, deferred
        // Dates
        due_date: { type: Sequelize.DATE },
        start_date: { type: Sequelize.DATE },
        completed_date: { type: Sequelize.DATE },
        // Relations
        customer_id: { type: Sequelize.UUID },
        contact_id: { type: Sequelize.UUID },
        lead_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        ticket_id: { type: Sequelize.UUID },
        // Assignment
        assigned_to: { type: Sequelize.INTEGER },
        assigned_team: { type: Sequelize.UUID },
        // Recurrence
        is_recurring: { type: Sequelize.BOOLEAN, defaultValue: false },
        recurrence_pattern: { type: Sequelize.JSONB }, // { frequency: 'daily'|'weekly'|'monthly', interval: 1, end_date: ... }
        parent_task_id: { type: Sequelize.UUID },
        // Effort
        estimated_hours: { type: Sequelize.DECIMAL(5, 2) },
        actual_hours: { type: Sequelize.DECIMAL(5, 2) },
        // Meta
        tags: { type: Sequelize.JSONB, defaultValue: [] },
        checklist: { type: Sequelize.JSONB, defaultValue: [] }, // [{item, done}]
        result: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_task_templates - Reusable task templates
      await queryInterface.createTable('crm_task_templates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT },
        task_type: { type: Sequelize.STRING(30) },
        default_priority: { type: Sequelize.STRING(10), defaultValue: 'medium' },
        due_days_offset: { type: Sequelize.INTEGER, defaultValue: 1 }, // days from creation
        checklist_template: { type: Sequelize.JSONB, defaultValue: [] },
        auto_assign_role: { type: Sequelize.STRING(50) },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_calendar_events - Calendar events
      await queryInterface.createTable('crm_calendar_events', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        title: { type: Sequelize.STRING(300), allowNull: false },
        description: { type: Sequelize.TEXT },
        event_type: { type: Sequelize.STRING(30) }, // meeting, call, visit, demo, review, training
        status: { type: Sequelize.STRING(20), defaultValue: 'scheduled' }, // scheduled, confirmed, cancelled, completed
        // Time
        start_time: { type: Sequelize.DATE, allowNull: false },
        end_time: { type: Sequelize.DATE, allowNull: false },
        all_day: { type: Sequelize.BOOLEAN, defaultValue: false },
        timezone: { type: Sequelize.STRING(50), defaultValue: 'Asia/Jakarta' },
        // Location
        location: { type: Sequelize.STRING(300) },
        is_virtual: { type: Sequelize.BOOLEAN, defaultValue: false },
        meeting_url: { type: Sequelize.STRING(500) },
        // Relations
        customer_id: { type: Sequelize.UUID },
        contact_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        task_id: { type: Sequelize.UUID },
        // Participants
        organizer_id: { type: Sequelize.INTEGER },
        attendees: { type: Sequelize.JSONB, defaultValue: [] }, // [{user_id, name, email, status}]
        // Recurrence
        is_recurring: { type: Sequelize.BOOLEAN, defaultValue: false },
        recurrence_rule: { type: Sequelize.JSONB },
        // Reminders
        reminders: { type: Sequelize.JSONB, defaultValue: [{ minutes: 15 }] },
        // Result
        outcome: { type: Sequelize.TEXT },
        color: { type: Sequelize.STRING(10) },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 4. SALES FORECASTING ──────────────────────────────

      // crm_forecasts - Forecast periods
      await queryInterface.createTable('crm_forecasts', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        forecast_period: { type: Sequelize.STRING(20) }, // monthly, quarterly, yearly
        period_start: { type: Sequelize.DATEONLY, allowNull: false },
        period_end: { type: Sequelize.DATEONLY, allowNull: false },
        status: { type: Sequelize.STRING(20), defaultValue: 'draft' }, // draft, submitted, approved, closed
        // Targets
        target_revenue: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        target_deals: { type: Sequelize.INTEGER, defaultValue: 0 },
        target_new_customers: { type: Sequelize.INTEGER, defaultValue: 0 },
        // Actuals (auto-calculated)
        actual_revenue: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        actual_deals: { type: Sequelize.INTEGER, defaultValue: 0 },
        actual_new_customers: { type: Sequelize.INTEGER, defaultValue: 0 },
        // Pipeline
        best_case: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        most_likely: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        worst_case: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        // Accuracy
        accuracy_score: { type: Sequelize.DECIMAL(5, 2) },
        // Assignment
        owner_id: { type: Sequelize.INTEGER },
        team_id: { type: Sequelize.UUID },
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_forecast_items - Individual forecast entries
      await queryInterface.createTable('crm_forecast_items', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        forecast_id: { type: Sequelize.UUID, references: { model: 'crm_forecasts', key: 'id' } },
        opportunity_id: { type: Sequelize.UUID },
        customer_id: { type: Sequelize.UUID },
        description: { type: Sequelize.STRING(300) },
        forecast_category: { type: Sequelize.STRING(30) }, // committed, best_case, pipeline, omitted
        amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        probability: { type: Sequelize.INTEGER, defaultValue: 50 },
        weighted_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        expected_close_date: { type: Sequelize.DATEONLY },
        stage: { type: Sequelize.STRING(30) },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_deal_scores - AI-like deal scoring
      await queryInterface.createTable('crm_deal_scores', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        customer_id: { type: Sequelize.UUID },
        // Scoring dimensions (0-100)
        engagement_score: { type: Sequelize.INTEGER, defaultValue: 0 },
        fit_score: { type: Sequelize.INTEGER, defaultValue: 0 }, // ICP match
        behavior_score: { type: Sequelize.INTEGER, defaultValue: 0 },
        timing_score: { type: Sequelize.INTEGER, defaultValue: 0 },
        overall_score: { type: Sequelize.INTEGER, defaultValue: 0 },
        // Signals
        positive_signals: { type: Sequelize.JSONB, defaultValue: [] },
        negative_signals: { type: Sequelize.JSONB, defaultValue: [] },
        recommendations: { type: Sequelize.JSONB, defaultValue: [] },
        // Win/Loss analysis
        win_probability: { type: Sequelize.DECIMAL(5, 2) },
        risk_level: { type: Sequelize.STRING(10) }, // low, medium, high
        risk_factors: { type: Sequelize.JSONB, defaultValue: [] },
        score_date: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 5. CUSTOMER SERVICE ───────────────────────────────

      // crm_tickets - Support tickets
      await queryInterface.createTable('crm_tickets', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        ticket_number: { type: Sequelize.STRING(20), unique: true },
        customer_id: { type: Sequelize.UUID, references: { model: 'crm_customers', key: 'id' } },
        contact_id: { type: Sequelize.UUID },
        subject: { type: Sequelize.STRING(300), allowNull: false },
        description: { type: Sequelize.TEXT },
        category: { type: Sequelize.STRING(50) }, // billing, technical, product, complaint, request, feedback
        subcategory: { type: Sequelize.STRING(50) },
        priority: { type: Sequelize.STRING(10), defaultValue: 'medium' },
        status: { type: Sequelize.STRING(20), defaultValue: 'open' }, // open, in_progress, waiting, resolved, closed, reopened
        severity: { type: Sequelize.STRING(10) }, // critical, major, minor, cosmetic
        // Channel
        source_channel: { type: Sequelize.STRING(20) }, // email, phone, chat, whatsapp, social, portal
        // Assignment
        assigned_to: { type: Sequelize.INTEGER },
        assigned_team: { type: Sequelize.UUID },
        escalation_level: { type: Sequelize.INTEGER, defaultValue: 0 },
        // SLA
        sla_policy_id: { type: Sequelize.UUID },
        first_response_due: { type: Sequelize.DATE },
        first_response_at: { type: Sequelize.DATE },
        resolution_due: { type: Sequelize.DATE },
        resolved_at: { type: Sequelize.DATE },
        sla_breached: { type: Sequelize.BOOLEAN, defaultValue: false },
        // Resolution
        resolution: { type: Sequelize.TEXT },
        resolution_type: { type: Sequelize.STRING(30) }, // fixed, workaround, duplicate, cannot_reproduce, by_design, wont_fix
        // Satisfaction
        satisfaction_rating: { type: Sequelize.INTEGER }, // 1-5
        satisfaction_comment: { type: Sequelize.TEXT },
        // Meta
        tags: { type: Sequelize.JSONB, defaultValue: [] },
        attachments: { type: Sequelize.JSONB, defaultValue: [] },
        related_ticket_id: { type: Sequelize.UUID },
        created_by: { type: Sequelize.INTEGER },
        closed_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_ticket_comments - Ticket comments/replies
      await queryInterface.createTable('crm_ticket_comments', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        ticket_id: { type: Sequelize.UUID, references: { model: 'crm_tickets', key: 'id' } },
        comment_type: { type: Sequelize.STRING(20), defaultValue: 'reply' }, // reply, internal_note, status_change, escalation
        body: { type: Sequelize.TEXT, allowNull: false },
        is_public: { type: Sequelize.BOOLEAN, defaultValue: true }, // false = internal note
        attachments: { type: Sequelize.JSONB, defaultValue: [] },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_sla_policies - SLA policies
      await queryInterface.createTable('crm_sla_policies', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(100), allowNull: false },
        description: { type: Sequelize.TEXT },
        // Response times (in minutes)
        first_response_critical: { type: Sequelize.INTEGER, defaultValue: 30 },
        first_response_major: { type: Sequelize.INTEGER, defaultValue: 120 },
        first_response_minor: { type: Sequelize.INTEGER, defaultValue: 480 },
        // Resolution times
        resolution_critical: { type: Sequelize.INTEGER, defaultValue: 240 },
        resolution_major: { type: Sequelize.INTEGER, defaultValue: 1440 },
        resolution_minor: { type: Sequelize.INTEGER, defaultValue: 2880 },
        // Escalation
        escalation_rules: { type: Sequelize.JSONB, defaultValue: [] },
        // Business hours
        business_hours: { type: Sequelize.JSONB, defaultValue: { start: '08:00', end: '17:00', days: [1,2,3,4,5] } },
        // Applicability
        applies_to_segments: { type: Sequelize.JSONB, defaultValue: [] },
        applies_to_categories: { type: Sequelize.JSONB, defaultValue: [] },
        is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_satisfaction - CSAT/NPS surveys
      await queryInterface.createTable('crm_satisfaction', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        customer_id: { type: Sequelize.UUID, references: { model: 'crm_customers', key: 'id' } },
        survey_type: { type: Sequelize.STRING(10), allowNull: false }, // csat, nps, ces
        score: { type: Sequelize.INTEGER, allowNull: false }, // CSAT: 1-5, NPS: 0-10, CES: 1-7
        comment: { type: Sequelize.TEXT },
        // Context
        trigger_event: { type: Sequelize.STRING(30) }, // ticket_resolved, purchase, visit, onboarding
        related_ticket_id: { type: Sequelize.UUID },
        related_order_id: { type: Sequelize.UUID },
        // Channel
        channel: { type: Sequelize.STRING(20) },
        response_date: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 6. AUTOMATION ─────────────────────────────────────

      // crm_automation_rules - Workflow automation rules
      await queryInterface.createTable('crm_automation_rules', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT },
        rule_type: { type: Sequelize.STRING(30) }, // trigger, scheduled, manual
        // Trigger
        trigger_event: { type: Sequelize.STRING(50) }, // lead_created, deal_stage_changed, ticket_created, etc.
        trigger_entity: { type: Sequelize.STRING(30) }, // lead, opportunity, customer, ticket, task
        trigger_conditions: { type: Sequelize.JSONB, defaultValue: [] }, // [{field, operator, value}]
        // Actions
        actions: { type: Sequelize.JSONB, defaultValue: [] }, // [{type, config}] e.g. assign, send_email, create_task, update_field, notify
        // Schedule (for scheduled type)
        schedule_cron: { type: Sequelize.STRING(50) },
        // Execution
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        execution_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        last_executed_at: { type: Sequelize.DATE },
        error_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        // Priority & ordering
        priority: { type: Sequelize.INTEGER, defaultValue: 0 },
        stop_on_match: { type: Sequelize.BOOLEAN, defaultValue: false },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_automation_logs - Execution logs
      await queryInterface.createTable('crm_automation_logs', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        rule_id: { type: Sequelize.UUID, references: { model: 'crm_automation_rules', key: 'id' } },
        trigger_event: { type: Sequelize.STRING(50) },
        entity_type: { type: Sequelize.STRING(30) },
        entity_id: { type: Sequelize.UUID },
        status: { type: Sequelize.STRING(20) }, // success, failed, skipped
        actions_executed: { type: Sequelize.JSONB, defaultValue: [] },
        error_message: { type: Sequelize.TEXT },
        execution_time_ms: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 7. DOCUMENTS ──────────────────────────────────────

      // crm_documents - Document management
      await queryInterface.createTable('crm_documents', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        document_number: { type: Sequelize.STRING(30) },
        title: { type: Sequelize.STRING(300), allowNull: false },
        document_type: { type: Sequelize.STRING(30) }, // proposal, contract, invoice, nda, sow, presentation
        status: { type: Sequelize.STRING(20), defaultValue: 'draft' }, // draft, sent, viewed, signed, expired, rejected
        version: { type: Sequelize.INTEGER, defaultValue: 1 },
        // Content
        file_url: { type: Sequelize.STRING(500) },
        file_size: { type: Sequelize.INTEGER },
        file_type: { type: Sequelize.STRING(20) },
        content_html: { type: Sequelize.TEXT },
        // Relations
        customer_id: { type: Sequelize.UUID },
        opportunity_id: { type: Sequelize.UUID },
        template_id: { type: Sequelize.UUID },
        // Tracking
        sent_at: { type: Sequelize.DATE },
        viewed_at: { type: Sequelize.DATE },
        signed_at: { type: Sequelize.DATE },
        expires_at: { type: Sequelize.DATE },
        view_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        // Financial
        total_value: { type: Sequelize.DECIMAL(15, 2) },
        // Meta
        tags: { type: Sequelize.JSONB, defaultValue: [] },
        metadata: { type: Sequelize.JSONB, defaultValue: {} },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_document_templates - Document templates
      await queryInterface.createTable('crm_document_templates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        document_type: { type: Sequelize.STRING(30) },
        content_html: { type: Sequelize.TEXT },
        variables: { type: Sequelize.JSONB, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── 8. ANALYTICS ──────────────────────────────────────

      // crm_saved_reports - Saved report configurations
      await queryInterface.createTable('crm_saved_reports', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        report_type: { type: Sequelize.STRING(30) }, // sales, pipeline, activity, customer, service
        description: { type: Sequelize.TEXT },
        config: { type: Sequelize.JSONB, defaultValue: {} }, // filters, grouping, metrics, visualization
        schedule: { type: Sequelize.JSONB }, // { frequency, recipients, format }
        is_public: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_favorite: { type: Sequelize.BOOLEAN, defaultValue: false },
        last_run_at: { type: Sequelize.DATE },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // crm_custom_dashboards - Custom dashboard layouts
      await queryInterface.createTable('crm_custom_dashboards', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT },
        layout: { type: Sequelize.JSONB, defaultValue: [] }, // [{widget_type, position, size, config}]
        is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_public: { type: Sequelize.BOOLEAN, defaultValue: false },
        owner_id: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
      }, { transaction: t });

      // ── INDEXES ───────────────────────────────────────────
      await queryInterface.addIndex('crm_customers', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_customers', ['customer_status'], { transaction: t });
      await queryInterface.addIndex('crm_customers', ['lifecycle_stage'], { transaction: t });
      await queryInterface.addIndex('crm_customers', ['segment'], { transaction: t });
      await queryInterface.addIndex('crm_customers', ['assigned_to'], { transaction: t });
      await queryInterface.addIndex('crm_contacts', ['customer_id'], { transaction: t });
      await queryInterface.addIndex('crm_contacts', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_interactions', ['customer_id'], { transaction: t });
      await queryInterface.addIndex('crm_interactions', ['interaction_date'], { transaction: t });
      await queryInterface.addIndex('crm_communications', ['customer_id'], { transaction: t });
      await queryInterface.addIndex('crm_communications', ['comm_type'], { transaction: t });
      await queryInterface.addIndex('crm_follow_ups', ['customer_id'], { transaction: t });
      await queryInterface.addIndex('crm_follow_ups', ['due_date'], { transaction: t });
      await queryInterface.addIndex('crm_follow_ups', ['status'], { transaction: t });
      await queryInterface.addIndex('crm_tasks', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_tasks', ['assigned_to'], { transaction: t });
      await queryInterface.addIndex('crm_tasks', ['status'], { transaction: t });
      await queryInterface.addIndex('crm_tasks', ['due_date'], { transaction: t });
      await queryInterface.addIndex('crm_calendar_events', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_calendar_events', ['start_time'], { transaction: t });
      await queryInterface.addIndex('crm_tickets', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_tickets', ['customer_id'], { transaction: t });
      await queryInterface.addIndex('crm_tickets', ['status'], { transaction: t });
      await queryInterface.addIndex('crm_tickets', ['priority'], { transaction: t });
      await queryInterface.addIndex('crm_tickets', ['assigned_to'], { transaction: t });
      await queryInterface.addIndex('crm_forecasts', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_documents', ['customer_id'], { transaction: t });
      await queryInterface.addIndex('crm_automation_rules', ['tenant_id'], { transaction: t });
      await queryInterface.addIndex('crm_automation_logs', ['rule_id'], { transaction: t });

      await t.commit();
      console.log('✅ CRM tables created successfully (25 tables)');
    } catch (error) {
      await t.rollback();
      // Tables may already exist
      if (error.message?.includes('already exists')) {
        console.log('ℹ️  CRM tables already exist, skipping...');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface) {
    const tables = [
      'crm_custom_dashboards', 'crm_saved_reports',
      'crm_document_templates', 'crm_documents',
      'crm_automation_logs', 'crm_automation_rules',
      'crm_satisfaction', 'crm_sla_policies', 'crm_ticket_comments', 'crm_tickets',
      'crm_deal_scores', 'crm_forecast_items', 'crm_forecasts',
      'crm_calendar_events', 'crm_task_templates', 'crm_tasks',
      'crm_comm_campaigns', 'crm_email_templates', 'crm_follow_ups', 'crm_communications',
      'crm_customer_tags', 'crm_customer_segments', 'crm_interactions', 'crm_contacts', 'crm_customers'
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table, { cascade: true }).catch(() => {});
    }
  }
};
