/**
 * Stage 3: Admission Wizard and Records Test Suite
 * Tests:
 * 1. Single-transaction admission (atomic commit of 12+ entities)
 * 2. Zero orphan rows on rollback (forced failure at multiple stages)
 * 3. Draft autosave, restore, and clear on admission
 * 4. Duplicate detection scoring (Aadhaar hash, Name + Phone, DOB + Mother)
 * 5. Aadhaar AES-256-GCM encryption, Verhoeff checksum, and audited reveal
 * 6. Medical data isolation and permission gating (403 HTTP)
 * 7. Document Vault: verify, reject with reason, and block delete of verified docs
 * 8. Parent phone-first lookup & sibling linking
 */

import {
  admitStudentTransactional,
  saveStudentDraft,
  getStudentDraft,
  deleteStudentDraft,
  checkStudentDuplicate,
  revealStudentAadhaar,
  getStudentMedical,
  updateStudentMedical,
  uploadStudentDocument,
  verifyStudentDocument,
  replaceStudentDocument,
  deleteStudentDocument,
  lookupParentByPhone,
  getStudentProfile,
  listStudents,
} from "../src/services/studentService";
import {
  validateVerhoeff,
  validateAadhaar,
  maskAadhaar,
  formatAadhaarInput,
} from "../src/utils/aadhaarValidation";
import {
  encryptSensitive,
  decryptSensitive,
  hashAadhaar,
} from "../src/utils/sensitiveCrypto";
import type { AdmissionWizardPayload } from "../src/types/students";

// In-memory localStorage polyfill for test environment
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) || null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: (index: number) => Array.from(store.keys())[index] || null,
  get length() {
    return store.size;
  },
} as Storage;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Reset local storage helper
function cleanLocalStorage() {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
}

