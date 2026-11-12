/**
 * Student ID Card Studio Service
 * Multi-tenant, secure ID card generation, customization persistence,
 * token management, and public verification.
 */

import QRCode from "qrcode";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { StudentIdCardItem } from "./studentOperationsService";

export type CardStatus = "active" | "inactive" | "revoked";

export interface EnrichedStudentIdCard extends StudentIdCardItem {
  roll_no?: string | null;
  admission_date?: string | null;
  student_address?: string | null;
  guardian_relation?: string | null;
  emergency_contact?: string | null;
  academic_session?: string | null;
  school_address?: string | null;
  school_phone?: string | null;
  school_email?: string | null;
  card_status: CardStatus;
  verification_token: string;
  verification_url: string;
  id_card_record_id?: string | null;
  revocation_reason?: string | null;
  issued_at?: string;
  valid_until?: string | null;
}

export interface IdCardCustomization {
  themeId: string;
  primaryColor: string;
  secondaryColor: string;
  showSchoolLogo: boolean;
  schoolNameOverride: string;
  sessionOverride: string;
  showStudentPhoto: boolean;
  photoShape: "rounded" | "square" | "circle";
  // Field toggles
  showBloodGroup: boolean;
  showDob: boolean;
  showRollNo: boolean;
  showAdmissionNo: boolean;
  showClassSection: boolean;
  showAdmissionDate: boolean;
  showStudentAddress: boolean;
  showGuardianName: boolean;
  showGuardianRelation: boolean;
  showEmergencyContact: boolean;
  showSchoolAddress: boolean;
  showSchoolContact: boolean;
  // Verification & Codes
  showQrCode: boolean;
  showBarcode: boolean;
  // Signatures
  showPrincipalSignature: boolean;
  principalTitle: string;
  principalSignatureUrl?: string | null;
  showStudentSignature: boolean;
  studentSignatureTitle: string;
  // Disclaimer
  disclaimerText: string;
}

export const DEFAULT_CUSTOMIZATION: IdCardCustomization = {
  themeId: "modern_blue_yellow",
  primaryColor: "#1E3A8A", // Royal Blue
  secondaryColor: "#EAB308", // Vivid Amber / Golden Yellow
  showSchoolLogo: true,
  schoolNameOverride: "",
  sessionOverride: "",
  showStudentPhoto: true,
  photoShape: "rounded",
  showBloodGroup: true,
  showDob: true,
  showRollNo: true,
  showAdmissionNo: true,
  showClassSection: true,
  showAdmissionDate: true,
  showStudentAddress: true,
  showGuardianName: true,
  showGuardianRelation: true,
  showEmergencyContact: true,
  showSchoolAddress: true,
  showSchoolContact: true,
  showQrCode: true,
  showBarcode: true,
  showPrincipalSignature: true,
  principalTitle: "Principal",
  principalSignatureUrl: null,
  showStudentSignature: true,
  studentSignatureTitle: "Student Signature",
  disclaimerText:
    "This card is the official property of the school. If found, please return to the school administration address. Unauthorized duplication or alteration is strictly prohibited.",
};

const CUSTOMIZATION_STORAGE_KEY_PREFIX = "myzkool_id_card_settings_";

