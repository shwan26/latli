// app/data/page.tsx

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  IconBuildingStore,
  IconChevronRight,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Card, CardContent } from "@/components/ui/card"
import { buildCustomerSummaries } from "../lib/local-customers"
import { countCargo } from "@/lib/db/cargo"
import { listCustomers } from "@/lib/db/customers"
import { listOrders } from "@/lib/db/orders"
import { listShops } from "@/lib/db/shops"
import { useI18n } from "@/lib/i18n/provider"

type Counts = { shops: number; customers: number; cargo: number }

export default function DataPage() {
  const { t } = useI18n()

  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [shops, customers, orders, cargo] = await Promise.all([
        listShops().catch(() => []),
        listCustomers().catch(() => []),
        listOrders().catch(() => []),
        countCargo().catch(() => 0),
      ])

      if (cancelled) return

      setCounts({
        shops: shops.length,
        customers: buildCustomerSummaries(customers, orders).length,
        cargo,
      })
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-dvh bg-muted pb-28">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Saved records")}</p>
          <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Data")}</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-3 px-5 py-5">
        <Card className="rounded-[20px] shadow-none">
          <CardContent className="space-y-3 p-4">
            <DataLink
              href="/shops"
              title={t("Shops")}
              count={counts?.shops}
              description={t("Shops and the products you buy from them")}
              icon={<IconBuildingStore className="size-5" />}
            />
            <DataLink
              href="/customers"
              title={t("Customers")}
              count={counts?.customers}
              description={t("Contacts, addresses and order history")}
              icon={<IconUsers className="size-5" />}
            />
            <DataLink
              href="/cargo"
              title={t("Cargo")}
              count={counts?.cargo}
              description={t("Delivery partners")}
              icon={<IconTruckDelivery className="size-5" />}
            />
          </CardContent>
        </Card>
      </div>

      <BottomNavigation active="data" />
    </main>
  )
}

function DataLink({
  href,
  title,
  count,
  description,
  icon,
}: {
  href: string
  title: string
  count?: number
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
      {count === undefined ? null : (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
          {count}
        </span>
      )}
      <IconChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}
