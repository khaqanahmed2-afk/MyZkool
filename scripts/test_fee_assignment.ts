import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(url, key);

const SCHOOL_ID = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
const CLASS_11_STRUCT_ID = '68b1add2-3734-46da-8932-763768931227';
const NURSERY_STRUCT_ID = 'c8b8bfe1-7f61-4270-b100-1071438ec266';

async function runTests() {
  console.log("=================================================================");
  console.log("   FEE STRUCTURE STUDENT ASSIGNMENT & TRANSPORT ISOLATION TEST   ");
  console.log("=================================================================\n");

  let passedAll = true;

  // 1. Verify Class 11 Structure
  console.log("--- TEST 1: Class 11 Fee Structure & Student Coverage ---");
  const { data: c11Data, error: c11Err } = await supabase.rpc("verify_fee_structure_assignments", {
    p_school_id: SCHOOL_ID,
    p_structure_id: CLASS_11_STRUCT_ID,
  });

  if (c11Err || !c11Data) {
    console.error("❌ Failed to verify Class 11:", c11Err?.message);
    passedAll = false;
  } else {
    console.log(`Active Assigned Students: ${c11Data.assigned_students} (Expected: 6)`);
    console.log(`Base Fee Dues Count:     ${c11Data.base_dues_count} (Expected: 114, i.e. 19 dues * 6 students)`);
    console.log(`Active Transport Riders: ${c11Data.active_transport_riders} (Expected: 1)`);
    console.log(`Students with Transport: ${c11Data.transport_students_with_dues} (Expected: 1)`);

    if (c11Data.assigned_students !== 6) {
      console.error(`❌ Expected 6 assigned students, found ${c11Data.assigned_students}`);
      passedAll = false;
    } else {
      console.log("✅ Exactly 6 students assigned to Class 11 Fee Structure.");
    }

    if (c11Data.transport_students_with_dues !== 1) {
      console.error(`❌ Expected exactly 1 student with transport dues, found ${c11Data.transport_students_with_dues}`);
      passedAll = false;
    } else {
      console.log("✅ Exactly 1 student received transport dues (strict transport isolation).");
    }

    console.log("\nStudent-by-Student Breakdown (Class 11):");
    for (const st of c11Data.students || []) {
      const isRider = st.has_transport;
      console.log(`  Student: ${st.first_name.padEnd(8)} ${st.last_name.padEnd(10)} | Base: ${st.base_dues_count} dues (₹${st.base_paise / 100}) | Trans: ${st.transport_dues_count} dues (₹${st.transport_paise / 100}) | Rider: ${isRider}`);

      // Verify each student got base fees (₹34,200)
      if (st.base_dues_count === 0 || st.base_paise !== 3420000) {
        console.error(`  ❌ ${st.first_name} did not receive expected base fee (₹34,200).`);
        passedAll = false;
      }

      // Verify non-riders received zero transport charges
      if (!isRider && (st.transport_dues_count > 0 || st.transport_paise > 0)) {
        console.error(`  ❌ Non-rider ${st.first_name} received transport charges!`);
        passedAll = false;
      }

      // Verify rider received transport charges
      if (isRider && (st.transport_dues_count === 0 || st.transport_paise === 0)) {
        console.error(`  ❌ Active rider ${st.first_name} did not receive transport charges!`);
        passedAll = false;
      }
    }
  }

  // 2. Test Idempotency: Re-assign must not create duplicate assignments or dues
  console.log("\n--- TEST 2: Idempotency (Prevent Duplicate Assignments & Invoices) ---");
  const { data: reAssignResult, error: reErr } = await supabase.rpc(
    "assign_fee_structure_to_eligible_students",
    {
      p_school_id: SCHOOL_ID,
      p_structure_id: CLASS_11_STRUCT_ID,
    }
  );

  if (reErr) {
    console.error("❌ RPC failed on re-assignment:", reErr.message);
    passedAll = false;
  } else {
    console.log("Re-assignment response:", reAssignResult);
    if (reAssignResult.assigned_students_count === 0 && reAssignResult.created_dues_count === 0) {
      console.log("✅ Idempotent: 0 duplicate assignments, 0 duplicate dues created.");
    } else {
      console.error("❌ Failed idempotency: duplicates were created!", reAssignResult);
      passedAll = false;
    }
  }

  // 3. Verify Nursery Structure (7 students, 4 riders, 3 non-riders)
  console.log("\n--- TEST 3: Nursery Structure (7 Enrolled, 4 Transport Riders) ---");
  const { data: nurData, error: nurErr } = await supabase.rpc("verify_fee_structure_assignments", {
    p_school_id: SCHOOL_ID,
    p_structure_id: NURSERY_STRUCT_ID,
  });

  if (nurErr || !nurData) {
    console.error("❌ Failed to verify Nursery:", nurErr?.message);
    passedAll = false;
  } else {
    console.log(`Active Assigned Students: ${nurData.assigned_students} (Expected: 7)`);
    console.log(`Base Fee Dues Count:     ${nurData.base_dues_count} (Expected: 133, i.e. 19 dues * 7 students)`);
    console.log(`Active Transport Riders: ${nurData.active_transport_riders} (Expected: 4)`);
    console.log(`Students with Transport: ${nurData.transport_students_with_dues} (Expected: 4)`);

    if (nurData.assigned_students === 7 && nurData.transport_students_with_dues === 4) {
      console.log("✅ Nursery verified: exactly 7 assigned students, 4 transport riders.");
    } else {
      console.error("❌ Nursery counts mismatch!");
      passedAll = false;
    }
  }

  console.log("\n=================================================================");
  if (passedAll) {
    console.log("🎉 ALL TESTS PASSED: Fee structure assignment & transport isolation fully working!");
  } else {
    console.error("💥 SOME TESTS FAILED. Review output above.");
    process.exit(1);
  }
  console.log("=================================================================\n");
}

runTests();
