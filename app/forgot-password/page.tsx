// app/forgot-password/page.tsx
"use client"

import { Suspense, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LanguageSwitch } from "@/components/language-switch"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/provider"

export default function ForgotPasswordPage() {
  // useSearchParams needs a Suspense boundary for the production build.
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  )
}

function ForgotPasswordForm() {
  const { t } = useI18n()
  const expired = useSearchParams().get("expired") === "1"

  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")

    if (!email.trim()) {
      setError(t("Please enter your email address"))
      return
    }

    if (!isSupabaseConfigured) {
      setError(t("Supabase is not set up. See supabase/README.md"))
      return
    }

    setLoading(true)

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
    )

    setLoading(false)

    if (resetError) {
      setError(t(resetError.message))
      return
    }

    // Same message whether or not the email has an account.
    setSent(true)
  }

  return (
    <main className="min-h-dvh bg-muted px-5 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-4 flex w-full justify-end">
          <LanguageSwitch />
        </div>
        <div className="mb-8 text-center">
          <Link href="/" aria-label={t("Latli")} className="mx-auto mb-3 block w-fit">
            <Image
              src="/logo.png"
              alt=""
              width={644}
              height={434}
              priority
              className="h-16 w-auto"
            />
          </Link>
          <h1 className="sr-only">{t("Latli")}</h1>
        </div>

        <Card className="w-full rounded-[20px] shadow-none">
          <CardHeader className="px-6 pt-6 pb-0 space-y-1">
            <CardTitle className="text-xl font-medium">{t("Forgot password?")}</CardTitle>
            <CardDescription>{t("Enter your email and we will send you a link to reset your password")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-5">
            {sent ? (
              <div className="space-y-5">
                <Alert className="rounded-xl">
                  <AlertDescription>{t("If an account exists for that email, we sent a reset link. Check your inbox")}</AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="w-full h-12 rounded-xl text-base">
                  <Link href="/login">{t("Back to login")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {expired ? (
                  <Alert className="rounded-xl">
                    <AlertDescription>{t("That reset link is invalid or has expired. Request a new one")}</AlertDescription>
                  </Alert>
                ) : null}

                {error ? (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">{t("Email address")}</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={loading}>
                  {loading ? t("Sending…") : t("Send reset link")}
                </Button>

                <Button asChild variant="outline" className="w-full h-12 rounded-xl text-base">
                  <Link href="/login">{t("Back to login")}</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
