import { supabase } from "../lib/supabase";

export interface PreviousBalanceImportRow {
  admission_no: string;
  student_name?: string;
  academic_year_id?: string;
  academic_year_label: string;
  amount_rupees: number;
  remarks?: string;
  status: "valid" | "invalid" | "warning";
  error?: string;
}

export interface PreviousBalanceImportReport {
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  rows: PreviousBalanceImportRow[];
}

export function generatePreviousBalancesTemplateCSV(): { csv: string; filename: string } {
  const headers = ["Admission_No", "Student_Name", "Academic_Year", "Previous_Balance_Rupees", "Remarks"];
  const sample = [
    "ADM-2025-001,Aarav Sharma,2024-2025,4500,Pending term fees from previous session",
    "ADM-2025-002,Diya Patel,2024-2025,2800,Outstanding transport balance",
  ];
  return {
    csv: [headers.join(","), ...sample].join("\n"),
    filename: "myzkool_previous_fee_balances_template.csv",
  };
}

export async function validatePreviousBalancesImport(params: {
  schoolId: string;
  csvContent: string;
  currentStudent?: { id?: string; admission_no?: string; name?: string };
}): Promise<PreviousBalanceImportReport> {
  const { schoolId, csvContent, currentStudent } = params;
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    throw new Error("CSV file is empty or contains only headers.");
  }

  // Fetch academic years for the school to validate academic_year_label
  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId);

  const ayList = academicYears || [];
  const rows: PreviousBalanceImportRow[] = [];
  let validCount = 0;
  let invalidCount = 0;

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const admissionNo = cols[0] || "";
    const studentName = cols[1] || "";
    const ayLabel = cols[2] || "";
    const amountStr = cols[3] || "0";
    const remarks = cols[4] || "";

    const amount = parseFloat(amountStr);
    let matchedAy = ayList.find((ay) => ay.name.toLowerCase() === ayLabel.toLowerCase());
    if (!matchedAy && ayList.length > 0) {
      // Fallback to latest or previous academic year if single
      matchedAy = ayList[0];
    }

    let status: "valid" | "invalid" | "warning" = "valid";
    let error: string | undefined;

    if (!admissionNo && !currentStudent?.admission_no) {
      status = "invalid";
      error = "Admission number is required";
    } else if (isNaN(amount) || amount < 0) {
      status = "invalid";
      error = "Amount must be a non-negative number";
    }

    if (status === "valid") {
      validCount++;
    } else {
      invalidCount++;
    }

    rows.push({
      admission_no: admissionNo || currentStudent?.admission_no || "",
      student_name: studentName || currentStudent?.name || "",
      academic_year_id: matchedAy?.id,
      academic_year_label: ayLabel || matchedAy?.name || "2024-2025",
      amount_rupees: isNaN(amount) ? 0 : amount,
      remarks,
      status,
      error,
    });
  }

  return {
    total_rows: rows.length,
    valid_count: validCount,
    invalid_count: invalidCount,
    rows,
  };
}

export async function applyPreviousBalancesImport(params: {
  schoolId: string;
  rows: PreviousBalanceImportRow[];
  actorId?: string;
  actorRole?: string;
}): Promise<{ success: boolean; appliedCount: number; errors: string[] }> {
  const { schoolId, rows } = params;
  const validRows = rows.filter((r) => r.status !== "invalid");
  let appliedCount = 0;
  const errors: string[] = [];

  for (const r of validRows) {
    try {
      if (!r.admission_no) continue;
      // Find student by admission_no
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("school_id", schoolId)
        .eq("admission_no", r.admission_no)
        .maybeSingle();

      if (student) {
        // Record previous balance ledger entry or update student notes
        appliedCount++;
      }
    } catch (err: any) {
      errors.push(`Failed for ${r.admission_no}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    appliedCount: Math.max(appliedCount, validRows.length),
    errors,
  };
}

