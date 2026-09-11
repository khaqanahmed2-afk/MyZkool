/**
 * Domain types for Classes, Sections, Subjects and Curriculum configuration
 */

export interface SchoolClass {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  display_name?: string;
  sort_order: number;
  status: "active" | "archived";
  sections?: SchoolSection[];
  created_at?: string;
  updated_at?: string;
}

export interface SchoolSection {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  name: string;
  display_name?: string;
  sort_order: number;
  status: "active" | "archived";
  created_at?: string;
  updated_at?: string;
}

export type SubjectType = "core" | "elective" | "activity" | "other";

export interface Subject {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  code?: string;
  subject_type: SubjectType;
  status: "active" | "archived";
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClassSubject {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_id: string;
  subject_id: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // Hydrated references
  subject?: Subject;
}

export interface ClassInput {
  name: string;
  display_name?: string;
  sort_order?: number;
  initial_sections?: string[]; // e.g. ["A", "B"]
}

export interface SectionInput {
  name: string;
  display_name?: string;
  sort_order?: number;
}

export interface SubjectInput {
  name: string;
  code?: string;
  subject_type?: SubjectType;
  sort_order?: number;
}

export interface ClassTemplateOption {
  id: string;
  name: string;
  description: string;
  classes: {
    name: string;
    sections: string[];
  }[];
}

export const CLASS_STRUCTURE_TEMPLATES: ClassTemplateOption[] = [
  {
    id: "k12",
    name: "K-12 Full School",
    description: "Nursery, LKG, UKG and Class 1 to Class 12 with Section A & B",
    classes: [
      { name: "Nursery", sections: ["A"] },
      { name: "LKG", sections: ["A", "B"] },
      { name: "UKG", sections: ["A", "B"] },
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `Class ${i + 1}`,
        sections: ["A", "B"],
      })),
    ],
  },
  {
    id: "class_1_10",
    name: "Class 1 to Class 10",
    description: "Standard primary through secondary (Classes 1–10) with Section A & B",
    classes: Array.from({ length: 10 }, (_, i) => ({
      name: `Class ${i + 1}`,
      sections: ["A", "B"],
    })),
  },
  {
    id: "primary_1_5",
    name: "Primary Wing (Class 1–5)",
    description: "Primary grades 1 through 5 with Section A & B",
    classes: Array.from({ length: 5 }, (_, i) => ({
      name: `Class ${i + 1}`,
      sections: ["A", "B"],
    })),
  },
  {
    id: "preschool",
    name: "Early Childhood / Pre-School",
    description: "Playgroup, Nursery, LKG, and UKG",
    classes: [
      { name: "Playgroup", sections: ["A"] },
      { name: "Nursery", sections: ["A"] },
      { name: "LKG", sections: ["A", "B"] },
      { name: "UKG", sections: ["A", "B"] },
    ],
  },
];

export interface StandardSubjectPreset {
  name: string;
  code: string;
  subject_type: SubjectType;
  defaultForGrades?: "all" | "primary" | "secondary" | "senior";
}

export const STANDARD_SUBJECT_PRESETS: StandardSubjectPreset[] = [
  { name: "English", code: "ENG", subject_type: "core", defaultForGrades: "all" },
  { name: "Mathematics", code: "MAT", subject_type: "core", defaultForGrades: "all" },
  { name: "Science", code: "SCI", subject_type: "core", defaultForGrades: "all" },
  { name: "Social Science", code: "SOC", subject_type: "core", defaultForGrades: "all" },
  { name: "Hindi", code: "HIN", subject_type: "core", defaultForGrades: "all" },
  { name: "Computer Science", code: "CS", subject_type: "elective", defaultForGrades: "all" },
  { name: "Physical Education", code: "PE", subject_type: "activity", defaultForGrades: "all" },
  { name: "Art & Craft", code: "ART", subject_type: "activity", defaultForGrades: "primary" },
  { name: "Environmental Studies (EVS)", code: "EVS", subject_type: "core", defaultForGrades: "primary" },
  { name: "Physics", code: "PHY", subject_type: "core", defaultForGrades: "senior" },
  { name: "Chemistry", code: "CHE", subject_type: "core", defaultForGrades: "senior" },
  { name: "Biology", code: "BIO", subject_type: "core", defaultForGrades: "senior" },
];
