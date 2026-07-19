import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY " +
      "in your .env file (local) or deployment platform environment settings, " +
      "then redeploy.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
