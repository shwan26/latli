// app/orders/page.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  IconEye,
  IconPackage,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconWallet,
} from "@tabler/icons-react"

import { BottomNavigation } from "@/components/bottom-navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Currency = "THB" | "MMK"

type LocalOrder = {
  id: string
  orderNumber: string
  customerName: string

  orderStatus:
    | "new_order"
    | "waiting_deposit"
    | "deposit_paid"
    | "ordered_from_retailer"
    | "received_from_retailer"
    | "sent_to_cargo"
    | "in_delivery"
    | "delivered"
    | "completed"
    | "cancelled"

  paymentStatus:
    | "not_paid"
    | "receiving"
    | "deposit_paid"
    | "partially_paid"
    | "fully_paid"
    | "refunded"

  deliveryStatus:
    | "not_arranged"
    | "product_bought"
    | "waiting_pickup"
    | "picked_up"
    | "sent_to_cargo"
    | "in_transit"
    | "delivered"
    | "delayed"
    | "returned"

  baseCurrency: "THB"
  customerCurrency: Currency
  exchangeRateThbToMmk: number

  totalRetailerCostThb: number
  totalCustomerPayableThb: number
  totalPaidThb: number
  remainingBalanceThb: number
  profitThb: number

  createdAt: string

  facebookName?: string
  phone?: string
  address?: string

  sourceType?: string
  customerMessageBurmese?: string
  productSize?: string
  productColor?: string
  productDescription?: string
  productPhotoName?: string
  productPhotoDataUrl?: string
  orderScreenshotName?: string
  orderScreenshotDataUrl?: string

  productName?: string
  productOption?: string
  quantity?: number
  productNote?: string
  retailerUnitPriceThb?: number
  sellingUnitPriceThb?: number

  retailerName?: string
  retailerLineId?: string

  cargoCompanyName?: string
  trackingNumber?: string
}

const LOCAL_STORAGE_KEY = "latli_orders"

function getStoredOrders(): LocalOrder[] {
  if (typeof window === "undefined") return []

  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)

  if (!stored) {
    return []
  }

  try {
    return JSON.parse(stored) as LocalOrder[]
  } catch {
    return []
  }
}

function formatBaht(value: number) {
  return `฿${Math.round(value || 0).toLocaleString("en-US")}`
}

function formatKyat(value: number) {
  return `MMK ${Math.round(value || 0).toLocaleString("en-US")}`
}

function formatDate(value: string) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  if (
    status === "cancelled" ||
    status === "returned" ||
    status === "delayed" ||
    status === "refunded"
  ) {
    return "destructive"
  }

  if (
    status === "completed" ||
    status === "delivered" ||
    status === "fully_paid"
  ) {
    return "default"
  }

  if (
    status === "not_paid" ||
    status === "waiting_deposit" ||
    status === "not_arranged"
  ) {
    return "outline"
  }

  return "secondary"
}

export default function OrdersPage() {
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<LocalOrder[]>([])
  const [search, setSearch] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("all")
  const [deliveryStatus, setDeliveryStatus] = useState("all")

  useEffect(() => {
    const loadOrders = window.setTimeout(() => {
      setOrders(getStoredOrders())
      setMounted(true)
    }, 0)

    return () => window.clearTimeout(loadOrders)
  }, [])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [
          order.orderNumber,
          order.customerName,
          order.facebookName,
          order.phone,
          order.address,
          order.customerMessageBurmese,
          order.productSize,
          order.productColor,
          order.productDescription,
          order.productPhotoName,
          order.orderScreenshotName,
          order.productName,
          order.productOption,
          order.productNote,
          order.retailerName,
          order.retailerLineId,
          order.cargoCompanyName,
          order.trackingNumber,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))

      const matchesPaymentStatus =
        paymentStatus === "all" || order.paymentStatus === paymentStatus

      const matchesDeliveryStatus =
        deliveryStatus === "all" || order.deliveryStatus === deliveryStatus

      return (
        matchesSearch &&
        matchesPaymentStatus &&
        matchesDeliveryStatus
      )
    })
  }, [orders, search, paymentStatus, deliveryStatus])

  const hasActiveFilters =
    search || paymentStatus !== "all" || deliveryStatus !== "all"

  function clearFilters() {
    setSearch("")
    setPaymentStatus("all")
    setDeliveryStatus("all")
  }

  function deleteOrder(orderId: string) {
    const updatedOrders = orders.filter((order) => order.id !== orderId)
    setOrders(updatedOrders)
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedOrders))
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
        <Card className="rounded-[20px] shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, product, color, size..."
                className="h-12 rounded-xl pl-10 text-base"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment statuses</SelectItem>
                  <SelectItem value="not_paid">Not Paid</SelectItem>
                  <SelectItem value="receiving">Receiving</SelectItem>
                  <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="fully_paid">Fully Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Delivery status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All delivery statuses</SelectItem>
                  <SelectItem value="not_arranged">Not Arranged</SelectItem>
                  <SelectItem value="product_bought">
                    Product Already Bought
                  </SelectItem>
                  <SelectItem value="waiting_pickup">Waiting Pickup</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="sent_to_cargo">Sent To Cargo</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
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
          <section className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onDelete={() => deleteOrder(order.id)}
              />
            ))}
          </section>
        )}
      </div>

      <BottomNavigation active="orders" />
    </main>
  )
}

