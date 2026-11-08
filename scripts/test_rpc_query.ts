import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }
  
  // Try querying schools with head count
  const countRes = await supabase.from("schools").select("*", { count: "exact", head: true });
  console.log("Head count on schools:", countRes);

  // Check if any platform admin rpc exists
  const rpcList = [
    "get_master_admin_dashboard_metrics",
    "get_all_schools_for_platform_admin",
    "get_platform_metrics",
    "get_schools_overview",
  ];
  for (const r of rpcList) {
    const res = await supabase.rpc(r as any);
    console.log(`RPC ${r}:`, res.status, res.error?.message);
  }
}

main().catch(console.error);

