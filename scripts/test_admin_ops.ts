import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  if (authErr) {
    console.error("Auth error:", authErr.message);
    process.exit(1);
  }

  console.log("Logged in:", authData.user.email);

  // Check schools readable by platform admin
  const { data: schools, error: sErr } = await supabase.from("schools").select("*");
  console.log("Schools count accessible:", schools?.length, "Error:", sErr?.message);

  // Check subscriptions readable
  const { data: subs, error: subErr } = await supabase.from("school_subscriptions").select("*");
  console.log("Subscriptions accessible:", subs?.length, "Error:", subErr?.message);

  // Check audit logs insertable
  const { data: audit, error: audErr } = await supabase.from("platform_audit_logs").insert({
    admin_id: "da4beb29-0985-4bec-99fd-a17dc78b6fde",
    admin_email: "myzkool.official@gmail.com",
    action: "audit.test",
    resource_type: "schools",
    resource_id: "b70261ef-37f1-46c8-a148-2c496a9d33a8",
    school_id: "b70261ef-37f1-46c8-a148-2c496a9d33a8",
    details: { test: true },
  }).select();
  console.log("Audit log insert:", audit?.length, "Error:", audErr?.message);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

