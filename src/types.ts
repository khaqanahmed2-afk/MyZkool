export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  highlighted?: boolean;
  tag?: string;
  previewType: "website" | "admissions" | "fees" | "attendance" | "exams" | "timetable" | "whatsapp" | "records" | "transport";
}

export interface PricingPlan {
  name: string;
  badge?: string;
  highlighted?: boolean;
  studentLimit: string;
  monthlyPrice: number;
  sixMonthTotal: number;
  twelveMonthTotal: number;
  isCustom?: boolean;
  features: string[];
}

export interface ComparisonRow {
  feature: string;
  basic: boolean | string;
  pro: boolean | string;
  custom: boolean | string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}
