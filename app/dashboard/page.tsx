// app/dashboard/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  IconAlertCircle,
  IconBox,
  IconCircleCheck,
  IconPackage,
  IconPlus,
  IconShoppingBag,
  IconShoppingCartOff,
  IconTruckDelivery,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MonthlySalesChart } from "@/components/monthly-sales-chart"
import { Badge } from "@/components/ui/badge"

import { type Currency, type LocalOrder } from "../lib/local-orders"
import { listOrders } from "@/lib/db/orders"
import { canUseSecondCurrency, fetchProfile } from "@/lib/profile"
import { createClient } from "@/lib/supabase/client"
import { isUnpaid } from "@/lib/order-filters"
import { messageOf } from "@/lib/db/shared"

import { formatMoney, getOrderRate } from "../lib/currency"
import { useI18n } from "@/lib/i18n/provider"
import { translate } from "@/lib/i18n/runtime"

export default function DashboardPage() {
  const { t } = useI18n()

  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [mounted, setMounted] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [baseCurrency, setBaseCurrency] = useState<Currency>("MMK")
  const [profileSecond, setProfileSecond] = useState<Currency | null>(null)
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
            setProfileSecond(
              canUseSecondCurrency(profile) ? profile.secondaryCurrency : null
            )
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

  // Pro accounts show their second currency. Free accounts only show one, but
  // keep showing the old customer currency when they already have orders in it.
  const secondCurrency = useMemo<Currency | null>(() => {
    if (profileSecond) return profileSecond

    const legacy = orders.find(
      (order) => order.customerCurrency !== order.baseCurrency
    )

    return legacy?.customerCurrency ?? null
  }, [orders, profileSecond])

  const summary = useMemo(() => {
    const withStatus = (status: LocalOrder["orderStatus"]) =>
      orders.filter((order) => order.orderStatus === status)

    // Refunded orders are not waiting to be bought.
    const notBought = withStatus("not_bought").filter(
      (order) => order.paymentStatus !== "refunded"
    )
    const bought = withStatus("bought")
    const sentCargo = withStatus("sent_cargo")
    const delivered = withStatus("delivered")
    const complete = withStatus("complete")

    const unpaid = orders.filter(isUnpaid)

    const refunded = orders.filter(
      (order) => order.paymentStatus === "refunded"
    )

    // Orders to buy, one line per shop. Orders without a shop name are
    // grouped under "No shop".
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

    const shopLines = [...countsByShop.values()].sort((a, b) =>
      a.label.localeCompare(b.label)
    )

    // Refunded orders are not real sales, so they stay out of sales and profit.
    const soldOrders = orders.filter(
      (order) => order.paymentStatus !== "refunded"
    )

    const sum = (
      list: LocalOrder[],
      value: (order: LocalOrder) => number
    ) => list.reduce((total, order) => total + value(order), 0)

    const withRate = (value: (order: LocalOrder) => number) =>
      (order: LocalOrder) => value(order) * getOrderRate(order)

    const salesThb = (order: LocalOrder) => order.totalCustomerPayableThb
    const profitThb = (order: LocalOrder) => order.profitThb
    const unpaidThb = (order: LocalOrder) => order.remainingBalanceThb
    const refundThb = (order: LocalOrder) => order.totalPaidThb

    return {
      notBoughtCount: withStatus("not_bought").length,
      boughtCount: bought.length,
      sentCargoCount: sentCargo.length,
      deliveredCount: delivered.length,
      completeCount: complete.length,
      unpaidCount: unpaid.length,
      refundCount: refunded.length,
      shopLines,
      noShopCount,
      totalSalesThb: sum(soldOrders, salesThb),
      totalSalesMmk: sum(soldOrders, withRate(salesThb)),
      profitThb: sum(soldOrders, profitThb),
      profitMmk: sum(soldOrders, withRate(profitThb)),
      unpaidThb: sum(unpaid, unpaidThb),
      unpaidMmk: sum(unpaid, withRate(unpaidThb)),
      refundThb: sum(refunded, refundThb),
      refundMmk: sum(refunded, withRate(refundThb)),
    }
  }, [orders])

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
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("Welcome back")}</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">{t("Dashboard")}</h1>
          </div>

          <Button asChild size="icon" className="size-11 rounded-xl">
            <Link href="/orders/create" aria-label={t("Add order")}>
              <IconPlus className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        {loadError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">{t("Orders")}</h2>

          <div className="grid grid-cols-2 gap-3">
            <StatusMiniCard
              title={t("Not bought")}
              value={summary.notBoughtCount}
              href="/orders?status=not_bought"
              icon={IconShoppingCartOff}
            />
            <StatusMiniCard
              title={t("Bought")}
              value={summary.boughtCount}
              href="/orders?status=bought"
              icon={IconPackage}
            />
            <StatusMiniCard
              title={t("With cargo")}
              value={summary.sentCargoCount}
              href="/orders?status=sent_cargo"
              icon={IconTruckDelivery}
            />
            <StatusMiniCard
              title={t("Delivered")}
              value={summary.deliveredCount}
              href="/orders?status=delivered"
              icon={IconBox}
            />
            <StatusMiniCard
              title={t("Complete")}
              value={summary.completeCount}
              href="/orders?status=complete"
              icon={IconCircleCheck}
            />
            <StatusMiniCard
              title={t("Unpaid")}
              value={summary.unpaidCount}
              href="/orders?payment=unpaid"
              icon={IconAlertCircle}
            />
          </div>
        </section>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-medium">
                <IconShoppingBag className="size-5 text-muted-foreground" />{t("Orders to buy")}</span>
              <Badge variant={summary.notBoughtCount > 0 ? "default" : "secondary"}>
                {summary.notBoughtCount}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {summary.notBoughtCount === 0 ? (
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-medium">{t("No orders waiting to buy")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("New customer orders with status Not bought will show here")}</p>
              </div>
            ) : (
              <ul className="divide-y rounded-2xl border bg-background">
                {summary.shopLines.map((shop) => (
                  <ShopLine
                    key={shop.label.toLowerCase()}
                    label={shop.label}
                    count={shop.count}
                  />
                ))}
                {summary.noShopCount > 0 ? (
                  <ShopLine label={t("No shop")} count={summary.noShopCount} />
                ) : null}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link href="/orders">{t("View all")}</Link>
              </Button>
              <Button asChild className="h-11 rounded-xl">
                <Link href="/orders/create">
                  <IconPlus className="mr-2 size-4" />{t("Add order")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">{t("Money")}</h2>

          <div className="grid grid-cols-2 gap-3">
            <MoneyBox
              baseCurrency={baseCurrency}
              secondCurrency={secondCurrency}
              title={t("Total sales")}
              href="/orders"
              base={summary.totalSalesThb}
              second={summary.totalSalesMmk}
            />
            <MoneyBox
              baseCurrency={baseCurrency}
              secondCurrency={secondCurrency}
              title={t("Profit")}
              href="/orders"
              base={summary.profitThb}
              second={summary.profitMmk}
            />
            <MoneyBox
              baseCurrency={baseCurrency}
              secondCurrency={secondCurrency}
              title={t("Unpaid")}
              href="/orders?payment=unpaid"
              base={summary.unpaidThb}
              second={summary.unpaidMmk}
            />
            <MoneyBox
              baseCurrency={baseCurrency}
              secondCurrency={secondCurrency}
              title={t("Refund")}
              href="/orders?payment=refunded"
              base={summary.refundThb}
              second={summary.refundMmk}
            />
          </div>

          <MonthlySalesChart orders={orders} currency={baseCurrency} />
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

function StatusMiniCard({
  title,
  value,
  href,
  icon: Icon,
}: {
  title: string
  value: number
  href: string
  icon: React.ElementType
}) {
  return (
    <Link href={href} className="block">
      <div className="rounded-[20px] border bg-background p-4 transition active:scale-[0.99]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <p className="mt-3 text-sm font-medium">{title}</p>
      </div>
    </Link>
  )
}

function MoneyBox({
  title,
  href,
  base,
  second,
  baseCurrency,
  secondCurrency,
}: {
  title: string
  href: string
  base: number
  second: number
  baseCurrency: Currency
  secondCurrency: Currency | null
}) {
  return (
    <Link href={href} className="block">
      <div className="h-full rounded-[20px] border bg-background p-4 transition active:scale-[0.99]">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-2 break-words text-lg font-semibold">
          {formatMoney(base, baseCurrency)}
        </p>
        {secondCurrency ? (
          <p className="mt-0.5 break-words text-xs text-muted-foreground">
            {formatMoney(second, secondCurrency)}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