export function getIdCardCustomization(schoolId: string): IdCardCustomization {
  if (typeof localStorage === "undefined" || !schoolId) {
    return DEFAULT_CUSTOMIZATION;
  }
  try {
    const raw = localStorage.getItem(`${CUSTOMIZATION_STORAGE_KEY_PREFIX}${schoolId}`);
    if (raw) {
      return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("Failed to read id card customization from storage:", err);
  }
  return DEFAULT_CUSTOMIZATION;
}

export function saveIdCardCustomization(
  schoolId: string,
  settings: Partial<IdCardCustomization>
): IdCardCustomization {
  const current = getIdCardCustomization(schoolId);
  const updated = { ...current, ...settings };
  if (typeof localStorage !== "undefined" && schoolId) {
    try {
      localStorage.setItem(`${CUSTOMIZATION_STORAGE_KEY_PREFIX}${schoolId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to persist id card customization:", err);
    }
  }
  return updated;
}

/**
 * Generates an unpredictable, cryptographically random verification token.
 */
export function generateRandomToken(prefix: string = "mzk"): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      token += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `${prefix}_${token}`;
}

/**
 * Generates a high-contrast, high-error-correction QR code data URL using local `qrcode` package.
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 256,
      color: {
        dark: "#0F172A", // Deep Slate
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR code locally:", err);
    return "";
  }
}

/**
 * Fetches enriched student ID card data with complete academic, guardian, address,
 * and token metadata.
 */
export async function fetchEnrichedStudentIdCards(
  schoolId: string,
  options?: {
    studentId?: string;
    studentIds?: string[];
    classId?: string;
    sectionId?: string;
  }
): Promise<EnrichedStudentIdCard[]> {
  if (!schoolId) return [];

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://myzkool.com";

  let students: any[] = [];
  let enrollments: any[] = [];
  let studentParents: any[] = [];
  let parents: any[] = [];
  let addresses: any[] = [];
  let classes: any[] = [];
  let sections: any[] = [];
  let academicYearLabel = "2026-2027";
  let schoolInfo: any = {
    name: "Peace Convent School",
    logo_url: null,
    address: "",
    city: "",
    state: "",
    pin_code: "",
    contact_phone: "",
    official_email: "",
  };
  let existingCards: any[] = [];

  const hasSpecificTarget = Boolean(options?.studentId || (options?.studentIds && options.studentIds.length > 0));

  if (isSupabaseConfigured) {
    // 1. Fetch Students
    let sq = supabase
      .from("students")
      .select("id, school_id, admission_no, first_name, middle_name, last_name, dob, blood_group, photo_path, admission_date, status")
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (options?.studentId) {
      sq = sq.eq("id", options.studentId);
    } else if (options?.studentIds && options.studentIds.length > 0) {
      sq = sq.in("id", options.studentIds);
    } else {
      sq = sq.eq("status", "enrolled");
    }

    const sRes = await sq;
    if (sRes.data) students = sRes.data;

    if (students.length === 0) return [];

    const targetStudentIds = students.map((s) => s.id);

    // 2. School Profile
    const scRes = await supabase
      .from("schools")
      .select("id, name, logo_url, address, city, state, pin_code, contact_phone, official_email")
      .eq("id", schoolId)
      .maybeSingle();

    if (scRes.data) {
      schoolInfo = { ...schoolInfo, ...scRes.data };
    }

    // 3. Academic Year
    const ayRes = await supabase
      .from("academic_years")
      .select("label, is_current")
      .eq("school_id", schoolId)
      .order("is_current", { ascending: false })
      .limit(1);

    if (ayRes.data && ayRes.data.length > 0 && ayRes.data[0].label) {
      academicYearLabel = ayRes.data[0].label;
    }

    // 4. Enrollments, Student Parents, Addresses, Classes, Sections, ID Cards
    let enrQ = supabase.from("student_enrollments").select("*").eq("school_id", schoolId);
    let spQ = supabase.from("student_parents").select("*").eq("school_id", schoolId);
    let addrQ = supabase.from("student_addresses").select("*").eq("school_id", schoolId);
    let cardsQ = supabase.from("student_id_cards").select("*").eq("school_id", schoolId);

    if (hasSpecificTarget) {
      enrQ = enrQ.in("student_id", targetStudentIds);
      spQ = spQ.in("student_id", targetStudentIds);
      addrQ = addrQ.in("student_id", targetStudentIds);
      cardsQ = cardsQ.in("student_id", targetStudentIds);
    }

    const [enrRes, spRes, addrRes, clsRes, secRes, cardsRes] = await Promise.all([
      enrQ,
      spQ,
      addrQ,
      supabase.from("classes").select("id, name").eq("school_id", schoolId),
      supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId),
      cardsQ,
    ]);

    if (enrRes.data) enrollments = enrRes.data;
    if (spRes.data) studentParents = spRes.data;
    if (addrRes.data) addresses = addrRes.data;
    if (clsRes.data) classes = clsRes.data;
    if (secRes.data) sections = secRes.data;
    if (cardsRes.data) existingCards = cardsRes.data;

    // 5. Parents
    const parentIds = Array.from(new Set(studentParents.map((sp) => sp.parent_id))).filter(Boolean);
    if (parentIds.length > 0) {
      const pRes = await supabase
        .from("parents")
        .select("id, full_name, phone, whatsapp_phone, email")
        .eq("school_id", schoolId)
        .in("id", parentIds)
        .is("deleted_at", null);
      if (pRes.data) parents = pRes.data;
    }
  } else if (typeof localStorage !== "undefined") {
    // Offline / LocalStorage Fallback
    try {
      const rawS = localStorage.getItem(`myzkool_students_${schoolId}`);
      const allS = rawS ? JSON.parse(rawS) : [];
      const nonDeleted = allS.filter((s: any) => !s.deleted_at);

      if (options?.studentId) {
        students = nonDeleted.filter((s: any) => s.id === options.studentId);
      } else if (options?.studentIds && options.studentIds.length > 0) {
        const idSet = new Set(options.studentIds);
        students = nonDeleted.filter((s: any) => idSet.has(s.id));
      } else {
        students = nonDeleted.filter((s: any) => s.status === "enrolled");
      }

      const rawE = localStorage.getItem(`myzkool_student_enrollments_${schoolId}`);
      enrollments = rawE ? JSON.parse(rawE) : [];

      const rawSP = localStorage.getItem(`myzkool_student_parents_${schoolId}`);
      studentParents = rawSP ? JSON.parse(rawSP) : [];

      const rawP = localStorage.getItem(`myzkool_parents_${schoolId}`);
      parents = rawP ? JSON.parse(rawP) : [];

      const rawA = localStorage.getItem(`myzkool_student_addresses_${schoolId}`);
      addresses = rawA ? JSON.parse(rawA) : [];

      const rawC = localStorage.getItem(`myzkool_classes_${schoolId}`);
      classes = rawC ? JSON.parse(rawC) : [];

      const rawSec = localStorage.getItem(`myzkool_sections_${schoolId}`);
      sections = rawSec ? JSON.parse(rawSec) : [];

      const rawSchool =
        localStorage.getItem(`myzkool_school_profile_school_${schoolId}`) ||
        localStorage.getItem("myzkool_school_profile");
      if (rawSchool) {
        schoolInfo = { ...schoolInfo, ...JSON.parse(rawSchool) };
      }

      const rawCards = localStorage.getItem(`myzkool_student_id_cards_${schoolId}`);
      existingCards = rawCards ? JSON.parse(rawCards) : [];
    } catch (err) {
      console.warn("Failed reading fallback data from localStorage:", err);
    }
  }

  // Lookup maps
  const enrollmentMap = new Map<string, any>();
  enrollments.forEach((e) => {
    if (e.status === "active" || !enrollmentMap.has(e.student_id)) {
      enrollmentMap.set(e.student_id, e);
    }
  });

  const classMap = new Map<string, string>();
  classes.forEach((c) => classMap.set(c.id, c.name));

  const sectionMap = new Map<string, string>();
  sections.forEach((s) => sectionMap.set(s.id, s.name));

  const parentMap = new Map<string, any>();
  parents.forEach((p) => parentMap.set(p.id, p));

  const addressMap = new Map<string, any>();
  addresses.forEach((a) => {
    if (a.kind === "current" || !addressMap.has(a.student_id)) {
      addressMap.set(a.student_id, a);
    }
  });

  const cardsMap = new Map<string, any>();
  existingCards.forEach((c) => cardsMap.set(c.student_id, c));

  // Filter by class / section if not single student target
  if (options?.classId && options.classId !== "all") {
    students = students.filter((s) => {
      const enr = enrollmentMap.get(s.id);
      return enr?.class_id === options.classId;
    });
  }

  if (options?.sectionId && options.sectionId !== "all") {
    students = students.filter((s) => {
      const enr = enrollmentMap.get(s.id);
      return enr?.section_id === options.sectionId;
    });
  }

  const schoolFullAddress = [
    schoolInfo.address,
    schoolInfo.city,
    schoolInfo.state ? `${schoolInfo.state} - ${schoolInfo.pin_code || ""}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // Missing cards to create in DB batch
  const cardsToInsert: any[] = [];

  const results: EnrichedStudentIdCard[] = students.map((s) => {
    const enr = enrollmentMap.get(s.id);
    const existingCard = cardsMap.get(s.id);

    // Associated Parents
    const sParents = studentParents.filter((sp) => sp.student_id === s.id);
    const primaryLink = sParents.find((sp) => sp.is_primary_contact);
    const emergencyLink = sParents.find((sp) => sp.is_emergency_contact);
    const fatherLink = sParents.find((sp) => sp.relation === "father");
    const motherLink = sParents.find((sp) => sp.relation === "mother");

    const primaryParent = primaryLink ? parentMap.get(primaryLink.parent_id) : null;
    const emergencyParent = emergencyLink ? parentMap.get(emergencyLink.parent_id) : null;
    const father = fatherLink ? parentMap.get(fatherLink.parent_id) : null;
    const mother = motherLink ? parentMap.get(motherLink.parent_id) : null;

    const chosenParent = primaryParent || father || mother || (sParents[0] ? parentMap.get(sParents[0].parent_id) : null);
    const guardianRelation = primaryLink?.relation || fatherLink?.relation || motherLink?.relation || "Guardian";
    const guardianName = chosenParent?.full_name || "Parent/Guardian";
    const guardianPhone = chosenParent?.phone || chosenParent?.whatsapp_phone || "N/A";
    const emergencyPhone = emergencyParent?.phone || guardianPhone;

    // Student Address
    const addr = addressMap.get(s.id);
    const formattedAddress = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.pin].filter(Boolean).join(", ")
      : "Address on file with administration";

    const className = (enr?.class_id && classMap.get(enr.class_id)) || enr?.class_id || "Class 1";
    const sectionName = (enr?.section_id && sectionMap.get(enr.section_id)) || enr?.section_id || null;
    const rollNo = enr?.roll_no || null;

    // Card Token & Status
    let cardStatus: CardStatus = "active";
    let token = existingCard?.verification_token;
    let cardRecordId = existingCard?.id || null;
    let revocationReason = existingCard?.revocation_reason || null;
    let issuedAt = existingCard?.issued_at || new Date().toISOString();
    let validUntil = existingCard?.valid_until || null;

    if (existingCard) {
      cardStatus = (existingCard.card_status as CardStatus) || "active";
    } else {
      token = generateRandomToken(`std_${s.admission_no.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
      cardsToInsert.push({
        school_id: schoolId,
        student_id: s.id,
        verification_token: token,
        card_status: "active",
        theme_id: "modern_blue_yellow",
        issued_at: new Date().toISOString(),
      });
    }

    const verificationUrl = `${origin}/verify/student/${token}`;
    const fullName = `${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ""} ${s.last_name}`.trim();

    return {
      student_id: s.id,
      admission_no: s.admission_no,
      first_name: s.first_name,
      last_name: s.last_name,
      full_name: fullName,
      photo_url: s.photo_path || null,
      class_id: enr?.class_id || null,
      class_name: className,
      section_id: enr?.section_id || null,
      section_name: sectionName,
      roll_no: rollNo,
      admission_date: s.admission_date || null,
      father_name: father?.full_name || null,
      guardian_name: guardianName,
      guardian_relation: guardianRelation,
      guardian_phone: guardianPhone,
      emergency_contact: emergencyPhone,
      student_address: formattedAddress,
      blood_group: s.blood_group || null,
      dob: s.dob,
      academic_session: academicYearLabel,
      qr_payload: verificationUrl,
      school_name: schoolInfo.name || "MyZkool Academy",
      school_logo_url: schoolInfo.logo_url || null,
      school_address: schoolFullAddress,
      school_phone: schoolInfo.contact_phone || "N/A",
      school_email: schoolInfo.official_email || "admin@school.edu",
      card_status: cardStatus,
      verification_token: token,
      verification_url: verificationUrl,
      id_card_record_id: cardRecordId,
      revocation_reason: revocationReason,
      issued_at: issuedAt,
      valid_until: validUntil,
    };
  });

  // Persist newly minted card tokens asynchronously
  if (cardsToInsert.length > 0) {
    if (isSupabaseConfigured) {
      supabase
        .from("student_id_cards")
        .upsert(cardsToInsert, { onConflict: "school_id,student_id" })
        .then(({ error }) => {
          if (error) console.warn("Notice: could not upsert card tokens to Supabase:", error.message);
        });
    } else if (typeof localStorage !== "undefined") {
      try {
        const combined = [...existingCards, ...cardsToInsert];
        localStorage.setItem(`myzkool_student_id_cards_${schoolId}`, JSON.stringify(combined));
      } catch {}
    }
  }

  return results;
}

/**
 * Update the status of an ID card (Active, Inactive, Revoked).
 */
export async function updateStudentCardStatus(
  schoolId: string,
  studentId: string,
  status: CardStatus,
  revocationReason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !studentId) {
    return { success: false, error: "School ID and Student ID are required." };
  }

  try {
    if (isSupabaseConfigured) {
      const updatePayload: any = {
        card_status: status,
        updated_at: new Date().toISOString(),
      };
      if (status === "revoked") {
        updatePayload.revocation_reason = revocationReason || "Card reported lost or revoked by administration.";
      } else {
        updatePayload.revocation_reason = null;
      }

      const { error } = await supabase
        .from("student_id_cards")
        .update(updatePayload)
        .eq("school_id", schoolId)
        .eq("student_id", studentId);

      if (error) throw error;
    }

    if (typeof localStorage !== "undefined") {
      const rawCards = localStorage.getItem(`myzkool_student_id_cards_${schoolId}`);
      const cards = rawCards ? JSON.parse(rawCards) : [];
      const idx = cards.findIndex((c: any) => c.student_id === studentId);
      if (idx >= 0) {
        cards[idx].card_status = status;
        cards[idx].revocation_reason = status === "revoked" ? revocationReason : null;
        cards[idx].updated_at = new Date().toISOString();
        localStorage.setItem(`myzkool_student_id_cards_${schoolId}`, JSON.stringify(cards));
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to update student card status:", err);
    return { success: false, error: err.message || "Failed to update card status." };
  }
}

export interface CardVerificationPublicResult {
  is_valid: boolean;
  card_status?: CardStatus;
  student_name?: string;
  admission_no?: string;
  roll_no?: string;
  class_name?: string;
  section_name?: string;
  school_name?: string;
  school_city?: string;
  school_state?: string;
  school_logo_url?: string | null;
  photo_url?: string | null;
  issued_at?: string;
  valid_until?: string | null;
  revocation_reason?: string | null;
  error?: string;
}

/**
 * Public verification endpoint function: safely checks token validity without leaking private student PII.
 */
export async function verifyStudentCardToken(token: string): Promise<CardVerificationPublicResult> {
  if (!token) {
    return { is_valid: false, error: "Missing verification token." };
  }

  try {
    // 1. Try server-side Supabase RPC function
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc("verify_student_card_public", {
        p_token: token,
      });

      if (!error && data) {
        return data as CardVerificationPublicResult;
      }
    }

    // 2. Try REST API endpoint
    try {
      const resp = await fetch(`/api/public/verify/student/${encodeURIComponent(token)}`);
      if (resp.ok) {
        const json = await resp.json();
        return json as CardVerificationPublicResult;
      }
    } catch {}

    // 3. Fallback to localStorage scan if in offline/demo mode
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("myzkool_student_id_cards_")) {
          const raw = localStorage.getItem(key);
          const cards = raw ? JSON.parse(raw) : [];
          const match = cards.find((c: any) => c.verification_token === token);
          if (match) {
            const schoolId = match.school_id;
            const studentId = match.student_id;
            const rawS = localStorage.getItem(`myzkool_students_${schoolId}`);
            const students = rawS ? JSON.parse(rawS) : [];
            const student = students.find((s: any) => s.id === studentId);

            const rawSchool =
              localStorage.getItem(`myzkool_school_profile_school_${schoolId}`) ||
              localStorage.getItem("myzkool_school_profile");
            const school = rawSchool ? JSON.parse(rawSchool) : {};

            return {
              is_valid: match.card_status === "active",
              card_status: match.card_status,
              student_name: student ? `${student.first_name} ${student.last_name}` : "Enrolled Student",
              admission_no: student?.admission_no || "N/A",
              roll_no: "N/A",
              class_name: "Enrolled Grade",
              section_name: "A",
              school_name: school.name || "Peace Convent School",
              school_city: school.city || "Mawai",
              school_state: school.state || "Uttar Pradesh",
              school_logo_url: school.logo_url || null,
              photo_url: student?.photo_path || null,
              issued_at: match.issued_at,
              valid_until: match.valid_until,
              revocation_reason: match.revocation_reason,
            };
          }
        }
      }
    }

    return {
      is_valid: false,
      error: "Verification record not found or expired.",
    };
  } catch (err: any) {
    return {
      is_valid: false,
      error: err.message || "Failed to verify student card.",
    };
  }
}
