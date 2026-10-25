# Students Module: Filtering, Search, and URL State

## 1. Overview & Requirements

The Students module enforces strict, deterministic filtering rules to guarantee query correctness across hundreds of thousands of student records.

---

## 2. Strict Dependent Class → Section Filtering

The relationship between Class and Section follows a strict hierarchical dependency:

```
[All Students]
     ↓ (Select Class)
[Class Filtered: Section Dropdown Enabled]
     ↓ (Select Section)
[Class + Section Filtered]
     ↓ (Clear Class)
[All Students: Section Dropdown Disabled & Cleared]
```

### 2.1 State Rules & Behavior

1. **Initial State (No Class Selected)**:
   - Section dropdown is **disabled**.
   - Section placeholder displays: `"Select a class first"`.
   - Section options list contains **0 items** (no school-wide sections leaked).
   - Filter query does not apply any implicit section filtering.
2. **Class Selected**:
   - Section dropdown is **enabled** if the selected class has sections.
   - If the selected class has no sections, displays `"No sections in class"`.
   - Stale options from previous class selections are discarded.
   - Any in-flight asynchronous requests from previous class selections are aborted via `AbortController`.
3. **Class Changed**:
   - Immediately clears `section_id: undefined`.
   - Clears stale section options.
   - Fetches only sections belonging to the new class and authorized school.
4. **Class Cleared**:
   - Section selection is immediately cleared.
   - Section dropdown is disabled.
   - Student results return to the unfiltered-by-class dataset.
5. **Server-Side Enforcement**:
   - If a client issues a request with `section_id` without `class_id`, the API returns an error: `"A class must be selected before filtering by section."`
   - If `section_id` does not belong to `class_id` or `school_id`, the server returns an empty dataset (`data: [], total: 0`), preventing cross-class data leakage.

---

## 3. Truth Table: Filtering Combinations

| Class Selected? | Section Selected? | Status Filter | Search Query | Result Set |
| :--- | :--- | :--- | :--- | :--- |
| **None** | *Disabled* | None | None | All non-deleted students in school |
| **None** | *Disabled* | `enrolled` | None | All actively enrolled students |
| **None** | *Disabled* | None | `"Sharma"` | Students matching `"Sharma"` by name, admission no, or parent |
| **Class 10** | **None** | None | None | All students enrolled in Class 10 |
| **Class 10** | **Section A** | None | None | Students enrolled in Class 10, Section A |
| **Class 10** | **Section Science** (Invalid)| Any | Any | Empty dataset (Mismatch rejected) |
| **Class 10** | **Section A (School B)** (Cross-tenant)| Any | Any | Empty dataset (Cross-tenant rejected) |
| **Class 10** | **Section A** | `enrolled` | `"ADM-2026-001"` | Exactly student `ADM-2026-001` in Class 10-A |
| **Cleared** | *Disabled* | Retained | Retained | Filter applies without class/section restriction |

---

## 4. Multi-Field Search Implementation

Search queries search across multiple indexed columns simultaneously:

1. **Student Name**: Case-insensitive substring matching against `first_name` and `last_name`.
2. **Admission Number**: Case-insensitive substring matching against `admission_no`.
3. **Scholar Register (SR) Number**: Case-insensitive substring matching against `sr_no`.
4. **Parent/Guardian Name**: Subquery against `parents(full_name)` linked via `student_parents`.
5. **Parent Phone Number**: Subquery against `parents(phone)` linked via `student_parents`.

### Technical Query Formulation (Supabase / PostgreSQL)

```typescript
// 1. Pre-query matching parent records
if (search && search.trim()) {
  const sTerm = search.trim();
  const { data: matchedParents } = await supabase
    .from("parents")
    .select("id, student_parents(student_id)")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .or(`full_name.ilike.%${sTerm}%,phone.ilike.%${sTerm}%`);

  const matchedStudentIds = matchedParents?.flatMap(p => p.student_parents.map(sp => sp.student_id)) || [];

  // 2. Query students table combining direct fields and matched parent student IDs
  if (matchedStudentIds.length > 0) {
    query = query.or(
      `first_name.ilike.%${sTerm}%,last_name.ilike.%${sTerm}%,admission_no.ilike.%${sTerm}%,sr_no.ilike.%${sTerm}%,id.in.(${matchedStudentIds.join(",")})`
    );
  } else {
    query = query.or(
      `first_name.ilike.%${sTerm}%,last_name.ilike.%${sTerm}%,admission_no.ilike.%${sTerm}%,sr_no.ilike.%${sTerm}%`
    );
  }
}
```

---

## 5. URL State Synchronization

Active filter states are persisted to URL query parameters via Next.js / React Router `useSearchParams`:

- `search`: URL query `?search=term`.
- `class_id`: URL query `?class_id=uuid`.
- `section_id`: URL query `?section_id=uuid`.
- `status`: URL query `?status=enrolled`.
- `has_dues`: URL query `?has_dues=true`.

When any filter or search value changes, pagination is automatically reset to `page: 1`.
All filters apply in combination (`AND` logic).
The "Clear all filters" button removes all parameters from the URL and resets the filter state in one click.
