import {
  Users,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  Globe,
  UserPlus,
  BarChart3,
  BedDouble,
  BookOpen,
  MonitorPlay,
  Smartphone,
  BrainCircuit,
  Users2,
  Banknote,
  Building2,
  Languages,
  School,
  Settings2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import type { FAQItem, ComparisonRow } from "../types/landing";

/* ── Hero Feature Pills ─────────────────────────────────────────── */
export const FEATURE_PILLS = [
  { label: "Admissions", icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Students", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Attendance", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Fees", icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Communication", icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50" },
  { label: "Reports", icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "School Website", icon: Globe, color: "text-teal-600", bg: "bg-teal-50" },
];

/* ── Hero Feature Strip ─────────────────────────────────────────── */
export const FEATURE_STRIP_ITEMS = [
  {
    num: "01",
    icon: Users,
    title: "Student Management",
    desc: "Keep all student data, documents and profiles in one place.",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    num: "02",
    icon: CalendarCheck,
    title: "Attendance",
    desc: "Track attendance easily for students and staff.",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    num: "03",
    icon: CreditCard,
    title: "Fee Management",
    desc: "Automate fees, send reminders and track payments.",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
  },
  {
    num: "04",
    icon: MessageSquare,
    title: "Parent Communication",
    desc: "Stay connected with parents in real time.",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
  },
  {
    num: "05",
    icon: Globe,
    title: "School Website",
    desc: "Create a beautiful, professional website for your school.",
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
  },
];

/* ── Trust Strip Claims ─────────────────────────────────────────── */
export const TRUST_CLAIMS = [
  {
    title: "One platform",
    detail: "website + ERP + WhatsApp",
    icon: School,
  },
  {
    title: "No IT team required",
    detail: "zero technical burden",
    icon: Users,
  },
  {
    title: "Setup with our team",
    detail: "guided, not a manual",
    icon: ShieldCheck,
  },
  {
    title: "Built for Indian school workflows",
    detail: "CBSE, ICSE & State Boards",
    icon: CheckCircle2,
  },
];

/* ── How It Works 4 Steps ────────────────────────────────────────── */
export const HOW_IT_WORKS_STEPS = [
  {
    number: "01",
    tag: "Step 1",
    title: "Tell Us About Your School",
    desc: "Name, board, classes and sections: we set your account up around your school, not a generic template.",
    icon: School,
  },
  {
    number: "02",
    tag: "Step 2",
    title: "We Configure Your Website & ERP",
    desc: "Our team sets up your website, fee structure and class lists with you, not for you to figure out alone.",
    icon: Settings2,
  },
  {
    number: "03",
    tag: "Step 3",
    title: "Your Staff Start Using It",
    desc: "Attendance, fees and admissions move onto MyZkool with dedicated support while your team gets comfortable.",
    icon: Users,
  },
  {
    number: "04",
    tag: "Step 4",
    title: "Parents Get Updates on WhatsApp",
    desc: "No app to install. Parents start receiving fee reminders, attendance and notices from day one.",
    icon: MessageSquare,
  },
];

/* ── Product Roadmap Items ───────────────────────────────────────── */
export const ROADMAP_ITEMS = [
  { title: "Hostel Management", icon: BedDouble, desc: "Room allocation, mess billing and warden approvals" },
  { title: "Library Management", icon: BookOpen, desc: "Barcode book issue, return alerts and fine tracking" },
  { title: "Online Classes and LMS integration", icon: MonitorPlay, desc: "Video lessons, homework submissions and quiz bank" },
  { title: "Native Parent Mobile App", icon: Smartphone, desc: "For parents who prefer a dedicated mobile portal" },
  { title: "AI Fee Default and Attendance Risk Predictions", icon: BrainCircuit, desc: "Proactive alerts to prevent student dropouts and fee defaults" },
  { title: "Alumni Network", icon: Users2, desc: "Graduating batch directory, fundraisers and reunions" },
  { title: "Payroll and Staff HR", icon: Banknote, desc: "Teacher salary generation, PF slips and biometric sync" },
  { title: "Multi Branch and School Group Management", icon: Building2, desc: "Unified dashboard for trust boards with multiple campuses" },
  { title: "Regional language interface (Hindi and more)", icon: Languages, desc: "Hindi, Marathi, Gujarati, Tamil and Telugu UI toggles" },
];

/* ── Pricing Comparison Table ────────────────────────────────────── */
export const PRICING_COMPARISON_ROWS: ComparisonRow[] = [
  { feature: "Website Builder", basic: true, pro: true, custom: true },
  { feature: "Admissions Pipeline", basic: true, pro: true, custom: true },
  { feature: "Fees & Payments", basic: true, pro: true, custom: true },
  { feature: "Attendance & Roll Call", basic: true, pro: true, custom: true },
  { feature: "WhatsApp Communication", basic: true, pro: true, custom: true },
  { feature: "Exams & Report Cards", basic: false, pro: true, custom: true },
  { feature: "Timetable & Schedule", basic: false, pro: true, custom: true },
  { feature: "Staff & Student Records", basic: false, pro: true, custom: true },
  { feature: "Transport Tracking", basic: false, pro: true, custom: true },
  { feature: "Priority Support", basic: false, pro: true, custom: true },
  { feature: "Multi Branch Management", basic: false, pro: false, custom: true },
  { feature: "Dedicated Onboarding", basic: false, pro: false, custom: true },
  { feature: "Custom Reporting", basic: false, pro: false, custom: true },
  { feature: "Student capacity", basic: "Up to 800", pro: "Up to 1,800", custom: "1,800+" },
];

/* ── FAQ Items ───────────────────────────────────────────────────── */
export const FAQS: FAQItem[] = [
  {
    question: "Do we need an IT person to set this up?",
    answer: "No. Our team sets up your website and ERP with you during onboarding. We train your administrative staff, configure your fee heads, and get your classes running smoothly without requiring technical staff.",
  },
  {
    question: "Will parents need to download an app?",
    answer: "No. All parent communication works over WhatsApp, which they already use. Fee reminders, attendance notices, and student report cards arrive in their existing chat window with instant open rates.",
  },
  {
    question: "Can we move our existing student data in?",
    answer: "Yes. Our onboarding team helps migrate student, fee and attendance records from your current registers or spreadsheets. You can share your Excel files or physical registers and we handle the data formatting.",
  },
  {
    question: "Is our school's data secure?",
    answer: "Yes. Data is access controlled by role, so only authorized staff see what they should. Teachers only access their assigned classes, accountants handle fee books, and principals maintain total oversight.",
  },
];
