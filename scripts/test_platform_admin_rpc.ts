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
  console.log("Logged in auth.uid:", auth.user.id);
  const res = await supabase.rpc("is_platform_admin");
  console.log("is_platform_admin result:", res);
}

main().catch(console.error);

