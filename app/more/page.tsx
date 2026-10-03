"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconChevronRight,
  IconLogout,
  IconSettings,
  IconTruckDelivery,
  IconUser,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DEFAULT_PROFILE,
  fetchProfile,
  type ProfileSettings,
} from "@/lib/profile"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { countCargo } from "@/lib/db/cargo"
import {
  getLocalDataSummary,
  importLocalData,
  type LocalDataSummary,
} from "@/lib/db/import-local"
import { messageOf } from "@/lib/db/shared"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [profile, setProfile] = useState<ProfileSettings>(DEFAULT_PROFILE)
  const [cargoCount, setCargoCount] = useState(0)
  const [localData, setLocalData] = useState<LocalDataSummary | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState("")
  const [importMessage, setImportMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      const db = isSupabaseConfigured ? createClient() : null

      const [loadedProfile, cargo, localData] = await Promise.all([
        db ? fetchProfile(db) : null,
        countCargo().catch(() => 0),
        getLocalDataSummary().catch(() => null),
      ])

      if (cancelled) return

      if (loadedProfile) setProfile(loadedProfile)
      setCargoCount(cargo)
      setLocalData(localData)
      setMounted(true)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleImport() {
    setImporting(true)
    setImportMessage("")
    setImportProgress("Starting...")

    try {
      const result = await importLocalData((done, total) =>
        setImportProgress(`Imported ${done} of ${total}...`)
      )

      if (result.failures.length === 0) {
        setLocalData(null)
        setImportMessage("Your browser data was imported to your account.")
      } else {
        setImportMessage(
          `${result.failures.length} item(s) could not be imported. ${result.failures
            .slice(0, 3)
            .join("; ")}. Press Import to try again.`
        )
      }
    } catch (error) {
      setImportMessage(messageOf(error, "Could not import your browser data."))
    } finally {
      setImporting(false)
      setImportProgress("")
    }
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading settings...</p>
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

        {localData ? (
          <Card className="rounded-[20px] shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Import browser data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This browser still holds {localData.orders} order
                {localData.orders === 1 ? "" : "s"}, {localData.customers} customer
                {localData.customers === 1 ? "" : "s"}, {localData.shops} shop
                {localData.shops === 1 ? "" : "s"}, {localData.products} product
                {localData.products === 1 ? "" : "s"} and {localData.cargo} cargo
                compan{localData.cargo === 1 ? "y" : "ies"} from before accounts.
                Import them to keep them in your account. The browser copy is
                not deleted.
              </p>
              {importMessage ? (
                <Alert className="rounded-xl">
                  <AlertDescription>{importMessage}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="button"
                className="h-12 w-full rounded-xl"
                disabled={importing}
                onClick={handleImport}
              >
                {importing ? importProgress : "Import to my account"}
              </Button>
            </CardContent>
          </Card>
        ) : importMessage ? (
          <Alert className="rounded-xl">
            <AlertDescription>{importMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconSettings className="size-5 text-muted-foreground" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsLink
              href="/profile"
              title="Profile"
              description="Shop name, owner, phone, and address"
              icon={<IconUser className="size-5" />}
            />
            <SettingsLink
              href="/cargo"
              title="Cargo"
              description={`${cargoCount} saved cargo compan${
                cargoCount === 1 ? "y" : "ies"
              }`}
              icon={<IconTruckDelivery className="size-5" />}
            />
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

      <BottomNavigation active="more" />
    </main>
  )
}

function SettingsLink({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-background px-3 py-3 text-left"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <IconChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}
