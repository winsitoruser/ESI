const ExcelJS = require('exceljs');
const path = require('path');

// ====================================================
// BEDAGANG ERP - 3-MONTH AGGRESSIVE PROJECT PLAN
// Start: 26 Maret 2026 | End: 25 Juni 2026 (13 Minggu)
// ====================================================

const PROJECT_START = new Date('2026-03-26');
const TOTAL_WEEKS = 13;
const COLORS = {
  header: 'FF1E3A5F', headerFont: 'FFFFFFFF',
  backend: 'FF3498DB', frontend: 'FF2ECC71', mobile: 'FFE74C3C',
  phase1: 'FF27AE60', phase2: 'FF2980B9', phase3: 'FFF39C12',
  phase4: 'FF8E44AD', phase5: 'FFE74C3C', phase6: 'FF1ABC9C',
  ganttBE: 'FF5DADE2', ganttFE: 'FF58D68D', ganttMB: 'FFEC7063',
  lightGray: 'FFF2F3F4', white: 'FFFFFFFF',
};

function addWeeks(date, weeks) {
  const d = new Date(date); d.setDate(d.getDate() + weeks * 7); return d;
}
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Load modules from separate data file
const modules = require('./project-plan-3m-data.js');

// ====================================================
// EXCEL GENERATION
// ====================================================
async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Bedagang ERP'; wb.created = new Date();

  // Flatten all tasks
  const allTasks = [];
  let taskId = 1;
  modules.forEach(m => {
    m.tasks.forEach(t => {
      allTasks.push({
        id: taskId++, phase: m.phase, module: m.module, goal: m.goal,
        objectives: m.objectives.join('; '), platform: t.platform,
        task: t.task, subtasks: t.subtasks, sp: t.sp,
        priority: t.sp >= 13 ? 'Critical' : t.sp >= 8 ? 'High' : t.sp >= 5 ? 'Medium' : 'Low',
        wkStart: t.wkStart, wkDur: t.wkDur,
        startDate: fmt(addWeeks(PROJECT_START, t.wkStart)),
        endDate: fmt(addWeeks(PROJECT_START, t.wkStart + t.wkDur)),
      });
    });
  });

  const beTasks = allTasks.filter(t => t.platform === 'Backend');
  const feTasks = allTasks.filter(t => t.platform === 'Frontend');
  const mbTasks = allTasks.filter(t => t.platform === 'Mobile');
  const totalSP = allTasks.reduce((s,t) => s + t.sp, 0);

  // ---- SHEET 1: PROJECT OVERVIEW ----
  const ws1 = wb.addWorksheet('Project Overview');
  ws1.columns = [{ width: 30 }, { width: 80 }];
  const hdr = (ws, text) => {
    const r = ws.addRow([text, '']);
    ws.mergeCells(r.number, 1, r.number, 2);
    r.font = { bold: true, size: 14, color: { argb: COLORS.headerFont } };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    r.height = 30; r.alignment = { vertical: 'middle' };
  };
  hdr(ws1, 'BEDAGANG ERP - 3-MONTH PROJECT PLAN');
  const info = [
    ['Project Name', 'Bedagang ERP - Full Development'],
    ['Timeline', '13 Minggu (3 Bulan) - AGGRESSIVE'],
    ['Start Date', fmt(PROJECT_START)],
    ['End Date', fmt(addWeeks(PROJECT_START, TOTAL_WEEKS))],
    ['Total Sprints', '7 sprints (2 minggu/sprint, sprint terakhir 1 minggu)'],
    ['Total Tasks', `${allTasks.length} tasks`],
    ['Total Story Points', `${totalSP} SP`],
    ['Backend Tasks', `${beTasks.length} tasks (${beTasks.reduce((s,t)=>s+t.sp,0)} SP)`],
    ['Frontend Tasks', `${feTasks.length} tasks (${feTasks.reduce((s,t)=>s+t.sp,0)} SP)`],
    ['Mobile Tasks', `${mbTasks.length} tasks (${mbTasks.reduce((s,t)=>s+t.sp,0)} SP)`],
    ['Est. Man-days', `${Math.round(totalSP * 1.5)} hari`],
    ['', ''],
    ['GOAL', 'Membangun platform ERP multi-tenant SaaS lengkap dengan 36 modul dalam 3 bulan'],
    ['APPROACH', 'Agile Sprint dengan paralelisasi maksimum, tim besar, dan modul overlap'],
    ['', ''],
    ['Phase 1', 'Foundation (W1-3): Auth, Onboarding, Branch, Settings'],
    ['Phase 2', 'Core Commerce (W3-6): Products, POS, Inventory, Purchase Orders'],
    ['Phase 3', 'Customer & Engagement (W5-7): Customers, Loyalty, Promo, CRM'],
    ['Phase 4', 'Operations (W6-9): Kitchen, Tables, Schedule, HRIS'],
    ['Phase 5', 'Finance & Advanced (W8-11): Finance Lite/Pro, SFA, Marketing'],
    ['Phase 6', 'Enterprise (W9-13): Fleet, TMS, Manufacturing, Asset, Project, EXIM, Reports, Integrations, Admin, Billing, Notifications, Audit'],
    ['', ''],
    ['TEAM RECOMMENDATION', '24-30 developers (8 BE, 8 FE, 4 Mobile, 2 DevOps, 1 QA Lead, 2 QA, 1 PM, 1 Tech Lead)'],
    ['NOTE', '⚠️ Timeline agresif - memerlukan tim besar dan paralelisasi penuh. Overlap antar phase untuk efisiensi.'],
  ];
  info.forEach(([k,v]) => {
    const r = ws1.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    if (k.startsWith('Phase')) r.getCell(2).font = { color: { argb: 'FF2980B9' } };
    if (k === 'NOTE') { r.getCell(2).font = { bold: true, color: { argb: 'FFE74C3C' } }; }
  });

  // ---- SHEET 2: ALL TASKS ----
  function createTaskSheet(ws, tasks, title) {
    const cols = ['ID','Phase','Module','Platform','Task','Subtasks','Goal','Objectives','Story Points','Priority','Start Date','End Date','Duration (Weeks)','User Story'];
    ws.columns = [
      {width:5},{width:25},{width:30},{width:10},{width:35},{width:50},{width:40},{width:40},
      {width:8},{width:10},{width:12},{width:12},{width:8},{width:50}
    ];
    const hr = ws.addRow(cols);
    hr.font = { bold: true, color: { argb: COLORS.headerFont } };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    hr.height = 25;
    hr.eachCell(c => { c.alignment = { vertical: 'middle', wrapText: true }; c.border = { bottom: { style: 'thin' } }; });

    tasks.forEach((t, i) => {
      const r = ws.addRow([
        t.id, t.phase, t.module, t.platform, t.task,
        t.subtasks.join('\n'), t.goal, t.objectives, t.sp, t.priority,
        t.startDate, t.endDate, t.wkDur,
        `Sebagai ${t.platform === 'Backend' ? 'developer' : t.platform === 'Frontend' ? 'pengguna' : 'pengguna mobile'}, saya ingin ${t.task.toLowerCase()} agar ${t.goal.toLowerCase()}`
      ]);
      const bg = i % 2 === 0 ? COLORS.lightGray : COLORS.white;
      r.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        c.alignment = { vertical: 'top', wrapText: true };
        c.border = { bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } } };
      });
      const platColors = { Backend: COLORS.backend, Frontend: COLORS.frontend, Mobile: COLORS.mobile };
      r.getCell(4).font = { bold: true, color: { argb: platColors[t.platform] || COLORS.header } };
      const prioColors = { Critical: 'FFE74C3C', High: 'FFF39C12', Medium: 'FF3498DB', Low: 'FF27AE60' };
      r.getCell(10).font = { bold: true, color: { argb: prioColors[t.priority] } };
    });
    ws.autoFilter = { from: 'A1', to: `N${tasks.length + 1}` };
  }

  const ws2 = wb.addWorksheet('Task List (All)');
  createTaskSheet(ws2, allTasks, 'All Tasks');
  const ws3 = wb.addWorksheet('Backend Tasks');
  createTaskSheet(ws3, beTasks, 'Backend');
  const ws4 = wb.addWorksheet('Frontend Tasks');
  createTaskSheet(ws4, feTasks, 'Frontend');
  const ws5 = wb.addWorksheet('Mobile Tasks');
  createTaskSheet(ws5, mbTasks, 'Mobile');

  // ---- SHEET 6: GANTT CHART ----
  const ws6 = wb.addWorksheet('Gantt Chart');
  const ganttCols = [{ width: 5 }, { width: 30 }, { width: 10 }];
  for (let w = 0; w < TOTAL_WEEKS; w++) ganttCols.push({ width: 10 });
  ws6.columns = ganttCols;

  // Header row
  const gHdr = ['#', 'Task', 'Platform'];
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const d = addWeeks(PROJECT_START, w);
    gHdr.push(`W${w+1}\n${fmt(d).substring(5)}`);
  }
  const ghr = ws6.addRow(gHdr);
  ghr.font = { bold: true, size: 9, color: { argb: COLORS.headerFont } };
  ghr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  ghr.height = 35;
  ghr.eachCell(c => { c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });

  // Task rows
  allTasks.forEach((t, i) => {
    const row = [i + 1, t.task, t.platform];
    for (let w = 0; w < TOTAL_WEEKS; w++) row.push('');
    const r = ws6.addRow(row);
    r.height = 20;
    r.getCell(2).alignment = { wrapText: true };
    const platGantt = { Backend: COLORS.ganttBE, Frontend: COLORS.ganttFE, Mobile: COLORS.ganttMB };
    for (let w = 0; w < TOTAL_WEEKS; w++) {
      if (w >= t.wkStart && w < t.wkStart + t.wkDur) {
        r.getCell(w + 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: platGantt[t.platform] } };
        r.getCell(w + 4).value = t.sp;
        r.getCell(w + 4).font = { size: 8, color: { argb: 'FFFFFFFF' }, bold: true };
        r.getCell(w + 4).alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
    if (i % 2 === 0) {
      for (let w = 0; w < TOTAL_WEEKS; w++) {
        if (!(w >= t.wkStart && w < t.wkStart + t.wkDur)) {
          r.getCell(w + 4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } };
        }
      }
    }
  });

  // Legend
  ws6.addRow([]);
  const leg = ws6.addRow(['', 'LEGEND:', '', 'Backend', '', 'Frontend', '', 'Mobile']);
  leg.font = { bold: true };
  leg.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ganttBE } };
  leg.getCell(4).font = { color: { argb: 'FFFFFFFF' }, bold: true };
  leg.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ganttFE } };
  leg.getCell(6).font = { color: { argb: 'FFFFFFFF' }, bold: true };
  leg.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ganttMB } };
  leg.getCell(8).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // ---- SHEET 7: SUMMARY ----
  const ws7 = wb.addWorksheet('Summary');
  ws7.columns = [{ width: 35 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }];
  hdr(ws7, 'PROJECT SUMMARY - 3 BULAN AGRESIF');
  ws7.addRow([]);

  const sumHdr = ws7.addRow(['Metric', 'Backend', 'Frontend', 'Mobile', 'Total']);
  sumHdr.font = { bold: true, color: { argb: COLORS.headerFont } };
  sumHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };

  ws7.addRow(['Task Count', beTasks.length, feTasks.length, mbTasks.length, allTasks.length]);
  ws7.addRow(['Story Points', beTasks.reduce((s,t)=>s+t.sp,0), feTasks.reduce((s,t)=>s+t.sp,0), mbTasks.reduce((s,t)=>s+t.sp,0), totalSP]);
  ws7.addRow(['Critical Tasks', beTasks.filter(t=>t.priority==='Critical').length, feTasks.filter(t=>t.priority==='Critical').length, mbTasks.filter(t=>t.priority==='Critical').length, allTasks.filter(t=>t.priority==='Critical').length]);
  ws7.addRow(['High Priority Tasks', beTasks.filter(t=>t.priority==='High').length, feTasks.filter(t=>t.priority==='High').length, mbTasks.filter(t=>t.priority==='High').length, allTasks.filter(t=>t.priority==='High').length]);

  ws7.addRow([]);
  const mhdr = ws7.addRow(['Module', 'Tasks', 'Story Points', 'Start Week', 'End Week']);
  mhdr.font = { bold: true, color: { argb: COLORS.headerFont } };
  mhdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };

  modules.forEach(m => {
    const mTasks = allTasks.filter(t => t.module === m.module);
    const minW = Math.min(...mTasks.map(t => t.wkStart));
    const maxW = Math.max(...mTasks.map(t => t.wkStart + t.wkDur));
    ws7.addRow([m.module, mTasks.length, mTasks.reduce((s,t)=>s+t.sp,0), `W${minW+1}`, `W${maxW}`]);
  });

  ws7.addRow([]);
  ws7.addRow(['TEAM RECOMMENDATION (3-Month Aggressive)']);
  const teamData = [
    ['Backend Developers', '8 orang', 'Node.js, Express, Sequelize, PostgreSQL'],
    ['Frontend Developers', '8 orang', 'Next.js, React, TypeScript, TailwindCSS'],
    ['Mobile Developers', '4 orang', 'React Native, TypeScript'],
    ['DevOps Engineers', '2 orang', 'Docker, CI/CD, AWS/GCP, PostgreSQL'],
    ['QA Lead', '1 orang', 'Test strategy, automation framework'],
    ['QA Engineers', '2 orang', 'Manual & automated testing'],
    ['Project Manager', '1 orang', 'Agile/Scrum, stakeholder management'],
    ['Tech Lead', '1 orang', 'Architecture, code review, mentoring'],
    ['UI/UX Designer', '2 orang', 'Figma, design system'],
    ['TOTAL', '29 orang', ''],
  ];
  const thdr = ws7.addRow(['Role', 'Count', 'Skills']);
  thdr.font = { bold: true, color: { argb: COLORS.headerFont } };
  thdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
  teamData.forEach(r => {
    const row = ws7.addRow(r);
    if (r[0] === 'TOTAL') row.font = { bold: true };
  });

  // ---- SHEET 8: SPRINT PLANNING ----
  const ws8 = wb.addWorksheet('Sprint Planning');
  ws8.columns = [{ width: 15 }, { width: 15 }, { width: 15 }, { width: 60 }, { width: 15 }];
  hdr(ws8, 'SPRINT PLANNING - 7 SPRINTS (2 Minggu/Sprint)');
  ws8.addRow([]);

  const shdr = ws8.addRow(['Sprint', 'Start Date', 'End Date', 'Deliverables', 'Story Points']);
  shdr.font = { bold: true, color: { argb: COLORS.headerFont } };
  shdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };

  for (let sp = 0; sp < 7; sp++) {
    const spStart = sp * 2;
    const spEnd = Math.min(sp * 2 + 2, TOTAL_WEEKS);
    const spTasks = allTasks.filter(t => t.wkStart >= spStart && t.wkStart < spEnd);
    const spSP = spTasks.reduce((s,t) => s + t.sp, 0);
    const deliverables = [...new Set(spTasks.map(t => t.module))].join(', ');
    const r = ws8.addRow([
      `Sprint ${sp + 1}`,
      fmt(addWeeks(PROJECT_START, spStart)),
      fmt(addWeeks(PROJECT_START, spEnd)),
      deliverables || '-',
      spSP
    ]);
    r.getCell(4).alignment = { wrapText: true };
    if (sp % 2 === 0) r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGray } }; });
  }

  // Save
  const filePath = path.join(__dirname, '..', 'Bedagang_ERP_Project_Plan_3Bulan.xlsx');
  await wb.xlsx.writeFile(filePath);
  console.log(`\n✅ Project plan exported to: ${filePath}`);
  console.log(`📊 Total Tasks: ${allTasks.length}`);
  console.log(`📊 Total Story Points: ${totalSP}`);
  console.log(`📊 Backend: ${beTasks.length} tasks (${beTasks.reduce((s,t)=>s+t.sp,0)} SP)`);
  console.log(`📊 Frontend: ${feTasks.length} tasks (${feTasks.reduce((s,t)=>s+t.sp,0)} SP)`);
  console.log(`📊 Mobile: ${mbTasks.length} tasks (${mbTasks.reduce((s,t)=>s+t.sp,0)} SP)`);
  console.log(`📊 Duration: ${TOTAL_WEEKS} weeks (7 sprints)`);
  console.log(`📊 Start: ${fmt(PROJECT_START)} | End: ${fmt(addWeeks(PROJECT_START, TOTAL_WEEKS))}`);
  console.log(`📊 Team Size: 29 developers recommended`);
}

generate().catch(e => { console.error('Error:', e); process.exit(1); });
