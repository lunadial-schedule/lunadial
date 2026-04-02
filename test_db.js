require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { data, error } = await supabase
    .from("chzzk_keep_alive_logs")
    .select("*")
    .order("executed_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
run();
