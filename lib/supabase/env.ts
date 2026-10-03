// NEXT_PUBLIC_ variables must be read with a literal name so Next.js can
// inline them into the browser bundle.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)
