// app/create-account/page.tsx

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShieldCheck,
  IconShoppingBag,
  IconUser,
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

export default function CreateAccountPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [shopName, setShopName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (!shopName || !ownerName || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      // TODO: connect this to your real register/auth logic
      console.log({
        shopName,
        ownerName,
        email,
        password,
      })

      router.push("/login")
    } catch {
      setError("Could not create account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-muted px-5 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 size-16 rounded-[20px] bg-primary flex items-center justify-center">
            <IconShoppingBag className="size-8 text-primary-foreground" />
          </div>

          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Create account
          </h1>

          <p className="mt-1.5 text-sm text-muted-foreground">
            Set up your shop to manage orders and deliveries.
          </p>
        </div>

        <Card className="w-full rounded-[20px] shadow-none">
          <CardHeader className="px-6 pt-6 pb-0 space-y-1">
            <CardTitle className="text-xl font-medium">
              Register your shop
            </CardTitle>
            <CardDescription>
              Enter your details to create an owner account.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-5">
            <form onSubmit={handleCreateAccount} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="shopName">Shop name</Label>

                <div className="relative">
                  <IconShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />

                  <Input
                    id="shopName"
                    type="text"
                    autoComplete="organization"
                    placeholder="Your shop name"
                    value={shopName}
                    onChange={(event) => setShopName(event.target.value)}
                    className="h-12 pl-10 rounded-xl text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner name</Label>

                <div className="relative">
                  <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />

                  <Input
                    id="ownerName"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={ownerName}
                    onChange={(event) => setOwnerName(event.target.value)}
                    className="h-12 pl-10 rounded-xl text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>

                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />

                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 pl-10 rounded-xl text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>

                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />

                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 pl-10 pr-12 rounded-xl text-base"
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

                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>

                <div className="relative">
                  <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />

                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className="h-12 pl-10 pr-12 rounded-xl text-base"
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

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : "Create account"}
                </Button>

                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl text-base"
                >
                  <Link href="/login">Back to login</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground flex items-center gap-1.5">
          <IconShieldCheck className="size-3.5" />
          Owner account for shop order management
        </p>
      </div>
    </main>
  )
}