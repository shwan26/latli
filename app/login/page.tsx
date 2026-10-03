// app/login/page.tsx
"use client"

import { useState } from "react"
import { IconEye, IconEyeOff, IconShoppingBag, IconShieldCheck, IconUserPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/provider"
import { LanguageSwitch } from "@/components/language-switch"



export default function LoginPage() {
  const { t } = useI18n()

  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password) { setError(t("Please enter your email and password.")); return }
    if (!isSupabaseConfigured) {
      setError(t("Supabase is not set up. See supabase/README.md."))
      return
    }

    setLoading(true)

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(t(signInError.message))
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
          <div className="mx-auto mb-4 size-16 rounded-[20px] bg-primary flex items-center justify-center">
            <IconShoppingBag className="size-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Order Manager")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("Manage orders, payments & deliveries")}</p>
        </div>

        <Card className="w-full rounded-[20px] shadow-none">
          <CardHeader className="px-6 pt-6 pb-0 space-y-1">
            <CardTitle className="text-xl font-medium">{t("Welcome back")}</CardTitle>
            <CardDescription>{t("Enter your account details to continue.")}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-5">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && <Alert variant="destructive" className="rounded-xl"><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="space-y-2">
                <Label htmlFor="email">{t("Email address")}</Label>
                <div className="relative">
                  <Input id="email" type="email" inputMode="email" autoComplete="email"
                    placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-12 rounded-xl text-base" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("Password")}</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"}
                    autoComplete="current-password" placeholder={t("Enter your password")} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 pr-12 rounded-xl text-base" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition"
                    aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <IconEyeOff className="size-5" /> : <IconEye className="size-5" />}
                  </button>
                </div>
                <p className="text-right"><a href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">{t("Forgot password?")}</a></p>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={loading}>
                {loading ? t("Signing in…") : t("Login")}
              </Button>
              {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t("or")}</span>
                <div className="flex-1 h-px bg-border" />
                </div>

                {/* Create account */}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl text-base gap-2"
                    onClick={() => router.push('/register')}
                    >
                    <IconUserPlus className="size-5" />{t("Create an account")}</Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground flex items-center gap-1.5">
          <IconShieldCheck className="size-3.5" />{t("Secure access for shop owners and staff only")}
        </p>
      </div>
    </main>
  )
}