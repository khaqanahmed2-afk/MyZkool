import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

async function testLiveAggregates() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  const token = authData.session?.access_token;
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 1. Schools
  const { data: schools, count: schoolCount, error: sErr } = await client
    .from("schools")
    .select("id, name, created_at, onboarding_completed", { count: "exact" });
  console.log("Live schools:", schoolCount, schools);

  // 2. Students
  const { count: studentCount, error: stuErr } = await client
    .from("students")
    .select("id", { count: "exact", head: true });
  console.log("Live students:", studentCount, stuErr?.message || "OK");

  // 3. Subscriptions
  const { data: subs, count: subCount, error: subErr } = await client
    .from("school_subscriptions")
    .select("status, plan_id, amount, billing_cycle, current_period_ends_at, trial_ends_at, subscription_plans(slug, name, price_monthly)", { count: "exact" });
  console.log("Live subscriptions:", subCount, subs);

  // 4. Payments
  const { data: payments, count: payCount, error: payError } = await client
    .from("school_subscription_payments")
    .select("amount_paise, status, created_at", { count: "exact" });
  console.log("Live payments:", payCount, payments, "error:", payError);

  // 5. Invoices
  const { data: invoices, count: invCount } = await client
    .from("subscription_invoices")
    .select("total_paise, status, due_date", { count: "exact" });
  console.log("Live invoices:", invCount, invoices);

  // 6. Tickets
  const { data: tickets, count: tktCount } = await client
    .from("support_tickets")
    .select("id, status, priority", { count: "exact" });
  console.log("Live tickets:", tktCount, tickets);

  // 7. Audit logs
  const { data: audit, count: audCount } = await client
    .from("platform_audit_logs")
    .select("id, action, created_at", { count: "exact" });
  console.log("Live audit logs:", audCount, audit);
}

testLiveAggregates().catch(console.error);
