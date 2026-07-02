const { Sequelize, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bedagang_dev',
  dialect: 'postgres',
  logging: console.log,
};

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
});

// ESI Conservation Projects - based on demo data
const ESI_PROJECTS = [
  {
    id: uuidv4(),
    project_code: 'ESI-KON-2026-001',
    name: 'Reintroduksi Elang Jawa — Gunung Halimun',
    description: 'Program pelepasan dan monitoring elang jawa di habitat alami.',
    status: 'active',
    priority: 'high',
    progress_percent: 62,
    start_date: '2026-01-15',
    end_date: '2026-12-31',
    budget_amount: 850000000,
    actual_cost: 420000000,
    manager_name: 'Dr. Rina Wijaya',
    total_tasks: 24,
    completed_tasks: 14,
    category: 'reintroduction',
    project_type: 'external',
    client_name: 'Kementerian LHK',
    currency: 'IDR',
    tags: JSON.stringify(['elang-jawa', 'reintroduksi', 'gunung-halimun']),
  },
  {
    id: uuidv4(),
    project_code: 'ESI-KON-2026-002',
    name: 'Rehabilitasi Orangutan — Pusat Trauma',
    description: 'Perawatan medis, enrichment, dan persiapan pelepasan orangutan.',
    status: 'active',
    priority: 'urgent',
    progress_percent: 45,
    start_date: '2025-11-01',
    end_date: '2026-08-30',
    budget_amount: 1200000000,
    actual_cost: 680000000,
    manager_name: 'Pak Budi Santoso',
    total_tasks: 32,
    completed_tasks: 12,
    category: 'rehabilitation',
    project_type: 'external',
    client_name: 'BOS Foundation',
    currency: 'IDR',
    tags: JSON.stringify(['orangutan', 'rehabilitasi', 'pusat-trauma']),
  },
  {
    id: uuidv4(),
    project_code: 'ESI-KON-2026-003',
    name: 'Monitoring Habitat Badak Jawa',
    description: 'Patroli lapangan, camera trap, dan analisis vegetasi.',
    status: 'planning',
    priority: 'high',
    progress_percent: 18,
    start_date: '2026-03-01',
    end_date: '2027-02-28',
    budget_amount: 650000000,
    actual_cost: 95000000,
    manager_name: 'Siti Rahmawati',
    total_tasks: 16,
    completed_tasks: 3,
    category: 'monitoring',
    project_type: 'internal',
    currency: 'IDR',
    tags: JSON.stringify(['badak-jawa', 'monitoring', 'camera-trap']),
  },
  {
    id: uuidv4(),
    project_code: 'ESI-EDU-2026-004',
    name: 'Edukasi Konservasi — Sekolah Adiwiyata',
    description: 'Workshop kesadaran satwa liar untuk 20 sekolah mitra.',
    status: 'active',
    priority: 'normal',
    progress_percent: 78,
    start_date: '2026-02-01',
    end_date: '2026-06-30',
    budget_amount: 180000000,
    actual_cost: 125000000,
    manager_name: 'Maya Kusuma',
    total_tasks: 18,
    completed_tasks: 15,
    category: 'education',
    project_type: 'grant',
    client_name: 'GIZ Indonesia',
    currency: 'IDR',
    tags: JSON.stringify(['edukasi', 'sekolah', 'adiwiyata']),
  },
  {
    id: uuidv4(),
    project_code: 'ESI-GRANT-2025-012',
    name: 'Grant KLHK — Patroli Hutan Lindung',
    description: 'Patroli ranger, laporan compliance grant pemerintah.',
    status: 'completed',
    priority: 'normal',
    progress_percent: 100,
    start_date: '2025-06-01',
    end_date: '2025-12-31',
    budget_amount: 420000000,
    actual_cost: 398000000,
    manager_name: 'Andi Pratama',
    total_tasks: 20,
    completed_tasks: 20,
    category: 'grant',
    project_type: 'grant',
    client_name: 'Kementerian LHK',
    currency: 'IDR',
    tags: JSON.stringify(['grant', 'klhk', 'patroli']),
  },
];

// Sample tasks for the first project
const generateTasks = (projectId) => {
  const tasks = [
    { name: 'Survei habitat awal', status: 'done', priority: 'high', description: 'Pemetaan lokasi pelepasan' },
    { name: 'Pelatihan ranger', status: 'done', priority: 'high', description: 'Training identifikasi dan monitoring' },
    { name: 'Persiapan kandang acclimatization', status: 'done', priority: 'high', description: 'Persiapan kandang transisi' },
    { name: 'Pelepasan batch 1', status: 'done', priority: 'urgent', description: 'Pelepasan 5 ekor elang' },
    { name: 'Monitoring mingguan', status: 'in_progress', priority: 'high', description: 'Tracking via GPS dan observasi' },
    { name: 'Analisis data bulanan', status: 'in_progress', priority: 'normal', description: 'Laporan perkembangan' },
    { name: 'Stakeholder meeting', status: 'todo', priority: 'normal', description: 'Koordinasi dengan KLHK' },
    { name: 'Laporan Q2', status: 'todo', priority: 'high', description: 'Laporan kemajuan untuk donor' },
  ];
  
  return tasks.map((t, i) => ({
    id: uuidv4(),
    project_id: projectId,
    task_code: `TASK-${String(i + 1).padStart(3, '0')}`,
    ...t,
    start_date: t.status === 'done' ? '2026-01-15' : t.status === 'in_progress' ? '2026-03-01' : null,
    due_date: i < 4 ? '2026-03-31' : '2026-06-30',
    estimated_hours: 40,
    actual_hours: t.status === 'done' ? 35 : t.status === 'in_progress' ? 20 : 0,
    progress_percent: t.status === 'done' ? 100 : t.status === 'in_progress' ? 60 : 0,
    assignee_name: 'Tim Lapangan',
  }));
};

