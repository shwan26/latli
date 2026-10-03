"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconShoppingBag,
  IconUser,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_PROFILE,
  getStoredProfile,
  saveStoredProfile,
  type ProfileSettings,
} from "../lib/local-profile"

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return "OM"

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

export default function ProfilePage() {
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

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveStoredProfile(profile)
    setSaved(true)
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
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/more" aria-label="Back to more">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Account</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Profile
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
            <CardTitle className="text-lg">Profile Settings</CardTitle>
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
      </div>

      <BottomNavigation active="more" />
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
