// app/more/page.tsx

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconChartBar,
  IconDeviceFloppy,
  IconDots,
  IconLogout,
  IconPackage,
  IconPlus,
  IconSettings,
  IconShoppingBag,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LOCAL_STORAGE_KEYS } from "../lib/local-storage-keys"

type ProfileSettings = {
  shopName: string
  ownerName: string
  email: string
  phone: string
  address: string
}

const DEFAULT_PROFILE: ProfileSettings = {
  shopName: "Order Manager",
  ownerName: "Owner",
  email: "",
  phone: "",
  address: "",
}

function getStoredProfile(): ProfileSettings {
  if (typeof window === "undefined") return DEFAULT_PROFILE

  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEYS.settings)

  if (!stored) return DEFAULT_PROFILE

  try {
    return {
      ...DEFAULT_PROFILE,
      ...(JSON.parse(stored) as Partial<ProfileSettings>),
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return "OM"

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

export default function MorePage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<ProfileSettings>(DEFAULT_PROFILE)

  useEffect(() => {
    const loadProfile = window.setTimeout(() => {
      setProfile(getStoredProfile())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadProfile)
  }, [])

  function updateProfile(key: keyof ProfileSettings, value: string) {
    setSaved(false)
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(profile))
    setSaved(true)
  }

  function handleLogout() {
    window.localStorage.removeItem("latli_session")
    window.localStorage.removeItem("latli_account")
    router.push("/login")
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Account</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              More
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        <Card className="rounded-[20px] shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary text-lg text-primary-foreground">
                  {getInitials(profile.ownerName || profile.shopName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate font-heading text-xl font-medium">
                  {profile.shopName || "Order Manager"}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {profile.ownerName || "Owner"}
                </p>
                {profile.email ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconSettings className="size-5 text-muted-foreground" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update shop and owner details for this device.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {saved ? (
                <Alert className="rounded-xl">
                  <AlertDescription>Profile settings saved.</AlertDescription>
                </Alert>
              ) : null}

              <TextInput
                id="shopName"
                label="Shop name"
                value={profile.shopName}
                onChange={(value) => updateProfile("shopName", value)}
                placeholder="Your shop name"
                icon={<IconShoppingBag className="size-5 text-muted-foreground" />}
              />

              <TextInput
                id="ownerName"
                label="Owner name"
                value={profile.ownerName}
                onChange={(value) => updateProfile("ownerName", value)}
                placeholder="Owner name"
                icon={<IconUser className="size-5 text-muted-foreground" />}
              />

              <TextInput
                id="email"
                label="Email"
                value={profile.email}
                onChange={(value) => updateProfile("email", value)}
                placeholder="you@example.com"
                type="email"
              />

              <TextInput
                id="phone"
                label="Phone"
                value={profile.phone}
                onChange={(value) => updateProfile("phone", value)}
                placeholder="Phone number"
                type="tel"
              />

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={profile.address}
                  onChange={(event) => updateProfile("address", event.target.value)}
                  placeholder="Shop or pickup address"
                  className="min-h-24 rounded-xl text-base"
                />
              </div>

              <Button type="submit" className="h-12 w-full rounded-xl">
                <IconDeviceFloppy className="mr-2 size-5" />
                Save Settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <IconLogout className="mr-2 size-5" />
          Logout
        </Button>
      </div>

      <BottomNavigation />
    </main>
  )
}

function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon ? (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        ) : null}
        <Input
          id={id}
          type={type}
          inputMode={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={icon ? "h-12 rounded-xl pl-10 text-base" : "h-12 rounded-xl text-base"}
        />
      </div>
    </div>
  )
}

function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        <BottomNavItem href="/dashboard" label="Dashboard">
          <IconChartBar className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/orders" label="Orders">
          <IconPackage className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/orders/create" label="Add">
          <IconPlus className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/customers" label="Customers">
          <IconUsers className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/more" label="More" active>
          <IconDots className="size-5" />
        </BottomNavItem>
      </div>
    </nav>
  )
}

function BottomNavItem({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex flex-col items-center gap-1 rounded-xl bg-primary px-2 py-2 text-primary-foreground"
          : "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground"
      }
    >
      {children}
      <span className="text-[11px] leading-none">{label}</span>
    </Link>
  )
}
