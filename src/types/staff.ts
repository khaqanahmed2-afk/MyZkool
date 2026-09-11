/**
 * Staff Data Models and Types for MyZkool
 * Tenant-scoped staff directory (teachers, accountants)
 */

export type StaffRole = "teacher" | "accountant";

export type StaffStatus = "active" | "archived" | "inactive";

export interface StaffMember {
  id: string;
  school_id: string;
  user_id?: string | null;
  employee_code?: string | null;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: StaffRole;
  designation?: string | null;
  joining_date?: string | null;
  status: StaffStatus;
  created_at: string;
  updated_at: string;
}

export interface StaffInput {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  designation?: string;
  employee_code?: string;
  joining_date?: string;
  status?: StaffStatus;
}

export interface StaffUpdateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  designation?: string;
  employee_code?: string;
  joining_date?: string;
  status?: StaffStatus;
}

export interface StaffRoleDefinition {
  role: StaffRole;
  label: string;
  description: string;
  commonDesignations: string[];
}

export const STAFF_ROLE_DEFINITIONS: Record<StaffRole, StaffRoleDefinition> = {
  teacher: {
    role: "teacher",
    label: "Teacher / Faculty",
    description: "Subject instruction, gradebook management, and student attendance",
    commonDesignations: [
      "Mathematics Teacher",
      "Science Teacher",
      "English Literature Teacher",
      "Social Studies Teacher",
      "Head of Department",
      "Primary Grade Educator",
      "Physical Education Instructor",
      "Computer Science Teacher",
    ],
  },
  accountant: {
    role: "accountant",
    label: "Accountant / Finance",
    description: "Tuition fee collection, invoicing, financial vouchers, and billing",
    commonDesignations: [
      "Head Accountant",
      "Senior Accountant",
      "Accounts Executive",
      "Bursar",
      "Cashier",
      "Finance Officer",
    ],
  },
};
