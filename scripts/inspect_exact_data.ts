import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

async function inspectData() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  const token = authData.session?.access_token;

  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: schools } = await client.from("schools").select("id, name, subdomain, created_at, official_email");
  console.log("All schools in database (via user client):", schools);

  const { data: students, count: stuCount, error: stuError } = await client.from("students").select("id", { count: "exact" }).limit(5);
  console.log("Students count:", stuCount, "sample 5:", students, "error:", stuError);

  const { data: plans } = await client.from("subscription_plans").select("*");
  console.log("Plans in DB:", plans?.map(p => ({ slug: p.slug, name: p.name, price_monthly: p.price_monthly })));

  const { data: subs } = await client.from("school_subscriptions").select("*");
  console.log("School subscriptions in DB:", subs);

  const { data: payments } = await client.from("school_subscription_payments").select("*");
  console.log("Subscription payments in DB:", payments);

  const { data: feeInvoices } = await client.from("subscription_invoices").select("*");
  console.log("Subscription invoices in DB:", feeInvoices);
}

inspectData().catch(console.error);
