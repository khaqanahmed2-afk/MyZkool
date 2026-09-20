import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import StudentLedgerTab from "./StudentLedgerTab";
import { getStudentProfile } from "../../../services/studentService";

export default function StudentLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const { schoolId } = useAuth();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (!id || !schoolId) return;
    getStudentProfile(id, schoolId).then(res => {
      const p = res?.profile;
      if (p) setStudentName(`${p.first_name} ${p.last_name}`.trim());
    }).catch(() => {});

  }, [id, schoolId]);

  if (!id) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-[#E6EAF3] bg-white hover:bg-slate-50 transition-colors text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">Student Fee Ledger</h1>
          <p className="text-xs text-slate-500">{studentName || "Student Ledger"}</p>
        </div>
      </div>

      <div className="bg-white border border-[#E6EAF3] rounded-2xl p-6 shadow-2xs">
        <StudentLedgerTab studentId={id} studentName={studentName} />
      </div>
    </div>
  );
}
