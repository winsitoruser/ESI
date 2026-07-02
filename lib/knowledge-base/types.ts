// Knowledge Base Types

export interface KBArticle {
  slug: string;
  title: string;
  subtitle: string;
  category: KBCategory;
  module: string;
  icon: string;
  color: string;
  gradient: string;
  overview: string;
  keyFeatures: string[];
  businessFlow: BusinessFlow;
  sequenceDiagram: SequenceStep[];
  usageGuide: UsageStep[];
  tips: string[];
  faqs: FAQ[];
  relatedModules: string[];
  userRoles: { role: string; access: string }[];
  lastUpdated: string;
  readTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface BusinessFlow {
  title: string;
  description: string;
  steps: FlowStep[];
}

export interface FlowStep {
  id: number;
  label: string;
  description: string;
  actor: string;
  action: string;
}

export interface SequenceStep {
  from: string;
  to: string;
  action: string;
  description: string;
  type: 'request' | 'response' | 'action' | 'notify';
}

export interface UsageStep {
  step: number;
  title: string;
  description: string;
  substeps?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export type KBCategory =
  | 'getting-started'
  | 'core-system'
  | 'operations'
  | 'finance'
  | 'hr'
  | 'sales-marketing'
  | 'logistics'
  | 'integration'
  | 'analytics'
  | 'system';

export interface CategoryInfo {
  id: KBCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
}
