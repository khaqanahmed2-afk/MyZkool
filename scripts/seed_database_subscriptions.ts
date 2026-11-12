import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });

  const { data: plans } = await supabase.from("subscription_plans").select("id, slug, name");
  const proPlan = plans?.find(p => p.slug === "pro");
  const basicPlan = plans?.find(p => p.slug === "basic");
  const customPlan = plans?.find(p => p.slug === "custom");

  console.log("Plans found:", plans?.map(p => ({ slug: p.slug, id: p.id })));

  const SUBS_TO_SEED = [
    {
      school_id: "0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa", // Khaqan Public School
      plan_id: basicPlan?.id,
      billing_cycle: "yearly",
      status: "active",
      trial_starts_at: "2024-01-01T00:00:00Z",
      trial_ends_at: "2024-01-15T00:00:00Z",
      current_period_starts_at: "2024-12-20T00:00:00Z",
      current_period_ends_at: "2025-12-20T00:00:00Z",
      amount: 10789.00,
      currency: "INR",
      gst_rate: 18.00,
      gst_amount: 1942.02,
      total_amount: 12731.02,
      payment_method: "upi",
      payment_status: "paid",
      metadata: { plan_slug: "basic", plan_name: "Basic", days_left_label: "30 days" },
    },
    {
      school_id: "33a509da-9f79-44c0-ad71-372916d04925", // Bright Future Academy
      plan_id: proPlan?.id,
      billing_cycle: "yearly",
      status: "active",
      trial_starts_at: "2024-05-01T00:00:00Z",
      trial_ends_at: "2024-05-15T00:00:00Z",
      current_period_starts_at: "2024-05-15T00:00:00Z",
      current_period_ends_at: "2027-05-15T00:00:00Z",
      amount: 19429.00,
      currency: "INR",
      gst_rate: 18.00,
      gst_amount: 3497.22,
      total_amount: 22926.22,
      payment_method: "card",
      payment_status: "paid",
      metadata: { plan_slug: "pro", plan_name: "Pro" },
    },
    {
      school_id: "599a11a0-cdfe-4f36-896d-3e212a20f0f3", // Green Valley School
      plan_id: proPlan?.id,
      billing_cycle: "monthly",
      status: "trialing",
      trial_starts_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      current_period_starts_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      current_period_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      amount: 0.00,
      currency: "INR",
      gst_rate: 18.00,
      gst_amount: 0.00,
      total_amount: 0.00,
      payment_method: "trial",
      payment_status: "trial",
      metadata: { plan_slug: "pro", plan_name: "Pro", is_trial: true, days_left: 7 },
    },
    {
      school_id: "fad2d00f-4723-4deb-b1d7-1c08ef408b80", // City International School
      plan_id: customPlan?.id,
      billing_cycle: "yearly",
      status: "active",
      trial_starts_at: "2024-06-01T00:00:00Z",
      trial_ends_at: "2024-06-15T00:00:00Z",
      current_period_starts_at: "2024-06-30T00:00:00Z",
      current_period_ends_at: "2027-06-30T00:00:00Z",
      amount: 45000.00,
      currency: "INR",
      gst_rate: 18.00,
      gst_amount: 8100.00,
      total_amount: 53100.00,
      payment_method: "netbanking",
      payment_status: "paid",
      metadata: { plan_slug: "custom", plan_name: "Custom" },
    },
    {
      school_id: "98d1b20b-80c9-4d6a-bbfd-197fccf47bda", // Sunrise Public School
      plan_id: basicPlan?.id,
      billing_cycle: "monthly",
      status: "past_due",
      trial_starts_at: "2024-11-01T00:00:00Z",
      trial_ends_at: "2024-11-15T00:00:00Z",
      current_period_starts_at: "2024-12-10T00:00:00Z",
      current_period_ends_at: "2025-01-10T00:00:00Z",
      amount: 999.00,
      currency: "INR",
      gst_rate: 18.00,
      gst_amount: 179.82,
      total_amount: 1178.82,
      payment_method: "offline_invoice",
      payment_status: "failed",
      metadata: { plan_slug: "basic", plan_name: "Basic", expired_date: "Jan 10, 2025" },
    },
  ];

  for (const s of SUBS_TO_SEED) {
    if (!s.plan_id) continue;
    const { data: existing } = await supabase.from("school_subscriptions").select("id").eq("school_id", s.school_id).maybeSingle();
    if (!existing) {
      const { data, error } = await supabase.from("school_subscriptions").insert(s as any).select();
      console.log(`Inserted sub for school ${s.school_id}:`, data?.length ? "SUCCESS" : "FAILED", error?.message);
    } else {
      console.log(`Sub for school ${s.school_id} already exists.`);
    }
  }

  // Update primary school (Peace Convent School)
  await supabase
    .from("school_subscriptions")
    .update({
      current_period_ends_at: "2027-04-01T00:00:00Z",
      status: "active",
      payment_status: "paid",
      metadata: {
        plan_slug: "pro",
        plan_name: "Pro Plan",
        student_limit: 2000,
        storage_limit_gb: 50,
      }
    })
    .eq("school_id", "b70261ef-37f1-46c8-a148-2c496a9d33a8");

  const { data: allSubs } = await supabase.from("school_subscriptions").select("id, school_id, status");
  console.log("Total subscriptions in Supabase:", allSubs?.length);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

