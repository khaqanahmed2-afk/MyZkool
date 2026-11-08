import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  console.log("Signing in as myzkool.official@gmail.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  console.log("Authenticated as:", authData.user?.id, authData.user?.email);

  const tables = [
    "schools",
    "profiles",
    "students",
    "academic_years",
    "classes",
    "sections",
    "fee_structures",
    "fee_collections",
    "subscription_plans",
    "school_subscriptions",
    "school_subscription_payments",
    "platform_admins",
    "platform_roles",
    "platform_permissions",
    "platform_role_permissions",
    "platform_audit_logs",
    "subscription_invoices",
    "support_tickets",
    "support_ticket_messages",
    "platform_announcements",
    "platform_settings",
    "platform_feature_flags",
  ];

  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select("*", { count: "exact" }).limit(3);
    if (error) {
      console.log(`❌ Table '${table}': ERROR - ${error.message} (code: ${error.code})`);
    } else {
      console.log(`✅ Table '${table}': count = ${count}, sample length = ${data?.length}`);
      if (data && data.length > 0 && (table === "schools" || table === "subscription_plans" || table === "profiles" || table === "platform_admins")) {
        console.log(`   Sample from ${table}:`, data[0]);
      }
    }
  }
}

main().catch(console.error);
