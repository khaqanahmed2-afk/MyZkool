# Students Module: Troubleshooting and Diagnostics

## 1. Diagnostic Decision Tree

Use this guide to diagnose and resolve issues in the Students module.

---

## 2. Common Issues & Solutions

### 2.1 Sections Not Appearing for Selected Class
- **Symptom**: A class is selected in the Class dropdown, but the Section dropdown remains disabled or displays `"No sections in class"`.
- **Diagnostic Steps**:
  1. Inspect network tab for the call to `getSectionsForClass`.
  2. Verify that the selected class actually has active sections configured in `sections` table for `school_id = active_school_id AND class_id = selected_class_id`.
  3. Ensure `status = 'active'` on the section records.
- **Root Cause & Fix**:
  If sections exist under another academic year, verify that the academic year context is aligned, or use the Academics section settings (`/admin/academics/classes`) to configure sections for the selected class.

---

### 2.2 Students Missing from Search Results
- **Symptom**: User searches for a known student or parent phone number, but no results are returned.
- **Diagnostic Steps**:
  1. Check if an active filter (Class, Section, Status, or Dues) is restricting the search dataset.
  2. Confirm whether the student has `deleted_at IS NOT NULL` (soft-deleted).
  3. For parent phone search: Verify whether the parent's phone number in `parents` matches the search query and is linked to the student in `student_parents`.
- **Root Cause & Fix**:
  Clear all active filters using "Clear all filters" to search across the entire school directory.

---

### 2.3 Duplicate or Missing Records During Pagination
- **Symptom**: The same student appears on both Page 1 and Page 2, or records seem skipped.
- **Root Cause**:
  Non-deterministic database sorting where rows with identical timestamps sort arbitrarily between paginated queries.
- **Fix**:
  The query enforces deterministic two-tier sorting:
  ```typescript
  query.order(sort_by, { ascending: sort_order === "asc" }).order("id", { ascending: true });
  ```
  The secondary sort on the unique `id` primary key prevents record shifting.

---

### 2.4 Incorrect Summary Metrics (Pending Fees or New Admissions)
- **Symptom**: Pending Fees count shows 0 or does not match accounting reports.
- **Root Cause**:
  Previously, fees pending was calculated using an unpopulated `fee_status` column on the student table or evaluated from only the first 50 loaded rows.
- **Fix**:
  `getStudentSummaryMetrics` now directly queries `student_dues` using canonical financial rules:
  ```sql
  SELECT DISTINCT student_id 
  FROM student_dues 
  WHERE school_id = $1 
    AND status IN ('pending', 'partial') 
    AND balance_paise > 0;
  ```

---

### 2.5 RLS Permission Errors (`PGRST301` or `new row violates row-level security policy`)
- **Symptom**: Mutations fail with an RLS error.
- **Diagnostic Steps**:
  1. Verify the authenticated user's session in Supabase.
  2. Check that the student's `school_id` matches the user's `school_id`.
  3. Verify the user has the required permission (`students.write`, `students.status.manage`).
- **Fix**:
  Ensure user has an active membership record in `school_members` and the role is properly assigned. Never bypass RLS using service-role keys in client code.
