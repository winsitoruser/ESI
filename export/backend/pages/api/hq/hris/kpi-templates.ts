import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  KPI_TEMPLATES, 
  KPI_CATEGORIES, 
  STANDARD_SCORING_LEVELS,
  calculateAchievementPercentage,
  calculateOverallScore,
  getKPIStatus
} from '../../../../lib/hq/kpi-calculator';

// In-memory storage for custom templates (replace with DB in production)
let customTemplates: any[] = [];
let customScoringSchemes: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getTemplates(req, res);
      case 'POST':
        return createTemplate(req, res);
      case 'PUT':
        return updateTemplate(req, res);
      case 'DELETE':
        return deleteTemplate(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('KPI Templates API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getTemplates(req: NextApiRequest, res: NextApiResponse) {
  const { category, type } = req.query;

  // Get standard templates
  let templates = [...KPI_TEMPLATES, ...customTemplates];
  
  if (category && category !== 'all') {
    templates = templates.filter(t => t.category === category);
  }

  // Get scoring schemes
  const scoringSchemes = [
    {
      id: 'standard',
      name: 'Standard Scoring',
      description: 'Skala penilaian standar 5 level',
      levels: STANDARD_SCORING_LEVELS,
      isDefault: true
    },
    {
      id: 'strict',
      name: 'Strict Scoring',
      description: 'Penilaian ketat dengan threshold tinggi',
      levels: [
        { level: 5, label: 'Excellent', minPercent: 120, maxPercent: 999, color: '#10B981', multiplier: 1.3 },
        { level: 4, label: 'Good', minPercent: 105, maxPercent: 119, color: '#3B82F6', multiplier: 1.1 },
        { level: 3, label: 'Average', minPercent: 95, maxPercent: 104, color: '#F59E0B', multiplier: 1.0 },
        { level: 2, label: 'Below Average', minPercent: 80, maxPercent: 94, color: '#F97316', multiplier: 0.8 },
        { level: 1, label: 'Poor', minPercent: 0, maxPercent: 79, color: '#EF4444', multiplier: 0.5 }
      ],
      isDefault: false
    },
    {
      id: 'lenient',
      name: 'Lenient Scoring',
      description: 'Penilaian longgar untuk tim baru',
      levels: [
        { level: 5, label: 'Excellent', minPercent: 100, maxPercent: 999, color: '#10B981', multiplier: 1.2 },
        { level: 4, label: 'Good', minPercent: 85, maxPercent: 99, color: '#3B82F6', multiplier: 1.0 },
        { level: 3, label: 'Average', minPercent: 70, maxPercent: 84, color: '#F59E0B', multiplier: 0.9 },
        { level: 2, label: 'Below Average', minPercent: 50, maxPercent: 69, color: '#F97316', multiplier: 0.7 },
        { level: 1, label: 'Poor', minPercent: 0, maxPercent: 49, color: '#EF4444', multiplier: 0.5 }
      ],
      isDefault: false
    },
    ...customScoringSchemes
  ];

  return res.status(200).json({
    templates,
    categories: KPI_CATEGORIES,
    scoringSchemes,
    standardLevels: STANDARD_SCORING_LEVELS,
    summary: {
      totalTemplates: templates.length,
      byCategory: Object.keys(KPI_CATEGORIES).map(cat => ({
        category: cat,
        count: templates.filter(t => t.category === cat).length
      }))
    }
  });
}

function createTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { 
    code, name, description, category, unit, dataType, 
    formulaType, formula, defaultWeight, measurementFrequency,
    applicableTo, parameters, scoringScale
  } = req.body;

  if (!code || !name || !category) {
    return res.status(400).json({ error: 'Code, name, and category are required' });
  }

  // Check for duplicate code
  const allTemplates = [...KPI_TEMPLATES, ...customTemplates];
  if (allTemplates.some(t => t.code === code)) {
    return res.status(400).json({ error: 'Template code already exists' });
  }

  const newTemplate = {
    id: Date.now().toString(),
    code,
    name,
    description,
    category,
    unit: unit || '%',
    dataType: dataType || 'number',
    formulaType: formulaType || 'simple',
    formula: formula || '(actual / target) * 100',
    defaultWeight: defaultWeight || 100,
    measurementFrequency: measurementFrequency || 'monthly',
    applicableTo: applicableTo || ['all'],
    parameters: parameters || [],
    scoringScale: scoringScale || null,
    isCustom: true,
    createdAt: new Date().toISOString()
  };

  customTemplates.push(newTemplate);

  return res.status(201).json({ 
    template: newTemplate, 
    message: 'KPI template created successfully' 
  });
}

function updateTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { id, ...updates } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const index = customTemplates.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found or is a standard template' });
  }

  customTemplates[index] = { ...customTemplates[index], ...updates, updatedAt: new Date().toISOString() };

  return res.status(200).json({ 
    template: customTemplates[index], 
    message: 'KPI template updated successfully' 
  });
}

function deleteTemplate(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const index = customTemplates.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found or is a standard template' });
  }

  customTemplates.splice(index, 1);

  return res.status(200).json({ message: 'KPI template deleted successfully' });
}
