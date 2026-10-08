// app/create-account/page.tsx

"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconEye,
  IconEyeOff,
  IconShieldCheck,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/provider"
import { LanguageSwitch } from "@/components/language-switch"
import { RichText } from "@/components/rich-text"

export default function CreateAccountPage() {
  const { t } = useI18n()

  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [shopName, setShopName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (
      !shopName ||
      !ownerName ||
      !age ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError(t("Please fill in all required fields"))
      return
    }

    const ageNumber = Number(age)

    if (!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 120) {
      setError(t("Enter a valid age between 13 and 120"))
      return
    }

    if (password.length < 8) {
      setError(t("Password must be at least 8 characters"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match"))
      return
    }

    if (!agreed) {
      setError(t("Please agree to the Terms of Service and Privacy Policy"))
      return
    }

    if (!isSupabaseConfigured) {
      setError(t("Supabase is not set up. See supabase/README.md"))
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        // The database trigger copies these into the new profile.
        data: {
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          age: ageNumber,
          gender,
          terms_accepted: true,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(t(signUpError.message))
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation is off in Supabase, so the user is already signed in.
      router.push("/dashboard")
      router.refresh()
      return
    }

    setConfirmationSent(true)
    setLoading(false)
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

          <p className="mt-1.5 text-sm text-muted-foreground">{t("Set up your shop to manage orders and deliveries")}</p>
        </div>

        <Card className="w-full rounded-[20px] shadow-none">
          <CardHeader className="px-6 pt-6 pb-0 space-y-1">
            <CardTitle className="text-xl font-medium">{t("Register your shop")}</CardTitle>
            <CardDescription>{t("Enter your details to create an owner account")}</CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-5">
            {confirmationSent ? (
              <div className="space-y-5">
                <Alert className="rounded-xl">
                  <AlertDescription>
                    {t("We sent a confirmation link to {email}. Open it to activate your account, then log in", { email: email.trim() })}
                    <span className="mt-2 block">{t("If you can't find it in your inbox, check your spam folder")}</span>
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full h-12 rounded-xl text-base">
                  <Link href="/login">{t("Go to login")}</Link>
                </Button>
              </div>
            ) : (
            <form onSubmit={handleCreateAccount} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="shopName">{t("Shop name")}</Label>

                <div className="relative">
                  <Input
                    id="shopName"
                    type="text"
                    autoComplete="organization"
                    placeholder={t("Your shop name")}
                    value={shopName}
                    onChange={(event) => setShopName(event.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerName">{t("Owner name")}</Label>

                <div className="relative">
                  <Input
                    id="ownerName"
                    type="text"
                    autoComplete="name"
                    placeholder={t("Your name")}
                    value={ownerName}
                    onChange={(event) => setOwnerName(event.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="age">{t("Age")}</Label>
                  <Input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    min="13"
                    max="120"
                    placeholder={t("Age")}
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    className="h-12 rounded-xl text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">{t("Gender (optional)")}</Label>
                  <Select
                    value={gender || "unset"}
                    onValueChange={(value) =>
                      setGender(value === "unset" ? "" : value)
                    }
                  >
                    <SelectTrigger id="gender" className="h-12 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">{t("Not set")}</SelectItem>
                      <SelectItem value="female">{t("Female")}</SelectItem>
                      <SelectItem value="male">{t("Male")}</SelectItem>
                      <SelectItem value="other">{t("Other")}</SelectItem>
                      <SelectItem value="prefer_not_to_say">{t("Prefer not to say")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("Email address")}</Label>

                <div className="relative">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("Password")}</Label>

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
                    {showPassword ? (
                      <IconEyeOff className="size-5" />
                    ) : (
                      <IconEye className="size-5" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">{t("Use at least 8 characters")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("Confirm password")}</Label>

                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("Confirm your password")}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className="h-12 pr-12 rounded-xl text-base"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <IconEyeOff className="size-5" />
                    ) : (
                      <IconEye className="size-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal leading-snug text-muted-foreground"
                >
                  <RichText
                    text={t("I agree to the {terms} and {privacy}")}
                    parts={{
                      terms: (
                        <Link href="/terms" className="font-medium text-foreground underline" target="_blank">
                          {t("Terms of Service")}
                        </Link>
                      ),
                      privacy: (
                        <Link href="/privacy" className="font-medium text-foreground underline" target="_blank">
                          {t("Privacy Policy")}
                        </Link>
                      ),
                    }}
                  />
                </Label>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base"
                  disabled={loading}
                >
                  {loading ? t("Creating account…") : t("Create account")}
                </Button>

                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl text-base"
                >
                  <Link href="/login">{t("Back to login")}</Link>
                </Button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground flex items-center gap-1.5">
          <IconShieldCheck className="size-3.5" />{t("Owner account for shop order management")}</p>
      </div>
    </main>
  )
}