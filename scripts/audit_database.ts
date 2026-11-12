import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  if (authErr) {
    console.error("Auth err:", authErr);
    process.exit(1);
  }
  console.log("Logged in user id:", authData.user.id, "email:", authData.user.email);

  const { data: adminRows, error: aErr } = await supabase.from("platform_admins").select("*");
  console.log("Platform admin rows:", adminRows, "Error:", aErr?.message);

  const { data: isAdm, error: fErr } = await supabase.rpc("is_platform_admin");
  console.log("is_platform_admin():", isAdm, "Error:", fErr?.message);

  const { data: rpcAgg, error: rpcErr } = await supabase.rpc("get_platform_cross_tenant_aggregates");
  console.log("RPC get_platform_cross_tenant_aggregates:", rpcAgg ? "Success! Total schools: " + rpcAgg.total_schools : "Failed", "Error:", rpcErr?.message);

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
