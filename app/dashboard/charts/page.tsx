"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"

import type { Currency, LocalOrder } from "@/app/lib/local-orders"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ProCharts } from "@/components/pro-charts"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { listOrders } from "@/lib/db/orders"
import { messageOf } from "@/lib/db/shared"
import { fetchProfile } from "@/lib/profile"
import { useI18n } from "@/lib/i18n/provider"
import { createClient } from "@/lib/supabase/client"
import { translate } from "@/lib/i18n/runtime"

export default function ProChartsPage() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [currency, setCurrency] = useState<Currency>("MMK")
  const [isPro, setIsPro] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [loaded, profile] = await Promise.all([
          listOrders(),
          fetchProfile(createClient()),
        ])
        if (cancelled) return
        setOrders(loaded)
        if (profile) {
          setIsPro(profile.plan === "pro")
          setCurrency(profile.baseCurrency)
        }
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError, translate("Could not load charts")))
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Loading charts...")}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/dashboard" aria-label={t("Back to dashboard")}>
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{t("Pro feature")}</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("More charts")}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {error ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {!isPro ? (
          <Alert className="rounded-xl">
            <AlertDescription>{t("More charts are available on the Pro plan")}</AlertDescription>
          </Alert>
        ) : (
          <ProCharts orders={orders} currency={currency} />
        )}
      </div>

      <BottomNavigation active="dashboard" />
    </main>
  )
}
