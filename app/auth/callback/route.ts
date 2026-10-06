// Finishes the email confirmation link sent by Supabase.

import { NextResponse } from "next/server"

import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

// Where the link may send the user after sign-in. Anything else is ignored, so
// the link cannot be used to redirect off-site.
const ALLOWED_NEXT = ["/dashboard", "/reset-password"]

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requested = searchParams.get("next") ?? ""
  const next = ALLOWED_NEXT.includes(requested) ? requested : "/dashboard"

  if (code && isSupabaseConfigured) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    next === "/reset-password"
      ? `${origin}/forgot-password?expired=1`
      : `${origin}/login`
  )
}
