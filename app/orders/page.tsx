// app/orders/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { IconPackage, IconPlus, IconSearch } from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { formatBaht, formatKyat, getOrderRate } from "../lib/currency"
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type LocalOrder,
  type OrderStatus,
} from "../lib/local-orders"
import { listOrders } from "@/lib/db/orders"
import { listShops } from "@/lib/db/shops"
import { messageOf } from "@/lib/db/shared"

const STATUS_VARIANTS: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  not_bought: "outline",
  bought: "secondary",
  sent_cargo: "secondary",
  delivered: "secondary",
  complete: "default",
  returned: "destructive",
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Local calendar day as YYYY-MM-DD, the same format a date input produces.
function toDateKey(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${date.getFullYear()}-${month}-${day}`
}

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [shopNames, setShopNames] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [payment, setPayment] = useState("all")
  const [status, setStatus] = useState("all")
  const [shop, setShop] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [loadedOrders, loadedShops] = await Promise.all([
          listOrders(),
          listShops(),
        ])

        if (cancelled) return

        // Shops come from the shop database. A shop that only appears on an
        // order is added too, so every order can still be filtered.
        const names = new Map<string, string>()

        for (const name of [
          ...loadedShops.map((item) => item.name),
          ...loadedOrders.map((order) => order.retailerName ?? ""),
        ]) {
          const trimmed = name.trim()

          if (trimmed && !names.has(trimmed.toLowerCase())) {
            names.set(trimmed.toLowerCase(), trimmed)
          }
        }

        setOrders(loadedOrders)
        setShopNames([...names.values()].sort((a, b) => a.localeCompare(b)))
      } catch (error) {
        if (!cancelled) setLoadError(messageOf(error, "Could not load orders."))
      } finally {
        if (!cancelled) setMounted(true)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders
      .filter((order) => {
        const matchesSearch =
          !query ||
          [
            order.orderNumber,
            order.customerName,
            order.facebookName,
            order.phone,
            order.productName,
            order.productOption,
            order.productColor,
            order.productSize,
            order.retailerName,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))

        const matchesPayment =
          payment === "all" || order.paymentStatus === payment

        const matchesStatus = status === "all" || order.orderStatus === status

        const matchesShop =
          shop === "all" ||
          (order.retailerName ?? "").trim().toLowerCase() === shop.toLowerCase()

        const day = toDateKey(order.createdAt)
        const matchesDate =
          (!dateFrom || (day !== "" && day >= dateFrom)) &&
          (!dateTo || (day !== "" && day <= dateTo))

        return (
          matchesSearch &&
          matchesPayment &&
          matchesStatus &&
          matchesShop &&
          matchesDate
        )
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [orders, search, payment, status, shop, dateFrom, dateTo])

  const hasActiveFilters =
    search !== "" ||
    payment !== "all" ||
    status !== "all" ||
    shop !== "all" ||
    dateFrom !== "" ||
    dateTo !== ""

  function clearFilters() {
    setSearch("")
    setPayment("all")
    setStatus("all")
    setShop("all")
    setDateFrom("")
    setDateTo("")
  }

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading orders...</p>
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
              {filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Orders
            </h1>
          </div>

          <Button asChild size="icon" className="size-11 rounded-xl">
            <Link href="/orders/create" aria-label="Add order">
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

        <Card className="rounded-[20px] shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order ID, customer, shop, product..."
                aria-label="Search orders"
                className="h-12 rounded-xl pl-10 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger className="h-12 w-full rounded-xl" aria-label="Payment">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  {PAYMENT_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {PAYMENT_STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12 w-full rounded-xl" aria-label="Order status">
                  <SelectValue placeholder="Order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ORDER_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {ORDER_STATUS_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={shop} onValueChange={setShop}>
              <SelectTrigger className="h-12 w-full rounded-xl" aria-label="Shop">
                <SelectValue placeholder="Shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shops</SelectItem>
                {shopNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orders-date-from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="orders-date-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orders-date-to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="orders-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card className="rounded-[20px] shadow-none">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                <IconPackage className="size-7 text-muted-foreground" />
              </div>

              <h2 className="mt-4 font-heading text-lg font-medium">
                No orders found
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Create your first order or clear filters to see existing orders.
              </p>

              <Button asChild className="mt-5 h-12 w-full rounded-xl">
                <Link href="/orders/create">
                  <IconPlus className="mr-2 size-5" />
                  Add Order
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[20px] shadow-none">
            <ul className="divide-y">
              {filteredOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <BottomNavigation active="orders" />
    </main>
  )
}

function OrderRow({ order }: { order: LocalOrder }) {
  return (
    <li>
      <Link
        href={`/orders/${order.id}`}
        className="block px-4 py-3 transition hover:bg-muted/60 active:bg-muted"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {order.orderNumber} · {formatDate(order.createdAt)}
            </p>
            <p className="mt-1 truncate font-medium">{order.customerName}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {order.retailerName?.trim() || "No shop"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-semibold">
              {formatBaht(order.totalCustomerPayableThb)}
            </p>
            {order.customerCurrency === "MMK" ? (
              <p className="text-[11px] text-muted-foreground">
                {formatKyat(order.totalCustomerPayableThb * getOrderRate(order))}
              </p>
            ) : null}
            <Badge variant={STATUS_VARIANTS[order.orderStatus]} className="mt-1.5">
              {ORDER_STATUS_LABELS[order.orderStatus]}
            </Badge>
          </div>
        </div>
      </Link>
    </li>
  )
}
