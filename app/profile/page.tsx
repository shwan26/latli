"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  IconArrowLeft,
  IconDeviceFloppy,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  DEFAULT_PROFILE,
  fetchProfile,
  saveProfile,
  type ProfileGender,
  type ProfileSettings,
} from "@/lib/profile"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"

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
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const loaded = isSupabaseConfigured
        ? await fetchProfile(createClient())
        : null

      if (cancelled) return

      if (loaded) setProfile(loaded)
      else setError("Could not load your profile.")
      setMounted(true)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  function updateProfile(
    key: "shopName" | "ownerName" | "phone" | "address",
    value: string
  ) {
    setSaved(false)
    setProfile((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (profile.age !== null && (profile.age < 13 || profile.age > 120)) {
      setError("Enter a valid age between 13 and 120.")
      return
    }

    setSaving(true)

    const saveError = await saveProfile(createClient(), profile)

    setSaving(false)

    if (saveError) {
      setSaved(false)
      setError(saveError)
      return
    }

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
              {error ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

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
              />
              <TextInput
                id="ownerName"
                label="Owner name"
                value={profile.ownerName}
                onChange={(value) => updateProfile("ownerName", value)}
                placeholder="Owner name"
              />
              <TextInput
                id="email"
                label="Email"
                value={profile.email}
                onChange={() => {}}
                type="email"
                disabled
              />
              <TextInput
                id="phone"
                label="Phone"
                value={profile.phone}
                onChange={(value) => updateProfile("phone", value)}
                placeholder="Phone number"
                type="tel"
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  id="age"
                  label="Age"
                  value={profile.age === null ? "" : String(profile.age)}
                  onChange={(value) => {
                    setSaved(false)
                    setProfile((current) => ({
                      ...current,
                      age: value === "" ? null : Number(value),
                    }))
                  }}
                  placeholder="Age"
                  type="number"
                />
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={profile.gender || "unset"}
                    onValueChange={(value) => {
                      setSaved(false)
                      setProfile((current) => ({
                        ...current,
                        gender: (value === "unset" ? "" : value) as ProfileGender,
                      }))
                    }}
                  >
                    <SelectTrigger id="gender" className="h-12 w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={profile.plan === "pro" ? "default" : "secondary"}>
                  {profile.plan === "pro" ? "Pro plan" : "Free plan"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {profile.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Managers on the Pro plan read order screenshots with Gemini.
                Everyone else reads them on this device. Plan and role are set
                by an admin.
              </p>
              <Button type="submit" className="h-12 w-full rounded-xl" disabled={saving}>
                <IconDeviceFloppy className="mr-2 size-5" />
                {saving ? "Saving..." : "Save Settings"}
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
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div>
        <Input
          id={id}
          type={type}
          inputMode={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 rounded-xl text-base"
        />
      </div>
    </div>
  )
}
