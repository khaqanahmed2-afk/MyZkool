import "dotenv/config";
import { supabase } from "../src/lib/supabase";

const SCHOOLS_TO_SEED = [
  {
    id: "0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa",
    name: "Khaqan Public School",
    subdomain: "khaqan-public-school",
    school_type: "k12",
    affiliation_board: "cbse",
    official_email: "contact@khaqanpublicschool.edu.in",
    contact_phone: "+919876543201",
    address: "Civil Lines, Aligarh, Uttar Pradesh – 202001",
    city: "Aligarh",
    district: "Aligarh",
    state: "Uttar Pradesh",
    pin_code: "202001",
    onboarding_completed: true,
    onboarding_step: 6,
    created_at: "2024-04-10T09:00:00.000Z",
  },
  {
    id: "33a509da-9f79-44c0-ad71-372916d04925",
    name: "Bright Future Academy",
    subdomain: "bright-future-academy",
    school_type: "senior_secondary",
    affiliation_board: "cbse",
    official_email: "contact@brightfuture.edu.in",
    contact_phone: "+919876543202",
    address: "Mall Road, Kanpur, Uttar Pradesh – 208001",
    city: "Kanpur",
    district: "Kanpur",
    state: "Uttar Pradesh",
    pin_code: "208001",
    onboarding_completed: true,
    onboarding_step: 6,
    created_at: "2024-05-18T11:30:00.000Z",
  },
  {
    id: "599a11a0-cdfe-4f36-896d-3e212a20f0f3",
    name: "Green Valley School",
    subdomain: "green-valley-school",
    school_type: "middle",
    affiliation_board: "cbse",
    official_email: "office@greenvalley.edu.in",
    contact_phone: "+919876543203",
    address: "Sigra, Varanasi, Uttar Pradesh – 221002",
    city: "Varanasi",
    district: "Varanasi",
    state: "Uttar Pradesh",
    pin_code: "221002",
    onboarding_completed: true,
    onboarding_step: 6,
    created_at: "2024-06-01T09:15:00.000Z",
  },
  {
    id: "fad2d00f-4723-4deb-b1d7-1c08ef408b80",
    name: "City International School",
    subdomain: "city-international-school",
    school_type: "k12",
    affiliation_board: "icse",
    official_email: "info@cityintl.edu.in",
    contact_phone: "+919876543206",
    address: "Gomti Nagar, Lucknow, Uttar Pradesh – 226010",
    city: "Lucknow",
    district: "Lucknow",
    state: "Uttar Pradesh",
    pin_code: "226010",
    onboarding_completed: true,
    onboarding_step: 6,
    created_at: "2024-07-20T08:20:00.000Z",
  },
  {
    id: "98d1b20b-80c9-4d6a-bbfd-197fccf47bda",
    name: "Sunrise Public School",
    subdomain: "sunrise-public-school",
    school_type: "senior_secondary",
    affiliation_board: "state_board",
    official_email: "admin@sunriseps.in",
    contact_phone: "+919876543204",
    address: "Station Road, Barabanki, Uttar Pradesh – 225001",
    city: "Barabanki",
    district: "Barabanki",
    state: "Uttar Pradesh",
    pin_code: "225001",
    onboarding_completed: false,
    onboarding_step: 2,
    created_at: "2024-08-15T14:45:00.000Z",
  },
];

async function seed() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "myzkool.official@gmail.com",
    password: "R@shid12",
  });
  if (authErr) {
    console.error("Auth failed:", authErr.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log("Logged in:", authData.user.email);

  for (const s of SCHOOLS_TO_SEED) {
    const { data: existing } = await supabase.from("schools").select("id").eq("id", s.id).maybeSingle();
    if (!existing) {
      const { data, error } = await supabase.from("schools").insert({
        ...s,
        created_by: userId,
      }).select();
      console.log(`Inserted school ${s.name}:`, data?.length ? "SUCCESS" : "FAILED", error?.message);
    } else {
      console.log(`School ${s.name} already in database.`);
    }
  }

  const { data: allSchools } = await supabase.from("schools").select("id, name, subdomain");
  console.log("Total schools now in Supabase:", allSchools?.length);

  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

