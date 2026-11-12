import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });

  const { data: schools } = await supabase.from("schools").select("*");
  const { data: subs } = await supabase.from("school_subscriptions").select("*, subscription_plans(*)");
  const { data: profiles } = await supabase.from("profiles").select("*").eq("role", "school_admin");
  const { data: students } = await supabase.from("students").select("id, school_id");
  const { data: staff } = await supabase.from("staff").select("id, school_id");

  console.log("Schools in DB:", schools?.length);
  console.log("Subscriptions in DB:", subs?.length);
  console.log("School Admin profiles in DB:", profiles?.length);
  console.log("Students in DB:", students?.length);
  console.log("Staff in DB:", staff?.length);

  for (const s of schools || []) {
    const sub = subs?.find(sub => sub.school_id === s.id);
    const prof = profiles?.find(p => p.school_id === s.id);
    const stuCount = students?.filter(st => st.school_id === s.id).length || 0;
    const staffCount = staff?.filter(st => st.school_id === s.id).length || 0;
    console.log(`- ${s.name} (${s.subdomain}) | Plan: ${sub?.subscription_plans?.name || 'None'} | Sub Status: ${sub?.status} | Admin: ${prof?.full_name || s.official_email} | Students: ${stuCount} | Staff: ${staffCount}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

