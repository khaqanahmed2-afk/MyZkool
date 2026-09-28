/**
 * Transport Service Interface (Spec D1, C7.8)
 * Real implementation connecting Students module with Transport module.
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  getStudentTransportDetails,
  endStudentTransportAssignment,
} from "./transportAssignmentService";

export interface TransportService {
  /**
   * Get student's transport assignment
   * @param studentId - Student UUID
   * @param schoolId - Optional school UUID
   * @returns Transport assignment details
   */
  getStudentTransport(studentId: string, schoolId?: string): Promise<{ 
    assignment?: {
      id: string;
      route_id: string;
      route_name: string;
      stop_id: string;
      stop_name: string;
      pickup_time: string;
      drop_time: string;
      monthly_fee: number;
    } | null; 
    error?: string;
  }>;

  /**
   * End transport assignment when student withdraws/transfers
   * @param studentId - Student UUID
   * @param date - Effective date
   * @param reason - Reason for ending
   * @param schoolId - Optional school UUID
   * @returns Success status
   */
  endAssignment(
    studentId: string,
    date: string,
    reason: string,
    schoolId?: string
  ): Promise<{ success: boolean; error?: string }>;
}

async function findStudentSchoolId(studentId: string): Promise<string | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from("students")
      .select("school_id")
      .eq("id", studentId)
      .maybeSingle();
    if (data?.school_id) return data.school_id;
  }
  if (typeof localStorage !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("myzkool_students_")) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || "[]");
          const found = list.find((s: any) => s.id === studentId);
          if (found?.school_id) return found.school_id;
        } catch {}
      }
    }
  }
  return null;
}

export class RealTransportService implements TransportService {
  private defaultSchoolId?: string;

  constructor(schoolId?: string) {
    this.defaultSchoolId = schoolId;
  }

  async getStudentTransport(studentId: string, schoolId?: string) {
    const targetSchoolId = schoolId || this.defaultSchoolId || (await findStudentSchoolId(studentId));
    if (!targetSchoolId) {
      return { assignment: null };
    }

    try {
      const details = await getStudentTransportDetails(targetSchoolId, studentId);
      if (!details.assignment) {
        return { assignment: null };
      }

      const a = details.assignment;
      return {
        assignment: {
          id: a.id,
          route_id: a.route_id,
          route_name: a.route_name || "Route",
          stop_id: a.pickup_stop_id,
          stop_name: a.pickup_stop_name || "Stop",
          pickup_time: a.pickup_time || "",
          drop_time: a.drop_time || "",
          monthly_fee: Math.round(a.monthly_fee_paise / 100),
        },
      };
    } catch (e: any) {
      return { assignment: null, error: e.message };
    }
  }

  async endAssignment(
    studentId: string,
    date: string,
    reason: string,
    schoolId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const targetSchoolId = schoolId || this.defaultSchoolId || (await findStudentSchoolId(studentId));
    if (!targetSchoolId) {
      return { success: true };
    }

    return endStudentTransportAssignment(targetSchoolId, studentId, date, reason);
  }
}

export function createTransportService(schoolId: string): TransportService {
  return new RealTransportService(schoolId);
}

// Export singleton instance
export const transportService: TransportService = new RealTransportService();