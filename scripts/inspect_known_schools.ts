import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  
  const schoolIds = [
    "0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa",
    "33a509da-9f79-44c0-ad71-372916d04925",
    "599a11a0-cdfe-4f36-896d-3e212a20f0f3",
    "98d1b20b-80c9-4d6a-bbfd-197fccf47bda",
    "b70261ef-37f1-46c8-a148-2c496a9d33a8",
    "fad2d00f-4723-4deb-b1d7-1c08ef408b80",
  ];

  console.log("Checking profiles for these schools...");
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("school_id, full_name, email, role")
    .in("school_id", schoolIds);
  console.log("Profiles found:", profiles, "error:", pErr);

  console.log("Checking subscriptions...");
  const { data: subs, error: sErr } = await supabase
    .from("school_subscriptions")
    .select("school_id, status, billing_cycle, amount")
    .in("school_id", schoolIds);
  console.log("Subscriptions found:", subs, "error:", sErr);
}

main().catch(console.error);

