"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconChevronRight,
  IconLogout,
  IconAlertTriangle,
  IconLifebuoy,
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
import { UpgradeLink } from "@/components/upgrade-link"
import { supportMailto } from "@/lib/support"
import { countCargo } from "@/lib/db/cargo"
import { useI18n } from "@/lib/i18n/provider"
import { LanguageSelect } from "@/components/language-select"
import { AccountDangerZone } from "@/components/account-danger-zone"
import { CurrencySettings } from "@/components/currency-settings"
import { RichText } from "@/components/rich-text"

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return "OM"

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

export default function MorePage() {
  const { t } = useI18n()

  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<ProfileSettings>(DEFAULT_PROFILE)
  const [cargoCount, setCargoCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const db = isSupabaseConfigured ? createClient() : null

      const [loadedProfile, cargo] = await Promise.all([
        db ? fetchProfile(db) : null,
        countCargo().catch(() => 0),
      ])

      if (cancelled) return

      if (loadedProfile) setProfile(loadedProfile)
      setCargoCount(cargo)
      setMounted(true)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Loading settings...")}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("Account")}</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("More")}</h1>
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
                  {profile.shopName || t("Order Manager")}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {profile.ownerName || t("Owner")}
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
              <IconSettings className="size-5 text-muted-foreground" />{t("Settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-3">
              <span className="text-sm font-medium">{t("Language")}</span>
              <LanguageSelect />
            </div>
            <CurrencySettings profile={profile} onSaved={setProfile} />
            <SettingsLink
              href="/profile"
              title={t("Profile")}
              description={t("Shop name, owner, phone, and address")}
              icon={<IconUser className="size-5" />}
            />
            <SettingsLink
              href="/cargo"
              title={t("Cargo")}
              description={`${cargoCount} saved cargo compan${
                cargoCount === 1 ? "y" : "ies"
              }`}
              icon={<IconTruckDelivery className="size-5" />}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconLifebuoy className="size-5 text-muted-foreground" />{t("Help")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsLink
              href={supportMailto("ticket", profile)}
              title={t("Raise a ticket")}
              description={t("Email support with your account details filled in")}
              icon={<IconLifebuoy className="size-5" />}
            />
            {profile.plan === "pro" ? null : (
              <p className="text-sm text-muted-foreground">
                <RichText text={t("To upgrade to Pro, contact {email}")} parts={{ email: <UpgradeLink account={profile} /> }} />
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconAlertTriangle className="size-5 text-muted-foreground" />{t("Danger zone")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AccountDangerZone />
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <IconLogout className="mr-2 size-5" />{t("Logout")}</Button>
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