function OrderCard({
  order,
  onDelete,
}: {
  order: LocalOrder
  onDelete: () => void
}) {
  const rate = order.exchangeRateThbToMmk || 1
  const customerPayableMmk = order.totalCustomerPayableThb * rate
  const remainingBalanceMmk = order.remainingBalanceThb * rate

  return (
    <Card className="rounded-[20px] shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {order.orderNumber} · {formatDate(order.createdAt)}
          </p>

          <h2 className="mt-1 truncate font-heading text-lg font-medium">
            {order.customerName}
          </h2>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {order.productName || "Product photo order"}
            {order.quantity ? ` x ${order.quantity}` : ""}
            {order.productSize || order.productOption
              ? ` · Size ${order.productSize || order.productOption}`
              : ""}
            {order.productColor ? ` · ${order.productColor}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={getStatusVariant(order.paymentStatus)}>
            Payment: {toLabel(order.paymentStatus)}
          </Badge>

          <Badge variant={getStatusVariant(order.deliveryStatus)}>
            Delivery: {toLabel(order.deliveryStatus)}
          </Badge>
        </div>

        {order.productDescription || order.productNote ? (
          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Description</p>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm">
              {order.productDescription || order.productNote}
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Size</p>
            <p className="mt-0.5 text-sm font-semibold">
              {order.productSize || order.productOption || "-"}
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Color</p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {order.productColor || "-"}
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Phone</p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {order.phone || "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Qty</p>
            <p className="mt-0.5 text-sm font-semibold">
              {order.quantity || 1}
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Cost</p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatBaht(order.retailerUnitPriceThb || 0)}
            </p>
          </div>

          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Selling</p>
            <p className="mt-0.5 text-sm font-semibold">
              {formatBaht(order.sellingUnitPriceThb || 0)}
            </p>
          </div>
        </div>

        {order.address ? (
          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Location</p>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm">
              {order.address}
            </p>
          </div>
        ) : null}

        {order.customerMessageBurmese ? (
          <div className="rounded-xl border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              Customer note
            </p>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">
              {order.customerMessageBurmese}
            </p>
          </div>
        ) : null}

        {order.productPhotoDataUrl || order.orderScreenshotDataUrl ? (
          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
              <IconPhoto className="size-4" />
              <span className="truncate">
                {order.productPhotoName ||
                  order.orderScreenshotName ||
                  "Product photo"}
              </span>
            </div>
            <Image
              src={order.productPhotoDataUrl || order.orderScreenshotDataUrl || ""}
              alt="Customer product photo"
              width={800}
              height={800}
              unoptimized
              className="max-h-56 w-full object-contain"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                Customer payable
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {formatBaht(order.totalCustomerPayableThb)}
              </p>
              {order.customerCurrency === "MMK" ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatKyat(customerPayableMmk)}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-background px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Remaining</p>
              <p className="mt-0.5 text-sm font-semibold">
                {formatBaht(order.remainingBalanceThb)}
              </p>
              {order.customerCurrency === "MMK" ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatKyat(remainingBalanceMmk)}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl px-2">
            <Link href={`/orders/${order.id}`}>
              <IconEye className="mr-1 size-4" />
              View
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-10 rounded-xl px-2">
            <Link href={`/orders/${order.id}`}>
              <IconWallet className="mr-1 size-4" />
              Update
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-2 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
