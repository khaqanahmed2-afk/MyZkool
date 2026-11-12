import "dotenv/config";
import { supabase } from "../src/lib/supabase";

async function main() {
  await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });

  const { data: schoolSample } = await supabase.from("schools").select("*").limit(1);
  if (schoolSample && schoolSample[0]) {
    console.log("public.schools columns:", Object.keys(schoolSample[0]));
    console.log("school row sample:", schoolSample[0]);
  }

  const { data: subSample } = await supabase.from("school_subscriptions").select("*").limit(1);
  if (subSample && subSample[0]) {
    console.log("public.school_subscriptions columns:", Object.keys(subSample[0]));
    console.log("sub row sample:", subSample[0]);
  }

  const { data: profSample } = await supabase.from("profiles").select("*").limit(3);
  console.log("public.profiles sample:", profSample);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

