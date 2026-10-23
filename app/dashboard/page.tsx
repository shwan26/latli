// app/dashboard/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
  IconPackage,
  IconTrophy,
  IconUser,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  isSoldInMonth,
  MonthlySalesChart,
  type ReviewMonth,
} from "@/components/monthly-sales-chart"
import { Badge } from "@/components/ui/badge"

import { type Currency, type LocalOrder } from "../lib/local-orders"
import { getOrderCustomerKey } from "../lib/local-customers"
import { listOrders } from "@/lib/db/orders"
import { fetchProfile } from "@/lib/profile"
import { createClient } from "@/lib/supabase/client"
import { messageOf } from "@/lib/db/shared"

import { formatMoney } from "../lib/currency"
import { useI18n } from "@/lib/i18n/provider"
import { dateLocale, translate } from "@/lib/i18n/runtime"

export default function DashboardPage() {
  const { t } = useI18n()

  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [mounted, setMounted] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [baseCurrency, setBaseCurrency] = useState<Currency>("MMK")
  const [month, setMonth] = useState<ReviewMonth>(() => {
    const now = new Date()
    return { year: now.getFullYear(), index: now.getMonth() }
  })
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [loaded, profile] = await Promise.all([
          listOrders(),
          fetchProfile(createClient()),
        ])

        if (!cancelled) {
          setOrders(loaded)

          if (profile) {
            setIsPro(profile.plan === "pro")
            setBaseCurrency(profile.baseCurrency)
          }
        }
      } catch (error) {
        if (!cancelled) setLoadError(messageOf(error, translate("Could not load orders")))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  // Orders still to buy, one line per shop. Orders without a shop name are
  // grouped under "No shop". Refunded orders are not waiting to be bought.
  const toBuy = useMemo(() => {
    const notBought = orders.filter(
      (order) =>
        order.orderStatus === "not_bought" && order.paymentStatus !== "refunded"
    )
    const countsByShop = new Map<string, { label: string; count: number }>()
    let noShopCount = 0

    for (const order of notBought) {
      const label = order.retailerName?.trim()

      if (!label) {
        noShopCount += 1
        continue
      }

      const key = label.toLowerCase()
      const entry = countsByShop.get(key)

      if (entry) {
        entry.count += 1
      } else {
        countsByShop.set(key, { label, count: 1 })
      }
    }

    return {
      count: notBought.length,
      noShopCount,
      shopLines: [...countsByShop.values()].sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
    }
  }, [orders])

  // The best customer and product of the month on screen.
  const top = useMemo(() => {
    const customers = new Map<
      string,
      { key: string; name: string; sales: number; orders: number }
    >()
    const products = new Map<
      string,
      { name: string; units: number; sales: number }
    >()

    for (const order of orders) {
      if (!isSoldInMonth(order, month)) continue

      const customerKey = getOrderCustomerKey(order)
      const customer = customers.get(customerKey) ?? {
        key: customerKey,
        name: order.customerName,
        sales: 0,
        orders: 0,
      }

      customer.sales += order.totalCustomerPayable
      customer.orders += 1
      customers.set(customerKey, customer)

      const productName = order.productName?.trim()

      if (productName) {
        const productKey = productName.toLowerCase()
        const product = products.get(productKey) ?? {
          name: productName,
          units: 0,
          sales: 0,
        }

        product.units += order.quantity ?? 1
        product.sales += order.totalCustomerPayable
        products.set(productKey, product)
      }
    }

    return {
      customer: [...customers.values()].sort((a, b) => b.sales - a.sales)[0],
      product: [...products.values()].sort(
        (a, b) => b.units - a.units || b.sales - a.sales
      )[0],
    }
  }, [orders, month])

  const monthLabel = new Date(month.year, month.index, 1).toLocaleDateString(
    dateLocale(),
    { month: "long", year: "numeric" }
  )
  const now = new Date()
  const isCurrentMonth =
    month.year === now.getFullYear() && month.index === now.getMonth()

  function shiftMonth(by: number) {
    setMonth((current) => {
      const next = new Date(current.year, current.index + by, 1)
      return { year: next.getFullYear(), index: next.getMonth() }
    })
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Loading dashboard...")}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">{t("Welcome back")}</p>
          <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Monthly review")}</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {loadError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <Card
          className={
            toBuy.count > 0
              ? "rounded-[20px] border-2 border-amber-400 bg-amber-50 shadow-none dark:border-amber-500/70 dark:bg-amber-950/30"
              : "rounded-[20px] shadow-none"
          }
        >
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconAlertTriangle
                  className={
                    toBuy.count > 0
                      ? "size-5 text-amber-600 dark:text-amber-400"
                      : "size-5 text-muted-foreground"
                  }
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("To do")}
                  </p>
                  <h2 className="font-heading text-base font-medium">{t("Buy these orders")}</h2>
                </div>
              </div>
              <Badge variant={toBuy.count > 0 ? "default" : "secondary"}>
                {toBuy.count}
              </Badge>
            </div>

            {toBuy.count === 0 ? (
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-medium">{t("No orders waiting to buy")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("New customer orders with status Not bought will show here")}</p>
              </div>
            ) : (
              <ul className="divide-y rounded-2xl border bg-background">
                {toBuy.shopLines.map((shop) => (
                  <ShopLine
                    key={shop.label.toLowerCase()}
                    label={shop.label}
                    count={shop.count}
                  />
                ))}
                {toBuy.noShopCount > 0 ? (
                  <ShopLine label={t("No shop")} count={toBuy.noShopCount} />
                ) : null}
              </ul>
            )}

            {toBuy.count > 0 ? (
              <Button asChild className="h-11 w-full rounded-xl">
                <Link href="/orders?status=not_bought">{t("View orders to buy")}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              onClick={() => shiftMonth(-1)}
              aria-label={t("Previous month")}
            >
              <IconChevronLeft className="size-5" />
            </Button>
            <h2 className="min-w-0 flex-1 text-center font-heading text-lg font-medium">
              {monthLabel}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              disabled={isCurrentMonth}
              onClick={() => shiftMonth(1)}
              aria-label={t("Next month")}
            >
              <IconChevronRight className="size-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TopCard
              title={t("Top customer")}
              icon={IconUser}
              name={top.customer?.name}
              detail={
                top.customer
                  ? `${formatMoney(top.customer.sales, baseCurrency)} · ${t(
                      top.customer.orders === 1 ? "{count} order" : "{count} orders",
                      { count: top.customer.orders }
                    )}`
                  : ""
              }
              href={
                top.customer
                  ? `/customers/${encodeURIComponent(top.customer.key)}`
                  : undefined
              }
            />
            <TopCard
              title={t("Top product")}
              icon={IconPackage}
              name={top.product?.name}
              detail={
                top.product
                  ? `${t("{count} sold", { count: top.product.units })} · ${formatMoney(top.product.sales, baseCurrency)}`
                  : ""
              }
            />
          </div>

          <MonthlySalesChart orders={orders} currency={baseCurrency} month={month} />
          {isPro ? (
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/dashboard/charts">{t("See more charts")}</Link>
            </Button>
          ) : null}
        </section>
      </div>

      <BottomNavigation active="dashboard" />
    </main>
  )
}

function ShopLine({ label, count }: { label: string; count: number }) {
  const { t } = useI18n()

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className="shrink-0 text-muted-foreground">
        {t(count === 1 ? "{count} order" : "{count} orders", { count })}
      </span>
    </li>
  )
}

function TopCard({
  title,
  icon: Icon,
  name,
  detail,
  href,
}: {
  title: string
  icon: React.ElementType
  name?: string
  detail: string
  href?: string
}) {
  const { t } = useI18n()

  const body = (
    <div className="h-full rounded-[20px] border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4" />
        {title}
        <IconTrophy className="ml-auto size-4 text-amber-500" />
      </div>
      {name ? (
        <>
          <p className="mt-2 break-words text-base font-semibold">{name}</p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{detail}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{t("No orders this month")}</p>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}
