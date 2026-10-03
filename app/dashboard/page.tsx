// app/dashboard/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  IconAlertCircle,
  IconArrowBackUp,
  IconChartBar,
  IconCircleCheck,
  IconPackage,
  IconPlus,
  IconShoppingBag,
  IconShoppingCartOff,
  IconTruckDelivery,
  IconWallet,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import {
  getOrdersFromLocalStorage,
  resetOrdersLocalStorage,
  type LocalOrder,
} from "../lib/local-orders"

import {
  formatBaht,
  formatKyat,
  getOrderRate,
} from "../lib/currency"

export default function DashboardPage() {
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const loadOrders = window.setTimeout(() => {
      setOrders(getOrdersFromLocalStorage())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadOrders)
  }, [])

  const summary = useMemo(() => {
    const notBought = orders.filter(
      (order) =>
        order.deliveryStatus === "not_arranged" &&
        order.paymentStatus !== "refunded"
    )

    const bought = orders.filter(
      (order) =>
        order.deliveryStatus === "product_bought" ||
        order.deliveryStatus === "waiting_pickup"
    )

    const withCargo = orders.filter(
      (order) =>
        order.deliveryStatus === "sent_to_cargo" ||
        order.deliveryStatus === "in_transit" ||
        order.deliveryStatus === "picked_up"
    )

    const complete = orders.filter(
      (order) => order.deliveryStatus === "delivered"
    )

    const unpaid = orders.filter(
      (order) =>
        order.remainingBalanceThb > 0 &&
        order.paymentStatus !== "fully_paid" &&
        order.paymentStatus !== "refunded"
    )

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
      notBoughtCount: notBought.length,
      boughtCount: bought.length,
      withCargoCount: withCargo.length,
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

  function resetDemoData() {
    const orders = resetOrdersLocalStorage()
    setOrders(orders)
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Dashboard
            </h1>
          </div>

          <Button asChild size="icon" className="size-11 rounded-xl">
            <Link href="/orders/create" aria-label="Add order">
              <IconPlus className="size-5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">Orders</h2>

          <div className="grid grid-cols-2 gap-3">
            <StatusMiniCard
              title="Not bought"
              value={summary.notBoughtCount}
              icon={IconShoppingCartOff}
            />
            <StatusMiniCard
              title="Bought"
              value={summary.boughtCount}
              icon={IconPackage}
            />
            <StatusMiniCard
              title="With cargo"
              value={summary.withCargoCount}
              icon={IconTruckDelivery}
            />
            <StatusMiniCard
              title="Complete"
              value={summary.completeCount}
              icon={IconCircleCheck}
            />
            <div className="col-span-2">
              <StatusMiniCard
                title="Unpaid"
                value={summary.unpaidCount}
                icon={IconAlertCircle}
              />
            </div>
          </div>
        </section>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-medium">
                <IconShoppingBag className="size-5 text-muted-foreground" />
                Orders to buy
              </span>
              <Badge variant={summary.notBoughtCount > 0 ? "default" : "secondary"}>
                {summary.notBoughtCount}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {summary.notBoughtCount === 0 ? (
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-medium">No orders waiting to buy</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New customer orders with delivery status Not Arranged will show here.
                </p>
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
                  <ShopLine label="No shop" count={summary.noShopCount} />
                ) : null}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link href="/orders">View all</Link>
              </Button>
              <Button asChild className="h-11 rounded-xl">
                <Link href="/orders/create">
                  <IconPlus className="mr-2 size-4" />
                  Add order
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">Money</h2>

          <DashboardMoneyCard
            title="Total sales"
            description="Customer payable, refunds excluded"
            href="/orders"
            icon={IconChartBar}
            baht={summary.totalSalesThb}
            kyat={summary.totalSalesMmk}
          />

          <DashboardMoneyCard
            title="Profit"
            description="Owner only"
            href="/orders"
            icon={IconWallet}
            badge="Owner"
            baht={summary.profitThb}
            kyat={summary.profitMmk}
          />

          <DashboardMoneyCard
            title="Unpaid"
            description={`${summary.unpaidCount} ${summary.unpaidCount === 1 ? "order" : "orders"} still have balance`}
            href="/orders"
            icon={IconAlertCircle}
            badge="Action"
            baht={summary.unpaidThb}
            kyat={summary.unpaidMmk}
          />

          <DashboardMoneyCard
            title="Refund"
            description={`${summary.refundCount} refunded ${summary.refundCount === 1 ? "order" : "orders"}`}
            href="/orders"
            icon={IconArrowBackUp}
            baht={summary.refundThb}
            kyat={summary.refundMmk}
          />
        </section>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl"
          onClick={resetDemoData}
        >
          Reset demo local data
        </Button>
      </div>

      <BottomNavigation active="dashboard" />
    </main>
  )
}

function ShopLine({ label, count }: { label: string; count: number }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className="shrink-0 text-muted-foreground">
        {count} {count === 1 ? "order" : "orders"}
      </span>
    </li>
  )
}

function StatusMiniCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: React.ElementType
}) {
  return (
    <Link href="/orders" className="block">
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

function DashboardMoneyCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
  baht,
  kyat,
}: {
  title: string
  description: string
  href: string
  icon: React.ElementType
  badge?: string
  baht: number
  kyat: number
}) {
  return (
    <Link href={href} className="block">
      <Card className="rounded-[20px] shadow-none transition active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium leading-none">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>

                {badge ? (
                  <Badge variant="secondary" className="shrink-0">
                    {badge}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border bg-background px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Baht</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {formatBaht(baht)}
                  </p>
                </div>

                <div className="rounded-xl border bg-background px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Kyat</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {formatKyat(kyat)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