async function runStage3Tests() {
  console.log("==========================================================");
  console.log("MYZKOOL STAGE 3: ADMISSION WIZARD & RECORDS TEST SUITE");
  console.log("==========================================================\n");

  cleanLocalStorage();
  const schoolId = "school-wizard-test";
  const actorId = "user-admin-1";

  // -------------------------------------------------------------------------
  // 1. Verhoeff Checksum & Aadhaar Validation
  // -------------------------------------------------------------------------
  console.log("1. Verhoeff Checksum & Aadhaar Format Validation (Spec 1.8, A4.2):");
  
  const rawAadhaar = "234567890124";
  assert(validateVerhoeff(rawAadhaar) === true, "Valid 12-digit UIDAI number passes Verhoeff checksum");
  assert(validateVerhoeff("234567890125") === false, "Altered 12-digit number fails Verhoeff checksum");
  assert(validateAadhaar("012345678901").valid === false, "Aadhaar starting with 0 fails validation");
  assert(validateAadhaar("112345678901").valid === false, "Aadhaar starting with 1 fails validation");
  assert(validateAadhaar("12345").valid === false, "Short number (<12 digits) fails validation");
  assert(maskAadhaar(rawAadhaar) === "XXXX-XXXX-0124", "maskAadhaar displays default masked format with last 4 digits");
  assert(formatAadhaarInput(rawAadhaar) === "2345 6789 0124", "formatAadhaarInput groups into 4-digit chunks");

  // AES-256-GCM and HMAC-SHA-256 tests
  const encrypted = encryptSensitive(rawAadhaar);
  assert(encrypted.payload.ciphertext !== rawAadhaar, "Ciphertext is distinct from plaintext Aadhaar");
  assert(typeof encrypted.payload.iv === "string" && encrypted.payload.iv.length > 0, "AES-256-GCM uses initialization vector");
  assert(typeof encrypted.payload.tag === "string" && encrypted.payload.tag.length > 0, "AES-256-GCM uses authentication tag");
  const decryptedPacked = decryptSensitive(encrypted.packed);
  assert(decryptedPacked === rawAadhaar, "Decryption of packed string reproduces original plaintext Aadhaar");
  const decryptedPayload = decryptSensitive(encrypted.payload);
  assert(decryptedPayload === rawAadhaar, "Decryption of payload object reproduces original plaintext Aadhaar");
  const decryptedBuffer = decryptSensitive(encrypted.buffer);
  assert(decryptedBuffer === rawAadhaar, "Decryption of combined buffer reproduces original plaintext Aadhaar");

  const hash1 = hashAadhaar(rawAadhaar);
  const hash2 = hashAadhaar("2345 6789 0124");
  assert(hash1 === hash2, "HMAC-SHA-256 search hash is deterministic regardless of spacing");
  assert(hash1 !== hashAadhaar("999988887777"), "Different Aadhaar yields distinct search hash");

  // -------------------------------------------------------------------------
  // 2. Draft Autosave & Restore (Spec A4.2)
  // -------------------------------------------------------------------------
  console.log("\n2. Draft Autosave, Restore, and Clear (Spec A4.2):");
  
  const draftPayload = {
    step1_basic: {
      first_name: "Rohan",
      last_name: "Verma",
      dob: "2018-05-14",
      gender: "male" as const,
    },
  };

  const saveRes = await saveStudentDraft(schoolId, actorId, 2, draftPayload);
  assert(saveRes.draft !== undefined, "Draft saved successfully to student_drafts");
  assert(saveRes.draft?.step === 2, "Draft records current step (2)");

  const getRes = await getStudentDraft(schoolId, actorId);
  assert(getRes.draft !== null, "getStudentDraft retrieves active draft for user");
  assert((getRes.draft?.payload as any)?.step1_basic?.first_name === "Rohan", "Draft payload contains previously saved fields");

  // -------------------------------------------------------------------------
  // 3. Single-Transaction Admission (Spec A4.2)
  // -------------------------------------------------------------------------
  console.log("\n3. Single-Transaction Atomic Admission (Spec A4.2):");

  const fullPayload: AdmissionWizardPayload = {
    step1_basic: {
      first_name: "Aarav",
      middle_name: "Kumar",
      last_name: "Sharma",
      dob: "2018-07-20",
      gender: "male",
      blood_group: "B+",
      nationality: "Indian",
      category: "general",
      religion: "Hindu",
      mother_tongue: "Hindi",
    },
    step2_guardian: {
      father: {
        relation: "father",
        full_name: "Ramesh Sharma",
        phone: "9876543210",
        email: "ramesh@example.com",
        occupation: "Engineer",
        is_primary_contact: true,
        whatsapp_consent: true,
      },
      mother: {
        relation: "mother",
        full_name: "Sunita Sharma",
        phone: "9876543211",
        is_primary_contact: false,
        whatsapp_consent: false,
      },
      current_address: {
        kind: "current",
        line1: "123 Gomti Nagar",
        city: "Lucknow",
        district: "Lucknow",
        state: "Uttar Pradesh",
        pin: "226010",
      },
      permanent_address: {
        kind: "permanent",
        line1: "123 Gomti Nagar",
        city: "Lucknow",
        district: "Lucknow",
        state: "Uttar Pradesh",
        pin: "226010",
      },
      same_as_current: true,
    },
    step3_academic: {
      academic_year_id: "ay-2026",
      admission_date: "2026-04-01",
      class_id: "class-1",
      section_id: "sec-1a",
      roll_no: "101",
      admission_type: "new",
      is_rte: false,
      medium: "English",
      previous_school: {
        school_name: "Lucknow Public Montessori",
        last_class: "UKG",
        tc_no: "TC-2025-998",
      },
    },
    step4_documents: [
      {
        doc_type: "birth_certificate",
        file_name: "aarav_birth_cert.pdf",
        mime: "application/pdf",
        size_bytes: 250000,
        status: "uploaded",
      },
      {
        doc_type: "passport_photo",
        file_name: "aarav_photo.jpg",
        mime: "image/jpeg",
        size_bytes: 85000,
        status: "uploaded",
      },
    ],
    step5_sensitive: {
      aadhaar_number: "234567890124",
    },
    step6_medical: {
      allergies: "Peanuts",
      conditions: "Mild asthma",
      medications: "Inhaler as required",
      emergency_instructions: "Call father immediately if asthma flare up",
      doctor_name: "Dr. A. K. Gupta",
      doctor_phone: "9415000001",
      preferred_hospital: "Sahara Hospital, Gomti Nagar",
    },
    step7_transport: {
      opt_in: true,
      route_id: "route-1",
      stop_id: "Patrakarpuram Chauraha",
      pickup: true,
      dropoff: true,
    },
    step8_fee: {
      fee_structure_id: "standard-class-1",
      discount_concession: "none",
    },
  };

  const admitRes = await admitStudentTransactional(schoolId, fullPayload, actorId, "admin");
  assert(admitRes.error === undefined, "Student admission executes without errors");
  assert(admitRes.student !== undefined, "Returns admitted student record");
  
  const admittedStudent = admitRes.student!;
  assert(admittedStudent.admission_no.startsWith("ADM-"), `Counter generated admission number: ${admittedStudent.admission_no}`);
  assert(admittedStudent.first_name === "Aarav", "Student first_name saved correctly");
  assert(admittedStudent.status === "enrolled", "Admitted student has status 'enrolled'");

  // Verify draft was cleared
  const draftAfterAdmission = await getStudentDraft(schoolId, actorId);
  assert(draftAfterAdmission.draft === null, "Draft in student_drafts was automatically deleted after admission");

  // Verify student profile hydration
  const profileRes = await getStudentProfile(schoolId, admittedStudent.id);
  assert(profileRes.profile !== null, "Profile retrieved for newly admitted student");
  const studentProfile = profileRes.profile!;
  assert(studentProfile.parents.length === 2, "Both parents created and linked");
  assert(studentProfile.enrollments.length === 1, "Academic year enrollment created");
  assert(studentProfile.documents.length === 2, "Document Vault contains 2 uploaded documents");
  assert(studentProfile.events.length >= 1, "Admission event logged in timeline");
  assert(studentProfile.aadhaar_last4 === "0124", "Masked aadhaar_last4 stored in profile");

  // -------------------------------------------------------------------------
  // 4. Zero Orphan Rows on Rollback (Spec A4.2)
  // -------------------------------------------------------------------------
  console.log("\n4. Rollback Stack & Zero Orphan Rows (Spec A4.2):");

  const failSteps: Array<"address" | "parent" | "sensitive" | "medical" | "document" | "outbox"> = [
    "address",
    "parent",
    "sensitive",
    "medical",
    "document",
    "outbox",
  ];

  for (const step of failSteps) {
    const rollbackPayload = {
      ...fullPayload,
      step1_basic: {
        ...fullPayload.step1_basic,
        first_name: `Fail_${step}`,
      },
      step2_guardian: {
        ...fullPayload.step2_guardian,
        father: {
          ...fullPayload.step2_guardian.father!,
          phone: `999000${Math.floor(1000 + Math.random() * 9000)}`,
        },
      },
    };

    const failRes = await admitStudentTransactional(schoolId, rollbackPayload, actorId, "admin", {
      forceFailAtStep: step,
    });

    assert(failRes.rolledBack === true, `Admission transaction correctly caught failure and rolled back at step '${step}'`);

    // Verify student was NOT saved in storage
    const listCheck = await listStudents(schoolId, { search: `Fail_${step}` });
    assert(listCheck.response?.data.length === 0, `No orphaned student row created for step '${step}'`);
  }

  // -------------------------------------------------------------------------
  // 5. Audited Aadhaar Reveal & DPDP Act Compliance (Spec 1.8, A4.3)
  // -------------------------------------------------------------------------
  console.log("\n5. Audited Aadhaar Reveal with Permission Gate (Spec 1.8, A4.3):");

  // Attempt reveal without permission -> 403
  const unauthReveal = await revealStudentAadhaar(
    schoolId,
    admittedStudent.id,
    "Official verification",
    "teacher-user",
    "teacher",
    ["students.read"] // Missing students.reveal_sensitive
  );
  assert(unauthReveal.statusCode === 403, "Reveal without students.reveal_sensitive returns HTTP 403 FORBIDDEN");
  assert(unauthReveal.aadhaar === undefined, "No plaintext revealed to unauthorized user");

  // Attempt reveal with permission but empty reason -> 400
  const emptyReasonReveal = await revealStudentAadhaar(
    schoolId,
    admittedStudent.id,
    "",
    actorId,
    "admin",
    ["students.reveal_sensitive"]
  );
  assert(emptyReasonReveal.statusCode === 400, "Reveal without reason returns HTTP 400 BAD REQUEST");

  // Authorized reveal with valid reason
  const authReveal = await revealStudentAadhaar(
    schoolId,
    admittedStudent.id,
    "Board registration verification",
    actorId,
    "admin",
    ["students.reveal_sensitive"]
  );
  assert(authReveal.error === undefined, "Authorized reveal succeeds without error");
  assert(authReveal.aadhaar === "234567890124", "Returns decrypted plaintext Aadhaar matching original");
  assert(authReveal.last4 === "0124", "Returns last4 digits");

  // -------------------------------------------------------------------------
  // 6. Medical Data Isolation & Permission Gating (Spec A4.3, A8)
  // -------------------------------------------------------------------------
  console.log("\n6. Medical Data Isolation & Gated Permissions (Spec A4.3, A8):");

  // Unauthorised read without students.medical.read -> 403
  const unauthMedRead = await getStudentMedical(schoolId, admittedStudent.id, ["students.read"]);
  assert(unauthMedRead.statusCode === 403, "Reading medical record without students.medical.read returns HTTP 403");
  assert(unauthMedRead.medical === null, "No medical data returned to unauthorized user");

  // Authorised read with students.medical.read
  const authMedRead = await getStudentMedical(schoolId, admittedStudent.id, ["students.medical.read"]);
  assert(authMedRead.medical !== null, "Authorized read retrieves student medical record");
  assert(authMedRead.medical?.allergies === "Peanuts", "Retrieves confidential allergy details");
  assert(authMedRead.medical?.emergency_instructions?.includes("asthma") === true, "Retrieves emergency instructions");

  // Unauthorised write without students.medical.write -> 403
  const unauthMedWrite = await updateStudentMedical(
    schoolId,
    admittedStudent.id,
    { allergies: "Peanuts and Shellfish" },
    actorId,
    "admin",
    ["students.read"] // Missing students.medical.write
  );
  assert(unauthMedWrite.statusCode === 403, "Writing medical record without students.medical.write returns HTTP 403");

  // Authorised write
  const authMedWrite = await updateStudentMedical(
    schoolId,
    admittedStudent.id,
    { allergies: "Peanuts, Shellfish, Penicillin" },
    actorId,
    "admin",
    ["students.medical.write"]
  );
  assert(authMedWrite.medical !== undefined, "Authorized update saves medical record");
  assert(authMedWrite.medical?.allergies === "Peanuts, Shellfish, Penicillin", "Updated allergy data persisted");

  // -------------------------------------------------------------------------
  // 7. Duplicate Detection (Spec A4.2)
  // -------------------------------------------------------------------------
  console.log("\n7. Duplicate Detection Match Scoring (Spec A4.2):");

  // 1. Exact Aadhaar match -> 100%
  const dupAadhaar = await checkStudentDuplicate(schoolId, {
    first_name: "Someone",
    last_name: "Else",
    dob: "2015-01-01",
    aadhaar_number: "2345 6789 0124",
  });
  assert(dupAadhaar.is_duplicate === true, "Aadhaar match triggers duplicate flag");
  assert(dupAadhaar.match_score === 100, "Aadhaar match receives 100% match score");

  // 2. Name + Parent phone match -> 90%
  const dupNamePhone = await checkStudentDuplicate(schoolId, {
    first_name: "Aarav",
    last_name: "Sharma",
    dob: "2019-01-01",
    parent_phone: "9876543210",
  });
  assert(dupNamePhone.is_duplicate === true, "First name + Parent phone triggers duplicate flag");
  assert(dupNamePhone.match_score === 90, "First name + Parent phone receives 90% score");

  // 3. DOB + Mother name match -> 85%
  const dupDobMother = await checkStudentDuplicate(schoolId, {
    first_name: "Another",
    last_name: "Kid",
    dob: "2018-07-20",
    mother_name: "Sunita Sharma",
  });
  assert(dupDobMother.is_duplicate === true, "DOB + Mother name triggers duplicate flag");
  assert(dupDobMother.match_score === 85, "DOB + Mother name receives 85% score");

  // 4. Completely unrelated student -> 0%
  const noDup = await checkStudentDuplicate(schoolId, {
    first_name: "Unique",
    last_name: "Student",
    dob: "2020-12-12",
    parent_phone: "9111222333",
  });
  assert(noDup.is_duplicate === false, "Unrelated student has is_duplicate = false");
  assert(noDup.match_score === 0, "Unrelated student receives 0 score");

  // -------------------------------------------------------------------------
  // 8. Document Vault Lifecycle (Spec A4.4)
  // -------------------------------------------------------------------------
  console.log("\n8. Document Vault Lifecycle & Verification Rules (Spec A4.4):");

  // 1. Upload unverified document
  const uploadRes = await uploadStudentDocument(
    schoolId,
    admittedStudent.id,
    {
      doc_type: "immunisation_record",
      file_name: "vaccines_card.pdf",
      mime: "application/pdf",
      size_bytes: 120000,
      status: "uploaded",
    },
    actorId
  );
  assert(uploadRes.document !== undefined, "Uploaded new document to vault");
  const unverifiedDocId = uploadRes.document!.id;

  // 2. Delete unverified document -> allowed
  const delUnverified = await deleteStudentDocument(schoolId, unverifiedDocId, actorId);
  assert(delUnverified.success === true, "Unverified document can be deleted");

  // 3. Upload another and verify
  const doc2Res = await uploadStudentDocument(
    schoolId,
    admittedStudent.id,
    {
      doc_type: "income_certificate",
      file_name: "income_proof.pdf",
      status: "uploaded",
    },
    actorId
  );
  const doc2Id = doc2Res.document!.id;
  const verifyRes = await verifyStudentDocument(schoolId, doc2Id, "verify", actorId);
  assert(verifyRes.document?.status === "verified", "Document marked as verified");
  assert(verifyRes.document?.verified_by === actorId, "Records verified_by actorId");

  // 4. Attempt to delete verified document -> MUST BE BLOCKED
  const delVerified = await deleteStudentDocument(schoolId, doc2Id, actorId);
  assert(delVerified.success === false, "Delete of verified document is BLOCKED by rule A4.4");
  assert(delVerified.error?.includes("superseded") === true, "Error states verified documents can only be superseded");

  // 5. Replace (supersede) verified document
  const supersedeRes = await replaceStudentDocument(
    schoolId,
    doc2Id,
    {
      doc_type: "income_certificate",
      file_name: "income_proof_2026_updated.pdf",
      mime: "application/pdf",
    },
    actorId
  );
  assert(supersedeRes.document !== undefined, "Verified document successfully superseded with replacement");
  assert(supersedeRes.document?.file_name === "income_proof_2026_updated.pdf", "Replacement file updated in vault");

  // 6. Reject document with reason
  const rejectDocRes = await uploadStudentDocument(
    schoolId,
    admittedStudent.id,
    {
      doc_type: "category_certificate",
      file_name: "obc_cert_invalid.pdf",
      status: "uploaded",
    },
    actorId
  );
  const rejectDocId = rejectDocRes.document!.id;
  const rejectRes = await verifyStudentDocument(
    schoolId,
    rejectDocId,
    "reject",
    actorId,
    "Certificate is expired and blurred"
  );
  assert(rejectRes.document?.status === "rejected", "Document marked as rejected");
  assert(rejectRes.document?.rejection_reason === "Certificate is expired and blurred", "Rejection reason saved");

  // -------------------------------------------------------------------------
  // 9. Phone Lookup & Sibling Auto-Linking (Spec A4.2, A4.9)
  // -------------------------------------------------------------------------
  console.log("\n9. Phone Lookup & Sibling Auto-Linking (Spec A4.2, A4.9):");

  // Lookup existing parent by phone
  const parentLookup = await lookupParentByPhone(schoolId, "9876543210");
  assert(parentLookup.found === true, "Lookup finds existing parent by 10-digit phone");
  assert(parentLookup.parent?.full_name === "Ramesh Sharma", "Matches correct parent record");
  assert(parentLookup.linked_students?.length === 1, "Detects 1 existing child in school");
  assert(parentLookup.linked_students?.[0]?.first_name === "Aarav", "Existing child is Aarav Sharma");

  // Admit sibling with same phone
  const siblingPayload: AdmissionWizardPayload = {
    ...fullPayload,
    step1_basic: {
      first_name: "Ananya",
      last_name: "Sharma",
      dob: "2021-03-15",
      gender: "female",
      nationality: "Indian",
      category: "general",
    },
    step2_guardian: {
      ...fullPayload.step2_guardian,
      father: {
        relation: "father",
        full_name: "Ramesh Sharma",
        phone: "9876543210",
        is_primary_contact: true,
      },
    },
    step3_academic: {
      academic_year_id: "ay-2026",
      admission_date: "2026-04-01",
      class_id: "nursery",
      admission_type: "new",
      is_rte: false,
    },
    step4_documents: [],
    step5_sensitive: undefined,
    step6_medical: undefined,
  };

  const sibAdmit = await admitStudentTransactional(schoolId, siblingPayload, actorId, "admin");
  assert(sibAdmit.error === undefined, "Sibling admitted successfully");

  // Verify sibling detection in profile
  const aaravProfile = await getStudentProfile(schoolId, admittedStudent.id);
  assert(aaravProfile.profile?.siblings.length === 1, "Aarav now detects 1 sibling in school");
  assert(aaravProfile.profile?.siblings[0].sibling_first_name === "Ananya", "Detected sibling is Ananya Sharma");

  console.log("\n----------------------------------------------------------");
  console.log(`STAGE 3 TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runStage3Tests().catch(err => {
  console.error("Stage 3 test runner error:", err);
  process.exit(1);
});
