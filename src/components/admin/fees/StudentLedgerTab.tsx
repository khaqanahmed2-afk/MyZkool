import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { StudentFeeLedgerView } from "./studentLedger/StudentFeeLedgerView";

interface Props {
  studentId: string;
  studentName?: string;
}

/**
 * StudentLedgerTab
 *
 * Embeddable tab component for Student Profile (Fees tab)
 * and standalone StudentLedgerPage (/admin/fees/students/:id).
 *
 * Hosts the simplified, production-ready fee management experience
 * with reconciled metrics, 7 dedicated tabs, primary action controls,
 * and seamless Supabase integration.
 */
export default function StudentLedgerTab({ studentId }: Props) {
  const { schoolId, school } = useAuth();
  const navigate = useNavigate();

  const schoolName = school?.name || "School Office";

  if (!schoolId || !studentId) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Loading student fee records...
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6EAF3] rounded-2xl overflow-hidden shadow-2xs">
      <StudentFeeLedgerView
        studentId={studentId}
        schoolId={schoolId}
        schoolName={schoolName}
        onCollectPayment={(stdId) => {
          navigate(`/admin/fees/collect?student=${stdId}`);
        }}
        mode="embedded"
        showHeader={false}
      />
    </div>
  );
}
