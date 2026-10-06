// app/reset-password/page.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LanguageSwitch } from "@/components/language-switch"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/provider"

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const router = useRouter()

  // "checking" until we know whether the reset link gave us a session.
  const [session, setSession] = useState<"checking" | "yes" | "no">(
    isSupabaseConfigured ? "checking" : "no"
  )
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    void createClient()
      .auth.getUser()
      .then(({ data }) => setSession(data.user ? "yes" : "no"))
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")

    if (password.length < 8) {
      setError(t("Password must be at least 8 characters."))
      return
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match."))
      return
    }

    setLoading(true)

    const { error: updateError } = await createClient().auth.updateUser({ password })

    if (updateError) {
      setError(t(updateError.message))
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="min-h-dvh bg-muted px-5 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-4 flex w-full justify-end">
          <LanguageSwitch />
        </div>
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt=""
            width={644}
            height={434}
            priority
            className="mx-auto mb-3 h-16 w-auto"
          />
          <h1 className="sr-only">{t("Latli")}</h1>
        </div>

        <Card className="w-full rounded-[20px] shadow-none">
          <CardHeader className="px-6 pt-6 pb-0 space-y-1">
            <CardTitle className="text-xl font-medium">{t("Set a new password")}</CardTitle>
            <CardDescription>{t("Choose a new password for your account.")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-5">
            {session === "no" ? (
              <div className="space-y-5">
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{t("That reset link is invalid or has expired. Request a new one.")}</AlertDescription>
                </Alert>
                <Button asChild className="w-full h-12 rounded-xl text-base">
                  <Link href="/forgot-password">{t("Send reset link")}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error ? (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="password">{t("New password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={t("Create a password")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 pr-12 rounded-xl text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <IconEyeOff className="size-5" /> : <IconEye className="size-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("Confirm password")}</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("Confirm your password")}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base"
                  disabled={loading || session === "checking"}
                >
                  {loading ? t("Saving...") : t("Update password")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
