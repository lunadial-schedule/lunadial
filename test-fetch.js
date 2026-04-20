require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const todayStart = new Date("2026-04-17T00:00:00.000Z");
  const todayEnd = new Date("2026-04-23T00:00:00.000Z");

  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, start_time, streamer, streamer_id, status, categories, is_all_day, streamers(image_url, verified_mark)")
    .eq("is_deleted", false)
    .gte("start_time", todayStart.toISOString())
    .lte("start_time", todayEnd.toISOString())
    .order("start_time", { ascending: true });

  console.log("Error:", error);
  console.log("Data count:", data?.length);
  if (data?.length > 0) {
    console.log("First schedule time:", data[0].start_time);
  }
}
test();
