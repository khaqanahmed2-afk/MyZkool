import {
  SlidersHorizontal,
  Share2,
  Boxes,
  ShieldCheck,
  TrendingUp,
  School,
  BookOpen,
  GraduationCap,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface Founder {
  name: string;
  role: string;
  badge: string;
  image: string;
  fallbackImage?: string;
  description: string;
  linkedin: string;
  github: string;
  isPlaceholderImage?: boolean;
}

export interface CorePrinciple {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badgeText: string;
}

export interface StakeholderPillar {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  highlights: string[];
}

export const FOUNDERS: Founder[] = [
  {
    name: "Khaqan Ahmad",
    role: "Founder & Product Lead",
    badge: "Leadership & Architecture",
    image: "/Khaqan%20Ahmad.webp",
    description:
      "Leads product strategy, platform architecture, feature planning, and overall product direction. Focuses on building a scalable school management platform that addresses real institutional requirements.",
    linkedin: "https://www.linkedin.com/in/khaqan-ahmad-91299b40a",
    github: "https://github.com/khaqanahmed2-afk",
  },
  {
    name: "Zikra Rahman",
    role: "Co-Founder, Product & Tech",
    badge: "Engineering & Solutions",
    image: "/founder-neutral-avatar.svg",
    description:
      "Contributes to product development, technical implementation, and platform improvements. Works on translating product requirements into functional, reliable, and user-friendly solutions.",
    linkedin: "https://www.linkedin.com/in/zikra-rahman-ab32263bb",
    github: "https://github.com/ZikraRahman",
    isPlaceholderImage: true,
  },
  {
    name: "Aqsa Ibrahim",
    role: "Co-Founder, Business & Growth",
    badge: "Strategy & Expansion",
    image: "/Aqsa%20Ibrahim.webp",
    fallbackImage: "https://my-zkool.vercel.app/Aqsa%20Ibrahim.webp",
    description:
      "Leads business development, market research, brand positioning, marketing initiatives, and growth strategy. Focuses on building MyZkool's presence and connecting the platform with educational institutions.",
    linkedin: "https://www.linkedin.com/in/aqsa-ibrahim-0bb7b2434/",
    github: "https://github.com/aqsaibrahim139-sketch",
  },
];

export const CORE_PRINCIPLES: CorePrinciple[] = [
  {
    number: "01",
    title: "Simplicity",
    description:
      "Technology should simplify school operations, not introduce unnecessary complexity. We prioritize intuitive interfaces and practical workflows.",
    icon: SlidersHorizontal,
    badgeText: "Intuitive Workflows",
  },
  {
    number: "02",
    title: "Connectivity",
    description:
      "Schools work best when administrators, teachers, students, and parents remain connected through a unified digital environment.",
    icon: Share2,
    badgeText: "Unified Ecosystem",
  },
  {
    number: "03",
    title: "Accessibility",
    description:
      "Powerful school management technology should be accessible to institutions of different sizes and budgets.",
    icon: Boxes,
    badgeText: "Affordable Scale",
  },
  {
    number: "04",
    title: "Reliability",
    description:
      "Educational institutions depend on accurate information and consistent systems. We prioritize dependable functionality and responsible product development.",
    icon: ShieldCheck,
    badgeText: "Data Integrity",
  },
  {
    number: "05",
    title: "Continuous Improvement",
    description:
      "We continuously refine our platform based on real requirements, feedback, and the evolving needs of educational institutions.",
    icon: TrendingUp,
    badgeText: "Evolving Platform",
  },
];

export const STAKEHOLDER_PILLARS: StakeholderPillar[] = [
  {
    id: "admins",
    title: "School Administrators",
    tagline: "Centralized Institutional Control",
    description:
      "Manage admissions, student records, fees, staff, attendance, and institutional operations from a centralized dashboard.",
    icon: School,
    badge: "Administration",
    highlights: ["Student Admissions & Records", "Fee Collection & Ledger", "Staff & Operations Management"],
  },
  {
    id: "teachers",
    title: "Teachers",
    tagline: "Productive Classroom Management",
    description:
      "Organize classes, manage attendance, track academic progress, and access essential classroom tools.",
    icon: BookOpen,
    badge: "Academics",
    highlights: ["Attendance Tracking", "Assessments & Grading", "Curriculum Organization"],
  },
  {
    id: "students",
    title: "Students",
    tagline: "Transparent Academic Journeys",
    description:
      "Access academic information, monitor progress, and stay informed about their educational activities.",
    icon: GraduationCap,
    badge: "Learning",
    highlights: ["Academic Information", "Performance Records", "Timetable & Events"],
  },
  {
    id: "parents",
    title: "Parents",
    tagline: "Instant, Transparent Communication",
    description:
      "Stay connected with schools through timely updates, important information, and improved communication.",
    icon: Users,
    badge: "Engagement",
    highlights: ["Real-time Fee Receipts", "Attendance Notifications", "Direct School Communication"],
  },
];

// Backward-compatibility alias if needed anywhere
export const BELIEFS = CORE_PRINCIPLES.slice(0, 3);
