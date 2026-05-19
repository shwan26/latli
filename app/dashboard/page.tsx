// app/dashboard/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  IconAlertCircle,
  IconChartBar,
  IconClock,
  IconDots,
  IconPackage,
  IconPlus,
  IconShoppingBag,
  IconTruckDelivery,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react"

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
    const ordersToBuy = orders.filter(
      (order) =>
        order.deliveryStatus === "not_arranged" &&
        order.paymentStatus !== "refunded"
    )

    const waitingPayment = orders.filter(
      (order) =>
        order.paymentStatus === "not_paid" ||
        order.paymentStatus === "receiving"
    )

    const unpaidBalance = orders.filter(
      (order) =>
        order.remainingBalanceThb > 0 &&
        order.paymentStatus !== "fully_paid" &&
        order.paymentStatus !== "refunded"
    )

    const productBought = orders.filter(
      (order) => order.deliveryStatus === "product_bought"
    )

    const inDelivery = orders.filter(
      (order) =>
        order.deliveryStatus === "sent_to_cargo" ||
        order.deliveryStatus === "in_transit" ||
        order.deliveryStatus === "picked_up"
    )

    const totalSalesThb = orders.reduce(
      (sum, order) => sum + order.totalCustomerPayableThb,
      0
    )

    const totalSalesMmk = orders.reduce(
      (sum, order) =>
        sum + order.totalCustomerPayableThb * getOrderRate(order),
      0
    )

    const unpaidBalanceThb = unpaidBalance.reduce(
      (sum, order) => sum + order.remainingBalanceThb,
      0
    )

    const unpaidBalanceMmk = unpaidBalance.reduce(
      (sum, order) => sum + order.remainingBalanceThb * getOrderRate(order),
      0
    )

    const profitThb = orders.reduce((sum, order) => sum + order.profitThb, 0)

    const profitMmk = orders.reduce(
      (sum, order) => sum + order.profitThb * getOrderRate(order),
      0
    )

    return {
      ordersToBuy,
      ordersToBuyCount: ordersToBuy.length,
      waitingPaymentCount: waitingPayment.length,
      unpaidBalanceCount: unpaidBalance.length,
      productBoughtCount: productBought.length,
      inDeliveryCount: inDelivery.length,
      totalSalesThb,
      totalSalesMmk,
      unpaidBalanceThb,
      unpaidBalanceMmk,
      profitThb,
      profitMmk,
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
        <Card className="rounded-[20px] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-medium">
                <IconShoppingBag className="size-5 text-muted-foreground" />
                Orders to Buy
              </span>
              <Badge variant={summary.ordersToBuyCount > 0 ? "default" : "secondary"}>
                {summary.ordersToBuyCount}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {summary.ordersToBuy.length === 0 ? (
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm font-medium">No orders waiting to buy</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New customer orders with delivery status Not Arranged will show here.
                </p>
              </div>
            ) : (
              summary.ordersToBuy.slice(0, 5).map((order) => (
                <OrderToBuyRow key={order.id} order={order} />
              ))
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

        <section className="grid grid-cols-2 gap-3">
          <StatusMiniCard
            title="Waiting Pay"
            value={summary.waitingPaymentCount}
            icon={IconClock}
          />
          <StatusMiniCard
            title="Bought"
            value={summary.productBoughtCount}
            icon={IconPackage}
          />
          <StatusMiniCard
            title="With Cargo"
            value={summary.inDeliveryCount}
            icon={IconTruckDelivery}
          />
          <StatusMiniCard
            title="Unpaid"
            value={summary.unpaidBalanceCount}
            icon={IconAlertCircle}
          />
        </section>

        <Card className="rounded-[20px] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <IconWallet className="size-5 text-muted-foreground" />
              Currency Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">Thai Baht</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatBaht(summary.totalSalesThb)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total sales
                </p>
              </div>

              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs text-muted-foreground">Myanmar Kyat</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatKyat(summary.totalSalesMmk)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Converted total
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl"
              onClick={resetDemoData}
            >
              Reset demo local data
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">
              Money
            </h2>

            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link href="/orders">View all</Link>
            </Button>
          </div>

          <DashboardMoneyCard
            title="Unpaid Balance"
            description={`${summary.unpaidBalanceCount} orders still have balance`}
            href="/orders"
            icon={IconAlertCircle}
            badge="Action"
            baht={summary.unpaidBalanceThb}
            kyat={summary.unpaidBalanceMmk}
          />

          <DashboardMoneyCard
            title="Total Sales"
            description="Total customer payable"
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
        </section>
      </div>

      <BottomNavigation />
    </main>
  )
}

function OrderToBuyRow({ order }: { order: LocalOrder }) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-2xl border bg-background px-4 py-3 transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {order.productName || "Product photo order"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {order.customerName}
            {order.productSize || order.productOption
              ? ` · Size ${order.productSize || order.productOption}`
              : ""}
            {order.productColor ? ` · ${order.productColor}` : ""}
          </p>
        </div>

        <Badge variant="outline" className="shrink-0">
          {order.quantity || 1} item{(order.quantity || 1) === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Cost</p>
          <p className="mt-0.5 text-sm font-semibold">
            {formatBaht(order.totalRetailerCostThb)}
          </p>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Selling</p>
          <p className="mt-0.5 text-sm font-semibold">
            {formatBaht(order.totalCustomerPayableThb)}
          </p>
        </div>
      </div>
    </Link>
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

function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pb-4 pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        <BottomNavItem href="/dashboard" label="Dashboard" active>
          <IconChartBar className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/orders" label="Orders">
          <IconPackage className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/orders/create" label="Add">
          <IconPlus className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/customers" label="Customers">
          <IconUsers className="size-5" />
        </BottomNavItem>

        <BottomNavItem href="/more" label="More">
          <IconDots className="size-5" />
        </BottomNavItem>
      </div>
    </nav>
  )
}

function BottomNavItem({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex flex-col items-center gap-1 rounded-xl bg-primary px-2 py-2 text-primary-foreground"
          : "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-muted-foreground"
      }
    >
      {children}
      <span className="text-[11px] leading-none">{label}</span>
    </Link>
  )
}
