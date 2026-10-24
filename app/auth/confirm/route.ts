// Finishes email links that carry a token_hash (custom Supabase email
// templates pointing at our own domain). Works on any device or browser.

import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "email", "recovery"]

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const isRecovery = type === "recovery"

  if (
    tokenHash &&
    type &&
    ALLOWED_TYPES.includes(type) &&
    isSupabaseConfigured
  ) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!error) {
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Email confirmed. End the session the link just created so the user
      // signs in themselves.
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?confirmed=1`)
    }
  }

  return NextResponse.redirect(
    isRecovery ? `${origin}/forgot-password?expired=1` : `${origin}/login`
  )
}
