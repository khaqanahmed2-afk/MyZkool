/**
 * MyZkool Subscription Plans & Pricing Constants.
 * Source of Truth: docs/SPEC.md
 */

export interface PlanFeatureConfig {
  students: number;
  fees: boolean;
  website: number;
  website_storage_mb: number;
  transport: boolean;
  [key: string]: number | boolean;
}

export interface PlanDefinition {
  code: 'basic' | 'pro';
  name: string;
  pricePaise: number;
  studentCap: number;
  features: PlanFeatureConfig;
}

export const PLANS: Record<'basic' | 'pro', PlanDefinition> = {
  basic: {
    code: 'basic',
    name: 'Basic',
    pricePaise: 99900, // Rs 999
    studentCap: 800,
    features: {
      students: 800,
      fees: true,
      website: 8, // 8 pages
      website_storage_mb: 200,
      transport: false,
    },
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    pricePaise: 179900, // Rs 1,799
    studentCap: 1800,
    features: {
      students: 1800,
      fees: true,
      website: 20, // 20 pages
      website_storage_mb: 1000,
      transport: true,
    },
  },
};
