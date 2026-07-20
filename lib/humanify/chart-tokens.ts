/**
 * Shared Humanify chart palette — maps to --hf-brand-* + semantic accents.
 * Prefer these over hardcoded violet hex in HR analytics pages (Wave-61 / FE-5).
 */
export const HF_CHART_COLORS = [
  'var(--hf-brand-500, #7c3aed)',
  '#0EA5E9',
  'var(--hf-success, #059669)',
  'var(--hf-warning, #d97706)',
  'var(--hf-danger, #dc2626)',
  'var(--hf-brand-600, #6d28d9)',
  '#EC4899',
  '#14B8A6',
] as const;

/** Solid hex fallbacks for SVG/canvas libs that reject CSS vars */
export const HF_CHART_COLORS_SOLID = [
  '#7c3aed',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#6d28d9',
  '#EC4899',
  '#14B8A6',
] as const;

export const HF_CHART_PRIMARY = HF_CHART_COLORS_SOLID[0];
