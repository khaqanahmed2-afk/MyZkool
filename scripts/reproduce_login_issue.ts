import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.VITE_SUPABASE_URL || "";
  const key = process.env.VITE_SUPABASE_ANON_KEY || "";

  console.log("Supabase URL:", url);
  console.log("Anon Key present:", Boolean(key));

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const email = "myzkool.official@gmail.com";
  const password = "R@shid12";

  console.log(`\n1. Calling signInWithPassword for ${email}...`);
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("Auth Error:", authError);
    return;
  }

  console.log("Auth Success. User ID:", authData.user.id);
  const authedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  });

  console.log("\n2. Testing resolveUserProfile logic (querying profiles)...");
  const { data: dbProfile, error: profileError } = await authedClient
    .from("profiles")
    .select("*")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  console.log("Profile:", dbProfile, "Error:", profileError);

  const schoolId = dbProfile?.school_id;
  console.log("\n3. Testing getSchoolForCurrentUser logic (querying schools for id:", schoolId, ")...");
  const { data: schoolData, error: schoolError } = await authedClient
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();

  console.log("School:", schoolData, "Error:", schoolError);

  console.log("\n4. Testing getAuthorizedSchoolsForUser logic...");
  const { data: authSchools, error: authSchoolsError } = await authedClient
    .from("schools")
    .select("*")
    .eq("created_by", authData.user.id);

  console.log("Authorized Schools:", authSchools?.length, "Error:", authSchoolsError);

  console.log("\n5. Testing getCurrentAcademicYear logic (querying academic_years)...");
  const { data: ayData, error: ayError } = await authedClient
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_current", true)
    .maybeSingle();

  console.log("Academic Year:", ayData, "Error:", ayError);

  console.log("\n6. Testing RLS helper functions get_current_school_id() or is_school_admin()...");
  const { data: rpcSchoolId, error: rpcSchoolIdError } = await authedClient.rpc("get_current_school_id");
  console.log("rpc get_current_school_id():", rpcSchoolId, "Error:", rpcSchoolIdError);

  const { data: rpcIsAdmin, error: rpcIsAdminError } = await authedClient.rpc("is_school_admin");
  console.log("rpc is_school_admin():", rpcIsAdmin, "Error:", rpcIsAdminError);

  console.log("\n7. Testing students query (to see if /admin dashboard queries succeed)...");
  const { data: students, error: studentsError } = await authedClient
    .from("students")
    .select("id, status")
    .limit(5);

  console.log("Students count:", students?.length, "Error:", studentsError);
}

main().catch(console.error);