// Sample milestones
const generateMilestones = (projectId) => {
  return [
    {
      id: uuidv4(),
      project_id: projectId,
      name: 'Survei habitat selesai',
      status: 'completed',
      due_date: '2026-02-28',
      completed_date: '2026-02-20',
    },
    {
      id: uuidv4(),
      project_id: projectId,
      name: 'Pelepasan batch 1',
      status: 'completed',
      due_date: '2026-03-15',
      completed_date: '2026-03-10',
    },
    {
      id: uuidv4(),
      project_id: projectId,
      name: 'Laporan Q1',
      status: 'in_progress',
      due_date: '2026-04-30',
    },
    {
      id: uuidv4(),
      project_id: projectId,
      name: 'Pelepasan batch 2',
      status: 'pending',
      due_date: '2026-06-15',
    },
  ];
};

async function seedEsiData() {
  try {
    console.log('🌱 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected');

    // Check if data already exists
    const [existing] = await sequelize.query('SELECT COUNT(*) FROM pjm_projects');
    const count = parseInt(existing[0]?.count || 0);
    
    if (count > 0) {
      console.log(`⚠️ Found ${count} existing projects. Skipping seed to avoid duplicates.`);
      console.log('Delete existing data first if you want fresh seed.');
    } else {
      console.log('\n🌱 Seeding ESI Conservation Projects...');
      
      // Insert projects
      for (const project of ESI_PROJECTS) {
        const columns = Object.keys(project);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(project);
        
        await sequelize.query(
          `INSERT INTO pjm_projects (${columns.map(c => c.replace(/[A-Z]/g, l => '_' + l.toLowerCase())).join(', ')})
           VALUES (${placeholders})`,
          { bind: values }
        );
        console.log(`✅ Inserted: ${project.project_code} - ${project.name}`);
        
        // Insert tasks for active projects
        if (project.status === 'active' || project.status === 'planning') {
          const tasks = generateTasks(project.id);
          for (const task of tasks) {
            const taskCols = Object.keys(task);
            const taskPh = taskCols.map((_, i) => `$${i + 1}`).join(', ');
            await sequelize.query(
              `INSERT INTO pjm_tasks (${taskCols.map(c => c.replace(/[A-Z]/g, l => '_' + l.toLowerCase())).join(', ')})
               VALUES (${taskPh})`,
              { bind: Object.values(task) }
            );
          }
          console.log(`  → ${tasks.length} tasks created`);
          
          // Insert milestones
          const milestones = generateMilestones(project.id);
          for (const ms of milestones) {
            const msCols = Object.keys(ms);
            const msPh = msCols.map((_, i) => `$${i + 1}`).join(', ');
            await sequelize.query(
              `INSERT INTO pjm_milestones (${msCols.map(c => c.replace(/[A-Z]/g, l => '_' + l.toLowerCase())).join(', ')})
               VALUES (${msPh})`,
              { bind: Object.values(ms) }
            );
          }
          console.log(`  → ${milestones.length} milestones created`);
        }
      }
      
      console.log('\n✅ ESI Conservation seed data completed!');
    }

    // Show summary
    const [projects] = await sequelize.query('SELECT * FROM pjm_projects ORDER BY created_at');
    const [tasks] = await sequelize.query('SELECT COUNT(*) FROM pjm_tasks');
    const [milestones] = await sequelize.query('SELECT COUNT(*) FROM pjm_milestones');
    
    console.log('\n📊 Summary:');
    console.log(`  Projects: ${projects.length}`);
    console.log(`  Tasks: ${tasks[0]?.count || 0}`);
    console.log(`  Milestones: ${milestones[0]?.count || 0}`);
    
    console.log('\n📋 Projects:');
    projects.forEach(p => {
      const statusEmoji = p.status === 'active' ? '🔵' : p.status === 'completed' ? '✅' : p.status === 'planning' ? '📋' : '⏸️';
      console.log(`  ${statusEmoji} ${p.project_code} | ${p.name}`);
      console.log(`     Status: ${p.status} | Category: ${p.category} | Progress: ${p.progress_percent}%`);
    });

    await sequelize.close();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedEsiData();
