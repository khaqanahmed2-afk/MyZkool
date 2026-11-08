import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

async function verifyAuthScopedQuery() {
  console.log("Authenticating as myzkool.official@gmail.com...");
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });

  const token = authData.session?.access_token;
  console.log("Got user token, length:", token?.length);

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

  const userScopedClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Query platform_admins
  const { data: adminData, error: adminErr } = await userScopedClient
    .from("platform_admins")
    .select("id, email, full_name, is_active, platform_roles(slug, name)")
    .limit(5);
  console.log("Scoped query platform_admins:", adminData, adminErr?.message || "OK");

  // Query platform_settings
  const { data: settingsData, error: setErr } = await userScopedClient
    .from("platform_settings")
    .select("key, category")
    .limit(5);
  console.log("Scoped query platform_settings:", settingsData, setErr?.message || "OK");

  // Query platform_feature_flags
  const { data: flagData, error: flagErr } = await userScopedClient
    .from("platform_feature_flags")
    .select("flag_key, is_enabled")
    .limit(5);
  console.log("Scoped query platform_feature_flags:", flagData, flagErr?.message || "OK");

  // Query schools
  const { data: schoolData, count: schoolCount, error: schErr } = await userScopedClient
    .from("schools")
    .select("id, name, subdomain", { count: "exact" });
  console.log("Scoped query schools:", schoolData?.length, "count:", schoolCount, schErr?.message || "OK");
}

verifyAuthScopedQuery().catch(console.error);

