import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://obmlmqorhxdwdtgyknfy.supabase.co";
const supabaseAnonKey = "sb_publishable_Byd4tG_efU5HjVI7v41Zbg_BPxvnd3Y";
const client = createClient(supabaseUrl, supabaseAnonKey);
async function run() {
  const { data, error } = await client.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  if (data.length > 0) {
     console.log("Columns:", Object.keys(data[0]));
  } else {
     console.log("No data. Generating a schema introspect...");
     const { data: schemaData, error: schemaErr } = await client.rpc('get_schema');
     console.log("Rpc result:", schemaData, schemaErr);
  }
}
run();
