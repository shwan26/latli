// app/customers/[key]/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  IconArrowLeft,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getOrdersFromLocalStorage,
  type LocalOrder,
} from "../../lib/local-orders"
import { formatBaht, formatKyat, getOrderRate } from "../../lib/currency"

function getCustomerKey(order: LocalOrder) {
  const name = order.customerName?.trim().toLowerCase()
  const facebook = order.facebookName?.trim().toLowerCase()
  const phone = order.phone?.trim().toLowerCase()

  return phone || facebook || name || order.id
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return "CU"

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

function formatDate(value: string) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "returned" || status === "delayed" || status === "refunded") {
    return "destructive"
  }

  if (status === "delivered" || status === "fully_paid") {
    return "default"
  }

  if (status === "not_paid" || status === "not_arranged") {
    return "outline"
  }

  return "secondary"
}

export default function CustomerDetailsPage() {
  const params = useParams<{ key: string }>()
  const customerKey = decodeURIComponent(params.key)

  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<LocalOrder[]>([])

  useEffect(() => {
    const loadOrders = window.setTimeout(() => {
      setOrders(getOrdersFromLocalStorage())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadOrders)
  }, [])

  const customerOrders = useMemo(
    () =>
      orders
        .filter((order) => getCustomerKey(order) === customerKey)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [customerKey, orders]
  )

  const summary = useMemo(() => {
    const firstOrder = customerOrders[0]
    const totalThb = customerOrders.reduce(
      (sum, order) => sum + (order.totalCustomerPayableThb || 0),
      0
    )
    const totalMmk = customerOrders.reduce(
      (sum, order) =>
        sum + (order.totalCustomerPayableThb || 0) * getOrderRate(order),
      0
    )
    const unpaidThb = customerOrders.reduce(
      (sum, order) => sum + (order.remainingBalanceThb || 0),
      0
    )

    return {
      name: firstOrder?.customerName || "Customer",
      facebookName: firstOrder?.facebookName || "",
      phone: firstOrder?.phone || "",
      address: firstOrder?.address || "",
      totalThb,
      totalMmk,
      unpaidThb,
    }
  }, [customerOrders])

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading customer...</p>
        </div>
      </main>
    )
  }

  if (customerOrders.length === 0) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Button asChild variant="ghost" className="rounded-xl">
            <Link href="/customers">
              <IconArrowLeft className="mr-2 size-5" />
              Back to customers
            </Link>
          </Button>
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <h1 className="font-heading text-xl font-medium">
                Customer not found
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This customer has no saved orders.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-muted pb-24">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/customers" aria-label="Back to customers">
              <IconArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Customer</p>
            <h1 className="truncate font-heading text-2xl font-medium tracking-tight">
              {summary.name}
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 py-5">
        <Card className="rounded-[20px] shadow-none">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary text-lg text-primary-foreground">
                  {getInitials(summary.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate font-heading text-xl font-medium">
                  {summary.name}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {summary.facebookName || summary.phone || "No contact saved"}
                </p>
              </div>
            </div>

            {summary.address ? (
              <div className="rounded-2xl bg-muted p-3">
                <p className="text-[11px] text-muted-foreground">Location</p>
                <p className="mt-1 text-sm">{summary.address}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <AmountBox label="Total" value={formatBaht(summary.totalThb)} />
              <AmountBox label="MMK" value={formatKyat(summary.totalMmk)} />
              <AmountBox
                label="Unpaid"
                value={formatBaht(summary.unpaidThb)}
              />
              <AmountBox
                label="Orders"
                value={`${customerOrders.length}`}
              />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">Orders Bought</h2>
            <Badge variant="secondary">{customerOrders.length}</Badge>
          </div>

          {customerOrders.map((order) => (
            <CustomerOrderRow key={order.id} order={order} />
          ))}
        </section>
      </div>

      <BottomNavigation active="customers" />
    </main>
  )
}

function CustomerOrderRow({ order }: { order: LocalOrder }) {
  return (
    <Link href={`/orders/${order.id}`} className="block">
      <Card className="rounded-[20px] shadow-none transition active:scale-[0.99]">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {order.orderNumber} · {formatDate(order.createdAt)}
              </p>
              <h3 className="mt-1 truncate font-medium">
                {order.productName || "Product photo order"}
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {order.quantity ? `${order.quantity} item${order.quantity === 1 ? "" : "s"}` : "1 item"}
                {order.productSize || order.productOption
                  ? ` · Size ${order.productSize || order.productOption}`
                  : ""}
                {order.productColor ? ` · ${order.productColor}` : ""}
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {formatBaht(order.totalCustomerPayableThb)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Payment</p>
              <Badge
                variant={getStatusVariant(order.paymentStatus)}
                className="mt-1"
              >
                {toLabel(order.paymentStatus)}
              </Badge>
            </div>

            <div className="rounded-xl border bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Delivery</p>
              <Badge
                variant={getStatusVariant(order.deliveryStatus)}
                className="mt-1"
              >
                {toLabel(order.deliveryStatus)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function AmountBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}
