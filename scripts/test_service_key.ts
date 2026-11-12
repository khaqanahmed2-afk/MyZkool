import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.VITE_SUPABASE_URL!;
  const key = process.env.APP_MASTER_KEY;
  console.log("URL:", url, "Key length:", key ? key.length : 0);
  if (!key) {
    console.log("No APP_MASTER_KEY");
    process.exit(0);
  }
  const client = createClient(url, key);
  const { data, error } = await client.from("schools").select("id, name");
  console.log("Query with APP_MASTER_KEY:", data?.length, "Error:", error?.message);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

