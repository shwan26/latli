// app/customers/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { IconPlus, IconSearch, IconUsers } from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatMoney } from "../lib/currency"
import {
  buildCustomerSummaries,
  type CustomerSummary,
  type LocalCustomer,
} from "../lib/local-customers"
import { type LocalOrder } from "../lib/local-orders"
import { listCustomers } from "@/lib/db/customers"
import { listOrders } from "@/lib/db/orders"
import { messageOf } from "@/lib/db/shared"
import { useI18n } from "@/lib/i18n/provider"
import { translate } from "@/lib/i18n/runtime"

type SortKey = "name" | "newest" | "orders" | "amount"

export default function CustomersPage() {
  const { t } = useI18n()

  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [customers, setCustomers] = useState<LocalCustomer[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("amount")
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [loadedOrders, loadedCustomers] = await Promise.all([
          listOrders(),
          listCustomers(),
        ])

        if (cancelled) return

        setOrders(loadedOrders)
        setCustomers(loadedCustomers)
      } catch (error) {
        if (!cancelled) setLoadError(messageOf(error, translate("Could not load customers")))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const summaries = useMemo(
    () => buildCustomerSummaries(customers, orders),
    [customers, orders]
  )

  const visibleSummaries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return summaries
      .filter(
        (customer) =>
          !query ||
          [
            customer.name,
            customer.facebookName,
            customer.phone,
            customer.address,
            customer.otherContacts,
          ].some((value) => value.toLowerCase().includes(query))
      )
      .sort((a, b) => {
        switch (sort) {
          case "name":
            return a.name.localeCompare(b.name)
          case "newest":
            return b.createdAt.localeCompare(a.createdAt)
          case "orders":
            return b.orderCount - a.orderCount || a.name.localeCompare(b.name)
          default:
            return b.totalThb - a.totalThb || a.name.localeCompare(b.name)
        }
      })
  }, [summaries, search, sort])

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Loading customers...")}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t(summaries.length === 1 ? "{count} customer" : "{count} customers", { count: summaries.length })}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Customers")}</h1>
          </div>

          <Button asChild size="icon" className="size-11 rounded-xl">
            <Link href="/customers/new" aria-label={t("Add customer")}>
              <IconPlus className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4 px-5 py-5">
        {loadError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search name, phone, Facebook...")}
              aria-label={t("Search customers")}
              className="h-12 rounded-xl bg-background pl-10 text-base"
            />
          </div>

          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger
              className="h-12 rounded-xl bg-background"
              aria-label={t("Sort customers")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">{t("Highest amount")}</SelectItem>
              <SelectItem value="orders">{t("Most orders")}</SelectItem>
              <SelectItem value="name">{t("A to Z")}</SelectItem>
              <SelectItem value="newest">{t("Latest created")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {visibleSummaries.length === 0 ? (
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <IconUsers className="size-7 text-muted-foreground" />
              </div>
              <h2 className="mt-4 font-heading text-lg font-medium">{t("No customers found")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("Tap + to add a customer")}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[20px] shadow-none">
            <ul className="divide-y">
              {visibleSummaries.map((customer) => (
                <CustomerRow key={customer.key} customer={customer} />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <BottomNavigation active="customers" />
    </main>
  )
}

function CustomerRow({ customer }: { customer: CustomerSummary }) {
  const { t } = useI18n()

  return (
    <li>
      <Link
        href={`/customers/${encodeURIComponent(customer.key)}`}
        className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/60 active:bg-muted"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{customer.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t(customer.orderCount === 1 ? "{count} order" : "{count} orders", { count: customer.orderCount })}
          </p>
        </div>
        <p className="shrink-0 font-semibold">{formatMoney(customer.totalThb, customer.baseCurrency)}</p>
      </Link>
    </li>
  )
}
