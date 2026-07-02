#!/usr/bin/env node
/**
 * Extract all API routes and actions from Bedagang ERP
 * Generates: ALL-ROUTES-TEST.csv and route summary
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = process.cwd();
const API_DIR = path.join(BASE_DIR, 'pages', 'api');

// HTTP methods to filter out
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

function extractActionsFromFile(filePath) {
  const actions = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Pattern 1: case 'action': 
    const casePattern = /case\s+['"]([^'"{}]+)['"]\s*:/g;
    let match;
    while ((match = casePattern.exec(content)) !== null) {
      const action = match[1].trim();
      if (action && !HTTP_METHODS.has(action.toUpperCase()) && action.length > 1) {
        actions.push(action);
      }
    }
    
    // Pattern 2: if (action === '...')
    const ifPattern = /(?:action|req\.query\.action)\s*===\s*['"]([^'"{}]+)['"]|(?:action|req\.query\.action)\s*==\s*['"]([^'"{}]+)['"]/g;
    while ((match = ifPattern.exec(content)) !== null) {
      const action = match[1] || match[2];
      if (action && !HTTP_METHODS.has(action.toUpperCase()) && action.length > 1) {
        actions.push(action);
      }
    }
  } catch (e) {
    // Skip unreadable files
  }
  
  // Remove duplicates and sort
  return [...new Set(actions)].sort();
}

function categorizeRoute(filePath) {
  const relPath = path.relative(API_DIR, filePath);
  const parts = relPath.split(path.sep);
  
  // Remove extension
  if (parts[parts.length - 1].endsWith('.ts')) {
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -3);
  } else if (parts[parts.length - 1].endsWith('.js')) {
    parts[parts.length - 1] = parts[parts.length - 1].slice(0, -3);
  }
  
  // Remove [param] patterns
  const cleanParts = parts.filter(p => !(p.startsWith('[') && p.endsWith(']')));
  
  const urlPath = '/api/' + parts.join('/');
  const topLevel = cleanParts[0] || 'root';
  const subModule = cleanParts.length > 1 ? cleanParts[1] : null;
  
  const partsLower = cleanParts.map(p => p.toLowerCase());
  const isSfa = partsLower.includes('sfa');
  const isCrm = partsLower.includes('crm') || (isSfa && relPath.includes('crm.ts'));
  const isMarketing = partsLower.includes('marketing');
  
  return {
    urlPath,
    filePath,
    topLevel,
    subModule,
    isSfa,
    isCrm,
    isMarketing,
    parts: cleanParts
  };
}

function findApiFiles(dir) {
  const files = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if ((entry.name.endsWith('.ts') || entry.name.endsWith('.js')) && 
            !entry.name.includes('.test.') && 
            !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }
  }
  walk(dir);
  return files;
}

function main() {
  console.log('🔍 Extracting API routes from:', API_DIR);
  
  const apiFiles = findApiFiles(API_DIR);
  console.log(`📁 Found ${apiFiles.length} API files`);
  
  const routes = [];
  for (const filePath of apiFiles) {
    const cat = categorizeRoute(filePath);
    const actions = extractActionsFromFile(filePath);
    routes.push({
      ...cat,
      actions,
      actionCount: actions.length
    });
  }
  
  // Statistics
  const totalFiles = routes.length;
  const totalActions = routes.reduce((sum, r) => sum + r.actionCount, 0);
  
  // Group by top level
  const byTopLevel = {};
  for (const r of routes) {
    if (!byTopLevel[r.topLevel]) {
      byTopLevel[r.topLevel] = { count: 0, actions: 0, routes: [] };
    }
    byTopLevel[r.topLevel].count++;
    byTopLevel[r.topLevel].actions += r.actionCount;
    byTopLevel[r.topLevel].routes.push(r);
  }
  
  // SFA/CRM/Marketing
  const sfaRoutes = routes.filter(r => r.isSfa);
  const crmRoutes = routes.filter(r => r.isCrm);
  const marketingRoutes = routes.filter(r => r.isMarketing);
  
  // Generate CSV
  const csvRows = ['Category,Sub-Module,URL Path,File Path,Action Count,Actions'];
  const sortedRoutes = routes.sort((a, b) => {
    if (a.topLevel !== b.topLevel) return a.topLevel.localeCompare(b.topLevel);
    if ((a.subModule || '') !== (b.subModule || '')) return (a.subModule || '').localeCompare(b.subModule || '');
    return a.urlPath.localeCompare(b.urlPath);
  });
  
  for (const r of sortedRoutes) {
    const actionsStr = r.actions.join(';').replace(/,/g, ';');
    csvRows.push(`${r.topLevel},${r.subModule || ''},${r.urlPath},"${r.filePath}",${r.actionCount},"${actionsStr}"`);
  }
  
  const csvContent = csvRows.join('\n');
  
  // Generate summary report
  const summary = {
    totalApiFiles: totalFiles,
    totalActions: totalActions,
    sfa: {
      files: sfaRoutes.length,
      actions: sfaRoutes.reduce((sum, r) => sum + r.actionCount, 0),
      routes: sfaRoutes.map(r => ({ url: r.urlPath, actions: r.actions }))
    },
    crm: {
      files: crmRoutes.length,
      actions: crmRoutes.reduce((sum, r) => sum + r.actionCount, 0),
      routes: crmRoutes.map(r => ({ url: r.urlPath, actions: r.actions }))
    },
    marketing: {
      files: marketingRoutes.length,
      actions: marketingRoutes.reduce((sum, r) => sum + r.actionCount, 0),
      routes: marketingRoutes.map(r => ({ url: r.urlPath, actions: r.actions }))
    },
    byTopLevel: Object.fromEntries(
      Object.entries(byTopLevel).map(([k, v]) => [k, { count: v.count, actions: v.actions }])
    )
  };
  
  // Write outputs
  const outputDir = path.join(BASE_DIR, 'docs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const csvPath = path.join(BASE_DIR, 'ALL-ROUTES-TEST.csv');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ CSV written to: ${csvPath}`);
  
  const summaryPath = path.join(outputDir, 'API-ROUTES-SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary written to: ${summaryPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 API ROUTES SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total API files: ${totalFiles}`);
  console.log(`Total actions: ${totalActions}`);
  console.log('\nBy category:');
  for (const [cat, data] of Object.entries(byTopLevel).sort()) {
    console.log(`  ${cat}: ${data.count} files, ${data.actions} actions`);
  }
  
  console.log('\n📌 CRM/SFA/Marketing:');
  console.log(`  SFA: ${sfaRoutes.length} files, ${sfaRoutes.reduce((s, r) => s + r.actionCount, 0)} actions`);
  console.log(`  CRM: ${crmRoutes.length} files, ${crmRoutes.reduce((s, r) => s + r.actionCount, 0)} actions`);
  console.log(`  Marketing: ${marketingRoutes.length} files, ${marketingRoutes.reduce((s, r) => s + r.actionCount, 0)} actions`);
  
  // Detailed SFA routes
  if (sfaRoutes.length > 0) {
    console.log('\n📋 SFA Routes:');
    for (const r of sfaRoutes.sort((a, b) => a.urlPath.localeCompare(b.urlPath))) {
      console.log(`  ${r.urlPath} (${r.actionCount} actions)`);
      if (r.actions.length > 0) {
        console.log(`    Actions: ${r.actions.slice(0, 10).join(', ')}${r.actions.length > 10 ? '...' : ''}`);
      }
    }
  }
  
  // Detailed Marketing routes
  if (marketingRoutes.length > 0) {
    console.log('\n📋 Marketing Routes:');
    for (const r of marketingRoutes) {
      console.log(`  ${r.urlPath} (${r.actionCount} actions)`);
      if (r.actions.length > 0) {
        console.log(`    Actions: ${r.actions.join(', ')}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

main();
