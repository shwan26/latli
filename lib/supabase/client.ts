import { createBrowserClient } from "@supabase/ssr"

import { supabaseKey, supabaseUrl } from "./env"

// Call only when isSupabaseConfigured is true.
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseKey!)
}
