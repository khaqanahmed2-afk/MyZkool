import { Zap, Users, ShieldCheck } from "lucide-react";

export interface Founder {
  name: string;
  role: string;
  badge: string;
  image: string;
  description: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
}

export const FOUNDERS: Founder[] = [
  {
    name: "Khaqan Ahmad",
    role: "Founder & Product Lead",
    badge: "Founder",
    image: "/Khaqan%20Ahmad.jpg",
    description:
      "Handles product strategy, feature planning, subscription model and overall direction of MyZkool.",
    linkedin: "https://www.linkedin.com/in/khaqan-ahmad-91299b40a",
    github: "https://github.com/khaqanahmed2-afk",
    instagram: "https://www.instagram.com/khaqanlife",
  },
  {
    name: "Ahiri Naskar",
    role: "Co Founder, Business & Growth",
    badge: "Co Founder",
    image: "/Ahiri%20Naskar.png",
    description:
      "Manages online presence, research, marketing, and business development.",
    linkedin: "https://www.linkedin.com/in/ahiri-naskar-769900347/",
    github: undefined,
    instagram: "https://www.instagram.com/ahiri_naskar12",
  },
  {
    name: "Aqsa Ibrahim",
    role: "Co Founder, Product & Tech",
    badge: "Co Founder",
    image: "/Aqsa%20Ibrahim.jpg",
    description:
      "Builds the product with me, handles development and technical execution.",
    linkedin: "https://www.linkedin.com/in/aqsa-ibrahim-0bb7b2434/",
    github: "https://github.com/aqsaibrahim139-sketch",
    instagram: "https://www.instagram.com/aqsa_ibrahim783",
  },
];

export const BELIEFS = [
  {
    number: "01",
    icon: Zap,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    title: "Simple",
    text: "Easy to use tools designed for school administrators, teachers and parents.",
  },
  {
    number: "02",
    icon: Users,
    iconColor: "text-[#2158E0]",
    iconBg: "bg-blue-50",
    title: "Connected",
    text: "Bring schools, teachers, students and parents onto one connected platform.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Built for Schools",
    text: "Purpose built features for the everyday needs of modern schools.",
  },
];
