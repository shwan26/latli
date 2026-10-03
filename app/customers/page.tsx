// app/customers/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  IconCrown,
  IconPlus,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  getOrdersFromLocalStorage,
  type LocalOrder,
} from "../lib/local-orders"
import { formatBaht, formatKyat, getOrderRate } from "../lib/currency"

type CustomerSummary = {
  key: string
  name: string
  facebookName: string
  phone: string
  address: string
  orderCount: number
  monthOrderCount: number
  totalThb: number
  totalMmk: number
  monthTotalThb: number
  monthTotalMmk: number
  lastOrderAt: string
}

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

function isSameMonth(value: string, date: Date) {
  const orderDate = new Date(value)

  if (Number.isNaN(orderDate.getTime())) return false

  return (
    orderDate.getFullYear() === date.getFullYear() &&
    orderDate.getMonth() === date.getMonth()
  )
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

function buildCustomerSummaries(orders: LocalOrder[]) {
  const now = new Date()
  const summaries = new Map<string, CustomerSummary>()

  for (const order of orders) {
    const key = getCustomerKey(order)
    const existing = summaries.get(key)
    const totalThb = order.totalCustomerPayableThb || 0
    const totalMmk = totalThb * getOrderRate(order)
    const belongsToMonth = isSameMonth(order.createdAt, now)

    const next: CustomerSummary = existing ?? {
      key,
      name: order.customerName || "Customer",
      facebookName: order.facebookName || "",
      phone: order.phone || "",
      address: order.address || "",
      orderCount: 0,
      monthOrderCount: 0,
      totalThb: 0,
      totalMmk: 0,
      monthTotalThb: 0,
      monthTotalMmk: 0,
      lastOrderAt: order.createdAt,
    }

    next.name = next.name || order.customerName || "Customer"
    next.facebookName = next.facebookName || order.facebookName || ""
    next.phone = next.phone || order.phone || ""
    next.address = next.address || order.address || ""
    next.orderCount += 1
    next.totalThb += totalThb
    next.totalMmk += totalMmk

    if (belongsToMonth) {
      next.monthOrderCount += 1
      next.monthTotalThb += totalThb
      next.monthTotalMmk += totalMmk
    }

    if (new Date(order.createdAt).getTime() > new Date(next.lastOrderAt).getTime()) {
      next.lastOrderAt = order.createdAt
    }

    summaries.set(key, next)
  }

  return Array.from(summaries.values()).sort((a, b) => b.totalThb - a.totalThb)
}

export default function CustomersPage() {
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const loadCustomers = window.setTimeout(() => {
      setOrders(getOrdersFromLocalStorage())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadCustomers)
  }, [])

  const customers = useMemo(() => buildCustomerSummaries(orders), [orders])

  const topCustomerOfMonth = useMemo(
    () =>
      customers
        .filter((customer) => customer.monthOrderCount > 0)
        .sort((a, b) => b.monthTotalThb - a.monthTotalThb)[0],
    [customers]
  )

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return customers

    return customers.filter((customer) =>
      [
        customer.name,
        customer.facebookName,
        customer.phone,
        customer.address,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [customers, search])

  if (!mounted) {
    return (
      <main className="min-h-dvh bg-muted px-5 py-5">
        <div className="mx-auto w-full max-w-md">
          <p className="text-sm text-muted-foreground">Loading customers...</p>
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
              {customers.length} customer{customers.length === 1 ? "" : "s"}
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Customers
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
        <TopCustomerCard customer={topCustomerOfMonth} />

        <Card className="rounded-[20px] shadow-none">
          <CardContent className="p-4">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, phone, Facebook..."
                className="h-12 rounded-xl pl-10 text-base"
              />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-medium">All Customers</h2>
            <Badge variant="secondary">{filteredCustomers.length}</Badge>
          </div>

          {filteredCustomers.length === 0 ? (
            <Card className="rounded-[20px] shadow-none">
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <IconUsers className="size-7 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-medium">
                  No customers found
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create orders to build your customer list.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <CustomerCard key={customer.key} customer={customer} />
            ))
          )}
        </section>
      </div>

      <BottomNavigation active="customers" />
    </main>
  )
}

function TopCustomerCard({
  customer,
}: {
  customer?: CustomerSummary
}) {
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <Card className="rounded-[20px] shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-base font-medium">
            <IconCrown className="size-5 text-muted-foreground" />
            Top Customer
          </span>
          <Badge>{monthLabel}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {customer ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary text-lg text-primary-foreground">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate font-heading text-xl font-medium">
                  {customer.name}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {customer.monthOrderCount} order
                  {customer.monthOrderCount === 1 ? "" : "s"} this month
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AmountBox label="Amount" value={formatBaht(customer.monthTotalThb)} />
              <AmountBox label="MMK" value={formatKyat(customer.monthTotalMmk)} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-sm font-medium">No monthly top customer yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Orders created this month will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CustomerCard({ customer }: { customer: CustomerSummary }) {
  return (
    <Link href={`/customers/${encodeURIComponent(customer.key)}`} className="block">
      <Card className="rounded-[20px] shadow-none transition active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="size-12 rounded-2xl">
              <AvatarFallback className="rounded-2xl">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{customer.name}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {customer.facebookName || customer.phone || "No contact saved"}
                  </p>
                </div>

                <Badge variant="outline" className="shrink-0">
                  {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <AmountBox label="Total" value={formatBaht(customer.totalThb)} />
                <AmountBox label="This month" value={formatBaht(customer.monthTotalThb)} />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Last order: {formatDate(customer.lastOrderAt)}
              </p>
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
