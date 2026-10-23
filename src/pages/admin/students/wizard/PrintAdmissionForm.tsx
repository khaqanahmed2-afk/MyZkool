import React from "react";
import { Printer, X, Download, School as SchoolIcon, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { Student, AdmissionWizardPayload, StudentProfile } from "../../../../types/students";
import type { School } from "../../../../types/school";
import { maskAadhaar } from "../../../../utils/aadhaarValidation";

interface PrintAdmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  profile?: StudentProfile | null;
  payload?: AdmissionWizardPayload | null;
  school?: School | null;
  className?: string;
  sectionName?: string;
  feeStructureName?: string;
  transportDetails?: {
    routeName?: string;
    stopName?: string;
    monthlyFee?: string;
  };
}

export const PrintAdmissionForm: React.FC<PrintAdmissionFormProps> = ({
  isOpen,
  onClose,
  student,
  profile,
  payload,
  school,
  className: propClassName,
  sectionName: propSectionName,
  feeStructureName,
  transportDetails,
}) => {
  if (!isOpen) return null;

  // Derive consolidated data from student, profile, and/or payload
  const admissionNo = student?.admission_no || profile?.admission_no || payload?.step1_basic.admission_no || "ADM-PENDING";
  const admissionDate = student?.admission_date || profile?.admission_date || payload?.step3_academic.admission_date || new Date().toISOString().split("T")[0];

  const firstName = student?.first_name || profile?.first_name || payload?.step1_basic.first_name || "";
  const middleName = student?.middle_name || profile?.middle_name || payload?.step1_basic.middle_name || "";
  const lastName = student?.last_name || profile?.last_name || payload?.step1_basic.last_name || "";
  const fullName = `${firstName} ${middleName ? `${middleName} ` : ""}${lastName}`.trim();

  const dob = student?.dob || profile?.dob || payload?.step1_basic.dob || "";
  const gender = student?.gender || profile?.gender || payload?.step1_basic.gender || "male";
  const bloodGroup = student?.blood_group || profile?.blood_group || payload?.step1_basic.blood_group || "-";
  const category = student?.category || profile?.category || payload?.step1_basic.category || "general";
  const religion = student?.religion || profile?.religion || payload?.step1_basic.religion || "-";
  const nationality = student?.nationality || profile?.nationality || payload?.step1_basic.nationality || "Indian";
  const motherTongue = student?.mother_tongue || profile?.mother_tongue || payload?.step1_basic.mother_tongue || "-";
  const srNo = student?.sr_no || profile?.sr_no || payload?.step1_basic.sr_no || "-";
  const apaarId = student?.apaar_id || profile?.apaar_id || payload?.step1_basic.apaar_id || "-";
  const isRte = Boolean(student?.is_rte ?? profile?.is_rte ?? payload?.step3_academic.is_rte);
  const photoUrl = student?.photo_path || profile?.photo_path || payload?.step1_basic.photo_path;

  // Masked Aadhaar
  const rawAadhaar = payload?.step5_sensitive?.aadhaar_number;
  const maskedAadhaar = rawAadhaar
    ? maskAadhaar(rawAadhaar)
    : profile?.aadhaar_last4
    ? `XXXX-XXXX-${profile.aadhaar_last4}`
    : student?.aadhaar_last4
    ? `XXXX-XXXX-${student.aadhaar_last4}`
    : "Not provided";

  // Academic Details
  const assignedClass = propClassName || (profile?.enrollment ? `Class ${profile.enrollment.class_id}` : payload?.step3_academic.class_id ? `Class ${payload.step3_academic.class_id}` : "Assigned");
  const assignedSection = propSectionName || profile?.enrollment?.section_id || payload?.step3_academic.section_id || "";
  const rollNo = profile?.enrollment?.roll_no || payload?.step3_academic.roll_no || "-";
  const admissionType = student?.admission_type || profile?.admission_type || payload?.step3_academic.admission_type || "new";
  const medium = student?.medium || profile?.medium || payload?.step3_academic.medium || "English";
  const prevSchool = profile?.previous_school || payload?.step3_academic.previous_school;

  // Guardian details
  const father = profile?.parents.find((p) => p.relation === "father") || (payload?.step2_guardian.father ? {
    full_name: payload.step2_guardian.father.full_name,
    phone: payload.step2_guardian.father.phone,
    email: payload.step2_guardian.father.email,
    occupation: payload.step2_guardian.father.occupation,
    is_primary_contact: payload.step2_guardian.father.is_primary_contact,
  } : null);

  const mother = profile?.parents.find((p) => p.relation === "mother") || (payload?.step2_guardian.mother ? {
    full_name: payload.step2_guardian.mother.full_name,
    phone: payload.step2_guardian.mother.phone,
    email: payload.step2_guardian.mother.email,
    occupation: payload.step2_guardian.mother.occupation,
    is_primary_contact: payload.step2_guardian.mother.is_primary_contact,
  } : null);

  const guardian = profile?.parents.find((p) => p.relation === "guardian") || (payload?.step2_guardian.guardian ? {
    full_name: payload.step2_guardian.guardian.full_name,
    phone: payload.step2_guardian.guardian.phone,
    email: payload.step2_guardian.guardian.email,
    occupation: payload.step2_guardian.guardian.occupation,
    is_primary_contact: payload.step2_guardian.guardian.is_primary_contact,
  } : null);

  // Address
  const currentAddress = profile?.addresses.find((a) => a.kind === "current") || payload?.step2_guardian.current_address || {
    line1: "Not provided",
    city: "",
    state: "",
    pin: "",
  };

  const permanentAddress = profile?.addresses.find((a) => a.kind === "permanent") || (payload?.step2_guardian.same_as_current ? currentAddress : payload?.step2_guardian.permanent_address) || currentAddress;

  // Documents
  const docsList = profile?.documents || payload?.step4_documents || [];

  // Transport
  const transportOptIn = payload?.step7_transport?.opt_in;

  // School branding
  const schoolName = school?.name || "MyZkool Senior Secondary School";
  const schoolLogo = school?.logo_url;
  const schoolAddress = school?.address
    ? `${school.address}, ${school.city || ""}, ${school.state || ""} - ${school.pin_code || ""}`
    : "123 Knowledge Park, Education Hub";
  const schoolContact = school?.contact_phone ? `Tel: ${school.contact_phone} | Email: ${school.official_email || "info@school.edu"}` : "";
  const schoolBoard = school?.affiliation_board ? `Affiliated to ${school.affiliation_board.toUpperCase()}` : "Recognised Institution";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Print-specific style tag */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background: white !important;
            color: #111827 !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all application UI */
          header, nav, aside, footer, .no-print, [role="navigation"] {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Container Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden my-auto border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:m-0 print:w-full">
        {/* On-screen Action Toolbar */}
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">Official Admission Document Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#2158E0] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print Document
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Page Content */}
        <div className="p-8 sm:p-10 text-slate-900 bg-white print:p-0 space-y-6 print-container text-[11px] leading-tight">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900">
                    <SchoolIcon className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold tracking-tight uppercase text-slate-950 font-serif">
                    {schoolName}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium tracking-wide">
                    {schoolBoard}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {schoolAddress}
                  </p>
                  {schoolContact && (
                    <p className="text-[10px] text-slate-500">
                      {schoolContact}
                    </p>
                  )}
                </div>
              </div>

              {/* Admission Badge & Photo Box */}
              <div className="flex items-start gap-4">
                <div className="text-right">
                  <div className="inline-block border-2 border-slate-900 bg-slate-50 px-3 py-1.5 rounded-sm text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">Admission Number</p>
                    <p className="font-mono text-sm font-extrabold text-slate-950">{admissionNo}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    Date: <strong>{admissionDate}</strong>
                  </p>
                </div>

                {/* Passport Photo */}
                <div className="w-24 h-28 border border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-center p-1 text-[9px] text-slate-400 shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Student"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>Affix Student Photograph</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center mt-3 pt-2 border-t border-slate-200">
              <span className="inline-block uppercase tracking-widest text-xs font-black bg-slate-900 text-white px-4 py-0.5 rounded-xs">
                Student Admission Form
              </span>
            </div>
          </div>

          {/* Section 1: Student Information */}
          <div className="space-y-1 page-break-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-950 bg-slate-100 px-2 py-1 border-l-3 border-slate-900">
              1. Student Basic Information
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">Full Name</td>
                  <td className="border border-slate-300 px-2 py-1 font-bold text-slate-950 w-1/4" colSpan={3}>
                    {fullName || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">Date of Birth</td>
                  <td className="border border-slate-300 px-2 py-1 w-1/4">{dob || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">Gender</td>
                  <td className="border border-slate-300 px-2 py-1 capitalize w-1/4">{gender}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Blood Group</td>
                  <td className="border border-slate-300 px-2 py-1">{bloodGroup}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Category</td>
                  <td className="border border-slate-300 px-2 py-1 uppercase">{category}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Religion</td>
                  <td className="border border-slate-300 px-2 py-1">{religion}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Nationality</td>
                  <td className="border border-slate-300 px-2 py-1">{nationality}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Mother Tongue</td>
                  <td className="border border-slate-300 px-2 py-1">{motherTongue}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Aadhaar (Masked)</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{maskedAadhaar}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">SR Number</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{srNo}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">APAAR ID</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{apaarId}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Guardian & Family Details */}
          <div className="space-y-1 page-break-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-950 bg-slate-100 px-2 py-1 border-l-3 border-slate-900">
              2. Guardian & Family Details
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
              <thead>
                <tr className="bg-slate-50 text-left font-semibold">
                  <th className="border border-slate-300 px-2 py-1">Relation</th>
                  <th className="border border-slate-300 px-2 py-1">Full Name</th>
                  <th className="border border-slate-300 px-2 py-1">Mobile Phone</th>
                  <th className="border border-slate-300 px-2 py-1">Email</th>
                  <th className="border border-slate-300 px-2 py-1">Occupation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Father</td>
                  <td className="border border-slate-300 px-2 py-1">{father?.full_name || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{father?.phone ? `+91 ${father.phone}` : "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{father?.email || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{father?.occupation || "-"}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold">Mother</td>
                  <td className="border border-slate-300 px-2 py-1">{mother?.full_name || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{mother?.phone ? `+91 ${mother.phone}` : "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{mother?.email || "-"}</td>
                  <td className="border border-slate-300 px-2 py-1">{mother?.occupation || "-"}</td>
                </tr>
                {guardian?.phone && (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 font-semibold">Legal Guardian</td>
                    <td className="border border-slate-300 px-2 py-1">{guardian.full_name || "-"}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono">+91 {guardian.phone}</td>
                    <td className="border border-slate-300 px-2 py-1">{guardian.email || "-"}</td>
                    <td className="border border-slate-300 px-2 py-1">{guardian.occupation || "-"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 3: Residential & Permanent Address */}
          <div className="space-y-1 page-break-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-950 bg-slate-100 px-2 py-1 border-l-3 border-slate-900">
              3. Residential Address
            </h2>
            <div className="grid grid-cols-2 gap-3 text-[10.5px]">
              <div className="border border-slate-300 p-2 rounded-xs">
                <p className="font-semibold text-slate-700 uppercase text-[9.5px]">Current Residential Address</p>
                <p className="mt-1 font-medium text-slate-900">
                  {currentAddress.line1}
                  {currentAddress.landmark ? `, Near ${currentAddress.landmark}` : ""}
                </p>
                <p className="text-slate-700">
                  {currentAddress.city}{currentAddress.district ? `, ${currentAddress.district}` : ""}, {currentAddress.state} - {currentAddress.pin}
                </p>
              </div>
              <div className="border border-slate-300 p-2 rounded-xs">
                <p className="font-semibold text-slate-700 uppercase text-[9.5px]">Permanent Address</p>
                <p className="mt-1 font-medium text-slate-900">
                  {permanentAddress.line1}
                  {permanentAddress.landmark ? `, Near ${permanentAddress.landmark}` : ""}
                </p>
                <p className="text-slate-700">
                  {permanentAddress.city}{permanentAddress.district ? `, ${permanentAddress.district}` : ""}, {permanentAddress.state} - {permanentAddress.pin}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Academic Details & Previous School */}
          <div className="space-y-1 page-break-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-950 bg-slate-100 px-2 py-1 border-l-3 border-slate-900">
              4. Academic Placement & Previous Education
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">Admitted Class</td>
                  <td className="border border-slate-300 px-2 py-1 font-bold w-1/4">{assignedClass}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">Section & Roll No</td>
                  <td className="border border-slate-300 px-2 py-1 w-1/4">
                    {assignedSection ? `Section ${assignedSection}` : "Unassigned"} {rollNo !== "-" ? `(Roll No: ${rollNo})` : ""}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Medium of Instruction</td>
                  <td className="border border-slate-300 px-2 py-1">{medium}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Admission Type</td>
                  <td className="border border-slate-300 px-2 py-1 capitalize">{admissionType.replace("_", " ")}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">RTE 12(1)(c) Quota</td>
                  <td className="border border-slate-300 px-2 py-1">{isRte ? "Yes (100% Tuition Concession)" : "No"}</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Previous School Name</td>
                  <td className="border border-slate-300 px-2 py-1">{prevSchool?.school_name || "Fresh Admission"}</td>
                </tr>
                {prevSchool?.school_name && (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Previous Board</td>
                    <td className="border border-slate-300 px-2 py-1">{prevSchool.board || "CBSE"}</td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">TC No / Result %</td>
                    <td className="border border-slate-300 px-2 py-1">
                      TC: {prevSchool.tc_no || "-"} | Result: {prevSchool.result_percent ? `${prevSchool.result_percent}%` : "-"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 5: Documents Vault Status */}
          <div className="space-y-1 page-break-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-950 bg-slate-100 px-2 py-1 border-l-3 border-slate-900">
              5. Documents Vault & Submission Status
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-50 font-semibold text-left">
                  <th className="border border-slate-300 px-2 py-1">Document Type</th>
                  <th className="border border-slate-300 px-2 py-1">File Name</th>
                  <th className="border border-slate-300 px-2 py-1 text-center">Status</th>
                  <th className="border border-slate-300 px-2 py-1">Expected Submission Date</th>
                </tr>
              </thead>
              <tbody>
                {docsList.length > 0 ? (
                  docsList.map((d) => (
                    <tr key={d.doc_type}>
                      <td className="border border-slate-300 px-2 py-1 font-medium capitalize">
                        {d.doc_type.replace(/_/g, " ")}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 font-mono text-slate-600">
                        {d.file_name || "-"}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-bold">
                        {d.status === "uploaded" || d.status === "verified" ? (
                          <span className="text-emerald-700">SUBMITTED</span>
                        ) : d.status === "pending" ? (
                          <span className="text-amber-700">PENDING</span>
                        ) : (
                          <span className="text-slate-500">OPTIONAL</span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-slate-600">
                        {d.expected_on ? `Due by ${d.expected_on}` : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-slate-300 px-2 py-1 text-slate-500 text-center">
                      Standard admission records filed electronically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 6: Transport & Fee Summary */}
          <div className="space-y-1 page-break-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-950 bg-slate-100 px-2 py-1 border-l-3 border-slate-900">
              6. Transport & Fee Summary
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">School Transport</td>
                  <td className="border border-slate-300 px-2 py-1 w-1/4">
                    {transportOptIn ? "Opted In (School Bus Service)" : "Self Transport"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50 w-1/4">Fee Plan Assigned</td>
                  <td className="border border-slate-300 px-2 py-1 font-semibold w-1/4">
                    {isRte ? "RTE Full Tuition Concession" : feeStructureName || "Standard Annual Fee Structure"}
                  </td>
                </tr>
                {transportOptIn && transportDetails && (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 font-semibold bg-slate-50">Route & Stop</td>
                    <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                      Route: {transportDetails.routeName || "School Route"} | Stop: {transportDetails.stopName || "Default Stop"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 7: Parent Declaration */}
          <div className="border border-slate-300 p-3 bg-slate-50 rounded-xs space-y-2 page-break-avoid">
            <p className="font-bold text-[10.5px] uppercase tracking-wide text-slate-900">
              Parent / Guardian Declaration & Undertaking
            </p>
            <p className="text-[9.5px] text-slate-700 leading-normal text-justify">
              I hereby solemnly declare that all statements made in this application are true, complete, and correct to the best of my knowledge and belief. I agree to conform to the discipline, rules, fee payment schedules, and regulations of {schoolName}. I understand that school admission is subject to verification of original certificates and documents.
            </p>
          </div>

          {/* Section 8: Signatures & Verification Area */}
          <div className="pt-6 grid grid-cols-3 gap-6 page-break-avoid text-center">
            <div className="space-y-8">
              <div className="h-10 border-b border-slate-400"></div>
              <div>
                <p className="font-bold text-[10px] text-slate-900">Signature of Parent / Guardian</p>
                <p className="text-[9px] text-slate-500">Date: _______________</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="h-10 border-b border-slate-400"></div>
              <div>
                <p className="font-bold text-[10px] text-slate-900">Admission In-Charge</p>
                <p className="text-[9px] text-slate-500">Verified & Checked</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="h-10 border-b border-slate-400"></div>
              <div>
                <p className="font-bold text-[10px] text-slate-900">Principal / Head of Institution</p>
                <p className="text-[9px] text-slate-500">Official Seal & Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
